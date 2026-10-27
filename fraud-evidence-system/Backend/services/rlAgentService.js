// Reinforcement Learning Agent Service
// Minimal deterministic RL implementation for fraud detection

const crypto = require('crypto');

/**
 * Simple Q-Table based RL Agent
 * Uses deterministic policy for consistent predictions
 */
class RLAgent {
  constructor() {
    this.version = '1.0.0';
    this.actions = ['monitor', 'investigate', 'freeze'];
    
    // Initialize Q-table with predefined values (simulates pre-training)
    this.qTable = this.initializeQTable();
  }

  /**
   * Initialize Q-table with predefined values
   * In production, this would be learned through training
   */
  initializeQTable() {
    return {
      // State patterns → action values
      'low_risk': { monitor: 0.9, investigate: 0.3, freeze: 0.1 },
      'medium_risk': { monitor: 0.4, investigate: 0.8, freeze: 0.3 },
      'high_risk': { monitor: 0.2, investigate: 0.7, freeze: 0.9 },
      'critical_risk': { monitor: 0.1, investigate: 0.5, freeze: 0.95 },
      
      // Pattern-based states
      'high_volume': { monitor: 0.3, investigate: 0.8, freeze: 0.6 },
      'suspicious_pattern': { monitor: 0.2, investigate: 0.9, freeze: 0.7 },
      'new_account': { monitor: 0.7, investigate: 0.6, freeze: 0.2 },
      'known_fraudster': { monitor: 0.1, investigate: 0.3, freeze: 0.95 }
    };
  }

  /**
   * Extract state from features (deterministic)
   * @param {Object} features - Input features
   * @returns {string} - State identifier
   */
  extractState(features) {
    const {
      riskLevel = 'medium',
      suspiciousPatterns = 0,
      transactionCount = 0,
      accountAge = 180
    } = features;

    // Priority-based state extraction
    if (suspiciousPatterns >= 5) return 'known_fraudster';
    if (suspiciousPatterns >= 3) return 'suspicious_pattern';
    if (transactionCount > 100 && accountAge < 30) return 'high_volume';
    if (accountAge < 7) return 'new_account';
    
    // Fall back to risk level
    const riskMap = {
      'low': 'low_risk',
      'medium': 'medium_risk',
      'high': 'high_risk',
      'critical': 'critical_risk'
    };
    
    return riskMap[riskLevel] || 'medium_risk';
  }

  /**
   * Compute deterministic hash from wallet for reproducibility
   * @param {string} wallet - Wallet address
   * @returns {number} - Deterministic value between 0 and 1
   */
  computeDeterministicNoise(wallet) {
    const hash = crypto.createHash('md5').update(wallet).digest('hex');
    const value = parseInt(hash.substring(0, 8), 16);
    return (value % 100) / 100; // 0.00 to 0.99
  }

  /**
   * Select best action based on Q-values
   * @param {Object} qValues - Q-values for each action
   * @param {number} epsilon - Exploration rate (0 for deterministic)
   * @returns {string} - Selected action
   */
  selectAction(qValues, epsilon = 0) {
    // For deterministic behavior, always select best action (epsilon = 0)
    let bestAction = 'monitor';
    let bestValue = -Infinity;
    
    for (const [action, value] of Object.entries(qValues)) {
      if (value > bestValue) {
        bestValue = value;
        bestAction = action;
      }
    }
    
    return bestAction;
  }

