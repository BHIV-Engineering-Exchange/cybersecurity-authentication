/**
 * BHIV Integration Test Script
 * Tests the BHIV integration endpoints
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5050';

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testEndpoint(method, endpoint, data = null, description) {
  try {
    log(`\n📝 Testing: ${description}`, 'blue');
    log(`   ${method} ${endpoint}`);
    
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      timeout: 5000
    };
    
    if (data) {
      config.data = data;
      config.headers = { 'Content-Type': 'application/json' };
    }
    
    const response = await axios(config);
    
    log('✅ Success!', 'green');
    log(`   Status: ${response.status}`);
    log(`   Response: ${JSON.stringify(response.data, null, 2)}`);
    return true;
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      log('❌ Failed: Server not running', 'red');
      log('   Please start the backend: cd Backend && npm start', 'yellow');
    } else {
      log(`⚠️  Error: ${error.message}`, 'yellow');
      if (error.response) {
        log(`   Status: ${error.response.status}`);
        log(`   Response: ${JSON.stringify(error.response.data, null, 2)}`);
      }
    }
    return false;
  }
}

async function runTests() {
  log('\n========================================', 'blue');
  log('  BHIV Integration Test Suite', 'blue');
  log('========================================', 'blue');
  
  const results = {
    passed: 0,
    failed: 0,
    total: 0
  };
  
  // Test 1: Backend Health Check
  results.total++;
  if (await testEndpoint('GET', '/health', null, 'Backend Health Check')) {
    results.passed++;
  } else {
    results.failed++;
    log('\n⚠️  Backend not running. Please start it first:', 'yellow');
    log('   cd Backend && npm start', 'yellow');
    process.exit(1);
  }
  
  // Test 2: BHIV Core Health Check
  results.total++;
  if (await testEndpoint('GET', '/api/core/health', null, 'BHIV Core Health Check')) {
    results.passed++;
  } else {
    results.failed++;
  }
  
  // Test 3: BHIV Webhooks Health Check
  results.total++;
  if (await testEndpoint('GET', '/api/core-webhooks/health', null, 'BHIV Webhooks Health Check')) {
    results.passed++;
  } else {
    results.failed++;
  }
  
  // Test 4: Accept BHIV Event
  results.total++;
  const eventData = {
    caseId: 'test-case-' + Date.now(),
    evidenceId: 'test-evidence-' + Date.now(),
    riskScore: 85.5,
    actionSuggested: 'escalate',
    txHash: '0xabc123def456',
    metadata: {
      source: 'integration-test',
      timestamp: new Date().toISOString()
    }
  };
  
  if (await testEndpoint('POST', '/api/core/events', eventData, 'Accept BHIV Event')) {
    results.passed++;
  } else {
    results.failed++;
  }
  
  // Test 5: Log Monitoring Event
  results.total++;
  const monitoringEvent = {
    event_type: 'test_event',
    severity: 'info',
    message: 'Integration test monitoring event',
    metadata: {
      test: true,
      timestamp: new Date().toISOString()
    }
  };
  
  if (await testEndpoint('POST', '/api/core-webhooks/monitoring/events', monitoringEvent, 'Log Monitoring Event')) {
    results.passed++;
  } else {
    results.failed++;
  }
  
  // Test 6: Get Monitoring Events
  results.total++;
  if (await testEndpoint('GET', '/api/core-webhooks/monitoring/events', null, 'Get Monitoring Events')) {
    results.passed++;
  } else {
    results.failed++;
  }
  
  // Test Summary
  log('\n========================================', 'blue');
  log('  Test Summary', 'blue');
  log('========================================', 'blue');
  log(`\nTotal Tests: ${results.total}`);
  log(`Passed: ${results.passed}`, 'green');
  log(`Failed: ${results.failed}`, results.failed > 0 ? 'red' : 'green');
  
  if (results.failed > 0) {
    log('\n⚠️  Note: Some failures may be due to Python services not running.', 'yellow');
    log('This is normal - the system will use fallback mode.', 'yellow');
    log('For full features, start Python services:', 'yellow');
    log('  1. cd Backend/core', 'yellow');
    log('  2. python -m uvicorn events.core_events:app --port 8004', 'yellow');
    log('  3. python -m uvicorn events.webhooks:app --port 8005', 'yellow');
  }
  
  log('\n========================================', 'blue');
  
  if (results.passed === results.total) {
    log('✅ All tests passed! BHIV integration is working perfectly!', 'green');
  } else if (results.passed > 0) {
    log('⚠️  Some tests failed, but basic integration is working.', 'yellow');
  } else {
    log('❌ Tests failed. Please check your configuration.', 'red');
  }
  
  log('\n');
}

// Run tests
runTests().catch(error => {
  log(`\n❌ Test suite error: ${error.message}`, 'red');
  process.exit(1);
});

