# 🤖 RL Engine Implementation

## Overview

The Reinforcement Learning (RL) Engine is a core component of the fraud detection system that learns to make optimal decisions about wallet risk assessment and escalation actions. It uses Q-learning to improve its decision-making over time based on feedback from real-world outcomes.

## 🏗️ Architecture

### Core Components

1. **RLEngineService** (`services/rlEngineService.js`)
   - Main RL agent implementation
   - Q-learning algorithm with epsilon-greedy exploration
   - State representation and action selection
   - Model persistence and logging

2. **RL Routes** (`routes/rlRoutes.js`)
   - REST API endpoints for RL operations
   - Status monitoring and performance metrics
   - Training and prediction endpoints

3. **RL Dashboard** (`Frontend/src/components/RLDashboard.jsx`)
   - Admin interface for monitoring RL performance
   - Training controls and simulation runner
   - Real-time metrics and logs visualization

4. **Simulation Runner** (`scripts/rlSimulationRunner.js`)
   - Standalone script for training the model
   - Synthetic data generation for testing
   - Performance analysis and reporting

## 🎯 State Space

The RL agent operates on a 4-dimensional state space:

```javascript
state = [riskScore, geoRisk, escalationOutcome, walletBehavior]
```

- **riskScore** (0-1): Normalized ML risk score
- **geoRisk** (0-1): Geographic risk based on location and ISP
- **escalationOutcome** (-1 to 1): Historical escalation success rate
- **walletBehavior** (0-1): Behavioral pattern score

## 🎮 Action Space

The agent can choose from 5 actions:

1. **no_action** (0): Take no action
2. **monitor** (1): Monitor wallet activity
3. **investigate** (2): Start investigation
4. **escalate** (3): Escalate to authorities
5. **freeze** (4): Freeze wallet transactions

## 🏆 Reward Structure

Rewards are calculated based on action appropriateness:

| Action | Risk Level | Correct Outcome | Missed Threat | Overreaction |
|--------|------------|----------------|---------------|--------------|
| No Action | Low (<0.3) | +1 | -2 | 0 |
| Monitor | Medium (0.3-0.6) | +1 | -1 | -0.5 |
| Investigate | High (0.6-0.8) | +2 | -1 | -1 |
| Escalate | Very High (0.8-0.9) | +3 | -1 | -2 |
| Freeze | Critical (>0.9) | +4 | -1 | -3 |

## 🚀 Usage

### API Endpoints

#### Get RL Status
```bash
GET /api/rl/status
```

#### Make Prediction
```bash
POST /api/rl/predict
Content-Type: application/json

{
  "walletData": {
    "riskScore": 75,
    "rapidDumping": 0.8,
    "largeTransfers": 0.6,
    "flashLoans": 0.3,
    "phishingScore": 0.7
  },
  "geoData": {
    "country": "CN",
    "org": "VPN Service",
    "city": "Beijing"
  },
  "escalationData": {
    "history": [
      { "outcome": "correct" },
      { "outcome": "missed_threat" }
    ]
  }
}
```

#### Train Model
```bash
POST /api/rl/train
Content-Type: application/json

{
  "walletData": { /* same as above */ },
  "geoData": { /* same as above */ },
  "escalationData": { /* same as above */ },
  "action": 2,
  "outcome": "correct"
}
```

#### Run Simulation
```bash
POST /api/rl/simulate
Content-Type: application/json

{
  "episodes": 100
}
```

### Frontend Integration

The RL Dashboard is accessible through the admin panel:

1. Navigate to Admin Dashboard
2. Click "RL Engine" in the sidebar
3. Use the tabs to:
   - **Overview**: View current model status
   - **Performance**: Analyze learning metrics
   - **Training Logs**: Review recent training episodes
   - **Controls**: Run simulations and reset model

### Command Line Usage

Run the simulation script directly:

```bash
# Run with default 100 episodes
node scripts/rlSimulationRunner.js

# Run with custom number of episodes
node scripts/rlSimulationRunner.js 500
```

## 📊 Performance Metrics

### Key Metrics

