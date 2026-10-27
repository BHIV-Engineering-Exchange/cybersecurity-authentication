const express = require('express');
const router = express.Router();
const CaseManager = require('../models/CaseManager');
const MLAnalysis = require('../models/MLAnalysis');
const User = require('../models/User');
const auth = require('../middleware/auth');
const adminOnly = require('../middleware/adminOnly');
const { requireRole } = require('../middleware/roleBasedAccess');

// GET /api/case-manager - Get cases based on user role
router.get('/', auth, async (req, res) => {
  try {
    const userRole = req.user.role;
    const userId = req.user.userId;
    const { page = 1, limit = 20, status, priority, investigatorId, riskLevel } = req.query;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    let query = {};
    let cases;
    
    if (userRole === 'admin' || userRole === 'superadmin') {
      // Admin can see all cases
      if (status) query.status = status;
      if (priority) query.priority = priority;
      if (investigatorId) query.investigatorId = investigatorId;
      if (riskLevel) query['analysisResults.riskLevel'] = riskLevel;
      
      cases = await CaseManager.find(query)
        .populate('investigatorId', 'name email role')
        .populate('assignedTo', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));
        
    } else if (userRole === 'investigator') {
      // Investigators can only see their own cases
      query.investigatorId = userId;
      if (status) query.status = status;
      if (priority) query.priority = priority;
      if (riskLevel) query['analysisResults.riskLevel'] = riskLevel;
      
      cases = await CaseManager.find(query)
        .populate('investigatorId', 'name email role')
        .populate('assignedTo', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));
    } else {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Admin or Investigator role required.'
      });
    }
    
    const total = await CaseManager.countDocuments(query);
    
    res.json({
      success: true,
      data: cases,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      },
      userRole,
      filters: { status, priority, investigatorId, riskLevel }
    });
    
  } catch (error) {
    console.error('Error fetching cases:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch cases',
      details: error.message
    });
  }
});

// GET /api/case-manager/stats - Get case statistics (admin only)
router.get('/stats', auth, adminOnly, async (req, res) => {
  try {
    const stats = await CaseManager.getCaseStatistics();
    const result = stats[0] || {
      totalCases: 0,
      newCases: 0,
      underInvestigation: 0,
      escalated: 0,
      resolved: 0,
      closed: 0,
      avgRiskScore: 0,
      highRiskCases: 0,
      criticalCases: 0
    };
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching case statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch case statistics',
      details: error.message
    });
  }
});

// GET /api/case-manager/:caseId - Get specific case
router.get('/:caseId', auth, async (req, res) => {
  try {
    const { caseId } = req.params;
    const userRole = req.user.role;
    const userId = req.user.userId;
    
    const caseData = await CaseManager.findOne({ caseId })
      .populate('investigatorId', 'name email role')
      .populate('assignedTo', 'name email')
      .populate('mlAnalysisId')
      .populate('incidentReportId');
    
    if (!caseData) {
      return res.status(404).json({
        success: false,
        error: 'Case not found'
      });
    }
    
    // Check if user can access this case
    if (userRole !== 'admin' && userRole !== 'superadmin' && 
        caseData.investigatorId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. You can only view your own cases.'
      });
    }
    
    res.json({
      success: true,
      data: caseData
    });
    
  } catch (error) {
    console.error('Error fetching case:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch case',
      details: error.message
    });
  }
});

