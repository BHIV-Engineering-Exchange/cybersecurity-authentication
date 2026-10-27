const RiskModel = require('../models/RiskModel');
const { sendEmailAlert, sendWebhookAlert } = require('../utils/alertService');
const { publishHighRiskWalletFlaggedEvent } = require('../utils/eventPublisher');
const { logAlert } = require('../utils/logger');
const { validateentityId } = require('../utils/validateWallet'); // optional, for checksum validation

/**
 * POST /api/flag
 * @desc Evaluate and flag wallet based on risk score. Alerts if high risk.
 */
const flagWallet = async (req, res) => {
  try {
    const { wallet } = req.body;

    if (!wallet || typeof wallet !== 'string') {
      return res.status(400).json({ error: 'Wallet address is required' });
    }

    // Optional: validate Ethereum address format
    // If using our validateentityId util
    const { valid, checksummed, message } = validateentityId(wallet);
    if (!valid) {
      return res.status(400).json({ error: message || 'Invalid wallet address' });
    }

    const lowerWallet = checksummed.toLowerCase();

    // Risk scoring logic — you can replace this with ML or heuristics
    const riskScore = Math.floor(Math.random() * 100);

    // Save or update in DB
    const riskEntry = await RiskModel.findOneAndUpdate(
      { wallet: lowerWallet },
      {
        riskScore,
        flagged: riskScore >= 70,
        updatedAt: new Date()
      },
      { new: true, upsert: true }
    );

    // Alert condition
    let alertSent = false;

    if (riskScore >= 80) {
      const event = {
        wallet: lowerWallet,
        flaggedAt: new Date().toISOString(),
        riskScore,
        riskLevel: 'HIGH',
      };

      // Send alerts
      await Promise.all([
        sendEmailAlert(lowerWallet, riskScore),
        sendWebhookAlert(lowerWallet, riskScore),
        publishHighRiskWalletFlaggedEvent(event)
      ]);

      logAlert('High-Risk Wallet Flagged', event);
      alertSent = true;
    }

    return res.status(200).json({
      message: 'Wallet evaluated and stored',
      wallet: lowerWallet,
      riskScore,
      alertSent,
      flagged: riskScore >= 70,
      data: riskEntry
    });

  } catch (error) {
    console.error('❌ Flag wallet error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { flagWallet };
