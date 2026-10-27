"""
Risk assessment endpoints
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.db.database import get_db
from app.db.models import RiskScore
from app.api.v1.schemas import RiskScoreResponse, RiskScoreCreate

router = APIRouter()


@router.get("/", response_model=List[RiskScoreResponse])
async def get_risk_scores(
    case_id: int = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Get all risk scores"""
    query = db.query(RiskScore)
    if case_id:
        query = query.filter(RiskScore.case_id == case_id)
    
    risk_scores = query.offset(skip).limit(limit).all()
    return risk_scores


@router.post("/", response_model=RiskScoreResponse)
async def create_risk_score(risk_score: RiskScoreCreate, db: Session = Depends(get_db)):
    """Create a new risk score entry"""
    db_risk_score = RiskScore(**risk_score.dict())
    db.add(db_risk_score)
    db.commit()
    db.refresh(db_risk_score)
    return db_risk_score
