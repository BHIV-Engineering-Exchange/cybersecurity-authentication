"""
Reinforcement Learning Fraud Detector
Uses Q-Learning to improve fraud detection over time
"""

import numpy as np
import json
import os
from typing import Dict, List, Tuple, Optional
from datetime import datetime
import pickle

class RLFraudDetector:
    """
    Q-Learning based fraud detector that learns from predictions and outcomes
    """
    
    def __init__(self, learning_rate: float = 0.1, discount_factor: float = 0.95, 
                 exploration_rate: float = 0.1, state_size: int = 18):
        """
        Initialize RL Fraud Detector
        
        Args:
            learning_rate: How fast the agent learns (alpha)
            discount_factor: Importance of future rewards (gamma)
            exploration_rate: Probability of exploring vs exploiting (epsilon)
            state_size: Number of features in state space
        """
        self.learning_rate = learning_rate
        self.discount_factor = discount_factor
        self.exploration_rate = exploration_rate
        self.state_size = state_size
        
        # Q-table: state -> action -> Q-value
        # Actions: 0 = predict_normal, 1 = predict_fraud
        self.q_table = {}
        
        # Statistics
        self.total_predictions = 0
        self.correct_predictions = 0
        self.rewards_received = []
        self.episodes = []
        
        # Load existing model if available
        self.model_path = "backend/ml_models/rl_fraud_model.pkl"
        self.stats_path = "backend/ml_models/rl_fraud_stats.json"
        self.load_model()
    
    def _state_to_key(self, state: np.ndarray) -> str:
        """Convert state array to hashable key"""
        # Discretize state for Q-table lookup
        # Round to 2 decimal places and create string key
        state_rounded = np.round(state, 2)
        return str(state_rounded.tolist())
    
    def _get_state_features(self, transaction_data: Dict) -> np.ndarray:
        """
        Extract features from transaction data to create state vector
        Same features as used in ML model
        """
        try:
            # Feature engineering (matching train_fraud_model.py)
            amount = float(transaction_data.get("amount", 0))
            old_balance_orig = float(transaction_data.get("oldbalanceOrg", 0))
            new_balance_orig = float(transaction_data.get("newbalanceOrig", 0))
            old_balance_dest = float(transaction_data.get("oldbalanceDest", 0))
            new_balance_dest = float(transaction_data.get("newbalanceDest", 0))
            
            # Calculate features
            balance_change_orig = new_balance_orig - old_balance_orig
            balance_change_dest = new_balance_dest - old_balance_dest if old_balance_dest else 0
            
            # Avoid division by zero
            balance_orig_ratio = balance_change_orig / (old_balance_orig + 1e-6)
            balance_dest_ratio = balance_change_dest / (old_balance_dest + 1e-6) if old_balance_dest else 0
            
            # Transaction type encoding
            tx_type = transaction_data.get("type", "TRANSFER")
            type_encoding = {
                "CASH_IN": [1, 0, 0, 0, 0],
                "CASH_OUT": [0, 1, 0, 0, 0],
                "DEBIT": [0, 0, 1, 0, 0],
                "PAYMENT": [0, 0, 0, 1, 0],
                "TRANSFER": [0, 0, 0, 0, 1],
            }
            type_vec = type_encoding.get(tx_type, [0, 0, 0, 0, 0])
            
            # Combine all features
            features = np.array([
                amount,
                old_balance_orig,
                new_balance_orig,
                old_balance_dest or 0,
                new_balance_dest or 0,
                balance_change_orig,
                balance_change_dest,
                balance_orig_ratio,
                balance_dest_ratio,
                abs(balance_change_orig),
                abs(balance_change_dest),
                amount / (old_balance_orig + 1e-6),
                amount / (old_balance_dest + 1e-6) if old_balance_dest else 0,
                old_balance_orig + new_balance_orig,
                (old_balance_dest or 0) + (new_balance_dest or 0),
            ] + type_vec)
            
            # Normalize features
            features = np.nan_to_num(features, nan=0.0, posinf=0.0, neginf=0.0)
            
            return features[:self.state_size]  # Ensure correct size
            
        except Exception as e:
            # Return zero vector on error
            return np.zeros(self.state_size)
    
    def predict(self, transaction_data: Dict, use_exploration: bool = True) -> Dict:
        """
        Predict fraud using Q-learning
        
        Args:
            transaction_data: Transaction features
            use_exploration: Whether to use epsilon-greedy exploration
            
        Returns:
            Dict with prediction, confidence, and action taken
        """
        state = self._get_state_features(transaction_data)
        state_key = self._state_to_key(state)
        
        # Initialize Q-values for new state
        if state_key not in self.q_table:
            self.q_table[state_key] = {0: 0.0, 1: 0.0}  # [normal, fraud]
        
        # Epsilon-greedy action selection
        if use_exploration and np.random.random() < self.exploration_rate:
            # Explore: random action
            action = np.random.randint(0, 2)
            exploration = True
        else:
            # Exploit: choose action with highest Q-value
            q_values = self.q_table[state_key]
            action = max(q_values.items(), key=lambda x: x[1])[0]
            exploration = False
        
        # Get Q-values for confidence calculation
        q_normal = self.q_table[state_key][0]
        q_fraud = self.q_table[state_key][1]
        
        # Calculate confidence based on Q-value difference
        total_q = abs(q_normal) + abs(q_fraud)
        if total_q > 0:
            confidence = abs(q_fraud - q_normal) / (total_q + 1e-6)
        else:
            confidence = 0.5
        
        self.total_predictions += 1
        
        return {
            "is_fraud": action,
            "prediction": "fraud" if action == 1 else "normal",
            "confidence": float(confidence),
            "q_values": {
                "normal": float(q_normal),
                "fraud": float(q_fraud)
            },
            "exploration": exploration,
            "state_key": state_key
        }
    
    def update(self, state_key: str, action: int, reward: float, next_state_key: Optional[str] = None):
        """
        Update Q-table using Q-learning algorithm
        
        Args:
            state_key: Current state
            action: Action taken (0=normal, 1=fraud)
            reward: Reward received
            next_state_key: Next state (for Q-learning update)
        """
        if state_key not in self.q_table:
            self.q_table[state_key] = {0: 0.0, 1: 0.0}
        
        # Q-learning update: Q(s,a) = Q(s,a) + α[r + γ*max(Q(s',a')) - Q(s,a)]
        current_q = self.q_table[state_key][action]
        
        if next_state_key and next_state_key in self.q_table:
            # Use next state's max Q-value
            next_max_q = max(self.q_table[next_state_key].values())
        else:
            # Terminal state or unknown next state
            next_max_q = 0
        
        # Q-value update
        new_q = current_q + self.learning_rate * (reward + self.discount_factor * next_max_q - current_q)
        self.q_table[state_key][action] = new_q
        
        # Track rewards
        self.rewards_received.append(reward)
        if len(self.rewards_received) > 10000:  # Keep last 10k rewards
            self.rewards_received = self.rewards_received[-10000:]
    
    def learn_from_feedback(self, transaction_data: Dict, predicted_action: int, 
                           actual_is_fraud: int, reward: Optional[float] = None):
        """
        Learn from prediction feedback
        
        Args:
            transaction_data: Original transaction data
            predicted_action: Action that was taken (0=normal, 1=fraud)
            actual_is_fraud: Actual label (0=normal, 1=fraud)
            reward: Optional custom reward, otherwise calculated automatically
        """
        state = self._get_state_features(transaction_data)
        state_key = self._state_to_key(state)
        
        # Calculate reward if not provided
        if reward is None:
            if predicted_action == actual_is_fraud:
                # Correct prediction
                reward = 1.0
                self.correct_predictions += 1
            else:
                # Incorrect prediction
                if actual_is_fraud == 1 and predicted_action == 0:
                    # Missed fraud (false negative) - high penalty
                    reward = -2.0
                else:
                    # False positive - smaller penalty
                    reward = -0.5
        
        # Update Q-table
        self.update(state_key, predicted_action, reward)
        
        return reward
    
    def get_statistics(self) -> Dict:
        """Get RL model statistics"""
        accuracy = (self.correct_predictions / self.total_predictions * 100) if self.total_predictions > 0 else 0
        avg_reward = np.mean(self.rewards_received) if self.rewards_received else 0
        
        return {
            "total_predictions": self.total_predictions,
            "correct_predictions": self.correct_predictions,
            "accuracy": round(accuracy, 2),
            "average_reward": round(float(avg_reward), 4),
            "total_states": len(self.q_table),
            "exploration_rate": self.exploration_rate,
            "learning_rate": self.learning_rate,
            "discount_factor": self.discount_factor,
            "total_rewards": len(self.rewards_received),
        }
    
    def save_model(self):
        """Save Q-table and statistics"""
        os.makedirs(os.path.dirname(self.model_path), exist_ok=True)
        
        # Save Q-table
        with open(self.model_path, 'wb') as f:
            pickle.dump({
                'q_table': self.q_table,
                'total_predictions': self.total_predictions,
                'correct_predictions': self.correct_predictions,
                'rewards_received': self.rewards_received[-1000:],  # Save last 1000 rewards
            }, f)
        
        # Save statistics
        stats = self.get_statistics()
        stats['last_updated'] = datetime.now().isoformat()
        with open(self.stats_path, 'w') as f:
            json.dump(stats, f, indent=2)
    
    def load_model(self):
        """Load Q-table and statistics"""
        try:
            if os.path.exists(self.model_path):
                with open(self.model_path, 'rb') as f:
                    data = pickle.load(f)
                    self.q_table = data.get('q_table', {})
                    self.total_predictions = data.get('total_predictions', 0)
                    self.correct_predictions = data.get('correct_predictions', 0)
                    self.rewards_received = data.get('rewards_received', [])
        except Exception as e:
            print(f"Warning: Could not load RL model: {e}")
            self.q_table = {}
            self.total_predictions = 0
            self.correct_predictions = 0
            self.rewards_received = []
    
    def train_on_batch(self, transactions: List[Dict], labels: List[int], epochs: int = 1):
        """
        Train RL agent on a batch of transactions
        
        Args:
            transactions: List of transaction data dicts
            labels: List of actual fraud labels (0 or 1)
            epochs: Number of training epochs
        """
        for epoch in range(epochs):
            for tx_data, label in zip(transactions, labels):
                # Make prediction
                prediction = self.predict(tx_data, use_exploration=True)
                
                # Learn from feedback
                self.learn_from_feedback(
                    tx_data,
                    prediction['is_fraud'],
                    label
                )
            
            # Decay exploration rate
            self.exploration_rate = max(0.01, self.exploration_rate * 0.99)
        
        # Save after training
        self.save_model()
        
        return self.get_statistics()


# Global RL detector instance
_rl_detector: Optional[RLFraudDetector] = None

def get_rl_detector() -> RLFraudDetector:
    """Get or create global RL detector instance"""
    global _rl_detector
    if _rl_detector is None:
        _rl_detector = RLFraudDetector()
    return _rl_detector
