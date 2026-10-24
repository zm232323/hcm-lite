'use strict';

const {
  Employee,
  Department,
  Designation,
  Attendance,
  LeaveRequest,
  LeaveType,
  Holiday,
  Settings,
  PayrollRun,
  Payslip,
  AuditLog,
  Announcement,
  AttendanceCorrection,
} = require('../../models');
const {
  getKarachiNow,
  getKarachiDate,
  getDateRange,
  isWeekend,
} = require('../../utils/time');
const { countWorkingDays, getLateComers, getWhoIsOnLeave } = require('../attendance/service');
const { getLeaveBalance, getLeaveSummary } = require('../leave/service');
const {
  getPayrollSummary,
  getAverageSalary,
  getLastPayslip,
  getPayrollCostThisYear,
} = require('../payroll/service');

/**
 * Standard 2-decimal rounding.
 */
function round2(val) {
  if (val === null || val === undefined || isNaN(val)) return null;
  return Math.round((Number(val) + Number.EPSILON) * 100) / 100;
}

/**
 * Normalizes query filters [from, to] with defaults.
 */
function resolveFilters(query = {}) {
  const { todayStr } = getKarachiNow();
  const currentMonth = todayStr.slice(0, 7);
  const from = query.from || `${currentMonth}-01`;
  const to = query.to || todayStr;
  const departmentId = query.departmentId || null;
  return { from, to, departmentId, todayStr, currentMonth };
}

/**
 * Bulk helper: Get expected working days set and list for date range.
 */
async function getWorkingDaysInRange(from, to) {
  const settings = await Settings.findOne();
  const weekendDays = settings?.weekend?.length ? settings.weekend : [0, 6];

  const holidays = await Holiday.find({
    date: {
      $gte: new Date(from + 'T00:00:00.000Z'),
      $lte: new Date(to + 'T23:59:59.999Z'),
    },
  }).lean();

  const holidaySet = new Set(holidays.map((h) => getKarachiDate(h.date)));
  const allDates = getDateRange(from, to);

  const workingDates = [];
  for (const d of allDates) {
    if (!isWeekend(d, weekendDays) && !holidaySet.has(d)) {
      workingDates.push(d);
    }
  }

  return { workingDates, workingDatesSet: new Set(workingDates), weekendDays, holidaySet };
}

/**
 * HR Dashboard Data Generator
 */
