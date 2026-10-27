// routes/escalation.js
const express = require('express');
const router = express.Router();
const { escalateIfNeeded } = require('../services/escalationService');

// POST /api/escalate
router.post('/', async (req, res) => {
  const { entity, riskScore, caseId } = req.body;

  if (!entity || typeof riskScore !== 'number' || !caseId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const result = await escalateIfNeeded(entity, riskScore, caseId, 'manual');
  res.json(result);
});

module.exports = router;
