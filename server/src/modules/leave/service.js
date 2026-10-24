'use strict';
const { LeaveRequest, LeaveType, Holiday, Settings, Employee, User } = require('../../models');

const { validation, conflict, notFound, forbidden } = require('../../utils/httpError');
const { logAction } = require('../../utils/audit');
const { notify } = require('../../utils/notify');
const {
  getKarachiNow,
  getKarachiDate,
  isWeekend,
  getDateRange,
} = require('../../utils/time');
const { registerSummaryProvider } = require('../employees/service');

/**
 * Calculates working days between startDate and endDate (inclusive),
 * excluding weekends (configured in Settings) and public holidays.
 */
async function calculateWorkingDays(startDate, endDate) {
  const settings = await Settings.findOne();
  const weekendDays = settings?.weekend?.length ? settings.weekend : [0, 6];

  // Fetch holidays covering the range
  const holidays = await Holiday.find({
    date: {
      $gte: new Date(startDate + 'T00:00:00.000Z'),
      $lte: new Date(endDate + 'T23:59:59.999Z'),
    },
  }).lean();

  const holidayDateSet = new Set(holidays.map((h) => getKarachiDate(h.date)));
  const allDates = getDateRange(startDate, endDate);

  let workingDays = 0;
  for (const dateStr of allDates) {
    if (isWeekend(dateStr, weekendDays)) continue;
    if (holidayDateSet.has(dateStr)) continue;
    workingDays++;
  }

  return { workingDays, totalDays: allDates.length };
}

/**
 * Returns breakdown of leave balance for an employee for a specific year.
 */
async function getLeaveBalance(employeeId, year = null) {
  const currentYear = year || parseInt(getKarachiNow().todayStr.split('-')[0], 10);
  const yearStart = `${currentYear}-01-01`;
  const yearEnd = `${currentYear}-12-31`;

  const leaveTypes = await LeaveType.find({ isActive: true }).lean();

  const balances = [];
  for (const lt of leaveTypes) {
    // Approved days in this calendar year
    const approvedRequests = await LeaveRequest.find({
      employeeId,
      leaveTypeId: lt._id,
      status: 'approved',
      startDate: { $lte: yearEnd },
      endDate: { $gte: yearStart },
    }).lean();

    const used = approvedRequests.reduce((sum, r) => sum + r.days, 0);

    // Pending days in this calendar year
    const pendingRequests = await LeaveRequest.find({
      employeeId,
      leaveTypeId: lt._id,
      status: 'pending',
      startDate: { $lte: yearEnd },
      endDate: { $gte: yearStart },
    }).lean();

    const pending = pendingRequests.reduce((sum, r) => sum + r.days, 0);

    const quota = lt.yearlyQuota; // null = unlimited
    const remaining = quota !== null ? Math.max(0, quota - used) : null;

    balances.push({
      leaveTypeId: lt._id,
      name: lt.name,
      isPaid: lt.isPaid,
      quota,
      used,
      pending,
      remaining,
    });
  }

  return balances;
}

/**
 * Live preview of working days and remaining balance for application forms.
 */
async function previewLeave(employeeId, { leaveTypeId, startDate, endDate }) {
  const leaveType = await LeaveType.findOne({ _id: leaveTypeId, isActive: true });
  if (!leaveType) {
    throw validation('Invalid or inactive leave type', { leaveTypeId: 'Invalid leave type' });
  }

  const { workingDays, totalDays } = await calculateWorkingDays(startDate, endDate);

  // Check overlap with pending or approved
  const overlapping = await LeaveRequest.findOne({
    employeeId,
    status: { $in: ['pending', 'approved'] },
    startDate: { $lte: endDate },
    endDate: { $gte: startDate },
  });

  const year = parseInt(startDate.split('-')[0], 10);
  const balances = await getLeaveBalance(employeeId, year);
  const currentBalance = balances.find((b) => b.leaveTypeId.toString() === leaveTypeId.toString());

  const quota = currentBalance ? currentBalance.quota : null;
  const used = currentBalance ? currentBalance.used : 0;
  const pending = currentBalance ? currentBalance.pending : 0;
  const remaining = currentBalance ? currentBalance.remaining : null;

  let hasConflict = false;
  let conflictReason = null;

  if (workingDays === 0) {
    hasConflict = true;
    conflictReason = 'The selected date range contains no working days (all weekends or holidays).';
  } else if (overlapping) {
    hasConflict = true;
    conflictReason = 'You already have an overlapping pending or approved leave request in this range.';
  } else if (quota !== null && used + pending + workingDays > quota) {
    hasConflict = true;
    conflictReason = `Insufficient leave balance. You have ${remaining} days available, but requested ${workingDays} days.`;
  }

  return {
    workingDays,
    totalDays,
    quota,
    used,
    pending,
    remaining,
    hasConflict,
    conflictReason,
  };
}

