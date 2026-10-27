const express = require('express');
const router = express.Router();
const MLAnalysis = require('../models/MLAnalysis');
const IncidentReport = require('../models/IncidentReport');
const CaseManager = require('../models/CaseManager');
const User = require('../models/User');
const fraudDetectionService = require('../services/fraudDetectionService');
const auth = require('../middleware/auth');
const adminOnly = require('../middleware/adminOnly');

// Get ML analysis results for a specific wallet
router.get('/wallet/:walletAddress', auth, async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const userRole = req.user.role;
    const userId = req.user.userId;
    
    // Build query based on user role
    const query = userRole === 'admin' 
      ? { walletAddress: walletAddress.toLowerCase() }
      : { walletAddress: walletAddress.toLowerCase(), createdBy: userId };
    
    const analyses = await MLAnalysis.find(query)
      .populate('incidentReportId', 'reason status priority createdAt')
      .sort({ createdAt: -1 })
      .limit(10);
    
    res.json({
      success: true,
      data: analyses
    });
  } catch (error) {
    console.error('Error fetching ML analysis:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch ML analysis',
      details: error.message
    });
  }
});

// Get user's ML analysis history
router.get('/my-analyses', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userRole = req.user.role;
    const { limit = 10, page = 1 } = req.query;
    
    const analyses = await MLAnalysis.getUserAnalyses(userId, userRole, parseInt(limit));
    
    res.json({
      success: true,
      data: analyses
    });
  } catch (error) {
    console.error('Error fetching user ML analyses:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch ML analyses',
      details: error.message
    });
  }
});

// Get all ML analyses (admin only)
router.get('/all', auth, adminOnly, async (req, res) => {
  try {
    const { limit = 20, page = 1, riskLevel, userRole } = req.query;
    const filter = {};
    
    if (riskLevel) filter['analysisResults.riskLevel'] = riskLevel;
    if (userRole) filter.userRole = userRole;
    
    const analyses = await MLAnalysis.find(filter)
      .populate('incidentReportId', 'reason status priority')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));
    
    const total = await MLAnalysis.countDocuments(filter);
    
    res.json({
      success: true,
      data: {
        analyses,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          total
        }
      }
    });
  } catch (error) {
    console.error('Error fetching all ML analyses:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch ML analyses',
      details: error.message
    });
  }
});

// Get ML analysis by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = req.user.role;
    const userId = req.user.userId;
    
    const analysis = await MLAnalysis.findById(id)
      .populate('incidentReportId', 'reason status priority createdAt')
      .populate('createdBy', 'name email');
    
    if (!analysis) {
      return res.status(404).json({
        success: false,
        error: 'ML analysis not found'
      });
    }
    
    // Check if user can access this analysis
    if (userRole !== 'admin' && analysis.createdBy.toString() !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. You can only view your own analyses.'
      });
    }
    
    res.json({
      success: true,
      data: analysis
    });
  } catch (error) {
    console.error('Error fetching ML analysis:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch ML analysis',
      details: error.message
    });
  }
});

