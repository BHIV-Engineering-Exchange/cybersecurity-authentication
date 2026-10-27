// Main Server File for Fraud Evidence System
// Includes Evidence Upload with local storage and MongoDB integration

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5050;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import routes
const authRoutes = require('./routes/authRoutes');
const evidenceRoutes = require('./routes/evidenceRoutes');
const rlRoutes = require('./routes/rlRoutes');
const eventQueueRoutes = require('./routes/eventQueueRoutes');
const auditRoutes = require('./routes/auditRoutes');
// ✅ BHIV Core Routes
const coreRoutes = require('./routes/coreRoutes');
const coreWebhooksRoutes = require('./routes/coreWebhooksRoutes');
// ✅ Blockchain Routes (Token, DEX, Bridge, ML)
const blockchainRoutes = require('./routes/blockchainRoutes');
const cybercrimeRoutes = require('./routes/cybercrimeRoutes');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'fraud-evidence-system-secret-jwt-key-2024';

// MongoDB Connection with in-memory fallback
const { MongoMemoryServer } = require('mongodb-memory-server');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

async function seedDefaultUsers() {
  try {
    const defaultUsers = [
      {
        email: 'aryangupta3103@gmail.com',
        password: 'Aryan&Keval',
        role: 'admin',
        accessLevel: 'elevated'
      },
      {
        email: 'admin@fraudevidence.com',
        password: 'Admin@123456',
        role: 'admin',
        accessLevel: 'elevated'
      },
      {
        email: 'admin123@fraud.com',
        password: 'admin123',
        role: 'admin',
        accessLevel: 'elevated'
      },
      {
        email: 'investigator1@example.com',
        password: 'SecureInv2024!',
        role: 'investigator',
        accessLevel: 'standard'
      }
    ];

    for (const u of defaultUsers) {
      const exists = await User.findOne({ email: u.email });
      if (!exists) {
        const hashedPassword = await bcrypt.hash(u.password, 10);
        const user = new User({
          email: u.email,
          password: hashedPassword,
          role: u.role,
          accessLevel: u.accessLevel,
          isActive: true
        });
        if (typeof user.setRolePermissions === 'function') {
          user.setRolePermissions();
        }
        await user.save();
        console.log(`👤 Seeded default user: ${u.email} (${u.role})`);
      }
    }
  } catch (seedErr) {
    console.error('Warning during user seeding:', seedErr.message);
  }
}

async function connectDatabase() {
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fraud_evidence';
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 2000
    });
    console.log('✅ MongoDB connected successfully');
    console.log('📊 Database:', mongoose.connection.name);
    await seedDefaultUsers();
  } catch (err) {
    console.warn('⚠️ External MongoDB not available (' + err.message + '). Starting embedded in-memory MongoDB...');
    try {
      const mongoServer = await MongoMemoryServer.create();
      const uri = mongoServer.getUri();
      await mongoose.connect(uri);
      console.log('✅ In-memory MongoDB connected successfully at:', uri);
      await seedDefaultUsers();
    } catch (memErr) {
      console.error('❌ Failed to start in-memory MongoDB:', memErr.message);
    }
  }
}

connectDatabase();

