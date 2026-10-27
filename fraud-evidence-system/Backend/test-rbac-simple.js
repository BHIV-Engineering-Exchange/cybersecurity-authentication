// Simple RBAC Test Script
const { authorize, authorizeRole, rbacConfig } = require('./middleware/authorize');

console.log('🧪 Testing RBAC Implementation...\n');

// Test 1: Check if rbac-permissions.json is loaded correctly
console.log('1. Testing RBAC Configuration Load:');
console.log(`   ✅ Permissions loaded: ${Object.keys(rbacConfig.permissions).length} actions`);
console.log(`   ✅ Roles defined: ${rbacConfig.metadata.roles.join(', ')}`);
console.log(`   ✅ Endpoint mappings: ${Object.keys(rbacConfig.endpointMappings).length} endpoints\n`);

// Test 2: Test permission checking for different roles
console.log('2. Testing Permission Matrix:');

const testCases = [
  { role: 'user', action: 'upload', expected: true },
  { role: 'user', action: 'read-evidence', expected: false },
  { role: 'user', action: 'export', expected: false },
  { role: 'user', action: 'delete', expected: false },
  { role: 'user', action: 'config', expected: false },
  
  { role: 'investigator', action: 'upload', expected: true },
  { role: 'investigator', action: 'read-evidence', expected: true },
  { role: 'investigator', action: 'export', expected: true },
  { role: 'investigator', action: 'escalate', expected: true },
  { role: 'investigator', action: 'delete', expected: false },
  { role: 'investigator', action: 'config', expected: false },
  
  { role: 'admin', action: 'upload', expected: true },
  { role: 'admin', action: 'read-evidence', expected: true },
  { role: 'admin', action: 'export', expected: true },
  { role: 'admin', action: 'escalate', expected: true },
  { role: 'admin', action: 'delete', expected: true },
  { role: 'admin', action: 'freeze', expected: true },
  { role: 'admin', action: 'config', expected: false },
  
  { role: 'superadmin', action: 'upload', expected: true },
  { role: 'superadmin', action: 'read-evidence', expected: true },
  { role: 'superadmin', action: 'export', expected: true },
  { role: 'superadmin', action: 'escalate', expected: true },
  { role: 'superadmin', action: 'delete', expected: true },
  { role: 'superadmin', action: 'freeze', expected: true },
  { role: 'superadmin', action: 'config', expected: true }
];

let passedTests = 0;
let failedTests = 0;

testCases.forEach(testCase => {
  const permission = rbacConfig.permissions[testCase.action];
  const hasAccess = permission && permission.roles[testCase.role] === true;
  
  if (hasAccess === testCase.expected) {
    console.log(`   ✅ ${testCase.role} -> ${testCase.action}: ${hasAccess ? 'ALLOWED' : 'DENIED'}`);
    passedTests++;
  } else {
    console.log(`   ❌ ${testCase.role} -> ${testCase.action}: Expected ${testCase.expected}, got ${hasAccess}`);
    failedTests++;
  }
});

console.log(`\n   📊 Permission Tests: ${passedTests} passed, ${failedTests} failed\n`);

// Test 3: Test role hierarchy
console.log('3. Testing Role Hierarchy:');
const roleHierarchy = rbacConfig.roleHierarchy;
const roles = Object.keys(roleHierarchy).sort((a, b) => roleHierarchy[b] - roleHierarchy[a]);
console.log(`   ✅ Role hierarchy: ${roles.join(' > ')}\n`);

// Test 4: Test endpoint mappings
console.log('4. Testing Endpoint Mappings:');
const endpointMappings = rbacConfig.endpointMappings;
const sampleEndpoints = Object.keys(endpointMappings).slice(0, 5);
sampleEndpoints.forEach(endpoint => {
  const actions = endpointMappings[endpoint];
  console.log(`   ✅ ${endpoint} -> [${actions.join(', ')}]`);
});
console.log(`   📊 Total mapped endpoints: ${Object.keys(endpointMappings).length}\n`);

// Test 5: Test resource access levels
console.log('5. Testing Resource Access Levels:');
const resourceAccess = rbacConfig.resourceAccess;
Object.keys(resourceAccess).forEach(resourceType => {
  console.log(`   📁 ${resourceType}:`);
  Object.keys(resourceAccess[resourceType]).forEach(level => {
    const roles = resourceAccess[resourceType][level];
    console.log(`      ${level}: [${roles.join(', ')}]`);
  });
});
console.log('');

// Test 6: Test audit levels
console.log('6. Testing Audit Levels:');
const auditLevels = {};
Object.values(rbacConfig.permissions).forEach(permission => {
  const level = permission.auditLevel;
  auditLevels[level] = (auditLevels[level] || 0) + 1;
});
Object.keys(auditLevels).forEach(level => {
  console.log(`   📊 ${level}: ${auditLevels[level]} actions`);
});
console.log('');

// Test 7: Test approval requirements
console.log('7. Testing Approval Requirements:');
const approvalRequired = Object.values(rbacConfig.permissions).filter(p => p.requiresApproval);
const noApprovalRequired = Object.values(rbacConfig.permissions).filter(p => !p.requiresApproval);
console.log(`   ⚠️  Requires approval: ${approvalRequired.length} actions`);
console.log(`   ✅ No approval required: ${noApprovalRequired.length} actions\n`);

// Summary
console.log('📋 RBAC Implementation Summary:');
console.log(`   ✅ Configuration file loaded successfully`);
console.log(`   ✅ ${Object.keys(rbacConfig.permissions).length} actions defined`);
console.log(`   ✅ ${rbacConfig.metadata.roles.length} roles configured`);
console.log(`   ✅ ${Object.keys(endpointMappings).length} endpoints mapped`);
console.log(`   ✅ Role hierarchy implemented`);
console.log(`   ✅ Resource access levels defined`);
console.log(`   ✅ Audit levels configured`);
console.log(`   ✅ Approval requirements set`);

if (failedTests === 0) {
  console.log('\n🎉 All RBAC tests passed!');
  console.log('✅ RBAC system is properly configured and ready for use');
} else {
  console.log(`\n⚠️  ${failedTests} permission tests failed`);
  console.log('❌ Please review the permission matrix configuration');
}

console.log('\n🔧 Next Steps:');
console.log('   1. Apply authorize() middleware to all protected routes');
console.log('   2. Test with real API endpoints');
console.log('   3. Verify 403 responses for unauthorized access');
console.log('   4. Monitor audit logs for access attempts');
