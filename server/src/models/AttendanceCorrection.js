'use strict';
const mongoose = require('mongoose');

const attendanceCorrectionSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    date: {
      type: String, // "YYYY-MM-DD"
      required: true,
    },
    requestedCheckIn: {
      type: Date,
      required: true,
    },
    requestedCheckOut: {
      type: Date,
      required: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    decidedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    decisionComment: {
      type: String,
      default: null,
      trim: true,
    },
    decidedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

attendanceCorrectionSchema.index({ employeeId: 1, date: 1 });
attendanceCorrectionSchema.index({ status: 1 });

module.exports = mongoose.model('AttendanceCorrection', attendanceCorrectionSchema);
