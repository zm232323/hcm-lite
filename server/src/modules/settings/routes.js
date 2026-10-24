'use strict';
const { Router } = require('express');
const authenticate = require('../../middleware/authenticate');
const requireRole = require('../../middleware/requireRole');
const { mustChangePasswordGuard } = require('../auth/controller');
const { getSettings, updateSettings, validateUpdateSettings } = require('./controller');

const router = Router();

router.use(authenticate, mustChangePasswordGuard);

router.get('/', requireRole('admin', 'hr'), getSettings);
router.put('/', requireRole('admin'), validateUpdateSettings, updateSettings);

module.exports = router;
