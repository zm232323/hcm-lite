'use strict';
const mongoose = require('mongoose');

const payslipSchema = new mongoose.Schema(
  {
    runId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PayrollRun',
      required: true,
      index: true,
    },
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      index: true,
    },
    month: {
      type: String, // "YYYY-MM"
      required: true,
      index: true,
    },
    // Snapshot fields
    employeeName: { type: String, required: true },
    employeeCode: { type: String, required: true },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null },
    departmentName: { type: String, default: '' },
    designationName: { type: String, default: '' },
    basic: { type: Number, required: true },
    hraPercent: { type: Number, default: 40 },
    hra: { type: Number, default: 0 },
    medicalPercent: { type: Number, default: 10 },
    medical: { type: Number, default: 0 },
    otherAllowance: { type: Number, default: 0 },
    gross: { type: Number, required: true },
    workingDays: { type: Number, required: true },
    eligibleDays: { type: Number, required: true },
    absentDays: { type: Number, default: 0 },
    unpaidLeaveDays: { type: Number, default: 0 },
    halfDays: { type: Number, default: 0 },
    deductionDays: { type: Number, default: 0 },
    perDay: { type: Number, required: true },
    earnedGross: { type: Number, required: true },
    deduction: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    netPay: { type: Number, required: true },
  },
  {
    timestamps: true,
  }
);

// Unique compound index so an employee cannot have multiple payslips in the same run
payslipSchema.index({ runId: 1, employeeId: 1 }, { unique: true });

module.exports = mongoose.model('Payslip', payslipSchema);
