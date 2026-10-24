'use strict';
const { Router } = require('express');
const authenticate = require('../../middleware/authenticate');
const requireRole = require('../../middleware/requireRole');
const { mustChangePasswordGuard } = require('../auth/controller');
const c = require('./controller');

const router = Router();
router.use(authenticate, mustChangePasswordGuard);

// Departments
router.get('/departments', requireRole('admin', 'hr'), c.listDepartments);
router.post('/departments', requireRole('admin'), c.validateName, c.createDepartment);
router.put('/departments/:id', requireRole('admin'), c.validateDeptUpdate, c.updateDepartment);

// Designations
router.get('/designations', requireRole('admin', 'hr'), c.listDesignations);
router.post('/designations', requireRole('admin'), c.validateName, c.createDesignation);
router.put('/designations/:id', requireRole('admin'), c.validateDesigUpdate, c.updateDesignation);

// Leave Types
router.get('/leave-types', requireRole('admin', 'hr'), c.listLeaveTypes);
router.post('/leave-types', requireRole('admin'), c.validateLeaveType, c.createLeaveType);
router.put('/leave-types/:id', requireRole('admin'), c.validateLeaveTypeUpdate, c.updateLeaveType);

// Holidays
router.get('/holidays', requireRole('admin', 'hr'), c.listHolidays);
router.post('/holidays', requireRole('admin'), c.validateHoliday, c.createHoliday);
router.delete('/holidays/:id', requireRole('admin'), c.deleteHoliday);

module.exports = router;
