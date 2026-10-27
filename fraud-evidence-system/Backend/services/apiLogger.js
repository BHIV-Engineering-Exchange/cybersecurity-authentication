const fs = require('fs');
const path = require('path');

class APILogger {
  constructor() {
    this.logDir = path.join(__dirname, '../logs');
    this.logFile = path.join(this.logDir, 'api-transaction-data.log');
    this.apiUrl = 'http://192.168.0.80:8080/api/transaction-data';
    
    // Ensure logs directory exists
    this.ensureLogDirectory();
  }

  ensureLogDirectory() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
      console.log(`📁 Created logs directory: ${this.logDir}`);
    }
  }

  getTimestamp() {
    return new Date().toISOString();
  }

  formatLogEntry(level, message, data = null) {
    const timestamp = this.getTimestamp();
    let logEntry = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    
    if (data) {
      logEntry += `\nData: ${JSON.stringify(data, null, 2)}`;
    }
    
    return logEntry + '\n' + '-'.repeat(80) + '\n';
  }

  writeLog(content) {
    try {
      fs.appendFileSync(this.logFile, content);
    } catch (error) {
      console.error('Failed to write to log file:', error.message);
    }
  }

  // Log API call attempt
  logAPICall(requestData = {}) {
    const message = `API CALL INITIATED - ${this.apiUrl}`;
    const data = {
      url: this.apiUrl,
      method: 'GET',
      headers: requestData.headers || {},
      timeout: requestData.timeout || 15000,
      timestamp: this.getTimestamp()
    };
    
    const logEntry = this.formatLogEntry('INFO', message, data);
    this.writeLog(logEntry);
    console.log(`📡 API Call logged: ${this.apiUrl}`);
  }

  // Log successful API response
  logAPISuccess(responseData) {
    const message = `API CALL SUCCESSFUL - ${this.apiUrl}`;
    const data = {
      status: responseData.status,
      statusText: responseData.statusText,
      responseTime: responseData.responseTime || 'N/A',
      dataLength: Array.isArray(responseData.data) ? responseData.data.length : 0,
      contentType: responseData.headers?.['content-type'] || 'N/A',
      timestamp: this.getTimestamp(),
      sampleData: Array.isArray(responseData.data) && responseData.data.length > 0 
        ? responseData.data[0] 
        : null
    };
    
    const logEntry = this.formatLogEntry('SUCCESS', message, data);
    this.writeLog(logEntry);
    console.log(`✅ API Success logged: ${responseData.status} - ${data.dataLength} records`);
  }

  // Log API error
  logAPIError(error, responseData = null) {
    const message = `API CALL FAILED - ${this.apiUrl}`;
    const data = {
      errorType: error.name || 'Unknown',
      errorMessage: error.message,
      errorCode: error.code || 'N/A',
      responseStatus: responseData?.status || 'N/A',
      responseData: responseData?.data || null,
      stack: error.stack,
      timestamp: this.getTimestamp()
    };
    
    const logEntry = this.formatLogEntry('ERROR', message, data);
    this.writeLog(logEntry);
    console.log(`❌ API Error logged: ${error.message}`);
  }

  // Log cache usage
  logCacheUsage(action, data) {
    const message = `CACHE ${action.toUpperCase()} - Transaction Data`;
    const logData = {
      action,
      dataLength: data.length || 0,
      timestamp: this.getTimestamp(),
      cacheAge: data.cacheAge || 'N/A'
    };
    
    const logEntry = this.formatLogEntry('CACHE', message, logData);
    this.writeLog(logEntry);
    console.log(`🔄 Cache ${action} logged: ${logData.dataLength} records`);
  }

  // Log fallback usage
  logFallback(fallbackType, data) {
    const message = `FALLBACK ACTIVATED - ${fallbackType}`;
    const logData = {
      fallbackType,
      dataSource: fallbackType === 'backup' ? 'bhx_transactions_backup.json' : 'cache',
      dataLength: data.length || 0,
      timestamp: this.getTimestamp(),
      reason: 'API unavailable or failed'
    };
    
    const logEntry = this.formatLogEntry('FALLBACK', message, logData);
    this.writeLog(logEntry);
    console.log(`🔄 Fallback logged: ${fallbackType} - ${logData.dataLength} records`);
  }

  // Log ML analysis request
  logMLAnalysis(walletAddress, transactionCount) {
    const message = `ML ANALYSIS REQUEST - Wallet Analysis`;
    const data = {
      walletAddress: walletAddress.substring(0, 16) + '...',
      transactionCount,
      dataSource: transactionCount > 0 ? 'Available' : 'No data',
      timestamp: this.getTimestamp()
    };
    
    const logEntry = this.formatLogEntry('ML', message, data);
    this.writeLog(logEntry);
    console.log(`🤖 ML Analysis logged for wallet: ${data.walletAddress}`);
  }

  // Log performance metrics
  logPerformance(metrics) {
    const message = `PERFORMANCE METRICS - API Operation`;
    const data = {
      apiResponseTime: metrics.apiResponseTime || 'N/A',
      cacheHitRate: metrics.cacheHitRate || 'N/A',
      dataProcessingTime: metrics.dataProcessingTime || 'N/A',
      totalOperationTime: metrics.totalOperationTime || 'N/A',
      timestamp: this.getTimestamp()
    };
    
    const logEntry = this.formatLogEntry('PERF', message, data);
    this.writeLog(logEntry);
    console.log(`📊 Performance metrics logged`);
  }

  // Log system health
  logHealthCheck(healthData) {
    const message = `HEALTH CHECK - System Status`;
    const data = {
      apiStatus: healthData.apiStatus || 'Unknown',
      cacheStatus: healthData.cacheStatus || 'Unknown',
      backupStatus: healthData.backupStatus || 'Unknown',
      lastSuccessfulFetch: healthData.lastSuccessfulFetch || 'Never',
      timestamp: this.getTimestamp()
    };
    
    const logEntry = this.formatLogEntry('HEALTH', message, data);
    this.writeLog(logEntry);
    console.log(`💊 Health check logged: API ${data.apiStatus}`);
  }

  // Get log statistics
  getLogStatistics() {
    try {
      if (!fs.existsSync(this.logFile)) {
        return { error: 'Log file does not exist' };
      }

      const logContent = fs.readFileSync(this.logFile, 'utf8');
      const lines = logContent.split('\n');
      
      const stats = {
        totalLines: lines.length,
        successCount: (logContent.match(/\[SUCCESS\]/g) || []).length,
        errorCount: (logContent.match(/\[ERROR\]/g) || []).length,
        cacheCount: (logContent.match(/\[CACHE\]/g) || []).length,
        fallbackCount: (logContent.match(/\[FALLBACK\]/g) || []).length,
        mlCount: (logContent.match(/\[ML\]/g) || []).length,
        healthCount: (logContent.match(/\[HEALTH\]/g) || []).length,
        fileSizeKB: Math.round(fs.statSync(this.logFile).size / 1024),
        lastModified: fs.statSync(this.logFile).mtime.toISOString()
      };

      return stats;
    } catch (error) {
      return { error: error.message };
    }
  }

  // Clear log file
  clearLogs() {
    try {
      const header = `# Transaction Data API Log File\n# URL: ${this.apiUrl}\n# Cleared: ${this.getTimestamp()}\n# Purpose: Track API calls, responses, errors, and performance metrics\n\n` +
                    '================================================================================\n' +
                    `API LOGGING CLEARED - ${this.getTimestamp()}\n` +
                    '================================================================================\n\n';
      
      fs.writeFileSync(this.logFile, header);
      console.log(`🧹 API logs cleared`);
      return true;
    } catch (error) {
      console.error('Failed to clear logs:', error.message);
      return false;
    }
  }

  // Get recent log entries
  getRecentLogs(lines = 50) {
    try {
      if (!fs.existsSync(this.logFile)) {
        return [];
      }

      const logContent = fs.readFileSync(this.logFile, 'utf8');
      const allLines = logContent.split('\n');
      const recentLines = allLines.slice(-lines);
      
      return recentLines.join('\n');
    } catch (error) {
      console.error('Failed to read recent logs:', error.message);
      return [];
    }
  }
}

module.exports = APILogger;