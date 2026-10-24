'use strict';
const auditService = require('./service');

async function listAuditLogs(req, res, next) {
  try {
    const { page, limit, action, entity, startDate, endDate } = req.query;
    const result = await auditService.listAuditLogs({
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      action,
      entity,
      startDate,
      endDate,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { listAuditLogs };
