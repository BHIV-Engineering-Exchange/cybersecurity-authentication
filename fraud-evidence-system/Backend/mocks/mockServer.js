// Mock Server for Fraud Evidence System
// Simulates real backend behavior with static JSON responses

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

// Import RBAC middleware
const {
  requirePermission,
  requireRole,
  mockAuth,
  addRBACInfo
} = require('../middleware/rbacMiddleware');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Add mock authentication middleware
app.use(mockAuth);

// Add RBAC info to all responses (for debugging)
app.use(addRBACInfo);

// Configure multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// Load mock data
const loadMockData = (filename) => {
  const filePath = path.join(__dirname, 'mockData', filename);
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    console.error(`Error loading ${filename}:`, error);
    return null;
  }
};

// Logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Fraud Evidence Mock Server',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Fraud Evidence System Mock Server',
    version: '1.0.0',
    endpoints: {
      evidence: {
        upload: 'POST /api/evidence/upload',
        verify: 'GET /api/evidence/{id}/verify'
      },
      cases: {
        list: 'GET /api/cases',
        create: 'POST /api/cases',
        get: 'GET /api/cases/{id}',
        update: 'PUT /api/cases/{id}',
        delete: 'DELETE /api/cases/{id}'
      },
      rl: {
        predict: 'POST /api/rl/predict',
        feedback: 'POST /api/rl/feedback'
      },
      escalation: {
        escalate: 'POST /api/escalate'
      }
    },
    documentation: 'See openapi/openapi.yaml for full API specification'
  });
});

// ============================================
// EVIDENCE ENDPOINTS
// ============================================

// POST /api/evidence/upload
app.post('/api/evidence/upload', 
  requirePermission('upload-evidence'),
  upload.single('evidenceFile'), 
  (req, res) => {
  const mockData = loadMockData('evidence.json');
  
  if (!mockData) {
    return res.status(500).json({
      error: true,
      code: 500,
      message: 'Failed to load mock data',
      timestamp: new Date().toISOString()
    });
  }

  // Simulate validation
  const { caseId, entity } = req.body;
  if (!caseId || !entity) {
    return res.status(400).json({
      error: true,
      code: 400,
      message: 'Case ID and entity are required',
      timestamp: new Date().toISOString()
    });
  }

  // Check if file was uploaded
  if (!req.file) {
    return res.status(400).json({
      error: true,
      code: 400,
      message: 'No file uploaded',
      timestamp: new Date().toISOString()
    });
  }

  // Return mock response with updated data
  const response = {
    ...mockData,
    evidence: {
      ...mockData.evidence,
      caseId,
      entity,
      filename: `evidence_${Date.now()}_${req.file.originalname}`,
      uploadedAt: new Date().toISOString()
    }
  };

  res.status(201).json(response);
});

// GET /api/evidence/{id}/verify
app.get('/api/evidence/:id/verify', 
  requirePermission('verify-evidence'),
  (req, res) => {
  const mockData = loadMockData('evidence_verify.json');
  
  if (!mockData) {
    return res.status(500).json({
      error: true,
      code: 500,
      message: 'Failed to load mock data',
      timestamp: new Date().toISOString()
    });
  }

  const { id } = req.params;
  
  // Simulate evidence not found for specific IDs
  if (id === 'invalid' || id === 'notfound') {
    return res.status(404).json({
      error: true,
      code: 404,
      message: 'Evidence not found',
      timestamp: new Date().toISOString()
    });
  }

  // Return mock verification response
  const response = {
    ...mockData,
    verification: {
      ...mockData.verification,
      evidenceId: id,
      verifiedAt: new Date().toISOString()
    }
  };

  res.status(200).json(response);
});

// ============================================
// CASE ENDPOINTS
// ============================================

// GET /api/cases
app.get('/api/cases', 
  requirePermission('view-cases'),
  (req, res) => {
  const mockData = loadMockData('case.json');
  
  if (!mockData) {
    return res.status(500).json({
      error: true,
      code: 500,
      message: 'Failed to load mock data',
      timestamp: new Date().toISOString()
    });
  }

  // Handle query parameters for filtering
  const { page = 1, limit = 20, status, priority } = req.query;
  
  let filteredCases = mockData.cases;
  
  // Filter by status
  if (status) {
    filteredCases = filteredCases.filter(c => c.status === status);
  }
  
  // Filter by priority
  if (priority) {
    filteredCases = filteredCases.filter(c => c.priority === priority);
  }

  // Apply pagination
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + parseInt(limit);
  const paginatedCases = filteredCases.slice(startIndex, endIndex);

  const response = {
    success: true,
    cases: paginatedCases,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: filteredCases.length,
      pages: Math.ceil(filteredCases.length / limit)
    }
  };

  res.status(200).json(response);
});

