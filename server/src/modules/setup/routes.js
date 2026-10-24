'use strict';
const { Router } = require('express');
const { getStatus, runSetup, validateSetup } = require('./controller');

const router = Router();

router.get('/status', getStatus);
router.post('/', validateSetup, runSetup);

module.exports = router;
