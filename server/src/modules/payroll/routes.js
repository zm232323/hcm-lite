'use strict';

const express = require('express');
const controller = require('./controller');
const authenticate = require('../../middleware/authenticate');
const requireRole = require('../../middleware/requireRole');
const validate = require('../../middleware/validate');
const { updateSalaryStructureSchema, createPayrollRunSchema } = require('./validation');

const router = express.Router();

// --- Salary Structures ---
// List salary structures (HR and Admin)
router.get('/salary', authenticate, requireRole('admin', 'hr'), controller.listSalaryStructures);

// Get employee salary structure (HR and Admin)
router.get('/salary/:employeeId', authenticate, requireRole('admin', 'hr'), controller.getSalaryStructure);

// Update employee salary structure (HR only)
router.put(
  '/salary/:employeeId',
  authenticate,
  requireRole('hr'),
  validate(updateSalaryStructureSchema),
  controller.updateSalaryStructure
);

// --- Payroll Runs ---
// Create draft payroll run (HR only)
router.post(
  '/runs',
  authenticate,
  requireRole('hr'),
  validate(createPayrollRunSchema),
  controller.createPayrollRun
);

// List all payroll runs (HR and Admin)
router.get('/runs', authenticate, requireRole('admin', 'hr'), controller.listPayrollRuns);

// Get payroll run details with payslips (HR and Admin)
router.get('/runs/:id', authenticate, requireRole('admin', 'hr'), controller.getPayrollRun);

// Recalculate draft payroll run (HR only)
router.post('/runs/:id/recalculate', authenticate, requireRole('hr'), controller.recalculatePayrollRun);

// Delete draft payroll run (HR only)
router.delete('/runs/:id', authenticate, requireRole('hr'), controller.deletePayrollRun);

// Finalize payroll run (Admin only)
router.post('/runs/:id/finalize', authenticate, requireRole('admin'), controller.finalizePayrollRun);

// --- Payslips ---
// Employee's own finalized payslips
router.get('/payslips/me', authenticate, controller.getMyPayslips);

// Single payslip details (HR & Admin any; Employee only own finalized)
router.get('/payslips/:id', authenticate, controller.getPayslip);

// Stream payslip PDF (HR & Admin any; Employee only own finalized)
router.get('/payslips/:id/pdf', authenticate, controller.downloadPayslipPdf);

module.exports = router;
