/**
 * ML-Based Violation Detection for DeFi Activities
 * @author Yashika - ML Audit & Violation Detection
 * 
 * Detects: Rapid dumps, flash attacks, wash trading, pump & dump schemes
 */

const axios = require('axios');

class MLViolationDetector {
  constructor(config = {}) {
    this.config = {
      apiEndpoint: config.apiEndpoint || 'http://192.168.0.68:8080/api/transaction-data',
      rapidDumpThreshold: config.rapidDumpThreshold || 5, // 5 transactions in window
      rapidDumpWindow: config.rapidDumpWindow || 60, // 60 seconds
      flashAttackThreshold: config.flashAttackThreshold || 0.1, // 10% price impact
      washTradingThreshold: config.washTradingThreshold || 0.8, // 80% self-trading
      minConfidenceScore: config.minConfidenceScore || 0.7,
      ...config
    };
    
    this.violationHistory = [];
    this.analysisCache = new Map();
  }
  
  /**
   * Analyze address for violations
   * Returns JSON with violation details and recommended action
   */
  async analyzeAddress(address) {
    try {
      console.log(`🔍 Analyzing address: ${address.substring(0, 10)}...`);
      
      // Fetch transaction data from API
      const transactions = await this._fetchTransactionData(address);
      
      if (!transactions || transactions.length === 0) {
        return {
          address,
          violation: null,
          score: 0,
          recommended_action: "monitor",
          confidence: 1.0,
          details: "No transaction history"
        };
      }
      
      // Run all detection algorithms
      const detections = await Promise.all([
        this._detectRapidDump(address, transactions),
        this._detectFlashAttack(address, transactions),
        this._detectWashTrading(address, transactions),
        this._detectPumpAndDump(address, transactions),
        this._detectAnomalousSwap(address, transactions)
      ]);
      
      // Find highest severity violation
      const violations = detections.filter(d => d.detected);
      
      if (violations.length === 0) {
        return {
          address,
          violation: null,
          score: 0,
          recommended_action: "monitor",
          confidence: 1.0,
          details: "No violations detected",
          transactionCount: transactions.length
        };
      }
      
      // Get the most severe violation
      const topViolation = violations.reduce((prev, current) => 
        current.score > prev.score ? current : prev
      );
      
      // Determine recommended action
      const recommendedAction = this._determineAction(topViolation.score);
      
      const result = {
        address,
        violation: topViolation.type,
        score: topViolation.score,
        recommended_action: recommendedAction,
        confidence: topViolation.confidence,
        details: topViolation.details,
        evidence: topViolation.evidence,
        transactionCount: transactions.length,
        timestamp: new Date().toISOString()
      };
      
      // Store in history
      this.violationHistory.push(result);
      
      // Cache result
      this.analysisCache.set(address, {
        result,
        cachedAt: Date.now()
      });
      
      console.log(`📊 Analysis complete:`, {
        violation: result.violation,
        score: result.score,
        action: result.recommended_action
      });
      
      return result;
      
    } catch (error) {
      console.error('❌ ML analysis failed:', error);
      return {
        address,
        violation: "ANALYSIS_ERROR",
        score: 0,
        recommended_action: "investigate",
        confidence: 0,
        details: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
  
  /**
   * Fetch transaction data from API endpoint
   */
  async _fetchTransactionData(address) {
    try {
      console.log(`📡 Fetching transactions from API: ${this.config.apiEndpoint}`);
      
      const response = await axios.get(this.config.apiEndpoint, {
        params: { address },
        timeout: 10000
      });
      
      let transactions = response.data;
      
      // If API returns all transactions, filter by address
      if (Array.isArray(transactions)) {
        transactions = transactions.filter(tx => 
          tx.from_address === address || tx.to_address === address
        );
      }
      
      console.log(`✅ Fetched ${transactions.length} transactions for address`);
      
      return transactions;
      
    } catch (error) {
      console.warn(`⚠️  API fetch failed, trying fallback: ${error.message}`);
      
      // Fallback: Try to load from local JSON file
      try {
        const fs = require('fs');
        const path = require('path');
        const jsonPath = path.join(__dirname, '..', '..', 'bhx_transactions.json');
        const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        
        const filtered = data.filter(tx => 
          tx.from_address === address || tx.to_address === address
        );
        
        console.log(`✅ Loaded ${filtered.length} transactions from fallback`);
        return filtered;
        
      } catch (fallbackError) {
        console.error('❌ Fallback also failed:', fallbackError.message);
        return [];
      }
    }
  }
  
  /**
   * Detect rapid token dump
   */
  async _detectRapidDump(address, transactions) {
    const recentTxs = transactions.filter(tx => {
      const txTime = tx.timestamp * 1000; // Convert to ms
      const now = Date.now();
      return (now - txTime) < (this.config.rapidDumpWindow * 1000) && 
             tx.from_address === address;
    });
    
    if (recentTxs.length >= this.config.rapidDumpThreshold) {
      const totalAmount = recentTxs.reduce((sum, tx) => sum + tx.amount, 0);
      const avgAmount = totalAmount / recentTxs.length;
      
      return {
        detected: true,
        type: "Rapid token dump",
        score: Math.min(0.9, 0.5 + (recentTxs.length * 0.1)),
        confidence: 0.85,
        details: `${recentTxs.length} outgoing transactions in ${this.config.rapidDumpWindow}s window`,
        evidence: {
          transactionCount: recentTxs.length,
          totalAmount,
          avgAmount,
          timeWindow: this.config.rapidDumpWindow
        }
      };
    }
    
    return { detected: false };
  }
  
  /**
   * Detect flash attack (large single transaction)
   */
  async _detectFlashAttack(address, transactions) {
    const sortedByAmount = transactions
      .filter(tx => tx.from_address === address)
      .sort((a, b) => b.amount - a.amount);
    
    if (sortedByAmount.length > 0) {
      const largestTx = sortedByAmount[0];
      const avgAmount = transactions.reduce((sum, tx) => sum + tx.amount, 0) / transactions.length;
      
      // If largest transaction is 10x the average
      if (largestTx.amount > avgAmount * 10) {
        return {
          detected: true,
          type: "Flash attack",
          score: 0.88,
          confidence: 0.82,
          details: `Single transaction ${largestTx.amount} is 10x average`,
          evidence: {
            largestAmount: largestTx.amount,
            avgAmount,
            ratio: largestTx.amount / avgAmount,
            txHash: largestTx.tx_hash
          }
        };
      }
    }
    
    return { detected: false };
  }
  
  /**
   * Detect wash trading (self-trading pattern)
   */
  async _detectWashTrading(address, transactions) {
    const selfTrades = transactions.filter(tx => 
      tx.from_address === address && tx.to_address === address
    );
    
    const washRatio = selfTrades.length / transactions.length;
    
    if (washRatio >= this.config.washTradingThreshold) {
      return {
        detected: true,
        type: "Wash trading",
        score: washRatio,
        confidence: 0.90,
        details: `${(washRatio * 100).toFixed(1)}% of transactions are self-trades`,
        evidence: {
          selfTradeCount: selfTrades.length,
          totalTrades: transactions.length,
          washRatio
        }
      };
    }
    
    return { detected: false };
  }
  
  /**
   * Detect pump and dump scheme
   */
  async _detectPumpAndDump(address, transactions) {
    // Look for pattern: many small buys followed by large sell
    const buys = transactions.filter(tx => tx.to_address === address);
    const sells = transactions.filter(tx => tx.from_address === address);
    
    if (buys.length >= 5 && sells.length >= 1) {
      const avgBuyAmount = buys.reduce((sum, tx) => sum + tx.amount, 0) / buys.length;
      const largestSell = Math.max(...sells.map(tx => tx.amount));
      
      if (largestSell > avgBuyAmount * 5) {
        return {
          detected: true,
          type: "Pump and dump",
          score: 0.86,
          confidence: 0.78,
          details: `Pattern: ${buys.length} small buys, then large sell of ${largestSell}`,
          evidence: {
            buyCount: buys.length,
            sellCount: sells.length,
            avgBuyAmount,
            largestSell,
            ratio: largestSell / avgBuyAmount
          }
        };
      }
    }
    
    return { detected: false };
  }
  
  /**
   * Detect anomalous swap activity
   */
  async _detectAnomalousSwap(address, transactions) {
    const dexTrades = transactions.filter(tx => tx.is_dex_trade === true);
    
    if (dexTrades.length > 0) {
      // Check for rapid consecutive swaps
      const rapidSwaps = this._findRapidSequence(dexTrades, 30); // 30 second window
      
      if (rapidSwaps.length >= 3) {
        return {
          detected: true,
          type: "Anomalous swap pattern",
          score: 0.75,
          confidence: 0.70,
          details: `${rapidSwaps.length} DEX swaps in 30 seconds`,
          evidence: {
            rapidSwapCount: rapidSwaps.length,
            timeWindow: 30,
            trades: rapidSwaps.map(tx => tx.tx_hash)
          }
        };
      }
    }
    
    return { detected: false };
  }
  
  /**
   * Find rapid sequence of transactions
   */
  _findRapidSequence(transactions, windowSeconds) {
    if (transactions.length < 2) return [];
    
    const sorted = transactions.sort((a, b) => b.timestamp - a.timestamp);
    const rapid = [];
    
    for (let i = 0; i < sorted.length - 1; i++) {
      const timeDiff = sorted[i].timestamp - sorted[i + 1].timestamp;
      if (timeDiff <= windowSeconds) {
        rapid.push(sorted[i]);
      }
    }
    
    return rapid;
  }
  
  /**
   * Determine recommended action based on score
   */
  _determineAction(score) {
    if (score >= 0.85) return "freeze";
    if (score >= 0.70) return "investigate";
    if (score >= 0.50) return "flag";
    return "monitor";
  }
  
  /**
   * Generate detection report for Cybercrime.sol
   */
  generateReport(analysis) {
    if (!analysis.violation) {
      return null;
    }
    
    return {
      violator: analysis.address,
      violationType: this._mapViolationType(analysis.violation),
      description: analysis.details,
      severity: Math.floor(analysis.score * 100),
      reporter: "ML_SYSTEM",
      timestamp: Math.floor(Date.now() / 1000),
      evidence: JSON.stringify(analysis.evidence),
      confidence: analysis.confidence
    };
  }
  
  /**
   * Map violation type to Cybercrime.sol enum
   */
  _mapViolationType(violation) {
    const mapping = {
      "Rapid token dump": 0, // RAPID_DUMP
      "Flash attack": 1, // FLASH_ATTACK
      "Wash trading": 2, // WASH_TRADING
      "Pump and dump": 3, // PUMP_AND_DUMP
      "Anomalous swap pattern": 4, // SUSPICIOUS_PATTERN
      default: 5 // ML_DETECTED
    };
    
    return mapping[violation] || mapping.default;
  }
  
  /**
   * Batch analyze multiple addresses
   */
  async batchAnalyze(addresses) {
    console.log(`🔍 Batch analyzing ${addresses.length} addresses...`);
    
    const results = await Promise.all(
      addresses.map(addr => this.analyzeAddress(addr))
    );
    
    const violations = results.filter(r => r.violation !== null);
    
    return {
      total: addresses.length,
      violations: violations.length,
      results: violations
    };
  }
  
  /**
   * Get violation statistics
   */
  getStats() {
    const byType = {};
    const byAction = {};
    
    this.violationHistory.forEach(v => {
      if (v.violation) {
        byType[v.violation] = (byType[v.violation] || 0) + 1;
        byAction[v.recommended_action] = (byAction[v.recommended_action] || 0) + 1;
      }
    });
    
    return {
      totalAnalyzed: this.violationHistory.length,
      violationsDetected: this.violationHistory.filter(v => v.violation).length,
      byType,
      byAction,
      avgScore: this.violationHistory.reduce((sum, v) => sum + v.score, 0) / this.violationHistory.length
    };
  }
  
  /**
   * Clear cache
   */
  clearCache() {
    this.analysisCache.clear();
    console.log('🗑️  Analysis cache cleared');
  }
}

// Singleton instance
let detectorInstance = null;

/**
 * Get ML detector instance
 */
function getMLDetector(config) {
  if (!detectorInstance) {
    detectorInstance = new MLViolationDetector(config);
  }
  return detectorInstance;
}

module.exports = {
  MLViolationDetector,
  getMLDetector
};

