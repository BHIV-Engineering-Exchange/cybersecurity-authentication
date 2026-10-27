/**
 * Cybercrime Routes - Violation Reporting and Account Freezing
 * Integrates with Cybercrime.sol smart contract
 */

const express = require('express');
const router = express.Router();
const { getMLDetector } = require('../services/mlViolationDetector');

const mlDetector = getMLDetector();

// In-memory storage (replace with blockchain contract calls in production)
let violations = [];
let violationCounter = 0;
let freezeRecords = new Map();

/**
 * POST /api/cybercrime/report
 * Report a violation (manual or ML-generated)
 */
router.post('/report', async (req, res) => {
  try {
    const { violator, violationType, description, severity } = req.body;
    
    if (!violator || violationType === undefined || !description || !severity) {
      return res.status(400).json({
        error: 'Missing required fields: violator, violationType, description, severity'
      });
    }
    
    const reportId = ++violationCounter;
    const report = {
      reportId,
      violator,
      violationType,
      description,
      severity,
      timestamp: Math.floor(Date.now() / 1000),
      reporter: req.body.reporter || req.headers['x-user-email'] || 'SYSTEM',
      investigated: false,
      actionTaken: false,
      actionDetails: ''
    };
    
    violations.push(report);
    
    log(`📝 Violation reported: ID ${reportId}, Address ${violator.substring(0, 10)}...`);
    
    res.json({
      success: true,
      reportId,
      message: 'Violation reported successfully'
    });
    
  } catch (error) {
    console.error('Report violation error:', error);
    res.status(500).json({ error: 'Failed to report violation', details: error.message });
  }
});

/**
 * POST /api/cybercrime/freeze
 * Freeze an account based on violation
 */
router.post('/freeze', async (req, res) => {
  try {
    const { account, reason } = req.body;
    
    if (!account || !reason) {
      return res.status(400).json({
        error: 'Missing required fields: account, reason'
      });
    }
    
    // Check if already frozen
    if (freezeRecords.has(account)) {
      return res.status(400).json({
        error: 'Account already frozen',
        freezeRecord: freezeRecords.get(account)
      });
    }
    
    // Create freeze record
    const freezeRecord = {
      account,
      reason,
      frozenAt: new Date().toISOString(),
      freezer: req.headers['x-user-email'] || 'ADMIN',
      active: true,
      multichainFrozen: {
        ETH: true,
        BH: true,
        SOL: true
      }
    };
    
    freezeRecords.set(account, freezeRecord);
    
    console.log(`🔒 Account frozen: ${account.substring(0, 10)}...`);
    console.log(`   Reason: ${reason}`);
    
    // Emit multichain freeze event
    console.log(`🌐 Triggering multichain freeze...`);
    
    res.json({
      success: true,
      message: 'Account frozen successfully',
      freezeRecord,
      multichainFrozen: true
    });
    
  } catch (error) {
    console.error('Freeze account error:', error);
    res.status(500).json({ error: 'Failed to freeze account', details: error.message });
  }
});

/**
 * POST /api/cybercrime/unfreeze
 * Unfreeze an account
 */
router.post('/unfreeze', async (req, res) => {
  try {
    const { account } = req.body;
    
    if (!account) {
      return res.status(400).json({ error: 'Account is required' });
    }
    
    if (!freezeRecords.has(account)) {
      return res.status(404).json({ error: 'Account not frozen' });
    }
    
    const freezeRecord = freezeRecords.get(account);
    freezeRecord.active = false;
    freezeRecord.unfrozenAt = new Date().toISOString();
    freezeRecord.unfreezer = req.headers['x-user-email'] || 'ADMIN';
    
    console.log(`🔓 Account unfrozen: ${account.substring(0, 10)}...`);
    
    res.json({
      success: true,
      message: 'Account unfrozen successfully',
      freezeRecord
    });
    
  } catch (error) {
    console.error('Unfreeze account error:', error);
    res.status(500).json({ error: 'Failed to unfreeze account', details: error.message });
  }
});

/**
 * GET /api/cybercrime/freeze-status/:account
 * Check if account is frozen
 */
