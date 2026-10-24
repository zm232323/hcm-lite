'use strict';
const leaveService = require('./service');
const {
  applyLeaveSchema,
  previewLeaveSchema,
  leaveDecisionSchema,
  listLeaveQuerySchema,
} = require('./validation');
const { forbidden, notFound } = require('../../utils/httpError');

async function applyLeave(req, res, next) {
  try {
    if (!req.user.employeeId) {
      throw forbidden('Only employees with a linked employee profile can apply for leave');
    }
    const result = await leaveService.applyLeave(req.user.employeeId, req.body, req.user);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

async function previewLeave(req, res, next) {
  try {
    if (!req.user.employeeId) {
      throw forbidden('Only employees can preview leave balance');
    }
    const parsedQuery = previewLeaveSchema.parse(req.query);
    const result = await leaveService.previewLeave(req.user.employeeId, parsedQuery);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function getLeaveBalance(req, res, next) {
  try {
    let targetEmployeeId = req.user.employeeId;
    if (req.user.role === 'admin' || req.user.role === 'hr') {
      if (req.query.employeeId) {
        targetEmployeeId = req.query.employeeId;
      }
    }
    if (!targetEmployeeId) {
      throw notFound('Employee ID required to view balance');
    }
    const year = req.query.year ? parseInt(req.query.year, 10) : undefined;
    const result = await leaveService.getLeaveBalance(targetEmployeeId, year);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function listMyLeaves(req, res, next) {
  try {
    if (!req.user.employeeId) {
      throw forbidden('Only employees can view personal leave history');
    }
    const result = await leaveService.listMyLeaves(req.user.employeeId, req.query);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function listAllLeaves(req, res, next) {
  try {
    const parsed = listLeaveQuerySchema.parse(req.query);
    const result = await leaveService.listAllLeaves(parsed);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function cancelLeave(req, res, next) {
  try {
    if (!req.user.employeeId) {
      throw forbidden('Only employees can cancel their leave request');
    }
    const result = await leaveService.cancelLeave(req.user.employeeId, req.params.id, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function decideLeave(req, res, next) {
  try {
    const result = await leaveService.decideLeave(req.params.id, req.body, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  applyLeave,
  previewLeave,
  getLeaveBalance,
  listMyLeaves,
  listAllLeaves,
  cancelLeave,
  decideLeave,
};
