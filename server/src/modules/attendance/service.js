'use strict';
const {
  Attendance,
  AttendanceCorrection,
  Settings,
  Holiday,
  Employee,
  User,
} = require('../../models');

const { hasApprovedLeave, getWhoIsOnLeave } = require('../leave/service');
const { validation, conflict, notFound, forbidden } = require('../../utils/httpError');
const { logAction } = require('../../utils/audit');
const { notify } = require('../../utils/notify');
const {
  getKarachiNow,
  getKarachiDate,
  getKarachiTime,
  isWeekend,
  getDaysInMonth,
  getDateRange,
} = require('../../utils/time');
const { registerSummaryProvider } = require('../employees/service');

/**
 * Evaluates whether a given timestamp is late relative to officeStart + graceMinutes
 */
async function checkIsLate(checkInDate) {
  const settings = await Settings.findOne();
  const officeStartStr = settings?.officeStart || '09:00';
  const graceMinutes = settings?.graceMinutes !== undefined ? settings.graceMinutes : 15;

  const [startH, startM] = officeStartStr.split(':').map(Number);
  const thresholdMinutes = startH * 60 + startM + graceMinutes;

  const { hours, minutes } = getKarachiTime(checkInDate);
  const checkInMinutes = hours * 60 + minutes;

  return checkInMinutes > thresholdMinutes;
}

/**
 * Centralized day status resolver.
 * Reused across board, calendar, summary, and dashboards.
 */
async function getDayStatus(employeeId, dateStr, context = {}) {
  const { todayStr } = getKarachiNow();

  // 1. Check if an Attendance record exists
  let attendance = context.attendanceMap ? context.attendanceMap.get(String(employeeId)) : null;
  if (!attendance && !context.attendanceMap) {
    attendance = await Attendance.findOne({ employeeId, date: dateStr }).lean();
  }

  if (attendance) {
    if (attendance.checkOutAt) {
      return attendance.status; // 'present' | 'late' | 'half_day'
    }
    // No checkout yet
    if (dateStr < todayStr) {
      return 'missing_checkout';
    }
    return attendance.isLate ? 'late' : 'present';
  }

  // 2. Check if approved leave on this day
  const onLeave = context.leaveSet
    ? context.leaveSet.has(String(employeeId))
    : await hasApprovedLeave(employeeId, dateStr);
  if (onLeave) {
    return 'on_leave';
  }

  // 3. Check public holidays
  const isHoliday = context.holidaySet
    ? context.holidaySet.has(dateStr)
    : !!(await Holiday.findOne({
        date: {
          $gte: new Date(dateStr + 'T00:00:00.000Z'),
          $lte: new Date(dateStr + 'T23:59:59.999Z'),
        },
      }));
  if (isHoliday) {
    return 'holiday';
  }

  // 4. Check weekend
  const weekendDays = context.weekendDays || (await Settings.findOne())?.weekend || [0, 6];
  if (isWeekend(dateStr, weekendDays)) {
    return 'weekend';
  }

  // 5. Past vs future work day
  if (dateStr <= todayStr) {
    return 'absent';
  }
  return 'scheduled';
}

/**
 * Employee Check-In. Time is stamped strictly from server in Asia/Karachi.
 */
async function checkIn(employeeId, actor) {
  const { now, todayStr } = getKarachiNow();

  // 1. One check-in per day
  const existing = await Attendance.findOne({ employeeId, date: todayStr });
  if (existing) {
    throw conflict('Already checked in for today');
  }

  // 2. Weekend check
  const settings = await Settings.findOne();
  const weekendDays = settings?.weekend?.length ? settings.weekend : [0, 6];
  if (isWeekend(todayStr, weekendDays)) {
    throw validation('Check-in is not allowed on weekends');
  }

  // 3. Holiday check
  const holiday = await Holiday.findOne({
    date: {
      $gte: new Date(todayStr + 'T00:00:00.000Z'),
      $lte: new Date(todayStr + 'T23:59:59.999Z'),
    },
  });
  if (holiday) {
    throw validation(`Check-in is not allowed on public holidays (${holiday.name})`);
  }

  // 4. Approved leave check
  const onLeave = await hasApprovedLeave(employeeId, todayStr);
  if (onLeave) {
    throw validation('Check-in is not allowed: You have an approved leave for today');
  }

  // 5. Compute isLate
  const isLate = await checkIsLate(now);
  const status = isLate ? 'late' : 'present';

  const attendance = await Attendance.create({
    employeeId,
    date: todayStr,
    checkInAt: now,
    source: 'web',
    isLate,
    status,
  });

  await logAction({
    actor,
    action: 'CHECK_IN',
    entity: 'Attendance',
    entityId: attendance._id,
    after: { employeeId, date: todayStr, isLate, status },
  });

  return attendance;
}

