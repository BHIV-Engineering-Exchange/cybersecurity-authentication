"""
Security incidents opened by rule-based detection (GET /api/v1/threats/incidents).

Read-only view for superadmins of the correlated incidents written by app/core/threat_detection.py. An incident is
decision support for a human reviewer: it carries the rule, its version, a confidence, the stated uncertainty and the
canonical event ids it is based on. Lanes: Shivam (threat assessment), Aryan Dias (correlation).
"""

from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import SecurityIncident

router = APIRouter()


def _require_superadmin(request: Request) -> None:
    user = getattr(request.state, "current_user", None)
    if not user:  # defence in depth; the RBAC middleware already limits /api/v1/threats to superadmins
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required.")
    if user.role != "superadmin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only a superadmin can read security incidents.")


@router.get("/incidents", response_model=List[dict])
def list_incidents(request: Request, status_filter: Optional[str] = None, limit: int = 100,
                   db: Session = Depends(get_db)):
    """Newest first. `status_filter=open` lists incidents still awaiting review."""
    _require_superadmin(request)
    query = db.query(SecurityIncident)
    if status_filter:
        query = query.filter(SecurityIncident.status == status_filter)
    return [i.to_dict() for i in query.order_by(SecurityIncident.id.desc()).limit(max(1, min(limit, 500))).all()]


@router.get("/incidents/{incident_id}", response_model=dict)
def get_incident(incident_id: str, request: Request, db: Session = Depends(get_db)):
    _require_superadmin(request)
    incident = db.query(SecurityIncident).filter(SecurityIncident.incident_id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found.")
    return incident.to_dict()
