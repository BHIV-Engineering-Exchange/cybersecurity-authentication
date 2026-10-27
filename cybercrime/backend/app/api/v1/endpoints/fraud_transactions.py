"""
Fraud Transaction API endpoints
"""

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from app.db.database import get_db
from app.db.models import FraudTransaction

router = APIRouter()


@router.get("/", response_model=List[dict])
async def get_fraud_transactions(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=10000),
    is_fraud: Optional[int] = Query(None, description="Filter by fraud: 0=normal, 1=fraud"),
    transaction_type: Optional[str] = Query(None, description="Filter by type: CASH_IN, CASH_OUT, DEBIT, PAYMENT, TRANSFER"),
    step_min: Optional[int] = Query(None, ge=1, description="Minimum step (time)"),
    step_max: Optional[int] = Query(None, le=744, description="Maximum step (time)"),
    db: Session = Depends(get_db)
):
    """Get fraud detection transactions with filtering"""
    query = db.query(FraudTransaction)
    
    if is_fraud is not None:
        query = query.filter(FraudTransaction.is_fraud == is_fraud)
    
    if transaction_type:
        query = query.filter(FraudTransaction.type == transaction_type.upper())
    
    if step_min is not None:
        query = query.filter(FraudTransaction.step >= step_min)
    
    if step_max is not None:
        query = query.filter(FraudTransaction.step <= step_max)
    
    transactions = query.order_by(FraudTransaction.step, FraudTransaction.id).offset(skip).limit(limit).all()
    
    return [tx.to_dict() for tx in transactions]


@router.get("/stats")
async def get_fraud_stats(db: Session = Depends(get_db)):
    """Get fraud detection statistics"""
    total = db.query(FraudTransaction).count()
    fraud_count = db.query(FraudTransaction).filter(FraudTransaction.is_fraud == 1).count()
    normal_count = total - fraud_count
    
    # Count by type
    type_counts = {}
    for tx_type in ["CASH_IN", "CASH_OUT", "DEBIT", "PAYMENT", "TRANSFER"]:
        count = db.query(FraudTransaction).filter(FraudTransaction.type == tx_type).count()
        type_counts[tx_type] = count
    
    # Average amounts
    from sqlalchemy import func
    avg_amount = db.query(func.avg(FraudTransaction.amount)).scalar() or 0
    avg_fraud_amount = db.query(func.avg(FraudTransaction.amount)).filter(
        FraudTransaction.is_fraud == 1
    ).scalar() or 0
    
    return {
        "total": total,
        "fraud": fraud_count,
        "normal": normal_count,
        "fraud_percentage": (fraud_count / total * 100) if total > 0 else 0,
        "by_type": type_counts,
        "avg_amount": round(avg_amount, 2),
        "avg_fraud_amount": round(avg_fraud_amount, 2)
    }


@router.get("/{transaction_id}")
async def get_fraud_transaction(transaction_id: int, db: Session = Depends(get_db)):
    """Get a specific fraud transaction by ID"""
    transaction = db.query(FraudTransaction).filter(FraudTransaction.id == transaction_id).first()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return transaction.to_dict()