/**
 * Employee applies for leave.
 */
async function applyLeave(employeeId, data, actor) {
  const { leaveTypeId, startDate, endDate, reason } = data;

  const leaveType = await LeaveType.findOne({ _id: leaveTypeId, isActive: true });
  if (!leaveType) {
    throw validation('Invalid or inactive leave type', { leaveTypeId: 'Invalid leave type' });
  }

  const { workingDays } = await calculateWorkingDays(startDate, endDate);
  if (workingDays === 0) {
    throw validation('The selected date range contains no working days (all weekends or public holidays)', {
      startDate: 'No working days in selected range',
    });
  }

  // Check overlap
  const overlapping = await LeaveRequest.findOne({
    employeeId,
    status: { $in: ['pending', 'approved'] },
    startDate: { $lte: endDate },
    endDate: { $gte: startDate },
  });
  if (overlapping) {
    throw validation('You already have a pending or approved leave request during this date range', {
      startDate: 'Overlapping leave exists',
    });
  }

  // Check quota
  if (leaveType.yearlyQuota !== null) {
    const year = parseInt(startDate.split('-')[0], 10);
    const balances = await getLeaveBalance(employeeId, year);
    const curr = balances.find((b) => b.leaveTypeId.toString() === leaveTypeId.toString());
    const available = curr ? curr.remaining : 0;
    const pending = curr ? curr.pending : 0;
    if (curr && curr.used + pending + workingDays > leaveType.yearlyQuota) {
      throw validation(
        `Leave balance exceeded. Available quota: ${curr.quota}, already used: ${curr.used}, pending: ${pending}, requested: ${workingDays}`,
        { days: 'Leave balance exceeded' }
      );
    }
  }

  const request = await LeaveRequest.create({
    employeeId,
    leaveTypeId,
    startDate,
    endDate,
    days: workingDays,
    reason,
    status: 'pending',
  });

  await logAction({
    actor,
    action: 'APPLY_LEAVE',
    entity: 'LeaveRequest',
    entityId: request._id,
    after: { employeeId, leaveTypeId, startDate, endDate, days: workingDays },
  });

  // Notify active HR users
  try {
    const hrUsers = await User.find({ role: 'hr', isActive: true }).select('_id');
    const empDoc = await Employee.findById(employeeId).select('name employeeCode');
    const empName = empDoc ? `${empDoc.name} (${empDoc.employeeCode})` : 'An employee';
    for (const hr of hrUsers) {
      notify(
        hr._id,
        'NEW_LEAVE_REQUEST',
        `New leave request from ${empName} for ${workingDays} day(s) (${startDate} to ${endDate})`,
        '/leave/approvals'
      );
    }
  } catch (err) {
    console.error('[Notify HR error]:', err.message);
  }

  return LeaveRequest.findById(request._id)
    .populate('leaveTypeId', 'name isPaid yearlyQuota')
    .populate('employeeId', 'name employeeCode');
}


/**
 * Employee cancels own leave request.
 */
async function cancelLeave(employeeId, requestId, actor) {
  const request = await LeaveRequest.findOne({ _id: requestId, employeeId });
  if (!request) {
    throw notFound('Leave request not found');
  }

  const { todayStr } = getKarachiNow();

  if (request.status === 'approved') {
    if (request.startDate <= todayStr) {
      throw validation('Cannot cancel past or ongoing approved leave');
    }
  } else if (request.status !== 'pending') {
    throw conflict(`Leave request is already ${request.status}`);
  }

  const before = { status: request.status };
  request.status = 'cancelled';
  await request.save();

  await logAction({
    actor,
    action: 'CANCEL_LEAVE',
    entity: 'LeaveRequest',
    entityId: request._id,
    before,
    after: { status: 'cancelled' },
  });

  return request;
}

