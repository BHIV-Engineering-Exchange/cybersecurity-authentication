// Test script to verify external API endpoint for transaction data
const axios = require('axios');

async function testExternalAPI() {
  console.log('🧪 Testing External API: 192.168.0.68:8080/api/transaction-data\n');
  
  const apiUrl = 'http://192.168.0.68:8080/api/transaction-data';
  
  try {
    console.log('📡 Attempting to connect to external API...');
    console.log(`- URL: ${apiUrl}`);
    
    const response = await axios.get(apiUrl, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Fraud-Detection-System/1.0'
      },
      timeout: 10000 // 10 second timeout
    });
    
    console.log(`- Status: ${response.status} ${response.statusText}`);
    
    if (response.status === 200) {
      const data = response.data;
      
      console.log('\n✅ SUCCESS: External API is accessible!');
      console.log(`- Response Type: ${typeof data}`);
      console.log(`- Is Array: ${Array.isArray(data)}`);
      
      if (Array.isArray(data) && data.length > 0) {
        console.log(`- Total Transactions: ${data.length}`);
        
        // Show sample transaction structure
        const sampleTx = data[0];
        console.log('\n📋 Sample Transaction Structure:');
        console.log(JSON.stringify(sampleTx, null, 2));
        
        // Validate transaction data structure
        console.log('\n🔍 Data Validation:');
        const requiredFields = ['amount', 'from_address', 'to_address', 'timestamp'];
        const hasRequiredFields = requiredFields.every(field => sampleTx.hasOwnProperty(field));
        
        console.log(`- Has required fields: ${hasRequiredFields}`);
        console.log(`- Required fields: ${requiredFields.join(', ')}`);
        
        if (hasRequiredFields) {
          console.log('\n✅ Data structure is compatible with ML service!');
          
          // Show data statistics
          console.log('\n📊 Data Statistics:');
          const amounts = data.map(tx => tx.amount).filter(amt => typeof amt === 'number');
          const avgAmount = amounts.reduce((sum, amt) => sum + amt, 0) / amounts.length;
          const maxAmount = Math.max(...amounts);
          const minAmount = Math.min(...amounts);
          
          console.log(`- Average Amount: ${avgAmount.toFixed(2)}`);
          console.log(`- Max Amount: ${maxAmount}`);
          console.log(`- Min Amount: ${minAmount}`);
          console.log(`- Unique Addresses: ${new Set([...data.map(tx => tx.from_address), ...data.map(tx => tx.to_address)]).size}`);
          
        } else {
          console.log('\n⚠️ WARNING: Data structure may need adaptation for ML service');
        }
        
      } else {
        console.log('\n⚠️ WARNING: API response is not an array or is empty');
      }
      
    } else {
      console.log('\n❌ ERROR: API request failed');
      console.log(`- Status: ${response.status}`);
      console.log(`- Status Text: ${response.statusText}`);
    }
    
  } catch (error) {
    console.log('\n❌ ERROR: Cannot connect to external API');
    console.log(`- Error Type: ${error.name}`);
    console.log(`- Error Message: ${error.message}`);
    
    if (error.response) {
      console.log(`- Response Status: ${error.response.status}`);
      console.log(`- Response Data: ${JSON.stringify(error.response.data)}`);
    }
    
    if (error.code === 'ECONNREFUSED' || error.code === 'ECONNABORTED') {
      console.log('\n💡 Possible Issues:');
      console.log('1. API server is not running on 192.168.0.68:8080');
      console.log('2. Network connectivity issues');
      console.log('3. Firewall blocking the connection');
      console.log('4. IP address or port is incorrect');
    } else if (error.code === 'ENOTFOUND') {
      console.log('\n💡 Possible Issues:');
      console.log('1. IP address 192.168.0.68 is not reachable');
      console.log('2. DNS resolution issues');
      console.log('3. Network configuration problems');
    }
    
    return false;
  }
  
  return true;
}

// Run the test
testExternalAPI().then(success => {
  if (success) {
    console.log('\n🎉 External API test completed successfully!');
    console.log('✅ Ready to replace bhx_transactions.json with real API data');
  } else {
    console.log('\n⚠️ External API test failed');
    console.log('❌ Cannot proceed with API integration');
  }
});