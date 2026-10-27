// Backend/test-transaction-endpoint.js
// Test to extract and analyze data from the transaction API endpoint
// http://192.168.0.80:8080/api/transaction-data

require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Log file path
const logFilePath = path.join(logsDir, 'transaction-endpoint-test.log');

// Function to log messages to both console and file
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  console.log(logMessage);
  
  // Append to log file
  fs.appendFileSync(logFilePath, logMessage + '\n');
}

// Function to extract data from the transaction API endpoint
async function extractTransactionData() {
  const apiUrl = 'http://192.168.0.80:8080/api/transaction-data';
  
  const config = {
    timeout: 15000,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Fraud-Evidence-System-Test/1.0'
    }
  };

  try {
    log(`🚀 Starting data extraction from: ${apiUrl}`);
    
    // Measure response time
    const startTime = Date.now();
    const response = await axios.get(apiUrl, config);
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    log(`✅ Request completed in ${responseTime}ms`);
    log(`📋 Response Status: ${response.status}`);
    log(`📏 Response Size: ${JSON.stringify(response.data).length} characters`);
    
    // Check if response is valid
    if (response.status === 200) {
      const data = response.data;
      
      // Log data type and structure
      log(`📦 Data Type: ${Array.isArray(data) ? 'Array' : typeof data}`);
      
      if (Array.isArray(data)) {
        log(`📊 Array Length: ${data.length}`);
        
        // Show sample data if available
        if (data.length > 0) {
          log(`🔍 Sample Data (first 2 items):`);
          const sample = data.slice(0, 2);
          sample.forEach((item, index) => {
            log(`  Item ${index + 1}: ${JSON.stringify(item, null, 2)}`);
          });
          
          // Analyze data structure
          analyzeDataStructure(data);
        } else {
          log(`⚠️  No data returned from API`);
        }
      } else if (data && typeof data === 'object') {
        log(`🔍 Object Keys: ${Object.keys(data).join(', ')}`);
        log(`📝 Object Preview: ${JSON.stringify(data, null, 2)}`);
      } else {
        log(`📄 Raw Data: ${data}`);
      }
      
      // Save full data to file
      const dataFilePath = path.join(logsDir, 'transaction-data.json');
      fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2));
      log(`💾 Full data saved to: ${dataFilePath}`);
      
      return data;
    } else {
      throw new Error(`Unexpected response status: ${response.status}`);
    }
  } catch (error) {
    log(`❌ Error extracting data: ${error.message}`);
    
    if (error.response) {
      log(`📋 Error Response Status: ${error.response.status}`);
      log(`📄 Error Response Data: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    
    throw error;
  }
}

// Function to analyze the data structure
function analyzeDataStructure(data) {
  if (!Array.isArray(data) || data.length === 0) return;
  
  log(`\n📈 Data Structure Analysis:`);
  
  // Get all unique keys from the data
  const allKeys = new Set();
  data.slice(0, 10).forEach(item => {
    if (typeof item === 'object' && item !== null) {
      Object.keys(item).forEach(key => allKeys.add(key));
    }
  });
  
  log(`🔑 Common Fields: ${Array.from(allKeys).join(', ')}`);
  
  // Sample field values
  allKeys.forEach(key => {
    const sampleValues = data
      .slice(0, 5)
      .map(item => item[key])
      .filter(val => val !== undefined);
    
    if (sampleValues.length > 0) {
      const uniqueValues = [...new Set(sampleValues.map(val => 
        typeof val === 'object' ? JSON.stringify(val) : String(val)
      ))];
      log(`  ${key}: ${uniqueValues.slice(0, 3).join(', ')}${uniqueValues.length > 3 ? '...' : ''}`);
    }
  });
}

// Function to test fallback endpoint
async function testFallbackEndpoint() {
  const fallbackUrl = 'http://192.168.0.68:8080/api/transaction-data';
  
  const config = {
    timeout: 15000,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Fraud-Evidence-System-Test/1.0'
    }
  };

  try {
    log(`🔄 Testing fallback endpoint: ${fallbackUrl}`);
    
    const startTime = Date.now();
    const response = await axios.get(fallbackUrl, config);
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    log(`✅ Fallback request completed in ${responseTime}ms`);
    log(`📋 Fallback Response Status: ${response.status}`);
    
    return response.data;
  } catch (error) {
    log(`❌ Error with fallback endpoint: ${error.message}`);
    return null;
  }
}

// Main execution function
async function main() {
  log(`\n========================================`);
  log(` TRANSACTION ENDPOINT TEST`);
  log(`========================================`);
  
  try {
    // Test primary endpoint
    let data;
    try {
      data = await extractTransactionData();
    } catch (primaryError) {
      log(`⚠️ Primary endpoint failed, trying fallback...`);
      data = await testFallbackEndpoint();
      
      if (!data) {
        throw new Error('Both primary and fallback endpoints failed');
      }
    }
    
    log(`\n🎉 Test completed successfully!`);
    log(`📂 Log file: ${logFilePath}`);
    
  } catch (error) {
    log(`\n💥 Test failed: ${error.message}`);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  main();
}

module.exports = { extractTransactionData, testFallbackEndpoint };