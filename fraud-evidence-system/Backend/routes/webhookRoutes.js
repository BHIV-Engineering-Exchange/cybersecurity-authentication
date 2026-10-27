const express = require('express');
const router = express.Router();
const IPGeoResolver = require('../services/ipGeoResolver');
const RLEngine = require('../services/rlEngine');

// Initialize services
const ipGeoResolver = new IPGeoResolver();
const rlEngine = new RLEngine();

// Webhook escalation layer - Triggered when risk > threshold
router.post('/escalate', async (req, res) => {
  try {
    const { 
      walletAddress, 
      riskScore, 
      riskLevel, 
      reason, 
      evidence,
      caseId,
      investigatorEmail 
    } = req.body;

    console.log(`🚨 ESCALATION WEBHOOK TRIGGERED`);
    console.log(`   Wallet: ${walletAddress}`);
    console.log(`   Risk Score: ${riskScore}%`);
    console.log(`   Risk Level: ${riskLevel}`);
    console.log(`   Reason: ${reason}`);

    // Create escalation record
    const escalation = {
      caseId: caseId || `ESC-${Date.now()}`,
      walletAddress: walletAddress.toLowerCase(),
      riskScore,
      riskLevel,
      reason,
      evidence: evidence || [],
      investigatorEmail,
      escalatedAt: new Date(),
      status: 'PENDING',
      escalationLevel: determineEscalationLevel(riskScore, riskLevel)
    };

    // Auto-escalate based on risk threshold
    if (riskScore >= 80 || riskLevel === 'CRITICAL') {
      escalation.status = 'AUTO_ESCALATED';
      escalation.escalationLevel = 3;
      
      // Trigger immediate notifications
      await triggerImmediateNotifications(escalation);
    }

    // Log escalation
    console.log('Escalation record:', escalation);

    // In a real implementation, you'd store this in the database
    // and trigger external webhooks to RBI/CERT

    res.json({
      success: true,
      message: 'Escalation processed successfully',
      data: {
        caseId: escalation.caseId,
        status: escalation.status,
        escalationLevel: escalation.escalationLevel,
        timestamp: escalation.escalatedAt
      }
    });

  } catch (error) {
    console.error('Error processing escalation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process escalation',
      details: error.message
    });
  }
});

// Manual escalate endpoint
router.post('/manual-escalate', async (req, res) => {
  try {
    const { 
      walletAddress, 
      reason, 
      priority = 'HIGH',
      caseId,
      investigatorEmail 
    } = req.body;

    if (!walletAddress || !reason) {
      return res.status(400).json({
        success: false,
        error: 'Wallet address and reason are required'
      });
    }

    console.log(`🚨 MANUAL ESCALATION TRIGGERED`);
    console.log(`   Wallet: ${walletAddress}`);
    console.log(`   Reason: ${reason}`);
    console.log(`   Priority: ${priority}`);

    const escalation = {
      caseId: caseId || `MANUAL-ESC-${Date.now()}`,
      walletAddress: walletAddress.toLowerCase(),
      reason,
      priority,
      investigatorEmail,
      escalatedAt: new Date(),
      status: 'MANUAL_ESCALATED',
      escalationLevel: priority === 'CRITICAL' ? 3 : priority === 'HIGH' ? 2 : 1
    };

    // Trigger notifications for manual escalations
    await triggerImmediateNotifications(escalation);

    res.json({
      success: true,
      message: 'Manual escalation triggered successfully',
      data: {
        caseId: escalation.caseId,
        status: escalation.status,
        escalationLevel: escalation.escalationLevel,
        timestamp: escalation.escalatedAt
      }
    });

  } catch (error) {
    console.error('Error processing manual escalation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process manual escalation',
      details: error.message
    });
  }
});

