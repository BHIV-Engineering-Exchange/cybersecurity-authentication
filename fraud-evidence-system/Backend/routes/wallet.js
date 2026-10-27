const express = require('express');
const router = express.Router();

const { flagWallet: onChainFlagWallet, getOnChainReportCount } = require('../services/contractService');
const { getEventQueue, publishHighRiskWalletFlaggedEvent } = require('../utils/eventPublisher');
const { logAlert } = require('../utils/logger');

const Transaction = require('../models/Transaction');
const RiskModel = require('../models/RiskModel');

const authMiddleware = require('../middleware/auth'); // ✅ Corrected name

/**
 * 📈 Public route: Fetch on-chain wallet report count by address
 */
router.get('/public/wallet/:address', async (req, res) => {
  const entityId = req.params.address.toLowerCase();

  const result = await getOnChainReportCount(entityId);

  if (result.success) {
    res.json({ wallet: entityId, reportCount: result.count });
  } else {
    res.status(500).json({ error: result.error });
  }
});

/**
 * 📊 Public route: Get off-chain wallet risk data
 */
router.get('/wallet-data/:wallet', async (req, res) => {
  const wallet = req.params.wallet.toLowerCase();

  try {
    const riskEntry = await RiskModel.findOne({ wallet });
    if (!riskEntry) {
      return res.status(404).json({ message: "Wallet not found" });
    }

    res.status(200).json({
      wallet: riskEntry.wallet,
      riskScore: riskEntry.riskScore,
      flagged: riskEntry.flagged,
      lastUpdated: riskEntry.updatedAt || riskEntry.createdAt,
    });
  } catch (error) {
    console.error('Get wallet data error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * 🧾 Internal route: View event queue
 */
router.get('/events', (req, res) => {
  res.json(getEventQueue());
});

/**
 * 🔐 Protected: Flag a wallet (custom blockchain logic)
 */
router.post('/flag', authMiddleware, async (req, res) => {
  const { entityId } = req.body;

  const txResult = await onChainFlagWallet(entityId);

  if (txResult.success) {
    await Transaction.create({
      entityId,
      txHash: txResult.txHash,
      status: 'Success',
    });

    const event = {
      wallet: entityId.toLowerCase(),
      flaggedAt: new Date().toISOString(),
      txHash: txResult.txHash,
      riskLevel: "HIGH"
    };

    publishHighRiskWalletFlaggedEvent(event);
    logAlert("High-Risk Wallet Flagged", event);

    res.json({
      success: true,
      message: txResult.confirmationMessage,
      txHash: txResult.txHash
    });
  } else {
    await Transaction.create({
      entityId,
      txHash: null,
      status: 'Failed: ' + txResult.error,
    });

    res.status(500).json({
      success: false,
      error: txResult.error
    });
  }
});

/**
 * 🔐 Protected: Get on-chain report count (used internally)
 */
router.get('/report-count/:address', authMiddleware, async (req, res) => {
  const result = await getOnChainReportCount(req.params.address);
  if (result.success) {
    res.json({ count: result.count });
  } else {
    res.status(500).json({ error: result.error });
  }
});

module.exports = router;
