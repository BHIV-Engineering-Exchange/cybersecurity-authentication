const fs = require('fs');
const path = require('path');

/**
 * Reinforcement Learning Engine for Cybercrime Risk Assessment
 * Simulates RL agent that learns from wallet behavior, geo-risk, and escalation outcomes
 */
class RLEngine {
  constructor() {
    this.modelPath = path.join(__dirname, '../data/rl_model.json');
    this.learningDataPath = path.join(__dirname, '../data/rl_learning_logs.json');
    this.model = this.loadModel();
    this.learningLogs = this.loadLearningLogs();
    
    // RL Parameters
    this.learningRate = 0.1;
    this.explorationRate = 0.3;
    this.discountFactor = 0.9;
    
    // Feature weights (will be learned over time)
    this.featureWeights = {
      walletBehavior: {
        rapidTransactions: 0.3,
        largeAmounts: 0.25,
        suspiciousPatterns: 0.2,
        historicalFlags: 0.15
      },
      geoRisk: {
        highRiskCountry: 0.2,
        proxyVPN: 0.15,
        suspiciousLocation: 0.1
      },
      escalationOutcome: {
        successfulEscalation: 0.1,
        falsePositive: -0.05,
        truePositive: 0.15
      }
    };
  }

  /**
   * Load or initialize RL model
   */
  loadModel() {
    try {
      if (fs.existsSync(this.modelPath)) {
        const modelData = fs.readFileSync(this.modelPath, 'utf8');
        return JSON.parse(modelData);
      }
    } catch (error) {
      console.warn('Failed to load RL model, initializing new model:', error.message);
    }
    
    // Initialize new model
    return {
      version: '1.0',
      trainedEpisodes: 0,
      accuracy: 0.0,
      lastUpdated: new Date().toISOString(),
      qTable: {},
      featureWeights: this.featureWeights
    };
  }

  /**
   * Load learning logs
   */
  loadLearningLogs() {
    try {
      if (fs.existsSync(this.learningDataPath)) {
        const logsData = fs.readFileSync(this.learningDataPath, 'utf8');
        return JSON.parse(logsData);
      }
    } catch (error) {
      console.warn('Failed to load learning logs, initializing new logs:', error.message);
    }
    
    return {
      episodes: [],
      lastEpisode: null,
      totalRewards: 0,
      averageReward: 0.0
    };
  }

  /**
   * Save model to disk
   */
  saveModel() {
    try {
      const modelDir = path.dirname(this.modelPath);
      if (!fs.existsSync(modelDir)) {
        fs.mkdirSync(modelDir, { recursive: true });
      }
      
      fs.writeFileSync(this.modelPath, JSON.stringify(this.model, null, 2));
      console.log('✅ RL Model saved successfully');
    } catch (error) {
      console.error('❌ Failed to save RL model:', error);
    }
  }

