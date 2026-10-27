const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mock data
const mockData = {
  evidence: {
    id: 'evid_67890',
    filename: 'screenshot_20250102.png',
    caseId: 'case_12345',
    entity: '0x1234567890abcdef',
    description: 'Suspicious transaction screenshot',
    tags: ['transaction', 'screenshot', 'suspicious'],
    riskLevel: 'high',
    status: 'pending',
    uploadedBy: 'investigator@example.com',
    uploadedAt: new Date().toISOString(),
    fileSize: 2048576,
    mimeType: 'image/png',
    storageHash: 'sha256:abc123def456...'
  },
  cases: [
    {
      id: 'case_12345',
      title: 'Suspicious Wallet Activity',
      description: 'Multiple suspicious transactions detected from wallet 0x1234...',
      entity: '0x1234567890abcdef',
      status: 'investigating',
      priority: 'high',
      tags: ['wallet', 'transaction', 'suspicious'],
      assignedTo: 'investigator@example.com',
      createdBy: 'system',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      evidenceCount: 5,
      riskScore: 0.85
    },
    {
      id: 'case_67890',
      title: 'High Volume Trading Pattern',
      description: 'Unusual trading patterns detected in DeFi protocol',
      entity: '0xabcdef1234567890',
      status: 'open',
      priority: 'medium',
      tags: ['defi', 'trading', 'pattern'],
      assignedTo: 'analyst@example.com',
      createdBy: 'system',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 3600000).toISOString(),
      evidenceCount: 3,
      riskScore: 0.65
    }
  ],
  predictions: {
    riskScore: 0.85,
    confidence: 0.92,
    riskLevel: 'high',
    reasoning: [
      'High transaction volume',
      'Multiple unique counterparties',
      'Recent activity spike'
    ],
    recommendedActions: [
      'Flag for investigation',
      'Monitor closely',
      'Request additional evidence'
    ],
    modelVersion: 'v2.1.0',
    timestamp: new Date().toISOString()
  },
  escalations: {
    escalationId: 'esc_12345',
    escalatedAt: new Date().toISOString(),
    escalatedTo: 'senior-investigator@example.com',
    priority: 'critical',
    status: 'pending_review'
  }
};

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'Fraud Evidence Mock Server',
    version: '1.0.0'
  });
});

// Evidence endpoints
app.post('/api/evidence/upload', (req, res) => {
  console.log('📁 Evidence upload request:', req.body);
  
  // Simulate file upload processing
  setTimeout(() => {
    res.status(201).json({
      success: true,
      message: 'Evidence uploaded successfully',
      evidence: {
        ...mockData.evidence,
        id: `evid_${Date.now()}`,
        uploadedAt: new Date().toISOString()
      }
    });
  }, 500);
});

app.get('/api/evidence/:id/verify', (req, res) => {
  const { id } = req.params;
  console.log('🔍 Evidence verification request for ID:', id);
  
  // Simulate verification process
  setTimeout(() => {
    res.json({
      success: true,
      verification: {
        isAuthentic: Math.random() > 0.1, // 90% authentic
        integrityCheck: Math.random() > 0.05, // 95% integrity
        timestamp: new Date().toISOString(),
        verifiedBy: 'system',
        confidence: 0.95
      }
    });
  }, 300);
});

// Cases endpoints
app.get('/api/cases', (req, res) => {
  const { page = 1, limit = 20, status, priority } = req.query;
  console.log('📋 Cases list request:', { page, limit, status, priority });
  
  let filteredCases = [...mockData.cases];
  
  // Apply filters
  if (status) {
    filteredCases = filteredCases.filter(case_ => case_.status === status);
  }
  if (priority) {
    filteredCases = filteredCases.filter(case_ => case_.priority === priority);
  }
  
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + parseInt(limit);
  const paginatedCases = filteredCases.slice(startIndex, endIndex);
  
  res.json({
    success: true,
    cases: paginatedCases,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: filteredCases.length,
      totalPages: Math.ceil(filteredCases.length / limit),
      hasNext: endIndex < filteredCases.length,
      hasPrev: page > 1
    }
  });
});

app.post('/api/cases', (req, res) => {
  console.log('➕ Create case request:', req.body);
  
  const newCase = {
    id: `case_${Date.now()}`,
    ...req.body,
    createdBy: 'system',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    evidenceCount: 0,
    riskScore: 0.5
  };
  
  mockData.cases.push(newCase);
  
  res.status(201).json({
    success: true,
    message: 'Case created successfully',
    case: newCase
  });
});

