'use strict';
const { Department, Designation, LeaveType, Holiday } = require('../../models');
const { logAction } = require('../../utils/audit');
const { notFound, conflict } = require('../../utils/httpError');

// ─── Departments ─────────────────────────────────────────────────────────────

async function listDepartments() {
  return Department.find().sort({ name: 1 });
}

async function createDepartment(actor, { name }) {
  const dept = await Department.create({ name });
  await logAction({ actor, action: 'CREATE_DEPARTMENT', entity: 'Department', entityId: dept._id, after: { name } });
  return dept;
}

async function updateDepartment(actor, id, updates) {
  const dept = await Department.findById(id);
  if (!dept) throw notFound('Department not found');
  const before = dept.toObject();
  Object.assign(dept, updates);
  await dept.save();
  await logAction({ actor, action: 'UPDATE_DEPARTMENT', entity: 'Department', entityId: id, before, after: updates });
  return dept;
}

// ─── Designations ─────────────────────────────────────────────────────────────

async function listDesignations() {
  return Designation.find().sort({ name: 1 });
}

async function createDesignation(actor, { name }) {
  const desig = await Designation.create({ name });
  await logAction({ actor, action: 'CREATE_DESIGNATION', entity: 'Designation', entityId: desig._id, after: { name } });
  return desig;
}

async function updateDesignation(actor, id, updates) {
  const desig = await Designation.findById(id);
  if (!desig) throw notFound('Designation not found');
  const before = desig.toObject();
  Object.assign(desig, updates);
  await desig.save();
  await logAction({ actor, action: 'UPDATE_DESIGNATION', entity: 'Designation', entityId: id, before, after: updates });
  return desig;
}

// ─── Leave Types ──────────────────────────────────────────────────────────────

async function listLeaveTypes() {
  return LeaveType.find().sort({ name: 1 });
}

async function createLeaveType(actor, { name, yearlyQuota, isPaid }) {
  const lt = await LeaveType.create({ name, yearlyQuota: yearlyQuota ?? null, isPaid: isPaid ?? true });
  await logAction({ actor, action: 'CREATE_LEAVE_TYPE', entity: 'LeaveType', entityId: lt._id, after: { name, yearlyQuota, isPaid } });
  return lt;
}

async function updateLeaveType(actor, id, updates) {
  const lt = await LeaveType.findById(id);
  if (!lt) throw notFound('Leave type not found');
  const before = lt.toObject();
  Object.assign(lt, updates);
  await lt.save();
  await logAction({ actor, action: 'UPDATE_LEAVE_TYPE', entity: 'LeaveType', entityId: id, before, after: updates });
  return lt;
}

// ─── Holidays ─────────────────────────────────────────────────────────────────

async function listHolidays() {
  return Holiday.find().sort({ date: 1 });
}

async function createHoliday(actor, { name, date }) {
  const holiday = await Holiday.create({ name, date: new Date(date) });
  await logAction({ actor, action: 'CREATE_HOLIDAY', entity: 'Holiday', entityId: holiday._id, after: { name, date } });
  return holiday;
}

async function deleteHoliday(actor, id) {
  const holiday = await Holiday.findById(id);
  if (!holiday) throw notFound('Holiday not found');
  await holiday.deleteOne();
  await logAction({ actor, action: 'DELETE_HOLIDAY', entity: 'Holiday', entityId: id, before: holiday.toObject() });
  return { message: 'Holiday deleted' };
}

module.exports = {
  listDepartments, createDepartment, updateDepartment,
  listDesignations, createDesignation, updateDesignation,
  listLeaveTypes, createLeaveType, updateLeaveType,
  listHolidays, createHoliday, deleteHoliday,
};
