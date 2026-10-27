// RBAC Testing Script - Comprehensive role and permission verification
const User = require('./models/User');
const mongoose = require('mongoose');

class RBACTester {
  constructor() {
    this.testResults = {
      passed: 0,
      failed: 0,
      details: []
    };
  }

  async connectDB() {
    try {
      await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/fraudDB');
      console.log('✅ Connected to MongoDB for RBAC testing');
      return true;
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      return false;
    }
  }

  async disconnectDB() {
    await mongoose.disconnect();
    console.log('📤 Disconnected from MongoDB');
  }

  logTest(testName, passed, message) {
    const result = { testName, passed, message, timestamp: new Date() };
    this.testResults.details.push(result);
    
    if (passed) {
      this.testResults.passed++;
      console.log(`✅ ${testName}: ${message}`);
    } else {
      this.testResults.failed++;
      console.log(`❌ ${testName}: ${message}`);
    }
  }

  async setupTestUsers() {
    console.log('🔧 Setting up test users...');

    // Clean up existing test users
    await User.deleteMany({ email: { $regex: /test-.*@rbac-test\.com/ } });

    // Create test users for different roles
    const testUsers = [
      {
        email: 'test-admin@rbac-test.com',
        password: 'test123',
        role: 'admin',
        firstName: 'Test',
        lastName: 'Admin',
        isActive: true
      },
      {
        email: 'test-investigator@rbac-test.com', 
        password: 'test123',
        role: 'investigator',
        firstName: 'Test',
        lastName: 'Investigator',
        isActive: true
      },
      {
        email: 'test-public@rbac-test.com',
        password: 'test123', 
        role: 'public',
        firstName: 'Test',
        lastName: 'Public',
        isActive: true
      },
      {
        email: 'test-inactive@rbac-test.com',
        password: 'test123',
        role: 'investigator', 
        firstName: 'Test',
        lastName: 'Inactive',
        isActive: false
      }
    ];

    const createdUsers = {};
    for (const userData of testUsers) {
      const user = new User(userData);
      user.setRolePermissions(); // This will be called by pre-save hook
      await user.save();
      createdUsers[userData.role + (userData.isActive ? '' : '_inactive')] = user;
      console.log(`👤 Created ${userData.role} user: ${userData.email}`);
    }

    return createdUsers;
  }

  async testRolePermissions(users) {
    console.log('\\n🧪 Testing Role-Based Permissions...');

    // Test Admin Permissions
    const admin = users.admin;
    this.logTest(
      'Admin viewEvidence Permission',
      admin.hasPermission('viewEvidence'),
      'Admin should have view evidence permission'
    );
    this.logTest(
      'Admin shareEvidence Permission',
      admin.hasPermission('shareEvidence'),
      'Admin should have share evidence permission'
    );
    this.logTest(
      'Admin deleteEvidence Permission', 
      admin.hasPermission('deleteEvidence'),
      'Admin should have delete evidence permission'
    );
    this.logTest(
      'Admin exportEvidence Permission',
      admin.hasPermission('exportEvidence'),
      'Admin should have export evidence permission'
    );
    this.logTest(
      'Admin manageRoles Permission',
      admin.hasPermission('manageRoles'),
      'Admin should have manage roles permission'
    );

    // Test Investigator Permissions
    const investigator = users.investigator;
    this.logTest(
      'Investigator viewEvidence Permission',
      investigator.hasPermission('viewEvidence'),
      'Investigator should have view evidence permission'
    );
    this.logTest(
      'Investigator shareEvidence Permission',
      investigator.hasPermission('shareEvidence'),
      'Investigator should have share evidence permission'
    );
    this.logTest(
      'Investigator deleteEvidence Permission',
      !investigator.hasPermission('deleteEvidence'),
      'Investigator should NOT have delete evidence permission'
    );
    this.logTest(
      'Investigator exportEvidence Permission',
      investigator.hasPermission('exportEvidence'),
      'Investigator should have export evidence permission'
    );
    this.logTest(
      'Investigator manageRoles Permission',
      !investigator.hasPermission('manageRoles'),
      'Investigator should NOT have manage roles permission'
    );

    // Test Public User Permissions
    const publicUser = users.public;
    this.logTest(
      'Public viewEvidence Permission',
      !publicUser.hasPermission('viewEvidence'),
      'Public user should NOT have view evidence permission'
    );
    this.logTest(
      'Public shareEvidence Permission',
      !publicUser.hasPermission('shareEvidence'),
      'Public user should NOT have share evidence permission'
    );
    this.logTest(
      'Public deleteEvidence Permission',
      !publicUser.hasPermission('deleteEvidence'),
      'Public user should NOT have delete evidence permission'
    );
  }

  async testEvidenceLibraryAccess(users) {
    console.log('\\n🔍 Testing Evidence Library Access...');

    // Test admin access
    this.logTest(
      'Admin Evidence Library Access',
      users.admin.canAccessEvidenceLibrary(),
      'Admin should have evidence library access'
    );

    // Test investigator access  
    this.logTest(
      'Investigator Evidence Library Access',
      users.investigator.canAccessEvidenceLibrary(),
      'Investigator should have evidence library access'
    );

    // Test public access
    this.logTest(
      'Public Evidence Library Access',
      !users.public.canAccessEvidenceLibrary(),
      'Public user should NOT have evidence library access'
    );

    // Test inactive user access
    this.logTest(
      'Inactive User Evidence Library Access',
      !users.investigator_inactive.canAccessEvidenceLibrary(),
      'Inactive user should NOT have evidence library access'
    );
  }

