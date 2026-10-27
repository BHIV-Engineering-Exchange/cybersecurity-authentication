#!/usr/bin/env node

/**
 * RL Simulation Runner Script
 * Simulates 100+ user actions to train the RL model
 * Usage: node scripts/rlSimulationRunner.js [episodes]
 */

const RLEngineService = require('../services/rlEngineService');
const path = require('path');

class RLSimulationRunner {
  constructor() {
    this.rlEngine = new RLEngineService();
    this.outcomes = ['correct', 'missed_threat', 'overreaction', 'insufficient'];
    this.countries = ['US', 'CN', 'RU', 'IN', 'GB', 'DE', 'FR', 'JP', 'AU', 'CA'];
    this.orgs = ['Normal ISP', 'VPN Service', 'Tor Exit Node', 'Cloud Provider', 'Mobile Network'];
  }

  /**
   * Generate synthetic wallet data
   */
  generateWalletData() {
    return {
      riskScore: Math.random() * 100,
      rapidDumping: Math.random(),
      largeTransfers: Math.random(),
      flashLoans: Math.random(),
      phishingScore: Math.random(),
      transactionCount: Math.floor(Math.random() * 1000),
      totalVolume: Math.random() * 1000000,
      uniqueAddresses: Math.floor(Math.random() * 100)
    };
  }

  /**
   * Generate synthetic geo data
   */
  generateGeoData() {
    const country = this.countries[Math.floor(Math.random() * this.countries.length)];
    const org = this.orgs[Math.floor(Math.random() * this.orgs.length)];
    
    return {
      country,
      org,
      city: `City_${Math.floor(Math.random() * 100)}`,
      coordinates: {
        lat: (Math.random() - 0.5) * 180,
        lon: (Math.random() - 0.5) * 360
      }
    };
  }

  /**
   * Generate synthetic escalation history
   */
  generateEscalationData() {
    const historyLength = Math.floor(Math.random() * 10) + 1;
    const history = [];
    
    for (let i = 0; i < historyLength; i++) {
      history.push({
        outcome: this.outcomes[Math.floor(Math.random() * this.outcomes.length)],
        timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Last 30 days
        action: Math.floor(Math.random() * 5),
        riskScore: Math.random() * 100
      });
    }
    
    return { history };
  }

  /**
   * Simulate realistic outcome based on action and risk
   */
  simulateOutcome(action, riskScore) {
    const risk = riskScore / 100;
    
    // Define realistic outcome probabilities based on action and risk
    let outcomeProbabilities = {};
    
    switch (action) {
      case 0: // No action
        if (risk < 0.3) {
          outcomeProbabilities = { correct: 0.8, missed_threat: 0.1, overreaction: 0.0, insufficient: 0.1 };
        } else if (risk < 0.7) {
          outcomeProbabilities = { correct: 0.4, missed_threat: 0.4, overreaction: 0.0, insufficient: 0.2 };
        } else {
          outcomeProbabilities = { correct: 0.1, missed_threat: 0.7, overreaction: 0.0, insufficient: 0.2 };
        }
        break;
        
      case 1: // Monitor
        if (risk < 0.3) {
          outcomeProbabilities = { correct: 0.6, missed_threat: 0.1, overreaction: 0.2, insufficient: 0.1 };
        } else if (risk < 0.7) {
          outcomeProbabilities = { correct: 0.7, missed_threat: 0.2, overreaction: 0.05, insufficient: 0.05 };
        } else {
          outcomeProbabilities = { correct: 0.3, missed_threat: 0.4, overreaction: 0.05, insufficient: 0.25 };
        }
        break;
        
      case 2: // Investigate
        if (risk < 0.3) {
          outcomeProbabilities = { correct: 0.3, missed_threat: 0.1, overreaction: 0.5, insufficient: 0.1 };
        } else if (risk < 0.7) {
          outcomeProbabilities = { correct: 0.8, missed_threat: 0.1, overreaction: 0.05, insufficient: 0.05 };
        } else {
          outcomeProbabilities = { correct: 0.6, missed_threat: 0.2, overreaction: 0.05, insufficient: 0.15 };
        }
        break;
        
      case 3: // Escalate
        if (risk < 0.3) {
          outcomeProbabilities = { correct: 0.1, missed_threat: 0.1, overreaction: 0.7, insufficient: 0.1 };
        } else if (risk < 0.7) {
          outcomeProbabilities = { correct: 0.4, missed_threat: 0.1, overreaction: 0.4, insufficient: 0.1 };
        } else {
          outcomeProbabilities = { correct: 0.8, missed_threat: 0.1, overreaction: 0.05, insufficient: 0.05 };
        }
        break;
        
      case 4: // Freeze
        if (risk < 0.3) {
          outcomeProbabilities = { correct: 0.05, missed_threat: 0.05, overreaction: 0.8, insufficient: 0.1 };
        } else if (risk < 0.7) {
          outcomeProbabilities = { correct: 0.2, missed_threat: 0.1, overreaction: 0.6, insufficient: 0.1 };
        } else {
          outcomeProbabilities = { correct: 0.9, missed_threat: 0.05, overreaction: 0.03, insufficient: 0.02 };
        }
        break;
    }
    
    // Select outcome based on probabilities
    const random = Math.random();
    let cumulative = 0;
    
    for (const [outcome, probability] of Object.entries(outcomeProbabilities)) {
      cumulative += probability;
      if (random <= cumulative) {
        return outcome;
      }
    }
    
    return 'correct'; // Fallback
  }

