'use strict';
const service = require('./service');

async function createAnnouncement(req, res, next) {
  try {
    const announcement = await service.createAnnouncement(req.body, req.user);
    res.status(201).json(announcement);
  } catch (err) {
    next(err);
  }
}

async function updateAnnouncement(req, res, next) {
  try {
    const updated = await service.updateAnnouncement(req.params.id, req.body, req.user);
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

async function deleteAnnouncement(req, res, next) {
  try {
    const result = await service.deleteAnnouncement(req.params.id, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function listAnnouncements(req, res, next) {
  try {
    const result = await service.listAnnouncements(req.query);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  listAnnouncements,
};