// Get escalation history
router.get('/history', async (req, res) => {
  try {
    const { walletAddress, limit = 20 } = req.query;
    
    // In a real implementation, you'd query the database
    const escalationHistory = [
      {
        caseId: 'ESC-1735301234567',
        walletAddress: '0x742d35Cc6634C0532925a3b8D',
        riskScore: 85,
        riskLevel: 'HIGH',
        reason: 'Suspicious transaction patterns detected',
        escalatedAt: new Date(Date.now() - 3600000),
        status: 'AUTO_ESCALATED',
        escalationLevel: 2
      },
      {
        caseId: 'MANUAL-ESC-1735301234568',
        walletAddress: 'b716431137bcd00eb3c48ab0e1803daad53555a1599b646d610e09009be811a2',
        reason: 'Manual escalation by investigator',
        priority: 'HIGH',
        escalatedAt: new Date(Date.now() - 7200000),
        status: 'MANUAL_ESCALATED',
        escalationLevel: 2
      }
    ];

    // Filter by wallet address if provided
    const filteredHistory = walletAddress 
      ? escalationHistory.filter(esc => esc.walletAddress.toLowerCase().includes(walletAddress.toLowerCase()))
      : escalationHistory;

    res.json({
      success: true,
      data: filteredHistory.slice(0, parseInt(limit))
    });

  } catch (error) {
    console.error('Error fetching escalation history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch escalation history',
      details: error.message
    });
  }
});

// Helper function to determine escalation level
function determineEscalationLevel(riskScore, riskLevel) {
  if (riskLevel === 'CRITICAL' || riskScore >= 90) return 3;
  if (riskLevel === 'HIGH' || riskScore >= 70) return 2;
  if (riskLevel === 'MEDIUM' || riskScore >= 50) return 1;
  return 0;
}

// Trigger immediate notifications
async function triggerImmediateNotifications(escalation) {
  try {
    // Simulate RBI notification
    console.log(`📧 Sending RBI notification for case ${escalation.caseId}`);
    
    // Simulate CERT notification
    console.log(`📧 Sending CERT notification for case ${escalation.caseId}`);
    
    // Simulate law enforcement notification
    console.log(`📧 Sending law enforcement notification for case ${escalation.caseId}`);
    
    // Simulate bank notification
    console.log(`📧 Sending bank notification for case ${escalation.caseId}`);
    
    return { success: true, notificationsSent: 4 };
  } catch (error) {
    console.error('Error sending notifications:', error);
    return { success: false, error: error.message };
  }
}

// POST /api/webhook/geo-info - Get geo information for IP
router.post('/geo-info', async (req, res) => {
  try {
    const { ip } = req.body;
    
    if (!ip) {
      return res.status(400).json({
        success: false,
        error: 'IP address is required'
      });
    }
    
    const geoInfo = await ipGeoResolver.resolveIP(ip);
    
    res.json({
      success: true,
      data: geoInfo
    });
    
  } catch (error) {
    console.error('❌ Geo info resolution failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to resolve geo information',
      details: error.message
    });
  }
});

// GET /api/webhook/rl-status - Get RL engine status
router.get('/rl-status', async (req, res) => {
  try {
    const status = rlEngine.getStatus();
    
    res.json({
      success: true,
      data: status
    });
    
  } catch (error) {
    console.error('❌ Failed to get RL status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get RL status',
      details: error.message
    });
  }
});

// POST /api/webhook/rl-train - Train RL model with feedback
router.post('/rl-train', async (req, res) => {
  try {
    const { inputData, action, outcome } = req.body;
    
    if (!inputData || !action || !outcome) {
      return res.status(400).json({
        success: false,
        error: 'inputData, action, and outcome are required'
      });
    }
    
    const result = rlEngine.train(inputData, action, outcome);
    
    res.json({
      success: true,
      message: 'RL training completed',
      data: result
    });
    
  } catch (error) {
    console.error('❌ RL training failed:', error);
    res.status(500).json({
      success: false,
      error: 'RL training failed',
      details: error.message
    });
  }
});

// POST /api/webhook/rl-predict - Get RL prediction
router.post('/rl-predict', async (req, res) => {
  try {
    const { inputData } = req.body;
    
    if (!inputData) {
      return res.status(400).json({
        success: false,
        error: 'inputData is required'
      });
    }
    
    const prediction = rlEngine.predict(inputData);
    
    res.json({
      success: true,
      data: prediction
    });
    
  } catch (error) {
    console.error('❌ RL prediction failed:', error);
    res.status(500).json({
      success: false,
      error: 'RL prediction failed',
      details: error.message
    });
  }
});

// GET /api/webhook/api-stats - Get API usage statistics
router.get('/api-stats', async (req, res) => {
  try {
    const stats = ipGeoResolver.getApiStats();
    
    res.json({
      success: true,
      data: stats
    });
    
  } catch (error) {
    console.error('❌ Failed to get API stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get API stats',
      details: error.message
    });
  }
});

module.exports = router;
