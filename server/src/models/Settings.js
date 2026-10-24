'use strict';
const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema(
  {
    companyName: { type: String, required: true, default: 'My Company' },
    officeStart: { type: String, default: '09:00' },
    graceMinutes: { type: Number, default: 15 },
    halfDayHours: { type: Number, default: 5 },
    weekend: { type: [Number], default: [0, 6] }, // 0=Sun, 6=Sat
    officeLat: { type: Number, default: null },
    officeLng: { type: Number, default: null },
    radiusMeters: { type: Number, default: 150 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Settings', settingsSchema);
