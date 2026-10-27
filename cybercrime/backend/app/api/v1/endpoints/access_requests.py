"""
Investigator Access Request endpoints
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr

from app.db.database import get_db
from app.db.models import InvestigatorAccessRequest, User
from app.core.security import get_password_hash
from app.core.audit_logging import emit_audit_log

router = APIRouter()


class AccessRequestCreate(BaseModel):
    full_name: str
    email: EmailStr
    reason: Optional[str] = None
    requested_password: str


class AccessRequestResponse(BaseModel):
    id: int
    full_name: str
    email: str
    reason: Optional[str]
    status: str
    reviewed_by: Optional[int]
    reviewed_at: Optional[str]
    rejection_reason: Optional[str]
    created_at: str
    updated_at: str


class AccessRequestUpdate(BaseModel):
    status: str  # approved, rejected
    rejection_reason: Optional[str] = None
    initial_password: Optional[str] = None


class AdminSetPasswordRequest(BaseModel):
    email: EmailStr
    new_password: str


@router.post("/request", response_model=AccessRequestResponse, status_code=status.HTTP_201_CREATED)
async def create_access_request(
    request: AccessRequestCreate,
    db: Session = Depends(get_db)
):
    """Submit a new investigator access request"""
    requested_password = request.requested_password.strip()
    if len(requested_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters long"
        )

    # Check if email already exists in users table
    existing_user = db.query(User).filter(User.email == request.email.lower().strip()).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists"
        )
    
    # Check if there's already a pending request for this email
    existing_request = db.query(InvestigatorAccessRequest).filter(
        InvestigatorAccessRequest.email == request.email.lower().strip(),
        InvestigatorAccessRequest.status == "pending"
    ).first()
    if existing_request:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A pending request already exists for this email"
        )
    
    # Create new request
    db_request = InvestigatorAccessRequest(
        full_name=request.full_name,
        email=request.email.lower().strip(),
        reason=request.reason,
        requested_password_hash=get_password_hash(requested_password),
        status="pending"
    )
    db.add(db_request)
    db.commit()
    db.refresh(db_request)
    
    # Create a notification/message for superadmin about the new request
    try:
        from app.db.models import Message
        from datetime import datetime
        
        # Get superadmin user
        superadmin = db.query(User).filter(User.role == "superadmin").first()
        if superadmin:
            # Create a message/notification for superadmin
            notification = Message(
                sender_id=None,  # System-generated
                recipient_id=superadmin.id,
                message_type="notification",
                subject=f"New Investigator Access Request: {request.full_name}",
                content=f"A new investigator access request has been submitted.\n\nName: {request.full_name}\nEmail: {request.email}\nReason: {request.reason or 'No reason provided'}\n\nRequest ID: {db_request.id}\n\nPlease review this request in the Access Requests section.",
                priority="high",
                is_broadcast=False,
                is_read=False
            )
            db.add(notification)
            db.commit()
    except Exception as e:
        # Don't fail the request creation if notification fails
        emit_audit_log(
            action="access_request.notify",
            status="warning",
            message="Failed to create notification for access request.",
            details={"error": str(e)},
        )
    
    return db_request.to_dict()


@router.get("/requests", response_model=List[AccessRequestResponse])
async def get_access_requests(
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get all access requests (superadmin only)"""
    query = db.query(InvestigatorAccessRequest)
    
    if status_filter:
        query = query.filter(InvestigatorAccessRequest.status == status_filter)
    
    requests = query.order_by(InvestigatorAccessRequest.created_at.desc()).all()
    return [req.to_dict() for req in requests]


@router.get("/requests/{request_id}", response_model=AccessRequestResponse)
async def get_access_request(
    request_id: int,
    db: Session = Depends(get_db)
):
    """Get a specific access request"""
    request = db.query(InvestigatorAccessRequest).filter(InvestigatorAccessRequest.id == request_id).first()
    if not request:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found")
    return request.to_dict()


@router.patch("/requests/{request_id}/review", response_model=AccessRequestResponse)
async def review_access_request(
    request_id: int,
    update: AccessRequestUpdate,
    http_request: Request,
    reviewed_by: Optional[int] = None,  # Superadmin user ID
    db: Session = Depends(get_db)
):
    """Approve or reject an access request (superadmin only)"""
    from datetime import datetime
    
    access_request = db.query(InvestigatorAccessRequest).filter(InvestigatorAccessRequest.id == request_id).first()
    if not access_request:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found")
    
    if access_request.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Request is already {access_request.status}"
        )
    
    if update.status not in ["approved", "rejected"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Status must be 'approved' or 'rejected'"
        )
    
    # Update request status
    access_request.status = update.status
    if getattr(http_request.state, "current_user", None):
        reviewed_by = http_request.state.current_user.id
    access_request.reviewed_by = reviewed_by
    access_request.reviewed_at = datetime.utcnow()
    if update.status == "rejected" and update.rejection_reason:
        access_request.rejection_reason = update.rejection_reason
    
    # If approved, create the investigator account
    if update.status == "approved":
        chosen_password = (update.initial_password or "").strip()
        if chosen_password and len(chosen_password) < 8:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="initial_password must be at least 8 characters long"
            )

        existing_user = db.query(User).filter(User.email == access_request.email).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"User with email {access_request.email} already exists"
            )

        new_user = User(
            email=access_request.email,
            hashed_password=(
                get_password_hash(chosen_password)
                if chosen_password
                else access_request.requested_password_hash
            ),
            full_name=access_request.full_name,
            role="investigator",
            is_active=True
        )
        if not new_user.hashed_password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No password available for approval. Set initial_password during approval."
            )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
    
    db.commit()
    db.refresh(access_request)
    
    return access_request.to_dict()


@router.post("/admin/set-password")
async def admin_set_password(
    payload: AdminSetPasswordRequest,
    http_request: Request,
    db: Session = Depends(get_db),
):
    """Set/reset investigator password (superadmin only)."""
    current_user = getattr(http_request.state, "current_user", None)
    if not current_user or getattr(current_user, "role", None) != "superadmin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only superadmin can set investigator passwords"
        )

    new_password = payload.new_password.strip()
    if len(new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="new_password must be at least 8 characters long"
        )

    user = db.query(User).filter(User.email == payload.email.lower().strip()).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    if user.role != "investigator":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password reset via this endpoint is only allowed for investigator accounts"
        )

    user.hashed_password = get_password_hash(new_password)
    user.is_active = True
    db.commit()

    return {
        "success": True,
        "message": f"Password updated for investigator {user.email}",
        "email": user.email
    }