async function getHrDashboard(query = {}) {
  const { from, to, departmentId, todayStr } = resolveFilters(query);
  const { workingDates, workingDatesSet } = await getWorkingDaysInRange(from, to);

  // 1. Employee base filter
  const empFilter = {
    joiningDate: { $lte: new Date(to + 'T23:59:59.999Z') },
    $or: [{ exitDate: null }, { exitDate: { $gt: new Date(to + 'T23:59:59.999Z') } }],
  };
  if (departmentId) empFilter.departmentId = departmentId;

  const [activeEmployees, departments, leaveTypes] = await Promise.all([
    Employee.find(empFilter).select('_id departmentId joiningDate exitDate name employeeCode').lean(),
    Department.find({ isActive: true }).select('_id name').lean(),
    LeaveType.find({ isActive: true }).select('_id name yearlyQuota isPaid').lean(),
  ]);

  const activeEmpIds = activeEmployees.map((e) => e._id);
  const activeEmpIdSet = new Set(activeEmployees.map((e) => e._id.toString()));

  // Headcount KPI
  const headcount = activeEmployees.length;

  // 2. Today's attendance KPIs
  const todayAttendances = await Attendance.find({
    date: todayStr,
    employeeId: { $in: activeEmpIds },
  }).lean();

  let presentToday = 0;
  let lateToday = 0;
  for (const att of todayAttendances) {
    if (['present', 'late', 'half_day'].includes(att.status)) {
      presentToday++;
    }
    if (att.isLate || att.status === 'late') {
      lateToday++;
    }
  }

  // Today's approved leave
  const onLeaveTodayDocs = await LeaveRequest.find({
    status: 'approved',
    employeeId: { $in: activeEmpIds },
    startDate: { $lte: todayStr },
    endDate: { $gte: todayStr },
  }).select('employeeId').lean();
  const onLeaveToday = new Set(onLeaveTodayDocs.map((l) => l.employeeId.toString())).size;

  // Pending Approvals KPI
  const pendingLeaveFilter = { status: 'pending' };
  const pendingCorrFilter = { status: 'pending' };
  if (departmentId) {
    pendingLeaveFilter.employeeId = { $in: activeEmpIds };
    pendingCorrFilter.employeeId = { $in: activeEmpIds };
  }

  const [pendingLeavesCount, pendingCorrectionsCount] = await Promise.all([
    LeaveRequest.countDocuments(pendingLeaveFilter),
    AttendanceCorrection.countDocuments(pendingCorrFilter),
  ]);
  const pendingApprovals = pendingLeavesCount + pendingCorrectionsCount;

  // 3. Range Attendance & Leave metrics
  const [rangeAttendances, rangeLeaves] = await Promise.all([
    Attendance.find({
      employeeId: { $in: activeEmpIds },
      date: { $gte: from, $lte: to },
    }).lean(),
    LeaveRequest.find({
      employeeId: { $in: activeEmpIds },
      status: 'approved',
      startDate: { $lte: to },
      endDate: { $gte: from },
    }).populate('leaveTypeId', 'name isPaid').lean(),
  ]);

  // Count attendance records by status in range
  let totalPresent = 0;
  let totalLate = 0;
  let totalMissingCheckout = 0;
  let totalHalfDay = 0;

  // Track attendance per date: { [date]: { present, late, missing_checkout, half_day } }
  const attendanceByDate = {};
  // Track late count per employee: { [empId]: count }
  const lateCountByEmp = {};

  for (const att of rangeAttendances) {
    if (att.isLate || att.status === 'late') {
      lateCountByEmp[att.employeeId.toString()] = (lateCountByEmp[att.employeeId.toString()] || 0) + 1;
    }

    if (att.status === 'present') totalPresent++;
    else if (att.status === 'late') totalLate++;
    else if (att.status === 'half_day') totalHalfDay++;
    else if (att.status === 'missing_checkout') totalMissingCheckout++;

    if (workingDatesSet.has(att.date)) {
      if (!attendanceByDate[att.date]) {
        attendanceByDate[att.date] = { present: 0, late: 0, missing_checkout: 0, half_day: 0 };
      }
      if (att.status in attendanceByDate[att.date]) {
        attendanceByDate[att.date][att.status]++;
      }
    }
  }

  // Count leave days per date and per type in range
  const onLeaveEmpSetByDate = {};
  const leaveDaysByType = {};

  for (const req of rangeLeaves) {
    const typeName = req.leaveTypeId?.name || 'Leave';
    const dates = getDateRange(
      req.startDate < from ? from : req.startDate,
      req.endDate > to ? to : req.endDate
    );

    for (const d of dates) {
      if (workingDatesSet.has(d)) {
        leaveDaysByType[typeName] = (leaveDaysByType[typeName] || 0) + 1;
        if (!onLeaveEmpSetByDate[d]) onLeaveEmpSetByDate[d] = new Set();
        onLeaveEmpSetByDate[d].add(req.employeeId.toString());
      }
    }
  }

  // Overall Attendance Rate & Late %
  // Total working-day records = workingDays * activeEmployees
  const totalExpectedRecords = workingDates.length * activeEmployees.length;
  let totalOnLeaveDaysInRange = 0;
  for (const d of workingDates) {
    if (onLeaveEmpSetByDate[d]) {
      totalOnLeaveDaysInRange += onLeaveEmpSetByDate[d].size;
    }
  }

  const attendanceNumerator = totalPresent + totalLate + totalMissingCheckout + 0.5 * totalHalfDay;
  const attendanceDenominator = totalExpectedRecords - totalOnLeaveDaysInRange;
  const attendanceRate =
    attendanceDenominator > 0 ? round2((attendanceNumerator / attendanceDenominator) * 100) : null;

  const lateDenominator = totalPresent + totalLate;
  const latePercent = lateDenominator > 0 ? round2((totalLate / lateDenominator) * 100) : null;

  // Attendance Trend (for each working day in range up to today)
  const attendanceTrend = [];
  for (const d of workingDates) {
    if (d > todayStr) continue;

    const dayAtt = attendanceByDate[d] || { present: 0, late: 0, missing_checkout: 0, half_day: 0 };
    const dayNumerator = dayAtt.present + dayAtt.late + dayAtt.missing_checkout + 0.5 * dayAtt.half_day;
    const dayOnLeave = onLeaveEmpSetByDate[d] ? onLeaveEmpSetByDate[d].size : 0;
    const dayDenominator = activeEmployees.length - dayOnLeave;

    const rate = dayDenominator > 0 ? round2((dayNumerator / dayDenominator) * 100) : null;
    attendanceTrend.push({ date: d, attendanceRate: rate });
  }

  // Absenteeism by Department
  // Absent days: working dates strictly before today without attendance and without approved leave
  const pastWorkingDates = workingDates.filter((d) => d < todayStr);
  const attLookup = new Set(rangeAttendances.map((a) => `${a.employeeId}_${a.date}`));

  const absenteeismByDepartment = departments.map((dept) => {
    const deptEmployees = activeEmployees.filter(
      (e) => e.departmentId && e.departmentId.toString() === dept._id.toString()
    );
    const expectedWorkingDays = deptEmployees.length * pastWorkingDates.length;

    let absentDays = 0;
    for (const emp of deptEmployees) {
      for (const d of pastWorkingDates) {
        const hasAtt = attLookup.has(`${emp._id}_${d}`);
        const onLeave = onLeaveEmpSetByDate[d] && onLeaveEmpSetByDate[d].has(emp._id.toString());
        if (!hasAtt && !onLeave) {
          absentDays++;
        }
      }
    }

    const absenteeismRate =
      expectedWorkingDays > 0 ? round2((absentDays / expectedWorkingDays) * 100) : null;

    return {
      departmentId: dept._id,
      departmentName: dept.name,
      absentDays,
      expectedWorkingDays,
      absenteeismRate,
    };
  });

  // Leave by Type breakdown
  const leaveByType = leaveTypes.map((lt) => ({
    leaveTypeId: lt._id,
    name: lt.name,
    approvedDays: leaveDaysByType[lt.name] || 0,
  }));

  // Top 5 Late Comers
  const empMap = new Map(activeEmployees.map((e) => [e._id.toString(), e]));
  const deptMap = new Map(departments.map((d) => [d._id.toString(), d.name]));

  const topLateComers = Object.entries(lateCountByEmp)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([empId, count]) => {
      const emp = empMap.get(empId);
      return {
        employeeId: empId,
        name: emp?.name || 'Unknown',
        employeeCode: emp?.employeeCode || '—',
        department: (emp?.departmentId && deptMap.get(emp.departmentId.toString())) || '—',
        lateCount: count,
      };
    });

  return {
    kpis: {
      headcount,
      presentToday,
      onLeaveToday,
      lateToday,
      pendingApprovals,
      attendanceRate,
      latePercent,
    },
    attendanceTrend,
    absenteeismByDepartment,
    leaveByType,
    topLateComers,
  };
}

