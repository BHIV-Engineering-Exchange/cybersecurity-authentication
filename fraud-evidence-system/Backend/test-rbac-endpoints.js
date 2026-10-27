// Comprehensive RBAC Endpoint Tests
const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const Evidence = require('./models/Evidence');
const Case = require('./models/Case');

// Mock app setup
const app = express();
app.use(express.json());

// Import routes and middleware
const auth = require('./middleware/auth');
const { authorize, authorizeRole } = require('./middleware/authorize');

// Test data
const testUsers = {
  user: {
    _id: new mongoose.Types.ObjectId(),
    email: 'user@test.com',
    role: 'user',
    isActive: true,
    permissions: []
  },
  investigator: {
    _id: new mongoose.Types.ObjectId(),
    email: 'investigator@test.com',
    role: 'investigator',
    isActive: true,
    permissions: []
  },
  admin: {
    _id: new mongoose.Types.ObjectId(),
    email: 'admin@test.com',
    role: 'admin',
    isActive: true,
    permissions: []
  },
  superadmin: {
    _id: new mongoose.Types.ObjectId(),
    email: 'superadmin@test.com',
    role: 'superadmin',
    isActive: true,
    permissions: []
  }
};

// Generate JWT tokens for test users
const generateToken = (user) => {
  return jwt.sign(
    { userId: user._id, role: user.role },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '1h' }
  );
};

