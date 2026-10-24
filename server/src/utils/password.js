'use strict';
const bcrypt = require('bcryptjs');
const env = require('../config/env');

async function hashPassword(plainText) {
  return bcrypt.hash(plainText, env.BCRYPT_ROUNDS);
}

async function comparePassword(plainText, hash) {
  return bcrypt.compare(plainText, hash);
}

function generateTempPassword(length = 12) {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

module.exports = { hashPassword, comparePassword, generateTempPassword };
