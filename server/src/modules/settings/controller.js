'use strict';
const { z } = require('zod');
const settingsService = require('./service');
const validate = require('../../middleware/validate');

const updateSettingsSchema = z.object({
  companyName: z.string().min(1).optional(),
  officeStart: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  graceMinutes: z.number().int().min(0).optional(),
  halfDayHours: z.number().min(0).optional(),
  weekend: z.array(z.number().int().min(0).max(6)).optional(),
  officeLat: z.number().nullable().optional(),
  officeLng: z.number().nullable().optional(),
  radiusMeters: z.number().int().min(1).optional(),
});

async function getSettings(req, res, next) {
  try {
    const settings = await settingsService.getSettings();
    res.json(settings);
  } catch (err) {
    next(err);
  }
}

async function updateSettings(req, res, next) {
  try {
    const settings = await settingsService.updateSettings(req.user, req.body);
    res.json(settings);
  } catch (err) {
    next(err);
  }
}

module.exports = { getSettings, updateSettings, validateUpdateSettings: validate(updateSettingsSchema) };
