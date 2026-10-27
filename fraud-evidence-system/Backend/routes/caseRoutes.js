// routes/caseRoutes.js
const express = require('express');
const multer = require('multer');
const router = express.Router();
const Case = require('../models/Case');
const Evidence = require('../models/Evidence');
const Investigation = require('../models/Investigation');
const EscalationLog = require('../models/EscalationLog');
const auth = require('../middleware/auth');
const { requirePermission, requireRole } = require('../middleware/roleBasedAccess');
const { authorize, authorizeRole } = require('../middleware/authorize');
const hybridStorageService = require('../services/hybridStorageService');
const chainOfCustodyService = require('../services/chainOfCustodyService');
const reportGenerationService = require('../services/reportGenerationService');
const caseLinkingService = require('../services/caseLinkingService');
const evidenceContractService = require('../services/evidenceContractService');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => cb(null, true)
});

// POST /cases/ - Create new case
router.post('/', auth, authorize('create'), async (req, res) => {
  try {
    const { title, description, priority, category, entities = [], indicators = [] } = req.body;
    
    if (!title) {
      return res.status(400).json({ error: 'Case title is required' });
    }

    // Create new case
    const caseData = {
      title,
      description,
      priority: priority || 'medium',
      category: category || 'investigation',
      createdBy: req.user.email,
      lastUpdatedBy: req.user.email,
      entities: entities.map(entity => ({
        ...entity,
        addedBy: req.user.email,
        addedAt: new Date()
      })),
      indicators: indicators.map(indicator => ({
        ...indicator,
        addedBy: req.user.email,
        addedAt: new Date()
      })),
      auditTrail: [{
        action: 'created',
        timestamp: new Date(),
        performedBy: req.user.email,
        details: { initialData: { title, description, priority, category } },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      }]
    };

    const newCase = new Case(caseData);
    await newCase.save();

    res.status(201).json({
      success: true,
      case: {
        id: newCase._id,
        caseId: newCase.caseId,
        title: newCase.title,
        description: newCase.description,
        status: newCase.status,
        priority: newCase.priority,
        category: newCase.category,
        createdAt: newCase.createdAt,
        createdBy: newCase.createdBy,
        entities: newCase.entities,
        indicators: newCase.indicators
      }
    });

  } catch (error) {
    console.error('Error creating case:', error);
    res.status(500).json({ error: 'Failed to create case: ' + error.message });
  }
});

// GET /cases/ - List all cases
router.get('/', auth, authorize('view'), async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      priority, 
      category, 
      assignedTo,
      createdBy,
      search 
    } = req.query;
    
    const skip = (page - 1) * limit;
    let query = {};
    
    // Build query filters
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (category) query.category = category;
    if (assignedTo) query.assignedTo = assignedTo;
    if (createdBy) query.createdBy = createdBy;
    
    // Search across title, description, and entities
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { 'entities.value': { $regex: search, $options: 'i' } },
        { 'indicators.value': { $regex: search, $options: 'i' } }
      ];
    }
    
    const cases = await Case.find(query)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('-auditTrail -customFields'); // Exclude large fields for list view
    
    const total = await Case.countDocuments(query);
    
    res.json({
      success: true,
      cases,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching cases:', error);
    res.status(500).json({ error: 'Failed to fetch cases: ' + error.message });
  }
});

// GET /cases/{id} - Get specific case
router.get('/:id', auth, authorize('view'), async (req, res) => {
  try {
    const caseRecord = await Case.findOne({
      $or: [{ _id: req.params.id }, { caseId: req.params.id }]
    });
    
    if (!caseRecord) {
      return res.status(404).json({ error: 'Case not found' });
    }
    
    // Get related evidence count
    const evidenceCount = await Evidence.countDocuments({ caseId: caseRecord.caseId });
    caseRecord.evidenceCount = evidenceCount;
    
    res.json({
      success: true,
      case: caseRecord
    });

  } catch (error) {
    console.error('Error fetching case:', error);
    res.status(500).json({ error: 'Failed to fetch case: ' + error.message });
  }
});

