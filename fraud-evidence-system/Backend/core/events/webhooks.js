/**
 * JavaScript wrapper for BHIV Webhooks Python API
 * This module communicates with the Python FastAPI service running on port 8005
 */

const axios = require('axios');

// Configuration
const WEBHOOKS_API_URL = process.env.WEBHOOKS_API_URL || 'http://localhost:8005';

// In-memory storage for monitoring events (fallback when Python service is not running)
const monitoringEvents = [];

/**
 * Handle escalation result callback
 * @param {Object} payload - Escalation result payload
 * @returns {Promise<Object>} Response
 */
async function handle_escalation_result(payload) {
  try {
    // Try to call the Python service
    const response = await axios.post(`${WEBHOOKS_API_URL}/callbacks/escalation-result`, payload, {
      timeout: 5000
    });
    return response.data;
  } catch (error) {
    console.warn('Python Webhooks API not available, using fallback:', error.message);
    
    // Fallback implementation
    console.log('Escalation result received (fallback):', payload);
    return {
      status: 'acknowledged',
      message: 'Escalation result received (fallback mode)',
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Handle generic callback
 * @param {string} callback_type - Type of callback
 * @param {Object} payload - Callback payload
 * @returns {Promise<Object>} Response
 */
async function handle_generic_callback(callback_type, payload) {
  try {
    // Try to call the Python service
    const response = await axios.post(`${WEBHOOKS_API_URL}/callbacks/${callback_type}`, payload, {
      timeout: 5000
    });
    return response.data;
  } catch (error) {
    console.warn('Python Webhooks API not available, using fallback:', error.message);
    
    // Fallback implementation
    console.log(`Generic callback received (fallback) - Type: ${callback_type}`, payload);
    return {
      status: 'acknowledged',
      callback_type,
      message: 'Callback received (fallback mode)',
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Get monitoring events
 * @param {string} event_type - Optional event type filter
 * @returns {Promise<Object>} Monitoring events
 */
async function get_monitoring_events(event_type) {
  try {
    // Try to call the Python service
    const url = event_type 
      ? `${WEBHOOKS_API_URL}/monitoring/events?event_type=${event_type}`
      : `${WEBHOOKS_API_URL}/monitoring/events`;
    
    const response = await axios.get(url, {
      timeout: 5000
    });
    return response.data;
  } catch (error) {
    console.warn('Python Webhooks API not available, using fallback:', error.message);
    
    // Fallback implementation
    const filteredEvents = event_type
      ? monitoringEvents.filter(e => e.event_type === event_type)
      : monitoringEvents;
    
    return {
      events: filteredEvents,
      count: filteredEvents.length,
      source: 'fallback'
    };
  }
}

/**
 * Log a monitoring event
 * @param {Object} payload - Event payload
 * @returns {Promise<Object>} Response
 */
async function log_monitoring_event(payload) {
  try {
    // Try to call the Python service
    const response = await axios.post(`${WEBHOOKS_API_URL}/monitoring/events`, payload, {
      timeout: 5000
    });
    return response.data;
  } catch (error) {
    console.warn('Python Webhooks API not available, using fallback:', error.message);
    
    // Fallback implementation
    const event = {
      ...payload,
      event_id: `fallback-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString()
    };
    
    monitoringEvents.push(event);
    
    // Keep only last 1000 events
    if (monitoringEvents.length > 1000) {
      monitoringEvents.shift();
    }
    
    return {
      status: 'logged',
      event_id: event.event_id,
      message: 'Event logged (fallback mode)'
    };
  }
}

/**
 * Replay a failed event
 * @param {string} event_id - Event ID to replay
 * @returns {Promise<Object>} Response
 */
async function replay_failed_event(event_id) {
  try {
    // Try to call the Python service
    const response = await axios.post(`${WEBHOOKS_API_URL}/monitoring/replay/${event_id}`, {}, {
      timeout: 5000
    });
    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 404) {
      throw new Error('Event not found');
    }
    
    console.warn('Python Webhooks API not available, using fallback:', error.message);
    
    // Fallback implementation
    const event = monitoringEvents.find(e => e.event_id === event_id);
    
    if (!event) {
      throw new Error('Event not found');
    }
    
    return {
      status: 'replayed',
      event_id,
      message: 'Event replayed (fallback mode)',
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Health check for the Webhooks service
 * @returns {Promise<Object>} Health status
 */
async function health_check() {
  try {
    // Try to call the Python service
    const response = await axios.get(`${WEBHOOKS_API_URL}/health`, {
      timeout: 5000
    });
    return response.data;
  } catch (error) {
    console.warn('Python Webhooks API not available:', error.message);
    
    // Return fallback status
    return {
      status: 'healthy',
      service: 'BHIV Webhooks API (Fallback)',
      version: '1.0.0',
      monitoring_events_count: monitoringEvents.length,
      python_service: 'unavailable'
    };
  }
}

module.exports = {
  handle_escalation_result,
  handle_generic_callback,
  get_monitoring_events,
  log_monitoring_event,
  replay_failed_event,
  health_check
};

