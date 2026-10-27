// Backend/test-rbac-e2e.js
// End-to-End RBAC Testing Script

const axios = require('axios');
const { testUsers } = require('./test-users');

// Base URL for API
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5050';
const API = axios.create({ baseURL: BASE_URL });

// Test results storage
const testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  details: []
};

// Helper function to log test results
function logTest(name, passed, message = '') {
  testResults.total++;
  if (passed) {
    testResults.passed++;
    console.log(`✅ PASS: ${name}`);
  } else {
    testResults.failed++;
    console.log(`❌ FAIL: ${name} - ${message}`);
  }
  testResults.details.push({ name, passed, message });
}

// Helper function to authenticate and get token
async function authenticateUser(email, password) {
  try {
    const response = await API.post('/api/auth/login', { email, password });
    return response.data.token;
  } catch (error) {
    console.error(`Authentication failed for ${email}:`, error.response?.data || error.message);
    return null;
  }
}

// Test function for each user role
async function testUserRole(user, token) {
  console.log(`\n🧪 Testing ${user.role} user: ${user.email}`);
  
  // Set authorization header
  API.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  
  // Test 1: Access evidence library
  try {
    const response = await API.get('/api/evidence');
    const canAccess = response.status === 200;
    
    if (user.role === 'admin' || user.role === 'investigator') {
      logTest(`${user.role} - Evidence Library Access`, canAccess, 
        canAccess ? '' : 'Should have access to evidence library');
    } else {
      logTest(`${user.role} - Evidence Library Access`, !canAccess, 
        !canAccess ? '' : 'Should NOT have access to evidence library');
    }
  } catch (error) {
    if (user.role === 'public') {
      logTest(`${user.role} - Evidence Library Access`, true, 'Correctly denied access');
    } else {
      logTest(`${user.role} - Evidence Library Access`, false, 
        `Unexpected error: ${error.response?.data?.error || error.message}`);
    }
  }
  
  // Test 2: Export evidence
  try {
    // Try to access a non-existent evidence item for export test
    await API.get('/api/evidence/export/non-existent-id');
    logTest(`${user.role} - Evidence Export`, user.role !== 'public', 
      user.role !== 'public' ? '' : 'Public user should not be able to export');
  } catch (error) {
    const isForbidden = error.response?.status === 403;
    if (user.role === 'public') {
      logTest(`${user.role} - Evidence Export`, isForbidden, 
        isForbidden ? '' : 'Public user should be forbidden from export');
    } else {
      logTest(`${user.role} - Evidence Export`, !isForbidden, 
        !isForbidden ? '' : 'Should have permission to export evidence');
    }
  }
  
  // Test 3: Admin-only actions
  if (user.role === 'admin') {
    try {
      const response = await API.get('/api/admin/users');
      logTest(`${user.role} - User Management Access`, response.status === 200, 
        response.status === 200 ? '' : 'Admin should have access to user management');
    } catch (error) {
      logTest(`${user.role} - User Management Access`, false, 
        `Admin should have access to user management: ${error.response?.data?.error || error.message}`);
    }
  } else {
    try {
      await API.get('/api/admin/users');
      logTest(`${user.role} - User Management Access`, false, 
        'Non-admin user should not have access to user management');
    } catch (error) {
      const isForbidden = error.response?.status === 403;
      logTest(`${user.role} - User Management Access`, isForbidden, 
        isForbidden ? '' : 'Should be forbidden from user management');
    }
  }
  
  // Test 4: Share evidence
  try {
    await API.post('/api/evidence/share/non-existent-id', { emails: ['test@example.com'] });
    logTest(`${user.role} - Evidence Sharing`, user.role !== 'public', 
      user.role !== 'public' ? '' : 'Public user should not be able to share');
  } catch (error) {
    const isForbidden = error.response?.status === 403;
    if (user.role === 'public') {
      logTest(`${user.role} - Evidence Sharing`, isForbidden, 
        isForbidden ? '' : 'Public user should be forbidden from sharing');
    } else {
      logTest(`${user.role} - Evidence Sharing`, !isForbidden, 
        !isForbidden ? '' : 'Should have permission to share evidence');
    }
  }
}

// Main test function
async function runRBACTests() {
  console.log('🚀 Starting RBAC End-to-End Tests');
  console.log('=====================================');
  
  try {
    // Test each user role
    for (const user of testUsers) {
      const token = await authenticateUser(user.email, user.password);
      if (token) {
        await testUserRole(user, token);
      } else {
        logTest(`${user.role} - Authentication`, false, 'Failed to authenticate');
      }
    }
    
    // Print summary
    console.log('\n📋 Test Results Summary');
    console.log('======================');
    console.log(`Total Tests: ${testResults.total}`);
    console.log(`✅ Passed: ${testResults.passed}`);
    console.log(`❌ Failed: ${testResults.failed}`);
    console.log(`成功率: ${Math.round((testResults.passed / testResults.total) * 100)}%`);
    
    // Print failed tests
    if (testResults.failed > 0) {
      console.log('\n🔧 Failed Tests:');
      testResults.details
        .filter(test => !test.passed)
        .forEach(test => console.log(`  - ${test.name}: ${test.message}`));
    }
    
    // Exit with appropriate code
    process.exit(testResults.failed > 0 ? 1 : 0);
    
  } catch (error) {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  }
}

// Run tests if called directly
if (require.main === module) {
  runRBACTests();
}

module.exports = { runRBACTests, logTest };