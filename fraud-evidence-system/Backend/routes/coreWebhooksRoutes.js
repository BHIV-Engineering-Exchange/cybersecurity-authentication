const express = require('express');
const router = express.Router();

// Import webhooks functionality
const { 
  handle_escalation_result, 
  handle_generic_callback, 
  get_monitoring_events, 
  log_monitoring_event, 
  replay_failed_event, 
  health_check 
} = require('../core/events/webhooks');

// Webhooks API Routes
router.post('/escalation-result', async (req, res) => {
  try {
    const result = await handle_escalation_result(req.body);
    res.json(result);
  } catch (error) {
    console.error('Error handling escalation result:', error);
    res.status(500).json({ error: 'Failed to process escalation result', details: error.message });
  }
});

router.post('/callbacks/:callback_type', async (req, res) => {
  try {
    const result = await handle_generic_callback(req.params.callback_type, req.body);
    res.json(result);
  } catch (error) {
    console.error('Error handling generic callback:', error);
    res.status(500).json({ error: 'Failed to process callback', details: error.message });
  }
});

router.get('/monitoring/events', async (req, res) => {
  try {
    const result = await get_monitoring_events(req.query.event_type);
    res.json(result);
  } catch (error) {
    console.error('Error getting monitoring events:', error);
    res.status(500).json({ error: 'Failed to get monitoring events', details: error.message });
  }
});

router.post('/monitoring/events', async (req, res) => {
  try {
    const result = await log_monitoring_event(req.body);
    res.json(result);
  } catch (error) {
    console.error('Error logging monitoring event:', error);
    res.status(500).json({ error: 'Failed to log monitoring event', details: error.message });
  }
});

router.post('/monitoring/replay/:event_id', async (req, res) => {
  try {
    const result = await replay_failed_event(req.params.event_id);
    res.json(result);
  } catch (error) {
    console.error('Error replaying failed event:', error);
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.status(500).json({ error: 'Failed to replay event', details: error.message });
  }
});

// Health check endpoint
router.get('/health', async (req, res) => {
  try {
    const result = await health_check();
    res.json(result);
  } catch (error) {
    console.error('Error in health check:', error);
    res.status(500).json({ error: 'Health check failed', details: error.message });
  }
});

module.exports = router;