/**
 * Admin Dashboard Data Generator
 */
async function getAdminDashboard(query = {}) {
  const { from, to, departmentId, todayStr, currentMonth } = resolveFilters(query);
  const currentYear = todayStr.slice(0, 4);

  // 1. Headcount & Attrition YTD
  const empFilter = {
    joiningDate: { $lte: new Date(to + 'T23:59:59.999Z') },
    $or: [{ exitDate: null }, { exitDate: { $gt: new Date(to + 'T23:59:59.999Z') } }],
  };
  if (departmentId) empFilter.departmentId = departmentId;

  const [activeEmployees, departments, allEmployees] = await Promise.all([
    Employee.find(empFilter).lean(),
    Department.find({ isActive: true }).lean(),
    Employee.find().lean(),
  ]);

  const headcount = activeEmployees.length;

  // Attrition YTD formula:
  // exits in period (from Jan 1 of current year to to) / average headcount
  const ytdStart = `${currentYear}-01-01`;
  const ytdStartDate = new Date(ytdStart + 'T00:00:00.000Z');
  const toDate = new Date(to + 'T23:59:59.999Z');

  const headcountStart = allEmployees.filter((e) => {
    if (departmentId && e.departmentId?.toString() !== departmentId) return false;
    const joined = e.joiningDate <= ytdStartDate;
    const notExited = !e.exitDate || e.exitDate > ytdStartDate;
    return joined && notExited;
  }).length;

  const exitsYtd = allEmployees.filter((e) => {
    if (departmentId && e.departmentId?.toString() !== departmentId) return false;
    if (!e.exitDate) return false;
    return e.exitDate >= ytdStartDate && e.exitDate <= toDate;
  }).length;

  const avgHeadcountYtd = (headcountStart + headcount) / 2;
  const attritionYTD = avgHeadcountYtd > 0 ? round2((exitsYtd / avgHeadcountYtd) * 100) : null;

  // 2. Payroll Costs (Finalized runs only)
  // Month cost
  const thisMonthRun = await PayrollRun.findOne({ month: currentMonth, status: 'finalized' }).lean();
  const payrollCostThisMonth = {
    gross: thisMonthRun?.totals?.gross || 0,
    net: thisMonthRun?.totals?.net || 0,
  };

  // YTD cost
  const ytdRuns = await PayrollRun.find({
    status: 'finalized',
    month: { $regex: new RegExp(`^${currentYear}`) },
  }).lean();

  const payrollCostYTD = {
    gross: ytdRuns.reduce((sum, r) => sum + (r.totals?.gross || 0), 0),
    net: ytdRuns.reduce((sum, r) => sum + (r.totals?.net || 0), 0),
  };

  // Average Salary
  const averageSalary = await getAverageSalary({ departmentId });

  // 3. Headcount by Department
  const deptCountMap = {};
  for (const emp of activeEmployees) {
    if (emp.departmentId) {
      const dId = emp.departmentId.toString();
      deptCountMap[dId] = (deptCountMap[dId] || 0) + 1;
    }
  }

  const headcountByDepartment = departments.map((d) => ({
    departmentId: d._id,
    departmentName: d.name,
    headcount: deptCountMap[d._id.toString()] || 0,
  }));

  // 4. Payroll Cost by Department (from all finalized runs in range)
  const runsInRange = await PayrollRun.find({
    status: 'finalized',
    month: { $gte: from.slice(0, 7), $lte: to.slice(0, 7) },
  }).select('_id').lean();

  const runIds = runsInRange.map((r) => r._id);
  const payslipsInRange = await Payslip.find({ runId: { $in: runIds } }).lean();

  const deptCostMap = {};
  for (const p of payslipsInRange) {
    const dName = p.departmentName || 'Unassigned';
    if (!deptCostMap[dName]) deptCostMap[dName] = { gross: 0, net: 0 };
    deptCostMap[dName].gross = round2(deptCostMap[dName].gross + p.earnedGross);
    deptCostMap[dName].net = round2(deptCostMap[dName].net + p.netPay);
  }

  const payrollCostByDepartment = Object.entries(deptCostMap).map(([departmentName, costs]) => ({
    departmentName,
    gross: costs.gross,
    net: costs.net,
  }));

  // 5. Gender Distribution
  const genderMap = { male: 0, female: 0, other: 0 };
  for (const emp of activeEmployees) {
    const g = (emp.gender || 'other').toLowerCase();
    if (g in genderMap) genderMap[g]++;
    else genderMap.other++;
  }
  const genderDistribution = Object.entries(genderMap).map(([gender, count]) => ({
    gender: gender.charAt(0).toUpperCase() + gender.slice(1),
    count,
  }));

  // 6. Tenure Buckets
  const now = new Date();
  const tenureMap = {
    '0-1 year': 0,
    '1-3 years': 0,
    '3-5 years': 0,
    '5+ years': 0,
  };

  for (const emp of activeEmployees) {
    const joined = new Date(emp.joiningDate);
    const years = Math.max(0, (now.getTime() - joined.getTime()) / (1000 * 60 * 60 * 24 * 365.25));

    if (years < 1) tenureMap['0-1 year']++;
    else if (years < 3) tenureMap['1-3 years']++;
    else if (years < 5) tenureMap['3-5 years']++;
    else tenureMap['5+ years']++;
  }

  const tenureBuckets = Object.entries(tenureMap).map(([bucket, count]) => ({
    bucket,
    count,
  }));

  // 7. Latest 10 Audit Entries
  const latestAuditDocs = await AuditLog.find()
    .populate('actorId', 'name email role')
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  const latestAudit = latestAuditDocs.map((a) => ({
    id: a._id,
    actor: a.actorId?.name || 'System',
    action: a.action,
    entity: a.entity,
    time: a.createdAt,
  }));

  return {
    kpis: {
      headcount,
      attritionYTD,
      payrollCostThisMonth,
      payrollCostYTD,
      averageSalary,
    },
    headcountByDepartment,
    payrollCostByDepartment,
    genderDistribution,
    tenureBuckets,
    latestAudit,
  };
}

