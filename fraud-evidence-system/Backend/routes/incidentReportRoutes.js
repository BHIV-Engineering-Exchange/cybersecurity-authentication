const express = require('express');
const router = express.Router();
const IncidentReport = require('../models/IncidentReport');
const MLAnalysis = require('../models/MLAnalysis');
const fraudDetectionService = require('../services/fraudDetectionService');
const auth = require('../middleware/auth');
const adminOnly = require('../middleware/adminOnly');

// Submit new incident report
router.post('/submit', async (req, res) => {
  try {
    const { walletAddress, reason, description, reporterName, reporterEmail, reporterPhone } = req.body;
    
    if (!walletAddress || !reason) {
      return res.status(400).json({
        success: false,
        error: 'Wallet address and reason are required'
      });
    }

    // Create incident report
    const incidentReport = new IncidentReport({
      walletAddress: walletAddress.toLowerCase(),
      reason,
      description,
      reporterName,
      reporterEmail,
      reporterPhone,
      createdBy: req.user?.id || null
    });

    // Perform fraud analysis
    try {
      const fraudAnalysis = await fraudDetectionService.analyzeWallet(walletAddress);
      
      // Update incident report with fraud analysis
      incidentReport.fraudAnalysis = {
        isSuspicious: fraudAnalysis.statistics.suspicious_percentage > 10,
        anomalyScore: fraudAnalysis.analysis_results.reduce((sum, r) => sum + r.anomaly_score, 0) / fraudAnalysis.analysis_results.length,
        fraudProbability: fraudAnalysis.analysis_results.reduce((sum, r) => sum + r.fraud_probability, 0) / fraudAnalysis.analysis_results.length,
        riskLevel: fraudAnalysis.risk_level,
        suspiciousTransactions: fraudAnalysis.analysis_results.filter(r => r.is_suspicious).map(r => ({
          txHash: r.tx_hash,
          fromAddress: r.from_address,
          toAddress: r.to_address,
          anomalyScore: r.anomaly_score,
          isSuspicious: r.is_suspicious
        })),
        suspiciousAddresses: fraudAnalysis.statistics.suspicious_addresses,
        analysisTimestamp: new Date()
      };

      // Set priority based on risk level
      if (fraudAnalysis.risk_level === 'HIGH') {
        incidentReport.priority = 'HIGH';
      } else if (fraudAnalysis.risk_level === 'MEDIUM') {
        incidentReport.priority = 'MEDIUM';
      }
    } catch (fraudError) {
      console.error('Fraud analysis failed:', fraudError);
      // Continue without fraud analysis
      incidentReport.fraudAnalysis = {
        isSuspicious: false,
        anomalyScore: 0,
        fraudProbability: 0,
        riskLevel: 'LOW',
        suspiciousTransactions: [],
        suspiciousAddresses: [],
        analysisTimestamp: new Date()
      };
    }

    await incidentReport.save();

    // Create ML Analysis record
    try {
      const mlAnalysis = new MLAnalysis({
        incidentReportId: incidentReport._id,
        walletAddress: incidentReport.walletAddress,
        analysisResults: {
          riskLevel: incidentReport.fraudAnalysis.riskLevel,
          fraudProbability: incidentReport.fraudAnalysis.fraudProbability,
          anomalyScore: incidentReport.fraudAnalysis.anomalyScore,
          isSuspicious: incidentReport.fraudAnalysis.isSuspicious,
          suspiciousTransactions: incidentReport.fraudAnalysis.suspiciousTransactions,
          suspiciousAddresses: incidentReport.fraudAnalysis.suspiciousAddresses,
          analysisTimestamp: incidentReport.fraudAnalysis.analysisTimestamp
        },
        modelInfo: {
          modelType: 'IsolationForest',
          modelVersion: '1.0',
          confidence: 0.85
        },
        createdBy: incidentReport.createdBy,
        userEmail: reporterEmail || 'anonymous@example.com',
        userRole: 'investigator', // Default role for public submissions
        analysisMetadata: {
          totalTransactionsAnalyzed: incidentReport.fraudAnalysis.suspiciousTransactions.length,
          dataSource: 'bhx_transactions.json',
          processingTime: 1000,
          featuresUsed: ['amount', 'gas_price', 'transaction_frequency', 'address_patterns']
        },
        status: 'COMPLETED'
      });
      
      await mlAnalysis.save();
      
      // Also create case manager entry for investigators
      try {
        // Get user information
        let userEmail = reporterEmail || 'anonymous@example.com';
        let userRole = 'investigator'; // Default role for public submissions
        
        // Try to find user by email to get proper role
        const User = require('../models/User');
        const user = await User.findOne({ email: userEmail });
        if (user) {
          userRole = user.role;
        }
        
        // Create case manager entry if user is investigator
        if (userRole === 'investigator') {
          const CaseManager = require('../models/CaseManager');
          
          // Determine priority based on risk level
          let priority = 'Low';
          if (incidentReport.fraudAnalysis.riskLevel === 'CRITICAL') priority = 'Critical';
          else if (incidentReport.fraudAnalysis.riskLevel === 'HIGH') priority = 'High';
          else if (incidentReport.fraudAnalysis.riskLevel === 'MEDIUM') priority = 'Medium';
          
          // Check if case already exists for this ML analysis
          const existingCase = await CaseManager.findOne({ mlAnalysisId: mlAnalysis._id });
          if (!existingCase) {
            const newCase = new CaseManager({
              walletAddress: incidentReport.walletAddress,
              riskScore: Math.round(incidentReport.fraudAnalysis.fraudProbability * 100),
              status: 'New',
              investigatorId: user ? user._id : null,
              investigatorName: user ? (user.name || user.email) : userEmail,
              investigatorEmail: userEmail,
              mlAnalysisId: mlAnalysis._id,
              incidentReportId: incidentReport._id,
              analysisResults: incidentReport.fraudAnalysis,
              modelInfo: {
                modelType: 'IsolationForest',
                modelVersion: '1.0',
                confidence: 0.85
              },
              priority,
              tags: ['ML Analysis', incidentReport.fraudAnalysis.riskLevel, 'Incident Report'],
              createdBy: user ? user._id : null
            });
            
            await newCase.save();
            console.log(`✅ Case Manager entry created from incident report: ${newCase.caseId} for investigator ${userEmail}`);
          }
        }
      } catch (caseError) {
        console.error('Error creating case manager entry from incident report:', caseError);
        // Don't fail the incident report if case creation fails
      }
    } catch (mlError) {
      console.error('Error creating ML analysis record:', mlError);
      // Continue without failing the incident report submission
    }

    res.status(201).json({
      success: true,
      message: 'Incident report submitted successfully',
      data: {
        reportId: incidentReport._id,
        walletAddress: incidentReport.walletAddress,
        status: incidentReport.status,
        priority: incidentReport.priority,
        fraudAnalysis: incidentReport.fraudAnalysis
      }
    });
  } catch (error) {
    console.error('Error submitting incident report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit incident report',
      details: error.message
    });
  }
});

