#!/usr/bin/env node

const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

// Test configuration
const tests = [
  {
    name: 'Health Check',
    method: 'GET',
    url: '/health',
    expectedStatus: 200
  },
  {
    name: 'Evidence Upload',
    method: 'POST',
    url: '/api/evidence/upload',
    data: {
      caseId: 'case_12345',
      entity: '0x1234567890abcdef',
      description: 'Test evidence upload',
      riskLevel: 'high'
    },
    expectedStatus: 201
  },
  {
    name: 'Evidence Verification',
    method: 'GET',
    url: '/api/evidence/evid_67890/verify',
    expectedStatus: 200
  },
  {
    name: 'List Cases',
    method: 'GET',
    url: '/api/cases?page=1&limit=10',
    expectedStatus: 200
  },
  {
    name: 'Create Case',
    method: 'POST',
    url: '/api/cases',
    data: {
      title: 'Test Case',
      description: 'Test case description',
      entity: '0xabcdef1234567890',
      priority: 'medium'
    },
    expectedStatus: 201
  },
  {
    name: 'Get Case by ID',
    method: 'GET',
    url: '/api/cases/case_12345',
    expectedStatus: 200
  },
  {
    name: 'Update Case',
    method: 'PUT',
    url: '/api/cases/case_12345',
    data: {
      status: 'investigating',
      priority: 'critical'
    },
    expectedStatus: 200
  },
  {
    name: 'RL Prediction',
    method: 'POST',
    url: '/api/rl/predict',
    data: {
      entity: '0x1234567890abcdef',
      features: {
        transactionCount: 150,
        totalVolume: 125000.50,
        avgTransactionSize: 833.33,
        timeSinceFirstTx: 45,
        uniqueCounterparties: 23
      }
    },
    expectedStatus: 200
  },
  {
    name: 'RL Feedback',
    method: 'POST',
    url: '/api/rl/feedback',
    data: {
      predictionId: 'pred_67890',
      feedback: 'correct',
      actualOutcome: 'fraud_confirmed',
      comments: 'Prediction was accurate'
    },
    expectedStatus: 200
  },
  {
    name: 'Escalate Case',
    method: 'POST',
    url: '/api/escalate',
    data: {
      entityId: 'case_12345',
      reason: 'High-risk activity detected',
      priority: 'critical',
      investigatorEmail: 'senior-investigator@example.com'
    },
    expectedStatus: 200
  }
];

async function runTest(test) {
  try {
    console.log(`🧪 Testing: ${test.name}`);
    
    const config = {
      method: test.method,
      url: `${BASE_URL}${test.url}`,
      timeout: 10000
    };
    
    if (test.data) {
      config.data = test.data;
      config.headers = { 'Content-Type': 'application/json' };
    }
    
    const startTime = Date.now();
    const response = await axios(config);
    const endTime = Date.now();
    
    const success = response.status === test.expectedStatus;
    const status = success ? '✅' : '❌';
    
    console.log(`   ${status} Status: ${response.status} (expected: ${test.expectedStatus})`);
    console.log(`   ⏱️  Response time: ${endTime - startTime}ms`);
    
    if (response.data && typeof response.data === 'object') {
      console.log(`   📄 Response keys: ${Object.keys(response.data).join(', ')}`);
    }
    
    return {
      name: test.name,
      success,
      status: response.status,
      expectedStatus: test.expectedStatus,
      responseTime: endTime - startTime,
      response: response.data
    };
    
  } catch (error) {
    const status = error.response?.status || 'ERROR';
    const success = status === test.expectedStatus;
    const statusIcon = success ? '✅' : '❌';
    
    console.log(`   ${statusIcon} Status: ${status} (expected: ${test.expectedStatus})`);
    console.log(`   ❌ Error: ${error.message}`);
    
    return {
      name: test.name,
      success,
      status,
      expectedStatus: test.expectedStatus,
      error: error.message,
      response: error.response?.data
    };
  }
}

async function runAllTests() {
  console.log('🚀 Starting Fraud Evidence Mock Server Tests\n');
  console.log(`📍 Base URL: ${BASE_URL}\n`);
  
  const results = [];
  
  for (const test of tests) {
    const result = await runTest(test);
    results.push(result);
    console.log(''); // Empty line for readability
  }
  
  // Summary
  console.log('📊 Test Summary:');
  console.log('================');
  
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const total = results.length;
  
  console.log(`✅ Passed: ${passed}/${total}`);
  console.log(`❌ Failed: ${failed}/${total}`);
  console.log(`📈 Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
  
  if (failed > 0) {
    console.log('\n❌ Failed Tests:');
    results.filter(r => !r.success).forEach(result => {
      console.log(`   - ${result.name}: ${result.status} (expected: ${result.expectedStatus})`);
    });
  }
  
  console.log('\n🎉 Test run completed!');
  
  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

// Check if server is running
async function checkServer() {
  try {
    await axios.get(`${BASE_URL}/health`, { timeout: 5000 });
    return true;
  } catch (error) {
    return false;
  }
}

async function main() {
  console.log('🔍 Checking if mock server is running...');
  
  const serverRunning = await checkServer();
  
  if (!serverRunning) {
    console.log('❌ Mock server is not running!');
    console.log('Please start the server first:');
    console.log('   docker-compose up -d');
    console.log('   or');
    console.log('   npm start');
    process.exit(1);
  }
  
  console.log('✅ Mock server is running!\n');
  await runAllTests();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { runAllTests, runTest, tests };