// Mock auth middleware
const mockAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'test-secret');
    const user = Object.values(testUsers).find(u => u._id.toString() === decoded.userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Test routes
app.get('/test/upload', mockAuth, authorize('upload'), (req, res) => {
  res.json({ success: true, action: 'upload', user: req.user.role });
});

app.get('/test/read-evidence', mockAuth, authorize('read-evidence'), (req, res) => {
  res.json({ success: true, action: 'read-evidence', user: req.user.role });
});

app.get('/test/export', mockAuth, authorize('export'), (req, res) => {
  res.json({ success: true, action: 'export', user: req.user.role });
});

app.get('/test/escalate', mockAuth, authorize('escalate'), (req, res) => {
  res.json({ success: true, action: 'escalate', user: req.user.role });
});

app.get('/test/delete', mockAuth, authorize('delete'), (req, res) => {
  res.json({ success: true, action: 'delete', user: req.user.role });
});

app.get('/test/freeze', mockAuth, authorize('freeze'), (req, res) => {
  res.json({ success: true, action: 'freeze', user: req.user.role });
});

app.get('/test/annotate', mockAuth, authorize('annotate'), (req, res) => {
  res.json({ success: true, action: 'annotate', user: req.user.role });
});

app.get('/test/manage-roles', mockAuth, authorize('manage-roles'), (req, res) => {
  res.json({ success: true, action: 'manage-roles', user: req.user.role });
});

app.get('/test/config', mockAuth, authorize('config'), (req, res) => {
  res.json({ success: true, action: 'config', user: req.user.role });
});

app.get('/test/admin-role', mockAuth, authorizeRole(['admin', 'superadmin']), (req, res) => {
  res.json({ success: true, action: 'admin-role', user: req.user.role });
});

// Test suite
describe('RBAC Endpoint Authorization Tests', () => {
  let userToken, investigatorToken, adminToken, superadminToken;

  beforeAll(() => {
    userToken = generateToken(testUsers.user);
    investigatorToken = generateToken(testUsers.investigator);
    adminToken = generateToken(testUsers.admin);
    superadminToken = generateToken(testUsers.superadmin);
  });

  describe('Upload Permission Tests', () => {
    test('User should be able to upload', async () => {
      const response = await request(app)
        .get('/test/upload')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.action).toBe('upload');
      expect(response.body.user).toBe('user');
    });

    test('Investigator should be able to upload', async () => {
      const response = await request(app)
        .get('/test/upload')
        .set('Authorization', `Bearer ${investigatorToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.user).toBe('investigator');
    });

    test('Admin should be able to upload', async () => {
      const response = await request(app)
        .get('/test/upload')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.user).toBe('admin');
    });

    test('Superadmin should be able to upload', async () => {
      const response = await request(app)
        .get('/test/upload')
        .set('Authorization', `Bearer ${superadminToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.user).toBe('superadmin');
    });
  });

  describe('Read Evidence Permission Tests', () => {
    test('User should NOT be able to read evidence', async () => {
      const response = await request(app)
        .get('/test/read-evidence')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
      
      expect(response.body.error).toBe(true);
      expect(response.body.code).toBe(403);
      expect(response.body.message).toBe('Insufficient permissions');
      expect(response.body.details.requiredActions).toContain('read-evidence');
      expect(response.body.details.userRole).toBe('user');
    });

    test('Investigator should be able to read evidence', async () => {
      const response = await request(app)
        .get('/test/read-evidence')
        .set('Authorization', `Bearer ${investigatorToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.user).toBe('investigator');
    });

    test('Admin should be able to read evidence', async () => {
      const response = await request(app)
        .get('/test/read-evidence')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.user).toBe('admin');
    });

    test('Superadmin should be able to read evidence', async () => {
      const response = await request(app)
        .get('/test/read-evidence')
        .set('Authorization', `Bearer ${superadminToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.user).toBe('superadmin');
    });
  });

  describe('Export Permission Tests', () => {
    test('User should NOT be able to export', async () => {
      const response = await request(app)
        .get('/test/export')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
      
      expect(response.body.error).toBe(true);
      expect(response.body.code).toBe(403);
      expect(response.body.message).toBe('Insufficient permissions');
    });

    test('Investigator should be able to export', async () => {
      const response = await request(app)
        .get('/test/export')
        .set('Authorization', `Bearer ${investigatorToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.user).toBe('investigator');
    });

    test('Admin should be able to export', async () => {
      const response = await request(app)
        .get('/test/export')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.user).toBe('admin');
    });

    test('Superadmin should be able to export', async () => {
      const response = await request(app)
        .get('/test/export')
        .set('Authorization', `Bearer ${superadminToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.user).toBe('superadmin');
    });
  });

  describe('Escalate Permission Tests', () => {
    test('User should NOT be able to escalate', async () => {
      const response = await request(app)
        .get('/test/escalate')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
      
      expect(response.body.error).toBe(true);
      expect(response.body.code).toBe(403);
      expect(response.body.message).toBe('Insufficient permissions');
    });

    test('Investigator should be able to escalate', async () => {
      const response = await request(app)
        .get('/test/escalate')
        .set('Authorization', `Bearer ${investigatorToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.user).toBe('investigator');
    });

    test('Admin should be able to escalate', async () => {
      const response = await request(app)
        .get('/test/escalate')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.user).toBe('admin');
    });

    test('Superadmin should be able to escalate', async () => {
      const response = await request(app)
        .get('/test/escalate')
        .set('Authorization', `Bearer ${superadminToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.user).toBe('superadmin');
    });
  });

  describe('Delete Permission Tests', () => {
    test('User should NOT be able to delete', async () => {
      const response = await request(app)
        .get('/test/delete')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
      
      expect(response.body.error).toBe(true);
      expect(response.body.code).toBe(403);
      expect(response.body.message).toBe('Insufficient permissions');
    });

    test('Investigator should NOT be able to delete', async () => {
      const response = await request(app)
        .get('/test/delete')
        .set('Authorization', `Bearer ${investigatorToken}`)
        .expect(403);
      
      expect(response.body.error).toBe(true);
      expect(response.body.code).toBe(403);
      expect(response.body.message).toBe('Insufficient permissions');
    });

    test('Admin should be able to delete', async () => {
      const response = await request(app)
        .get('/test/delete')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.user).toBe('admin');
    });

    test('Superadmin should be able to delete', async () => {
      const response = await request(app)
        .get('/test/delete')
        .set('Authorization', `Bearer ${superadminToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.user).toBe('superadmin');
    });
  });

  describe('Freeze Permission Tests', () => {
    test('User should NOT be able to freeze', async () => {
      const response = await request(app)
        .get('/test/freeze')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
      
      expect(response.body.error).toBe(true);
      expect(response.body.code).toBe(403);
    });

    test('Investigator should NOT be able to freeze', async () => {
      const response = await request(app)
        .get('/test/freeze')
        .set('Authorization', `Bearer ${investigatorToken}`)
        .expect(403);
      
      expect(response.body.error).toBe(true);
      expect(response.body.code).toBe(403);
    });

    test('Admin should be able to freeze', async () => {
      const response = await request(app)
        .get('/test/freeze')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.user).toBe('admin');
    });

    test('Superadmin should be able to freeze', async () => {
      const response = await request(app)
        .get('/test/freeze')
        .set('Authorization', `Bearer ${superadminToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.user).toBe('superadmin');
    });
  });

  describe('Annotate Permission Tests', () => {
    test('User should NOT be able to annotate', async () => {
      const response = await request(app)
        .get('/test/annotate')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
      
      expect(response.body.error).toBe(true);
      expect(response.body.code).toBe(403);
    });

    test('Investigator should be able to annotate', async () => {
      const response = await request(app)
        .get('/test/annotate')
        .set('Authorization', `Bearer ${investigatorToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.user).toBe('investigator');
    });

    test('Admin should be able to annotate', async () => {
      const response = await request(app)
        .get('/test/annotate')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.user).toBe('admin');
    });

    test('Superadmin should be able to annotate', async () => {
      const response = await request(app)
        .get('/test/annotate')
        .set('Authorization', `Bearer ${superadminToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.user).toBe('superadmin');
    });
  });

  describe('Manage Roles Permission Tests', () => {
    test('User should NOT be able to manage roles', async () => {
      const response = await request(app)
        .get('/test/manage-roles')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
      
      expect(response.body.error).toBe(true);
      expect(response.body.code).toBe(403);
    });

    test('Investigator should NOT be able to manage roles', async () => {
      const response = await request(app)
        .get('/test/manage-roles')
        .set('Authorization', `Bearer ${investigatorToken}`)
        .expect(403);
      
      expect(response.body.error).toBe(true);
      expect(response.body.code).toBe(403);
    });

    test('Admin should be able to manage roles', async () => {
      const response = await request(app)
        .get('/test/manage-roles')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.user).toBe('admin');
    });

    test('Superadmin should be able to manage roles', async () => {
      const response = await request(app)
        .get('/test/manage-roles')
        .set('Authorization', `Bearer ${superadminToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.user).toBe('superadmin');
    });
  });

  describe('Config Permission Tests', () => {
    test('User should NOT be able to access config', async () => {
      const response = await request(app)
        .get('/test/config')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
      
      expect(response.body.error).toBe(true);
      expect(response.body.code).toBe(403);
    });

    test('Investigator should NOT be able to access config', async () => {
      const response = await request(app)
        .get('/test/config')
        .set('Authorization', `Bearer ${investigatorToken}`)
        .expect(403);
      
      expect(response.body.error).toBe(true);
      expect(response.body.code).toBe(403);
    });

    test('Admin should NOT be able to access config', async () => {
      const response = await request(app)
        .get('/test/config')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);
      
      expect(response.body.error).toBe(true);
      expect(response.body.code).toBe(403);
    });

    test('Superadmin should be able to access config', async () => {
      const response = await request(app)
        .get('/test/config')
        .set('Authorization', `Bearer ${superadminToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.user).toBe('superadmin');
    });
  });

  describe('Role-based Authorization Tests', () => {
    test('User should NOT have admin role access', async () => {
      const response = await request(app)
        .get('/test/admin-role')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
      
      expect(response.body.error).toBe(true);
      expect(response.body.code).toBe(403);
      expect(response.body.message).toBe('Insufficient role privileges');
    });

    test('Investigator should NOT have admin role access', async () => {
      const response = await request(app)
        .get('/test/admin-role')
        .set('Authorization', `Bearer ${investigatorToken}`)
        .expect(403);
      
      expect(response.body.error).toBe(true);
      expect(response.body.code).toBe(403);
      expect(response.body.message).toBe('Insufficient role privileges');
    });

    test('Admin should have admin role access', async () => {
      const response = await request(app)
        .get('/test/admin-role')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.user).toBe('admin');
    });

    test('Superadmin should have admin role access', async () => {
      const response = await request(app)
        .get('/test/admin-role')
        .set('Authorization', `Bearer ${superadminToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.user).toBe('superadmin');
    });
  });

  describe('Authentication Tests', () => {
    test('Request without token should return 401', async () => {
      const response = await request(app)
        .get('/test/upload')
        .expect(401);
      
      expect(response.body.error).toBe('No token provided');
    });

    test('Request with invalid token should return 401', async () => {
      const response = await request(app)
        .get('/test/upload')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
      
      expect(response.body.error).toBe('Invalid token');
    });

    test('Request with malformed authorization header should return 401', async () => {
      const response = await request(app)
        .get('/test/upload')
        .set('Authorization', 'invalid-format')
        .expect(401);
      
      expect(response.body.error).toBe('No token provided');
    });
  });

  describe('Response Format Tests', () => {
    test('403 responses should have correct format', async () => {
      const response = await request(app)
        .get('/test/delete')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
      
      expect(response.body).toHaveProperty('error', true);
      expect(response.body).toHaveProperty('code', 403);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('details');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body.details).toHaveProperty('requiredActions');
      expect(response.body.details).toHaveProperty('userRole');
      expect(response.body.details).toHaveProperty('allowedRoles');
    });

    test('401 responses should have correct format', async () => {
      const response = await request(app)
        .get('/test/upload')
        .expect(401);
      
      expect(response.body).toHaveProperty('error', 'No token provided');
    });
  });
});

// Run tests if this file is executed directly
if (require.main === module) {
  const { execSync } = require('child_process');
  
  console.log('🧪 Running RBAC Endpoint Tests...\n');
  
  try {
    execSync('npx jest test-rbac-endpoints.js --verbose', { 
      stdio: 'inherit',
      cwd: __dirname 
    });
    console.log('\n✅ All RBAC tests passed!');
  } catch (error) {
    console.error('\n❌ Some RBAC tests failed!');
    process.exit(1);
  }
}

module.exports = { testUsers, generateToken };
