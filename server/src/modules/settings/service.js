'use strict';
const { Settings } = require('../../models');
const { logAction } = require('../../utils/audit');
const { notFound } = require('../../utils/httpError');

async function getSettings() {
  const settings = await Settings.findOne();
  if (!settings) throw notFound('Settings not configured yet');
  return settings;
}

async function updateSettings(actor, updates) {
  const settings = await Settings.findOne();
  if (!settings) throw notFound('Settings not configured yet');

  const before = settings.toObject();
  Object.assign(settings, updates);
  await settings.save();

  await logAction({
    actor,
    action: 'UPDATE_SETTINGS',
    entity: 'Settings',
    entityId: settings._id,
    before,
    after: updates,
  });

  return settings;
}

module.exports = { getSettings, updateSettings };
