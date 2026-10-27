// routes/reportGenerationRoutes.js
const express = require('express');
const router = express.Router();
const reportGenerationService = require('../services/reportGenerationService');
const auth = require('../middleware/auth');
const adminOnly = require('../middleware/adminOnly');
const { requireRole, requirePermission, logAccess } = require('../middleware/roleBasedAccess');
const fs = require('fs');

// Generate case report (investigators and admins only)
router.post('/case/:caseId', 
  auth, 
  requireRole(['investigator', 'admin', 'superadmin']),
  requirePermission('reportGeneration'),
  logAccess('report_case_generation'),
  async (req, res) => {
  try {
    const { caseId } = req.params;
    const options = {
      format: req.body.format || 'pdf',
      includeEvidence: req.body.includeEvidence !== false,
      includeTimeline: req.body.includeTimeline !== false,
      includeRiskEvolution: req.body.includeRiskEvolution !== false,
      includeEscalations: req.body.includeEscalations !== false,
      watermark: req.body.watermark || false
    };

    const result = await reportGenerationService.generateCaseReport(caseId, options);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    if (result.format === 'pdf') {
      // Send PDF file
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      
      const fileStream = fs.createReadStream(result.filePath);
      fileStream.pipe(res);
      
      // Clean up file after sending
      fileStream.on('end', () => {
        setTimeout(() => {
          fs.unlink(result.filePath, (err) => {
            if (err) console.error('Error cleaning up PDF file:', err);
          });
        }, 5000);
      });
    } else {
      // Send HTML content
      res.setHeader('Content-Type', 'text/html');
      res.send(result.content);
    }

  } catch (error) {
    console.error('Error generating case report:', error);
    res.status(500).json({ error: 'Failed to generate case report' });
  }
});

// Generate entity report (investigators and admins only)
router.post('/entity/:entity', 
  auth, 
  requireRole(['investigator', 'admin', 'superadmin']),
  requirePermission('reportGeneration'),
  logAccess('report_entity_generation'),
  async (req, res) => {
  try {
    const { entity } = req.params;
    const options = {
      format: req.body.format || 'pdf',
      includeEvidence: req.body.includeEvidence !== false,
      includeTimeline: req.body.includeTimeline !== false,
      watermark: req.body.watermark || false
    };

    const result = await reportGenerationService.generateEntityReport(entity, options);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    if (result.format === 'pdf') {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      
      const fileStream = fs.createReadStream(result.filePath);
      fileStream.pipe(res);
      
      fileStream.on('end', () => {
        setTimeout(() => {
          fs.unlink(result.filePath, (err) => {
            if (err) console.error('Error cleaning up PDF file:', err);
          });
        }, 5000);
      });
    } else {
      res.setHeader('Content-Type', 'text/html');
      res.send(result.content);
    }

  } catch (error) {
    console.error('Error generating entity report:', error);
    res.status(500).json({ error: 'Failed to generate entity report' });
  }
});

// Generate linked investigation report (investigators and admins only)
router.post('/linked', 
  auth, 
  requireRole(['investigator', 'admin', 'superadmin']),
  requirePermission('reportGeneration'),
  logAccess('report_linked_generation'),
  async (req, res) => {
  try {
    const { entities, investigationId } = req.body;
    
    if (!entities || !Array.isArray(entities) || entities.length === 0) {
      return res.status(400).json({ error: 'Entities array is required' });
    }

    const options = {
      format: req.body.format || 'pdf',
      includeEvidence: req.body.includeEvidence !== false,
      includeTimeline: req.body.includeTimeline !== false,
      includeRiskEvolution: req.body.includeRiskEvolution !== false,
      includeEscalations: req.body.includeEscalations !== false,
      watermark: req.body.watermark || false
    };

    const result = await reportGenerationService.generateLinkedReport(entities, investigationId, options);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    if (result.format === 'pdf') {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      
      const fileStream = fs.createReadStream(result.filePath);
      fileStream.pipe(res);
      
      fileStream.on('end', () => {
        setTimeout(() => {
          fs.unlink(result.filePath, (err) => {
            if (err) console.error('Error cleaning up PDF file:', err);
          });
        }, 5000);
      });
    } else {
      res.setHeader('Content-Type', 'text/html');
      res.send(result.content);
    }

  } catch (error) {
    console.error('Error generating linked report:', error);
    res.status(500).json({ error: 'Failed to generate linked report' });
  }
});

