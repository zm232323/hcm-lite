'use strict';
const { z } = require('zod');
const authService = require('./service');
const authenticate = require('../../middleware/authenticate');
const validate = require('../../middleware/validate');
const { forbidden } = require('../../utils/httpError');

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const changePasswordSchema = z.object({
  oldPassword: z.string().optional(),
  newPassword: z.string().min(8),
});

/**
 * Middleware: if mustChangePassword is true, only allow /me and /change-password.
 * Applied AFTER authenticate on protected routes.
 */
function mustChangePasswordGuard(req, res, next) {
  if (req.user && req.user.mustChangePassword) {
    return next(forbidden('You must change your password before continuing'));
  }
  next();
}

async function login(req, res, next) {
  try {
    const result = await authService.login(req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function getMe(req, res, next) {
  try {
    const user = await authService.getMe(req.user._id);
    res.json(user);
  } catch (err) {
    next(err);
  }
}

async function changePassword(req, res, next) {
  try {
    const result = await authService.changePassword(req.user._id, req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function logout(req, res) {
  // Stateless JWT: client drops the token
  res.json({ message: 'Logged out' });
}

module.exports = {
  login,
  getMe,
  changePassword,
  logout,
  mustChangePasswordGuard,
  authenticate,
  validateLogin: validate(loginSchema),
  validateChangePassword: validate(changePasswordSchema),
};
