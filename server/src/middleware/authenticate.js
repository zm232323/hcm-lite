'use strict';
const { verifyToken } = require('../utils/token');
const { User } = require('../models');
const { unauthorized } = require('../utils/httpError');

async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(unauthorized());
    }
    const token = authHeader.slice(7);
    const payload = verifyToken(token);
    const user = await User.findById(payload.sub).select('-passwordHash');
    if (!user || !user.isActive) {
      return next(unauthorized('Account not found or deactivated'));
    }
    req.user = user;
    next();
  } catch (err) {
    next(unauthorized('Invalid or expired token'));
  }
}

module.exports = authenticate;
