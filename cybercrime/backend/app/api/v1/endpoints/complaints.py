"""
Complaints endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import datetime
import json

from app.db.database import get_db
from app.db.models import Complaint, IncidentReport, User
from app.api.v1.schemas import ComplaintCreate, ComplaintResponse

router = APIRouter()

def _enrich_complaint_payload(db: Session, complaint: Complaint) -> dict:
    payload = complaint.to_dict()
    if payload.get("investigator_id") and (payload.get("investigator_name") or payload.get("investigator_email")):
        return payload

    # Legacy fallback: infer investigator from related incident reports for the same wallet.
    related_report = (
        db.query(IncidentReport)
        .filter(IncidentReport.wallet_address == complaint.wallet_address)
        .filter(IncidentReport.investigator_id.isnot(None))
        .order_by(IncidentReport.created_at.desc())
        .first()
    )
    if not related_report or not related_report.investigator_id:
        return payload

    investigator = db.query(User).filter(User.id == related_report.investigator_id).first()
    if not investigator:
        return payload

    payload["investigator_id"] = investigator.id
    payload["investigator_name"] = investigator.full_name or investigator.email
    payload["investigator_email"] = investigator.email

    # Fill missing location metadata from investigator profile when absent in legacy complaint rows.
    if not payload.get("investigator_location_city"):
        payload["investigator_location_city"] = investigator.location_city
    if not payload.get("investigator_location_country"):
        payload["investigator_location_country"] = investigator.location_country
    if payload.get("investigator_location_latitude") is None:
        payload["investigator_location_latitude"] = investigator.location_latitude
    if payload.get("investigator_location_longitude") is None:
        payload["investigator_location_longitude"] = investigator.location_longitude
    if not payload.get("investigator_location_ip"):
        payload["investigator_location_ip"] = investigator.location_ip
    return payload


@router.get("/", response_model=List[ComplaintResponse])
async def get_complaints(
    investigator_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    """Get all filed complaints"""
    query = db.query(Complaint).options(joinedload(Complaint.investigator))
    if investigator_id is not None:
        query = query.filter(Complaint.investigator_id == investigator_id)
    
    complaints = (
        query
        .order_by(Complaint.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return [_enrich_complaint_payload(db, c) for c in complaints]


@router.get("/{complaint_id}", response_model=ComplaintResponse)
async def get_complaint(complaint_id: int, db: Session = Depends(get_db)):
    """Get a specific complaint by ID"""
    complaint = db.query(Complaint).options(joinedload(Complaint.investigator)).filter(Complaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    return _enrich_complaint_payload(db, complaint)


@router.post("/", response_model=ComplaintResponse)
async def create_complaint(
    complaint: ComplaintCreate,
    request: Request,
    db: Session = Depends(get_db),
):
    """Create a new complaint"""
    current_user = getattr(request.state, "current_user", None)
    effective_investigator_id = complaint.investigator_id

    # Prefer authenticated investigator identity over client-provided values.
    if current_user and getattr(current_user, "id", None):
        effective_investigator_id = current_user.id

    investigator_location_city = complaint.investigator_location_city
    investigator_location_country = complaint.investigator_location_country
    investigator_location_latitude = complaint.investigator_location_latitude
    investigator_location_longitude = complaint.investigator_location_longitude
    investigator_location_ip = complaint.investigator_location_ip

    # Fallback to investigator profile location when request-side geo detection is unavailable.
    if effective_investigator_id and (
        not investigator_location_city
        and not investigator_location_country
        and investigator_location_latitude is None
        and investigator_location_longitude is None
        and not investigator_location_ip
    ):
        investigator = db.query(User).filter(User.id == effective_investigator_id).first()
        if investigator:
            investigator_location_city = investigator.location_city
            investigator_location_country = investigator.location_country
            investigator_location_latitude = investigator.location_latitude
            investigator_location_longitude = investigator.location_longitude
            investigator_location_ip = investigator.location_ip

    db_complaint = Complaint(
        wallet_address=complaint.wallet_address,
        investigator_id=effective_investigator_id,
        officer_designation=complaint.officer_designation,
        officer_address=complaint.officer_address,
        officer_email=json.dumps(complaint.officer_email or []),
        officer_mobile=json.dumps(complaint.officer_mobile or []),
        officer_telephone=json.dumps(complaint.officer_telephone or []),
        incident_description=complaint.incident_description,
        internal_notes=complaint.internal_notes,
        evidence_ids=json.dumps(complaint.evidence_ids or []),
        investigator_location_city=investigator_location_city,
        investigator_location_country=investigator_location_country,
        investigator_location_latitude=investigator_location_latitude,
        investigator_location_longitude=investigator_location_longitude,
        investigator_location_ip=investigator_location_ip,
        status="submitted",
    )
    db.add(db_complaint)
    db.commit()
    db.refresh(db_complaint)
    # Reload with investigator relationship
    db.refresh(db_complaint)
    complaint_with_investigator = db.query(Complaint).options(joinedload(Complaint.investigator)).filter(Complaint.id == db_complaint.id).first()
    return (
        _enrich_complaint_payload(db, complaint_with_investigator)
        if complaint_with_investigator
        else _enrich_complaint_payload(db, db_complaint)
    )


@router.patch("/{complaint_id}/status", response_model=ComplaintResponse)
async def update_complaint_status(
    complaint_id: int,
    status: str,
    db: Session = Depends(get_db),
):
    """Update complaint status"""
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    
    complaint.status = status
    complaint.updated_at = datetime.now()
    db.add(complaint)
    db.commit()
    db.refresh(complaint)
    # Reload with investigator relationship
    complaint_with_investigator = db.query(Complaint).options(joinedload(Complaint.investigator)).filter(Complaint.id == complaint.id).first()
    return (
        _enrich_complaint_payload(db, complaint_with_investigator)
        if complaint_with_investigator
        else _enrich_complaint_payload(db, complaint)
    )