// Get all incident reports (admin only)
router.get('/', auth, adminOnly, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, priority, riskLevel } = req.query;
    const filter = {};
    
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (riskLevel) filter['fraudAnalysis.riskLevel'] = riskLevel;

    const reports = await IncidentReport.find(filter)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await IncidentReport.countDocuments(filter);

    res.json({
      success: true,
      data: {
        reports,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    console.error('Error fetching incident reports:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch incident reports',
      details: error.message
    });
  }
});

// Get incident report by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const report = await IncidentReport.findById(req.params.id)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .populate('resolvedBy', 'name email');

    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Incident report not found'
      });
    }

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Error fetching incident report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch incident report',
      details: error.message
    });
  }
});

// Update incident report status
router.put('/:id/status', auth, async (req, res) => {
  try {
    const { status, resolution } = req.body;
    
    const report = await IncidentReport.findById(req.params.id);
    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Incident report not found'
      });
    }

    report.status = status;
    report.updatedBy = req.user.id;
    
    if (status === 'RESOLVED' && resolution) {
      report.resolution = resolution;
      report.resolvedBy = req.user.id;
      report.resolvedAt = new Date();
    }

    await report.save();

    res.json({
      success: true,
      message: 'Incident report status updated successfully',
      data: report
    });
  } catch (error) {
    console.error('Error updating incident report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update incident report',
      details: error.message
    });
  }
});

// Assign incident report to investigator
router.put('/:id/assign', auth, adminOnly, async (req, res) => {
  try {
    const { investigatorId } = req.body;
    
    const report = await IncidentReport.findById(req.params.id);
    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Incident report not found'
      });
    }

    await report.assignToInvestigator(investigatorId);
    report.updatedBy = req.user.id;
    await report.save();

    res.json({
      success: true,
      message: 'Incident report assigned successfully',
      data: report
    });
  } catch (error) {
    console.error('Error assigning incident report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to assign incident report',
      details: error.message
    });
  }
});

// Get incident report statistics
router.get('/stats/overview', auth, adminOnly, async (req, res) => {
  try {
    const stats = await IncidentReport.getStatistics();
    const result = stats[0] || {
      total: 0,
      pending: 0,
      underReview: 0,
      investigating: 0,
      resolved: 0,
      highRisk: 0,
      mediumRisk: 0,
      lowRisk: 0
    };

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching incident report statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics',
      details: error.message
    });
  }
});

// Search incident reports
router.get('/search/wallet', auth, async (req, res) => {
  try {
    const { walletAddress } = req.query;
    
    if (!walletAddress) {
      return res.status(400).json({
        success: false,
        error: 'Wallet address is required for search'
      });
    }

    const reports = await IncidentReport.find({
      walletAddress: { $regex: walletAddress, $options: 'i' }
    })
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({
      success: true,
      data: reports
    });
  } catch (error) {
    console.error('Error searching incident reports:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search incident reports',
      details: error.message
    });
  }
});

// Get recent incident reports for dashboard
router.get('/recent/list', async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    
    const reports = await IncidentReport.find()
      .select('walletAddress reason status priority fraudAnalysis.riskLevel createdAt')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: reports
    });
  } catch (error) {
    console.error('Error fetching recent incident reports:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recent incident reports',
      details: error.message
    });
  }
});

module.exports = router;
