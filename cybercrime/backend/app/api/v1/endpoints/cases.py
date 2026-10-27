"""
Case management endpoints
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.db.database import get_db
from app.db.models import Case
from app.api.v1.schemas import CaseResponse, CaseCreate

router = APIRouter()


@router.get("/", response_model=List[CaseResponse])
async def get_cases(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Get all investigation cases"""
    cases = db.query(Case).offset(skip).limit(limit).all()
    return cases


@router.get("/{case_id}", response_model=CaseResponse)
async def get_case(case_id: int, db: Session = Depends(get_db)):
    """Get a specific case by ID"""
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    return case


@router.post("/", response_model=CaseResponse)
async def create_case(case: CaseCreate, db: Session = Depends(get_db)):
    """Create a new investigation case"""
    db_case = Case(**case.dict())
    db.add(db_case)
    db.commit()
    db.refresh(db_case)
    return db_case