// Create new ML analysis
router.post('/analyze', auth, async (req, res) => {
  try {
    const { walletAddress, incidentReportId } = req.body;
    const userId = req.user.userId;
    const userEmail = req.user.email;
    const userRole = req.user.role;
    
    if (!walletAddress) {
      return res.status(400).json({
        success: false,
        error: 'Wallet address is required'
      });
    }
    
    // Perform fraud analysis
    const startTime = Date.now();
    const fraudAnalysis = await fraudDetectionService.analyzeWallet(walletAddress);
    const processingTime = Date.now() - startTime;
    
    // Create ML analysis record
    const mlAnalysis = new MLAnalysis({
      incidentReportId: incidentReportId || null,
      walletAddress: walletAddress.toLowerCase(),
      analysisResults: {
        riskLevel: fraudAnalysis.risk_level,
        fraudProbability: fraudAnalysis.analysis_results.reduce((sum, r) => sum + r.fraud_probability, 0) / fraudAnalysis.analysis_results.length,
        anomalyScore: fraudAnalysis.analysis_results.reduce((sum, r) => sum + r.anomaly_score, 0) / fraudAnalysis.analysis_results.length,
        isSuspicious: fraudAnalysis.statistics.suspicious_percentage > 10,
        suspiciousTransactions: fraudAnalysis.analysis_results.filter(r => r.is_suspicious).map(r => ({
          txHash: r.tx_hash,
          fromAddress: r.from_address,
          toAddress: r.to_address,
          anomalyScore: r.anomaly_score,
          isSuspicious: r.is_suspicious
        })),
        suspiciousAddresses: fraudAnalysis.statistics.suspicious_addresses,
        analysisTimestamp: new Date()
      },
      modelInfo: {
        modelType: 'IsolationForest',
        modelVersion: '1.0',
        confidence: 0.85
      },
      createdBy: userId,
      userEmail: userEmail,
      userRole: userRole,
      analysisMetadata: {
        totalTransactionsAnalyzed: fraudAnalysis.analysis_results.length,
        dataSource: 'bhx_transactions.json',
        processingTime: processingTime,
        featuresUsed: ['amount', 'gas_price', 'transaction_frequency', 'address_patterns']
      },
      status: 'COMPLETED'
    });
    
    await mlAnalysis.save();
    
    // Automatically create case manager entry for investigators
    if (userRole === 'investigator') {
      try {
        const user = await User.findById(userId);
        if (user) {
          // Determine priority based on risk level
          let priority = 'Low';
          if (mlAnalysis.analysisResults.riskLevel === 'CRITICAL') priority = 'Critical';
          else if (mlAnalysis.analysisResults.riskLevel === 'HIGH') priority = 'High';
          else if (mlAnalysis.analysisResults.riskLevel === 'MEDIUM') priority = 'Medium';
          
          // Check if case already exists for this ML analysis
          const existingCase = await CaseManager.findOne({ mlAnalysisId: mlAnalysis._id });
          if (!existingCase) {
            const newCase = new CaseManager({
              walletAddress: mlAnalysis.walletAddress,
              riskScore: Math.round(mlAnalysis.analysisResults.fraudProbability * 100),
              status: 'New',
              investigatorId: userId,
              investigatorName: user.name || user.email,
              investigatorEmail: user.email,
              mlAnalysisId: mlAnalysis._id,
              incidentReportId: mlAnalysis.incidentReportId,
              analysisResults: mlAnalysis.analysisResults,
              modelInfo: mlAnalysis.modelInfo,
              priority,
              tags: ['ML Analysis', mlAnalysis.analysisResults.riskLevel],
              createdBy: userId
            });
            
            await newCase.save();
            console.log(`✅ Case Manager entry created: ${newCase.caseId} for investigator ${user.email}`);
          }
        }
      } catch (caseError) {
        console.error('Error creating case manager entry:', caseError);
        // Don't fail the ML analysis if case creation fails
      }
    }
    
    res.status(201).json({
      success: true,
      message: 'ML analysis completed successfully',
      data: mlAnalysis
    });
  } catch (error) {
    console.error('Error creating ML analysis:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create ML analysis',
      details: error.message
    });
  }
});

// Get ML analysis statistics (admin only)
router.get('/stats/overview', auth, adminOnly, async (req, res) => {
  try {
    const stats = await MLAnalysis.getStatistics();
    const result = stats[0] || {
      total: 0,
      lowRisk: 0,
      mediumRisk: 0,
      highRisk: 0,
      criticalRisk: 0,
      suspicious: 0,
      avgFraudProbability: 0
    };
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching ML analysis statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics',
      details: error.message
    });
  }
});

// Search ML analyses
router.get('/search/wallet', auth, async (req, res) => {
  try {
    const { walletAddress } = req.query;
    const userRole = req.user.role;
    const userId = req.user.userId;
    
    if (!walletAddress) {
      return res.status(400).json({
        success: false,
        error: 'Wallet address is required for search'
      });
    }
    
    const query = userRole === 'admin' 
      ? { walletAddress: { $regex: walletAddress, $options: 'i' } }
      : { 
          walletAddress: { $regex: walletAddress, $options: 'i' },
          createdBy: userId 
        };
    
    const analyses = await MLAnalysis.find(query)
      .populate('incidentReportId', 'reason status priority')
      .sort({ createdAt: -1 })
      .limit(20);
    
    res.json({
      success: true,
      data: analyses
    });
  } catch (error) {
    console.error('Error searching ML analyses:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search ML analyses',
      details: error.message
    });
  }
});

module.exports = router;
