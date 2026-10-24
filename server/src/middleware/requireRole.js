'use strict';
const { forbidden } = require('../utils/httpError');

/**
 * Factory middleware: requireRole('admin', 'hr')
 * Must be used AFTER authenticate.
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(forbidden());
    if (!roles.includes(req.user.role)) {
      return next(forbidden(`Role '${req.user.role}' is not permitted`));
    }
    next();
  };
}

module.exports = requireRole;
