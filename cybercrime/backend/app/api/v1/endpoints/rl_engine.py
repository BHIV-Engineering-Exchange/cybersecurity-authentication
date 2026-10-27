"""
Reinforcement Learning Engine API endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Dict
from pydantic import BaseModel
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))))

from app.db.database import get_db
from app.db.models import FraudTransaction
from ml_training.rl_fraud_detector import get_rl_detector

router = APIRouter()


class RLPredictionRequest(BaseModel):
    transaction_data: Dict


class RLFeedbackRequest(BaseModel):
    transaction_data: Dict
    predicted_action: int  # 0 = normal, 1 = fraud
    actual_is_fraud: int   # 0 = normal, 1 = fraud
    reward: Optional[float] = None


class RLTrainRequest(BaseModel):
    transaction_ids: Optional[List[int]] = None
    limit: Optional[int] = 1000
    epochs: int = 1


@router.get("/status")
async def get_rl_status():
    """Get RL model status and statistics"""
    try:
        rl_detector = get_rl_detector()
        stats = rl_detector.get_statistics()
        
        return {
            "status": "ready",
            "model_loaded": len(rl_detector.q_table) > 0,
            **stats
        }
    except Exception as e:
        raise HTTPException(status_code=503, detail="RL engine is unavailable.") from e


@router.post("/predict")
async def predict_with_rl(request: RLPredictionRequest):
    """Predict fraud using RL agent"""
    try:
        rl_detector = get_rl_detector()
        prediction = rl_detector.predict(request.transaction_data, use_exploration=True)
        
        return {
            "prediction": prediction,
            "model_type": "reinforcement_learning"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"RL prediction error: {str(e)}")


@router.post("/feedback")
async def provide_feedback(request: RLFeedbackRequest):
    """Provide feedback to RL agent for learning"""
    try:
        rl_detector = get_rl_detector()
        reward = rl_detector.learn_from_feedback(
            request.transaction_data,
            request.predicted_action,
            request.actual_is_fraud,
            request.reward
        )
        
        # Save model after learning
        rl_detector.save_model()
        
        return {
            "reward": reward,
            "statistics": rl_detector.get_statistics()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"RL feedback error: {str(e)}")


@router.post("/train")
async def train_rl_agent(request: RLTrainRequest, db: Session = Depends(get_db)):
    """Train RL agent on transaction data"""
    try:
        rl_detector = get_rl_detector()
        
        # Get transactions from database
        query = db.query(FraudTransaction)
        
        if request.transaction_ids:
            query = query.filter(FraudTransaction.id.in_(request.transaction_ids))
        
        transactions = query.limit(request.limit).all()
        
        if not transactions:
            raise HTTPException(status_code=404, detail="No transactions found")
        
        # Prepare training data
        tx_data_list = []
        labels = []
        
        for tx in transactions:
            tx_data = {
                "step": tx.step,
                "type": tx.type,
                "amount": tx.amount,
                "nameOrig": tx.name_orig,
                "oldbalanceOrg": tx.old_balance_orig,
                "newbalanceOrig": tx.new_balance_orig,
                "nameDest": tx.name_dest,
                "oldbalanceDest": tx.old_balance_dest or 0,
                "newbalanceDest": tx.new_balance_dest or 0,
            }
            tx_data_list.append(tx_data)
            labels.append(tx.is_fraud)
        
        # Train RL agent
        stats = rl_detector.train_on_batch(tx_data_list, labels, epochs=request.epochs)
        
        return {
            "status": "success",
            "transactions_trained": len(transactions),
            "epochs": request.epochs,
            "statistics": stats
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"RL training error: {str(e)}")


@router.get("/predict/{transaction_id}")
async def predict_transaction_rl(transaction_id: int, db: Session = Depends(get_db)):
    """Predict fraud for a specific transaction using RL"""
    try:
        transaction = db.query(FraudTransaction).filter(FraudTransaction.id == transaction_id).first()
        
        if not transaction:
            raise HTTPException(status_code=404, detail="Transaction not found")
        
        tx_data = {
            "step": transaction.step,
            "type": transaction.type,
            "amount": transaction.amount,
            "nameOrig": transaction.name_orig,
            "oldbalanceOrg": transaction.old_balance_orig,
            "newbalanceOrig": transaction.new_balance_orig,
            "nameDest": transaction.name_dest,
            "oldbalanceDest": transaction.old_balance_dest or 0,
            "newbalanceDest": transaction.new_balance_dest or 0,
        }
        
        rl_detector = get_rl_detector()
        prediction = rl_detector.predict(tx_data, use_exploration=False)  # Use exploitation for predictions
        
        return {
            "transaction_id": transaction_id,
            "actual_is_fraud": transaction.is_fraud,
            "prediction": prediction,
            "match": prediction["is_fraud"] == transaction.is_fraud
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"RL prediction error: {str(e)}")


@router.get("/performance")
async def get_rl_performance():
    """Get detailed RL performance metrics"""
    try:
        rl_detector = get_rl_detector()
        stats = rl_detector.get_statistics()
        
        # Calculate additional metrics
        recent_rewards = rl_detector.rewards_received[-100:] if len(rl_detector.rewards_received) > 100 else rl_detector.rewards_received
        avg_recent_reward = sum(recent_rewards) / len(recent_rewards) if recent_rewards else 0
        
        return {
            "overall": stats,
            "recent_performance": {
                "avg_reward_last_100": round(avg_recent_reward, 4),
                "total_recent_predictions": len(recent_rewards)
            },
            "learning_parameters": {
                "learning_rate": rl_detector.learning_rate,
                "discount_factor": rl_detector.discount_factor,
                "exploration_rate": rl_detector.exploration_rate,
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting performance: {str(e)}")


@router.post("/reset")
async def reset_rl_model():
    """Reset RL model (clear Q-table)"""
    try:
        rl_detector = get_rl_detector()
        rl_detector.q_table = {}
        rl_detector.total_predictions = 0
        rl_detector.correct_predictions = 0
        rl_detector.rewards_received = []
        rl_detector.save_model()
        
        return {
            "status": "success",
            "message": "RL model reset successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error resetting model: {str(e)}")
