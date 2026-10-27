const express = require('express');
const router = express.Router();
const Report = require('../models/Report');
const RiskModel = require('../models/RiskModel');

// GET /api/risk/:wallet - Get wallet risk assessment
router.get('/:wallet', async (req, res) => {
  try {
    const { wallet } = req.params;
    const normalizedWallet = wallet.toLowerCase();
    
    // Try to get from RiskModel first
    const riskEntry = await RiskModel.findOne({ wallet: normalizedWallet });
    
    if (riskEntry) {
      res.json({ 
        wallet: riskEntry.wallet, 
        riskScore: riskEntry.riskScore, 
        riskLevel: riskEntry.riskScore >= 70 ? 'High' : riskEntry.riskScore >= 40 ? 'Medium' : 'Low',
        flagged: riskEntry.flagged,
        totalReports: riskEntry.reportCount || 0,
        lastUpdated: riskEntry.updatedAt
      });
    } else {
      // Fallback to calculating from reports
      const reports = await Report.find({ wallet: normalizedWallet });
      const totalSeverity = reports.reduce((acc, r) => acc + r.severity, 0);
      const riskLevel = totalSeverity > 15 ? 'High' : totalSeverity > 5 ? 'Medium' : 'Low';
      
      res.json({ 
        wallet: normalizedWallet, 
        riskLevel, 
        riskScore: Math.min(totalSeverity * 10, 100),
        flagged: totalSeverity > 15,
        totalReports: reports.length 
      });
    }
  } catch (err) {
    console.error('Risk assessment error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
