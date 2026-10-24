'use strict';

/**
 * Harmless notification stub for Part 3.
 * Part 5 will implement full notification dispatcher and real-time delivery.
 *
 * @param {string|import('mongoose').Types.ObjectId} userId
 * @param {string} type e.g. 'LEAVE_DECISION', 'CORRECTION_DECISION'
 * @param {string} message Human readable notification text
 */
function notify(userId, type, message) {
  console.log(`[Notification STUB] to=${userId} type=${type}: ${message}`);
}

module.exports = { notify };
