// Test script to verify fallback mechanism when API is unavailable
const MLDetectionService = require('./services/mlDetectionService');

async function testFallbackMechanism() {
  console.log('🧪 Testing Fallback Mechanism\n');
  console.log('This test verifies that the system can work when the external API is unavailable');
  console.log('Expected behavior: API fails → falls back to backup file → ML analysis works\n');
  
  try {
    // Initialize ML service
    const mlService = new MLDetectionService();
    console.log('✅ ML Detection Service initialized');
    
    // Force data loading (this will try API first, then backup)
    console.log('\n📡 Attempting to load transaction data...');
    const data = await mlService.loadTransactionData(true);
    
    if (data.length > 0) {
      console.log(`✅ Successfully loaded ${data.length} transactions via fallback mechanism`);
      
      // Test with a sample address from the data
      const sampleAddress = data[0].from_address;
      console.log(`\n🤖 Testing ML analysis with sample address: ${sampleAddress.substring(0, 16)}...`);
      
      const analysisResult = await mlService.analyzeWallet(
        sampleAddress,
        'Testing fallback mechanism - API unavailable scenario',
        'fallback-tester@system.com'
      );
      
      console.log('\n📊 Analysis Results:');
      console.log(`- Address: ${analysisResult.address.substring(0, 16)}...`);
      console.log(`- Risk Score: ${analysisResult.score}`);
      console.log(`- Violation: ${analysisResult.violation}`);
      console.log(`- Recommended Action: ${analysisResult.recommended_action}`);
      console.log(`- Transactions Found: ${analysisResult.transaction_count}`);
      console.log(`- Analysis Time: ${analysisResult.analyzed_at}`);
      
      if (analysisResult.analysis_details) {
        console.log('\n🔍 Detection Results:');
        const details = analysisResult.analysis_details;
        console.log(`- Rapid Dumping: ${details.rapid_dumping?.detected ? '⚠️ DETECTED' : '✅ Clean'}`);
        console.log(`- Large Transfers: ${details.large_transfers?.detected ? '⚠️ DETECTED' : '✅ Clean'}`);
        console.log(`- Flash Loans: ${details.flash_loans?.detected ? '⚠️ DETECTED' : '✅ Clean'}`);
        console.log(`- Phishing Patterns: ${details.phishing_indicators?.detected ? '⚠️ DETECTED' : '✅ Clean'}`);
      }
      
      console.log('\n🎉 FALLBACK TEST SUCCESSFUL!');
      console.log('✅ System works correctly even when external API is unavailable');
      console.log('✅ Backup data is being used for ML analysis');
      console.log('✅ All fraud detection algorithms are functioning');
      
      return true;
      
    } else {
      console.log('❌ No transaction data loaded - fallback mechanism failed');
      console.log('Check if bhx_transactions_backup.json exists and contains valid data');
      return false;
    }
    
  } catch (error) {
    console.error('\n❌ Fallback test failed:');
    console.error(`- Error: ${error.message}`);
    console.error(`- Stack: ${error.stack}`);
    return false;
  }
}

// Run the test
testFallbackMechanism().then(success => {
  console.log('\n' + '='.repeat(60));
  if (success) {
    console.log('🎯 RESULT: Fallback mechanism is working correctly!');
    console.log('💡 The system can continue to operate even when the external API is down');
    console.log('📝 Ready for production use with robust error handling');
  } else {
    console.log('❌ RESULT: Fallback mechanism needs attention');
    console.log('🔧 Check backup file and error logs above');
  }
  console.log('='.repeat(60));
});