app.get('/api/cases/:id', (req, res) => {
  const { id } = req.params;
  console.log('🔍 Get case request for ID:', id);
  
  const case_ = mockData.cases.find(c => c.id === id);
  
  if (!case_) {
    return res.status(404).json({
      success: false,
      error: 'Case not found',
      code: 404,
      timestamp: new Date().toISOString(),
      path: req.path,
      method: req.method
    });
  }
  
  res.json({
    success: true,
    case: case_
  });
});

app.put('/api/cases/:id', (req, res) => {
  const { id } = req.params;
  console.log('✏️ Update case request for ID:', id, req.body);
  
  const caseIndex = mockData.cases.findIndex(c => c.id === id);
  
  if (caseIndex === -1) {
    return res.status(404).json({
      success: false,
      error: 'Case not found',
      code: 404,
      timestamp: new Date().toISOString(),
      path: req.path,
      method: req.method
    });
  }
  
  mockData.cases[caseIndex] = {
    ...mockData.cases[caseIndex],
    ...req.body,
    updatedAt: new Date().toISOString()
  };
  
  res.json({
    success: true,
    message: 'Case updated successfully',
    case: mockData.cases[caseIndex]
  });
});

app.delete('/api/cases/:id', (req, res) => {
  const { id } = req.params;
  console.log('🗑️ Delete case request for ID:', id);
  
  const caseIndex = mockData.cases.findIndex(c => c.id === id);
  
  if (caseIndex === -1) {
    return res.status(404).json({
      success: false,
      error: 'Case not found',
      code: 404,
      timestamp: new Date().toISOString(),
      path: req.path,
      method: req.method
    });
  }
  
  // Soft delete - just mark as deleted
  mockData.cases[caseIndex].status = 'deleted';
  mockData.cases[caseIndex].updatedAt = new Date().toISOString();
  
  res.json({
    success: true,
    message: 'Case deleted successfully'
  });
});

// RL endpoints
app.post('/api/rl/predict', (req, res) => {
  console.log('🤖 RL prediction request:', req.body);
  
  // Simulate ML processing time
  setTimeout(() => {
    const riskScore = Math.random() * 0.4 + 0.6; // 0.6-1.0 range
    const confidence = Math.random() * 0.2 + 0.8; // 0.8-1.0 range
    
    let riskLevel = 'low';
    if (riskScore > 0.8) riskLevel = 'critical';
    else if (riskScore > 0.6) riskLevel = 'high';
    else if (riskScore > 0.4) riskLevel = 'medium';
    
    res.json({
      success: true,
      prediction: {
        riskScore: parseFloat(riskScore.toFixed(3)),
        confidence: parseFloat(confidence.toFixed(3)),
        riskLevel,
        reasoning: [
          'High transaction volume',
          'Multiple unique counterparties',
          'Recent activity spike'
        ],
        recommendedActions: [
          'Flag for investigation',
          'Monitor closely',
          'Request additional evidence'
        ],
        modelVersion: 'v2.1.0',
        timestamp: new Date().toISOString()
      }
    });
  }, 1000);
});

app.post('/api/rl/feedback', (req, res) => {
  console.log('📝 RL feedback request:', req.body);
  
  // Simulate feedback processing
  setTimeout(() => {
    res.json({
      success: true,
      message: 'Feedback submitted successfully',
      feedbackId: `fb_${Date.now()}`,
      modelUpdate: {
        updated: Math.random() > 0.5, // 50% chance of model update
        version: 'v2.1.1'
      }
    });
  }, 200);
});

// Escalation endpoints
app.post('/api/escalate', (req, res) => {
  console.log('🚨 Escalation request:', req.body);
  
  // Simulate escalation processing
  setTimeout(() => {
    res.json({
      success: true,
      message: 'Case escalated successfully',
      escalation: {
        ...mockData.escalations,
        escalationId: `esc_${Date.now()}`,
        escalatedAt: new Date().toISOString()
      }
    });
  }, 300);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    code: 500,
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    code: 404,
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Fraud Evidence Mock Server running on port ${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/health`);
  console.log(`📚 API endpoints available at: http://localhost:${PORT}/api/`);
  console.log(`🔧 OpenAPI spec: http://localhost:${PORT}/openapi.yaml`);
});

module.exports = app;
