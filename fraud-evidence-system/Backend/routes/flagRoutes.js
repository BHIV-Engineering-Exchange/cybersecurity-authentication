// routes/flagRoutes.js

const express = require('express');
const router = express.Router();
const { flagWallet } = require('../controllers/flagController');

router.post('/flag', flagWallet);

module.exports = router;
