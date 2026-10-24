'use strict';

const {
  SalaryStructure,
  PayrollRun,
  Payslip,
  Employee,
  Department,
  Settings,
  Holiday,
  Attendance,
} = require('../../models');
const { conflict, validation, notFound, forbidden } = require('../../utils/httpError');
const { logAction } = require('../../utils/audit');
const { notify } = require('../../utils/notify');
const {
  getKarachiNow,
  getKarachiDate,
  getDaysInMonth,
  getDateRange,
} = require('../../utils/time');
const { countWorkingDays, getDayStatus } = require('../attendance/service');
const { getApprovedLeaveDaysByType } = require('../leave/service');
const { updateBasicSalary, registerSummaryProvider } = require('../employees/service');
const { calculateAnnualTax, calculateMonthlyTax, round2 } = require('./tax');

/**
 * Computes gross amount given salary structure components.
 */
function computeGross(basic, hraPercent = 40, medicalPercent = 10, otherAllowance = 0) {
  const b = Number(basic) || 0;
  const h = round2((b * (Number(hraPercent) || 0)) / 100);
  const m = round2((b * (Number(medicalPercent) || 0)) / 100);
  const o = Number(otherAllowance) || 0;
  return round2(b + h + m + o);
}

/**
 * Get salary structure by employeeId, synthesizing defaults if none exists.
 */
async function getSalaryStructureByEmployeeId(employeeId) {
  const employee = await Employee.findById(employeeId)
    .populate('departmentId', 'name code')
    .populate('designationId', 'title code')
    .lean();

  if (!employee) {
    throw notFound('Employee not found');
  }

  let structure = await SalaryStructure.findOne({ employeeId }).lean();
  if (!structure) {
    // Synthesize default structure
    structure = {
      employeeId: employee._id,
      basic: employee.basicSalary || 0,
      hraPercent: 40,
      medicalPercent: 10,
      otherAllowance: 0,
      gross: computeGross(employee.basicSalary || 0, 40, 10, 0),
      isDefault: true,
      employee,
    };
  } else {
    structure.gross = computeGross(
      structure.basic,
      structure.hraPercent,
      structure.medicalPercent,
      structure.otherAllowance
    );
    structure.employee = employee;
  }

  return structure;
}

/**
 * List salary structures with search, department filter, and pagination.
 */
