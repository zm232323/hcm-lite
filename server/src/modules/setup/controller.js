'use strict';
const { z } = require('zod');
const setupService = require('./service');
const validate = require('../../middleware/validate');

const setupSchema = z.object({
  companyName: z.string().min(1),
  adminName: z.string().min(1),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(8),
});

async function getStatus(req, res, next) {
  try {
    const status = await setupService.getStatus();
    res.json(status);
  } catch (err) {
    next(err);
  }
}

async function runSetup(req, res, next) {
  try {
    const result = await setupService.runSetup(req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { getStatus, runSetup, validateSetup: validate(setupSchema) };
