// Test script to verify bhx_transactions.json is loading correctly
const MLDetectionService = require('./services/mlDetectionService');

async function testMLDataLoading() {
  console.log('🧪 Testing ML Detection Service Data Loading...\n');
  
  try {
    // Initialize ML service
    const mlService = new MLDetectionService();
    
    // Check if transaction data is loaded
    console.log('📊 Transaction Data Status:');
    console.log(`- Total transactions loaded: ${mlService.transactionData.length}`);
    console.log(`- Data source: bhx_transactions.json`);
    console.log(`- File location: Backend/bhx_transactions.json`);
    
    if (mlService.transactionData.length > 0) {
      console.log('\n✅ SUCCESS: Transaction data loaded successfully!');
      
      // Show sample transaction
      const sampleTx = mlService.transactionData[0];
      console.log('\n📋 Sample Transaction:');
      console.log(`- Amount: ${sampleTx.amount} ${sampleTx.token}`);
      console.log(`- From: ${sampleTx.from_address.substring(0, 16)}...`);
      console.log(`- To: ${sampleTx.to_address.substring(0, 16)}...`);
      console.log(`- Timestamp: ${new Date(sampleTx.timestamp * 1000).toISOString()}`);
      console.log(`- Status: ${sampleTx.status}`);
      
      // Test wallet analysis with a real address from the data
      console.log('\n🤖 Testing ML Analysis...');
      const testAddress = sampleTx.from_address;
      const analysisResult = await mlService.analyzeWallet(
        testAddress,
        'Testing ML analysis with real transaction data',
        'test@system.com'
      );
      
      console.log(`- Test Address: ${testAddress.substring(0, 16)}...`);
      console.log(`- Risk Score: ${analysisResult.score}`);
      console.log(`- Violation: ${analysisResult.violation}`);
      console.log(`- Recommended Action: ${analysisResult.recommended_action}`);
      console.log(`- Transactions Found: ${analysisResult.transaction_count}`);
      
    } else {
      console.log('\n❌ ERROR: No transaction data loaded!');
      console.log('Please check if bhx_transactions.json exists and contains valid data.');
    }
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.log('\nPossible issues:');
    console.log('1. bhx_transactions.json file not found');
    console.log('2. Invalid JSON format in the file');
    console.log('3. File path incorrect in mlDetectionService.js');
  }
}

// Run the test
testMLDataLoading();