/**
 * Employee Check-Out. Stamps server time and computes worked hours.
 */
async function checkOut(employeeId, actor) {
  const { now, todayStr } = getKarachiNow();

  const record = await Attendance.findOne({ employeeId, date: todayStr });
  if (!record) {
    throw validation('No check-in record found for today');
  }

  if (record.checkOutAt) {
    throw conflict('Already checked out for today');
  }

  const workedMinutes = Math.max(0, Math.round((now.getTime() - record.checkInAt.getTime()) / 60000));

  const settings = await Settings.findOne();
  const halfDayThresholdMinutes = (settings?.halfDayHours || 5) * 60;

  let status = 'present';
  if (workedMinutes < halfDayThresholdMinutes) {
    status = 'half_day';
  } else if (record.isLate) {
    status = 'late';
  } else {
    status = 'present';
  }

  record.checkOutAt = now;
  record.workedMinutes = workedMinutes;
  record.status = status;
  await record.save();

  await logAction({
    actor,
    action: 'CHECK_OUT',
    entity: 'Attendance',
    entityId: record._id,
    after: { employeeId, date: todayStr, workedMinutes, status },
  });

  return record;
}

/**
 * Monthly attendance calendar data for the requesting employee.
 */
async function getMyAttendance(employeeId, month) {
  const targetMonth = month || getKarachiNow().todayStr.slice(0, 7);
  const daysInMonth = getDaysInMonth(targetMonth);

  const startOfMonth = daysInMonth[0];
  const endOfMonth = daysInMonth[daysInMonth.length - 1];

  const settings = await Settings.findOne();
  const weekendDays = settings?.weekend?.length ? settings.weekend : [0, 6];

  const [attendances, holidays] = await Promise.all([
    Attendance.find({
      employeeId,
      date: { $gte: startOfMonth, $lte: endOfMonth },
    }).lean(),
    Holiday.find({
      date: {
        $gte: new Date(startOfMonth + 'T00:00:00.000Z'),
        $lte: new Date(endOfMonth + 'T23:59:59.999Z'),
      },
    }).lean(),
  ]);

  const attendanceMap = new Map(attendances.map((a) => [a.date, a]));
  const holidayMap = new Map(holidays.map((h) => [getKarachiDate(h.date), h.name]));

  const summary = {
    present: 0,
    late: 0,
    half_day: 0,
    absent: 0,
    on_leave: 0,
    missing_checkout: 0,
    workingDaysExpected: 0,
    totalWorkedMinutes: 0,
  };

  const days = [];
  for (const dateStr of daysInMonth) {
    const attendance = attendanceMap.get(dateStr) || null;
    const holidayName = holidayMap.get(dateStr) || null;

    const context = {
      attendanceMap: new Map([[String(employeeId), attendance]]),
      holidaySet: new Set(holidayMap.keys()),
      weekendDays,
    };

    const status = await getDayStatus(employeeId, dateStr, context);

    if (status !== 'weekend' && status !== 'holiday') {
      summary.workingDaysExpected++;
    }

    if (summary[status] !== undefined) {
      summary[status]++;
    }

    if (attendance?.workedMinutes) {
      summary.totalWorkedMinutes += attendance.workedMinutes;
    }

    days.push({
      date: dateStr,
      status,
      checkInAt: attendance?.checkInAt || null,
      checkOutAt: attendance?.checkOutAt || null,
      workedMinutes: attendance?.workedMinutes || 0,
      isLate: attendance?.isLate || false,
      holidayName,
    });
  }

  return { month: targetMonth, days, summary };
}

/**
 * Live Attendance Board for HR/Admin on a specific date.
 */