// Get report preview (investigators and admins only)
router.get('/preview/case/:caseId', 
  auth, 
  requireRole(['investigator', 'admin', 'superadmin']),
  requirePermission('reportGeneration'),
  logAccess('report_case_preview'),
  async (req, res) => {
  try {
    const { caseId } = req.params;
    const options = {
      format: 'html',
      includeEvidence: true,
      includeTimeline: true,
      includeRiskEvolution: true,
      includeEscalations: true,
      watermark: false
    };

    const result = await reportGenerationService.generateCaseReport(caseId, options);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.setHeader('Content-Type', 'text/html');
    res.send(result.content);

  } catch (error) {
    console.error('Error generating report preview:', error);
    res.status(500).json({ error: 'Failed to generate report preview' });
  }
});

// Get entity report preview (investigators and admins only)
router.get('/preview/entity/:entity', 
  auth, 
  requireRole(['investigator', 'admin', 'superadmin']),
  requirePermission('reportGeneration'),
  logAccess('report_entity_preview'),
  async (req, res) => {
  try {
    const { entity } = req.params;
    const options = {
      format: 'html',
      includeEvidence: true,
      includeTimeline: true,
      watermark: false
    };

    const result = await reportGenerationService.generateEntityReport(entity, options);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.setHeader('Content-Type', 'text/html');
    res.send(result.content);

  } catch (error) {
    console.error('Error generating entity report preview:', error);
    res.status(500).json({ error: 'Failed to generate entity report preview' });
  }
});

// Get available report templates and options (admin only)
router.get('/templates', auth, adminOnly, async (req, res) => {
  try {
    res.json({
      success: true,
      templates: {
        case: {
          name: 'Case Investigation Report',
          description: 'Comprehensive report for a specific case ID',
          options: {
            format: ['pdf', 'html'],
            includeEvidence: 'boolean',
            includeTimeline: 'boolean',
            includeRiskEvolution: 'boolean',
            includeEscalations: 'boolean',
            watermark: 'boolean'
          }
        },
        entity: {
          name: 'Entity Investigation Report',
          description: 'Detailed analysis for a specific wallet/entity',
          options: {
            format: ['pdf', 'html'],
            includeEvidence: 'boolean',
            includeTimeline: 'boolean',
            watermark: 'boolean'
          }
        },
        linked: {
          name: 'Linked Investigation Report',
          description: 'Cross-entity analysis for related investigations',
          options: {
            format: ['pdf', 'html'],
            entities: 'array of wallet addresses',
            investigationId: 'string',
            includeEvidence: 'boolean',
            includeTimeline: 'boolean',
            includeRiskEvolution: 'boolean',
            includeEscalations: 'boolean',
            watermark: 'boolean'
          }
        }
      },
      usage: {
        case: 'POST /api/reports/case/:caseId',
        entity: 'POST /api/reports/entity/:entity',
        linked: 'POST /api/reports/linked',
        preview: 'GET /api/reports/preview/case/:caseId or /api/reports/preview/entity/:entity'
      }
    });
  } catch (error) {
    console.error('Error fetching report templates:', error);
    res.status(500).json({ error: 'Failed to fetch report templates' });
  }
});

// Bulk report generation (admin only)
router.post('/bulk', auth, adminOnly, async (req, res) => {
  try {
    const { reportType, targets, options = {} } = req.body;
    
    if (!reportType || !targets || !Array.isArray(targets)) {
      return res.status(400).json({ error: 'reportType and targets array are required' });
    }

    const results = [];
    const errors = [];

    for (const target of targets) {
      try {
        let result;
        switch (reportType) {
          case 'case':
            result = await reportGenerationService.generateCaseReport(target, options);
            break;
          case 'entity':
            result = await reportGenerationService.generateEntityReport(target, options);
            break;
          default:
            throw new Error(`Unknown report type: ${reportType}`);
        }

        if (result.success) {
          results.push({
            target,
            success: true,
            filename: result.filename,
            filePath: result.filePath
          });
        } else {
          errors.push({
            target,
            error: result.error
          });
        }
      } catch (error) {
        errors.push({
          target,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      summary: {
        total: targets.length,
        successful: results.length,
        failed: errors.length
      },
      results,
      errors
    });

  } catch (error) {
    console.error('Error in bulk report generation:', error);
    res.status(500).json({ error: 'Failed to generate bulk reports' });
  }
});

module.exports = router;