// API Data Testing Service - Tests external API integration
const MLDetectionService = require('./services/mlDetectionService');
const axios = require('axios');

class APIDataTester {
  constructor() {
    this.apiUrl = 'http://192.168.0.68:8080/api/transaction-data';
    this.mlService = new MLDetectionService();
  }

  async testAPIConnection() {
    console.log('🧪 Testing External API Connection\n');
    console.log(`📡 Connecting to: ${this.apiUrl}`);
    
    try {
      const startTime = Date.now();
      const response = await axios.get(this.apiUrl, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'API-Data-Tester/1.0'
        }
      });
      
      const responseTime = Date.now() - startTime;
      
      console.log('✅ API Connection Successful!');
      console.log(`- Status: ${response.status} ${response.statusText}`);
      console.log(`- Response Time: ${responseTime}ms`);
      console.log(`- Content Type: ${response.headers['content-type']}`);
      
      if (Array.isArray(response.data)) {
        console.log(`- Data Type: Array`);
        console.log(`- Total Records: ${response.data.length}`);
        
        if (response.data.length > 0) {
          const sample = response.data[0];
          console.log('\n📋 Sample Record Structure:');
          console.log(JSON.stringify(sample, null, 2));
          
          // Validate required fields for ML analysis
          const requiredFields = ['amount', 'from_address', 'to_address', 'timestamp'];
          const missingFields = requiredFields.filter(field => !(field in sample));
          
          if (missingFields.length === 0) {
            console.log('\n✅ Data structure is compatible with ML service');
            return { success: true, data: response.data };
          } else {
            console.log(`\n⚠️ WARNING: Missing required fields: ${missingFields.join(', ')}`);
            return { success: false, error: 'Missing required fields', missingFields };
          }
        } else {
          console.log('\n⚠️ WARNING: API returned empty array');
          return { success: false, error: 'Empty data array' };
        }
      } else {
        console.log('\n❌ ERROR: API response is not an array');
        return { success: false, error: 'Invalid data format' };
      }
      
    } catch (error) {
      console.log('\n❌ API Connection Failed');
      console.log(`- Error: ${error.message}`);
      
      if (error.response) {
        console.log(`- Status: ${error.response.status}`);
        console.log(`- Response: ${JSON.stringify(error.response.data)}`);
      }
      
      if (error.code === 'ECONNREFUSED') {
        console.log('\n💡 Troubleshooting:');
        console.log('1. Check if the API server is running on 192.168.0.68:8080');
        console.log('2. Verify network connectivity to the server');
        console.log('3. Check firewall settings');
      }
      
      return { success: false, error: error.message };
    }
  }

  async testMLIntegration() {
    console.log('\n🤖 Testing ML Service Integration with External API\n');
    
    try {
      // Test data loading
      const data = await this.mlService.loadTransactionData(true); // Force refresh
      
      if (data.length === 0) {
        console.log('❌ No data loaded from API - cannot test ML analysis');
        return false;
      }
      
      console.log(`✅ Successfully loaded ${data.length} transactions`);
      
      // Get a sample address from the data for testing
      const sampleAddress = data[0].from_address;
      console.log(`\n🧪 Testing ML analysis with address: ${sampleAddress.substring(0, 16)}...`);
      
      // Perform ML analysis
      const analysisResult = await this.mlService.analyzeWallet(
        sampleAddress,
        'Testing API integration with real external data',
        'api-tester@system.com'
      );
      
      console.log('\n📊 ML Analysis Results:');
      console.log(`- Risk Score: ${analysisResult.score}`);
      console.log(`- Violation: ${analysisResult.violation}`);
      console.log(`- Recommended Action: ${analysisResult.recommended_action}`);
      console.log(`- Transactions Analyzed: ${analysisResult.transaction_count}`);
      
      if (analysisResult.analysis_details) {
        console.log('\n🔍 Detailed Analysis:');
        console.log(`- Rapid Dumping: ${analysisResult.analysis_details.rapid_dumping?.detected ? '✅ Detected' : '❌ Not detected'}`);
        console.log(`- Large Transfers: ${analysisResult.analysis_details.large_transfers?.detected ? '✅ Detected' : '❌ Not detected'}`);
        console.log(`- Flash Loans: ${analysisResult.analysis_details.flash_loans?.detected ? '✅ Detected' : '❌ Not detected'}`);
        console.log(`- Phishing Indicators: ${analysisResult.analysis_details.phishing_indicators?.detected ? '✅ Detected' : '❌ Not detected'}`);
      }
      
      console.log('\n✅ ML Integration test completed successfully!');
      return true;
      
    } catch (error) {
      console.log('\n❌ ML Integration test failed');
      console.log(`- Error: ${error.message}`);
      return false;
    }
  }

  async runFullTest() {
    console.log('🚀 Starting Full API Data Integration Test\n');
    console.log('='.repeat(60));
    
    // Test 1: API Connection
    const apiTest = await this.testAPIConnection();
    
    console.log('\n' + '='.repeat(60));
    
    if (apiTest.success) {
      // Test 2: ML Integration
      const mlTest = await this.testMLIntegration();
      
      console.log('\n' + '='.repeat(60));
      console.log('\n📋 Test Summary:');
      console.log(`- API Connection: ${apiTest.success ? '✅ PASS' : '❌ FAIL'}`);
      console.log(`- ML Integration: ${mlTest ? '✅ PASS' : '❌ FAIL'}`);
      
      if (apiTest.success && mlTest) {
        console.log('\n🎉 All tests passed! External API integration is working correctly.');
        console.log('✅ The system is now using real-time data from 192.168.0.68:8080/api/transaction-data');
        console.log('✅ ML analysis is functioning with external data source');
      } else {
        console.log('\n⚠️ Some tests failed - check logs above for details');
      }
    } else {
      console.log('\n❌ Cannot proceed with ML testing due to API connection failure');
      console.log('🔄 The system will fall back to backup data if available');
    }
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  const tester = new APIDataTester();
  tester.runFullTest().catch(console.error);
}

module.exports = APIDataTester;