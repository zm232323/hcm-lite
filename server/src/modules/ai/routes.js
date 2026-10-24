'use strict';
const express = require('express');
const router = express.Router();
const authenticate = require('../../middleware/authenticate');
const requireRole = require('../../middleware/requireRole');
const { handleChat, handleSummary, handleSmartLeave } = require('./controller');

router.post('/chat', authenticate, handleChat);
router.post('/summary', authenticate, requireRole('admin', 'hr'), handleSummary);
router.post('/smart-leave', authenticate, handleSmartLeave);

module.exports = router;