  /**
   * Run the simulation
   */
  async runSimulation(episodes = 100) {
    console.log(`🚀 Starting RL Simulation with ${episodes} episodes...`);
    console.log('=' .repeat(60));
    
    const startTime = Date.now();
    let totalReward = 0;
    let correctPredictions = 0;
    
    for (let i = 0; i < episodes; i++) {
      // Generate synthetic data
      const walletData = this.generateWalletData();
      const geoData = this.generateGeoData();
      const escalationData = this.generateEscalationData();
      
      // Get prediction from RL agent
      const prediction = await this.rlEngine.predict(walletData, geoData, escalationData);
      
      if (!prediction.success) {
        console.error(`❌ Prediction failed at episode ${i}:`, prediction.error);
        continue;
      }
      
      // Simulate realistic outcome
      const outcome = this.simulateOutcome(prediction.action, walletData.riskScore);
      
      // Train the model
      const trainingResult = await this.rlEngine.train(
        walletData, 
        geoData, 
        escalationData, 
        prediction.action, 
        outcome
      );
      
      if (trainingResult.success) {
        totalReward += trainingResult.reward;
        if (outcome === 'correct') correctPredictions++;
      }
      
      // Progress reporting
      if (i % 10 === 0 || i === episodes - 1) {
        const progress = ((i + 1) / episodes * 100).toFixed(1);
        const avgReward = totalReward / (i + 1);
        const accuracy = (correctPredictions / (i + 1) * 100).toFixed(1);
        
        console.log(`📊 Episode ${i + 1}/${episodes} (${progress}%)`);
        console.log(`   Action: ${prediction.actionName} | Outcome: ${outcome} | Reward: ${trainingResult.reward?.toFixed(2) || 0}`);
        console.log(`   Avg Reward: ${avgReward.toFixed(3)} | Accuracy: ${accuracy}% | Epsilon: ${this.rlEngine.agent.epsilon.toFixed(3)}`);
        console.log('-'.repeat(60));
      }
    }
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    // Final statistics
    const finalStatus = this.rlEngine.getStatus();
    const finalAccuracy = (correctPredictions / episodes * 100).toFixed(1);
    const avgReward = (totalReward / episodes).toFixed(3);
    
    console.log('🎉 Simulation Completed!');
    console.log('=' .repeat(60));
    console.log(`📈 Total Episodes: ${episodes}`);
    console.log(`⏱️  Duration: ${duration.toFixed(2)} seconds`);
    console.log(`🎯 Final Accuracy: ${finalAccuracy}%`);
    console.log(`💰 Average Reward: ${avgReward}`);
    console.log(`🧠 Total Episodes Trained: ${finalStatus.episodes}`);
    console.log(`🔍 Exploration Rate: ${(finalStatus.epsilon * 100).toFixed(1)}%`);
    console.log(`📊 Q-Table Size: ${finalStatus.qTableSize.toLocaleString()} entries`);
    console.log(`💾 Model saved to: ${finalStatus.modelPath}`);
    
    return {
      episodes,
      duration,
      accuracy: parseFloat(finalAccuracy),
      avgReward: parseFloat(avgReward),
      totalReward,
      finalEpsilon: finalStatus.epsilon,
      qTableSize: finalStatus.qTableSize
    };
  }

  /**
   * Run performance analysis
   */
  async analyzePerformance() {
    console.log('📊 Running Performance Analysis...');
    
    const status = this.rlEngine.getStatus();
    
    console.log('Current Model Status:');
    console.log(`- Episodes: ${status.episodes}`);
    console.log(`- Total Reward: ${status.totalReward.toFixed(2)}`);
    console.log(`- Average Reward: ${status.episodes > 0 ? (status.totalReward / status.episodes).toFixed(3) : 0}`);
    console.log(`- Exploration Rate: ${(status.epsilon * 100).toFixed(1)}%`);
    console.log(`- Q-Table Size: ${status.qTableSize.toLocaleString()}`);
    console.log(`- Model Health: ${status.episodes > 50 ? 'Trained' : 'Learning'}`);
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const episodes = args[0] ? parseInt(args[0]) : 100;
  
  if (isNaN(episodes) || episodes < 1 || episodes > 1000) {
    console.error('❌ Invalid number of episodes. Please provide a number between 1 and 1000.');
    process.exit(1);
  }
  
  const runner = new RLSimulationRunner();
  
  try {
    // Run simulation
    const results = await runner.runSimulation(episodes);
    
    // Performance analysis
    await runner.analyzePerformance();
    
    console.log('\n✅ Simulation completed successfully!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Simulation failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = RLSimulationRunner;
