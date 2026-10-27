const express = require('express');
const router = express.Router();
const Log = require('../models/Log');

// GET /api/events?limit=5
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 5) || 5;
    const safeLimit = Math.min(limit, 1000); // prevent abuse

    console.log(`🔍 Fetching last ${safeLimit} high-risk events`);

    const events = await Log.find({ type: 'high-risk-trigger' })
      .sort({ createdAt: -1 })
      .limit(safeLimit)
      .lean();

    res.json(events);
  } catch (err) {
    console.error('❌ Failed to fetch events:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
