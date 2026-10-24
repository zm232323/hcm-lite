'use strict';
const service = require('./service');

async function getHrDashboard(req, res, next) {
  try {
    const data = await service.getHrDashboard(req.query);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

async function getAdminDashboard(req, res, next) {
  try {
    const data = await service.getAdminDashboard(req.query);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

async function getEmployeeDashboard(req, res, next) {
  try {
    const data = await service.getEmployeeDashboard(req.user.employeeId, req.query);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getHrDashboard,
  getAdminDashboard,
  getEmployeeDashboard,
};
