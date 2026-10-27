// Audit Routes - Admin endpoints for audit log retrieval and management
const express = require('express');
const router = express.Router();

// Import services and models
const {
  getAuditLogs,
  getAuditTrail,
  getAuditStats,
  anchorAuditBatch,
  verifyAuditBatch
} = require('../services/auditService');
const AuditLog = require('../models/AuditLog');

// Import RBAC middleware
const { requirePermission } = require('../middleware/rbacMiddleware');

/**
 * GET /api/admin/audit
 * Get audit logs with filtering
 * 
 * Required Permission: view-logs
 * Allowed Roles: admin, superadmin
 * 
 * Query Parameters:
 * - userId: Filter by user
 * - action: Filter by action type
 * - resourceType: Filter by resource type (evidence, case, rl, etc.)
 * - resourceId: Filter by specific resource
 * - caseId: Filter by case ID
 * - evidenceId: Filter by evidence ID
 * - status: Filter by status (success/failure)
 * - severity: Filter by severity
 * - startDate: Filter by start date
 * - endDate: Filter by end date
 * - page: Page number
 * - limit: Items per page
 */
router.get('/',
  requirePermission('view-logs'),
  async (req, res) => {
    try {
      const filters = {
        userId: req.query.userId,
        action: req.query.action,
        resourceType: req.query.resourceType,
        resourceId: req.query.resourceId,
        caseId: req.query.caseId,
        evidenceId: req.query.evidenceId,
        status: req.query.status,
        severity: req.query.severity,
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 50
      };

      const result = await getAuditLogs(filters);

      if (!result.success) {
        return res.status(500).json({
          error: true,
          code: 500,
          message: 'Failed to retrieve audit logs',
          details: { error: result.error },
          timestamp: new Date().toISOString()
        });
      }

      res.json({
        success: true,
        auditLogs: result.logs,
        pagination: result.pagination,
        filters: {
          applied: Object.keys(filters).filter(k => filters[k] !== undefined && filters[k] !== null),
          values: filters
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Error retrieving audit logs:', error);
      res.status(500).json({
        error: true,
        code: 500,
        message: 'Failed to retrieve audit logs',
        timestamp: new Date().toISOString()
      });
    }
});

/**
 * GET /api/admin/audit/trail/:resourceType/:resourceId
 * Get complete audit trail for a specific resource
 * 
 * Required Permission: view-logs
 */
router.get('/trail/:resourceType/:resourceId',
  requirePermission('view-logs'),
  async (req, res) => {
    try {
      const { resourceType, resourceId } = req.params;

      const result = await getAuditTrail(resourceType, resourceId);

      if (!result.success) {
        return res.status(500).json({
          error: true,
          code: 500,
          message: 'Failed to retrieve audit trail',
          timestamp: new Date().toISOString()
        });
      }

      res.json({
        success: true,
        resourceType: result.resourceType,
        resourceId: result.resourceId,
        trail: result.trail,
        count: result.count,
        timeline: result.trail.map(log => ({
          timestamp: log.timestamp,
          action: log.action,
          userId: log.userId,
          status: log.status
        })),
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Error retrieving audit trail:', error);
      res.status(500).json({
        error: true,
        code: 500,
        message: 'Failed to retrieve audit trail',
        timestamp: new Date().toISOString()
      });
    }
});

/**
 * GET /api/admin/audit/stats
 * Get audit logging statistics
 * 
 * Required Permission: view-logs
 */
router.get('/stats',
  requirePermission('view-logs'),
  async (req, res) => {
    try {
      const result = await getAuditStats();

      if (!result.success) {
        return res.status(500).json({
          error: true,
          code: 500,
          message: 'Failed to retrieve audit statistics',
          timestamp: new Date().toISOString()
        });
      }

      res.json({
        success: true,
        stats: result.stats,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Error retrieving audit stats:', error);
      res.status(500).json({
        error: true,
        code: 500,
        message: 'Failed to retrieve audit statistics',
        timestamp: new Date().toISOString()
      });
    }
});

/**
 * GET /api/admin/audit/case/:caseId
 * Get all audit logs for a specific case
 * 
 * Required Permission: view-logs
 */
router.get('/case/:caseId',
  requirePermission('view-logs'),
  async (req, res) => {
    try {
      const { caseId } = req.params;

      const result = await getAuditLogs({ caseId });

      if (!result.success) {
        return res.status(500).json({
          error: true,
          code: 500,
          message: 'Failed to retrieve case audit logs',
          timestamp: new Date().toISOString()
        });
      }

      res.json({
        success: true,
        caseId,
        auditLogs: result.logs,
        count: result.logs.length,
        pagination: result.pagination,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Error retrieving case audit logs:', error);
      res.status(500).json({
        error: true,
        code: 500,
        message: 'Failed to retrieve case audit logs',
        timestamp: new Date().toISOString()
      });
    }
});

/**
 * GET /api/admin/audit/evidence/:evidenceId
 * Get all audit logs for a specific evidence
 * 
 * Required Permission: view-logs
 */
router.get('/evidence/:evidenceId',
  requirePermission('view-logs'),
  async (req, res) => {
    try {
      const { evidenceId } = req.params;

      const result = await getAuditLogs({ evidenceId });

      if (!result.success) {
        return res.status(500).json({
          error: true,
          code: 500,
          message: 'Failed to retrieve evidence audit logs',
          timestamp: new Date().toISOString()
        });
      }

      res.json({
        success: true,
        evidenceId,
        auditLogs: result.logs,
        count: result.logs.length,
        pagination: result.pagination,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Error retrieving evidence audit logs:', error);
      res.status(500).json({
        error: true,
        code: 500,
        message: 'Failed to retrieve evidence audit logs',
        timestamp: new Date().toISOString()
      });
    }
});

/**
 * POST /api/admin/audit/anchor
 * Manually trigger audit batch anchoring
 * 
 * Required Permission: system-config
 * Allowed Roles: superadmin
 */
router.post('/anchor',
  requirePermission('system-config'),
  async (req, res) => {
    try {
      const result = await anchorAuditBatch();

      if (!result.success) {
        return res.status(500).json({
          error: true,
          code: 500,
          message: 'Failed to anchor audit batch',
          details: { error: result.error },
          timestamp: new Date().toISOString()
        });
      }

      res.json({
        success: true,
        message: 'Audit batch anchored on blockchain',
        batch: {
          batchId: result.batchId,
          batchSize: result.batchSize,
          merkleRoot: result.merkleRoot,
          txHash: result.txHash,
          blockNumber: result.blockNumber
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Error anchoring audit batch:', error);
      res.status(500).json({
        error: true,
        code: 500,
        message: 'Failed to anchor audit batch',
        timestamp: new Date().toISOString()
      });
    }
});

/**
 * GET /api/admin/audit/verify/:batchId
 * Verify audit batch on blockchain
 * 
 * Required Permission: view-logs
 */
router.get('/verify/:batchId',
  requirePermission('view-logs'),
  async (req, res) => {
    try {
      const { batchId } = req.params;

      const result = await verifyAuditBatch(batchId);

      if (!result.success) {
        return res.status(404).json({
          error: true,
          code: 404,
          message: result.error || 'Batch not found',
          timestamp: new Date().toISOString()
        });
      }

      res.json({
        success: true,
        batchId: result.batchId,
        logsCount: result.logsCount,
        verification: result.verification,
        overallValid: result.overallValid,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Error verifying audit batch:', error);
      res.status(500).json({
        error: true,
        code: 500,
        message: 'Failed to verify audit batch',
        timestamp: new Date().toISOString()
      });
    }
});

/**
 * GET /api/admin/audit/critical
 * Get critical audit logs
 * 
 * Required Permission: view-logs
 */
router.get('/critical',
  requirePermission('view-logs'),
  async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 100;

      const logs = await AuditLog.getCriticalActions(limit);

      res.json({
        success: true,
        criticalLogs: logs,
        count: logs.length,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Error retrieving critical logs:', error);
      res.status(500).json({
        error: true,
        code: 500,
        message: 'Failed to retrieve critical audit logs',
        timestamp: new Date().toISOString()
      });
    }
});

/**
 * GET /api/admin/audit/failures
 * Get failed action audit logs
 * 
 * Required Permission: view-logs
 */
router.get('/failures',
  requirePermission('view-logs'),
  async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 100;

      const logs = await AuditLog.getFailures(limit);

      res.json({
        success: true,
        failedActions: logs,
        count: logs.length,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Error retrieving failed logs:', error);
      res.status(500).json({
        error: true,
        code: 500,
        message: 'Failed to retrieve failed action logs',
        timestamp: new Date().toISOString()
      });
    }
});

module.exports = router;