/**
 * HR approves or rejects a pending leave request.
 */
async function decideLeave(requestId, { decision, comment }, actor) {
  const request = await LeaveRequest.findById(requestId).populate('employeeId');
  if (!request) {
    throw notFound('Leave request not found');
  }

  if (request.status !== 'pending') {
    throw conflict('Only pending leave requests can be decided');
  }

  const before = { status: request.status };

  if (decision === 'reject') {
    if (!comment || comment.trim().length === 0) {
      throw validation('Comment is required when rejecting a leave request', { comment: 'Comment required' });
    }
    request.status = 'rejected';
    request.decisionComment = comment.trim();
    request.decidedBy = actor._id;
    request.decidedAt = new Date();
  } else if (decision === 'approve') {
    // Re-verify overlap
    const overlapping = await LeaveRequest.findOne({
      _id: { $ne: request._id },
      employeeId: request.employeeId._id,
      status: 'approved',
      startDate: { $lte: request.endDate },
      endDate: { $gte: request.startDate },
    });
    if (overlapping) {
      throw validation('Cannot approve: Overlaps with another approved leave request');
    }

    // Re-verify balance
    const leaveType = await LeaveType.findById(request.leaveTypeId);
    if (leaveType && leaveType.yearlyQuota !== null) {
      const year = parseInt(request.startDate.split('-')[0], 10);
      const balances = await getLeaveBalance(request.employeeId._id, year);
      const curr = balances.find((b) => b.leaveTypeId.toString() === request.leaveTypeId.toString());
      if (curr && curr.used + request.days > leaveType.yearlyQuota) {
        throw validation(
          `Cannot approve: Exceeds annual quota (${leaveType.yearlyQuota} days). Employee currently has ${curr.used} approved days.`,
          { days: 'Leave balance exceeded' }
        );
      }
    }

    request.status = 'approved';
    request.decisionComment = comment ? comment.trim() : null;
    request.decidedBy = actor._id;
    request.decidedAt = new Date();
  }

  await request.save();

  await logAction({
    actor,
    action: 'DECIDE_LEAVE',
    entity: 'LeaveRequest',
    entityId: request._id,
    before,
    after: { status: request.status, decisionComment: request.decisionComment },
  });

  // Notify employee (stubbed for now)
  if (request.employeeId?.userId) {
    notify(
      request.employeeId.userId,
      'LEAVE_DECISION',
      `Your leave application for ${request.days} day(s) (${request.startDate} to ${request.endDate}) has been ${request.status}.`
    );
  }

  return LeaveRequest.findById(request._id)
    .populate('leaveTypeId', 'name isPaid yearlyQuota')
    .populate('employeeId', 'name employeeCode')
    .populate('decidedBy', 'name');
}

/**
 * List leaves for current employee.
 */
