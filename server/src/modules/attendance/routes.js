'use strict';
const express = require('express');
const controller = require('./controller');
const authenticate = require('../../middleware/authenticate');
const requireRole = require('../../middleware/requireRole');
const validate = require('../../middleware/validate');
const {
  correctionRequestSchema,
  correctionDecisionSchema,
} = require('./validation');

const router = express.Router();

// 1. Employee punch endpoints
router.post('/check-in', authenticate, requireRole('employee'), controller.checkIn);
router.post('/check-out', authenticate, requireRole('employee'), controller.checkOut);

// 2. Employee monthly attendance calendar
router.get('/me', authenticate, requireRole('employee'), controller.getMyAttendance);

// 3. Attendance board for HR & Admin
router.get('/board', authenticate, requireRole('admin', 'hr'), controller.getAttendanceBoard);

// 4. Attendance corrections
router.post('/corrections', authenticate, requireRole('employee'), validate(correctionRequestSchema), controller.requestCorrection);
router.get('/corrections', authenticate, controller.listCorrections);
router.patch('/corrections/:id/decision', authenticate, requireRole('hr'), validate(correctionDecisionSchema), controller.decideCorrection);

module.exports = router;
