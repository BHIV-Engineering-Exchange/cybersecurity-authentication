// Test script to verify 403 responses for unauthorized requests
const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

// Mock app setup
const app = express();
app.use(express.json());

// Import middleware
const { authorize, authorizeRole } = require('./middleware/authorize');

// Test users with different roles
const testUsers = {
  user: {
    _id: new mongoose.Types.ObjectId(),
    email: 'user@test.com',
    role: 'user',
    isActive: true
  },
  investigator: {
    _id: new mongoose.Types.ObjectId(),
    email: 'investigator@test.com',
    role: 'investigator',
    isActive: true
  },
  admin: {
    _id: new mongoose.Types.ObjectId(),
    email: 'admin@test.com',
    role: 'admin',
    isActive: true
  },
  superadmin: {
    _id: new mongoose.Types.ObjectId(),
    email: 'superadmin@test.com',
    role: 'superadmin',
    isActive: true
  }
};

// Mock User model
const mockUser = {
  findById: jest.fn().mockImplementation((id) => {
    const user = Object.values(testUsers).find(u => u._id.toString() === id);
    return Promise.resolve(user);
  })
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

// Test routes for different permission levels
app.get('/test/upload', mockAuth, authorize('upload'), (req, res) => {
  res.json({ success: true, action: 'upload' });
});

app.get('/test/read-evidence', mockAuth, authorize('read-evidence'), (req, res) => {
  res.json({ success: true, action: 'read-evidence' });
});

app.get('/test/export', mockAuth, authorize('export'), (req, res) => {
  res.json({ success: true, action: 'export' });
});

app.get('/test/escalate', mockAuth, authorize('escalate'), (req, res) => {
  res.json({ success: true, action: 'escalate' });
});

app.get('/test/freeze', mockAuth, authorize('freeze'), (req, res) => {
  res.json({ success: true, action: 'freeze' });
});

app.get('/test/delete', mockAuth, authorize('delete'), (req, res) => {
  res.json({ success: true, action: 'delete' });
});

app.get('/test/annotate', mockAuth, authorize('annotate'), (req, res) => {
  res.json({ success: true, action: 'annotate' });
});

app.get('/test/manage-roles', mockAuth, authorize('manage-roles'), (req, res) => {
  res.json({ success: true, action: 'manage-roles' });
});

app.get('/test/config', mockAuth, authorize('config'), (req, res) => {
  res.json({ success: true, action: 'config' });
});

// Generate JWT tokens
const generateToken = (user) => {
  return jwt.sign(
    { userId: user._id, role: user.role },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '1h' }
  );
};

// Test cases for 403 responses
const testCases = [
  {
    name: 'User trying to read evidence',
    endpoint: '/test/read-evidence',
    userRole: 'user',
    expectedStatus: 403,
    expectedMessage: 'Insufficient permissions'
  },
  {
    name: 'User trying to export',
    endpoint: '/test/export',
    userRole: 'user',
    expectedStatus: 403,
    expectedMessage: 'Insufficient permissions'
  },
  {
    name: 'User trying to escalate',
    endpoint: '/test/escalate',
    userRole: 'user',
    expectedStatus: 403,
    expectedMessage: 'Insufficient permissions'
  },
  {
    name: 'User trying to freeze',
    endpoint: '/test/freeze',
    userRole: 'user',
    expectedStatus: 403,
    expectedMessage: 'Insufficient permissions'
  },
  {
    name: 'User trying to delete',
    endpoint: '/test/delete',
    userRole: 'user',
    expectedStatus: 403,
    expectedMessage: 'Insufficient permissions'
  },
  {
    name: 'User trying to annotate',
    endpoint: '/test/annotate',
    userRole: 'user',
    expectedStatus: 403,
    expectedMessage: 'Insufficient permissions'
  },
  {
    name: 'User trying to manage roles',
    endpoint: '/test/manage-roles',
    userRole: 'user',
    expectedStatus: 403,
    expectedMessage: 'Insufficient permissions'
  },
  {
    name: 'User trying to access config',
    endpoint: '/test/config',
    userRole: 'user',
    expectedStatus: 403,
    expectedMessage: 'Insufficient permissions'
  },
  {
    name: 'Investigator trying to freeze',
    endpoint: '/test/freeze',
    userRole: 'investigator',
    expectedStatus: 403,
    expectedMessage: 'Insufficient permissions'
  },
  {
    name: 'Investigator trying to delete',
    endpoint: '/test/delete',
    userRole: 'investigator',
    expectedStatus: 403,
    expectedMessage: 'Insufficient permissions'
  },
  {
    name: 'Investigator trying to manage roles',
    endpoint: '/test/manage-roles',
    userRole: 'investigator',
    expectedStatus: 403,
    expectedMessage: 'Insufficient permissions'
  },
  {
    name: 'Investigator trying to access config',
    endpoint: '/test/config',
    userRole: 'investigator',
    expectedStatus: 403,
    expectedMessage: 'Insufficient permissions'
  },
  {
    name: 'Admin trying to access config',
    endpoint: '/test/config',
    userRole: 'admin',
    expectedStatus: 403,
    expectedMessage: 'Insufficient permissions'
  }
];

