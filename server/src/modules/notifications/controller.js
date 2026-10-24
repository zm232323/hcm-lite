'use strict';
const service = require('./service');

async function listNotifications(req, res, next) {
  try {
    const result = await service.listNotifications(req.user._id, req.query);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function getUnreadCount(req, res, next) {
  try {
    const result = await service.getUnreadCount(req.user._id);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function markAsRead(req, res, next) {
  try {
    const updated = await service.markAsRead(req.user._id, req.params.id);
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

async function markAllAsRead(req, res, next) {
  try {
    const result = await service.markAllAsRead(req.user._id);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
};