  /**
   * Save learning logs to disk
   */
  saveLearningLogs() {
    try {
      const logsDir = path.dirname(this.learningDataPath);
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
      }
      
      fs.writeFileSync(this.learningDataPath, JSON.stringify(this.learningLogs, null, 2));
      console.log('✅ RL Learning logs saved successfully');
    } catch (error) {
      console.error('❌ Failed to save learning logs:', error);
    }
  }

  /**
   * Extract features from wallet behavior and geo data
   */
  extractFeatures(inputData) {
    const { walletBehavior, geoRisk, escalationOutcome } = inputData;
    
    return {
      rapidTransactions: walletBehavior?.rapidTransactions ? 1 : 0,
      largeAmounts: walletBehavior?.largeAmounts ? 1 : 0,
      suspiciousPatterns: walletBehavior?.suspiciousPatterns ? 1 : 0,
      historicalFlags: walletBehavior?.historicalFlags || 0,
      highRiskCountry: geoRisk?.highRiskCountry ? 1 : 0,
      proxyVPN: geoRisk?.proxyVPN ? 1 : 0,
      suspiciousLocation: geoRisk?.suspiciousLocation ? 1 : 0,
      successfulEscalation: escalationOutcome?.successfulEscalation ? 1 : 0,
      falsePositive: escalationOutcome?.falsePositive ? 1 : 0,
      truePositive: escalationOutcome?.truePositive ? 1 : 0
    };
  }

  /**
   * Calculate Q-value for a state-action pair
   */
  calculateQValue(state, action) {
    const stateKey = this.getStateKey(state);
    const actionKey = this.getActionKey(action);
    const qKey = `${stateKey}_${actionKey}`;
    
    if (!this.model.qTable[qKey]) {
      this.model.qTable[qKey] = 0.0;
    }
    
    return this.model.qTable[qKey];
  }

  /**
   * Get state key for Q-table
   */
  getStateKey(state) {
    return Object.values(state).map(v => v ? '1' : '0').join('');
  }

  /**
   * Get action key
   */
  getActionKey(action) {
    const actionMap = {
      'flag': 'FLAG',
      'escalate': 'ESCALATE',
      'monitor': 'MONITOR',
      'ignore': 'IGNORE'
    };
    return actionMap[action] || 'UNKNOWN';
  }

  /**
   * Choose action using epsilon-greedy policy
   */
  chooseAction(features) {
    const actions = ['flag', 'escalate', 'monitor', 'ignore'];
    const qValues = actions.map(action => this.calculateQValue(features, action));
    
    // Epsilon-greedy exploration
    if (Math.random() < this.explorationRate) {
      // Explore: choose random action
      return actions[Math.floor(Math.random() * actions.length)];
    } else {
      // Exploit: choose best action
      const bestActionIndex = qValues.indexOf(Math.max(...qValues));
      return actions[bestActionIndex];
    }
  }

  /**
   * Calculate reward based on outcome
   */
  calculateReward(action, outcome) {
    const rewardMap = {
      'flag': {
        truePositive: 10,    // Correctly flagged suspicious activity
        falsePositive: -5,   // Incorrectly flagged normal activity
        missedDetection: -8  // Failed to flag suspicious activity
      },
      'escalate': {
        successfulEscalation: 15,  // Successfully escalated to authorities
        unnecessaryEscalation: -3, // Escalated when not needed
        failedEscalation: -10      // Escalation failed
      },
      'monitor': {
        continuedMonitoring: 2,    // Continue monitoring
        escalationNeeded: 5,       // Monitoring led to escalation
        falseAlarm: -2             // Monitoring was unnecessary
      },
      'ignore': {
        correctIgnore: 3,          // Correctly ignored normal activity
        missedThreat: -15          // Failed to detect real threat
      }
    };

    return rewardMap[action]?.[outcome] || 0;
  }

  /**
   * Update Q-value using Q-learning
   */
  updateQValue(state, action, reward, nextState) {
    const stateKey = this.getStateKey(state);
    const actionKey = this.getActionKey(action);
    const qKey = `${stateKey}_${actionKey}`;
    
    // Current Q-value
    const currentQ = this.model.qTable[qKey] || 0;
    
    // Maximum Q-value for next state
    const actions = ['flag', 'escalate', 'monitor', 'ignore'];
    const nextQValues = actions.map(a => this.calculateQValue(nextState, a));
    const maxNextQ = Math.max(...nextQValues);
    
    // Q-learning update rule
    const newQ = currentQ + this.learningRate * (reward + this.discountFactor * maxNextQ - currentQ);
    
    this.model.qTable[qKey] = newQ;
  }

  /**
   * Train the RL model with new data
   */
  train(inputData, action, outcome) {
    const features = this.extractFeatures(inputData);
    const reward = this.calculateReward(action, outcome);
    
    // Simulate next state (simplified)
    const nextState = { ...features };
    
    // Update Q-value
    this.updateQValue(features, action, reward, nextState);
    
    // Log the training episode
    const episode = {
      timestamp: new Date().toISOString(),
      features,
      action,
      outcome,
      reward,
      qValue: this.calculateQValue(features, action)
    };
    
    this.learningLogs.episodes.push(episode);
    this.learningLogs.lastEpisode = episode;
    this.learningLogs.totalRewards += reward;
    this.learningLogs.averageReward = this.learningLogs.totalRewards / this.learningLogs.episodes.length;
    
    // Update model metadata
    this.model.trainedEpisodes++;
    this.model.lastUpdated = new Date().toISOString();
    
    // Decay exploration rate
    this.explorationRate = Math.max(0.1, this.explorationRate * 0.995);
    
    // Save model and logs
    this.saveModel();
    this.saveLearningLogs();
    
    console.log(`🤖 RL Training Episode ${this.model.trainedEpisodes}: Action=${action}, Outcome=${outcome}, Reward=${reward}`);
    
    return {
      success: true,
      episode: this.model.trainedEpisodes,
      reward,
      newQValue: this.calculateQValue(features, action),
      explorationRate: this.explorationRate
    };
  }

  /**
   * Predict action for given input
   */
  predict(inputData) {
    const features = this.extractFeatures(inputData);
    const action = this.chooseAction(features);
    const qValue = this.calculateQValue(features, action);
    
    // Calculate confidence based on Q-value
    const confidence = Math.min(1.0, Math.max(0.0, (qValue + 10) / 20)); // Normalize to 0-1
    
    return {
      action,
      confidence,
      qValue,
      features,
      modelVersion: this.model.version,
      trainedEpisodes: this.model.trainedEpisodes
    };
  }

  /**
   * Get model status and statistics
   */
  getStatus() {
    const recentEpisodes = this.learningLogs.episodes.slice(-10);
    const recentRewards = recentEpisodes.map(e => e.reward);
    const averageRecentReward = recentRewards.length > 0 ? 
      recentRewards.reduce((a, b) => a + b, 0) / recentRewards.length : 0;
    
    return {
      model: {
        version: this.model.version,
        trainedEpisodes: this.model.trainedEpisodes,
        lastUpdated: this.model.lastUpdated,
        qTableSize: Object.keys(this.model.qTable).length
      },
      learning: {
        totalEpisodes: this.learningLogs.episodes.length,
        totalRewards: this.learningLogs.totalRewards,
        averageReward: this.learningLogs.averageReward,
        averageRecentReward,
        explorationRate: this.explorationRate
      },
      performance: {
        isImproving: averageRecentReward > this.learningLogs.averageReward,
        confidence: Math.min(1.0, this.model.trainedEpisodes / 1000) // Confidence increases with training
      }
    };
  }

  /**
   * Simulate training with historical data
   */
  async simulateTraining(episodes = 100) {
    console.log(`🎯 Starting RL simulation training with ${episodes} episodes...`);
    
    const simulationData = this.generateSimulationData(episodes);
    
    for (let i = 0; i < episodes; i++) {
      const data = simulationData[i];
      const result = this.train(data.input, data.action, data.outcome);
      
      if (i % 10 === 0) {
        console.log(`📊 Episode ${i}: Reward=${result.reward}, Q-Value=${result.newQValue.toFixed(3)}`);
      }
    }
    
    console.log('✅ RL simulation training completed!');
    return this.getStatus();
  }

  /**
   * Generate simulation data for training
   */
  generateSimulationData(episodes) {
    const data = [];
    
    for (let i = 0; i < episodes; i++) {
      const walletBehavior = {
        rapidTransactions: Math.random() > 0.7,
        largeAmounts: Math.random() > 0.8,
        suspiciousPatterns: Math.random() > 0.9,
        historicalFlags: Math.floor(Math.random() * 5)
      };
      
      const geoRisk = {
        highRiskCountry: Math.random() > 0.9,
        proxyVPN: Math.random() > 0.95,
        suspiciousLocation: Math.random() > 0.85
      };
      
      const escalationOutcome = {
        successfulEscalation: Math.random() > 0.8,
        falsePositive: Math.random() > 0.9,
        truePositive: Math.random() > 0.85
      };
      
      const actions = ['flag', 'escalate', 'monitor', 'ignore'];
      const outcomes = ['truePositive', 'falsePositive', 'successfulEscalation', 'unnecessaryEscalation', 'correctIgnore', 'missedThreat'];
      
      data.push({
        input: { walletBehavior, geoRisk, escalationOutcome },
        action: actions[Math.floor(Math.random() * actions.length)],
        outcome: outcomes[Math.floor(Math.random() * outcomes.length)]
      });
    }
    
    return data;
  }
}

module.exports = RLEngine;

