'use strict';
const express = require('express');
const controller = require('./controller');
const authenticate = require('../../middleware/authenticate');
const requireRole = require('../../middleware/requireRole');
const validate = require('../../middleware/validate');
const { createAnnouncementSchema, updateAnnouncementSchema } = require('./validation');

const router = express.Router();

router.use(authenticate);

// List: all authenticated roles
router.get('/', controller.listAnnouncements);

// Create: Admin and HR only
router.post(
  '/',
  requireRole('admin', 'hr'),
  validate(createAnnouncementSchema),
  controller.createAnnouncement
);

// Update: Admin any; HR only own (checked in service)
router.patch(
  '/:id',
  requireRole('admin', 'hr'),
  validate(updateAnnouncementSchema),
  controller.updateAnnouncement
);

// Delete: Admin any; HR only own (checked in service)
router.delete('/:id', requireRole('admin', 'hr'), controller.deleteAnnouncement);

module.exports = router;
