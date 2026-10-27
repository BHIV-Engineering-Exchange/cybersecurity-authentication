const express = require('express');
const router = express.Router();

// Import core events functionality
const { accept_event, get_event_status, get_case_status, health_check } = require('../core/events/core_events');

// Core Events API Routes
router.post('/events', async (req, res) => {
  try {
    const result = await accept_event(req.body);
    res.status(202).json(result);
  } catch (error) {
    console.error('Error accepting event:', error);
    res.status(500).json({ error: 'Failed to accept event', details: error.message });
  }
});

router.get('/events/:core_event_id', async (req, res) => {
  try {
    const result = await get_event_status(req.params.core_event_id);
    if (result.status === 'not_found') {
      return res.status(404).json(result);
    }
    res.json(result);
  } catch (error) {
    console.error('Error getting event status:', error);
    res.status(500).json({ error: 'Failed to get event status', details: error.message });
  }
});

router.get('/case/:case_id/status', async (req, res) => {
  try {
    const result = await get_case_status(req.params.case_id);
    res.json(result);
  } catch (error) {
    console.error('Error getting case status:', error);
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: 'Case not found' });
    }
    res.status(500).json({ error: 'Failed to get case status', details: error.message });
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