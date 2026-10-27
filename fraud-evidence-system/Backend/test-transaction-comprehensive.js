// Backend/test-transaction-comprehensive.js
// Comprehensive test suite for transaction data extraction and analysis

require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { expect } = require('chai');

// Test configuration
const CONFIG = {
  primaryEndpoint: 'http://192.168.0.80:8080/api/transaction-data',
  fallbackEndpoint: 'http://192.168.0.68:8080/api/transaction-data',
  timeout: 15000,
  maxRetries: 3,
  retryDelay: 1000
};

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Logger class
class TransactionTestLogger {
  constructor() {
    this.logFilePath = path.join(logsDir, 'transaction-comprehensive-test.log');
  }
  
  log(message, type = 'INFO') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${type}] ${message}`;
    console.log(logMessage);
    
    // Append to log file
    fs.appendFileSync(this.logFilePath, logMessage + '\n');
  }
  
  error(message) {
    this.log(message, 'ERROR');
  }
  
  warn(message) {
    this.log(message, 'WARN');
  }
  
  success(message) {
    this.log(message, 'SUCCESS');
  }
}

const logger = new TransactionTestLogger();

// Delay function for retries
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Function to fetch data with retry logic
async function fetchDataWithRetry(url, config, retries = CONFIG.maxRetries) {
  for (let i = 0; i <= retries; i++) {
    try {
      logger.log(`Attempt ${i + 1}/${retries + 1} to fetch data from: ${url}`);
      const response = await axios.get(url, config);
      return response;
    } catch (error) {
      if (i === retries) {
        throw error;
      }
      
      logger.warn(`Attempt ${i + 1} failed: ${error.message}. Retrying in ${CONFIG.retryDelay}ms...`);
      await delay(CONFIG.retryDelay);
    }
  }
}

// Test suite class
class TransactionDataTestSuite {
  constructor() {
    this.config = {
      timeout: CONFIG.timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Fraud-Evidence-System-Test/2.0'
      }
    };
  }
  
  async testEndpointConnectivity() {
    logger.log('🧪 Testing endpoint connectivity...');
    
    try {
      const response = await fetchDataWithRetry(CONFIG.primaryEndpoint, this.config);
      logger.success(`✅ Primary endpoint is accessible. Status: ${response.status}`);
      
      // Validate response structure
      expect(response.status).to.equal(200);
      logger.success('✅ Response status is 200');
      
      return response.data;
    } catch (error) {
      logger.error(`❌ Primary endpoint failed: ${error.message}`);
      
      // Try fallback endpoint
      try {
        logger.warn('🔄 Trying fallback endpoint...');
        const response = await fetchDataWithRetry(CONFIG.fallbackEndpoint, this.config);
        logger.success(`✅ Fallback endpoint is accessible. Status: ${response.status}`);
        
        expect(response.status).to.equal(200);
        logger.success('✅ Fallback response status is 200');
        
        return response.data;
      } catch (fallbackError) {
        logger.error(`❌ Fallback endpoint also failed: ${fallbackError.message}`);
        throw new Error(`Both endpoints failed: ${error.message}, ${fallbackError.message}`);
      }
    }
  }
  
  async testDataStructure(data) {
    logger.log('🧪 Testing data structure...');
    
    // Check if data is an array
    expect(data).to.be.an('array');
    logger.success(`✅ Data is an array with ${data.length} items`);
    
    // If array is not empty, validate structure of first item
    if (data.length > 0) {
      const firstItem = data[0];
      expect(firstItem).to.be.an('object');
      logger.success('✅ First item is an object');
      
      // Log some information about the structure
      const keys = Object.keys(firstItem);
      logger.log(`📋 First item has ${keys.length} properties: ${keys.join(', ')}`);
      
      // Save sample data
      const sampleDataPath = path.join(logsDir, 'sample-transaction-data.json');
      fs.writeFileSync(sampleDataPath, JSON.stringify(data.slice(0, 5), null, 2));
      logger.success(`💾 Sample data (5 items) saved to: ${sampleDataPath}`);
    } else {
      logger.warn('⚠️ No data returned from API');
    }
    
    return true;
  }
  
  async testDataContent(data) {
    logger.log('🧪 Testing data content...');
    
    if (data.length === 0) {
      logger.warn('⚠️ No data to analyze');
      return true;
    }
    
    // Analyze data content
    const analysis = {
      totalItems: data.length,
      fieldStats: {},
      sampleItems: data.slice(0, 3)
    };
    
    // Collect field statistics
    data.slice(0, 100).forEach(item => {
      if (typeof item === 'object' && item !== null) {
        Object.keys(item).forEach(key => {
          if (!analysis.fieldStats[key]) {
            analysis.fieldStats[key] = {
              count: 0,
              types: new Set(),
              sampleValues: []
            };
          }
          
          analysis.fieldStats[key].count++;
          analysis.fieldStats[key].types.add(typeof item[key]);
          
          // Collect sample values (max 5 unique values)
          if (analysis.fieldStats[key].sampleValues.length < 5 && 
              !analysis.fieldStats[key].sampleValues.includes(item[key])) {
            analysis.fieldStats[key].sampleValues.push(item[key]);
          }
        });
      }
    });
    
    // Log analysis results
    logger.log(`📊 Data Analysis:`);
    logger.log(`  Total Items: ${analysis.totalItems}`);
    logger.log(`  Fields Found: ${Object.keys(analysis.fieldStats).length}`);
    
    Object.keys(analysis.fieldStats).forEach(field => {
      const stats = analysis.fieldStats[field];
      logger.log(`  ${field}: ${stats.count} items, types: ${Array.from(stats.types).join(', ')}`);
    });
    
    // Save full analysis
    const analysisPath = path.join(logsDir, 'transaction-data-analysis.json');
    fs.writeFileSync(analysisPath, JSON.stringify(analysis, null, 2));
    logger.success(`💾 Full analysis saved to: ${analysisPath}`);
    
    return analysis;
  }
  
  async runAllTests() {
    logger.log('🚀 Starting comprehensive transaction data tests...');
    
    try {
      // Test 1: Endpoint connectivity
      const data = await this.testEndpointConnectivity();
      
      // Test 2: Data structure
      await this.testDataStructure(data);
      
      // Test 3: Data content
      await this.testDataContent(data);
      
      logger.success('🎉 All tests passed!');
      logger.log(`📂 Log file: ${logger.logFilePath}`);
      
      return { success: true, data };
    } catch (error) {
      logger.error(`💥 Tests failed: ${error.message}`);
      throw error;
    }
  }
}

// Function to run a quick test
async function runQuickTest() {
  logger.log('🚀 Running quick transaction data test...');
  
  try {
    const config = {
      timeout: CONFIG.timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Fraud-Evidence-System-Quick-Test/1.0'
      }
    };
    
    const response = await axios.get(CONFIG.primaryEndpoint, config);
    
    if (response.status === 200) {
      logger.success(`✅ Quick test successful. Status: ${response.status}`);
      logger.log(`📊 Data items: ${Array.isArray(response.data) ? response.data.length : 'N/A'}`);
      
      // Save data
      const dataPath = path.join(logsDir, 'quick-transaction-data.json');
      fs.writeFileSync(dataPath, JSON.stringify(response.data, null, 2));
      logger.success(`💾 Data saved to: ${dataPath}`);
      
      return response.data;
    } else {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  } catch (error) {
    logger.error(`❌ Quick test failed: ${error.message}`);
    throw error;
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const quickTest = args.includes('--quick');
  
  logger.log(`========================================`);
  logger.log(` COMPREHENSIVE TRANSACTION DATA TEST`);
  logger.log(`========================================`);
  
  try {
    if (quickTest) {
      await runQuickTest();
    } else {
      const testSuite = new TransactionDataTestSuite();
      await testSuite.runAllTests();
    }
    
    logger.log(`\n✅ Test execution completed successfully!`);
  } catch (error) {
    logger.error(`\n💥 Test execution failed: ${error.message}`);
    process.exit(1);
  }
}

// Export for use in other modules
module.exports = { TransactionDataTestSuite, runQuickTest };

// Run if called directly
if (require.main === module) {
  main();
}