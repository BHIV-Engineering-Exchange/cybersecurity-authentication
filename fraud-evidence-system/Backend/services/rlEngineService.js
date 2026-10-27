// RL Engine Service - Reinforcement Learning for Fraud Detection
// Implements a simplified RL agent for learning from wallet behavior patterns

const fs = require('fs');
const path = require('path');

class RLEngineService {
  constructor() {
    this.modelPath = path.join(__dirname, '..', 'storage', 'rl_models');
    this.logPath = path.join(__dirname, '..', 'storage', 'rl_logs');
    this.ensureDirectories();
    
    // RL Agent State
    this.agent = {
      isTraining: false,
      episodes: 0,
      totalReward: 0,
      lastAction: null,
      confidence: 0.5,
      learningRate: 0.1,
      epsilon: 0.3, // Exploration rate
      model: null
    };
    
    // Action Space: [0: No Action, 1: Monitor, 2: Investigate, 3: Escalate, 4: Freeze]
    this.actionSpace = ['no_action', 'monitor', 'investigate', 'escalate', 'freeze'];
    
    // State Space: [risk_score, geo_risk, escalation_outcome, wallet_behavior]
    this.stateSpace = {
      riskScore: { min: 0, max: 100 },
      geoRisk: { min: 0, max: 1 },
      escalationOutcome: { min: -1, max: 1 }, // -1: bad, 0: neutral, 1: good
      walletBehavior: { min: 0, max: 1 } // 0: normal, 1: suspicious
    };
    
    // Q-Table for simple RL (can be replaced with neural network)
    this.qTable = new Map();
    
    this.loadModel();
  }
  
  ensureDirectories() {
    if (!fs.existsSync(this.modelPath)) {
      fs.mkdirSync(this.modelPath, { recursive: true });
    }
    if (!fs.existsSync(this.logPath)) {
      fs.mkdirSync(this.logPath, { recursive: true });
    }
  }
  
  /**
   * Get state representation for RL agent
   * @param {Object} walletData - Wallet behavior data
   * @param {Object} geoData - Geographic risk data
   * @param {Object} escalationData - Previous escalation outcomes
   * @returns {Array} Normalized state vector
   */
  getState(walletData, geoData, escalationData) {
    const riskScore = Math.min(Math.max(walletData.riskScore || 0, 0), 100) / 100;
    const geoRisk = this.calculateGeoRisk(geoData);
    const escalationOutcome = this.getEscalationOutcome(escalationData);
    const walletBehavior = this.calculateWalletBehavior(walletData);
    
    return [riskScore, geoRisk, escalationOutcome, walletBehavior];
  }
  
  /**
   * Calculate geographic risk based on location data
   */
  calculateGeoRisk(geoData) {
    if (!geoData) return 0.5;
    
    let risk = 0.5; // Base risk
    
    // High-risk countries
    const highRiskCountries = ['CN', 'RU', 'KP', 'IR'];
    if (highRiskCountries.includes(geoData.country)) {
      risk += 0.3;
    }
    
    // Anonymous/VPN indicators
    if (geoData.org && (geoData.org.includes('VPN') || geoData.org.includes('Proxy'))) {
      risk += 0.2;
    }
    
    // Tor exit nodes
    if (geoData.org && geoData.org.includes('Tor')) {
      risk += 0.4;
    }
    
    return Math.min(Math.max(risk, 0), 1);
  }
  
  /**
   * Get escalation outcome from previous actions
   */
  getEscalationOutcome(escalationData) {
    if (!escalationData || !escalationData.history) return 0;
    
    const recent = escalationData.history.slice(-5); // Last 5 escalations
    if (recent.length === 0) return 0;
    
    const positiveOutcomes = recent.filter(e => e.outcome === 'positive').length;
    const negativeOutcomes = recent.filter(e => e.outcome === 'negative').length;
    
    return (positiveOutcomes - negativeOutcomes) / recent.length;
  }
  
  /**
   * Calculate wallet behavior score
   */
  calculateWalletBehavior(walletData) {
    if (!walletData) return 0.5;
    
    let behavior = 0.5;
    
    // Rapid dumping patterns
    if (walletData.rapidDumping > 0.7) behavior += 0.2;
    
    // Large transfers
    if (walletData.largeTransfers > 0.8) behavior += 0.2;
    
    // Flash loan usage
    if (walletData.flashLoans > 0.6) behavior += 0.1;
    
    // Phishing indicators
    if (walletData.phishingScore > 0.7) behavior += 0.3;
    
    return Math.min(Math.max(behavior, 0), 1);
  }
  
  /**
   * Get Q-value for state-action pair
   */
  getQValue(state, action) {
    const key = `${state.join(',')}_${action}`;
    return this.qTable.get(key) || 0;
  }
  
