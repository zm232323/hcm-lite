'use strict';

/**
 * Returns a Mongoose filter scoped to the requesting user.
 * - admin/hr: no restriction (empty filter)
 * - employee: filter to their own employeeId
 *
 * Usage in controller:
 *   const filter = scopeFilter(req);
 *   const records = await SomeModel.find(filter);
 */
function scopeFilter(req) {
  if (!req.user) return {};
  if (req.user.role === 'employee') {
    return { employeeId: req.user.employeeId };
  }
  return {};
}

module.exports = scopeFilter;
