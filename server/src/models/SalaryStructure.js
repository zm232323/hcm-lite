'use strict';
const mongoose = require('mongoose');

const salaryStructureSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      unique: true,
      index: true,
    },
    basic: {
      type: Number,
      required: true,
      min: [0.01, 'Basic salary must be greater than 0'],
    },
    hraPercent: {
      type: Number,
      default: 40,
      min: 0,
      max: 100,
    },
    medicalPercent: {
      type: Number,
      default: 10,
      min: 0,
      max: 100,
    },
    otherAllowance: {
      type: Number,
      default: 0,
      min: 0,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('SalaryStructure', salaryStructureSchema);
