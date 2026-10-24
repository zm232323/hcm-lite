'use strict';
const { User, Settings } = require('../../models');
const { hashPassword } = require('../../utils/password');
const { logAction } = require('../../utils/audit');
const { conflict } = require('../../utils/httpError');

async function getStatus() {
  const adminExists = await User.exists({ role: 'admin' });
  return { initialized: !!adminExists };
}

async function runSetup({ companyName, adminName, adminEmail, adminPassword }) {
  const adminExists = await User.exists({ role: 'admin' });
  if (adminExists) throw conflict('System is already initialized');

  const passwordHash = await hashPassword(adminPassword);

  const [settings, admin] = await Promise.all([
    Settings.create({ companyName }),
    User.create({
      name: adminName,
      email: adminEmail.toLowerCase(),
      passwordHash,
      role: 'admin',
      isActive: true,
      mustChangePassword: false,
    }),
  ]);

  await logAction({
    actor: admin,
    action: 'SYSTEM_SETUP',
    entity: 'Settings',
    entityId: settings._id,
    after: { companyName },
  });

  return { message: 'Setup complete' };
}

/**
 * Called at server boot if ADMIN_EMAIL + ADMIN_PASSWORD env vars are set.
 * Creates admin + settings silently.
 */
async function bootstrapFromEnv({ email, password, companyName }) {
  const adminExists = await User.exists({ role: 'admin' });
  if (adminExists) return;

  const passwordHash = await hashPassword(password);

  const [settings, admin] = await Promise.all([
    Settings.create({ companyName }),
    User.create({
      name: 'Admin',
      email: email.toLowerCase(),
      passwordHash,
      role: 'admin',
      isActive: true,
      mustChangePassword: false,
    }),
  ]);

  await logAction({
    actor: admin,
    action: 'ENV_BOOTSTRAP',
    entity: 'Settings',
    entityId: settings._id,
    after: { companyName },
  });

  console.log(`[Setup] Admin bootstrapped from env: ${email}`);
}

module.exports = { getStatus, runSetup, bootstrapFromEnv };
