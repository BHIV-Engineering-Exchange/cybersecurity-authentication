const express = require('express');
const multer = require('multer');
const router = express.Router();
const Evidence = require('../models/Evidence');
const hybridStorageService = require('../services/hybridStorageService');
const evidenceContractService = require('../services/evidenceContractService');
const auth = require('../middleware/auth');
const adminOnly = require('../middleware/adminOnly');
const auditLogger = require('../middleware/auditLogger');
const {
  requirePermission,
  requireEvidenceLibraryAccess,
  requireEvidenceAccess,
  requireRole,
  requireAccessLevel,
  requireBulkOperationAccess,
  logAccess,
  filterEvidenceByAccess,
  addUserContext
} = require('../middleware/roleBasedAccess');
const { authorize, authorizeRole } = require('../middleware/authorize');

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit for ZIP files
  },
  fileFilter: (req, file, cb) => {
    // Accept any file type
    cb(null, true);
  }
});

// GET /api/evidence - List all evidence (investigators and admins only)
router.get('/', 
  auth, 
  authorize('read-evidence'),
  logAccess('evidence_library_view'),
  async (req, res) => {
  try {
    const { page = 1, limit = 10, caseId, entity, riskLevel, status } = req.query;
    const skip = (page - 1) * limit;
    
    // Build query filters
    let query = {};
    if (caseId) query.caseId = caseId;
    if (entity) query.entity = entity;
    if (riskLevel) query.riskLevel = riskLevel;
    if (status) query.verificationStatus = status;
    
    // Get evidence from database
    const evidence = await Evidence.find(query)
      .sort({ uploadedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('-fileContent'); // Exclude large file content
    
    const total = await Evidence.countDocuments(query);
    
    // Filter evidence based on user access level (if filterEvidenceByAccess is available)
    let filteredEvidence;
    try {
      filteredEvidence = typeof filterEvidenceByAccess === 'function' 
        ? filterEvidenceByAccess(req.user, evidence)
        : evidence;
    } catch (filterError) {
      console.log('Filter function not available, returning all evidence for admin');
      filteredEvidence = evidence;
    }
    
    res.json({
      success: true,
      evidence: filteredEvidence,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      count: filteredEvidence.length,
      userRole: req.user.role,
      permissions: req.user.permissions || []
    });
  } catch (error) {
    console.error('Error fetching evidence:', error);
    res.status(500).json({ error: 'Failed to fetch evidence: ' + error.message });
  }
});

// Upload evidence file
router.post('/upload', 
  auth, 
  authorize('upload'),
  logAccess('evidence_upload'),
  upload.single('evidenceFile'), 
  auditLogger, 
  async (req, res) => {
  try {
    const { caseId, entity, description, tags, riskLevel } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (!caseId || !entity) {
      return res.status(400).json({ error: 'Case ID and entity are required' });
    }

    // Store file in hybrid storage (cache + S3 + IPFS)
    const storageResult = await hybridStorageService.storeFile(file.buffer, file.originalname);
    if (!storageResult.success) {
      return res.status(500).json({ error: 'Failed to store file: ' + storageResult.error });
    }

    // Store evidence hash on blockchain
    const blockchainResult = await evidenceContractService.storeEvidenceHash({
      fileHash: storageResult.fileHash,
      ipfsHash: storageResult.ipfsHash,
      caseId,
      entity,
      uploadedBy: req.user?.email || 'anonymous'
    });

    if (!blockchainResult.success) {
      return res.status(500).json({ error: 'Failed to store on blockchain: ' + blockchainResult.error });
    }

    // Save evidence record to database with hybrid storage info
    const evidence = new Evidence({
      caseId,
      wallet: entity,
      reporter: req.user?.email || 'anonymous',
      filename: `${Date.now()}_${file.originalname}`,
      originalFilename: file.originalname,
      filePath: `/local/cache/${file.originalname}`,
      fileSize: file.size,
      fileType: file.mimetype,
      fileHash: storageResult.fileHash,
      
      // Hybrid storage fields
      storageHash: storageResult.storageHash,
      ipfsHash: storageResult.ipfsHash,
      s3Key: storageResult.storage.s3?.s3Key,
      s3Url: storageResult.storage.s3?.s3Url,
      
      // Storage redundancy tracking
      storageLocations: {
        cache: storageResult.storage.cache?.success || false,
        s3: storageResult.storage.s3?.success || false,
        ipfs: storageResult.storage.ipfs?.success || false
      },
      redundancyCount: storageResult.redundancy,
      
      // Blockchain fields
      blockchainTxHash: blockchainResult.txHash,
      blockNumber: blockchainResult.blockNumber,
      contractAddress: blockchainResult.contractAddress,
      
      // Case management
      riskLevel: riskLevel || 'medium',
      uploadedBy: req.user?.email || 'anonymous',
      verificationStatus: 'verified',
      integrityStatus: 'intact',
      lastVerified: new Date(),
      
      description,
      tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
    });

    await evidence.save();

    res.status(201).json({
      message: 'Evidence uploaded successfully',
      evidence: {
        id: evidence._id,
        caseId: evidence.caseId,
        entity: evidence.entity,
        filename: evidence.originalFilename,
        fileHash: evidence.fileHash,
        storageHash: evidence.storageHash,
        ipfsHash: evidence.ipfsHash,
        blockchainTxHash: evidence.blockchainTxHash,
        blockNumber: evidence.blockNumber,
        uploadedAt: evidence.uploadedAt,
        verificationStatus: evidence.verificationStatus,
        redundancyCount: evidence.redundancyCount,
        storageLocations: evidence.storageLocations
      },
      blockchain: {
        txHash: blockchainResult.txHash,
        blockNumber: blockchainResult.blockNumber,
        contractAddress: blockchainResult.contractAddress
      },
      storage: {
        redundancy: storageResult.redundancy,
        locations: storageResult.storage
      }
    });

  } catch (error) {
    console.error('Error uploading evidence:', error);
    res.status(500).json({ error: 'Failed to upload evidence: ' + error.message });
  }
});

// Get evidence by case ID (investigators and admins only)
router.get('/case/:caseId', 
  auth, 
  authorize('read-evidence'),
  logAccess('evidence_view_by_case'),
  async (req, res) => {
  try {
    const { caseId } = req.params;
    
    const evidence = await Evidence.find({ caseId }).sort({ uploadedAt: -1 });
    
    // Filter evidence based on user access level
    const filteredEvidence = filterEvidenceByAccess(req.currentUser, evidence);
    
    res.json({
      success: true,
      evidence: filteredEvidence,
      count: filteredEvidence.length,
      totalFound: evidence.length,
      filtered: evidence.length - filteredEvidence.length,
      userAccessLevel: req.currentUser.accessLevel
    });
  } catch (error) {
    console.error('Error fetching evidence:', error);
    res.status(500).json({ error: 'Failed to fetch evidence' });
  }
});

// Get specific evidence by ID
router.get('/:evidenceId', 
  auth, 
  authorize('read-evidence'),
  logAccess('evidence_view_specific'),
  async (req, res) => {
  try {
    const { evidenceId } = req.params;
    
    // Validate ObjectId format
    if (!evidenceId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }

    const evidence = await Evidence.findById(evidenceId);
    
    if (!evidence) {
      return res.status(404).json({ error: 'Evidence not found' });
    }

    res.json({
      success: true,
      evidence
    });
  } catch (error) {
    console.error('Error fetching specific evidence:', error);
    res.status(500).json({ error: true, code: 500, message: 'Failed to fetch evidence' });
  }
});

// Get evidence by entity (investigators and admins only)
router.get('/entity/:entity', 
  auth, 
  requireRole(['investigator', 'admin', 'superadmin']),
  requireEvidenceLibraryAccess,
  logAccess('evidence_view_by_entity'),
  async (req, res) => {
  try {
    const { entity } = req.params;
    
    const evidence = await Evidence.find({ entity }).sort({ uploadedAt: -1 });
    
    // Filter evidence based on user access level
    const filteredEvidence = filterEvidenceByAccess(req.currentUser, evidence);
    
    res.json({
      success: true,
      evidence: filteredEvidence,
      count: filteredEvidence.length,
      totalFound: evidence.length,
      filtered: evidence.length - filteredEvidence.length,
      userAccessLevel: req.currentUser.accessLevel
    });
  } catch (error) {
    console.error('Error fetching evidence by entity:', error);
    res.status(500).json({ error: 'Failed to fetch evidence' });
  }
});

// Download evidence file (investigators and admins only)
router.get('/download/:evidenceId', 
  auth, 
  authorize('download'),
  logAccess('evidence_download'),
  async (req, res) => {
  try {
    const { evidenceId } = req.params;
    
    const evidence = await Evidence.findById(evidenceId);
    if (!evidence) {
      return res.status(404).json({ error: 'Evidence not found' });
    }

    // Check if user can access this specific evidence
    if (!req.currentUser.canAccessEvidence(evidence)) {
      return res.status(403).json({ 
        error: 'Access denied to this evidence',
        reason: 'Evidence access level exceeds user permissions',
        evidenceRiskLevel: evidence.riskLevel,
        userAccessLevel: req.currentUser.accessLevel
      });
    }

    // Retrieve file from hybrid storage (cache -> S3 -> IPFS)
    const fileResult = await hybridStorageService.retrieveFile(evidence.storageHash, evidence.ipfsHash);
    if (!fileResult.success) {
      return res.status(404).json({ error: 'File not found in storage' });
    }

    // Verify file integrity across all storage layers
    const verifyResult = await hybridStorageService.verifyFileIntegrity(
      evidence.storageHash, 
      evidence.fileHash, 
      evidence.ipfsHash
    );
    
    if (!verifyResult.overallIntegrity) {
      return res.status(400).json({ 
        error: 'File integrity verification failed',
        verification: verifyResult
      });
    }

    res.set({
      'Content-Type': evidence.fileType,
      'Content-Disposition': `attachment; filename="${evidence.originalFilename}"`,
      'Content-Length': evidence.fileSize
    });

    res.send(fileResult.fileBuffer);

  } catch (error) {
    console.error('Error downloading evidence:', error);
    res.status(500).json({ error: 'Failed to download evidence' });
  }
});

// Verify evidence integrity (investigators and admins only)
router.post('/verify/:evidenceId', 
  auth, 
  authorize('verify'),
  logAccess('evidence_verification'),
  async (req, res) => {
  try {
    const { evidenceId } = req.params;
    
    const evidence = await Evidence.findById(evidenceId);
    if (!evidence) {
      return res.status(404).json({ error: 'Evidence not found' });
    }

    // Verify file integrity across all storage layers
    const hybridVerify = await hybridStorageService.verifyFileIntegrity(
      evidence.storageHash, 
      evidence.fileHash, 
      evidence.ipfsHash
    );
    
    // Verify blockchain integrity
    const blockchainVerify = await evidenceContractService.verifyEvidenceIntegrity(
      evidence.fileHash, 
      evidence.blockchainTxHash
    );

    // Update evidence verification status
    const overallStatus = hybridVerify.overallIntegrity && blockchainVerify.isValid ? 'verified' : 'failed';
    
    await Evidence.findByIdAndUpdate(evidenceId, {
      lastVerified: new Date(),
      integrityStatus: hybridVerify.overallIntegrity ? 'intact' : 'corrupted',
      verificationStatus: overallStatus
    });

    res.json({
      success: true,
      verification: {
        evidenceId: evidence._id,
        storageIntegrity: hybridVerify,
        blockchainIntegrity: blockchainVerify,
        overallStatus,
        redundancyCount: hybridVerify.redundancyCount,
        verifiedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error verifying evidence:', error);
    res.status(500).json({ error: 'Failed to verify evidence' });
  }
});

// Get evidence trail for visualization (investigators and admins only)
router.get('/trail/:caseId', 
  auth, 
  requireRole(['investigator', 'admin', 'superadmin']),
  requireEvidenceLibraryAccess,
  logAccess('evidence_trail_view'),
  async (req, res) => {
  try {
    const { caseId } = req.params;
    const { entity } = req.query; // Optional entity filter
    
    const trailResult = await evidenceContractService.getEvidenceTrail(caseId, entity);
    
    if (!trailResult.success) {
      return res.status(404).json({ error: trailResult.error });
    }

    res.json({
      success: true,
      trail: trailResult.trail,
      caseId: trailResult.caseId,
      entity: trailResult.entity,
      summary: trailResult.summary,
      metadata: {
        generatedAt: new Date().toISOString(),
        totalEvents: trailResult.trail.length,
        hasComprehensiveData: !!trailResult.comprehensiveData
      }
    });

  } catch (error) {
    console.error('Error fetching evidence trail:', error);
    res.status(500).json({ error: 'Failed to fetch evidence trail' });
  }
});

// Get comprehensive timeline for entity (investigators and admins only)
router.get('/timeline/:entity', 
  auth, 
  requireRole(['investigator', 'admin', 'superadmin']),
  requireEvidenceLibraryAccess,
  logAccess('evidence_timeline_view'),
  async (req, res) => {
  try {
    const { entity } = req.params;
    const { caseId } = req.query; // Optional case filter
    
    const chainOfCustodyService = require('../services/chainOfCustodyService');
    const timelineResult = await chainOfCustodyService.generateTimeline(caseId, entity);
    
    if (!timelineResult.success) {
      return res.status(404).json({ error: timelineResult.error });
    }

    res.json({
      success: true,
      timeline: timelineResult.timeline,
      summary: timelineResult.summary,
      entity,
      caseId,
      metadata: {
        generatedAt: new Date().toISOString(),
        totalEvents: timelineResult.timeline.length
      }
    });

  } catch (error) {
    console.error('Error fetching comprehensive timeline:', error);
    res.status(500).json({ error: 'Failed to fetch timeline' });
  }
});

// Get linked evidence trail for multiple entities (investigators and admins only)
router.post('/linked-trail', 
  auth, 
  requireRole(['investigator', 'admin', 'superadmin']),
  requireEvidenceLibraryAccess,
  logAccess('evidence_linked_trail_view'),
  async (req, res) => {
  try {
    const { entities, investigationId } = req.body;
    
    if (!entities || !Array.isArray(entities) || entities.length === 0) {
      return res.status(400).json({ error: 'Entities array is required' });
    }
    
    const linkedResult = await evidenceContractService.getLinkedEvidenceTrail(entities, investigationId);
    
    if (!linkedResult.success) {
      return res.status(404).json({ error: linkedResult.error });
    }

    res.json({
      success: true,
      trail: linkedResult.trail,
      entities: linkedResult.entities,
      investigationId: linkedResult.investigationId,
      summary: linkedResult.summary,
      metadata: {
        generatedAt: new Date().toISOString(),
        totalEvents: linkedResult.trail.length,
        entitiesCount: entities.length
      }
    });

  } catch (error) {
    console.error('Error fetching linked evidence trail:', error);
    res.status(500).json({ error: 'Failed to fetch linked trail' });
  }
});

// Export timeline in different formats (investigators and admins only)
router.get('/timeline/:entity/export', 
  auth, 
  authorize('export'),
  logAccess('evidence_timeline_export'),
  async (req, res) => {
  try {
    const { entity } = req.params;
    const { format = 'json', caseId } = req.query;
    
    const chainOfCustodyService = require('../services/chainOfCustodyService');
    const exportResult = await chainOfCustodyService.exportTimeline(caseId, entity, format);
    
    if (!exportResult.success) {
      return res.status(404).json({ error: exportResult.error });
    }

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${exportResult.filename}"`);
      res.send(exportResult.content);
    } else {
      res.json(exportResult);
    }

  } catch (error) {
    console.error('Error exporting timeline:', error);
    res.status(500).json({ error: 'Failed to export timeline' });
  }
});

// Share evidence with other users (investigators and admins only)
router.post('/share/:evidenceId', 
  auth, 
  authorize('share'),
  logAccess('evidence_share'),
  async (req, res) => {
  try {
    const { evidenceId } = req.params;
    const { shareWithEmails, message, expiryHours = 24 } = req.body;
    
    if (!shareWithEmails || !Array.isArray(shareWithEmails) || shareWithEmails.length === 0) {
      return res.status(400).json({ error: 'shareWithEmails array is required' });
    }
    
    const evidence = await Evidence.findById(evidenceId);
    if (!evidence) {
      return res.status(404).json({ error: 'Evidence not found' });
    }

    // Check if user can access this specific evidence
    if (!req.currentUser.canAccessEvidence(evidence)) {
      return res.status(403).json({ 
        error: 'Access denied to this evidence',
        reason: 'Evidence access level exceeds user permissions',
        evidenceRiskLevel: evidence.riskLevel,
        userAccessLevel: req.currentUser.accessLevel
      });
    }
    
    // Generate secure share token
    const crypto = require('crypto');
    const shareToken = crypto.randomBytes(32).toString('hex');
    const expiryDate = new Date(Date.now() + (expiryHours * 60 * 60 * 1000));
    
    // Create share record (you might want to create a separate EvidenceShare model)
    const shareRecord = {
      evidenceId: evidence._id,
      sharedBy: req.currentUser._id,
      sharedWith: shareWithEmails,
      shareToken,
      message: message || 'Evidence shared for investigation',
      expiryDate,
      accessCount: 0,
      maxAccess: 10, // Limit access count
      createdAt: new Date(),
      isActive: true
    };
    
    // In a real implementation, you'd save this to a database
    // For now, we'll just return the share information
    
    // Send notification emails (implement email service)
    // await emailService.sendEvidenceShareNotification(shareWithEmails, shareRecord);
    
    res.json({
      success: true,
      message: 'Evidence shared successfully',
      share: {
        evidenceId: evidence._id,
        filename: evidence.originalFilename,
        sharedWith: shareWithEmails,
        shareToken, // In production, don't return the full token
        shareUrl: `${process.env.FRONTEND_URL}/shared-evidence/${shareToken}`,
        expiryDate,
        maxAccess: shareRecord.maxAccess,
        sharedBy: req.currentUser.email
      }
    });
    
  } catch (error) {
    console.error('Error sharing evidence:', error);
    res.status(500).json({ error: 'Failed to share evidence' });
  }
});

// ADMIN ROUTES
// Get all evidence (admin only)
router.get('/admin/all', 
  auth, 
  requireRole(['admin', 'superadmin']),
  logAccess('admin_evidence_view_all'),
  async (req, res) => {
  try {
    const { page = 1, limit = 20, sort = 'uploadedAt', order = 'desc', riskLevel, verificationStatus } = req.query;
    
    const sortObj = {};
    sortObj[sort] = order === 'asc' ? 1 : -1;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Build filter query
    const filter = {};
    if (riskLevel) filter.riskLevel = riskLevel;
    if (verificationStatus) filter.verificationStatus = verificationStatus;
    
    const evidence = await Evidence.find(filter)
      .sort(sortObj)
      .skip(skip)
      .limit(parseInt(limit));
    
    // Filter evidence based on user access level (even admins have some restrictions)
    const filteredEvidence = req.currentUser.role === 'superadmin' ? 
      evidence : 
      filterEvidenceByAccess(req.currentUser, evidence);
    
    const total = await Evidence.countDocuments(filter);
    const totalPages = Math.ceil(total / parseInt(limit));
    
    res.json({
      success: true,
      evidence: filteredEvidence,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages
      },
      filters: { riskLevel, verificationStatus },
      userRole: req.currentUser.role,
      accessRestrictions: req.currentUser.role !== 'superadmin'
    });
  } catch (error) {
    console.error('Error fetching all evidence:', error);
    res.status(500).json({ error: 'Failed to fetch evidence' });
  }
});

// Get evidence statistics (admin only)
router.get('/admin/stats', auth, adminOnly, async (req, res) => {
  try {
    const totalEvidence = await Evidence.countDocuments({});
    const verifiedEvidence = await Evidence.countDocuments({ verificationStatus: 'verified' });
    const pendingEvidence = await Evidence.countDocuments({ verificationStatus: 'pending' });
    const failedEvidence = await Evidence.countDocuments({ verificationStatus: 'failed' });
    
    // Risk level distribution
    const riskStats = await Evidence.aggregate([
      {
        $group: {
          _id: '$riskLevel',
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Cases with evidence count
    const caseStats = await Evidence.aggregate([
      {
        $group: {
          _id: '$caseId',
          evidenceCount: { $sum: 1 },
          latestUpload: { $max: '$uploadedAt' }
        }
      },
      {
        $sort: { latestUpload: -1 }
      },
      {
        $limit: 10
      }
    ]);
    
    // Get blockchain stats
    const blockchainStats = await evidenceContractService.getBlockchainStats();
    
    // Get storage stats
    const storageStats = await hybridStorageService.getStorageStats();
    
    res.json({
      success: true,
      stats: {
        total: totalEvidence,
        verified: verifiedEvidence,
        pending: pendingEvidence,
        failed: failedEvidence,
        riskDistribution: riskStats,
        topCases: caseStats,
        blockchain: blockchainStats.success ? blockchainStats.stats : null,
        storage: storageStats
      }
    });
  } catch (error) {
    console.error('Error fetching evidence statistics:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Delete evidence (superadmin only)
router.delete('/admin/:evidenceId', 
  auth, 
  authorize('delete'),
  logAccess('admin_evidence_delete'),
  auditLogger, 
  async (req, res) => {
  try {
    const { evidenceId } = req.params;
    
    const evidence = await Evidence.findById(evidenceId);
    if (!evidence) {
      return res.status(404).json({ error: 'Evidence not found' });
    }
    
    // Log deletion for audit
    console.log(`Evidence deletion requested by ${req.currentUser.email} for evidence ${evidenceId}`);
    
    await Evidence.findByIdAndDelete(evidenceId);
    
    res.json({
      success: true,
      message: 'Evidence deleted successfully',
      deletedEvidence: {
        id: evidence._id,
        filename: evidence.originalFilename,
        caseId: evidence.caseId,
        entity: evidence.entity
      },
      deletedBy: req.currentUser.email
    });
  } catch (error) {
    console.error('Error deleting evidence:', error);
    res.status(500).json({ error: 'Failed to delete evidence' });
  }
});

// Bulk update evidence status (admin only)
router.post('/admin/bulk-update', 
  auth, 
  requireBulkOperationAccess,
  logAccess('admin_bulk_update'),
  auditLogger, 
  async (req, res) => {
  try {
    const { evidenceIds, updates } = req.body;
    
    if (!evidenceIds || !Array.isArray(evidenceIds) || evidenceIds.length === 0) {
      return res.status(400).json({ error: 'Evidence IDs array is required' });
    }
    
    // Validate updates object
    const allowedUpdates = ['verificationStatus', 'riskLevel', 'tags', 'description'];
    const updateKeys = Object.keys(updates);
    const invalidKeys = updateKeys.filter(key => !allowedUpdates.includes(key));
    
    if (invalidKeys.length > 0) {
      return res.status(400).json({ 
        error: 'Invalid update fields',
        invalidFields: invalidKeys,
        allowedFields: allowedUpdates
      });
    }
    
    // Add audit fields
    updates.lastModifiedBy = req.currentUser.email;
    updates.lastModifiedAt = new Date();
    
    const result = await Evidence.updateMany(
      { _id: { $in: evidenceIds } },
      { $set: updates }
    );
    
    res.json({
      success: true,
      message: `Updated ${result.modifiedCount} evidence records`,
      modifiedCount: result.modifiedCount,
      requestedCount: evidenceIds.length,
      updates,
      modifiedBy: req.currentUser.email
    });
  } catch (error) {
    console.error('Error bulk updating evidence:', error);
    res.status(500).json({ error: 'Failed to update evidence' });
  }
});

// Get storage health and cleanup (admin only)
router.get('/admin/storage-health', auth, adminOnly, async (req, res) => {
  try {
    const storageStats = await hybridStorageService.getStorageStats();
    
    // Check integrity of recent evidence
    const recentEvidence = await Evidence.find({})
      .sort({ uploadedAt: -1 })
      .limit(10);
      
    const integrityChecks = [];
    for (const evidence of recentEvidence) {
      const integrity = await hybridStorageService.verifyFileIntegrity(
        evidence.storageHash,
        evidence.fileHash,
        evidence.ipfsHash
      );
      integrityChecks.push({
        evidenceId: evidence._id,
        caseId: evidence.caseId,
        integrity: integrity.overallIntegrity,
        redundancy: integrity.redundancyCount,
        verification: integrity.verification
      });
    }
    
    res.json({
      success: true,
      storage: storageStats,
      recentIntegrityChecks: integrityChecks,
      summary: {
        intactFiles: integrityChecks.filter(c => c.integrity).length,
        totalChecked: integrityChecks.length,
        averageRedundancy: integrityChecks.length > 0 ? 
          integrityChecks.reduce((sum, c) => sum + c.redundancy, 0) / integrityChecks.length : 0
      }
    });
  } catch (error) {
    console.error('Error checking storage health:', error);
    res.status(500).json({ error: 'Failed to check storage health' });
  }
});

// Cleanup old cache files (admin only)
router.post('/admin/cleanup-cache', auth, adminOnly, async (req, res) => {
  try {
    const { maxAgeHours = 168 } = req.body; // Default: 1 week
    
    const result = await hybridStorageService.cleanupCache(maxAgeHours);
    
    res.json({
      success: true,
      message: `Cache cleanup completed`,
      cleanedFiles: result.cleanedFiles,
      maxAge: `${maxAgeHours} hours`
    });
  } catch (error) {
    console.error('Error cleaning up cache:', error);
    res.status(500).json({ error: 'Failed to cleanup cache' });
  }
});

module.exports = router;