// PUT /api/case-manager/:caseId - Update case (admin only for status changes)
router.put('/:caseId', auth, async (req, res) => {
  try {
    const { caseId } = req.params;
    const userRole = req.user.role;
    const userId = req.user.userId;
    const updates = req.body;
    
    const existingCase = await CaseManager.findOne({ caseId });
    if (!existingCase) {
      return res.status(404).json({
        success: false,
        error: 'Case not found'
      });
    }
    
    // Check permissions
    if (userRole !== 'admin' && userRole !== 'superadmin' && 
        existingCase.investigatorId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. You can only update your own cases.'
      });
    }
    
    // Restrict what investigators can update
    if (userRole === 'investigator') {
      const allowedUpdates = ['notes', 'tags'];
      const restrictedFields = Object.keys(updates).filter(key => !allowedUpdates.includes(key));
      if (restrictedFields.length > 0) {
        return res.status(403).json({
          success: false,
          error: `Investigators can only update: ${allowedUpdates.join(', ')}`
        });
      }
    }
    
    // Update the case
    const updatedCase = await CaseManager.findOneAndUpdate(
      { caseId },
      { ...updates, lastUpdated: new Date() },
      { new: true, runValidators: true }
    ).populate('investigatorId', 'name email role')
     .populate('assignedTo', 'name email');
    
    res.json({
      success: true,
      message: 'Case updated successfully',
      data: updatedCase
    });
    
  } catch (error) {
    console.error('Error updating case:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update case',
      details: error.message
    });
  }
});

// POST /api/case-manager/create-from-ml-analysis - Create case from ML analysis
router.post('/create-from-ml-analysis', auth, async (req, res) => {
  try {
    const { mlAnalysisId } = req.body;
    const userId = req.user.userId;
    const userRole = req.user.role;
    
    if (!mlAnalysisId) {
      return res.status(400).json({
        success: false,
        error: 'ML Analysis ID is required'
      });
    }
    
    // Get the ML analysis
    const mlAnalysis = await MLAnalysis.findById(mlAnalysisId)
      .populate('incidentReportId');
    
    if (!mlAnalysis) {
      return res.status(404).json({
        success: false,
        error: 'ML Analysis not found'
      });
    }
    
    // Check if user can create case from this analysis
    if (userRole !== 'admin' && userRole !== 'superadmin' && 
        mlAnalysis.createdBy.toString() !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. You can only create cases from your own analyses.'
      });
    }
    
    // Get user details
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Check if case already exists for this ML analysis
    const existingCase = await CaseManager.findOne({ mlAnalysisId });
    if (existingCase) {
      return res.status(409).json({
        success: false,
        error: 'Case already exists for this ML analysis',
        data: existingCase
      });
    }
    
    // Determine priority based on risk score
    let priority = 'Low';
    if (mlAnalysis.analysisResults.riskLevel === 'CRITICAL') priority = 'Critical';
    else if (mlAnalysis.analysisResults.riskLevel === 'HIGH') priority = 'High';
    else if (mlAnalysis.analysisResults.riskLevel === 'MEDIUM') priority = 'Medium';
    
    // Create new case
    const newCase = new CaseManager({
      walletAddress: mlAnalysis.walletAddress,
      riskScore: Math.round(mlAnalysis.analysisResults.fraudProbability * 100),
      status: 'New',
      investigatorId: userId,
      investigatorName: user.name || user.email,
      investigatorEmail: user.email,
      mlAnalysisId: mlAnalysisId,
      incidentReportId: mlAnalysis.incidentReportId,
      analysisResults: mlAnalysis.analysisResults,
      modelInfo: mlAnalysis.modelInfo,
      priority,
      tags: ['ML Analysis', mlAnalysis.analysisResults.riskLevel],
      createdBy: userId
    });
    
    await newCase.save();
    
    // Populate the response
    const populatedCase = await CaseManager.findById(newCase._id)
      .populate('investigatorId', 'name email role')
      .populate('mlAnalysisId')
      .populate('incidentReportId');
    
    res.status(201).json({
      success: true,
      message: 'Case created successfully from ML analysis',
      data: populatedCase
    });
    
  } catch (error) {
    console.error('Error creating case from ML analysis:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create case',
      details: error.message
    });
  }
});

// GET /api/case-manager/investigators/list - Get list of investigators (admin only)
router.get('/investigators/list', auth, adminOnly, async (req, res) => {
  try {
    const investigators = await User.find({ 
      role: 'investigator',
      isActive: true 
    }).select('name email role createdAt');
    
    res.json({
      success: true,
      data: investigators
    });
  } catch (error) {
    console.error('Error fetching investigators:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch investigators',
      details: error.message
    });
  }
});

module.exports = router;

