// Event Queue Routes - Admin endpoints for managing event queue
const express = require('express');
const router = express.Router();

// Import services
const { getQueueStats, clearQueue, publishEvent, EVENT_TYPES } = require('../services/eventPublisher');

// Import RBAC middleware
const { requirePermission } = require('../middleware/rbacMiddleware');

/**
 * GET /api/queue/stats
 * Get event queue statistics
 * 
 * Required Permission: view-logs
 * Allowed Roles: admin, superadmin
 */
router.get('/stats',
  requirePermission('view-logs'),
  async (req, res) => {
    try {
      const stats = getQueueStats();
      
      res.json({
        success: true,
        queue: stats,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('❌ Error getting queue stats:', error);
      res.status(500).json({
        error: true,
        code: 500,
        message: 'Failed to get queue statistics',
        timestamp: new Date().toISOString()
      });
    }
});

/**
 * POST /api/queue/clear
 * Clear event queue (admin only)
 * 
 * Required Permission: system-config
 * Allowed Roles: superadmin
 */
router.post('/clear',
  requirePermission('system-config'),
  async (req, res) => {
    try {
      const result = await clearQueue();
      
      // Publish system event
      publishEvent(EVENT_TYPES.SYSTEM_ALERT, {
        action: 'queue_cleared',
        clearedCount: result.clearedCount,
        clearedBy: req.user?.email || 'unknown'
      }, {
        userId: req.user?.email,
        priority: 'critical'
      }).catch(err => console.warn('Event publish failed:', err.message));
      
      res.json({
        success: true,
        message: `Queue cleared successfully`,
        clearedCount: result.clearedCount,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('❌ Error clearing queue:', error);
      res.status(500).json({
        error: true,
        code: 500,
        message: 'Failed to clear queue',
        timestamp: new Date().toISOString()
      });
    }
});

/**
 * POST /api/queue/test-event
 * Publish a test event (for testing Kafka integration)
 * 
 * Required Permission: system-config
 * Allowed Roles: superadmin
 */
router.post('/test-event',
  requirePermission('system-config'),
  async (req, res) => {
    try {
      const { eventType, data } = req.body;
      
      const result = await publishEvent(
        eventType || EVENT_TYPES.SYSTEM_ALERT,
        data || { test: true, message: 'Test event' },
        {
          userId: req.user?.email,
          priority: 'low'
        }
      );
      
      res.json({
        success: true,
        message: 'Test event published',
        result,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('❌ Error publishing test event:', error);
      res.status(500).json({
        error: true,
        code: 500,
        message: 'Failed to publish test event',
        timestamp: new Date().toISOString()
      });
    }
});

module.exports = router;