// Test function
async function test403Responses() {
  console.log('🧪 Testing 403 responses for unauthorized requests...\n');
  
  let passedTests = 0;
  let failedTests = 0;
  
  for (const testCase of testCases) {
    try {
      const user = testUsers[testCase.userRole];
      const token = generateToken(user);
      
      const response = await request(app)
        .get(testCase.endpoint)
        .set('Authorization', `Bearer ${token}`);
      
      // Check status code
      if (response.status !== testCase.expectedStatus) {
        console.log(`❌ ${testCase.name}: Expected status ${testCase.expectedStatus}, got ${response.status}`);
        failedTests++;
        continue;
      }
      
      // Check response format
      if (!response.body.error || response.body.code !== 403) {
        console.log(`❌ ${testCase.name}: Invalid response format`);
        console.log(`   Expected: { error: true, code: 403, message: "${testCase.expectedMessage}" }`);
        console.log(`   Got: ${JSON.stringify(response.body)}`);
        failedTests++;
        continue;
      }
      
      // Check message
      if (response.body.message !== testCase.expectedMessage) {
        console.log(`❌ ${testCase.name}: Expected message "${testCase.expectedMessage}", got "${response.body.message}"`);
        failedTests++;
        continue;
      }
      
      // Check required fields
      const requiredFields = ['error', 'code', 'message', 'details', 'timestamp'];
      const missingFields = requiredFields.filter(field => !(field in response.body));
      
      if (missingFields.length > 0) {
        console.log(`❌ ${testCase.name}: Missing required fields: ${missingFields.join(', ')}`);
        failedTests++;
        continue;
      }
      
      // Check details object
      if (!response.body.details || typeof response.body.details !== 'object') {
        console.log(`❌ ${testCase.name}: Missing or invalid details object`);
        failedTests++;
        continue;
      }
      
      const requiredDetailsFields = ['requiredActions', 'userRole', 'allowedRoles'];
      const missingDetailsFields = requiredDetailsFields.filter(field => !(field in response.body.details));
      
      if (missingDetailsFields.length > 0) {
        console.log(`❌ ${testCase.name}: Missing required details fields: ${missingDetailsFields.join(', ')}`);
        failedTests++;
        continue;
      }
      
      console.log(`✅ ${testCase.name}: Correct 403 response`);
      passedTests++;
      
    } catch (error) {
      console.log(`❌ ${testCase.name}: Test failed with error: ${error.message}`);
      failedTests++;
    }
  }
  
  console.log(`\n📊 Test Results:`);
  console.log(`   ✅ Passed: ${passedTests}`);
  console.log(`   ❌ Failed: ${failedTests}`);
  console.log(`   📈 Success Rate: ${((passedTests / (passedTests + failedTests)) * 100).toFixed(1)}%`);
  
  if (failedTests === 0) {
    console.log('\n🎉 All 403 response tests passed!');
    return true;
  } else {
    console.log('\n💥 Some 403 response tests failed!');
    return false;
  }
}

// Test specific response format
async function testResponseFormat() {
  console.log('\n🔍 Testing specific 403 response format...\n');
  
  const user = testUsers.user;
  const token = generateToken(user);
  
  try {
    const response = await request(app)
      .get('/test/delete')
      .set('Authorization', `Bearer ${token}`);
    
    console.log('Response Status:', response.status);
    console.log('Response Body:', JSON.stringify(response.body, null, 2));
    
    // Verify exact format
    const expectedFormat = {
      error: true,
      code: 403,
      message: 'Insufficient permissions',
      details: {
        requiredActions: ['delete'],
        userRole: 'user',
        allowedRoles: ['admin', 'superadmin']
      },
      timestamp: expect.any(String)
    };
    
    // Check each field
    const checks = [
      { field: 'error', expected: true, actual: response.body.error },
      { field: 'code', expected: 403, actual: response.body.code },
      { field: 'message', expected: 'Insufficient permissions', actual: response.body.message },
      { field: 'details.requiredActions', expected: ['delete'], actual: response.body.details?.requiredActions },
      { field: 'details.userRole', expected: 'user', actual: response.body.details?.userRole },
      { field: 'details.allowedRoles', expected: ['admin', 'superadmin'], actual: response.body.details?.allowedRoles },
      { field: 'timestamp', expected: 'string', actual: typeof response.body.timestamp }
    ];
    
    let allChecksPassed = true;
    
    for (const check of checks) {
      if (JSON.stringify(check.expected) !== JSON.stringify(check.actual)) {
        console.log(`❌ ${check.field}: Expected ${JSON.stringify(check.expected)}, got ${JSON.stringify(check.actual)}`);
        allChecksPassed = false;
      } else {
        console.log(`✅ ${check.field}: Correct`);
      }
    }
    
    if (allChecksPassed) {
      console.log('\n✅ Response format is correct!');
      return true;
    } else {
      console.log('\n❌ Response format has issues!');
      return false;
    }
    
  } catch (error) {
    console.log(`❌ Format test failed: ${error.message}`);
    return false;
  }
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting RBAC 403 Response Tests\n');
  console.log('=' .repeat(50));
  
  const test1Passed = await test403Responses();
  const test2Passed = await testResponseFormat();
  
  console.log('\n' + '=' .repeat(50));
  
  if (test1Passed && test2Passed) {
    console.log('🎉 All RBAC 403 response tests passed!');
    console.log('✅ Unauthorized requests return proper 403 responses with correct format');
    process.exit(0);
  } else {
    console.log('💥 Some RBAC 403 response tests failed!');
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
}

module.exports = { test403Responses, testResponseFormat, testCases };
