"""
Investigator self-service endpoints
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from typing import Dict
from datetime import datetime, timedelta

from app.db.database import get_db
from app.db.models import User, Complaint, IncidentReport, Evidence, Message, AuditLog

router = APIRouter()


@router.get(
    "/{investigator_id}/dashboard",
    operation_id="get_investigator_self_service_dashboard",
)
async def get_investigator_dashboard(
    investigator_id: int,
    db: Session = Depends(get_db)
):
    """Get investigator self-service dashboard stats"""
    # Verify investigator exists
    investigator = db.query(User).filter(User.id == investigator_id).first()
    if not investigator:
        raise HTTPException(status_code=404, detail="Investigator not found")
    
    # Get stats
    total_complaints = db.query(Complaint).filter(Complaint.investigator_id == investigator_id).count()
    active_complaints = db.query(Complaint).filter(
        and_(
            Complaint.investigator_id == investigator_id,
            Complaint.status.in_(["submitted", "under_review"])
        )
    ).count()
    
    total_reports = db.query(IncidentReport).filter(IncidentReport.investigator_id == investigator_id).count()
    active_reports = db.query(IncidentReport).filter(
        and_(
            IncidentReport.investigator_id == investigator_id,
            IncidentReport.status.in_(["investigating", "under_review"])
        )
    ).count()
    
    total_evidence = db.query(Evidence).filter(Evidence.investigator_id == investigator_id).count()
    
    unread_messages = db.query(Message).filter(
        and_(
            Message.recipient_id == investigator_id,
            Message.is_read == False
        )
    ).count()
    
    # Recent activity (last 7 days)
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    recent_complaints = db.query(Complaint).filter(
        and_(
            Complaint.investigator_id == investigator_id,
            Complaint.created_at >= seven_days_ago
        )
    ).count()
    
    recent_reports = db.query(IncidentReport).filter(
        and_(
            IncidentReport.investigator_id == investigator_id,
            IncidentReport.created_at >= seven_days_ago
        )
    ).count()
    
    recent_evidence = db.query(Evidence).filter(
        and_(
            Evidence.investigator_id == investigator_id,
            Evidence.created_at >= seven_days_ago
        )
    ).count()
    
    # Activity timeline (last 10 actions)
    recent_activities = []
    
    # Get recent complaints
    recent_complaints_list = db.query(Complaint).filter(
        Complaint.investigator_id == investigator_id
    ).order_by(Complaint.created_at.desc()).limit(5).all()
    for c in recent_complaints_list:
        recent_activities.append({
            "type": "complaint",
            "id": c.id,
            "title": f"Filed complaint for {c.wallet_address[:10]}...",
            "timestamp": c.created_at.isoformat() if c.created_at else None,
            "status": c.status
        })
    
    # Get recent reports
    recent_reports_list = db.query(IncidentReport).filter(
        IncidentReport.investigator_id == investigator_id
    ).order_by(IncidentReport.created_at.desc()).limit(5).all()
    for r in recent_reports_list:
        recent_activities.append({
            "type": "report",
            "id": r.id,
            "title": f"AI analysis for {r.wallet_address[:10]}...",
            "timestamp": r.created_at.isoformat() if r.created_at else None,
            "status": r.status,
            "risk_level": r.risk_level
        })
    
    # Get recent evidence
    recent_evidence_list = db.query(Evidence).filter(
        Evidence.investigator_id == investigator_id
    ).order_by(Evidence.created_at.desc()).limit(5).all()
    for e in recent_evidence_list:
        recent_activities.append({
            "type": "evidence",
            "id": e.id,
            "title": e.title or "Evidence uploaded",
            "timestamp": e.created_at.isoformat() if e.created_at else None,
            "status": e.anchor_status
        })
    
    # Sort by timestamp and limit to 10
    recent_activities.sort(key=lambda x: x["timestamp"] or "", reverse=True)
    recent_activities = recent_activities[:10]
    
    return {
        "investigator": {
            "id": investigator.id,
            "email": investigator.email,
            "full_name": investigator.full_name,
            "availability_status": investigator.availability_status,
            "status_updated_at": investigator.status_updated_at.isoformat() if investigator.status_updated_at else None
        },
        "stats": {
            "total_complaints": total_complaints,
            "active_complaints": active_complaints,
            "total_reports": total_reports,
            "active_reports": active_reports,
            "total_evidence": total_evidence,
            "unread_messages": unread_messages,
            "recent_complaints": recent_complaints,
            "recent_reports": recent_reports,
            "recent_evidence": recent_evidence
        },
        "recent_activity": recent_activities
    }


@router.patch(
    "/{investigator_id}/status",
    operation_id="update_investigator_self_service_status",
)
async def update_investigator_status(
    investigator_id: int,
    status: str,  # available, busy, away, offline
    db: Session = Depends(get_db)
):
    """Update investigator availability status"""
    if status not in ["available", "busy", "away", "offline"]:
        raise HTTPException(status_code=400, detail="Invalid status. Must be: available, busy, away, offline")
    
    investigator = db.query(User).filter(User.id == investigator_id).first()
    if not investigator:
        raise HTTPException(status_code=404, detail="Investigator not found")
    
    investigator.availability_status = status
    investigator.status_updated_at = datetime.utcnow()
    db.commit()
    db.refresh(investigator)
    
    return {
        "success": True,
        "investigator_id": investigator_id,
        "availability_status": status,
        "status_updated_at": investigator.status_updated_at.isoformat() if investigator.status_updated_at else None
    }
