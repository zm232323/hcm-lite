'use strict';
const attendanceService = require('./service');
const {
  correctionRequestSchema,
  correctionDecisionSchema,
  boardQuerySchema,
  myAttendanceQuerySchema,
} = require('./validation');
const { forbidden } = require('../../utils/httpError');

async function checkIn(req, res, next) {
  try {
    if (!req.user.employeeId) {
      throw forbidden('Only employees with a linked profile can check in');
    }
    const result = await attendanceService.checkIn(req.user.employeeId, req.user);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

async function checkOut(req, res, next) {
  try {
    if (!req.user.employeeId) {
      throw forbidden('Only employees with a linked profile can check out');
    }
    const result = await attendanceService.checkOut(req.user.employeeId, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function getMyAttendance(req, res, next) {
  try {
    if (!req.user.employeeId) {
      throw forbidden('Only employees can view personal attendance history');
    }
    const parsed = myAttendanceQuerySchema.parse(req.query);
    const result = await attendanceService.getMyAttendance(req.user.employeeId, parsed.month);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function getAttendanceBoard(req, res, next) {
  try {
    const parsed = boardQuerySchema.parse(req.query);
    const result = await attendanceService.getAttendanceBoard(parsed);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function requestCorrection(req, res, next) {
  try {
    if (!req.user.employeeId) {
      throw forbidden('Only employees can request attendance corrections');
    }
    const result = await attendanceService.requestCorrection(req.user.employeeId, req.body, req.user);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

async function listCorrections(req, res, next) {
  try {
    const result = await attendanceService.listCorrections(req.query, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function decideCorrection(req, res, next) {
  try {
    const result = await attendanceService.decideCorrection(req.params.id, req.body, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  checkIn,
  checkOut,
  getMyAttendance,
  getAttendanceBoard,
  requestCorrection,
  listCorrections,
  decideCorrection,
};
