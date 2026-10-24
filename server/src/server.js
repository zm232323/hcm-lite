'use strict';
require('dotenv').config();
const env = require('./config/env');
const { connectDB } = require('./config/db');
const app = require('./app');
const { bootstrapFromEnv } = require('./modules/setup/service');

async function start() {
  await connectDB();

  // First-run ENV admin bootstrap (safe: no-op if admin already exists)
  if (env.ADMIN_EMAIL && env.ADMIN_PASSWORD) {
    await bootstrapFromEnv({
      email: env.ADMIN_EMAIL,
      password: env.ADMIN_PASSWORD,
      companyName: env.COMPANY_NAME,
    });
  }

  app.listen(env.PORT, () => {
    console.log(`[Server] Running on port ${env.PORT}`);
  });
}

start().catch((err) => {
  console.error('[Server] Fatal startup error:', err);
  process.exit(1);
});
