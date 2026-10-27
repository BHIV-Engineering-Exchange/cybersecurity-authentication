const express = require('express');
const router = express.Router();
const fraudDetectionService = require('../services/fraudDetectionService');
const auth = require('../middleware/auth');
const adminOnly = require('../middleware/adminOnly');

// Train models endpoint (admin only)
router.post('/train', auth, adminOnly, async (req, res) => {
  try {
    const result = await fraudDetectionService.trainModels();
    res.json({
      success: true,
      message: 'Fraud detection models trained successfully',
      data: result
    });
  } catch (error) {
    console.error('Error training models:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to train fraud detection models',
      details: error.message
    });
  }
});

// Analyze wallet for fraud patterns
router.post('/analyze-wallet', async (req, res) => {
  try {
    const { walletAddress } = req.body;
    
    if (!walletAddress) {
      return res.status(400).json({
        success: false,
        error: 'Wallet address is required'
      });
    }

    const analysis = await fraudDetectionService.analyzeWallet(walletAddress);
    
    res.json({
      success: true,
      data: analysis
    });
  } catch (error) {
    console.error('Error analyzing wallet:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze wallet',
      details: error.message
    });
  }
});

// Predict fraud for a single transaction
router.post('/predict-transaction', async (req, res) => {
  try {
    const transaction = req.body;
    
    if (!transaction.tx_hash || !transaction.from_address || !transaction.to_address) {
      return res.status(400).json({
        success: false,
        error: 'Transaction data is incomplete. Required fields: tx_hash, from_address, to_address'
      });
    }

    const prediction = await fraudDetectionService.predictFraud(transaction);
    
    res.json({
      success: true,
      data: prediction
    });
  } catch (error) {
    console.error('Error predicting fraud:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to predict fraud',
      details: error.message
    });
  }
});

// Get fraud statistics
router.get('/statistics', async (req, res) => {
  try {
    const { features, metadata } = await fraudDetectionService.loadAndPreprocessData();
    const normalizedFeatures = fraudDetectionService.normalizeFeatures(features);
    const results = fraudDetectionService.calculateAnomalyScores(normalizedFeatures, metadata);
    const statistics = fraudDetectionService.getFraudStatistics(results);
    
    res.json({
      success: true,
      data: statistics
    });
  } catch (error) {
    console.error('Error getting statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get fraud statistics',
      details: error.message
    });
  }
});

// Get all suspicious transactions
router.get('/suspicious-transactions', async (req, res) => {
  try {
    const { features, metadata } = await fraudDetectionService.loadAndPreprocessData();
    const normalizedFeatures = fraudDetectionService.normalizeFeatures(features);
    const results = fraudDetectionService.calculateAnomalyScores(normalizedFeatures, metadata);
    const suspiciousTransactions = results.filter(r => r.is_suspicious);
    
    res.json({
      success: true,
      data: {
        suspicious_transactions: suspiciousTransactions,
        count: suspiciousTransactions.length
      }
    });
  } catch (error) {
    console.error('Error getting suspicious transactions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get suspicious transactions',
      details: error.message
    });
  }
});

// Get suspicious addresses
router.get('/suspicious-addresses', async (req, res) => {
  try {
    const { features, metadata } = await fraudDetectionService.loadAndPreprocessData();
    const normalizedFeatures = fraudDetectionService.normalizeFeatures(features);
    const results = fraudDetectionService.calculateAnomalyScores(normalizedFeatures, metadata);
    const statistics = fraudDetectionService.getFraudStatistics(results);
    
    res.json({
      success: true,
      data: {
        suspicious_addresses: statistics.suspicious_addresses,
        count: statistics.unique_suspicious_addresses
      }
    });
  } catch (error) {
    console.error('Error getting suspicious addresses:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get suspicious addresses',
      details: error.message
    });
  }
});

// Health check for fraud detection service
router.get('/health', async (req, res) => {
  try {
    const isTrained = fraudDetectionService.isTrained;
    
    res.json({
      success: true,
      data: {
        service_status: 'running',
        models_trained: isTrained,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Fraud detection service health check failed',
      details: error.message
    });
  }
});

module.exports = router;
