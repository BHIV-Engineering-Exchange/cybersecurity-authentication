/**
 * Transaction Data Service
 * Fetches transaction data from Shivam's API endpoint
 * Replaces direct bhx_transactions.json usage
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

class TransactionDataService {
  constructor() {
    // Primary data source: Shivam's API
    this.apiEndpoint = process.env.TRANSACTION_API_URL || 'http://192.168.0.68:8080/api/transaction-data';
    
    // Fallback: Local JSON file
    this.fallbackFile = path.join(__dirname, '..', '..', 'bhx_transactions.json');
    
    // Cache
    this.cache = new Map();
    this.cacheTimeout = 60000; // 1 minute cache
    
    // Stats
    this.stats = {
      apiCalls: 0,
      apiSuccess: 0,
      apiFailed: 0,
      fallbackUsed: 0,
      cacheHits: 0
    };
  }
  
  /**
   * Get all transactions
   * Primary: API endpoint
   * Fallback: Local JSON file
   */
  async getAllTransactions() {
    const cacheKey = 'all_transactions';
    
    // Check cache
    if (this._isCacheValid(cacheKey)) {
      this.stats.cacheHits++;
      console.log('📦 Using cached transaction data');
      return this.cache.get(cacheKey).data;
    }
    
    try {
      // Try API first
      console.log(`📡 Fetching transactions from API: ${this.apiEndpoint}`);
      this.stats.apiCalls++;
      
      const response = await axios.get(this.apiEndpoint, {
        timeout: 10000,
        headers: {
          'Accept': 'application/json'
        }
      });
      
      const transactions = response.data;
      
      if (!Array.isArray(transactions)) {
        throw new Error('Invalid response format from API');
      }
      
      this.stats.apiSuccess++;
      console.log(`✅ Fetched ${transactions.length} transactions from API`);
      
      // Cache the result
      this._cacheData(cacheKey, transactions);
      
      return transactions;
      
    } catch (error) {
      console.warn(`⚠️  API fetch failed: ${error.message}`);
      console.log('📁 Falling back to local JSON file');
      
      this.stats.apiFailed++;
      return this._loadFromFallback();
    }
  }
  
  /**
   * Get transactions for specific address
   */
  async getTransactionsByAddress(address) {
    const cacheKey = `address_${address}`;
    
    // Check cache
    if (this._isCacheValid(cacheKey)) {
      this.stats.cacheHits++;
      return this.cache.get(cacheKey).data;
    }
    
    try {
      // Try API with address filter
      console.log(`📡 Fetching transactions for address: ${address.substring(0, 10)}...`);
      this.stats.apiCalls++;
      
      const response = await axios.get(this.apiEndpoint, {
        params: { address },
        timeout: 10000
      });
      
      let transactions = response.data;
      
      // If API returns all transactions, filter client-side
      if (Array.isArray(transactions) && transactions.length > 0) {
        if (!('from_address' in transactions[0] && transactions[0].from_address === address)) {
          // Need to filter
          transactions = transactions.filter(tx => 
            tx.from_address === address || tx.to_address === address
          );
        }
      }
      
      this.stats.apiSuccess++;
      console.log(`✅ Found ${transactions.length} transactions for address`);
      
      // Cache the result
      this._cacheData(cacheKey, transactions);
      
      return transactions;
      
    } catch (error) {
      console.warn(`⚠️  API fetch failed: ${error.message}`);
      
      this.stats.apiFailed++;
      
      // Fallback: Load from JSON and filter
      const allTransactions = await this._loadFromFallback();
      const filtered = allTransactions.filter(tx => 
        tx.from_address === address || tx.to_address === address
      );
      
      console.log(`📁 Loaded ${filtered.length} transactions from fallback`);
      return filtered;
    }
  }
  
  /**
   * Get recent transactions (last N)
   */
  async getRecentTransactions(limit = 100) {
    const allTransactions = await this.getAllTransactions();
    
    // Sort by timestamp descending
    const sorted = allTransactions.sort((a, b) => b.timestamp - a.timestamp);
    
    return sorted.slice(0, limit);
  }
  
  /**
   * Get transaction by hash
   */
  async getTransactionByHash(txHash) {
    const allTransactions = await this.getAllTransactions();
    return allTransactions.find(tx => tx.tx_hash === txHash);
  }
  
  /**
   * Get DEX trades only
   */
  async getDEXTrades() {
    const allTransactions = await this.getAllTransactions();
    return allTransactions.filter(tx => tx.is_dex_trade === true);
  }
  
  /**
   * Load from fallback JSON file
   */
  async _loadFromFallback() {
    this.stats.fallbackUsed++;
    
    try {
      if (!fs.existsSync(this.fallbackFile)) {
        console.error(`❌ Fallback file not found: ${this.fallbackFile}`);
        return [];
      }
      
      const data = fs.readFileSync(this.fallbackFile, 'utf8');
      const transactions = JSON.parse(data);
      
      if (!Array.isArray(transactions)) {
        console.error('❌ Invalid JSON format in fallback file');
        return [];
      }
      
      console.log(`✅ Loaded ${transactions.length} transactions from fallback file`);
      return transactions;
      
    } catch (error) {
      console.error(`❌ Fallback load failed: ${error.message}`);
      return [];
    }
  }
  
  /**
   * Cache data
   */
  _cacheData(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }
  
  /**
   * Check if cache is valid
   */
  _isCacheValid(key) {
    if (!this.cache.has(key)) return false;
    
    const cached = this.cache.get(key);
    const age = Date.now() - cached.timestamp;
    
    return age < this.cacheTimeout;
  }
  
  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
    console.log('🗑️  Transaction data cache cleared');
  }
  
  /**
   * Get service statistics
   */
  getStats() {
    return {
      ...this.stats,
      cacheSize: this.cache.size,
      uptime: process.uptime()
    };
  }
  
  /**
   * Health check
   */
  async healthCheck() {
    try {
      const response = await axios.get(this.apiEndpoint, { timeout: 5000 });
      return {
        status: 'healthy',
        apiEndpoint: this.apiEndpoint,
        apiReachable: true,
        stats: this.stats
      };
    } catch (error) {
      return {
        status: 'degraded',
        apiEndpoint: this.apiEndpoint,
        apiReachable: false,
        fallbackAvailable: fs.existsSync(this.fallbackFile),
        error: error.message,
        stats: this.stats
      };
    }
  }
}

// Singleton instance
let serviceInstance = null;

/**
 * Get transaction data service instance
 */
function getTransactionDataService() {
  if (!serviceInstance) {
    serviceInstance = new TransactionDataService();
  }
  return serviceInstance;
}

module.exports = {
  TransactionDataService,
  getTransactionDataService
};

