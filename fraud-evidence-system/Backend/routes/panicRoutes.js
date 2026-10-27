const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const adminOnly = require('../middleware/adminOnly');

// Panic workflow endpoint - Mark wallet for shutdown/freeze
router.post('/:walletAddress', auth, adminOnly, async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const { reason, severity = 'HIGH', notifyExternal = true } = req.body;
    
    if (!walletAddress) {
      return res.status(400).json({
        success: false,
        error: 'Wallet address is required'
      });
    }

    // Create panic record
    const panicRecord = {
      walletAddress: walletAddress.toLowerCase(),
      reason: reason || 'Suspicious activity detected',
      severity,
      status: 'ACTIVE',
      triggeredBy: req.user.email,
      triggeredAt: new Date(),
      notifyExternal,
      caseId: `PANIC-${Date.now()}`,
      escalationLevel: 1
    };

    // Log panic action
    console.log(`🚨 PANIC TRIGGERED: ${walletAddress}`);
    console.log(`   Reason: ${panicRecord.reason}`);
    console.log(`   Severity: ${panicRecord.severity}`);
    console.log(`   Triggered by: ${req.user.email}`);

    // Simulate external notifications
    if (notifyExternal) {
      try {
        // Simulate RBI notification
        await simulateRBIWebhook(panicRecord);
        
        // Simulate CERT notification
        await simulateCERTWebhook(panicRecord);
        
        // Simulate bank freeze request
        await simulateBankFreeze(panicRecord);
        
        panicRecord.externalNotificationsSent = true;
        panicRecord.notificationStatus = 'SUCCESS';
      } catch (notificationError) {
        console.error('External notification failed:', notificationError);
        panicRecord.externalNotificationsSent = false;
        panicRecord.notificationStatus = 'FAILED';
      }
    }

    // Store in database (you might want to create a PanicRecord model)
    // For now, we'll just log it
    console.log('Panic record:', panicRecord);

    res.json({
      success: true,
      message: 'Panic workflow triggered successfully',
      data: {
        caseId: panicRecord.caseId,
        walletAddress: panicRecord.walletAddress,
        status: 'ACTIVE',
        escalationLevel: panicRecord.escalationLevel,
        externalNotificationsSent: panicRecord.externalNotificationsSent,
        timestamp: panicRecord.triggeredAt
      }
    });

  } catch (error) {
    console.error('Error in panic workflow:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to trigger panic workflow',
      details: error.message
    });
  }
});

// Get panic status for a wallet
router.get('/:walletAddress', auth, async (req, res) => {
  try {
    const { walletAddress } = req.params;
    
    // In a real implementation, you'd query the database for panic records
    // For now, we'll return a mock response
    const panicStatus = {
      walletAddress: walletAddress.toLowerCase(),
      isPanicActive: false,
      lastPanicTriggered: null,
      escalationLevel: 0,
      status: 'NORMAL'
    };

    res.json({
      success: true,
      data: panicStatus
    });

  } catch (error) {
    console.error('Error checking panic status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check panic status',
      details: error.message
    });
  }
});

// Get all panic records (admin only)
router.get('/', auth, adminOnly, async (req, res) => {
  try {
    // In a real implementation, you'd query the database
    const panicRecords = [
      {
        caseId: 'PANIC-1735301234567',
        walletAddress: '0x742d35Cc6634C0532925a3b8D',
        reason: 'High-risk transaction detected',
        severity: 'HIGH',
        status: 'ACTIVE',
        triggeredBy: 'admin@example.com',
        triggeredAt: new Date(Date.now() - 3600000), // 1 hour ago
        escalationLevel: 2,
        externalNotificationsSent: true
      }
    ];

    res.json({
      success: true,
      data: panicRecords
    });

  } catch (error) {
    console.error('Error fetching panic records:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch panic records',
      details: error.message
    });
  }
});

// Simulate RBI webhook notification
async function simulateRBIWebhook(panicRecord) {
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log(`📧 RBI Notification: Wallet ${panicRecord.walletAddress} flagged`);
      resolve({ status: 'sent', timestamp: new Date() });
    }, 1000);
  });
}

// Simulate CERT webhook notification
async function simulateCERTWebhook(panicRecord) {
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log(`📧 CERT Notification: Wallet ${panicRecord.walletAddress} flagged`);
      resolve({ status: 'sent', timestamp: new Date() });
    }, 1500);
  });
}

// Simulate bank freeze request
async function simulateBankFreeze(panicRecord) {
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log(`🏦 Bank Freeze Request: Wallet ${panicRecord.walletAddress} flagged`);
      resolve({ status: 'requested', timestamp: new Date() });
    }, 2000);
  });
}

module.exports = router;