// Request logging and trace_id propagation
const { v4: uuidv4 } = require('uuid');
app.use((req, res, next) => {
  req.traceId = req.headers['x-trace-id'] || uuidv4();
  req.requestId = req.headers['x-request-id'] || uuidv4();
  res.setHeader('X-Trace-Id', req.traceId);
  res.setHeader('X-Request-Id', req.requestId);
  console.log(`[${new Date().toISOString()}] [Trace: ${req.traceId}] ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  
  res.json({
    status: 'healthy',
    service: 'Fraud Evidence System',
    version: '1.0.0',
    database: mongoStatus,
    timestamp: new Date().toISOString()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Fraud Evidence System - API Server',
    version: '1.0.0',
    endpoints: {
      health: 'GET /health',
      evidence: {
        upload: 'POST /api/evidence/upload',
        get: 'GET /api/evidence/:id',
        verify: 'GET /api/evidence/:id/verify',
        anchor: 'POST /api/evidence/:id/anchor',
        blockchainVerify: 'GET /api/evidence/:id/blockchain-verify',
        download: 'GET /api/evidence/:id/download',
        byCase: 'GET /api/evidence/case/:caseId',
        stats: 'GET /api/evidence/stats',
        delete: 'DELETE /api/evidence/:id'
      },
      rl: {
        predict: 'POST /api/rl/predict',
        feedback: 'POST /api/rl/feedback',
        stats: 'GET /api/rl/stats',
        predictions: 'GET /api/rl/predictions/:wallet'
      },
      queue: {
        stats: 'GET /api/queue/stats',
        clear: 'POST /api/queue/clear',
        testEvent: 'POST /api/queue/test-event'
      },
      audit: {
        list: 'GET /api/admin/audit',
        trail: 'GET /api/admin/audit/trail/:resourceType/:resourceId',
        stats: 'GET /api/admin/audit/stats',
        byCase: 'GET /api/admin/audit/case/:caseId',
        byEvidence: 'GET /api/admin/audit/evidence/:evidenceId',
        anchor: 'POST /api/admin/audit/anchor',
        verify: 'GET /api/admin/audit/verify/:batchId',
        critical: 'GET /api/admin/audit/critical',
        failures: 'GET /api/admin/audit/failures'
      },
      bhivCore: {
        acceptEvent: 'POST /api/core/events',
        getEventStatus: 'GET /api/core/events/:core_event_id',
        getCaseStatus: 'GET /api/core/case/:case_id/status',
        healthCheck: 'GET /api/core/health'
      },
      bhivWebhooks: {
        escalationResult: 'POST /api/core-webhooks/escalation-result',
        genericCallback: 'POST /api/core-webhooks/callbacks/:callback_type',
        monitoringEvents: 'GET /api/core-webhooks/monitoring/events',
        logEvent: 'POST /api/core-webhooks/monitoring/events',
        replayEvent: 'POST /api/core-webhooks/monitoring/replay/:event_id',
        healthCheck: 'GET /api/core-webhooks/health'
      }
    },
    rbac: {
      enabled: true,
      testHeader: 'x-user-role',
      roles: ['guest', 'user', 'analyst', 'investigator', 'admin', 'superadmin']
    },
    documentation: 'See README.md and RBAC_DOCUMENTATION.md'
  });
});

// Mount routes
// Authentication routes (must be before other routes)
app.use('/api/auth', authRoutes);
app.use('/api/evidence', evidenceRoutes);
app.use('/api/rl', rlRoutes);
app.use('/api/queue', eventQueueRoutes);
app.use('/api/admin/audit', auditRoutes);
// ✅ BHIV CORE PUBLIC ROUTES
app.use('/api/core', coreRoutes);
app.use('/api/core-webhooks', coreWebhooksRoutes);
// ✅ BLOCKCHAIN ROUTES (Token, DEX, Bridge, ML)
app.use('/api/blockchain', blockchainRoutes);
app.use('/api/cybercrime', cybercrimeRoutes);

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
  console.error('❌ Server error:', err);
  res.status(500).json({
    error: true,
    code: 500,
    message: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined,
    timestamp: new Date().toISOString()
  });
});

// Start server
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log('\n========================================');
    console.log('🚀 Fraud Evidence Server Started');
    console.log('========================================');
    console.log(`📡 Server: http://localhost:${PORT}`);
    console.log(`📝 Health: http://localhost:${PORT}/health`);
    console.log(`🔐 RBAC: Enabled (use x-user-role header)`);
    console.log('========================================\n');
    console.log('Authentication Endpoints:');
    console.log('  POST   /api/auth/login');
    console.log('  POST   /api/auth/register');
    console.log('  GET    /api/auth/verify');
    console.log('');
    console.log('Evidence API Endpoints:');
    console.log('  POST   /api/evidence/upload');
    console.log('  GET    /api/evidence/:id');
    console.log('  GET    /api/evidence/:id/verify');
    console.log('  POST   /api/evidence/:id/anchor');
    console.log('  GET    /api/evidence/:id/blockchain-verify');
    console.log('  GET    /api/evidence/:id/download');
    console.log('  GET    /api/evidence/case/:caseId');
    console.log('  GET    /api/evidence/stats');
    console.log('  DELETE /api/evidence/:id');
    console.log('');
    console.log('RL Engine Endpoints:');
    console.log('  POST   /api/rl/predict');
    console.log('  POST   /api/rl/feedback');
    console.log('  GET    /api/rl/stats');
    console.log('  GET    /api/rl/predictions/:wallet');
    console.log('');
    console.log('Event Queue Endpoints:');
    console.log('  GET    /api/queue/stats');
    console.log('  POST   /api/queue/clear');
    console.log('  POST   /api/queue/test-event');
    console.log('');
    console.log('Audit Log Endpoints:');
    console.log('  GET    /api/admin/audit');
    console.log('  GET    /api/admin/audit/stats');
    console.log('  GET    /api/admin/audit/case/:caseId');
    console.log('  GET    /api/admin/audit/evidence/:evidenceId');
    console.log('  POST   /api/admin/audit/anchor');
    console.log('');
    console.log('BHIV Core Endpoints:');
    console.log('  POST   /api/core/events');
    console.log('  GET    /api/core/events/:core_event_id');
    console.log('  GET    /api/core/case/:case_id/status');
    console.log('  GET    /api/core/health');
    console.log('');
    console.log('BHIV Webhooks Endpoints:');
    console.log('  POST   /api/core-webhooks/escalation-result');
    console.log('  POST   /api/core-webhooks/callbacks/:callback_type');
    console.log('  GET    /api/core-webhooks/monitoring/events');
    console.log('  POST   /api/core-webhooks/monitoring/events');
    console.log('  POST   /api/core-webhooks/monitoring/replay/:event_id');
    console.log('  GET    /api/core-webhooks/health');
    console.log('');
    console.log('Blockchain Endpoints (Token, DEX, Bridge, ML):');
    console.log('  POST   /api/blockchain/bridge/transfer');
    console.log('  GET    /api/blockchain/bridge/status/:id');
    console.log('  POST   /api/blockchain/ml/analyze');
    console.log('  GET    /api/blockchain/transactions/:address');
    console.log('  GET    /api/blockchain/health');
    console.log('');
    console.log('Cybercrime Enforcement Endpoints:');
    console.log('  POST   /api/cybercrime/report');
    console.log('  POST   /api/cybercrime/freeze');
    console.log('  POST   /api/cybercrime/unfreeze');
    console.log('  POST   /api/cybercrime/auto-enforce');
    console.log('  GET    /api/cybercrime/stats');
    console.log('========================================\n');
  });
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  mongoose.connection.close(() => {
    console.log('MongoDB connection closed');
    process.exit(0);
  });
});

module.exports = app;