- **Total Episodes**: Number of training iterations
- **Average Reward**: Mean reward per episode
- **Exploration Rate**: Current epsilon value (0-1)
- **Model Confidence**: Q-value of best action
- **Q-Table Size**: Number of learned state-action pairs

### Model Health Indicators

- **Learning**: < 50 episodes, high exploration
- **Trained**: > 50 episodes, balanced exploration/exploitation
- **Overfitted**: Very low exploration, declining performance

## 🔧 Configuration

### Environment Variables

```env
# RL Model paths (optional)
RL_MODEL_PATH=./storage/rl_models
RL_LOG_PATH=./storage/rl_logs

# Learning parameters (optional)
RL_LEARNING_RATE=0.1
RL_INITIAL_EPSILON=0.3
RL_EPSILON_DECAY=0.995
RL_MIN_EPSILON=0.1
```

### Learning Parameters

- **Learning Rate**: 0.1 (how fast the model learns)
- **Initial Epsilon**: 0.3 (exploration rate at start)
- **Epsilon Decay**: 0.995 (exploration reduction per episode)
- **Minimum Epsilon**: 0.1 (minimum exploration rate)
- **Discount Factor**: 0.9 (future reward importance)

## 📁 File Structure

```
Backend/
├── services/
│   └── rlEngineService.js          # Core RL implementation
├── routes/
│   └── rlRoutes.js                 # API endpoints
├── scripts/
│   └── rlSimulationRunner.js       # Training script
├── storage/
│   ├── rl_models/                  # Model persistence
│   │   └── rl_model.json
│   └── rl_logs/                    # Training logs
│       ├── training_YYYY-MM-DD.json
│       └── predictions_YYYY-MM-DD.json
└── test-rl-engine.js               # Test script

Frontend/src/components/
└── RLDashboard.jsx                 # Admin interface
```

## 🧪 Testing

Run the test script to verify RL engine functionality:

```bash
node test-rl-engine.js
```

The test covers:
- Initial status check
- Prediction generation
- Model training
- Status updates
- Model save/load

## 🔄 Training Workflow

1. **Data Collection**: Gather wallet behavior, geo data, and escalation outcomes
2. **State Representation**: Convert raw data to normalized state vector
3. **Action Selection**: Use epsilon-greedy policy to choose action
4. **Outcome Evaluation**: Assess action effectiveness
5. **Q-Value Update**: Update Q-table using Q-learning formula
6. **Model Persistence**: Save updated model periodically

## 📈 Monitoring

### Real-time Monitoring

- **Admin Dashboard**: Visual metrics and controls
- **API Endpoints**: Programmatic access to status
- **Log Files**: Detailed training history

### Performance Tracking

- **Reward Trends**: Track learning progress
- **Accuracy Metrics**: Monitor decision quality
- **Exploration Balance**: Ensure proper learning

## 🚨 Troubleshooting

### Common Issues

1. **Low Performance**: Increase training episodes or adjust learning rate
2. **Overfitting**: Increase exploration rate or add regularization
3. **Slow Learning**: Check reward structure and state representation
4. **Memory Issues**: Monitor Q-table size and implement pruning

### Debug Mode

Enable detailed logging by setting:
```javascript
console.log('RL Debug:', prediction);
```

## 🔮 Future Enhancements

1. **Neural Network**: Replace Q-table with deep Q-network
2. **Multi-Agent**: Multiple specialized RL agents
3. **Online Learning**: Real-time model updates
4. **Advanced Rewards**: More sophisticated reward functions
5. **State Abstraction**: Hierarchical state representation

## 📚 References

- [Reinforcement Learning: An Introduction](http://incompleteideas.net/book/the-book.html)
- [Q-Learning Algorithm](https://en.wikipedia.org/wiki/Q-learning)
- [Epsilon-Greedy Strategy](https://en.wikipedia.org/wiki/Multi-armed_bandit#Epsilon-greedy_strategy)

---

**Note**: This RL implementation is designed for educational and research purposes. For production use, consider implementing more sophisticated algorithms and extensive testing.