  /**
   * Predict action for given features (deterministic)
   * @param {Object} input - Input features
   * @returns {Object} - Prediction result
   */
  predict(input) {
    const { wallet, features = {} } = input;
    
    if (!wallet) {
      throw new Error('Wallet address is required for prediction');
    }

    // Extract state from features
    const state = this.extractState(features);
    
    // Get Q-values for this state
    const qValues = this.qTable[state] || this.qTable['medium_risk'];
    
    // Select best action (deterministic)
    const action = this.selectAction(qValues);
    
    // Get score for selected action
    const score = qValues[action];
    
    // Compute confidence based on difference between best and second-best
    const sortedValues = Object.values(qValues).sort((a, b) => b - a);
    const confidence = sortedValues.length > 1 
      ? sortedValues[0] - sortedValues[1] 
      : sortedValues[0];
    
    // Generate explainable features (feature importance)
    const explainableFeatures = this.generateExplanation(features, state, action);
    
    // Generate reasoning
    const reasoning = this.generateReasoning(features, state, action, score);
    
    // Add deterministic noise based on wallet (for slight variations)
    const walletNoise = this.computeDeterministicNoise(wallet);
    const adjustedScore = Math.min(1, Math.max(0, score + (walletNoise * 0.1 - 0.05)));
    
    return {
      wallet,
      action,
      score: parseFloat(adjustedScore.toFixed(4)),
      confidence: parseFloat(confidence.toFixed(4)),
      state,
      reasoning,
      explainableFeatures,
      modelVersion: this.version,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Generate explanation for prediction
   * @param {Object} features - Input features
   * @param {string} state - Extracted state
   * @param {string} action - Predicted action
   * @returns {Object} - Feature importance scores
   */
  generateExplanation(features, state, action) {
    const importance = {};
    
    // Calculate feature importance (deterministic)
    if (features.suspiciousPatterns !== undefined) {
      importance.suspiciousPatterns = Math.min(1, features.suspiciousPatterns / 10);
    }
    
    if (features.transactionCount !== undefined) {
      importance.transactionCount = Math.min(1, features.transactionCount / 200);
    }
    
    if (features.totalVolume !== undefined) {
      importance.totalVolume = Math.min(1, features.totalVolume / 100000);
    }
    
    if (features.accountAge !== undefined) {
      importance.accountAge = features.accountAge < 30 ? 0.8 : 0.3;
    }
    
    if (features.riskLevel) {
      const riskImportance = {
        'low': 0.2,
        'medium': 0.5,
        'high': 0.8,
        'critical': 1.0
      };
      importance.riskLevel = riskImportance[features.riskLevel] || 0.5;
    }
    
    return importance;
  }

  /**
   * Generate human-readable reasoning
   * @param {Object} features - Input features
   * @param {string} state - Extracted state
   * @param {string} action - Predicted action
   * @param {number} score - Prediction score
   * @returns {Array<string>} - Reasoning statements
   */
  generateReasoning(features, state, action, score) {
    const reasons = [];
    
    // State-based reasoning
    const stateReasons = {
      'known_fraudster': 'Multiple suspicious patterns detected indicating known fraud behavior',
      'suspicious_pattern': 'Suspicious transaction patterns identified',
      'high_volume': 'High transaction volume in short time period',
      'new_account': 'Recently created account with limited history',
      'high_risk': 'High risk level assessment from initial analysis',
      'critical_risk': 'Critical risk indicators present',
      'medium_risk': 'Moderate risk indicators detected',
      'low_risk': 'Low risk profile with minimal red flags'
    };
    
    if (stateReasons[state]) {
      reasons.push(stateReasons[state]);
    }
    
    // Feature-based reasoning
    if (features.suspiciousPatterns && features.suspiciousPatterns >= 3) {
      reasons.push(`${features.suspiciousPatterns} suspicious patterns identified`);
    }
    
    if (features.transactionCount && features.transactionCount > 100) {
      reasons.push(`High transaction count: ${features.transactionCount} transactions`);
    }
    
    if (features.totalVolume && features.totalVolume > 10000) {
      reasons.push(`Large total volume: $${features.totalVolume.toLocaleString()}`);
    }
    
    if (features.accountAge && features.accountAge < 30) {
      reasons.push(`New account (${features.accountAge} days old)`);
    }
    
    if (features.uniqueAddresses && features.uniqueAddresses > 50) {
      reasons.push(`Interactions with ${features.uniqueAddresses} unique addresses`);
    }
    
    // Action-based reasoning
    const actionReasons = {
      'monitor': 'Recommended for ongoing observation without immediate action',
      'investigate': 'Recommended for detailed investigation by fraud analysts',
      'freeze': 'Immediate action recommended due to high fraud probability'
    };
    
    if (actionReasons[action]) {
      reasons.push(actionReasons[action]);
    }
    
    // Confidence-based reasoning
    if (score > 0.9) {
      reasons.push('High confidence prediction based on strong indicators');
    } else if (score < 0.5) {
      reasons.push('Moderate confidence - manual review recommended');
    }
    
    return reasons.length > 0 ? reasons : ['Analysis based on available features'];
  }

  /**
   * Process feedback and calculate reward
   * @param {Object} feedbackData - Feedback from admin
   * @returns {Object} - Processed feedback with reward
   */
  processFeedback(feedbackData) {
    const { outcome, actualAction, predictedAction } = feedbackData;
    
    // Calculate reward signal for RL
    let reward = 0;
    
    if (outcome === 'correct') {
      reward = 1.0;
    } else if (outcome === 'partially_correct') {
      reward = 0.5;
    } else if (outcome === 'incorrect') {
      reward = -1.0;
    } else if (outcome === 'false_positive') {
      reward = -0.8;
    } else if (outcome === 'false_negative') {
      reward = -1.0;
    }
    
    // Adjust reward if actions match
    if (actualAction && predictedAction && actualAction === predictedAction) {
      reward = Math.max(reward, 0.5);
    }
    
    return {
      reward,
      outcomeCategory: this.categorizeOutcome(outcome),
      trainingValue: Math.abs(reward) // How valuable this feedback is for learning
    };
  }

  /**
   * Categorize outcome for analysis
   * @param {string} outcome - Feedback outcome
   * @returns {string} - Category
   */
  categorizeOutcome(outcome) {
    const categories = {
      'correct': 'true_positive',
      'incorrect': 'false_positive',
      'false_positive': 'false_positive',
      'false_negative': 'false_negative',
      'partially_correct': 'partial_match'
    };
    
    return categories[outcome] || 'unknown';
  }

  /**
   * Get agent statistics
   * @returns {Object} - Agent stats
   */
  getStats() {
    return {
      version: this.version,
      actions: this.actions,
      statesCount: Object.keys(this.qTable).length,
      isTraining: false,
      isFrozen: false,
      lastUpdated: new Date().toISOString()
    };
  }
}

// Export singleton instance
const rlAgent = new RLAgent();

module.exports = {
  rlAgent,
  RLAgent
};

