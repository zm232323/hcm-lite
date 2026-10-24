'use strict';
const mongoose = require('mongoose');

const aiLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ['admin', 'hr', 'employee'],
      required: true,
    },
    feature: {
      type: String,
      enum: ['chat', 'summary', 'smart_leave', 'policy'],
      required: true,
    },
    question: {
      type: String,
      maxlength: 500,
      default: '',
    },
    toolsCalled: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ['ok', 'error', 'timeout', 'rate_limited', 'refused'],
      required: true,
    },
    latencyMs: {
      type: Number,
      default: 0,
    },
    tokenUsage: {
      promptTokens: { type: Number },
      completionTokens: { type: Number },
      totalTokens: { type: Number },
    },
    errorMessage: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'ai_logs',
  }
);

aiLogSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('AiLog', aiLogSchema);