router.get('/freeze-status/:account', async (req, res) => {
  try {
    const { account } = req.params;
    
    if (freezeRecords.has(account)) {
      const record = freezeRecords.get(account);
      res.json({
        frozen: record.active,
        freezeRecord: record
      });
    } else {
      res.json({
        frozen: false,
        freezeRecord: null
      });
    }
    
  } catch (error) {
    console.error('Get freeze status error:', error);
    res.status(500).json({ error: 'Failed to get freeze status', details: error.message });
  }
});

/**
 * GET /api/cybercrime/reports
 * Get all violation reports
 */
router.get('/reports', async (req, res) => {
  try {
    const { violator, investigated } = req.query;
    
    let filtered = violations;
    
    if (violator) {
      filtered = filtered.filter(v => v.violator === violator);
    }
    
    if (investigated !== undefined) {
      const isInvestigated = investigated === 'true';
      filtered = filtered.filter(v => v.investigated === isInvestigated);
    }
    
    res.json({
      count: filtered.length,
      reports: filtered
    });
    
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({ error: 'Failed to get reports', details: error.message });
  }
});

/**
 * POST /api/cybercrime/investigate/:reportId
 * Mark report as investigated
 */
router.post('/investigate/:reportId', async (req, res) => {
  try {
    const reportId = parseInt(req.params.reportId);
    const { takeAction, details } = req.body;
    
    const report = violations.find(v => v.reportId === reportId);
    
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    report.investigated = true;
    report.actionTaken = takeAction;
    report.actionDetails = details || '';
    
    console.log(`🔍 Report ${reportId} investigated`);
    console.log(`   Action taken: ${takeAction}`);
    
    res.json({
      success: true,
      message: 'Report investigated',
      report
    });
    
  } catch (error) {
    console.error('Investigate error:', error);
    res.status(500).json({ error: 'Failed to investigate report', details: error.message });
  }
});

/**
 * POST /api/cybercrime/auto-enforce
 * Automatically analyze and enforce if violation detected
 */
router.post('/auto-enforce', async (req, res) => {
  try {
    const { address } = req.body;
    
    if (!address) {
      return res.status(400).json({ error: 'Address is required' });
    }
    
    // Run ML analysis
    log(`🤖 Running ML analysis on ${address.substring(0, 10)}...`);
    const analysis = await mlDetector.analyzeAddress(address);
    
    // If violation detected with high score, auto-freeze
    if (analysis.score >= 0.85) {
      // Report violation
      const reportId = ++violationCounter;
      violations.push({
        reportId,
        violator: address,
        violationType: 5, // ML_DETECTED
        description: analysis.details,
        severity: Math.floor(analysis.score * 100),
        timestamp: Math.floor(Date.now() / 1000),
        reporter: 'ML_SYSTEM',
        investigated: false,
        actionTaken: false
      });
      
      // Freeze account
      freezeRecords.set(address, {
        account: address,
        reason: `ML Detection: ${analysis.violation} (score: ${analysis.score})`,
        frozenAt: new Date().toISOString(),
        freezer: 'ML_SYSTEM',
        active: true,
        relatedReports: [reportId]
      });
      
      console.log(`🔒 Auto-freeze executed for ${address.substring(0, 10)}...`);
      
      res.json({
        success: true,
        action: 'frozen',
        analysis,
        reportId,
        message: 'Account automatically frozen due to high-severity violation'
      });
    } else {
      res.json({
        success: true,
        action: analysis.recommended_action,
        analysis,
        message: `No auto-freeze (score: ${analysis.score})`
      });
    }
    
  } catch (error) {
    console.error('Auto-enforce error:', error);
    res.status(500).json({ error: 'Auto-enforce failed', details: error.message });
  }
});

/**
 * GET /api/cybercrime/stats
 * Get cybercrime enforcement statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const frozenAccounts = Array.from(freezeRecords.values()).filter(r => r.active);
    
    const byViolationType = {};
    violations.forEach(v => {
      const type = v.violationType;
      byViolationType[type] = (byViolationType[type] || 0) + 1;
    });
    
    res.json({
      totalReports: violations.length,
      investigatedReports: violations.filter(v => v.investigated).length,
      frozenAccounts: frozenAccounts.length,
      activeViolations: violations.filter(v => !v.investigated).length,
      byViolationType
    });
    
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to get stats', details: error.message });
  }
});

module.exports = router;