/**
 * Employee Dashboard Data Generator
 */
async function getEmployeeDashboard(employeeId, query = {}) {
  const { todayStr, currentMonth } = resolveFilters(query);
  const nowInfo = getKarachiNow();

  // 1. Hours this week vs 40 (Monday to today)
  // Day of week: 0 = Sun, 1 = Mon, 2 = Tue, ..., 6 = Sat
  // Calculate Monday date of current week
  const dayOffset = (nowInfo.dayOfWeek === 0 ? 7 : nowInfo.dayOfWeek) - 1; // days since Monday
  const mondayDate = new Date(nowInfo.now);
  mondayDate.setUTCDate(mondayDate.getUTCDate() - dayOffset);
  const mondayStr = getKarachiDate(mondayDate);

  const weekAttendances = await Attendance.find({
    employeeId,
    date: { $gte: mondayStr, $lte: todayStr },
  }).lean();

  let workedMinutesThisWeek = 0;
  for (const a of weekAttendances) {
    if (a.workedMinutes) workedMinutesThisWeek += a.workedMinutes;
  }
  const hoursThisWeek = Math.round((workedMinutesThisWeek / 60) * 10) / 10;

  // 2. Late count this month
  const monthAttendances = await Attendance.find({
    employeeId,
    date: { $regex: new RegExp(`^${currentMonth}`) },
  }).lean();

  let lateCountThisMonth = 0;
  for (const a of monthAttendances) {
    if (a.isLate || a.status === 'late') {
      lateCountThisMonth++;
    }
  }

  // 3. Leave Balances per type
  const currentYear = parseInt(currentMonth.split('-')[0], 10);
  const leaveBalances = await getLeaveBalance(employeeId, currentYear);

  // 4. Last Payslip Summary
  const lastPayslip = await getLastPayslip(employeeId);

  // 5. Today's Attendance State
  const todayRecord = await Attendance.findOne({ employeeId, date: todayStr }).lean();
  const todayAttendance = {
    checkedIn: !!todayRecord?.checkInAt,
    checkedOut: !!todayRecord?.checkOutAt,
    checkInAt: todayRecord?.checkInAt || null,
    checkOutAt: todayRecord?.checkOutAt || null,
    status: todayRecord?.status || null,
    workedMinutes: todayRecord?.workedMinutes || 0,
  };

  // 6. Latest 3 Announcements
  const recentAnnouncements = await Announcement.find()
    .sort({ pinned: -1, createdAt: -1 })
    .limit(3)
    .lean();

  return {
    hoursThisWeek,
    lateCountThisMonth,
    leaveBalances,
    lastPayslip: lastPayslip
      ? {
          id: lastPayslip._id,
          month: lastPayslip.month,
          gross: lastPayslip.earnedGross,
          deduction: lastPayslip.deduction,
          netPay: lastPayslip.netPay,
        }
      : null,
    todayAttendance,
    recentAnnouncements,
  };
}

/**
 * Reusable Dispatcher for Part 6 AI Assistant:
 * getDashboardData(role, user, filters)
 */
async function getDashboardData(role, user, filters = {}) {
  if (role === 'admin') {
    return getAdminDashboard(filters);
  }
  if (role === 'hr') {
    return getHrDashboard(filters);
  }
  if (role === 'employee') {
    return getEmployeeDashboard(user.employeeId, filters);
  }
  throw new Error(`Unsupported role '${role}' for dashboard`);
}

module.exports = {
  getHrDashboard,
  getAdminDashboard,
  getEmployeeDashboard,
  getDashboardData,
  round2,
};
