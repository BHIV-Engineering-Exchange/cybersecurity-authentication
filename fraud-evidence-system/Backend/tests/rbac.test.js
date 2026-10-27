// RBAC middleware unit tests
const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const { authorize, authorizeRole } = require('../middleware/productionRBAC');
const User = require('../models/User');
const mongoose = require('mongoose');

// Mock User and AuditLog model
jest.mock('../models/User');
jest.mock('../models/AuditLog', () => {
  return class MockAuditLog {
    constructor(data) {
      Object.assign(this, data);
    }
    save() {
      return Promise.resolve(this);
    }
  };
});

describe('RBAC Middleware', () => {
  let app;
  let mockUser;

  beforeEach(() => {
    app = express();
    app.use(express.json());

    // Mock user data
    mockUser = {
      _id: '507f1f77bcf86cd799439011',
      email: 'test@example.com',
      role: 'investigator',
      isActive: true,
      permissions: {
        evidenceView: true,
        evidenceUpload: true,
        evidenceDownload: true,
        evidenceExport: false,
        caseManagement: false,
        adminAccess: false
      },
      accessLevel: 'standard'
    };

    // Mock JWT token
    const token = jwt.sign(
      { id: mockUser._id, email: mockUser.email, role: mockUser.role },
      'test-secret'
    );

    // Mock auth middleware
    app.use((req, res, next) => {
      req.user = {
        id: mockUser._id,
        email: mockUser.email,
        role: mockUser.role
      };
      next();
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('authorize middleware', () => {
    it('should allow access for user with required permission', async () => {
      User.findById.mockResolvedValue(mockUser);

      app.get('/test', authorize('evidence.view'), (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .get('/test')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should deny access for user without required permission', async () => {
      User.findById.mockResolvedValue(mockUser);

      app.get('/test', authorize('evidence.delete'), (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .get('/test')
        .expect(403);

      expect(response.body.error).toBe(true);
      expect(response.body.code).toBe(403);
      expect(response.body.message).toBe('Insufficient permissions');
    });

    it('should deny access for inactive user', async () => {
      const inactiveUser = { ...mockUser, isActive: false };
      User.findById.mockResolvedValue(inactiveUser);

      app.get('/test', authorize('evidence.view'), (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .get('/test')
        .expect(403);

      expect(response.body.error).toBe(true);
      expect(response.body.message).toBe('Account is deactivated');
    });

    it('should handle multiple permissions', async () => {
      User.findById.mockResolvedValue(mockUser);

      app.get('/test', authorize(['evidence.view', 'evidence.upload']), (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .get('/test')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should deny access if user lacks any required permission', async () => {
      User.findById.mockResolvedValue(mockUser);

      app.get('/test', authorize(['evidence.view', 'evidence.delete']), (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .get('/test')
        .expect(403);

      expect(response.body.error).toBe(true);
      expect(response.body.details.requiredPermissions).toContain('evidence.delete');
    });

    it('should handle database errors gracefully', async () => {
      User.findById.mockRejectedValue(new Error('Database connection failed'));

      app.get('/test', authorize('evidence.view'), (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .get('/test')
        .expect(500);

      expect(response.body.error).toBe(true);
      expect(response.body.code).toBe(500);
    });

    it('should handle missing user', async () => {
      User.findById.mockResolvedValue(null);

      app.get('/test', authorize('evidence.view'), (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .get('/test')
        .expect(401);

      expect(response.body.error).toBe(true);
      expect(response.body.message).toBe('User not found');
    });
  });

  describe('authorizeRole middleware', () => {
    it('should allow access for user with required role', async () => {
      app.get('/test', authorizeRole('investigator'), (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .get('/test')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should deny access for user without required role', async () => {
      app.get('/test', authorizeRole('admin'), (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .get('/test')
        .expect(403);

      expect(response.body.error).toBe(true);
      expect(response.body.details.requiredRoles).toContain('admin');
      expect(response.body.details.userRole).toBe('investigator');
    });

    it('should handle multiple roles', async () => {
      app.get('/test', authorizeRole(['investigator', 'admin']), (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .get('/test')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should deny access for user not in allowed roles', async () => {
      app.get('/test', authorizeRole(['admin', 'superadmin']), (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .get('/test')
        .expect(403);

      expect(response.body.error).toBe(true);
    });
  });

  describe('Resource-based authorization', () => {
    it('should allow access to low-risk evidence for investigator', async () => {
      User.findById.mockResolvedValue(mockUser);

      app.get('/test', authorize('evidence.view', { 
        resourceType: 'evidence', 
        resourceLevel: 'low' 
      }), (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .get('/test')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should deny access to critical evidence for investigator', async () => {
      User.findById.mockResolvedValue(mockUser);

      app.get('/test', authorize('evidence.view', { 
        resourceType: 'evidence', 
        resourceLevel: 'critical' 
      }), (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .get('/test')
        .expect(403);

      expect(response.body.error).toBe(true);
      expect(response.body.message).toBe('Resource access denied');
    });
  });

  describe('Error handling', () => {
    it('should handle missing user context', async () => {
      // Remove user from request
      app.use((req, res, next) => {
        req.user = null;
        next();
      });

      app.get('/test', authorize('evidence.view'), (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .get('/test')
        .expect(401);

      expect(response.body.error).toBe(true);
      expect(response.body.message).toBe('Authentication required');
    });

    it('should include request ID in error responses', async () => {
      User.findById.mockResolvedValue(mockUser);

      app.get('/test', authorize('evidence.delete'), (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .get('/test')
        .set('x-request-id', 'test-req-id')
        .expect(403);

      expect(response.body.requestId).toBeDefined();
      expect(response.body.timestamp).toBeDefined();
    });
  });
});

describe('Permission Matrix', () => {
  const { hasPermission, getRolePermissions } = require('../config/permissions');

  it('should correctly identify superadmin permissions', () => {
    const permissions = getRolePermissions('superadmin');
    expect(permissions.permissions).toContain('evidence.view');
    expect(permissions.permissions).toContain('evidence.delete');
    expect(permissions.permissions).toContain('system.config');
    expect(permissions.accessLevel).toBe('full');
  });

  it('should correctly identify admin permissions', () => {
    const permissions = getRolePermissions('admin');
    expect(permissions.permissions).toContain('evidence.view');
    expect(permissions.permissions).toContain('evidence.export');
    expect(permissions.permissions).not.toContain('evidence.delete');
    expect(permissions.permissions).not.toContain('system.config');
    expect(permissions.accessLevel).toBe('elevated');
  });

  it('should correctly identify investigator permissions', () => {
    const permissions = getRolePermissions('investigator');
    expect(permissions.permissions).toContain('evidence.view');
    expect(permissions.permissions).toContain('evidence.upload');
    expect(permissions.permissions).not.toContain('evidence.delete');
    expect(permissions.permissions).not.toContain('user.manage_roles');
    expect(permissions.accessLevel).toBe('standard');
  });

  it('should correctly identify user permissions', () => {
    const permissions = getRolePermissions('user');
    expect(permissions.permissions).toContain('evidence.upload');
    expect(permissions.permissions).not.toContain('evidence.view');
    expect(permissions.permissions).not.toContain('evidence.download');
    expect(permissions.accessLevel).toBe('restricted');
  });

  it('should correctly check individual permissions', () => {
    expect(hasPermission('admin', 'evidence.view')).toBe(true);
    expect(hasPermission('admin', 'evidence.delete')).toBe(false);
    expect(hasPermission('investigator', 'evidence.view')).toBe(true);
    expect(hasPermission('investigator', 'evidence.delete')).toBe(false);
    expect(hasPermission('user', 'evidence.view')).toBe(false);
    expect(hasPermission('user', 'evidence.upload')).toBe(true);
  });
});
