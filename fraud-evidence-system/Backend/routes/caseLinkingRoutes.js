const express = require('express');
const router = express.Router();
const CaseLinkingService = require('../services/caseLinkingService');
const roleBasedAccess = require('../middleware/roleBasedAccess');

// GET /api/investigations - Get all investigations
router.get('/', roleBasedAccess.requirePermission('view_evidence'), async (req, res) => {
  try {
    const { entityType, limit = 20, skip = 0 } = req.query;
    const investigations = await CaseLinkingService.getAllInvestigations({
      entityType,
      limit: parseInt(limit),
      skip: parseInt(skip)
    });
    res.json(investigations);
  } catch (error) {
    console.error('Error fetching investigations:', error);
    res.status(500).json({ error: 'Failed to fetch investigations' });
  }
});

// POST /api/investigations/link - Create or update case linking
router.post('/link', roleBasedAccess.requirePermission('edit_evidence'), async (req, res) => {
  try {
    const { entities, metadata = {} } = req.body;
    
    if (!entities || !Array.isArray(entities) || entities.length === 0) {
      return res.status(400).json({ error: 'Entities array is required' });
    }

    const result = await CaseLinkingService.linkEntities(entities, metadata);
    res.json(result);
  } catch (error) {
    console.error('Error linking entities:', error);
    res.status(500).json({ error: 'Failed to link entities' });
  }
});

// GET /api/investigations/:id - Get specific investigation
router.get('/:id', roleBasedAccess.requirePermission('view_evidence'), async (req, res) => {
  try {
    const investigation = await CaseLinkingService.getInvestigationById(req.params.id);
    if (!investigation) {
      return res.status(404).json({ error: 'Investigation not found' });
    }
    res.json(investigation);
  } catch (error) {
    console.error('Error fetching investigation:', error);
    res.status(500).json({ error: 'Failed to fetch investigation' });
  }
});

// POST /api/investigations/:id/analyze - Analyze connections in investigation
router.post('/:id/analyze', roleBasedAccess.requirePermission('edit_evidence'), async (req, res) => {
  try {
    const analysis = await CaseLinkingService.analyzeConnections(req.params.id);
    res.json(analysis);
  } catch (error) {
    console.error('Error analyzing connections:', error);
    res.status(500).json({ error: 'Failed to analyze connections' });
  }
});

// PUT /api/investigations/:id - Update investigation
router.put('/:id', roleBasedAccess.requirePermission('edit_evidence'), async (req, res) => {
  try {
    const updates = req.body;
    const investigation = await CaseLinkingService.updateInvestigation(req.params.id, updates);
    if (!investigation) {
      return res.status(404).json({ error: 'Investigation not found' });
    }
    res.json(investigation);
  } catch (error) {
    console.error('Error updating investigation:', error);
    res.status(500).json({ error: 'Failed to update investigation' });
  }
});

// GET /api/investigations/:id/correlation-data - Get detailed correlation data for visualization
router.get('/:id/correlation-data', roleBasedAccess.requirePermission('view_evidence'), async (req, res) => {
  try {
    const investigation = await CaseLinkingService.getInvestigationById(req.params.id);
    if (!investigation) {
      return res.status(404).json({ error: 'Investigation not found' });
    }

    // Enrich with related evidence data
    const enrichedInvestigation = {
      ...investigation.toObject(),
      relatedEvidenceDetails: []
    };

    // Fetch detailed evidence information if related evidence exists
    if (investigation.relatedEvidence && investigation.relatedEvidence.length > 0) {
      const Evidence = require('../models/Evidence');
      const evidenceDetails = await Evidence.find({
        _id: { $in: investigation.relatedEvidence }
      }).select('filename fileType fileSize entity caseId riskLevel uploadedAt');
      
      enrichedInvestigation.relatedEvidenceDetails = evidenceDetails;
    }

    res.json(enrichedInvestigation);
  } catch (error) {
    console.error('Error fetching correlation data:', error);
    res.status(500).json({ error: 'Failed to fetch correlation data' });
  }
});

module.exports = router;