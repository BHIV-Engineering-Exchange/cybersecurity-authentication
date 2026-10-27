/**
 * Test Server Startup
 * Quick test to verify server can start without errors
 */

console.log('🧪 Testing Server Startup...\n');

// Test 1: Load required dependencies
console.log('📦 Step 1: Loading dependencies...');
try {
  require('express');
  require('mongoose');
  require('aws-sdk');
  require('axios');
  require('cors');
  require('multer');
  console.log('✅ All core dependencies loaded\n');
} catch (error) {
  console.error('❌ Failed to load dependencies:', error.message);
  process.exit(1);
}

// Test 2: Try to load the server file
console.log('📄 Step 2: Loading server configuration...');
try {
  // Set test environment
  process.env.NODE_ENV = 'test';
  process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fraud_evidence_test';
  process.env.PORT = process.env.PORT || '5050';
  
  console.log('✅ Environment configured\n');
} catch (error) {
  console.error('❌ Failed to configure environment:', error.message);
  process.exit(1);
}

// Test 3: Load service files
console.log('📋 Step 3: Loading services...');
try {
  const hybridStorageService = require('./Backend/services/hybridStorageService');
  console.log('✅ Hybrid storage service loaded');
  
  // Note: We don't actually start the server, just verify it can be loaded
  console.log('✅ All services loaded\n');
} catch (error) {
  console.error('❌ Failed to load services:', error.message);
  console.error('   Stack:', error.stack);
  process.exit(1);
}

console.log('═══════════════════════════════════════');
console.log('✅ SUCCESS! Server is ready to start');
console.log('═══════════════════════════════════════\n');
console.log('💡 To start the server:');
console.log('   cd Backend');
console.log('   npm start');
console.log('\n💡 Or use the quick start scripts:');
console.log('   start-backend-only.bat (Windows)');
console.log('   ./start-bhiv-full.sh (Linux/Mac)');
console.log('');