  /**
   * Set Q-value for state-action pair
   */
  setQValue(state, action, value) {
    const key = `${state.join(',')}_${action}`;
    this.qTable.set(key, value);
  }
  
  /**
   * Choose action using epsilon-greedy policy
   */
  chooseAction(state) {
    // Epsilon-greedy exploration
    if (Math.random() < this.agent.epsilon) {
      // Explore: random action
      const randomAction = Math.floor(Math.random() * this.actionSpace.length);
      this.agent.lastAction = randomAction;
      return {
        action: randomAction,
        actionName: this.actionSpace[randomAction],
        confidence: 0.3,
        exploration: true
      };
    }
    
    // Exploit: best known action
    let bestAction = 0;
    let bestValue = this.getQValue(state, 0);
    
    for (let i = 1; i < this.actionSpace.length; i++) {
      const value = this.getQValue(state, i);
      if (value > bestValue) {
        bestValue = value;
        bestAction = i;
      }
    }
    
    this.agent.lastAction = bestAction;
    this.agent.confidence = Math.min(bestValue, 1.0);
    
    return {
      action: bestAction,
      actionName: this.actionSpace[bestAction],
      confidence: this.agent.confidence,
      exploration: false
    };
  }
  
  /**
   * Calculate reward based on action outcome
   */
  calculateReward(action, outcome, riskScore) {
    let reward = 0;
    
    // Reward structure based on action appropriateness
    switch (action) {
      case 0: // No action
        if (riskScore < 0.3 && outcome === 'correct') reward = 1;
        else if (riskScore > 0.7 && outcome === 'missed_threat') reward = -2;
        break;
        
      case 1: // Monitor
        if (riskScore >= 0.3 && riskScore <= 0.6 && outcome === 'correct') reward = 1;
        else if (riskScore > 0.8 && outcome === 'insufficient') reward = -1;
        break;
        
      case 2: // Investigate
        if (riskScore >= 0.6 && riskScore <= 0.8 && outcome === 'correct') reward = 2;
        else if (riskScore < 0.4 && outcome === 'overreaction') reward = -1;
        break;
        
      case 3: // Escalate
        if (riskScore >= 0.8 && outcome === 'correct') reward = 3;
        else if (riskScore < 0.6 && outcome === 'overreaction') reward = -2;
        break;
        
      case 4: // Freeze
        if (riskScore >= 0.9 && outcome === 'correct') reward = 4;
        else if (riskScore < 0.8 && outcome === 'overreaction') reward = -3;
        break;
    }
    
    return reward;
  }
  
  /**
   * Update Q-value using Q-learning
   */
  updateQValue(state, action, reward, nextState) {
    const currentQ = this.getQValue(state, action);
    const maxNextQ = Math.max(...this.actionSpace.map((_, a) => this.getQValue(nextState, a)));
    
    const newQ = currentQ + this.agent.learningRate * (reward + 0.9 * maxNextQ - currentQ);
    this.setQValue(state, action, newQ);
  }
  
