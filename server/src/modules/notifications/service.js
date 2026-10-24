'use strict';
const { Notification } = require('../../models');
const { notFound } = require('../../utils/httpError');

/**
 * List paginated notifications for a specific user.
 */
async function listNotifications(userId, query = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.max(1, Math.min(50, parseInt(query.limit, 10) || 10));
  const skip = (page - 1) * limit;

  const filter = { userId };
  if (query.unreadOnly === 'true' || query.unreadOnly === true) {
    filter.isRead = false;
  }

  const [total, notifications] = await Promise.all([
    Notification.countDocuments(filter),
    Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  return {
    notifications,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit) || 1,
    },
  };
}

/**
 * Get unread notification count for a user.
 */
async function getUnreadCount(userId) {
  const unreadCount = await Notification.countDocuments({ userId, isRead: false });
  return { unreadCount };
}

/**
 * Mark a single notification as read (must belong to userId, else 404).
 */
async function markAsRead(userId, notificationId) {
  const notification = await Notification.findOne({ _id: notificationId, userId });
  if (!notification) {
    throw notFound('Notification not found');
  }

  notification.isRead = true;
  await notification.save();
  return notification;
}

/**
 * Mark all notifications as read for a user.
 */
async function markAllAsRead(userId) {
  const result = await Notification.updateMany({ userId, isRead: false }, { isRead: true });
  return { modifiedCount: result.modifiedCount };
}

module.exports = {
  listNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
};
