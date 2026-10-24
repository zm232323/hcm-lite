'use strict';
const { Router } = require('express');
const authenticate = require('../../middleware/authenticate');
const requireRole = require('../../middleware/requireRole');
const { mustChangePasswordGuard } = require('../auth/controller');
const { listAuditLogs } = require('./controller');

const router = Router();
router.use(authenticate, mustChangePasswordGuard, requireRole('admin'));

router.get('/', listAuditLogs);

module.exports = router;
