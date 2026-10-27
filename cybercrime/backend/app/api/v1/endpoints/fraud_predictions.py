"""
Fraud Prediction API endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))))

from app.db.database import get_db
from app.db.models import FraudTransaction
from ml_training.predict_fraud import predict_transaction, load_model

router = APIRouter()


@router.get("/predict/{transaction_id}")
async def predict_fraud_for_transaction(
    transaction_id: int,
    db: Session = Depends(get_db)
):
    """Predict fraud for a specific transaction"""
    try:
        # Get transaction
        tx = db.query(FraudTransaction).filter(FraudTransaction.id == transaction_id).first()
        if not tx:
            raise HTTPException(status_code=404, detail="Transaction not found")
        
        # Predict
        prediction = predict_transaction(transaction_data={
            "step": tx.step,
            "type": tx.type,
            "amount": tx.amount,
            "nameOrig": tx.name_orig,
            "oldbalanceOrg": tx.old_balance_orig,
            "newbalanceOrig": tx.new_balance_orig,
            "nameDest": tx.name_dest,
            "oldbalanceDest": tx.old_balance_dest or 0,
            "newbalanceDest": tx.new_balance_dest or 0,
        })
        
        return {
            "transaction_id": transaction_id,
            "actual_is_fraud": tx.is_fraud,
            "prediction": prediction,
            "match": tx.is_fraud == prediction["is_fraud"]
        }
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail="Model not trained yet. Please train the model first.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")


@router.post("/predict")
async def predict_fraud_for_transaction_data(
    transaction: dict,
    db: Session = Depends(get_db)
):
    """Predict fraud for transaction data (without saving to DB)"""
    try:
        required_fields = ["step", "type", "amount", "nameOrig", "oldbalanceOrg", 
                          "newbalanceOrig", "nameDest"]
        
        for field in required_fields:
            if field not in transaction:
                raise HTTPException(status_code=400, detail=f"Missing required field: {field}")
        
        # Set defaults for optional fields
        transaction.setdefault("oldbalanceDest", 0)
        transaction.setdefault("newbalanceDest", 0)
        
        prediction = predict_transaction(transaction_data=transaction)
        
        return {
            "prediction": prediction,
            "transaction_data": transaction
        }
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail="Model not trained yet. Please train the model first.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")


@router.get("/model/status")
async def get_model_status():
    """Check if model is available"""
    try:
        model, metadata = load_model()
        return {
            "available": True,
            "model_type": type(model).__name__,
            "metadata": metadata
        }
    except FileNotFoundError:
        raise HTTPException(
            status_code=503,
            detail="Model not trained yet. Run: python ml_training/train_fraud_model.py"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail="Unable to load fraud model.") from e
