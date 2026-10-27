"""
Audit log endpoints
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from app.db.database import get_db
from app.db.models import AuditLog
from app.api.v1.schemas import AuditLogResponse

router = APIRouter()


@router.get("/", response_model=List[AuditLogResponse])
async def get_audit_logs(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Get audit log entries"""
    audit_logs = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).offset(skip).limit(limit).all()
    return audit_logs
