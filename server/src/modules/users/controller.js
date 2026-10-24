'use strict';
const { z } = require('zod');
const usersService = require('./service');
const validate = require('../../middleware/validate');

const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});

async function listUsers(req, res, next) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    res.json(await usersService.listUsers({ page, limit }));
  } catch (e) { next(e); }
}

async function createHrUser(req, res, next) {
  try {
    const result = await usersService.createHrUser(req.user, req.body);
    res.status(201).json(result);
  } catch (e) { next(e); }
}

async function deactivateUser(req, res, next) {
  try { res.json(await usersService.deactivateUser(req.user, req.params.id)); } catch (e) { next(e); }
}

async function activateUser(req, res, next) {
  try { res.json(await usersService.activateUser(req.user, req.params.id)); } catch (e) { next(e); }
}

async function resetPassword(req, res, next) {
  try { res.json(await usersService.resetPassword(req.user, req.params.id)); } catch (e) { next(e); }
}

module.exports = {
  listUsers, createHrUser, deactivateUser, activateUser, resetPassword,
  validateCreateUser: validate(createUserSchema),
};