async function listSalaryStructures(query = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.max(1, parseInt(query.limit, 10) || 10);
  const skip = (page - 1) * limit;

  const empFilter = { status: { $in: ['active', 'probation'] } };
  if (query.departmentId) {
    empFilter.departmentId = query.departmentId;
  }
  if (query.q) {
    const escaped = query.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'i');
    empFilter.$or = [{ name: regex }, { email: regex }, { employeeCode: regex }];
  }

  const [total, employees] = await Promise.all([
    Employee.countDocuments(empFilter),
    Employee.find(empFilter)
      .populate('departmentId', 'name code')
      .populate('designationId', 'title code')
      .sort({ employeeCode: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  const empIds = employees.map((e) => e._id);
  const structures = await SalaryStructure.find({ employeeId: { $in: empIds } }).lean();
  const structureMap = new Map(structures.map((s) => [s.employeeId.toString(), s]));

  const items = employees.map((emp) => {
    const existing = structureMap.get(emp._id.toString());
    const basic = existing ? existing.basic : emp.basicSalary;
    const hraPercent = existing ? existing.hraPercent : 40;
    const medicalPercent = existing ? existing.medicalPercent : 10;
    const otherAllowance = existing ? existing.otherAllowance : 0;
    const gross = computeGross(basic, hraPercent, medicalPercent, otherAllowance);

    return {
      _id: existing?._id || null,
      employeeId: emp._id,
      employeeCode: emp.employeeCode,
      name: emp.name,
      department: emp.departmentId?.name || '—',
      designation: emp.designationId?.title || '—',
      basic,
      hraPercent,
      medicalPercent,
      otherAllowance,
      gross,
      isCustom: !!existing,
      updatedAt: existing?.updatedAt || emp.updatedAt,
    };
  });

  return {
    items,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit) || 1,
    },
  };
}

/**
 * Update or create salary structure for an employee (HR only).
 * Syncs Employee.basicSalary through updateBasicSalary.
 */
async function updateSalaryStructure(employeeId, data, actor) {
  const employee = await Employee.findById(employeeId);
  if (!employee) {
    throw notFound('Employee not found');
  }

  const basic = Number(data.basic);
  const hraPercent = data.hraPercent !== undefined ? Number(data.hraPercent) : 40;
  const medicalPercent = data.medicalPercent !== undefined ? Number(data.medicalPercent) : 10;
  const otherAllowance = data.otherAllowance !== undefined ? Number(data.otherAllowance) : 0;

  if (isNaN(basic) || basic <= 0) {
    throw validation('Basic salary must be greater than 0', { basic: 'Invalid basic salary' });
  }
  if (hraPercent < 0 || hraPercent > 100) {
    throw validation('HRA percentage must be between 0 and 100', { hraPercent: 'Invalid percentage' });
  }
  if (medicalPercent < 0 || medicalPercent > 100) {
    throw validation('Medical percentage must be between 0 and 100', { medicalPercent: 'Invalid percentage' });
  }
  if (otherAllowance < 0) {
    throw validation('Other allowance cannot be negative', { otherAllowance: 'Invalid allowance' });
  }

  // 1. Sync Employee.basicSalary via updateBasicSalary (writes employee audit log)
  await updateBasicSalary(employeeId, basic, actor);

  // 2. Upsert SalaryStructure
  let structure = await SalaryStructure.findOne({ employeeId });
  const before = structure ? structure.toObject() : null;

  if (!structure) {
    structure = new SalaryStructure({
      employeeId,
      basic,
      hraPercent,
      medicalPercent,
      otherAllowance,
      updatedBy: actor._id,
    });
  } else {
    structure.basic = basic;
    structure.hraPercent = hraPercent;
    structure.medicalPercent = medicalPercent;
    structure.otherAllowance = otherAllowance;
    structure.updatedBy = actor._id;
  }

  await structure.save();

  // 3. Log audit for SalaryStructure
  await logAction({
    actor,
    action: before ? 'UPDATE_SALARY_STRUCTURE' : 'CREATE_SALARY_STRUCTURE',
    entity: 'SalaryStructure',
    entityId: structure._id,
    before: before
      ? {
          basic: before.basic,
          hraPercent: before.hraPercent,
          medicalPercent: before.medicalPercent,
          otherAllowance: before.otherAllowance,
        }
      : null,
    after: {
      basic: structure.basic,
      hraPercent: structure.hraPercent,
      medicalPercent: structure.medicalPercent,
      otherAllowance: structure.otherAllowance,
    },
  });

  return getSalaryStructureByEmployeeId(employeeId);
}

/**
 * Calculate single employee payslip snapshot for a specific month.
 */
async function computeEmployeePayslip(employee, month, workingDays, context = {}) {
  const daysInMonth = context.daysInMonth || getDaysInMonth(month);
  const monthStart = daysInMonth[0];
  const monthEnd = daysInMonth[daysInMonth.length - 1];
  const { todayStr } = context.nowInfo || getKarachiNow();

  const joiningDateStr = getKarachiDate(employee.joiningDate);
  const exitDateStr = employee.exitDate ? getKarachiDate(employee.exitDate) : null;

  // Skip joiners after month end or leavers before month start
  if (joiningDateStr > monthEnd) return null;
  if (exitDateStr && exitDateStr < monthStart) return null;

  // Proration eligible range
  const eligibleStart = joiningDateStr > monthStart ? joiningDateStr : monthStart;
  const eligibleEnd = exitDateStr && exitDateStr < monthEnd ? exitDateStr : monthEnd;

  if (eligibleStart > eligibleEnd) return null;

  const eligibleDays = await countWorkingDays(eligibleStart, eligibleEnd);
  if (eligibleDays <= 0) return null;

  // Fetch or synthesize structure
  let structure = context.structureMap ? context.structureMap.get(employee._id.toString()) : null;
  if (!structure) {
    structure = await SalaryStructure.findOne({ employeeId: employee._id }).lean();
  }

  const basic = structure ? structure.basic : employee.basicSalary;
  const hraPercent = structure ? structure.hraPercent : 40;
  const medicalPercent = structure ? structure.medicalPercent : 10;
  const otherAllowance = structure ? structure.otherAllowance : 0;

  const hra = round2((basic * hraPercent) / 100);
  const medical = round2((basic * medicalPercent) / 100);
  const gross = round2(basic + hra + medical + otherAllowance);

  const perDay = workingDays > 0 ? round2(gross / workingDays) : 0;
  const earnedGross = eligibleDays === workingDays ? gross : round2(perDay * eligibleDays);


  // Deductions within eligible range
  // 1. Absent days (strictly before today)
  const eligibleDates = getDateRange(eligibleStart, eligibleEnd);
  let absentDays = 0;
  for (const dateStr of eligibleDates) {
    // Today and future days are never absent
    if (dateStr >= todayStr) continue;

    const status = await getDayStatus(employee._id, dateStr);
    if (status === 'absent') {
      absentDays++;
    }
  }

  // 2. Unpaid leave days
  const leaveByType = await getApprovedLeaveDaysByType(employee._id, eligibleStart, eligibleEnd);
  const unpaidLeaveDays = leaveByType
    .filter((l) => !l.isPaid)
    .reduce((sum, l) => sum + l.days, 0);

  // 3. Half days
  const halfDays = await Attendance.countDocuments({
    employeeId: employee._id,
    date: { $gte: eligibleStart, $lte: eligibleEnd },
    status: 'half_day',
  });

  const deductionDays = round2(absentDays + unpaidLeaveDays + 0.5 * halfDays);
  const deduction = round2(perDay * deductionDays);

  // Tax calculation
  const tax = calculateMonthlyTax(gross, eligibleDays, workingDays);
  const netPay = round2(Math.max(0, earnedGross - deduction - tax));

  return {
    employeeId: employee._id,
    month,
    employeeName: employee.name,
    employeeCode: employee.employeeCode,
    departmentId: employee.departmentId?._id || employee.departmentId || null,
    departmentName: employee.departmentId?.name || '',
    designationName: employee.designationId?.title || '',
    basic,
    hraPercent,
    hra,
    medicalPercent,
    medical,
    otherAllowance,
    gross,
    workingDays,
    eligibleDays,
    absentDays,
    unpaidLeaveDays,
    halfDays,
    deductionDays,
    perDay,
    earnedGross,
    deduction,
    tax,
    netPay,
  };
}

/**
 * Generate all payslips for a given month and calculate run totals.
 */
async function generateAllPayslips(month) {
  const daysInMonth = getDaysInMonth(month);
  const monthStart = daysInMonth[0];
  const monthEnd = daysInMonth[daysInMonth.length - 1];
  const workingDays = await countWorkingDays(monthStart, monthEnd);

  // All employees who might be eligible:
  // Active, probation, or exited employees who exited on or after monthStart
  const employees = await Employee.find({
    $or: [
      { status: { $in: ['active', 'probation'] } },
      { status: 'exited', exitDate: { $gte: new Date(monthStart) } },
    ],
  })
    .populate('departmentId', 'name')
    .populate('designationId', 'title')
    .lean();

  const structures = await SalaryStructure.find({
    employeeId: { $in: employees.map((e) => e._id) },
  }).lean();
  const structureMap = new Map(structures.map((s) => [s.employeeId.toString(), s]));

  const nowInfo = getKarachiNow();
  const context = { daysInMonth, nowInfo, structureMap };

  const payslipsData = [];
  const totals = { employees: 0, gross: 0, deductions: 0, tax: 0, net: 0 };

  for (const emp of employees) {
    const slip = await computeEmployeePayslip(emp, month, workingDays, context);
    if (!slip) continue;

    payslipsData.push(slip);
    totals.employees++;
    totals.gross = round2(totals.gross + slip.earnedGross);
    totals.deductions = round2(totals.deductions + slip.deduction);
    totals.tax = round2(totals.tax + slip.tax);
    totals.net = round2(totals.net + slip.netPay);
  }

  return { payslipsData, totals, workingDays };
}

/**
 * Create a draft payroll run (HR only).
 */
async function createPayrollRun(month, actor) {
  const { todayStr } = getKarachiNow();
  const currentMonth = todayStr.slice(0, 7);

  if (month > currentMonth) {
    throw validation('Payroll run cannot be created for a future month', { month: 'Future month not allowed' });
  }

  const existingRun = await PayrollRun.findOne({ month });
  if (existingRun) {
    throw conflict(`Payroll run for ${month} already exists`);
  }

  const { payslipsData, totals } = await generateAllPayslips(month);

  const run = await PayrollRun.create({
    month,
    status: 'draft',
    createdBy: actor._id,
    totals,
  });

  // Assign runId to all payslips and insert
  const payslipsToInsert = payslipsData.map((p) => ({ ...p, runId: run._id }));
  if (payslipsToInsert.length > 0) {
    await Payslip.insertMany(payslipsToInsert);
  }

  await logAction({
    actor,
    action: 'CREATE_PAYROLL_RUN',
    entity: 'PayrollRun',
    entityId: run._id,
    after: { month, status: run.status, totals },
  });

  return run;
}

/**
 * List all payroll runs (HR and Admin).
 */
async function listPayrollRuns() {
  return PayrollRun.find()
    .populate('createdBy', 'name')
    .populate('finalizedBy', 'name')
    .sort({ month: -1 })
    .lean();
}

/**
 * Get payroll run details with filtered and paginated payslips.
 */
async function getPayrollRunById(id, query = {}) {
  const run = await PayrollRun.findById(id)
    .populate('createdBy', 'name')
    .populate('finalizedBy', 'name')
    .lean();

  if (!run) {
    throw notFound('Payroll run not found');
  }

  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.max(1, parseInt(query.limit, 10) || 10);
  const skip = (page - 1) * limit;

  const filter = { runId: run._id };
  if (query.departmentId) {
    filter.departmentId = query.departmentId;
  }
  if (query.q) {
    const escaped = query.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'i');
    filter.$or = [{ employeeName: regex }, { employeeCode: regex }];
  }

  const [total, payslips] = await Promise.all([
    Payslip.countDocuments(filter),
    Payslip.find(filter)
      .sort({ employeeCode: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  return {
    run,
    payslips,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit) || 1,
    },
  };
}

/**
 * Recalculate draft payroll run (HR only).
 */
async function recalculatePayrollRun(id, actor) {
  const run = await PayrollRun.findById(id);
  if (!run) {
    throw notFound('Payroll run not found');
  }

  if (run.status === 'finalized') {
    throw conflict('Cannot recalculate a finalized payroll run');
  }

  const { payslipsData, totals } = await generateAllPayslips(run.month);

  // Delete previous draft payslips
  await Payslip.deleteMany({ runId: run._id });

  // Insert refreshed payslips
  const payslipsToInsert = payslipsData.map((p) => ({ ...p, runId: run._id }));
  if (payslipsToInsert.length > 0) {
    await Payslip.insertMany(payslipsToInsert);
  }

  run.totals = totals;
  await run.save();

  await logAction({
    actor,
    action: 'RECALCULATE_PAYROLL_RUN',
    entity: 'PayrollRun',
    entityId: run._id,
    after: { month: run.month, totals },
  });

  return run;
}

/**
 * Delete draft payroll run (HR only).
 */
async function deletePayrollRun(id, actor) {
  const run = await PayrollRun.findById(id);
  if (!run) {
    throw notFound('Payroll run not found');
  }

  if (run.status === 'finalized') {
    throw conflict('Cannot delete a finalized payroll run');
  }

  await Payslip.deleteMany({ runId: run._id });
  await PayrollRun.findByIdAndDelete(run._id);

  await logAction({
    actor,
    action: 'DELETE_PAYROLL_RUN',
    entity: 'PayrollRun',
    entityId: run._id,
    before: { month: run.month, totals: run.totals },
  });

  return { message: 'Payroll run deleted successfully' };
}

/**
 * Finalize payroll run (Admin only).
 * Locks the run, sends notifications to all employees in the run.
 */
async function finalizePayrollRun(id, actor) {
  const run = await PayrollRun.findById(id);
  if (!run) {
    throw notFound('Payroll run not found');
  }

  if (run.status === 'finalized') {
    throw conflict('Payroll run is already finalized');
  }

  run.status = 'finalized';
  run.finalizedBy = actor._id;
  run.finalizedAt = new Date();
  await run.save();

  // Notify every employee in the run
  const payslips = await Payslip.find({ runId: run._id }).populate({
    path: 'employeeId',
    select: 'userId',
  });

  for (const slip of payslips) {
    if (slip.employeeId?.userId) {
      notify(
        slip.employeeId.userId,
        'PAYROLL_FINALIZED',
        `Payslip for ${run.month} is available`
      );
    }
  }

  await logAction({
    actor,
    action: 'FINALIZE_PAYROLL_RUN',
    entity: 'PayrollRun',
    entityId: run._id,
    after: { month: run.month, status: 'finalized', finalizedAt: run.finalizedAt },
  });

  return run;
}

/**
 * Get payslips for current logged-in employee (finalized runs only).
 */
async function getMyPayslips(employeeId) {
  if (!employeeId) {
    return [];
  }

  const finalizedRuns = await PayrollRun.find({ status: 'finalized' }).select('_id month').lean();
  const runMap = new Map(finalizedRuns.map((r) => [r._id.toString(), r]));

  const payslips = await Payslip.find({
    employeeId,
    runId: { $in: Array.from(runMap.keys()) },
  })
    .sort({ month: -1 })
    .lean();

  return payslips;
}

/**
 * Get single payslip by ID, enforcing permissions.
 */
async function getPayslipById(id, actor) {
  const payslip = await Payslip.findById(id).lean();
  if (!payslip) {
    throw notFound('Payslip not found');
  }

  const run = await PayrollRun.findById(payslip.runId).lean();
  if (!run) {
    throw notFound('Associated payroll run not found');
  }

  // Permission check:
  // Admin & HR can view any payslip.
  // Employee can only view their own AND only if run is finalized.
  if (actor.role === 'employee') {
    const isSelf = actor.employeeId && actor.employeeId.toString() === payslip.employeeId.toString();
    if (!isSelf || run.status !== 'finalized') {
      throw forbidden('You do not have permission to view this payslip');
    }
  }

  return { payslip, run };
}

/**
 * Reusable export for Parts 5 and 6:
 * getPayrollSummary({ month, from, to, departmentId, includeDraft = false })
 */
async function getPayrollSummary({ month, from, to, departmentId = null, includeDraft = false } = {}) {
  const runFilter = {};
  if (!includeDraft) {
    runFilter.status = 'finalized';
  }
  if (month) {
    runFilter.month = month;
  } else if (from && to) {
    runFilter.month = { $gte: from.slice(0, 7), $lte: to.slice(0, 7) };
  }

  const runs = await PayrollRun.find(runFilter).lean();
  const runIds = runs.map((r) => r._id);

  const payslipFilter = { runId: { $in: runIds } };
  if (departmentId) {
    payslipFilter.departmentId = departmentId;
  }

  const payslips = await Payslip.find(payslipFilter).lean();

  const byMonth = {};
  const byDepartment = {};
  const overall = { gross: 0, deductions: 0, tax: 0, net: 0, count: payslips.length };

  for (const p of payslips) {
    // By Month
    if (!byMonth[p.month]) {
      byMonth[p.month] = { gross: 0, deductions: 0, tax: 0, net: 0, count: 0 };
    }
    byMonth[p.month].gross = round2(byMonth[p.month].gross + p.earnedGross);
    byMonth[p.month].deductions = round2(byMonth[p.month].deductions + p.deduction);
    byMonth[p.month].tax = round2(byMonth[p.month].tax + p.tax);
    byMonth[p.month].net = round2(byMonth[p.month].net + p.netPay);
    byMonth[p.month].count++;

    // By Department
    const deptKey = p.departmentName || 'Unassigned';
    if (!byDepartment[deptKey]) {
      byDepartment[deptKey] = { gross: 0, deductions: 0, tax: 0, net: 0, count: 0 };
    }
    byDepartment[deptKey].gross = round2(byDepartment[deptKey].gross + p.earnedGross);
    byDepartment[deptKey].deductions = round2(byDepartment[deptKey].deductions + p.deduction);
    byDepartment[deptKey].tax = round2(byDepartment[deptKey].tax + p.tax);
    byDepartment[deptKey].net = round2(byDepartment[deptKey].net + p.netPay);
    byDepartment[deptKey].count++;

    // Overall
    overall.gross = round2(overall.gross + p.earnedGross);
    overall.deductions = round2(overall.deductions + p.deduction);
    overall.tax = round2(overall.tax + p.tax);
    overall.net = round2(overall.net + p.netPay);
  }

  return { overall, byMonth, byDepartment };
}

/**
 * Reusable export:
 * getAverageSalary({ departmentId, designationId })
 * Mean gross of active and probation employees from salary structures.
 */
async function getAverageSalary({ departmentId = null, designationId = null } = {}) {
  const filter = { status: { $in: ['active', 'probation'] } };
  if (departmentId) filter.departmentId = departmentId;
  if (designationId) filter.designationId = designationId;

  const employees = await Employee.find(filter).select('_id basicSalary').lean();
  if (employees.length === 0) return 0;

  const structures = await SalaryStructure.find({
    employeeId: { $in: employees.map((e) => e._id) },
  }).lean();
  const map = new Map(structures.map((s) => [s.employeeId.toString(), s]));

  let totalGross = 0;
  for (const emp of employees) {
    const s = map.get(emp._id.toString());
    const gross = s
      ? computeGross(s.basic, s.hraPercent, s.medicalPercent, s.otherAllowance)
      : computeGross(emp.basicSalary, 40, 10, 0);
    totalGross += gross;
  }

  return round2(totalGross / employees.length);
}

/**
 * Reusable export:
 * getLastPayslip(employeeId)
 */
async function getLastPayslip(employeeId) {
  const finalizedRuns = await PayrollRun.find({ status: 'finalized' }).select('_id').lean();
  const runIds = finalizedRuns.map((r) => r._id);

  return Payslip.findOne({
    employeeId,
    runId: { $in: runIds },
  })
    .sort({ month: -1 })
    .lean();
}

/**
 * Reusable export:
 * getPayrollCostThisYear()
 */
async function getPayrollCostThisYear() {
  const { todayStr } = getKarachiNow();
  const currentYear = todayStr.slice(0, 4);

  const runs = await PayrollRun.find({
    status: 'finalized',
    month: { $regex: new RegExp(`^${currentYear}`) },
  }).lean();

  let totalGross = 0;
  let totalNet = 0;
  for (const r of runs) {
    totalGross = round2(totalGross + (r.totals?.gross || 0));
    totalNet = round2(totalNet + (r.totals?.net || 0));
  }

  return { year: currentYear, totalGross, totalNet, runsCount: runs.length };
}

// Register with Employee 360 summary provider
registerSummaryProvider('payroll', async (employeeId) => {
  const [lastPayslip, structure] = await Promise.all([
    getLastPayslip(employeeId),
    getSalaryStructureByEmployeeId(employeeId),
  ]);

  return {
    lastPayslip,
    currentStructure: {
      basic: structure.basic,
      hraPercent: structure.hraPercent,
      medicalPercent: structure.medicalPercent,
      otherAllowance: structure.otherAllowance,
      gross: structure.gross,
    },
  };
});

module.exports = {
  computeGross,
  getSalaryStructureByEmployeeId,
  listSalaryStructures,
  updateSalaryStructure,
  computeEmployeePayslip,
  createPayrollRun,
  listPayrollRuns,
  getPayrollRunById,
  recalculatePayrollRun,
  deletePayrollRun,
  finalizePayrollRun,
  getMyPayslips,
  getPayslipById,
  getPayrollSummary,
  getAverageSalary,
  getLastPayslip,
  getPayrollCostThisYear,
};
