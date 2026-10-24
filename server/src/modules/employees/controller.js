'use strict';
const employeeService = require('./service');
const { listQuerySchema } = require('./validation');

async function createEmployee(req, res, next) {
  try {
    const result = await employeeService.createEmployee(req.body, req.user);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

async function updateEmployee(req, res, next) {
  try {
    const result = await employeeService.updateEmployee(req.params.id, req.body, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function updateOwnProfile(req, res, next) {
  try {
    const result = await employeeService.updateOwnProfile(req.user.employeeId, req.body, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function listEmployees(req, res, next) {
  try {
    const parsedQuery = listQuerySchema.parse(req.query);
    const result = await employeeService.listEmployees(parsedQuery, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function getEmployeeById(req, res, next) {
  try {
    const result = await employeeService.getEmployeeById(req.params.id, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function exportEmployeesCsv(req, res, next) {
  try {
    const parsedQuery = listQuerySchema.parse(req.query);
    const csvContent = await employeeService.exportEmployeesCsv(parsedQuery);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="employees.csv"');
    res.status(200).send(csvContent);
  } catch (err) {
    next(err);
  }
}

async function importEmployees(req, res, next) {
  try {
    const dryRun = req.query.dryRun === 'true';
    const records = req.body.records || [];
    const result = await employeeService.importEmployeesCsv(records, { dryRun }, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createEmployee,
  updateEmployee,
  updateOwnProfile,
  listEmployees,
  getEmployeeById,
  exportEmployeesCsv,
  importEmployees,
};
