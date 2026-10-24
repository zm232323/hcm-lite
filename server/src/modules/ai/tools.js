'use strict';
const { Employee, Department } = require('../../models');
const { getAttendanceSummary, getLateComers, countWorkingDays } = require('../attendance/service');
const { getLeaveSummary, getWhoIsOnLeave, getLeaveBalance, getApprovedLeaveDays } = require('../leave/service');
const { getPayrollSummary, getLastPayslip } = require('../payroll/service');
const { getKarachiNow } = require('../../utils/time');

/**
 * Gemini Function Declarations (Strict Schema)
 */
const TOOL_DEFINITIONS = [
  {
    name: 'get_headcount',
    description: 'Get workforce headcount (active and probation employee counts), optionally filtered by department name. Admin and HR only.',
    parameters: {
      type: 'OBJECT',
      properties: {
        departmentName: {
          type: 'STRING',
          description: 'Optional name of the department (case-insensitive) to filter headcount.',
        },
      },
    },
  },
  {
    name: 'get_attendance_summary',
    description: 'Get attendance metrics (present, late, half_day, absent, missing_checkout, worked hours, and attendance rate %). Admin and HR see company/department summary; Employees receive only their own records.',
    parameters: {
      type: 'OBJECT',
      properties: {
        from: {
          type: 'STRING',
          description: 'Start date in YYYY-MM-DD format (defaults to the 1st of current month in Asia/Karachi).',
        },
        to: {
          type: 'STRING',
          description: 'End date in YYYY-MM-DD format (defaults to current date in Asia/Karachi).',
        },
        departmentName: {
          type: 'STRING',
          description: 'Optional department name filter (Admin and HR only).',
        },
      },
    },
  },
  {
    name: 'get_late_comers',
    description: 'List employees with highest late check-in count in a date range. Admin and HR only. Refused for Employees.',
    parameters: {
      type: 'OBJECT',
      properties: {
        from: {
          type: 'STRING',
          description: 'Start date in YYYY-MM-DD format (defaults to the 1st of current month).',
        },
        to: {
          type: 'STRING',
          description: 'End date in YYYY-MM-DD format (defaults to today).',
        },
        departmentName: {
          type: 'STRING',
          description: 'Optional department name filter.',
        },
        limit: {
          type: 'INTEGER',
          description: 'Maximum number of late records to return (defaults to 5).',
        },
      },
    },
  },
  {
    name: 'get_leave_summary',
    description: 'Get leave statistics across an organization or who is on leave on a given date. Admin and HR see everyone; Employee gets only their own leaves.',
    parameters: {
      type: 'OBJECT',
      properties: {
        from: {
          type: 'STRING',
          description: 'Start date in YYYY-MM-DD format.',
        },
        to: {
          type: 'STRING',
          description: 'End date in YYYY-MM-DD format.',
        },
        date: {
          type: 'STRING',
          description: 'Specific date in YYYY-MM-DD format to check who is on leave (e.g. today).',
        },
        departmentName: {
          type: 'STRING',
          description: 'Optional department name filter.',
        },
      },
    },
  },
  {
    name: 'get_my_leave_balance',
    description: 'Check leave entitlement balances (quota, used, remaining) for the calling employee. Accessible to all roles for their own employee profile.',
    parameters: {
      type: 'OBJECT',
      properties: {
        leaveTypeName: {
          type: 'STRING',
          description: 'Optional leave type name (e.g. "Annual", "Sick", "Casual") to check a specific balance.',
        },
      },
    },
  },
  {
    name: 'get_payroll_summary',
    description: 'Get aggregated payroll statistics (gross, net, tax, deductions) for finalized runs. Admin and HR only. Employees asking about payroll will receive only their own last payslip.',
    parameters: {
      type: 'OBJECT',
      properties: {
        month: {
          type: 'STRING',
          description: 'Month in YYYY-MM format (e.g. "2026-10").',
        },
        departmentName: {
          type: 'STRING',
          description: 'Optional department name filter (Admin and HR only).',
        },
      },
    },
  },
  {
    name: 'search_employees',
    description: 'Search employees by name or employee code. Admin and HR can search any employee; Employees can search and see ONLY their own employee record.',
    parameters: {
      type: 'OBJECT',
      properties: {
        q: {
          type: 'STRING',
          description: 'Search query (name or code).',
        },
      },
      required: ['q'],
    },
  },
];

/**
 * Role-to-tool permission map
 */
const ROLE_PERMISSIONS = {
  admin: ['get_headcount', 'get_attendance_summary', 'get_late_comers', 'get_leave_summary', 'get_my_leave_balance', 'get_payroll_summary', 'search_employees'],
  hr: ['get_headcount', 'get_attendance_summary', 'get_late_comers', 'get_leave_summary', 'get_my_leave_balance', 'get_payroll_summary', 'search_employees'],
  employee: ['get_attendance_summary', 'get_leave_summary', 'get_my_leave_balance', 'get_payroll_summary', 'search_employees'],
};