// PUT /cases/{id} - Update case
router.put('/:id', auth, authorize('update'), async (req, res) => {
  try {
    const { title, description, status, priority, assignedTo, tags } = req.body;
    
    const caseRecord = await Case.findOne({
      $or: [{ _id: req.params.id }, { caseId: req.params.id }]
    });
    
    if (!caseRecord) {
      return res.status(404).json({ error: 'Case not found' });
    }
    
    // Track changes for audit
    const changes = {};
    if (title && title !== caseRecord.title) changes.title = { old: caseRecord.title, new: title };
    if (description && description !== caseRecord.description) changes.description = { old: caseRecord.description, new: description };
    if (status && status !== caseRecord.status) changes.status = { old: caseRecord.status, new: status };
    if (priority && priority !== caseRecord.priority) changes.priority = { old: caseRecord.priority, new: priority };
    if (assignedTo && assignedTo !== caseRecord.assignedTo) changes.assignedTo = { old: caseRecord.assignedTo, new: assignedTo };
    
    // Update fields
    if (title) caseRecord.title = title;
    if (description) caseRecord.description = description;
    if (status) caseRecord.status = status;
    if (priority) caseRecord.priority = priority;
    if (assignedTo) caseRecord.assignedTo = assignedTo;
    if (tags) caseRecord.tags = tags;
    
    caseRecord.lastUpdatedBy = req.user.email;
    caseRecord.updatedAt = new Date();
    
    // Add audit trail
    caseRecord.auditTrail.push({
      action: 'updated',
      timestamp: new Date(),
      performedBy: req.user.email,
      details: { changes },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    await caseRecord.save();
    
    res.json({
      success: true,
      case: caseRecord,
      changes: Object.keys(changes)
    });

  } catch (error) {
    console.error('Error updating case:', error);
    res.status(500).json({ error: 'Failed to update case: ' + error.message });
  }
});

// POST /cases/{id}/evidence - Upload evidence to specific case
router.post('/:id/evidence', 
  auth, 
  authorize('upload'), 
  upload.single('evidenceFile'), 
  async (req, res) => {
  try {
    const caseRecord = await Case.findOne({
      $or: [{ _id: req.params.id }, { caseId: req.params.id }]
    });
    
    if (!caseRecord) {
      return res.status(404).json({ error: 'Case not found' });
    }
    
    const { entity, description, tags, riskLevel } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (!entity) {
      return res.status(400).json({ error: 'Entity is required' });
    }

    // Store file in hybrid storage
    const storageResult = await hybridStorageService.storeFile(file.buffer, file.originalname);
    if (!storageResult.success) {
      return res.status(500).json({ error: 'Failed to store file: ' + storageResult.error });
    }

    // Store evidence hash on blockchain
    const blockchainResult = await evidenceContractService.storeEvidenceHash({
      fileHash: storageResult.fileHash,
      ipfsHash: storageResult.ipfsHash,
      caseId: caseRecord.caseId,
      entity,
      uploadedBy: req.user.email
    });

    // Save evidence record
    const evidence = new Evidence({
      caseId: caseRecord.caseId,
      entity,
      filename: `${Date.now()}_${file.originalname}`,
      originalFilename: file.originalname,
      fileSize: file.size,
      fileType: file.mimetype,
      fileHash: storageResult.fileHash,
      storageHash: storageResult.storageHash,
      ipfsHash: storageResult.ipfsHash,
      s3Key: storageResult.storage.s3?.s3Key,
      s3Url: storageResult.storage.s3?.s3Url,
      storageLocations: {
        cache: storageResult.storage.cache?.success || false,
        s3: storageResult.storage.s3?.success || false,
        ipfs: storageResult.storage.ipfs?.success || false
      },
      redundancyCount: storageResult.redundancy,
      blockchainTxHash: blockchainResult.txHash,
      blockNumber: blockchainResult.blockNumber,
      contractAddress: blockchainResult.contractAddress,
      riskLevel: riskLevel || 'medium',
      uploadedBy: req.user.email,
      verificationStatus: 'verified',
      integrityStatus: 'intact',
      lastVerified: new Date(),
      description,
      tags: tags ? tags.split(',').map(tag => tag.trim()) : []
    });

    await evidence.save();
    
    // Update case evidence count and timestamp
    caseRecord.evidenceCount = (caseRecord.evidenceCount || 0) + 1;
    caseRecord.lastEvidenceUpload = new Date();
    caseRecord.lastUpdatedBy = req.user.email;
    
    // Add audit trail
    caseRecord.auditTrail.push({
      action: 'updated',
      timestamp: new Date(),
      performedBy: req.user.email,
      details: {
        action: 'evidence_added',
        evidenceId: evidence._id,
        filename: file.originalname,
        entity
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    await caseRecord.save();

    res.status(201).json({
      success: true,
      message: 'Evidence uploaded successfully',
      evidence: {
        id: evidence._id,
        filename: evidence.originalFilename,
        fileHash: evidence.fileHash,
        storageHash: evidence.storageHash,
        ipfsHash: evidence.ipfsHash,
        uploadedAt: evidence.uploadedAt,
        redundancyCount: evidence.redundancyCount,
        storageLocations: evidence.storageLocations
      },
      case: {
        id: caseRecord._id,
        caseId: caseRecord.caseId,
        evidenceCount: caseRecord.evidenceCount
      }
    });

  } catch (error) {
    console.error('Error uploading evidence:', error);
    res.status(500).json({ error: 'Failed to upload evidence: ' + error.message });
  }
});

// GET /cases/{id}/evidence - Get evidence for specific case
router.get('/:id/evidence', auth, authorize('read-evidence'), async (req, res) => {
  try {
    const caseRecord = await Case.findOne({
      $or: [{ _id: req.params.id }, { caseId: req.params.id }]
    });
    
    if (!caseRecord) {
      return res.status(404).json({ error: 'Case not found' });
    }
    
    const { page = 1, limit = 20, entity, riskLevel, status } = req.query;
    const skip = (page - 1) * limit;
    
    let query = { caseId: caseRecord.caseId };
    if (entity) query.entity = entity;
    if (riskLevel) query.riskLevel = riskLevel;
    if (status) query.verificationStatus = status;
    
    const evidence = await Evidence.find(query)
      .sort({ uploadedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('-fileContent');
    
    const total = await Evidence.countDocuments(query);
    
    res.json({
      success: true,
      case: {
        id: caseRecord._id,
        caseId: caseRecord.caseId,
        title: caseRecord.title
      },
      evidence,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching case evidence:', error);
    res.status(500).json({ error: 'Failed to fetch case evidence: ' + error.message });
  }
});

// POST /evidence/{id}/export - Export evidence with signed package + custody event
router.post('/evidence/:evidenceId/export', 
  auth, 
  authorize('export'), 
  async (req, res) => {
  try {
    const evidence = await Evidence.findById(req.params.evidenceId);
    
    if (!evidence) {
      return res.status(404).json({ error: 'Evidence not found' });
    }
    
    // Get the case for audit trail
    const caseRecord = await Case.findOne({ caseId: evidence.caseId });
    
    // Create signed export package
    const exportData = {
      evidence: {
        id: evidence._id,
        caseId: evidence.caseId,
        filename: evidence.originalFilename,
        fileHash: evidence.fileHash,
        ipfsHash: evidence.ipfsHash,
        blockchainTxHash: evidence.blockchainTxHash,
        uploadedAt: evidence.uploadedAt,
        uploadedBy: evidence.uploadedBy
      },
      exportedAt: new Date(),
      exportedBy: req.user.email,
      signature: crypto.createHash('sha256')
        .update(`${evidence._id}${evidence.fileHash}${req.user.email}${Date.now()}`)
        .digest('hex')
    };
    
    // Create custody event
    const custodyEvent = {
      type: 'evidence_exported',
      timestamp: new Date(),
      caseId: evidence.caseId,
      entity: evidence.entity,
      data: {
        evidenceId: evidence._id,
        exportedBy: req.user.email,
        signature: exportData.signature,
        ipAddress: req.ip
      },
      description: `Evidence exported: ${evidence.originalFilename}`,
      icon: '📤',
      priority: 'medium'
    };
    
    // Update case audit trail if case exists
    if (caseRecord) {
      caseRecord.auditTrail.push({
        action: 'updated',
        timestamp: new Date(),
        performedBy: req.user.email,
        details: {
          action: 'evidence_exported',
          evidenceId: evidence._id,
          signature: exportData.signature
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
      await caseRecord.save();
    }
    
    res.json({
      success: true,
      export: exportData,
      custodyEvent,
      message: 'Evidence exported successfully with signed package'
    });

  } catch (error) {
    console.error('Error exporting evidence:', error);
    res.status(500).json({ error: 'Failed to export evidence: ' + error.message });
  }
});

// POST /cases/{id}/escalate - Escalate case + custody event
router.post('/:id/escalate', auth, authorize('escalate'), async (req, res) => {
  try {
    const caseRecord = await Case.findOne({
      $or: [{ _id: req.params.id }, { caseId: req.params.id }]
    });
    
    if (!caseRecord) {
      return res.status(404).json({ error: 'Case not found' });
    }
    
    const { level, reason, urgency = 'normal' } = req.body;
    
    if (!level || !reason) {
      return res.status(400).json({ error: 'Escalation level and reason are required' });
    }
    
    // Add escalation to case
    const escalationData = {
      level,
      reason,
      urgency,
      escalatedAt: new Date(),
      escalatedBy: req.user.email,
      status: 'pending'
    };
    
    caseRecord.escalationHistory.push(escalationData);
    
    // Update case status
    const oldStatus = caseRecord.status;
    caseRecord.status = 'escalated';
    caseRecord.lastUpdatedBy = req.user.email;
    
    // Add audit trail
    caseRecord.auditTrail.push({
      action: 'escalated',
      timestamp: new Date(),
      performedBy: req.user.email,
      details: {
        level,
        reason,
        urgency,
        oldStatus
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    await caseRecord.save();
    
    // Create escalation log entry for external systems
    const escalationLog = new EscalationLog({
      entity: caseRecord.entities.length > 0 ? caseRecord.entities[0].value : 'N/A',
      caseId: caseRecord.caseId,
      trigger: 'manual',
      riskScore: caseRecord.riskScore || 50,
      createdAt: new Date(),
      escalationLevel: level,
      reason,
      escalatedBy: req.user.email
    });
    
    await escalationLog.save();
    
    // Create custody event
    const custodyEvent = {
      type: 'case_escalated',
      timestamp: new Date(),
      caseId: caseRecord.caseId,
      data: {
        level,
        reason,
        urgency,
        escalatedBy: req.user.email,
        oldStatus,
        newStatus: 'escalated'
      },
      description: `Case escalated to ${level}: ${reason}`,
      icon: '🚨',
      priority: urgency === 'urgent' ? 'high' : 'medium'
    };
    
    res.json({
      success: true,
      case: {
        id: caseRecord._id,
        caseId: caseRecord.caseId,
        status: caseRecord.status,
        escalationHistory: caseRecord.escalationHistory
      },
      escalation: escalationData,
      custodyEvent,
      message: `Case escalated to ${level} successfully`
    });

  } catch (error) {
    console.error('Error escalating case:', error);
    res.status(500).json({ error: 'Failed to escalate case: ' + error.message });
  }
});

// GET /cases/{id}/custody - Get timeline (auto-enriched)
router.get('/:id/custody', auth, authorize('read-evidence'), async (req, res) => {
  try {
    const caseRecord = await Case.findOne({
      $or: [{ _id: req.params.id }, { caseId: req.params.id }]
    });
    
    if (!caseRecord) {
      return res.status(404).json({ error: 'Case not found' });
    }
    
    // Generate comprehensive timeline using existing service
    const timelineResult = await chainOfCustodyService.generateTimeline(caseRecord.caseId);
    
    if (!timelineResult.success) {
      return res.status(500).json({ error: 'Failed to generate timeline: ' + timelineResult.error });
    }
    
    res.json({
      success: true,
      case: {
        id: caseRecord._id,
        caseId: caseRecord.caseId,
        title: caseRecord.title,
        status: caseRecord.status
      },
      timeline: timelineResult.timeline,
      summary: timelineResult.summary,
      enrichment: {
        ipResolution: timelineResult.ipResolution || {},
        riskAssessments: timelineResult.riskAssessments || [],
        escalations: timelineResult.escalations || []
      }
    });

  } catch (error) {
    console.error('Error fetching case custody timeline:', error);
    res.status(500).json({ error: 'Failed to fetch custody timeline: ' + error.message });
  }
});

// POST /cases/{id}/report - Build PDF
router.post('/:id/report', auth, authorize('generate'), async (req, res) => {
  try {
    const caseRecord = await Case.findOne({
      $or: [{ _id: req.params.id }, { caseId: req.params.id }]
    });
    
    if (!caseRecord) {
      return res.status(404).json({ error: 'Case not found' });
    }
    
    const { 
      format = 'pdf', 
      includeEvidence = true, 
      includeTimeline = true, 
      includeRiskEvolution = true, 
      includeEscalations = true 
    } = req.body;
    
    // Generate report using existing service
    const reportResult = await reportGenerationService.generateCaseReport(caseRecord.caseId, {
      format,
      includeEvidence,
      includeTimeline,
      includeRiskEvolution,
      includeEscalations
    });
    
    if (!reportResult.success) {
      return res.status(500).json({ error: 'Failed to generate report: ' + reportResult.error });
    }
    
    // Update case with report generation info
    caseRecord.reportsGenerated.push({
      reportType: 'case_summary',
      generatedAt: new Date(),
      generatedBy: req.user.email,
      filePath: reportResult.filePath,
      filename: reportResult.filename,
      format
    });
    
    // Add audit trail
    caseRecord.auditTrail.push({
      action: 'report_generated',
      timestamp: new Date(),
      performedBy: req.user.email,
      details: {
        reportType: 'case_summary',
        format,
        filename: reportResult.filename,
        options: { includeEvidence, includeTimeline, includeRiskEvolution, includeEscalations }
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    await caseRecord.save();
    
    if (format === 'pdf') {
      // Send PDF file
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${reportResult.filename}"`);
      
      const fileStream = fs.createReadStream(reportResult.filePath);
      fileStream.pipe(res);
      
      // Clean up file after sending (optional)
      fileStream.on('end', () => {
        setTimeout(() => {
          try {
            if (fs.existsSync(reportResult.filePath)) {
              fs.unlinkSync(reportResult.filePath);
            }
          } catch (cleanupError) {
            console.warn('Could not clean up PDF file:', cleanupError.message);
          }
        }, 5000); // 5 second delay
      });
    } else {
      res.json({
        success: true,
        report: {
          format,
          content: reportResult.content,
          generatedAt: new Date(),
          generatedBy: req.user.email
        },
        case: {
          id: caseRecord._id,
          caseId: caseRecord.caseId,
          reportsCount: caseRecord.reportsGenerated.length
        }
      });
    }

  } catch (error) {
    console.error('Error generating case report:', error);
    res.status(500).json({ error: 'Failed to generate report: ' + error.message });
  }
});

// POST /cases/{id}/indicators - Add wallets, IPs, emails...
router.post('/:id/indicators', auth, authorize('update'), async (req, res) => {
  try {
    const caseRecord = await Case.findOne({
      $or: [{ _id: req.params.id }, { caseId: req.params.id }]
    });
    
    if (!caseRecord) {
      return res.status(404).json({ error: 'Case not found' });
    }
    
    const { indicators } = req.body;
    
    if (!indicators || !Array.isArray(indicators)) {
      return res.status(400).json({ error: 'Indicators array is required' });
    }
    
    const addedIndicators = [];
    const duplicateIndicators = [];
    
    // Process each indicator
    for (const indicatorData of indicators) {
      const { type, value, confidence = 0.8, source, tags = [], notes } = indicatorData;
      
      if (!type || !value) {
        continue; // Skip invalid indicators
      }
      
      // Check for duplicates
      const existingIndicator = caseRecord.indicators.find(
        ind => ind.type === type && ind.value === value
      );
      
      if (existingIndicator) {
        duplicateIndicators.push({ type, value });
        continue;
      }
      
      // Add new indicator
      const newIndicator = {
        type,
        value,
        confidence,
        source,
        tags,
        notes,
        addedAt: new Date(),
        addedBy: req.user.email
      };
      
      caseRecord.indicators.push(newIndicator);
      addedIndicators.push(newIndicator);
    }
    
    // Also add as entities if appropriate
    const entityTypes = ['wallet', 'ip', 'email', 'domain'];
    for (const indicator of addedIndicators) {
      if (entityTypes.includes(indicator.type)) {
        const entityType = indicator.type === 'wallet' ? 'wallet_address' : 
                          indicator.type === 'ip' ? 'ip_address' : 
                          indicator.type === 'email' ? 'email' : 
                          indicator.type === 'domain' ? 'domain' : 'other';
        
        const existingEntity = caseRecord.entities.find(
          ent => ent.type === entityType && ent.value === indicator.value
        );
        
        if (!existingEntity) {
          caseRecord.entities.push({
            type: entityType,
            value: indicator.value,
            confidence: indicator.confidence,
            addedAt: new Date(),
            addedBy: req.user.email,
            metadata: { addedFromIndicator: true }
          });
        }
      }
    }
    
    caseRecord.lastUpdatedBy = req.user.email;
    
    // Add audit trail
    caseRecord.auditTrail.push({
      action: 'updated',
      timestamp: new Date(),
      performedBy: req.user.email,
      details: {
        action: 'indicators_added',
        addedCount: addedIndicators.length,
        duplicateCount: duplicateIndicators.length,
        indicators: addedIndicators.map(ind => ({ type: ind.type, value: ind.value }))
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    await caseRecord.save();
    
    res.json({
      success: true,
      case: {
        id: caseRecord._id,
        caseId: caseRecord.caseId,
        indicatorsCount: caseRecord.indicators.length,
        entitiesCount: caseRecord.entities.length
      },
      results: {
        added: addedIndicators,
        duplicates: duplicateIndicators,
        totalAdded: addedIndicators.length,
        totalDuplicates: duplicateIndicators.length
      },
      message: `Added ${addedIndicators.length} indicators, ${duplicateIndicators.length} duplicates skipped`
    });

  } catch (error) {
    console.error('Error adding indicators to case:', error);
    res.status(500).json({ error: 'Failed to add indicators: ' + error.message });
  }
});

// GET /investigations/{id} - Combined view (existing functionality)
router.get('/investigations/:id', auth, authorize('read-evidence'), async (req, res) => {
  try {
    // Use existing case linking service
    const investigation = await caseLinkingService.getInvestigationById(req.params.id);
    
    if (!investigation) {
      return res.status(404).json({ error: 'Investigation not found' });
    }
    
    // Get related cases
    const relatedCases = await Case.find({
      investigationId: req.params.id
    }).select('caseId title status priority createdAt evidenceCount');
    
    res.json({
      success: true,
      investigation: {
        ...investigation,
        relatedCases: relatedCases,
        caseCount: relatedCases.length
      }
    });

  } catch (error) {
    console.error('Error fetching investigation:', error);
    res.status(500).json({ error: 'Failed to fetch investigation: ' + error.message });
  }
});

module.exports = router;