// Audit Service
// Comprehensive audit logging with blockchain anchoring for critical actions

const AuditLog = require('../models/AuditLog');
const { mockBlockchainService } = require('./mockBlockchainService');
const crypto = require('crypto');

// Configuration
const BATCH_SIZE = parseInt(process.env.AUDIT_BATCH_SIZE) || 100;
const ANCHOR_INTERVAL = parseInt(process.env.AUDIT_ANCHOR_INTERVAL) || 3600000; // 1 hour
let anchorTimer = null;
let currentBatch = [];

/**
 * Log an audit entry
 * @param {Object} auditData - Audit log data
 * @returns {Promise<Object>} - Created audit log
 */
async function logAudit(auditData) {
  try {
    const {
      userId,
      userEmail,
      userRole,
      action,
      resourceType,
      resourceId,
      method,
      endpoint,
      ipAddress,
      userAgent,
      status,
      details,
      severity
    } = auditData;

    // Create audit log entry
    const auditLog = new AuditLog({
      userId: userId || 'system',
      userEmail: userEmail || null,
      userRole: userRole || 'unknown',
      action,
      resourceType,
      resourceId: resourceId || null,
      method: method || 'UNKNOWN',
      endpoint: endpoint || '',
      ipAddress: ipAddress || 'unknown',
      userAgent: userAgent || 'unknown',
      status: status || 'success',
      details: details || {},
      severity: severity || determineSeverity(action, status),
      timestamp: new Date()
    });

    await auditLog.save();

    console.log(`📋 Audit logged: ${action} by ${userEmail || userId} - ${status}`);

    // Add to current batch for blockchain anchoring
    if (shouldAnchor(action, status)) {
      currentBatch.push(auditLog._id.toString());
      
      // If batch is full, anchor immediately
      if (currentBatch.length >= BATCH_SIZE) {
        await anchorAuditBatch();
      }
    }

    return {
      success: true,
      auditLogId: auditLog._id,
      timestamp: auditLog.timestamp
    };

  } catch (error) {
    console.error('❌ Failed to log audit:', error);
    
    // Don't throw - audit logging failure should not break main flow
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Determine severity based on action and status
 * @param {string} action - Action performed
 * @param {string} status - Action status
 * @returns {string} - Severity level
 */
function determineSeverity(action, status) {
  // Critical actions
  const criticalActions = [
    'evidence_delete',
    'case_escalate',
    'user_delete',
    'system_config',
    'unauthorized_access'
  ];
  
  // High severity actions
  const highActions = [
    'evidence_anchor',
    'case_delete',
    'user_create',
    'rl_feedback'
  ];
  
  // Failures are always at least medium severity
  if (status === 'failure') {
    if (criticalActions.includes(action)) return 'critical';
    if (highActions.includes(action)) return 'high';
    return 'medium';
  }
  
  // Success cases
  if (criticalActions.includes(action)) return 'critical';
  if (highActions.includes(action)) return 'high';
  return 'medium';
}

/**
 * Determine if action should be anchored on blockchain
 * @param {string} action - Action performed
 * @param {string} status - Action status
 * @returns {boolean} - Whether to anchor
 */
function shouldAnchor(action, status) {
  // Only anchor successful critical actions
  if (status !== 'success') return false;
  
  const criticalActions = [
    'evidence_upload',
    'evidence_anchor',
    'evidence_delete',
    'case_escalate',
    'rl_feedback'
  ];
  
  return criticalActions.includes(action);
}

/**
 * Compute Merkle root of audit batch
 * @param {Array<string>} auditLogIds - Array of audit log IDs
 * @returns {Promise<string>} - Merkle root hash
 */
async function computeMerkleRoot(auditLogIds) {
  if (auditLogIds.length === 0) return null;
  
  // Get audit logs
  const auditLogs = await AuditLog.find({
    _id: { $in: auditLogIds }
  }).select('action resourceId userId timestamp');
  
  // Create hashes for each log
  const hashes = auditLogs.map(log => {
    const data = `${log.action}:${log.resourceId}:${log.userId}:${log.timestamp.getTime()}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  });
  
  // Simple Merkle root (combine all hashes)
  // In production, use proper Merkle tree implementation
  const combined = hashes.join('');
  const merkleRoot = crypto.createHash('sha256').update(combined).digest('hex');
  
  console.log(`🌳 Merkle root computed for ${auditLogIds.length} audit logs`);
  
  return merkleRoot;
}

/**
 * Anchor batch of audit logs on blockchain
 * @returns {Promise<Object>} - Anchoring result
 */
async function anchorAuditBatch() {
  if (currentBatch.length === 0) {
    console.log('📝 No audit logs to anchor');
    return { success: true, batchSize: 0 };
  }
  
  try {
    const batchId = `audit_batch_${Date.now()}`;
    const auditLogIds = [...currentBatch]; // Copy array
    currentBatch = []; // Clear batch
    
    console.log(`⛓️  Anchoring audit batch: ${batchId} (${auditLogIds.length} logs)`);
    
    // Compute Merkle root
    const merkleRoot = await computeMerkleRoot(auditLogIds);
    
    // Anchor on blockchain (mock)
    const anchorResult = await mockBlockchainService.anchorEvidence({
      evidenceId: batchId,
      fileHash: merkleRoot,
      caseId: 'AUDIT_BATCH',
      wallet: 'system',
      reporter: 'audit_service'
    });
    
    if (!anchorResult.success) {
      console.error('❌ Failed to anchor audit batch:', anchorResult.error);
      // Re-add to batch for retry
      currentBatch.push(...auditLogIds);
      return { success: false, error: anchorResult.error };
    }
    
    // Update audit logs with blockchain anchor info
    await AuditLog.updateMany(
      { _id: { $in: auditLogIds } },
      {
        $set: {
          'blockchainAnchor.txHash': anchorResult.transaction.txHash,
          'blockchainAnchor.blockNumber': anchorResult.transaction.blockNumber,
          'blockchainAnchor.batchId': batchId,
          'blockchainAnchor.anchoredAt': new Date(),
          'blockchainAnchor.merkleRoot': merkleRoot
        }
      }
    );
    
    console.log(`✅ Audit batch anchored: ${batchId}`, {
      txHash: anchorResult.transaction.txHash,
      blockNumber: anchorResult.transaction.blockNumber,
      logsCount: auditLogIds.length
    });
    
    return {
      success: true,
      batchId,
      batchSize: auditLogIds.length,
      merkleRoot,
      txHash: anchorResult.transaction.txHash,
      blockNumber: anchorResult.transaction.blockNumber
    };
    
  } catch (error) {
    console.error('❌ Error anchoring audit batch:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Start periodic audit batch anchoring
 */
function startPeriodicAnchoring() {
  if (anchorTimer) {
    return; // Already running
  }
  
  console.log(`⏰ Starting periodic audit anchoring (interval: ${ANCHOR_INTERVAL}ms)`);
  
  anchorTimer = setInterval(async () => {
    if (currentBatch.length > 0) {
      console.log(`🔄 Periodic audit anchor triggered (${currentBatch.length} logs pending)`);
      await anchorAuditBatch();
    }
  }, ANCHOR_INTERVAL);
}

/**
 * Stop periodic anchoring
 */
function stopPeriodicAnchoring() {
  if (anchorTimer) {
    clearInterval(anchorTimer);
    anchorTimer = null;
    console.log('⏸️  Periodic audit anchoring stopped');
  }
}

/**
 * Get audit statistics
 * @returns {Promise<Object>} - Audit statistics
 */
async function getAuditStats() {
  try {
    const totalLogs = await AuditLog.countDocuments();
    const successfulLogs = await AuditLog.countDocuments({ status: 'success' });
    const failedLogs = await AuditLog.countDocuments({ status: 'failure' });
    const anchoredLogs = await AuditLog.countDocuments({ 
      'blockchainAnchor.txHash': { $exists: true } 
    });
    
    // Get action distribution
    const actionDistribution = await AuditLog.aggregate([
      { $group: { _id: '$action', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    
    // Get severity distribution
    const severityDistribution = await AuditLog.aggregate([
      { $group: { _id: '$severity', count: { $sum: 1 } } }
    ]);
    
    // Get user activity
    const userActivity = await AuditLog.aggregate([
      { $group: { _id: '$userId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    
    return {
      success: true,
      stats: {
        total: totalLogs,
        successful: successfulLogs,
        failed: failedLogs,
        anchored: anchoredLogs,
        pendingAnchor: currentBatch.length,
        successRate: totalLogs > 0 ? (successfulLogs / totalLogs) : 0,
        anchorRate: totalLogs > 0 ? (anchoredLogs / totalLogs) : 0,
        actions: actionDistribution.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        severity: severityDistribution.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        topUsers: userActivity.map(u => ({ userId: u._id, actions: u.count }))
      }
    };
  } catch (error) {
    console.error('❌ Error getting audit stats:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Middleware to automatically log requests
 * @param {Object} options - Logging options
 * @returns {Function} - Express middleware
 */
function auditMiddleware(options = {}) {
  return async (req, res, next) => {
    const startTime = Date.now();
    
    // Capture original res.json to intercept response
    const originalJson = res.json.bind(res);
    
    res.json = function(body) {
      const duration = Date.now() - startTime;
      
      // Log audit after response
      setImmediate(async () => {
        await logAudit({
          userId: req.user?.id || req.user?.email || 'anonymous',
          userEmail: req.user?.email,
          userRole: req.user?.role || req.userRole || 'guest',
          action: options.action || extractActionFromPath(req.path, req.method),
          resourceType: options.resourceType || extractResourceType(req.path),
          resourceId: req.params.id || req.params.evidenceId || req.params.caseId || null,
          method: req.method,
          endpoint: req.originalUrl,
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.get('User-Agent'),
          status: res.statusCode < 400 ? 'success' : 'failure',
          details: {
            statusCode: res.statusCode,
            duration,
            body: options.includeBody ? sanitizeBody(req.body) : undefined,
            error: body.error ? body.message : undefined
          },
          severity: options.severity
        });
      });
      
      return originalJson(body);
    };
    
    next();
  };
}

/**
 * Extract action from request path and method
 * @param {string} path - Request path
 * @param {string} method - HTTP method
 * @returns {string} - Action name
 */
function extractActionFromPath(path, method) {
  if (path.includes('/upload')) return 'evidence_upload';
  if (path.includes('/anchor')) return 'evidence_anchor';
  if (path.includes('/verify')) return 'evidence_verify';
  if (path.includes('/download')) return 'evidence_download';
  if (path.includes('/predict')) return 'rl_predict';
  if (path.includes('/feedback')) return 'rl_feedback';
  if (path.includes('/escalate')) return 'case_escalate';
  
  // Default based on method
  const methodActions = {
    'POST': 'create',
    'PUT': 'update',
    'PATCH': 'update',
    'DELETE': 'delete',
    'GET': 'view'
  };
  
  return methodActions[method] || 'unknown';
}

/**
 * Extract resource type from path
 * @param {string} path - Request path
 * @returns {string} - Resource type
 */
function extractResourceType(path) {
  if (path.includes('/evidence')) return 'evidence';
  if (path.includes('/case')) return 'case';
  if (path.includes('/rl')) return 'rl';
  if (path.includes('/user')) return 'user';
  if (path.includes('/queue')) return 'queue';
  return 'system';
}

/**
 * Sanitize request body for logging
 * @param {Object} body - Request body
 * @returns {Object} - Sanitized body
 */
function sanitizeBody(body) {
  if (!body) return {};
  
  const sanitized = { ...body };
  
  // Remove sensitive fields
  delete sanitized.password;
  delete sanitized.token;
  delete sanitized.apiKey;
  delete sanitized.secret;
  
  // Truncate large fields
  if (sanitized.description && sanitized.description.length > 200) {
    sanitized.description = sanitized.description.substring(0, 200) + '...';
  }
  
  return sanitized;
}

/**
 * Get audit logs with filtering
 * @param {Object} filters - Filter criteria
 * @returns {Promise<Object>} - Audit logs
 */
async function getAuditLogs(filters = {}) {
  try {
    const {
      userId,
      action,
      resourceType,
      resourceId,
      caseId,
      evidenceId,
      status,
      severity,
      startDate,
      endDate,
      page = 1,
      limit = 50
    } = filters;
    
    // Build query
    const query = {};
    
    if (userId) query.userId = userId;
    if (action) query.action = action;
    if (resourceType) query.resourceType = resourceType;
    if (resourceId) query.resourceId = resourceId;
    if (status) query.status = status;
    if (severity) query.severity = severity;
    
    // Handle caseId and evidenceId (search in details)
    if (caseId) {
      query.$or = [
        { resourceId: caseId },
        { 'details.caseId': caseId }
      ];
    }
    
    if (evidenceId) {
      query.$or = [
        { resourceId: evidenceId },
        { 'details.evidenceId': evidenceId }
      ];
    }
    
    // Date range
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }
    
    // Pagination
    const skip = (page - 1) * limit;
    
    const logs = await AuditLog.find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();
    
    const total = await AuditLog.countDocuments(query);
    
    return {
      success: true,
      logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    };
    
  } catch (error) {
    console.error('❌ Error getting audit logs:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get audit trail for specific resource
 * @param {string} resourceType - Resource type
 * @param {string} resourceId - Resource ID
 * @returns {Promise<Array>} - Audit trail
 */
async function getAuditTrail(resourceType, resourceId) {
  try {
    const logs = await AuditLog.find({ resourceType, resourceId })
      .sort({ timestamp: 1 }) // Chronological order
      .lean();
    
    return {
      success: true,
      resourceType,
      resourceId,
      trail: logs,
      count: logs.length
    };
    
  } catch (error) {
    console.error('❌ Error getting audit trail:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Verify audit batch on blockchain
 * @param {string} batchId - Batch ID
 * @returns {Promise<Object>} - Verification result
 */
async function verifyAuditBatch(batchId) {
  try {
    // Get all logs in this batch
    const logs = await AuditLog.find({ 'blockchainAnchor.batchId': batchId });
    
    if (logs.length === 0) {
      return {
        success: false,
        error: 'Batch not found or not anchored'
      };
    }
    
    const firstLog = logs[0];
    const storedMerkleRoot = firstLog.blockchainAnchor.merkleRoot;
    const storedTxHash = firstLog.blockchainAnchor.txHash;
    
    // Recompute Merkle root
    const auditLogIds = logs.map(log => log._id.toString());
    const computedMerkleRoot = await computeMerkleRoot(auditLogIds);
    
    // Verify matches
    const merkleMatches = storedMerkleRoot === computedMerkleRoot;
    
    // Verify on blockchain
    const blockchainVerify = await mockBlockchainService.verifyEvidence({
      evidenceId: batchId,
      fileHash: storedMerkleRoot,
      txHash: storedTxHash
    });
    
    return {
      success: true,
      batchId,
      logsCount: logs.length,
      verification: {
        merkleMatches,
        blockchainValid: blockchainVerify.verification.isValid,
        storedMerkleRoot,
        computedMerkleRoot,
        txHash: storedTxHash,
        blockNumber: firstLog.blockchainAnchor.blockNumber
      },
      overallValid: merkleMatches && blockchainVerify.verification.isValid
    };
    
  } catch (error) {
    console.error('❌ Error verifying audit batch:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Graceful shutdown
 */
async function shutdown() {
  console.log('🛑 Shutting down audit service...');
  
  // Stop periodic anchoring
  stopPeriodicAnchoring();
  
  // Anchor remaining batch
  if (currentBatch.length > 0) {
    console.log(`📋 Anchoring final batch of ${currentBatch.length} audit logs...`);
    await anchorAuditBatch();
  }
  
  console.log('✅ Audit service shut down gracefully');
}

// Start periodic anchoring on module load
startPeriodicAnchoring();

// Graceful shutdown handlers
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

module.exports = {
  logAudit,
  auditMiddleware,
  getAuditLogs,
  getAuditTrail,
  getAuditStats,
  anchorAuditBatch,
  verifyAuditBatch,
  startPeriodicAnchoring,
  stopPeriodicAnchoring,
  shutdown
};
