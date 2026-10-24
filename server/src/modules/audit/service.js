'use strict';
const { AuditLog } = require('../../models');

async function listAuditLogs({ page = 1, limit = 20, action, entity, startDate, endDate } = {}) {
  const filter = {};
  if (action) filter.action = action;
  if (entity) filter.entity = entity;
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = end;
    }
  }

  const skip = (page - 1) * limit;
  const [logs, total] = await Promise.all([
    AuditLog.find(filter)
      .populate('actorId', 'name email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    AuditLog.countDocuments(filter),
  ]);

  return { logs, total, page, totalPages: Math.ceil(total / limit) };
}

module.exports = { listAuditLogs };
