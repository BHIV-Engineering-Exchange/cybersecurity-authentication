"""
Transaction endpoints
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.db.database import get_db
from app.db.models import Transaction
from app.api.v1.schemas import TransactionResponse, TransactionCreate

router = APIRouter()


@router.get("/", response_model=List[TransactionResponse])
async def get_transactions(
    case_id: int = None,
    wallet_id: int = None,
    flagged: bool = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Get all transactions"""
    query = db.query(Transaction)
    
    if case_id:
        query = query.filter(Transaction.case_id == case_id)
    if wallet_id:
        query = query.filter(Transaction.wallet_id == wallet_id)
    if flagged is not None:
        query = query.filter(Transaction.flagged == flagged)
    
    transactions = query.offset(skip).limit(limit).all()
    return transactions


@router.get("/{transaction_id}", response_model=TransactionResponse)
async def get_transaction(transaction_id: int, db: Session = Depends(get_db)):
    """Get a specific transaction by ID"""
    transaction = db.query(Transaction).filter(Transaction.id == transaction_id).first()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return transaction


@router.post("/", response_model=TransactionResponse)
async def create_transaction(transaction: TransactionCreate, db: Session = Depends(get_db)):
    """Create a new transaction entry"""
    db_transaction = Transaction(**transaction.dict())
    db.add(db_transaction)
    db.commit()
    db.refresh(db_transaction)
    return db_transaction
