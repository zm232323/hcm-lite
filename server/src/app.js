'use strict';
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const env = require('./config/env');
const errorHandler = require('./middleware/errorHandler');

const setupRoutes = require('./modules/setup/routes');
const authRoutes = require('./modules/auth/routes');
const settingsRoutes = require('./modules/settings/routes');
const orgRoutes = require('./modules/org/routes');
const usersRoutes = require('./modules/users/routes');
const auditRoutes = require('./modules/audit/routes');
const employeeRoutes = require('./modules/employees/routes');
const attendanceRoutes = require('./modules/attendance/routes');
const leaveRoutes = require('./modules/leave/routes');
const payrollRoutes = require('./modules/payroll/routes');
const notificationsRoutes = require('./modules/notifications/routes');
const announcementsRoutes = require('./modules/announcements/routes');
const dashboardRoutes = require('./modules/dashboards/routes');

const app = express();

// Security & parsing
app.use(helmet());
app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => res.json({ ok: true }));

// Routes
app.use('/api/setup', setupRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/org', orgRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/leave', leaveRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/announcements', announcementsRoutes);
app.use('/api/dashboard', dashboardRoutes);



// 404 handler
app.use((req, res) => res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } }));

// Central error handler (must be last)
app.use(errorHandler);

module.exports = app;
