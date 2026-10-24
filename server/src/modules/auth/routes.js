'use strict';
const { Router } = require('express');
const { loginLimiter } = require('../../middleware/rateLimit');
const {
  login,
  getMe,
  changePassword,
  logout,
  authenticate,
  validateLogin,
  validateChangePassword,
} = require('./controller');

const router = Router();

router.post('/login', loginLimiter, validateLogin, login);
router.get('/me', authenticate, getMe);
router.post('/change-password', authenticate, validateChangePassword, changePassword);
router.post('/logout', authenticate, logout);

module.exports = router;
