'use strict';
const Notification = require('../models/Notification');

/**
 * Dispatch and persist a notification to a specific user.
 * Fault-tolerant: Never throws to prevent breaking calling transactions or workflows.
 *
 * @param {string|import('mongoose').Types.ObjectId} userId
 * @param {string} type
 * @param {string} message
 * @param {string} [link=null]
 */
async function notify(userId, type, message, link = null) {
  try {
    if (!userId) return null;
    const notification = await Notification.create({
      userId,
      type,
      message,
      link: link || null,
      isRead: false,
    });
    return notification;
  } catch (err) {
    console.error(`[Notify failed to=${userId} type=${type}]:`, err.message);
    return null;
  }
}

module.exports = { notify };
