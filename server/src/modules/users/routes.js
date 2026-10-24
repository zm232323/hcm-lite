'use strict';
const { Router } = require('express');
const authenticate = require('../../middleware/authenticate');
const requireRole = require('../../middleware/requireRole');
const { mustChangePasswordGuard } = require('../auth/controller');
const { listUsers, createHrUser, deactivateUser, activateUser, resetPassword, validateCreateUser } = require('./controller');

const router = Router();
router.use(authenticate, mustChangePasswordGuard, requireRole('admin'));

router.get('/', listUsers);
router.post('/', validateCreateUser, createHrUser);
router.patch('/:id/deactivate', deactivateUser);
router.patch('/:id/activate', activateUser);
router.post('/:id/reset-password', resetPassword);

module.exports = router;
