'use strict';
const express = require('express');
const controller = require('./controller');
const authenticate = require('../../middleware/authenticate');
const requireRole = require('../../middleware/requireRole');
const validate = require('../../middleware/validate');
const { applyLeaveSchema, leaveDecisionSchema } = require('./validation');

const router = express.Router();

// Preview working days and balances (Employee)
router.get('/preview', authenticate, requireRole('employee'), controller.previewLeave);

// Leave balance per type (Employee, or HR/Admin passing ?employeeId=)
router.get('/balance', authenticate, controller.getLeaveBalance);

// Own leave history (Employee)
router.get('/my', authenticate, requireRole('employee'), controller.listMyLeaves);

// All leave requests (HR and Admin)
router.get('/', authenticate, requireRole('admin', 'hr'), controller.listAllLeaves);

// Apply for leave (Employee)
router.post('/', authenticate, requireRole('employee'), validate(applyLeaveSchema), controller.applyLeave);

// Cancel own request (Employee)
router.patch('/:id/cancel', authenticate, requireRole('employee'), controller.cancelLeave);

// Approve or reject leave request (HR only)
router.patch('/:id/decision', authenticate, requireRole('hr'), validate(leaveDecisionSchema), controller.decideLeave);

module.exports = router;