  /**
   * Train the RL agent with new experience
   */
  async train(walletData, geoData, escalationData, action, outcome) {
    try {
      const state = this.getState(walletData, geoData, escalationData);
      const reward = this.calculateReward(action, outcome, walletData.riskScore / 100);
      
      // For simplicity, we'll use the same state as next state
      // In a real implementation, you'd have the actual next state
      const nextState = state;
      
      this.updateQValue(state, action, reward, nextState);
      
      this.agent.episodes++;
      this.agent.totalReward += reward;
      
      // Decay epsilon for less exploration over time
      this.agent.epsilon = Math.max(0.1, this.agent.epsilon * 0.995);
      
      // Log training data
      await this.logTrainingData({
        episode: this.agent.episodes,
        state,
        action,
        reward,
        outcome,
        totalReward: this.agent.totalReward,
        epsilon: this.agent.epsilon,
        timestamp: new Date()
      });
      
      // Save model periodically
      if (this.agent.episodes % 100 === 0) {
        await this.saveModel();
      }
      
      return {
        success: true,
        episode: this.agent.episodes,
        reward,
        totalReward: this.agent.totalReward,
        epsilon: this.agent.epsilon
      };
      
    } catch (error) {
      console.error('RL Training Error:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Make prediction for new wallet
   */
  async predict(walletData, geoData, escalationData) {
    try {
      const state = this.getState(walletData, geoData, escalationData);
      const prediction = this.chooseAction(state);
      
      // Log prediction
      await this.logPrediction({
        state,
        prediction,
        timestamp: new Date()
      });
      
      return {
        success: true,
        action: prediction.action,
        actionName: prediction.actionName,
        confidence: prediction.confidence,
        exploration: prediction.exploration,
        state,
        modelInfo: {
          episodes: this.agent.episodes,
          totalReward: this.agent.totalReward,
          epsilon: this.agent.epsilon
        }
      };
      
    } catch (error) {
      console.error('RL Prediction Error:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Run simulation with synthetic data
   */
  async runSimulation(numEpisodes = 100) {
    console.log(`🤖 Starting RL simulation with ${numEpisodes} episodes...`);
    this.agent.isTraining = true;
    
    const outcomes = ['correct', 'missed_threat', 'overreaction', 'insufficient'];
    
    for (let i = 0; i < numEpisodes; i++) {
      // Generate synthetic wallet data
      const walletData = {
        riskScore: Math.random() * 100,
        rapidDumping: Math.random(),
        largeTransfers: Math.random(),
        flashLoans: Math.random(),
        phishingScore: Math.random()
      };
      
      // Generate synthetic geo data
      const geoData = {
        country: ['US', 'CN', 'RU', 'IN', 'GB'][Math.floor(Math.random() * 5)],
        org: Math.random() > 0.8 ? 'VPN Service' : 'Normal ISP'
      };
      
      // Generate synthetic escalation data
      const escalationData = {
        history: Array.from({ length: 3 }, () => ({
          outcome: outcomes[Math.floor(Math.random() * outcomes.length)]
        }))
      };
      
      // Get prediction
      const prediction = await this.predict(walletData, geoData, escalationData);
      
      // Simulate outcome
      const outcome = outcomes[Math.floor(Math.random() * outcomes.length)];
      
      // Train with this experience
      await this.train(walletData, geoData, escalationData, prediction.action, outcome);
      
      if (i % 10 === 0) {
        console.log(`Episode ${i}: Reward=${this.agent.totalReward}, Epsilon=${this.agent.epsilon.toFixed(3)}`);
      }
    }
    
    this.agent.isTraining = false;
    await this.saveModel();
    
    console.log(`✅ Simulation completed! Total episodes: ${this.agent.episodes}, Total reward: ${this.agent.totalReward}`);
    
    return {
      success: true,
      episodes: this.agent.episodes,
      totalReward: this.agent.totalReward,
      finalEpsilon: this.agent.epsilon
    };
  }
  
  /**
   * Get model status and statistics
   */
  getStatus() {
    return {
      isTraining: this.agent.isTraining,
      episodes: this.agent.episodes,
      totalReward: this.agent.totalReward,
      confidence: this.agent.confidence,
      epsilon: this.agent.epsilon,
      learningRate: this.agent.learningRate,
      qTableSize: this.qTable.size,
      lastAction: this.agent.lastAction,
      modelPath: this.modelPath,
      logPath: this.logPath
    };
  }
  
  /**
   * Save model to disk
   */
  async saveModel() {
    try {
      const modelData = {
        qTable: Array.from(this.qTable.entries()),
        agent: this.agent,
        timestamp: new Date(),
        version: '1.0.0'
      };
      
      const filePath = path.join(this.modelPath, 'rl_model.json');
      fs.writeFileSync(filePath, JSON.stringify(modelData, null, 2));
      
      console.log('✅ RL Model saved successfully');
      return { success: true };
    } catch (error) {
      console.error('❌ Failed to save RL model:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Load model from disk
   */
  async loadModel() {
    try {
      const filePath = path.join(this.modelPath, 'rl_model.json');
      
      if (fs.existsSync(filePath)) {
        const modelData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        this.qTable = new Map(modelData.qTable);
        this.agent = { ...this.agent, ...modelData.agent };
        
        console.log('✅ RL Model loaded successfully');
        return { success: true };
      } else {
        console.log('ℹ️ No existing RL model found, starting fresh');
        return { success: true, message: 'No existing model' };
      }
    } catch (error) {
      console.error('❌ Failed to load RL model:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Log training data
   */
  async logTrainingData(data) {
    try {
      const logFile = path.join(this.logPath, `training_${new Date().toISOString().split('T')[0]}.json`);
      const logEntry = JSON.stringify(data) + '\n';
      
      fs.appendFileSync(logFile, logEntry);
    } catch (error) {
      console.error('Failed to log training data:', error);
    }
  }
  
  /**
   * Log prediction data
   */
  async logPrediction(data) {
    try {
      const logFile = path.join(this.logPath, `predictions_${new Date().toISOString().split('T')[0]}.json`);
      const logEntry = JSON.stringify(data) + '\n';
      
      fs.appendFileSync(logFile, logEntry);
    } catch (error) {
      console.error('Failed to log prediction data:', error);
    }
  }
}

module.exports = RLEngineService;
