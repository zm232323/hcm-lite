'use strict';
const mongoose = require('mongoose');

const totalsSchema = new mongoose.Schema(
  {
    employees: { type: Number, default: 0 },
    gross: { type: Number, default: 0 },
    deductions: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    net: { type: Number, default: 0 },
  },
  { _id: false }
);

const payrollRunSchema = new mongoose.Schema(
  {
    month: {
      type: String, // "YYYY-MM"
      required: true,
      unique: true,
      index: true,
      match: [/^\d{4}-\d{2}$/, 'Month must be in YYYY-MM format'],
    },
    status: {
      type: String,
      enum: ['draft', 'finalized'],
      default: 'draft',
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    finalizedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    finalizedAt: {
      type: Date,
      default: null,
    },
    totals: {
      type: totalsSchema,
      default: () => ({ employees: 0, gross: 0, deductions: 0, tax: 0, net: 0 }),
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('PayrollRun', payrollRunSchema);
