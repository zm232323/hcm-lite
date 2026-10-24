'use strict';
const express = require('express');
const controller = require('./controller');
const authenticate = require('../../middleware/authenticate');
const requireRole = require('../../middleware/requireRole');
const { dashboardQuerySchema } = require('./validation');
const { validation } = require('../../utils/httpError');

const router = express.Router();

function validateQuery(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const fields = {};
      for (const issue of result.error.issues) {
        const key = issue.path.join('.');
        fields[key] = issue.message;
      }
      return next(validation('Validation failed', fields));
    }
    req.query = result.data;
    next();
  };
}

router.use(authenticate);

// HR Dashboard (HR and Admin can call it; Employee gets 403)
router.get('/hr', requireRole('admin', 'hr'), validateQuery(dashboardQuerySchema), controller.getHrDashboard);

// Admin Dashboard (Admin only; HR and Employee get 403)
router.get('/admin', requireRole('admin'), validateQuery(dashboardQuerySchema), controller.getAdminDashboard);

// Employee Dashboard (Employee only; Admin and HR get 403)
router.get('/employee', requireRole('employee'), validateQuery(dashboardQuerySchema), controller.getEmployeeDashboard);

module.exports = router;