async function listMyLeaves(employeeId, query = {}) {
  const page = query.page || 1;
  const limit = query.limit || 20;
  const skip = (page - 1) * limit;

  const filter = { employeeId };
  if (query.status && query.status !== 'all') {
    filter.status = query.status;
  }

  const [total, leaves] = await Promise.all([
    LeaveRequest.countDocuments(filter),
    LeaveRequest.find(filter)
      .populate('leaveTypeId', 'name isPaid yearlyQuota')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  return { leaves, total, page, totalPages: Math.ceil(total / limit) || 1 };
}

/**
 * List all leave requests (HR and Admin).
 */
async function listAllLeaves(query = {}) {
  const page = query.page || 1;
  const limit = query.limit || 20;
  const skip = (page - 1) * limit;

  const filter = {};
  if (query.status && query.status !== 'all') filter.status = query.status;
  if (query.employeeId) filter.employeeId = query.employeeId;

  if (query.startDate && query.endDate) {
    filter.startDate = { $lte: query.endDate };
    filter.endDate = { $gte: query.startDate };
  }

  let employeeFilter = {};
  if (query.departmentId) {
    const emps = await Employee.find({ departmentId: query.departmentId }).select('_id');
    filter.employeeId = { $in: emps.map((e) => e._id) };
  }

  const [total, leaves] = await Promise.all([
    LeaveRequest.countDocuments(filter),
    LeaveRequest.find(filter)
      .populate('employeeId', 'name employeeCode departmentId')
      .populate({
        path: 'employeeId',
        populate: { path: 'departmentId', select: 'name code' },
      })
      .populate('leaveTypeId', 'name isPaid yearlyQuota')
      .populate('decidedBy', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  return { leaves, total, page, totalPages: Math.ceil(total / limit) || 1 };
}

/**
 * Reusable export: Check if employee has approved leave on a given date.
 */
async function hasApprovedLeave(employeeId, dateStr) {
  const match = await LeaveRequest.findOne({
    employeeId,
    status: 'approved',
    startDate: { $lte: dateStr },
    endDate: { $gte: dateStr },
  });
  return !!match;
}

/**
 * Reusable export: Get total approved leave days in a range.
 */
async function getApprovedLeaveDays(employeeId, from, to) {
  const leaves = await LeaveRequest.find({
    employeeId,
    status: 'approved',
    startDate: { $lte: to },
    endDate: { $gte: from },
  }).lean();

  return leaves.reduce((sum, l) => sum + l.days, 0);
}

/**
 * Reusable export: Who is on approved leave on a given date.
 */
async function getWhoIsOnLeave(dateStr) {
  const leaves = await LeaveRequest.find({
    status: 'approved',
    startDate: { $lte: dateStr },
    endDate: { $gte: dateStr },
  })
    .populate('employeeId', 'name employeeCode departmentId')
    .populate('leaveTypeId', 'name')
    .lean();

  return leaves.map((l) => ({
    employee: l.employeeId,
    leaveType: l.leaveTypeId?.name,
    days: l.days,
    startDate: l.startDate,
    endDate: l.endDate,
  }));
}

/**
 * Reusable export: Leave summary counts across a period.
 */
async function getLeaveSummary({ from, to, departmentId = null }) {
  const filter = {
    status: 'approved',
    startDate: { $lte: to },
    endDate: { $gte: from },
  };

  if (departmentId) {
    const emps = await Employee.find({ departmentId }).select('_id');
    filter.employeeId = { $in: emps.map((e) => e._id) };
  }

  const leaves = await LeaveRequest.find(filter).populate('leaveTypeId', 'name').lean();

  const byType = {};
  let totalApprovedDays = 0;
  for (const l of leaves) {
    const typeName = l.leaveTypeId?.name || 'Other';
    byType[typeName] = (byType[typeName] || 0) + l.days;
    totalApprovedDays += l.days;
  }

  const pendingCount = await LeaveRequest.countDocuments({
    status: 'pending',
    startDate: { $lte: to },
    endDate: { $gte: from },
  });

  return {
    totalApprovedDays,
    pendingRequestsCount: pendingCount,
    byType,
  };
}

/**
 * Reusable export: Approved leave days split by leave type (paid vs unpaid) inside a date range (Part 4 allowed addition).
 */
async function getApprovedLeaveDaysByType(employeeId, from, to) {
  const leaves = await LeaveRequest.find({
    employeeId,
    status: 'approved',
    startDate: { $lte: to },
    endDate: { $gte: from },
  })
    .populate('leaveTypeId', 'name isPaid')
    .lean();

  const results = [];
  for (const l of leaves) {
    const rangeStart = l.startDate < from ? from : l.startDate;
    const rangeEnd = l.endDate > to ? to : l.endDate;
    const { workingDays } = await calculateWorkingDays(rangeStart, rangeEnd);
    if (workingDays > 0) {
      results.push({
        leaveTypeId: l.leaveTypeId?._id,
        name: l.leaveTypeId?.name,
        isPaid: !!l.leaveTypeId?.isPaid,
        days: workingDays,
      });
    }
  }

  return results;
}

// Register with Employee 360 summary provider
registerSummaryProvider('leave', async (employeeId) => {
  const balances = await getLeaveBalance(employeeId);
  const recentLeaves = await LeaveRequest.find({ employeeId })
    .populate('leaveTypeId', 'name')
    .sort({ createdAt: -1 })
    .limit(5)
    .lean();
  return { balances, recentLeaves };
});

module.exports = {
  calculateWorkingDays,
  getLeaveBalance,
  previewLeave,
  applyLeave,
  cancelLeave,
  decideLeave,
  listMyLeaves,
  listAllLeaves,
  hasApprovedLeave,
  getApprovedLeaveDays,
  getApprovedLeaveDaysByType,
  getWhoIsOnLeave,
  getLeaveSummary,
};

