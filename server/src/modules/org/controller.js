'use strict';
const { z } = require('zod');
const orgService = require('./service');
const validate = require('../../middleware/validate');

const nameSchema = z.object({ name: z.string().min(1) });
const toggleSchema = z.object({ isActive: z.boolean() });

const leaveTypeSchema = z.object({
  name: z.string().min(1),
  yearlyQuota: z.number().int().positive().nullable().optional(),
  isPaid: z.boolean().optional(),
});

const leaveTypeUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  yearlyQuota: z.number().int().positive().nullable().optional(),
  isPaid: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

const holidaySchema = z.object({
  name: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

// Departments
async function listDepartments(req, res, next) {
  try { res.json(await orgService.listDepartments()); } catch (e) { next(e); }
}
async function createDepartment(req, res, next) {
  try { res.status(201).json(await orgService.createDepartment(req.user, req.body)); } catch (e) { next(e); }
}
async function updateDepartment(req, res, next) {
  try { res.json(await orgService.updateDepartment(req.user, req.params.id, req.body)); } catch (e) { next(e); }
}

// Designations
async function listDesignations(req, res, next) {
  try { res.json(await orgService.listDesignations()); } catch (e) { next(e); }
}
async function createDesignation(req, res, next) {
  try { res.status(201).json(await orgService.createDesignation(req.user, req.body)); } catch (e) { next(e); }
}
async function updateDesignation(req, res, next) {
  try { res.json(await orgService.updateDesignation(req.user, req.params.id, req.body)); } catch (e) { next(e); }
}

// Leave Types
async function listLeaveTypes(req, res, next) {
  try { res.json(await orgService.listLeaveTypes()); } catch (e) { next(e); }
}
async function createLeaveType(req, res, next) {
  try { res.status(201).json(await orgService.createLeaveType(req.user, req.body)); } catch (e) { next(e); }
}
async function updateLeaveType(req, res, next) {
  try { res.json(await orgService.updateLeaveType(req.user, req.params.id, req.body)); } catch (e) { next(e); }
}

// Holidays
async function listHolidays(req, res, next) {
  try { res.json(await orgService.listHolidays()); } catch (e) { next(e); }
}
async function createHoliday(req, res, next) {
  try { res.status(201).json(await orgService.createHoliday(req.user, req.body)); } catch (e) { next(e); }
}
async function deleteHoliday(req, res, next) {
  try { res.json(await orgService.deleteHoliday(req.user, req.params.id)); } catch (e) { next(e); }
}

const deptUpdateSchema = z.object({ name: z.string().min(1).optional(), isActive: z.boolean().optional() });
const desigUpdateSchema = deptUpdateSchema;

module.exports = {
  listDepartments, createDepartment, updateDepartment,
  listDesignations, createDesignation, updateDesignation,
  listLeaveTypes, createLeaveType, updateLeaveType,
  listHolidays, createHoliday, deleteHoliday,
  validateName: validate(nameSchema),
  validateDeptUpdate: validate(deptUpdateSchema),
  validateDesigUpdate: validate(desigUpdateSchema),
  validateLeaveType: validate(leaveTypeSchema),
  validateLeaveTypeUpdate: validate(leaveTypeUpdateSchema),
  validateHoliday: validate(holidaySchema),
};