/**
 * Case-insensitive helper to resolve a department name to a department document
 */
async function resolveDepartment(deptName) {
  if (!deptName || typeof deptName !== 'string') return { dept: null, error: null };
  const trimmed = deptName.trim();
  const allDepts = await Department.find({ isActive: true }).select('_id name').lean();
  const found = allDepts.find((d) => d.name.toLowerCase() === trimmed.toLowerCase());
  if (!found) {
    return {
      dept: null,
      error: {
        error: 'Department not found',
        query: deptName,
        knownDepartments: allDepts.map((d) => d.name),
      },
    };
  }
  return { dept: found, error: null };
}

/**
 * Resolves standard date range defaults (current month in Asia/Karachi)
 */
function resolveDates(from, to) {
  const { todayStr } = getKarachiNow();
  const currentMonth = todayStr.slice(0, 7);
  const defaultFrom = `${currentMonth}-01`;
  const defaultTo = todayStr;

  const validFrom = from && /^\d{4}-\d{2}-\d{2}$/.test(from) ? from : defaultFrom;
  const validTo = to && /^\d{4}-\d{2}-\d{2}$/.test(to) ? to : defaultTo;

  return { from: validFrom <= validTo ? validFrom : validTo, to: validTo >= validFrom ? validTo : validFrom };
}

/**
 * Tool Executor
 * Enforces role allow-list and calling identity on every tool execution.
 * @param {string} toolName
 * @param {Object} args
 * @param {Object} context - { userId, role, employeeId }
 * @returns {Promise<Object>}
 */
