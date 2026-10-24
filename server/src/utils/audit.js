'use strict';
const { AuditLog } = require('../models');

/**
 * Append an audit log entry. Fire-and-forget safe — errors are swallowed
 * so a logging failure never breaks the main request flow.
 *
 * @param {Object} opts
 * @param {Object} opts.actor  - The authenticated user object ({ _id, role })
 * @param {string} opts.action - e.g. 'CREATE_USER', 'UPDATE_SETTINGS'
 * @param {string} opts.entity - e.g. 'User', 'Settings'
 * @param {*}      opts.entityId
 * @param {*}      [opts.before]
 * @param {*}      [opts.after]
 */
async function logAction({ actor, action, entity, entityId, before = null, after = null }) {
  try {
    await AuditLog.create({
      actorId: actor._id,
      actorRole: actor.role,
      action,
      entity,
      entityId: entityId ? String(entityId) : null,
      before,
      after,
    });
  } catch (err) {
    console.error('[Audit] Failed to write log:', err.message);
  }
}

module.exports = { logAction };
