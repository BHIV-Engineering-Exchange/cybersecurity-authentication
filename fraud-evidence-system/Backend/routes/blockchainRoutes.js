/**
 * Blockchain Routes - Token, DEX, Bridge, Cybercrime Integration
 * Integrates all blockchain components
 */

const express = require('express');
const router = express.Router();

// Import services
const { getBridgeSDK } = require('../services/bridgeSDK');
const { getMLDetector } = require('../services/mlViolationDetector');
const { getTransactionDataService } = require('../services/transactionDataService');

// Initialize services
const bridgeSDK = getBridgeSDK();
const mlDetector = getMLDetector();
const txDataService = getTransactionDataService();

// Initialize bridge on first load
bridgeSDK.initialize().catch(err => console.error('Bridge init failed:', err));

/**
 * POST /api/blockchain/bridge/transfer
 * Bridge tokens between chains
 */
router.post('/bridge/transfer', async (req, res) => {
  try {
    const { fromChain, toChain, fromAddress, toAddress, amount } = req.body;
    
    if (!fromChain || !toChain || !fromAddress || !toAddress || !amount) {
      return res.status(400).json({
        error: 'Missing required fields: fromChain, toChain, fromAddress, toAddress, amount'
      });
    }
    
    const result = await bridgeSDK.bridgeTransfer(
      fromChain,
      toChain,
      fromAddress,
      toAddress,
      amount
    );
    
    res.json(result);
    
  } catch (error) {
    console.error('Bridge transfer error:', error);
    res.status(500).json({
      error: 'Bridge transfer failed',
      details: error.message
    });
  }
});

/**
 * GET /api/blockchain/bridge/status/:transferId
 * Get bridge transfer status
 */
router.get('/bridge/status/:transferId', async (req, res) => {
  try {
    const result = await bridgeSDK.getTransferStatus(req.params.transferId);
    
    if (result.status === 'not_found') {
      return res.status(404).json({ error: 'Transfer not found' });
    }
    
    res.json(result);
    
  } catch (error) {
    console.error('Get status error:', error);
    res.status(500).json({ error: 'Failed to get transfer status', details: error.message });
  }
});

/**
 * GET /api/blockchain/bridge/logs
 * Get bridge event logs
 */
router.get('/bridge/logs', async (req, res) => {
  try {
    const { type, transferId } = req.query;
    const logs = bridgeSDK.getEventLogs({ type, transferId });
    
    res.json({
      count: logs.length,
      logs
    });
    
  } catch (error) {
    console.error('Get logs error:', error);
    res.status(500).json({ error: 'Failed to get logs', details: error.message });
  }
});

/**
 * GET /api/blockchain/bridge/stats
 * Get bridge latency statistics
 */
router.get('/bridge/stats', async (req, res) => {
  try {
    const stats = bridgeSDK.getLatencyStats();
    res.json(stats);
    
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to get stats', details: error.message });
  }
});

/**
 * POST /api/blockchain/ml/analyze
 * Analyze address for violations
 */
router.post('/ml/analyze', async (req, res) => {
  try {
    const { address } = req.body;
    
    if (!address) {
      return res.status(400).json({ error: 'Address is required' });
    }
    
    const analysis = await mlDetector.analyzeAddress(address);
    
    res.json(analysis);
    
  } catch (error) {
    console.error('ML analysis error:', error);
    res.status(500).json({ error: 'Analysis failed', details: error.message });
  }
});

/**
 * POST /api/blockchain/ml/batch-analyze
 * Batch analyze multiple addresses
 */
router.post('/ml/batch-analyze', async (req, res) => {
  try {
    const { addresses } = req.body;
    
    if (!Array.isArray(addresses) || addresses.length === 0) {
      return res.status(400).json({ error: 'Addresses array is required' });
    }
    
    const results = await mlDetector.batchAnalyze(addresses);
    
    res.json(results);
    
  } catch (error) {
    console.error('Batch analysis error:', error);
    res.status(500).json({ error: 'Batch analysis failed', details: error.message });
  }
});

/**
 * GET /api/blockchain/ml/stats
 * Get ML detection statistics
 */
router.get('/ml/stats', async (req, res) => {
  try {
    const stats = mlDetector.getStats();
    res.json(stats);
    
  } catch (error) {
    console.error('ML stats error:', error);
    res.status(500).json({ error: 'Failed to get stats', details: error.message });
  }
});

/**
 * GET /api/blockchain/transactions
 * Get all transactions from API
 */
router.get('/transactions', async (req, res) => {
  try {
    const transactions = await txDataService.getAllTransactions();
    
    res.json({
      count: transactions.length,
      transactions
    });
    
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ error: 'Failed to get transactions', details: error.message });
  }
});

/**
 * GET /api/blockchain/transactions/:address
 * Get transactions for specific address
 */
router.get('/transactions/:address', async (req, res) => {
  try {
    const transactions = await txDataService.getTransactionsByAddress(req.params.address);
    
    res.json({
      address: req.params.address,
      count: transactions.length,
      transactions
    });
    
  } catch (error) {
    console.error('Get address transactions error:', error);
    res.status(500).json({ error: 'Failed to get transactions', details: error.message });
  }
});

/**
 * GET /api/blockchain/transactions/recent/:limit
 * Get recent transactions
 */
router.get('/transactions/recent/:limit?', async (req, res) => {
  try {
    const limit = parseInt(req.params.limit) || 100;
    const transactions = await txDataService.getRecentTransactions(limit);
    
    res.json({
      count: transactions.length,
      limit,
      transactions
    });
    
  } catch (error) {
    console.error('Get recent transactions error:', error);
    res.status(500).json({ error: 'Failed to get recent transactions', details: error.message });
  }
});

/**
 * GET /api/blockchain/dex/trades
 * Get DEX trades only
 */
router.get('/dex/trades', async (req, res) => {
  try {
    const trades = await txDataService.getDEXTrades();
    
    res.json({
      count: trades.length,
      trades
    });
    
  } catch (error) {
    console.error('Get DEX trades error:', error);
    res.status(500).json({ error: 'Failed to get DEX trades', details: error.message });
  }
});

/**
 * GET /api/blockchain/health
 * Health check for blockchain services
 */
router.get('/health', async (req, res) => {
  try {
    const txServiceHealth = await txDataService.healthCheck();
    const txServiceStats = txDataService.getStats();
    const mlStats = mlDetector.getStats();
    const bridgeStats = bridgeSDK.getLatencyStats();
    
    res.json({
      status: 'healthy',
      services: {
        transactionData: txServiceHealth,
        mlDetector: {
          totalAnalyzed: mlStats.totalAnalyzed,
          violationsDetected: mlStats.violationsDetected
        },
        bridge: {
          totalTransfers: bridgeStats.count,
          avgLatency: bridgeStats.avgLatency
        }
      },
      stats: txServiceStats,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/blockchain/transactions/refresh
 * Force refresh transaction cache
 */
router.post('/transactions/refresh', async (req, res) => {
  try {
    txDataService.clearCache();
    mlDetector.clearCache();
    
    res.json({
      success: true,
      message: 'Cache cleared successfully'
    });
    
  } catch (error) {
    console.error('Cache refresh error:', error);
    res.status(500).json({ error: 'Failed to refresh cache', details: error.message });
  }
});

module.exports = router;