// POST /api/cases
app.post('/api/cases', 
  requirePermission('create-case'),
  (req, res) => {
  const mockData = loadMockData('case_single.json');
  
  if (!mockData) {
    return res.status(500).json({
      error: true,
      code: 500,
      message: 'Failed to load mock data',
      timestamp: new Date().toISOString()
    });
  }

  const { title, description, priority, category, entities, indicators } = req.body;
  
  // Validate required fields
  if (!title) {
    return res.status(400).json({
      error: true,
      code: 400,
      message: 'Case title is required',
      timestamp: new Date().toISOString()
    });
  }

  // Create response with submitted data
  const caseId = `CASE-2024-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
  const response = {
    success: true,
    case: {
      ...mockData.case,
      id: `66d4a2b8c9e${Date.now()}`,
      caseId,
      title,
      description: description || mockData.case.description,
      priority: priority || 'medium',
      category: category || 'investigation',
      status: 'open',
      entities: entities || [],
      indicators: indicators || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  };

  res.status(201).json(response);
});

// GET /api/cases/{id}
app.get('/api/cases/:id', 
  requirePermission('view-cases'),
  (req, res) => {
  const mockData = loadMockData('case_single.json');
  
  if (!mockData) {
    return res.status(500).json({
      error: true,
      code: 500,
      message: 'Failed to load mock data',
      timestamp: new Date().toISOString()
    });
  }

  const { id } = req.params;
  
  // Simulate case not found
  if (id === 'invalid' || id === 'notfound') {
    return res.status(404).json({
      error: true,
      code: 404,
      message: 'Case not found',
      timestamp: new Date().toISOString()
    });
  }

  // Return mock case with the requested ID
  const response = {
    ...mockData,
    case: {
      ...mockData.case,
      id
    }
  };

  res.status(200).json(response);
});

// PUT /api/cases/{id}
app.put('/api/cases/:id', 
  requirePermission('update-case'),
  (req, res) => {
  const mockData = loadMockData('case_single.json');
  
  if (!mockData) {
    return res.status(500).json({
      error: true,
      code: 500,
      message: 'Failed to load mock data',
      timestamp: new Date().toISOString()
    });
  }

  const { id } = req.params;
  const updates = req.body;
  
  // Simulate case not found
  if (id === 'invalid' || id === 'notfound') {
    return res.status(404).json({
      error: true,
      code: 404,
      message: 'Case not found',
      timestamp: new Date().toISOString()
    });
  }

  // Merge updates with mock data
  const response = {
    success: true,
    case: {
      ...mockData.case,
      id,
      ...updates,
      updatedAt: new Date().toISOString()
    },
    changes: Object.keys(updates)
  };

  res.status(200).json(response);
});

// DELETE /api/cases/{id}
app.delete('/api/cases/:id', 
  requirePermission('delete-case'),
  (req, res) => {
  const { id } = req.params;
  
  // Simulate case not found
  if (id === 'invalid' || id === 'notfound') {
    return res.status(404).json({
      error: true,
      code: 404,
      message: 'Case not found',
      timestamp: new Date().toISOString()
    });
  }

  // Simulate successful deletion
  res.status(200).json({
    success: true,
    message: 'Case deleted successfully',
    deletedCaseId: id,
    timestamp: new Date().toISOString()
  });
});

// ============================================
// RL ENGINE ENDPOINTS
// ============================================

// POST /api/rl/predict
app.post('/api/rl/predict', 
  requirePermission('rl-predict'),
  (req, res) => {
  const mockData = loadMockData('rl_predict.json');
  
  if (!mockData) {
    return res.status(500).json({
      error: true,
      code: 500,
      message: 'Failed to load mock data',
      timestamp: new Date().toISOString()
    });
  }

  const { wallet, features } = req.body;
  
  // Validate required fields
  if (!wallet) {
    return res.status(400).json({
      error: true,
      code: 400,
      message: 'Wallet address is required',
      timestamp: new Date().toISOString()
    });
  }

  // Return prediction with submitted wallet and features
  const response = {
    ...mockData,
    prediction: {
      ...mockData.prediction,
      wallet,
      features: features || mockData.prediction.features,
      timestamp: new Date().toISOString()
    }
  };

  res.status(200).json(response);
});

// POST /api/rl/feedback
app.post('/api/rl/feedback', 
  requirePermission('rl-feedback'),
  (req, res) => {
  const mockData = loadMockData('rl_feedback.json');
  
  if (!mockData) {
    return res.status(500).json({
      error: true,
      code: 500,
      message: 'Failed to load mock data',
      timestamp: new Date().toISOString()
    });
  }

  const { wallet, predictedRisk, actualOutcome, investigatorNotes, actionTaken } = req.body;
  
  // Validate required fields
  if (!wallet || predictedRisk === undefined || !actualOutcome) {
    return res.status(400).json({
      error: true,
      code: 400,
      message: 'Wallet, predicted risk, and actual outcome are required',
      timestamp: new Date().toISOString()
    });
  }

  // Calculate accuracy based on predicted vs actual
  const accuracy = Math.abs(1 - Math.abs(predictedRisk - (actualOutcome === 'fraud_confirmed' ? 1 : 0)));

  // Return feedback response
  const response = {
    ...mockData,
    feedback: {
      ...mockData.feedback,
      id: `66d4a2b8c9e${Date.now()}`,
      wallet,
      predictedRisk,
      actualOutcome,
      accuracy: parseFloat(accuracy.toFixed(2)),
      investigatorNotes: investigatorNotes || mockData.feedback.investigatorNotes,
      actionTaken: actionTaken || mockData.feedback.actionTaken,
      submittedAt: new Date().toISOString()
    }
  };

  res.status(200).json(response);
});

// ============================================
// ESCALATION ENDPOINTS
// ============================================

// POST /api/escalate
app.post('/api/escalate', 
  requirePermission('escalate-case'),
  (req, res) => {
  const mockData = loadMockData('escalate.json');
  
  if (!mockData) {
    return res.status(500).json({
      error: true,
      code: 500,
      message: 'Failed to load mock data',
      timestamp: new Date().toISOString()
    });
  }

  const { entityId, caseId, riskScore, reason, urgency, escalateTo, evidenceIds } = req.body;
  
  // Validate required fields
  if (!entityId || riskScore === undefined) {
    return res.status(400).json({
      error: true,
      code: 400,
      message: 'Missing entityId or riskScore',
      timestamp: new Date().toISOString()
    });
  }

  // Generate reference number
  const refNumber = `ESC-2024-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}-${escalateTo || 'RBI'}`;

  // Return escalation response
  const response = {
    ...mockData,
    escalation: {
      ...mockData.escalation,
      id: `66d4a2b8c9e${Date.now()}`,
      entityId,
      caseId: caseId || mockData.escalation.caseId,
      riskScore,
      reason: reason || mockData.escalation.reason,
      urgency: urgency || 'normal',
      escalateTo: escalateTo || 'RBI',
      evidenceCount: evidenceIds ? evidenceIds.length : mockData.escalation.evidenceCount,
      referenceNumber: refNumber,
      escalatedAt: new Date().toISOString()
    }
  };

  res.status(200).json(response);
});

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: true,
    code: 404,
    message: `Endpoint not found: ${req.method} ${req.path}`,
    timestamp: new Date().toISOString()
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: true,
    code: 500,
    message: 'Internal server error',
    details: err.message,
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log('\n========================================');
  console.log('🚀 Fraud Evidence Mock Server Started');
  console.log('========================================');
  console.log(`📡 Server running on: http://localhost:${PORT}`);
  console.log(`📝 Health check: http://localhost:${PORT}/health`);
  console.log(`📚 API docs: See openapi/openapi.yaml`);
  console.log('========================================\n');
  console.log('Available Endpoints:');
  console.log('  POST   /api/evidence/upload');
  console.log('  GET    /api/evidence/{id}/verify');
  console.log('  GET    /api/cases');
  console.log('  POST   /api/cases');
  console.log('  GET    /api/cases/{id}');
  console.log('  PUT    /api/cases/{id}');
  console.log('  DELETE /api/cases/{id}');
  console.log('  POST   /api/rl/predict');
  console.log('  POST   /api/rl/feedback');
  console.log('  POST   /api/escalate');
  console.log('========================================\n');
});

module.exports = app;

