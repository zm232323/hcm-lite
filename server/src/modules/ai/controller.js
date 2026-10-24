'use strict';
const aiService = require('./service');
const { chatSchema, summarySchema, smartLeaveSchema } = require('./validation');
const { validation } = require('../../utils/httpError');

async function handleChat(req, res, next) {
  try {
    const parsed = chatSchema.safeParse(req.body);
    if (!parsed.success) {
      const fields = {};
      parsed.error.errors.forEach((e) => {
        fields[e.path[0]] = e.message;
      });
      throw validation('Invalid chat input', fields);
    }

    const result = await aiService.chat({
      user: req.user,
      message: parsed.data.message,
      history: parsed.data.history,
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function handleSummary(req, res, next) {
  try {
    const parsed = summarySchema.safeParse(req.query);
    if (!parsed.success) {
      const fields = {};
      parsed.error.errors.forEach((e) => {
        fields[e.path[0]] = e.message;
      });
      throw validation('Invalid summary query filters', fields);
    }

    const result = await aiService.generateSummary({
      user: req.user,
      query: parsed.data,
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function handleSmartLeave(req, res, next) {
  try {
    const parsed = smartLeaveSchema.safeParse(req.body);
    if (!parsed.success) {
      const fields = {};
      parsed.error.errors.forEach((e) => {
        fields[e.path[0]] = e.message;
      });
      throw validation('Invalid leave description', fields);
    }

    const result = await aiService.smartLeave({
      user: req.user,
      text: parsed.data.text,
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  handleChat,
  handleSummary,
  handleSmartLeave,
};