async function getAttendanceBoard(query = {}) {
  const { todayStr } = getKarachiNow();
  const targetDate = query.date || todayStr;

  const empFilter = { status: { $in: ['active', 'probation'] } };
  if (query.departmentId) {
    empFilter.departmentId = query.departmentId;
  }
  if (query.q) {
    const escaped = query.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'i');
    empFilter.$or = [{ name: regex }, { employeeCode: regex }, { email: regex }];
  }

  const page = query.page || 1;
  const limit = query.limit || 50;
  const skip = (page - 1) * limit;

  const [totalEmployees, employees, attendances, whoOnLeave, holidays, settings] = await Promise.all([
    Employee.countDocuments(empFilter),
    Employee.find(empFilter)
      .populate('departmentId', 'name code')
      .populate('designationId', 'title code')
      .sort({ employeeCode: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Attendance.find({ date: targetDate }).lean(),
    getWhoIsOnLeave(targetDate),
    Holiday.find({
      date: {
        $gte: new Date(targetDate + 'T00:00:00.000Z'),
        $lte: new Date(targetDate + 'T23:59:59.999Z'),
      },
    }).lean(),
    Settings.findOne().lean(),
  ]);

  const attendanceMap = new Map(attendances.map((a) => [String(a.employeeId), a]));
  const leaveSet = new Set(whoOnLeave.map((l) => String(l.employee?._id || l.employee)));
  const holidaySet = new Set(holidays.map((h) => getKarachiDate(h.date)));
  const weekendDays = settings?.weekend?.length ? settings.weekend : [0, 6];

  const counts = {
    present: 0,
    late: 0,
    half_day: 0,
    absent: 0,
    on_leave: 0,
    missing_checkout: 0,
    total: employees.length,
  };

  const rows = [];
  for (const emp of employees) {
    const context = {
      attendanceMap,
      leaveSet,
      holidaySet,
      weekendDays,
    };

    const status = await getDayStatus(emp._id, targetDate, context);
    const attendance = attendanceMap.get(String(emp._id)) || null;

    if (counts[status] !== undefined) {
      counts[status]++;
    }

    rows.push({
      employee: {
        _id: emp._id,
        name: emp.name,
        employeeCode: emp.employeeCode,
        department: emp.departmentId?.name || '—',
        designation: emp.designationId?.title || emp.designationId?.name || '—',
      },
      status,
      checkInAt: attendance?.checkInAt || null,
      checkOutAt: attendance?.checkOutAt || null,
      workedMinutes: attendance?.workedMinutes || 0,
      isLate: attendance?.isLate || false,
    });
  }

  return {
    date: targetDate,
    employees: rows,
    counts,
    pagination: {
      total: totalEmployees,
      page,
      limit,
      totalPages: Math.ceil(totalEmployees / limit) || 1,
    },
  };
}

/**
 * Employee requests an attendance correction.
 */
async function requestCorrection(employeeId, data, actor) {
  const correction = await AttendanceCorrection.create({
    employeeId,
    date: data.date,
    requestedCheckIn: new Date(data.requestedCheckIn),
    requestedCheckOut: new Date(data.requestedCheckOut),
    reason: data.reason,
    status: 'pending',
  });

  await logAction({
    actor,
    action: 'REQUEST_ATTENDANCE_CORRECTION',
    entity: 'AttendanceCorrection',
    entityId: correction._id,
    after: { employeeId, date: data.date },
  });

  // Notify active HR users
  try {
    const hrUsers = await User.find({ role: 'hr', isActive: true }).select('_id');
    const empDoc = await Employee.findById(employeeId).select('name employeeCode');
    const empName = empDoc ? `${empDoc.name} (${empDoc.employeeCode})` : 'An employee';
    for (const hr of hrUsers) {
      notify(
        hr._id,
        'NEW_CORRECTION_REQUEST',
        `New attendance correction request from ${empName} for ${data.date}`,
        '/attendance/corrections'
      );
    }
  } catch (err) {
    console.error('[Notify HR error]:', err.message);
  }

  return AttendanceCorrection.findById(correction._id).populate('employeeId', 'name employeeCode');
}


/**
 * List corrections (HR/Admin sees all, Employee sees own).
 */
async function listCorrections(query = {}, actor) {
  const filter = {};
  if (actor.role === 'employee') {
    filter.employeeId = actor.employeeId;
  }
  if (query.status && query.status !== 'all') {
    filter.status = query.status;
  }

  const page = query.page || 1;
  const limit = query.limit || 20;
  const skip = (page - 1) * limit;

  const [total, corrections] = await Promise.all([
    AttendanceCorrection.countDocuments(filter),
    AttendanceCorrection.find(filter)
      .populate('employeeId', 'name employeeCode')
      .populate('decidedBy', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  return { corrections, total, page, totalPages: Math.ceil(total / limit) || 1 };
}

/**
 * HR decides an attendance correction request.
 */
async function decideCorrection(correctionId, { decision, comment }, actor) {
  const correction = await AttendanceCorrection.findById(correctionId).populate('employeeId');
  if (!correction) {
    throw notFound('Attendance correction request not found');
  }

  if (correction.status !== 'pending') {
    throw conflict('Only pending correction requests can be decided');
  }

  const before = { status: correction.status };

  if (decision === 'reject') {
    correction.status = 'rejected';
    correction.decisionComment = comment ? comment.trim() : null;
    correction.decidedBy = actor._id;
    correction.decidedAt = new Date();
  } else if (decision === 'approve') {
    // Upsert the attendance record
    const inDate = new Date(correction.requestedCheckIn);
    const outDate = new Date(correction.requestedCheckOut);
    const workedMinutes = Math.max(0, Math.round((outDate.getTime() - inDate.getTime()) / 60000));

    const isLate = await checkIsLate(inDate);

    const settings = await Settings.findOne();
    const halfDayThresholdMinutes = (settings?.halfDayHours || 5) * 60;

    let status = 'present';
    if (workedMinutes < halfDayThresholdMinutes) {
      status = 'half_day';
    } else if (isLate) {
      status = 'late';
    } else {
      status = 'present';
    }

    await Attendance.findOneAndUpdate(
      { employeeId: correction.employeeId._id, date: correction.date },
      {
        employeeId: correction.employeeId._id,
        date: correction.date,
        checkInAt: inDate,
        checkOutAt: outDate,
        workedMinutes,
        isLate,
        status,
        correctedBy: actor._id,
      },
      { upsert: true, new: true }
    );

    correction.status = 'approved';
    correction.decisionComment = comment ? comment.trim() : null;
    correction.decidedBy = actor._id;
    correction.decidedAt = new Date();
  }

  await correction.save();

  await logAction({
    actor,
    action: 'DECIDE_ATTENDANCE_CORRECTION',
    entity: 'AttendanceCorrection',
    entityId: correction._id,
    before,
    after: { status: correction.status },
  });

  if (correction.employeeId?.userId) {
    notify(
      correction.employeeId.userId,
      'CORRECTION_DECISION',
      `Your attendance correction for ${correction.date} has been ${correction.status}.`
    );
  }

  return AttendanceCorrection.findById(correction._id)
    .populate('employeeId', 'name employeeCode')
    .populate('decidedBy', 'name');
}

/**
 * Reusable helper: Count working days in a date range skipping weekends and holidays.
 */
async function countWorkingDays(from, to) {
  const settings = await Settings.findOne();
  const weekendDays = settings?.weekend?.length ? settings.weekend : [0, 6];

  const holidays = await Holiday.find({
    date: {
      $gte: new Date(from + 'T00:00:00.000Z'),
      $lte: new Date(to + 'T23:59:59.999Z'),
    },
  }).lean();

  const holidaySet = new Set(holidays.map((h) => getKarachiDate(h.date)));
  const dates = getDateRange(from, to);

  let workingDays = 0;
  for (const d of dates) {
    if (!isWeekend(d, weekendDays) && !holidaySet.has(d)) {
      workingDays++;
    }
  }
  return workingDays;
}

/**
 * Reusable helper: Attendance summary counts across a date range.
 */
async function getAttendanceSummary({ from, to, departmentId = null, employeeId = null }) {
  const empFilter = { status: { $in: ['active', 'probation'] } };
  if (departmentId) empFilter.departmentId = departmentId;
  if (employeeId) empFilter._id = employeeId;

  const employees = await Employee.find(empFilter).select('_id').lean();
  const empIds = employees.map((e) => e._id);

  const attendances = await Attendance.find({
    employeeId: { $in: empIds },
    date: { $gte: from, $lte: to },
  }).lean();

  const summary = {
    present: 0,
    late: 0,
    half_day: 0,
    absent: 0,
    on_leave: 0,
    missing_checkout: 0,
    totalWorkedHours: 0,
    expectedWorkingDays: await countWorkingDays(from, to),
  };

  for (const a of attendances) {
    if (summary[a.status] !== undefined) summary[a.status]++;
    summary.totalWorkedHours += (a.workedMinutes || 0) / 60;
  }

  return summary;
}

/**
 * Reusable helper: Get late comers across a date range.
 */
async function getLateComers({ from, to, departmentId = null, limit = 10 }) {
  const filter = {
    isLate: true,
    date: { $gte: from, $lte: to },
  };

  if (departmentId) {
    const emps = await Employee.find({ departmentId }).select('_id');
    filter.employeeId = { $in: emps.map((e) => e._id) };
  }

  return Attendance.find(filter)
    .populate('employeeId', 'name employeeCode departmentId')
    .sort({ date: -1 })
    .limit(limit)
    .lean();
}

// Register with Employee 360 summary provider
registerSummaryProvider('attendance', async (employeeId) => {
  const currentMonth = getKarachiNow().todayStr.slice(0, 7);
  return getMyAttendance(employeeId, currentMonth);
});

module.exports = {
  checkIn,
  checkOut,
  getDayStatus,
  getMyAttendance,
  getAttendanceBoard,
  requestCorrection,
  listCorrections,
  decideCorrection,
  countWorkingDays,
  getAttendanceSummary,
  getLateComers,
};
