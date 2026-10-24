'use strict';

const service = require('./service');
const { streamPayslipPdf } = require('./pdf');
const { getSettings } = require('../settings/service');

// --- Salary Structure Controllers ---

async function listSalaryStructures(req, res, next) {
  try {
    const result = await service.listSalaryStructures(req.query);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function getSalaryStructure(req, res, next) {
  try {
    const structure = await service.getSalaryStructureByEmployeeId(req.params.employeeId);
    res.json(structure);
  } catch (err) {
    next(err);
  }
}

async function updateSalaryStructure(req, res, next) {
  try {
    const updated = await service.updateSalaryStructure(req.params.employeeId, req.body, req.user);
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

// --- Payroll Run Controllers ---

async function createPayrollRun(req, res, next) {
  try {
    const run = await service.createPayrollRun(req.body.month, req.user);
    res.status(201).json(run);
  } catch (err) {
    next(err);
  }
}

async function listPayrollRuns(req, res, next) {
  try {
    const runs = await service.listPayrollRuns();
    res.json(runs);
  } catch (err) {
    next(err);
  }
}

async function getPayrollRun(req, res, next) {
  try {
    const result = await service.getPayrollRunById(req.params.id, req.query);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function recalculatePayrollRun(req, res, next) {
  try {
    const run = await service.recalculatePayrollRun(req.params.id, req.user);
    res.json(run);
  } catch (err) {
    next(err);
  }
}

async function deletePayrollRun(req, res, next) {
  try {
    const result = await service.deletePayrollRun(req.params.id, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function finalizePayrollRun(req, res, next) {
  try {
    const run = await service.finalizePayrollRun(req.params.id, req.user);
    res.json(run);
  } catch (err) {
    next(err);
  }
}

// --- Payslip Controllers ---

async function getMyPayslips(req, res, next) {
  try {
    const payslips = await service.getMyPayslips(req.user.employeeId);
    res.json(payslips);
  } catch (err) {
    next(err);
  }
}

async function getPayslip(req, res, next) {
  try {
    const { payslip, run } = await service.getPayslipById(req.params.id, req.user);
    res.json({ payslip, run });
  } catch (err) {
    next(err);
  }
}

async function downloadPayslipPdf(req, res, next) {
  try {
    const { payslip, run } = await service.getPayslipById(req.params.id, req.user);
    let settings = null;
    try {
      settings = await getSettings();
    } catch {
      // fallback if settings not initialized yet
      settings = { companyName: 'HCM Lite' };
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=payslip-${payslip.month}-${payslip.employeeCode}.pdf`
    );

    streamPayslipPdf(payslip, run, settings, res);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listSalaryStructures,
  getSalaryStructure,
  updateSalaryStructure,
  createPayrollRun,
  listPayrollRuns,
  getPayrollRun,
  recalculatePayrollRun,
  deletePayrollRun,
  finalizePayrollRun,
  getMyPayslips,
  getPayslip,
  downloadPayslipPdf,
};
