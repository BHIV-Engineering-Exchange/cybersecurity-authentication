// Event Types Configuration
// Defines all system events that can be published to Kafka

const EVENT_TYPES = {
  // Evidence Events
  EVIDENCE_UPLOADED: 'evidence.uploaded',
  EVIDENCE_VERIFIED: 'evidence.verified',
  EVIDENCE_ANCHORED: 'evidence.anchored',
  EVIDENCE_DOWNLOADED: 'evidence.downloaded',
  EVIDENCE_DELETED: 'evidence.deleted',
  
  // Case Events
  CASE_CREATED: 'case.created',
  CASE_UPDATED: 'case.updated',
  CASE_ASSIGNED: 'case.assigned',
  CASE_ESCALATED: 'case.escalated',
  CASE_CLOSED: 'case.closed',
  
  // RL Events
  RL_PREDICTION_MADE: 'rl.prediction.made',
  RL_FEEDBACK_RECEIVED: 'rl.feedback.received',
  RL_MODEL_UPDATED: 'rl.model.updated',
  
  // User Events
  USER_LOGIN: 'user.login',
  USER_LOGOUT: 'user.logout',
  UNAUTHORIZED_ACCESS: 'user.unauthorized_access',
  
  // System Events
  SYSTEM_ALERT: 'system.alert',
  SYSTEM_ERROR: 'system.error'
};

const EVENT_PRIORITIES = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

/**
 * Create standardized event payload
 * @param {string} eventType - Event type from EVENT_TYPES
 * @param {Object} data - Event data
 * @param {Object} metadata - Additional metadata
 * @returns {Object} - Standardized event
 */
function createEvent(eventType, data, metadata = {}) {
  return {
    eventId: generateEventId(),
    eventType,
    timestamp: new Date().toISOString(),
    priority: metadata.priority || EVENT_PRIORITIES.MEDIUM,
    data,
    metadata: {
      source: 'fraud-evidence-backend',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      ...metadata
    }
  };
}

/**
 * Generate unique event ID
 * @returns {string} - Unique event ID
 */
function generateEventId() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `evt_${timestamp}_${random}`;
}

/**
 * Validate event structure
 * @param {Object} event - Event to validate
 * @returns {boolean} - Whether event is valid
 */
function validateEvent(event) {
  if (!event || typeof event !== 'object') return false;
  if (!event.eventId) return false;
  if (!event.eventType) return false;
  if (!event.timestamp) return false;
  if (!event.data) return false;
  return true;
}

/**
 * Get event priority
 * @param {string} eventType - Event type
 * @returns {string} - Priority level
 */
function getEventPriority(eventType) {
  const criticalEvents = [
    EVENT_TYPES.EVIDENCE_DELETED,
    EVENT_TYPES.CASE_ESCALATED,
    EVENT_TYPES.SYSTEM_ALERT,
    EVENT_TYPES.UNAUTHORIZED_ACCESS
  ];
  
  const highEvents = [
    EVENT_TYPES.EVIDENCE_ANCHORED,
    EVENT_TYPES.RL_FEEDBACK_RECEIVED,
    EVENT_TYPES.CASE_CLOSED
  ];
  
  if (criticalEvents.includes(eventType)) return EVENT_PRIORITIES.CRITICAL;
  if (highEvents.includes(eventType)) return EVENT_PRIORITIES.HIGH;
  return EVENT_PRIORITIES.MEDIUM;
}

module.exports = {
  EVENT_TYPES,
  EVENT_PRIORITIES,
  createEvent,
  generateEventId,
  validateEvent,
  getEventPriority
};

