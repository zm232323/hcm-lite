'use strict';
const { User } = require('../../models');
const { comparePassword, hashPassword } = require('../../utils/password');
const { signToken } = require('../../utils/token');
const { unauthorized, businessRule } = require('../../utils/httpError');

async function login({ email, password }) {
  const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
  if (!user) throw unauthorized('Invalid email or password');
  if (!user.isActive) throw unauthorized('Account is deactivated');

  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) throw unauthorized('Invalid email or password');

  const token = signToken({ sub: user._id, role: user.role });

  // Return user without passwordHash (toJSON strips it)
  return { token, user };
}

async function getMe(userId) {
  const user = await User.findById(userId);
  if (!user) throw unauthorized();
  return user;
}

async function changePassword(userId, { oldPassword, newPassword }) {
  const user = await User.findById(userId).select('+passwordHash');
  if (!user) throw unauthorized();

  // If user has mustChangePassword we skip old password check (forced change)
  if (!user.mustChangePassword) {
    const valid = await comparePassword(oldPassword, user.passwordHash);
    if (!valid) throw businessRule('Current password is incorrect');
  }

  if (newPassword.length < 8) throw businessRule('New password must be at least 8 characters');

  user.passwordHash = await hashPassword(newPassword);
  user.mustChangePassword = false;
  await user.save();

  return { message: 'Password changed successfully' };
}

module.exports = { login, getMe, changePassword };
