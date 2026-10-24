'use strict';
const { User } = require('../../models');
const { hashPassword, generateTempPassword } = require('../../utils/password');
const { logAction } = require('../../utils/audit');
const { conflict, notFound, businessRule } = require('../../utils/httpError');

async function listUsers({ page = 1, limit = 20 } = {}) {
  const skip = (page - 1) * limit;
  const [users, total] = await Promise.all([
    User.find({ role: { $ne: 'admin' } })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    User.countDocuments({ role: { $ne: 'admin' } }),
  ]);
  return { users, total, page, totalPages: Math.ceil(total / limit) };
}

async function createHrUser(actor, { name, email }) {
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) throw conflict('Email already in use');

  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);

  const user = await User.create({
    name,
    email: email.toLowerCase(),
    passwordHash,
    role: 'hr',
    isActive: true,
    mustChangePassword: true,
  });

  await logAction({
    actor,
    action: 'CREATE_USER',
    entity: 'User',
    entityId: user._id,
    after: { name, email, role: 'hr' },
  });

  return { user, tempPassword };
}

async function deactivateUser(actor, id) {
  if (String(actor._id) === String(id)) throw businessRule('Cannot deactivate yourself');
  const user = await User.findById(id);
  if (!user) throw notFound('User not found');
  if (user.role === 'admin') throw businessRule('Cannot deactivate an admin');
  const before = { isActive: user.isActive };
  user.isActive = false;
  await user.save();
  await logAction({ actor, action: 'DEACTIVATE_USER', entity: 'User', entityId: id, before, after: { isActive: false } });
  return user;
}

async function activateUser(actor, id) {
  const user = await User.findById(id);
  if (!user) throw notFound('User not found');
  const before = { isActive: user.isActive };
  user.isActive = true;
  await user.save();
  await logAction({ actor, action: 'ACTIVATE_USER', entity: 'User', entityId: id, before, after: { isActive: true } });
  return user;
}

async function resetPassword(actor, id) {
  const user = await User.findById(id);
  if (!user) throw notFound('User not found');
  if (user.role === 'admin') throw businessRule('Cannot reset an admin password via this endpoint');

  const tempPassword = generateTempPassword();
  user.passwordHash = await hashPassword(tempPassword);
  user.mustChangePassword = true;
  await user.save();

  await logAction({ actor, action: 'RESET_PASSWORD', entity: 'User', entityId: id });
  return { tempPassword };
}

module.exports = { listUsers, createHrUser, deactivateUser, activateUser, resetPassword };
