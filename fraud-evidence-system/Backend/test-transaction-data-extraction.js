// Backend/test-transaction-data-extraction.js
// Standalone test to extract transaction data from the new endpoint with fallback to the old one.
// Logs results to Backend/logs/api-transaction-data.log via APILogger and prints a summary.

require('dotenv').config();
const axios = require('axios');
const APILogger = require('./services/apiLogger');

(async () => {
  const logger = new APILogger();
  const primary = 'http://192.168.0.80:8080/api/transaction-data';
  const fallback = 'http://192.168.0.68:8080/api/transaction-data';

  const requestData = {
    timeout: 15000,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Transaction-Data-Extractor/1.0'
    }
  };

  const fetchFrom = async (url) => {
    try {
      logger.apiUrl = url;
      logger.logAPICall(requestData);
      const start = Date.now();
      const res = await axios.get(url, requestData);
      const elapsed = Date.now() - start;
      if (res.status === 200 && Array.isArray(res.data)) {
        logger.logAPISuccess({
          status: res.status,
          statusText: res.statusText,
          responseTime: elapsed,
          data: res.data,
          headers: res.headers
        });
        logger.writeLog(`[API_ENDPOINT_USED] ${new Date().toISOString()} - URL: ${url}\n${'='.repeat(50)}\n`);
        return res.data;
      }
      throw new Error(`Unexpected response status: ${res.status}`);
    } catch (err) {
      logger.logAPIError(err, err.response);
      throw err;
    }
  };

  try {
    console.log(`\n🧪 Extracting transaction data...`);
    console.log(`➡️  Trying primary: ${primary}`);
    let data;
    try {
      data = await fetchFrom(primary);
    } catch (e) {
      console.warn(`⚠️ Primary failed: ${e.message}`);
      console.log(`➡️  Falling back: ${fallback}`);
      data = await fetchFrom(fallback);
      logger.logFallback('old-endpoint', Array.isArray(data) ? data : []);
    }

    if (!Array.isArray(data)) throw new Error('Data is not an array');

    // Print summary
    console.log(`\n✅ Extracted ${data.length} transactions`);
    if (data.length > 0) {
      const sample = data.slice(0, 3);
      console.log('🔎 Sample:', sample);
    }

    // Log performance snapshot
    logger.logPerformance({ apiResponseTime: 'N/A', cacheHitRate: 'N/A', dataProcessingTime: 'N/A' });

    console.log('\n📁 Log file: Backend/logs/api-transaction-data.log');
    console.log('Done.');
  } catch (err) {
    console.error('❌ Extraction failed:', err.message);
    process.exit(1);
  }
})();
