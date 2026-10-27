const express = require('express');
const router = express.Router();
const publicController = require('../controllers/publicController');

// @route   GET /api/public/wallet-data/:address
// @desc    Fetch wallet risk data and report timeline
router.get('/wallet-data/:address', publicController.getPublicWalletInfo);

// @route   POST /api/public/report
// @desc    Submit a wallet for risk review
router.post('/report', publicController.submitPublicWalletReport);

module.exports = router;