async function executeTool(toolName, args = {}, context = {}) {
  const { userId, role, employeeId } = context;
  const allowedTools = ROLE_PERMISSIONS[role] || [];

  if (!allowedTools.includes(toolName)) {
    return {
      refused: true,
      message: `Permission denied: ${role} role is not permitted to access ${toolName}.`,
    };
  }

  // 1. get_headcount
  if (toolName === 'get_headcount') {
    let deptFilter = {};
    if (args.departmentName) {
      const { dept, error } = await resolveDepartment(args.departmentName);
      if (error) return error;
      deptFilter.departmentId = dept._id;
    }

    const [activeCount, probationCount] = await Promise.all([
      Employee.countDocuments({ ...deptFilter, status: 'active' }),
      Employee.countDocuments({ ...deptFilter, status: 'probation' }),
    ]);

    return {
      totalHeadcount: activeCount + probationCount,
      active: activeCount,
      probation: probationCount,
      department: args.departmentName || 'All Departments',
    };
  }

  // 2. get_attendance_summary
  if (toolName === 'get_attendance_summary') {
    const { from, to } = resolveDates(args.from, args.to);
    let departmentId = null;

    if (role === 'employee') {
      if (!employeeId) return { error: 'No employee record linked to current user' };
      const summary = await getAttendanceSummary({ from, to, employeeId });
      return {
        from,
        to,
        employeeAttendance: summary,
      };
    }

    if (args.departmentName) {
      const { dept, error } = await resolveDepartment(args.departmentName);
      if (error) return error;
      departmentId = dept._id;
    }

    const summary = await getAttendanceSummary({ from, to, departmentId });
    const workingDays = summary.expectedWorkingDays || (await countWorkingDays(from, to));

    // Calculate attendance rate matching Part 5 formula:
    // attendanceRate = (present + late + missing_checkout + 0.5 * half_day) / (working-day records - on_leave days)
    const activeEmps = await Employee.find({
      status: { $in: ['active', 'probation'] },
      ...(departmentId ? { departmentId } : {}),
    }).select('_id').lean();

    const totalWorkingDayRecords = workingDays * activeEmps.length;
    const leaveSummary = await getLeaveSummary({ from, to, departmentId });
    const totalOnLeaveDays = leaveSummary.totalApprovedDays || 0;

    const numerator = summary.present + summary.late + summary.missing_checkout + 0.5 * summary.half_day;
    const denominator = totalWorkingDayRecords - totalOnLeaveDays;
    const attendanceRate = denominator > 0 ? Math.round((numerator / denominator) * 10000) / 100 : null;

    return {
      from,
      to,
      department: args.departmentName || 'All Departments',
      ...summary,
      on_leave: totalOnLeaveDays,
      attendanceRate: attendanceRate !== null ? `${attendanceRate}%` : null,
    };
  }

  // 3. get_late_comers
  if (toolName === 'get_late_comers') {
    if (role === 'employee') {
      return { refused: true, message: 'Employees cannot view company late comers.' };
    }
    const { from, to } = resolveDates(args.from, args.to);
    let departmentId = null;
    if (args.departmentName) {
      const { dept, error } = await resolveDepartment(args.departmentName);
      if (error) return error;
      departmentId = dept._id;
    }

    const limit = Math.min(20, Math.max(1, Number(args.limit) || 5));
    const lateRecords = await getLateComers({ from, to, departmentId, limit });

    return {
      from,
      to,
      department: args.departmentName || 'All Departments',
      count: lateRecords.length,
      lateComers: lateRecords.map((r) => ({
        employeeName: r.employeeId?.name || 'Unknown',
        employeeCode: r.employeeId?.employeeCode || '—',
        date: r.date,
        checkInAt: r.checkInAt,
      })),
    };
  }

  // 4. get_leave_summary
  if (toolName === 'get_leave_summary') {
    if (args.date) {
      if (role === 'employee') {
        return { refused: true, message: 'Employees cannot view company-wide leave rosters.' };
      }
      const onLeaveList = await getWhoIsOnLeave(args.date);
      return {
        date: args.date,
        totalOnLeave: onLeaveList.length,
        employeesOnLeave: onLeaveList.map((l) => ({
          name: l.employee?.name || 'Unknown',
          department: l.employee?.department?.name || '—',
          leaveType: l.leaveType?.name || 'Leave',
          days: l.days,
        })),
      };
    }

    const { from, to } = resolveDates(args.from, args.to);
    if (role === 'employee') {
      if (!employeeId) return { error: 'No employee record linked to current user' };
      const approvedDays = await getApprovedLeaveDays(employeeId, from, to);
      return {
        from,
        to,
        myApprovedLeaveDays: approvedDays,
      };
    }

    let departmentId = null;
    if (args.departmentName) {
      const { dept, error } = await resolveDepartment(args.departmentName);
      if (error) return error;
      departmentId = dept._id;
    }

    const summary = await getLeaveSummary({ from, to, departmentId });
    return {
      from,
      to,
      department: args.departmentName || 'All Departments',
      ...summary,
    };
  }

  // 5. get_my_leave_balance
  if (toolName === 'get_my_leave_balance') {
    if (!employeeId) {
      return { error: 'No employee record associated with your account' };
    }
    const balances = await getLeaveBalance(employeeId);
    if (args.leaveTypeName) {
      const q = args.leaveTypeName.toLowerCase().trim();
      const match = balances.find((b) => b.name.toLowerCase().includes(q));
      if (match) return match;
    }
    return { balances };
  }

  // 6. get_payroll_summary
  if (toolName === 'get_payroll_summary') {
    if (role === 'employee') {
      if (!employeeId) return { error: 'No employee record linked to current user' };
      const lastPayslip = await getLastPayslip(employeeId);
      if (!lastPayslip) {
        return { message: 'No finalized payslips available yet for your profile.' };
      }
      return {
        yourLastPayslip: {
          month: lastPayslip.month,
          grossSalary: lastPayslip.grossSalary,
          netSalary: lastPayslip.netSalary,
          deductions: lastPayslip.deductions,
          incomeTax: lastPayslip.incomeTax,
          status: lastPayslip.status,
        },
      };
    }

    let departmentId = null;
    if (args.departmentName) {
      const { dept, error } = await resolveDepartment(args.departmentName);
      if (error) return error;
      departmentId = dept._id;
    }

    const summary = await getPayrollSummary({
      month: args.month,
      departmentId,
      includeDraft: false,
    });

    return {
      month: args.month || 'All finalized runs',
      department: args.departmentName || 'All Departments',
      summary: summary.overall,
    };
  }

  // 7. search_employees
  if (toolName === 'search_employees') {
    const q = (args.q || '').trim();
    if (!q) return { results: [] };

    if (role === 'employee') {
      if (!employeeId) return { results: [] };
      const self = await Employee.findById(employeeId)
        .populate('departmentId', 'name')
        .populate('designationId', 'name')
        .lean();

      if (!self) return { results: [] };
      const nameMatch = self.name.toLowerCase().includes(q.toLowerCase());
      const codeMatch = self.employeeCode.toLowerCase().includes(q.toLowerCase());

      if (nameMatch || codeMatch) {
        return {
          results: [
            {
              employeeCode: self.employeeCode,
              name: self.name,
              department: self.departmentId?.name || '—',
              designation: self.designationId?.name || '—',
              status: self.status,
              joiningDate: self.joiningDate,
            },
          ],
        };
      }
      // Asking for someone else: polite refusal, zero leak
      return {
        refused: true,
        message: 'Employees can only search and view their own employee profile.',
      };
    }

    // Admin / HR
    const regex = new RegExp(q, 'i');
    const employees = await Employee.find({
      $or: [{ name: regex }, { employeeCode: regex }],
    })
      .populate('departmentId', 'name')
      .populate('designationId', 'name')
      .limit(10)
      .lean();

    return {
      count: employees.length,
      results: employees.map((e) => ({
        employeeCode: e.employeeCode,
        name: e.name,
        department: e.departmentId?.name || '—',
        designation: e.designationId?.name || '—',
        status: e.status,
        joiningDate: e.joiningDate,
        basicSalary: e.basicSalary, // Salary included only for Admin and HR
      })),
    };
  }

  return { error: `Tool ${toolName} not implemented` };
}

module.exports = {
  TOOL_DEFINITIONS,
  ROLE_PERMISSIONS,
  executeTool,
  resolveDepartment,
};
