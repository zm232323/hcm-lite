'use strict';
const express = require('express');
const controller = require('./controller');
const authenticate = require('../../middleware/authenticate');
const requireRole = require('../../middleware/requireRole');
const validate = require('../../middleware/validate');
const {
  createEmployeeSchema,
  updateEmployeeSchema,
  ownProfileSchema,
} = require('./validation');

const router = express.Router();

// 1. Export CSV (HR only) - MUST be registered before /:id
router.get('/export', authenticate, requireRole('hr'), controller.exportEmployeesCsv);

// 2. Import CSV (HR only, stretch goal)
router.post('/import', authenticate, requireRole('hr'), controller.importEmployees);

// 3. Employee own profile edit (Employee only) - MUST be registered before /:id
router.patch('/me', authenticate, requireRole('employee'), validate(ownProfileSchema), controller.updateOwnProfile);

// 4. Directory list (All roles: Admin, HR see all; Employee sees self)
router.get('/', authenticate, controller.listEmployees);

// 5. Register employee (HR only)
router.post('/', authenticate, requireRole('hr'), validate(createEmployeeSchema), controller.createEmployee);

// 6. Employee 360 profile (Admin, HR, or self)
router.get('/:id', authenticate, controller.getEmployeeById);

// 7. Update employee (HR only)
router.put('/:id', authenticate, requireRole('hr'), validate(updateEmployeeSchema), controller.updateEmployee);

module.exports = router;
