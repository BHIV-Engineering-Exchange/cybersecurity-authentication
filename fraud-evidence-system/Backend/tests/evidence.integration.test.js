// Evidence API integration tests
const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Import models
const Evidence = require('../models/Evidence');
const User = require('../models/User');

const { MongoMemoryServer } = require('mongodb-memory-server');
let mongoServer;
let app;

describe('Evidence API Integration Tests', () => {
  let authToken;
  let testUser;
  let testEvidence;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-secret';
    // Start MongoMemoryServer
    mongoServer = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongoServer.getUri();
    process.env.MONGO_TEST_URI = mongoServer.getUri();
    
    // Now require app
    app = require('../server');

    // Mongoose is already connected by server.js, wait for it or just ensure it's connected
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI);
    }
    
    // Create test user
    testUser = new User({
      email: 'test@example.com',
      password: 'hashedpassword',
      role: 'investigator',
      isActive: true,
      permissions: {
        evidenceView: true,
        evidenceUpload: true,
        evidenceDownload: true,
        evidenceExport: true,
        caseManagement: false,
        adminAccess: false
      },
      accessLevel: 'standard'
    });
    await testUser.save();

    // Generate auth token
    authToken = jwt.sign(
      { userId: testUser._id, email: testUser.email, role: testUser.role },
      process.env.JWT_SECRET || 'test-secret'
    );
  });

  afterAll(async () => {
    // Clean up test data
    await User.deleteMany({ email: 'test@example.com' });
    await Evidence.deleteMany({ uploadedBy: 'test@example.com' });
    await mongoose.connection.close();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  beforeEach(async () => {
    // Create test evidence
    testEvidence = new Evidence({
      caseId: 'TEST-CASE-001',
      entity: '0x742d35Cc6634C0532925a3b8D',
      filename: 'test_evidence.pdf',
      originalFilename: 'test_evidence.pdf',
      fileSize: 1024,
      fileType: 'application/pdf',
      fileHash: 'sha256:testhash123',
      storageHash: 'ipfs:QmHash',
      filePath: '/tmp/test.pdf',
      reporter: 'test-reporter-id',
      wallet: '0x742d35Cc6634C0532925a3b8D',
      riskLevel: 'medium',
      verificationStatus: 'verified',
      uploadedBy: 'test@example.com',
      tags: ['test', 'integration']
    });
    await testEvidence.save();
  });

  afterEach(async () => {
    // Clean up test evidence
    await Evidence.deleteMany({ caseId: 'TEST-CASE-001' });
  });

  describe('GET /api/evidence', () => {
    it('should return evidence list for authenticated user', async () => {
      const response = await request(app)
        .get('/api/evidence')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.evidence).toBeDefined();
      expect(Array.isArray(response.body.evidence)).toBe(true);
      expect(response.body.pagination).toBeDefined();
    });

    it('should deny access without authentication', async () => {
      const response = await request(app)
        .get('/api/evidence')
        .expect(401);

      expect(response.body.error).toBe(true);
      expect(response.body.code).toBe(401);
    });

    it('should filter evidence by case ID', async () => {
      const response = await request(app)
        .get('/api/evidence?caseId=TEST-CASE-001')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.evidence.length).toBeGreaterThan(0);
      expect(response.body.evidence[0].caseId).toBe('TEST-CASE-001');
    });

    it('should filter evidence by risk level', async () => {
      const response = await request(app)
        .get('/api/evidence?riskLevel=medium')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.evidence.every(e => e.riskLevel === 'medium')).toBe(true);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/evidence?page=1&limit=5')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(5);
      expect(response.body.pagination.total).toBeDefined();
    });
  });

  describe('POST /api/evidence/upload', () => {
    it('should upload evidence file successfully', async () => {
      const testFile = Buffer.from('test file content');
      
      const response = await request(app)
        .post('/api/evidence/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .field('caseId', 'TEST-CASE-002')
        .field('entity', '0x742d35Cc6634C0532925a3b8D')
        .field('description', 'Test evidence upload')
        .field('tags', 'test,upload')
        .field('riskLevel', 'low')
        .attach('evidenceFile', testFile, 'test_upload.pdf')
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.evidence).toBeDefined();
      expect(response.body.evidence.caseId).toBe('TEST-CASE-002');
      expect(response.body.evidence.uploadedBy).toBe('test@example.com');
    });

    it('should reject upload without file', async () => {
      const response = await request(app)
        .post('/api/evidence/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .field('caseId', 'TEST-CASE-002')
        .field('entity', '0x742d35Cc6634C0532925a3b8D')
        .expect(400);

      expect(response.body.error).toBe(true);
      expect(response.body.message).toContain('No file uploaded');
    });

    it('should reject upload without required fields', async () => {
      const testFile = Buffer.from('test file content');
      
      const response = await request(app)
        .post('/api/evidence/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('evidenceFile', testFile, 'test_upload.pdf')
        .expect(400);

      expect(response.body.error).toBe(true);
      expect(response.body.message).toContain('Case ID and entity are required');
    });

    it('should reject oversized files', async () => {
      const largeFile = Buffer.alloc(60 * 1024 * 1024); // 60MB
      
      const response = await request(app)
        .post('/api/evidence/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .field('caseId', 'TEST-CASE-002')
        .field('entity', '0x742d35Cc6634C0532925a3b8D')
        .attach('evidenceFile', largeFile, 'large_file.pdf')
        .expect(413);

      expect(response.body.error).toBe(true);
    });
  });

  describe('GET /api/evidence/:evidenceId', () => {
    it('should return specific evidence', async () => {
      const response = await request(app)
        .get(`/api/evidence/${testEvidence._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.evidence._id).toBe(testEvidence._id.toString());
      expect(response.body.evidence.caseId).toBe('TEST-CASE-001');
    });

    it('should return 404 for non-existent evidence', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .get(`/api/evidence/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.error).toBe(true);
      expect(response.body.message).toContain('Evidence not found');
    });
  });

  describe('GET /api/evidence/download/:evidenceId', () => {
    it('should download evidence file', async () => {
      const response = await request(app)
        .get(`/api/evidence/download/${testEvidence._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.headers['content-type']).toBe('application/pdf');
      expect(response.headers['content-disposition']).toContain('attachment');
    });

    it('should deny download for unauthorized user', async () => {
      // Create user without download permission
      const restrictedUser = new User({
        email: 'restricted@example.com',
        password: 'hashedpassword',
        role: 'user',
        isActive: true,
        permissions: {
          evidenceView: false,
          evidenceUpload: true,
          evidenceDownload: false,
          evidenceExport: false,
          caseManagement: false,
          adminAccess: false
        },
        accessLevel: 'restricted'
      });
      await restrictedUser.save();

      const restrictedToken = jwt.sign(
        { userId: restrictedUser._id, email: restrictedUser.email, role: restrictedUser.role },
        process.env.JWT_SECRET || 'test-secret'
      );

      const response = await request(app)
        .get(`/api/evidence/download/${testEvidence._id}`)
        .set('Authorization', `Bearer ${restrictedToken}`)
        .expect(403);

      expect(response.body.error).toBe(true);
      expect(response.body.message).toContain('Insufficient permissions');

      // Clean up
      await User.deleteOne({ _id: restrictedUser._id });
    });
  });

  describe('POST /api/evidence/verify/:evidenceId', () => {
    it('should verify evidence integrity', async () => {
      const response = await request(app)
        .post(`/api/evidence/verify/${testEvidence._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.verification).toBeDefined();
      expect(response.body.verification.overallIntegrity).toBeDefined();
    });

    it('should return 404 for non-existent evidence', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .post(`/api/evidence/verify/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.error).toBe(true);
    });
  });

  describe('GET /api/evidence/case/:caseId', () => {
    it('should return evidence for specific case', async () => {
      const response = await request(app)
        .get('/api/evidence/case/TEST-CASE-001')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.evidence).toBeDefined();
      expect(response.body.evidence.every(e => e.caseId === 'TEST-CASE-001')).toBe(true);
    });

    it('should return empty array for case with no evidence', async () => {
      const response = await request(app)
        .get('/api/evidence/case/NON-EXISTENT-CASE')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.evidence).toEqual([]);
    });
  });

  describe('Error handling', () => {
    it('should handle invalid evidence ID format', async () => {
      const response = await request(app)
        .get('/api/evidence/invalid-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.error).toBe(true);
      expect(response.body.message).toContain('Invalid ID format');
    });

    it('should handle server errors gracefully', async () => {
      // Mock database error
      const originalFind = Evidence.findById;
      Evidence.findById = jest.fn().mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .get(`/api/evidence/${testEvidence._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500);

      expect(response.body.error).toBe(true);
      expect(response.body.code).toBe(500);

      // Restore original method
      Evidence.findById = originalFind;
    });
  });

  describe('Rate limiting', () => {
    it('should enforce rate limits on evidence endpoints', async () => {
      const requests = Array(105).fill().map(() => 
        request(app)
          .get('/api/evidence')
          .set('Authorization', `Bearer ${authToken}`)
      );

      const responses = await Promise.all(requests);
      
      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });
});
