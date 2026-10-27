"""
Wallet Fraud Detection endpoints
Analyze wallets using fraud transaction data
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List, Dict
from sqlalchemy import or_, func
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))))

from app.db.database import get_db
from app.db.models import Wallet, FraudTransaction
from ml_training.predict_fraud import predict_transaction, load_model

router = APIRouter()


@router.get("/{wallet_address}/analyze")
async def analyze_wallet_fraud(
    wallet_address: str,
    db: Session = Depends(get_db)
):
    """
    Analyze a wallet for fraud by finding related transactions and predicting fraud
    
    The wallet address can be:
    - A wallet address from the Wallet model (e.g., "0x742d35...")
    - A customer ID from FraudTransaction (e.g., "C1234567890")
    """
    try:
        # Find all transactions where this wallet appears as origin or destination
        transactions = db.query(FraudTransaction).filter(
            or_(
                FraudTransaction.name_orig == wallet_address,
                FraudTransaction.name_dest == wallet_address
            )
        ).order_by(FraudTransaction.step.desc()).all()
        
        if not transactions:
            return {
                "wallet_address": wallet_address,
                "found": False,
                "message": "No transactions found for this wallet address",
                "transactions": [],
                "fraud_summary": {
                    "total_transactions": 0,
                    "fraud_count": 0,
                    "normal_count": 0,
                    "fraud_percentage": 0
                }
            }
        
        # Get wallet info if it exists in Wallet table
        wallet = db.query(Wallet).filter(Wallet.address == wallet_address).first()
        
        # Analyze each transaction
        analyzed_transactions = []
        fraud_count = 0
        normal_count = 0
        predictions = []
        
        model_available = False
        try:
            model, metadata = load_model()
            model_available = True
        except:
            pass
        
        for tx in transactions:
            # Predict fraud if model is available
            prediction = None
            if model_available:
                try:
                    pred_result = predict_transaction(transaction_data={
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
                    prediction = pred_result
                    predictions.append(pred_result)
                except Exception as e:
                    pass
            
            analyzed_transactions.append({
                "transaction_id": tx.id,
                "step": tx.step,
                "type": tx.type,
                "amount": tx.amount,
                "role": "origin" if tx.name_orig == wallet_address else "destination",
                "actual_is_fraud": tx.is_fraud,
                "prediction": prediction,
                "timestamp": tx.created_at.isoformat() if tx.created_at else None
            })
            
            if tx.is_fraud == 1:
                fraud_count += 1
            else:
                normal_count += 1
        
        # Calculate fraud risk score
        total_tx = len(transactions)
        fraud_percentage = (fraud_count / total_tx * 100) if total_tx > 0 else 0
        
        # Determine risk level
        if fraud_percentage >= 50:
            risk_level = "VERY HIGH"
        elif fraud_percentage >= 30:
            risk_level = "HIGH"
        elif fraud_percentage >= 10:
            risk_level = "MEDIUM"
        else:
            risk_level = "LOW"
        
        # Calculate average prediction confidence if available
        avg_confidence = 0
        if predictions:
            avg_confidence = sum(p["confidence"] for p in predictions) / len(predictions) * 100
        
        return {
            "wallet_address": wallet_address,
            "found": True,
            "wallet_info": {
                "id": wallet.id if wallet else None,
                "address": wallet.address if wallet else wallet_address,
                "label": wallet.label if wallet else None,
                "risk_level": wallet.risk_level if wallet else None,
            },
            "fraud_summary": {
                "total_transactions": total_tx,
                "fraud_count": fraud_count,
                "normal_count": normal_count,
                "fraud_percentage": round(fraud_percentage, 2),
                "risk_level": risk_level,
                "avg_prediction_confidence": round(avg_confidence, 2) if predictions else None
            },
            "transactions": analyzed_transactions[:50],  # Limit to 50 most recent
            "model_available": model_available
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error analyzing wallet: {str(e)}")


@router.get("/{wallet_address}/predict")
async def predict_wallet_fraud(
    wallet_address: str,
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """
    Get fraud predictions for a specific wallet's recent transactions
    """
    try:
        # Find recent transactions for this wallet
        transactions = db.query(FraudTransaction).filter(
            or_(
                FraudTransaction.name_orig == wallet_address,
                FraudTransaction.name_dest == wallet_address
            )
        ).order_by(FraudTransaction.step.desc()).limit(limit).all()
        
        if not transactions:
            return {
                "wallet_address": wallet_address,
                "predictions": [],
                "message": "No transactions found"
            }
        
        predictions = []
        for tx in transactions:
            try:
                pred_result = predict_transaction(transaction_data={
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
                
                predictions.append({
                    "transaction_id": tx.id,
                    "step": tx.step,
                    "type": tx.type,
                    "amount": tx.amount,
                    "actual_is_fraud": tx.is_fraud,
                    "prediction": pred_result,
                    "match": tx.is_fraud == pred_result["is_fraud"]
                })
            except Exception as e:
                continue
        
        return {
            "wallet_address": wallet_address,
            "predictions": predictions,
            "total": len(predictions)
        }
        
    except FileNotFoundError:
        raise HTTPException(status_code=503, detail="Model not trained yet")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error predicting: {str(e)}")


@router.get("/search/transactions")
async def search_wallet_in_transactions(
    wallet_address: str = Query(..., description="Wallet address or customer ID to search"),
    db: Session = Depends(get_db)
):
    """
    Search for a wallet address in fraud transactions
    Returns all transactions where wallet appears as origin or destination
    """
    transactions = db.query(FraudTransaction).filter(
        or_(
            FraudTransaction.name_orig == wallet_address,
            FraudTransaction.name_dest == wallet_address
        )
    ).order_by(FraudTransaction.step.desc()).limit(100).all()
    
    return {
        "wallet_address": wallet_address,
        "total_found": len(transactions),
        "transactions": [tx.to_dict() for tx in transactions]
    }
