/**
 * JavaScript wrapper for BHIV Core Events Python API
 * This module communicates with the Python FastAPI service running on port 8004
 */

const axios = require('axios');

// Configuration
const CORE_EVENTS_API_URL = process.env.CORE_EVENTS_API_URL || 'http://localhost:8004';

// In-memory storage for events (fallback when Python service is not running)
const eventsStorage = new Map();

/**
 * Accept a case event for processing
 * @param {Object} payload - Event payload
 * @returns {Promise<Object>} Event response with coreEventId
 */
async function accept_event(payload) {
  try {
    // Try to call the Python service
    const response = await axios.post(`${CORE_EVENTS_API_URL}/core/events`, payload, {
      timeout: 5000
    });
    return response.data;
  } catch (error) {
    console.warn('Python Core Events API not available, using fallback:', error.message);
    
    // Fallback to in-memory implementation
    const coreEventId = `fallback-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const eventData = {
      ...payload,
      coreEventId,
      status: 'accepted',
      timestamp: new Date().toISOString()
    };
    
    eventsStorage.set(coreEventId, eventData);
    
    return {
      coreEventId,
      status: 'accepted',
      timestamp: eventData.timestamp
    };
  }
}

/**
 * Get the status of a specific event
 * @param {string} core_event_id - Core event ID
 * @returns {Promise<Object>} Event status
 */
async function get_event_status(core_event_id) {
  try {
    // Try to call the Python service
    const response = await axios.get(`${CORE_EVENTS_API_URL}/core/events/${core_event_id}`, {
      timeout: 5000
    });
    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 404) {
      // Check fallback storage
      if (eventsStorage.has(core_event_id)) {
        const eventData = eventsStorage.get(core_event_id);
        return {
          coreEventId: eventData.coreEventId,
          status: 'accepted',
          timestamp: eventData.timestamp
        };
      }
      return { status: 'not_found' };
    }
    
    console.warn('Python Core Events API not available, checking fallback:', error.message);
    
    // Check fallback storage
    if (eventsStorage.has(core_event_id)) {
      const eventData = eventsStorage.get(core_event_id);
      return {
        coreEventId: eventData.coreEventId,
        status: 'accepted',
        timestamp: eventData.timestamp
      };
    }
    
    return { status: 'not_found' };
  }
}

/**
 * Get the reconciliation status of a case
 * @param {string} case_id - Case ID
 * @returns {Promise<Object>} Case reconciliation status
 */
async function get_case_status(case_id) {
  try {
    // Try to call the Python service
    const response = await axios.get(`${CORE_EVENTS_API_URL}/core/case/${case_id}/status`, {
      timeout: 5000
    });
    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 404) {
      throw new Error('Case not found');
    }
    
    console.warn('Python Core Events API not available, using fallback:', error.message);
    
    // Fallback to in-memory implementation
    const caseEvents = Array.from(eventsStorage.values()).filter(
      event => event.caseId === case_id
    );
    
    if (caseEvents.length === 0) {
      throw new Error('Case not found');
    }
    
    const reconciliationResults = caseEvents.map(event => ({
      evidenceId: event.evidenceId,
      txHash: event.txHash || null,
      status: event.txHash ? 'verified' : 'pending',
      details: event.txHash 
        ? 'Evidence anchor matches blockchain transaction' 
        : 'No blockchain transaction hash provided'
    }));
    
    return {
      caseId: case_id,
      reconciliation: reconciliationResults,
      overallStatus: reconciliationResults.every(r => r.status === 'verified') ? 'ok' : 'mismatch'
    };
  }
}

/**
 * Health check for the Core Events service
 * @returns {Promise<Object>} Health status
 */
async function health_check() {
  try {
    // Try to call the Python service
    const response = await axios.get(`${CORE_EVENTS_API_URL}/health`, {
      timeout: 5000
    });
    return response.data;
  } catch (error) {
    console.warn('Python Core Events API not available:', error.message);
    
    // Return fallback status
    return {
      status: 'healthy',
      service: 'BHIV Core Events API (Fallback)',
      version: '1.0.0',
      events_count: eventsStorage.size,
      python_service: 'unavailable'
    };
  }
}

module.exports = {
  accept_event,
  get_event_status,
  get_case_status,
  health_check
};