  async testUserActivation(users) {
    console.log('\\n⚡ Testing User Activation Status...');

    this.logTest(
      'Admin Active Status',
      users.admin.isActive,
      'Admin should be active'
    );

    this.logTest(
      'Investigator Active Status',
      users.investigator.isActive,
      'Investigator should be active'
    );

    this.logTest(
      'Inactive User Status',
      !users.investigator_inactive.isActive,
      'Inactive user should be inactive'
    );
  }

  async testRoleSpecificBehavior(users) {
    console.log('\\n🎭 Testing Role-Specific Behavior...');

    // Test role assignments
    this.logTest(
      'Admin Role Assignment',
      users.admin.role === 'admin',
      'Admin user should have admin role'
    );

    this.logTest(
      'Investigator Role Assignment', 
      users.investigator.role === 'investigator',
      'Investigator user should have investigator role'
    );

    this.logTest(
      'Public Role Assignment',
      users.public.role === 'public',
      'Public user should have public role'
    );

    // Test permission inheritance
    const adminPermissionCount = Object.values(users.admin.permissions).filter(p => p).length;
    const investigatorPermissionCount = Object.values(users.investigator.permissions).filter(p => p).length;
    const publicPermissionCount = Object.values(users.public.permissions).filter(p => p).length;

    this.logTest(
      'Admin Permission Count',
      adminPermissionCount > investigatorPermissionCount,
      `Admin should have more permissions than investigator (${adminPermissionCount} vs ${investigatorPermissionCount})`
    );

    this.logTest(
      'Investigator Permission Count',
      investigatorPermissionCount > publicPermissionCount,
      `Investigator should have more permissions than public (${investigatorPermissionCount} vs ${publicPermissionCount})`
    );
  }

  async mockAPIEndpointTests() {
    console.log('\\n🌐 Testing API Endpoint Access Simulation...');

    // Simulate middleware behavior
    const testEndpoints = [
      { path: '/api/evidence', method: 'GET', requiredRole: ['admin', 'investigator'] },
      { path: '/api/evidence/share', method: 'POST', requiredRole: ['admin', 'investigator'] },
      { path: '/api/evidence/delete', method: 'DELETE', requiredRole: ['admin'] },
      { path: '/api/evidence/export', method: 'GET', requiredRole: ['admin', 'investigator'] },
      { path: '/api/admin/users', method: 'GET', requiredRole: ['admin'] }
    ];

    const users = await User.find({ email: { $regex: /test-.*@rbac-test\.com/ } });
    const usersByRole = {};
    users.forEach(user => {
      usersByRole[user.role + (user.isActive ? '' : '_inactive')] = user;
    });

    for (const endpoint of testEndpoints) {
      for (const [roleKey, user] of Object.entries(usersByRole)) {
        if (!user.isActive) {
          this.logTest(
            `${endpoint.path} Access (${roleKey})`,
            false,
            `Inactive user should be denied access to ${endpoint.path}`
          );
          continue;
        }

        const hasAccess = endpoint.requiredRole.includes(user.role);
        this.logTest(
          `${endpoint.path} Access (${user.role})`,
          hasAccess,
          hasAccess 
            ? `${user.role} should have access to ${endpoint.path}`
            : `${user.role} should be denied access to ${endpoint.path}`
        );
      }
    }
  }

  async runAllTests() {
    console.log('🚀 Starting RBAC Comprehensive Testing...\\n');
    console.log('=' .repeat(80));

    if (!(await this.connectDB())) {
      return false;
    }

    try {
      // Setup
      const users = await this.setupTestUsers();

      // Run test suites
      await this.testRolePermissions(users);
      await this.testEvidenceLibraryAccess(users);
      await this.testUserActivation(users);
      await this.testRoleSpecificBehavior(users);
      await this.mockAPIEndpointTests();

      // Generate report
      this.generateTestReport();

      // Cleanup
      await User.deleteMany({ email: { $regex: /test-.*@rbac-test\.com/ } });
      console.log('🧹 Cleaned up test users');

      return true;

    } catch (error) {
      console.error('❌ Testing failed:', error);
      return false;
    } finally {
      await this.disconnectDB();
    }
  }

  generateTestReport() {
    console.log('\\n' + '='.repeat(80));
    console.log('📊 RBAC TEST REPORT');
    console.log('='.repeat(80));
    
    console.log(`\\n✅ Tests Passed: ${this.testResults.passed}`);
    console.log(`❌ Tests Failed: ${this.testResults.failed}`);
    console.log(`📈 Success Rate: ${((this.testResults.passed / (this.testResults.passed + this.testResults.failed)) * 100).toFixed(1)}%`);
    
    if (this.testResults.failed > 0) {
      console.log('\\n❌ Failed Tests:');
      this.testResults.details
        .filter(test => !test.passed)
        .forEach(test => {
          console.log(`   - ${test.testName}: ${test.message}`);
        });
    }

    console.log('\\n🎯 Test Categories Summary:');
    const categories = {};
    this.testResults.details.forEach(test => {
      const category = test.testName.split(' ')[0];
      if (!categories[category]) {
        categories[category] = { passed: 0, failed: 0 };
      }
      categories[category][test.passed ? 'passed' : 'failed']++;
    });

    Object.entries(categories).forEach(([category, results]) => {
      const total = results.passed + results.failed;
      const rate = ((results.passed / total) * 100).toFixed(1);
      console.log(`   ${category}: ${results.passed}/${total} (${rate}%)`);
    });

    console.log('\\n' + '='.repeat(80));
    
    if (this.testResults.failed === 0) {
      console.log('🎉 All RBAC tests passed! System is ready for production.');
    } else {
      console.log('⚠️  Some tests failed. Please review the RBAC implementation.');
    }
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  require('dotenv').config();
  
  const tester = new RBACTester();
  tester.runAllTests().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Fatal testing error:', error);
    process.exit(1);
  });
}

module.exports = RBACTester;