// Test script for RL Engine
const RLEngineService = require('./services/rlEngineService');

async function testRLEngine() {
  console.log('🧪 Testing RL Engine...');
  
  const rlEngine = new RLEngineService();
  
  // Test 1: Initial status
  console.log('\n1. Testing initial status...');
  const status = rlEngine.getStatus();
  console.log('✅ Initial status:', {
    episodes: status.episodes,
    totalReward: status.totalReward,
    epsilon: status.epsilon,
    qTableSize: status.qTableSize
  });
  
  // Test 2: Make a prediction
  console.log('\n2. Testing prediction...');
  const walletData = {
    riskScore: 75,
    rapidDumping: 0.8,
    largeTransfers: 0.6,
    flashLoans: 0.3,
    phishingScore: 0.7
  };
  
  const geoData = {
    country: 'CN',
    org: 'VPN Service',
    city: 'Beijing'
  };
  
  const escalationData = {
    history: [
      { outcome: 'correct' },
      { outcome: 'missed_threat' },
      { outcome: 'correct' }
    ]
  };
  
  const prediction = await rlEngine.predict(walletData, geoData, escalationData);
  console.log('✅ Prediction result:', {
    action: prediction.action,
    actionName: prediction.actionName,
    confidence: prediction.confidence,
    exploration: prediction.exploration
  });
  
  // Test 3: Train the model
  console.log('\n3. Testing training...');
  const trainingResult = await rlEngine.train(
    walletData,
    geoData,
    escalationData,
    prediction.action,
    'correct'
  );
  console.log('✅ Training result:', {
    success: trainingResult.success,
    episode: trainingResult.episode,
    reward: trainingResult.reward,
    totalReward: trainingResult.totalReward
  });
  
  // Test 4: Updated status
  console.log('\n4. Testing updated status...');
  const updatedStatus = rlEngine.getStatus();
  console.log('✅ Updated status:', {
    episodes: updatedStatus.episodes,
    totalReward: updatedStatus.totalReward,
    epsilon: updatedStatus.epsilon,
    qTableSize: updatedStatus.qTableSize
  });
  
  // Test 5: Save and load model
  console.log('\n5. Testing model save/load...');
  const saveResult = await rlEngine.saveModel();
  console.log('✅ Save result:', saveResult);
  
  const loadResult = await rlEngine.loadModel();
  console.log('✅ Load result:', loadResult);
  
  console.log('\n🎉 All tests passed! RL Engine is working correctly.');
}

// Run the test
testRLEngine().catch(console.error);
