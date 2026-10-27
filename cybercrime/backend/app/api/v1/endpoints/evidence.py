"""
Evidence endpoints
"""

from datetime import datetime
import hashlib
import os
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Request
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import Evidence, User, Message
from app.api.v1.schemas import EvidenceResponse
from app.core.config import settings
from app.core.security import decode_access_token
from app.core.audit_logging import emit_audit_log
from app.core.sovereign_integrations import (
    emit_core_event,
    store_evidence_in_bucket,
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)

router = APIRouter()

# Ensure evidence storage directory exists
EVIDENCE_STORAGE_DIR = Path(settings.EVIDENCE_STORAGE_PATH)
EVIDENCE_STORAGE_DIR.mkdir(parents=True, exist_ok=True)


async def get_current_user_from_request(
    request: Request,
    db: Session = Depends(get_db)
) -> Optional[User]:
    """Get current user from Authorization header in request"""
    if getattr(request.state, "current_user", None):
        return request.state.current_user
    authorization = request.headers.get("Authorization")
    if not authorization:
        return None
    
    # Extract token from "Bearer <token>" format
    try:
        if authorization.startswith("Bearer "):
            token = authorization.split(" ")[1]
        else:
            token = authorization
    except Exception:
        return None
    
    if not token:
        return None
    
    try:
        payload = decode_access_token(token)
        if payload is None:
            return None
        email = payload.get("sub")
        if not email:
            return None
        user = db.query(User).filter(User.email == email).first()
        return user
    except Exception:
        return None


@router.get("/", response_model=List[EvidenceResponse])
async def get_evidence(
    case_id: Optional[int] = None,
    investigator_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    """Get all evidence"""
    query = db.query(Evidence)
    if case_id is not None:
        query = query.filter(Evidence.case_id == case_id)
    if investigator_id is not None:
        query = query.filter(Evidence.investigator_id == investigator_id)

    evidence_list = query.offset(skip).limit(limit).all()
    return evidence_list


@router.get("/{evidence_id}", response_model=EvidenceResponse)
async def get_evidence_item(evidence_id: int, db: Session = Depends(get_db)):
    """Get a specific evidence item by ID"""
    evidence_item = db.query(Evidence).filter(Evidence.id == evidence_id).first()
    if not evidence_item:
        raise HTTPException(status_code=404, detail="Evidence not found")
    return evidence_item


@router.get("/{evidence_id}/download")
async def download_evidence(evidence_id: int, db: Session = Depends(get_db)):
    """Download an evidence file"""
    evidence_item = db.query(Evidence).filter(Evidence.id == evidence_id).first()
    if not evidence_item:
        raise HTTPException(status_code=404, detail="Evidence not found")
    
    if not evidence_item.file_path:
        raise HTTPException(
            status_code=404, 
            detail="Evidence file was uploaded before file storage was implemented. File is not available for download."
        )
    
    if not os.path.exists(evidence_item.file_path):
        raise HTTPException(
            status_code=404, 
            detail="Evidence file not found on disk. The file may have been deleted or moved."
        )
    emit_core_event(
        action="evidence.download",
        evidence_id=evidence_item.evidence_id,
        case_id=str(evidence_item.case_id) if evidence_item.case_id else None,
        risk_score=0.0,
        metadata={"source": "api", "evidence_db_id": evidence_item.id},
    )
    return FileResponse(
        path=evidence_item.file_path,
        filename=evidence_item.title or f"evidence_{evidence_id}",
        media_type=evidence_item.file_type or "application/octet-stream",
    )


@router.get("/{evidence_id}/view")
async def view_evidence(evidence_id: int, db: Session = Depends(get_db)):
    """View an evidence file (for images, PDFs, etc.)"""
    evidence_item = db.query(Evidence).filter(Evidence.id == evidence_id).first()
    if not evidence_item:
        raise HTTPException(status_code=404, detail="Evidence not found")
    
    if not evidence_item.file_path:
        raise HTTPException(
            status_code=404, 
            detail="Evidence file was uploaded before file storage was implemented. File is not available for viewing."
        )
    
    if not os.path.exists(evidence_item.file_path):
        raise HTTPException(
            status_code=404, 
            detail="Evidence file not found on disk. The file may have been deleted or moved."
        )
    emit_core_event(
        action="evidence.view",
        evidence_id=evidence_item.evidence_id,
        case_id=str(evidence_item.case_id) if evidence_item.case_id else None,
        risk_score=0.0,
        metadata={"source": "api", "evidence_db_id": evidence_item.id},
    )
    # For viewable files, return with appropriate content type
    return FileResponse(
        path=evidence_item.file_path,
        filename=evidence_item.title or f"evidence_{evidence_id}",
        media_type=evidence_item.file_type or "application/octet-stream",
    )


@router.post("/", response_model=EvidenceResponse)
async def create_evidence(
    request: Request,
    file: UploadFile = File(...),
    wallet_id: str = Form(...),
    title: str = Form(""),
    description: str = Form(""),
    tags: str = Form(""),
    risk_level: str = Form("medium"),
    investigator_id: Optional[int] = Form(None),
    db: Session = Depends(get_db),
):
    """
    Create a new evidence entry from an uploaded file.

    This is designed to work with the Investigator UI "Evidence Upload"
    section. It accepts ANY file type (PDF, images, CSV, Excel, docs, etc.)
    via multipart/form-data and stores the file plus metadata in SQL.
    Notifies superadmin when evidence is uploaded.
    """
    try:
        # Get current user from request headers
        current_user: Optional[User] = await get_current_user_from_request(request, db)
        
        # Validate required fields
        if not wallet_id or not wallet_id.strip():
            raise HTTPException(status_code=400, detail="Wallet ID is required")
        
        if not file.filename:
            raise HTTPException(status_code=400, detail="File is required")
        
        # Use current_user's ID if available, otherwise use provided investigator_id
        if current_user and current_user.role == "investigator":
            investigator_id = current_user.id
        elif not investigator_id:
            # If no investigator_id provided and no authenticated user, that's okay
            # Evidence can be uploaded without investigator association
            pass
        
        # Read file bytes and compute a SHA-256 hash for integrity
        content = await file.read()
        file_hash = hashlib.sha256(content).hexdigest()
        file_size = len(content)

        # Generate a simple evidence ID based on timestamp
        evidence_id = f"EV-{int(datetime.utcnow().timestamp() * 1000)}"

        # Use provided title if present, otherwise fall back to filename / evidence_id
        resolved_title = title or file.filename or evidence_id

        # Get file extension and MIME type
        file_extension = ""
        if file.filename:
            file_extension = Path(file.filename).suffix
        file_type = file.content_type or file_extension or "application/octet-stream"

        # Save file to storage directory
        # Use evidence_id as filename to ensure uniqueness
        safe_filename = f"{evidence_id}{file_extension}" if file_extension else evidence_id
        file_path = EVIDENCE_STORAGE_DIR / safe_filename
        
        # Write file to disk
        with open(file_path, "wb") as f:
            f.write(content)

        # Attempt sovereign bucket store (graceful degradation to local storage).
        store_evidence_in_bucket(
            evidence_id=evidence_id,
            sha256=file_hash,
            filename=file.filename or safe_filename,
            content=content,
            content_type=file_type,
        )

        # Enrich description with context from the form so it's visible later
        details_parts = []
        if description:
            details_parts.append(description)
        details_parts.append(f"Wallet: {wallet_id}")
        if tags:
            details_parts.append(f"Tags: {tags}")
        if risk_level:
            details_parts.append(f"Risk level: {risk_level}")
        full_description = "\n".join(details_parts)

        db_evidence = Evidence(
            evidence_id=evidence_id,
            title=resolved_title,
            description=full_description,
            hash=file_hash,
            file_path=str(file_path),
            file_size=file_size,
            file_type=file_type,
            anchor_status="pending",
            immutable=True,
            investigator_id=investigator_id,
        )

        db.add(db_evidence)
        db.commit()
        db.refresh(db_evidence)
        risk_score = {
            "low": 0.25,
            "medium": 0.5,
            "high": 0.75,
            "critical": 0.95,
        }.get((risk_level or "").lower(), 0.0)
        emit_core_event(
            action="evidence.upload",
            evidence_id=evidence_id,
            case_id=str(db_evidence.case_id) if db_evidence.case_id else None,
            risk_score=risk_score,
            metadata={
                "walletId": wallet_id,
                "sha256": file_hash,
                "fileSize": file_size,
                "contentType": file_type,
            },
        )
        
        # Notify superadmin about new evidence upload
        try:
            superadmin = db.query(User).filter(User.role == "superadmin").first()
            if superadmin:
                # Get investigator name if available
                investigator_name = "Unknown Investigator"
                if investigator_id:
                    investigator = db.query(User).filter(User.id == investigator_id).first()
                    if investigator:
                        investigator_name = investigator.full_name or investigator.email or "Unknown Investigator"
                elif current_user:
                    investigator_name = current_user.full_name or current_user.email or "Unknown Investigator"
                
                notification = Message(
                    sender_id=None,  # System-generated
                    recipient_id=superadmin.id,
                    message_type="notification",
                    subject=f"New Evidence Uploaded: {resolved_title}",
                    content=f"A new evidence file has been uploaded.\n\nEvidence ID: {evidence_id}\nTitle: {resolved_title}\nWallet ID: {wallet_id}\nInvestigator: {investigator_name}\nRisk Level: {risk_level}\nFile Size: {file_size / 1024:.2f} KB\n\nDescription: {description or 'No description provided'}\n\nView evidence in the Evidence Library section.",
                    priority="high",  # Changed to "high" to ensure it's visible
                    is_broadcast=False,
                    is_read=False
                )
                db.add(notification)
                db.commit()
                db.refresh(notification)
                
                # Verify notification was created
                verify_notification = db.query(Message).filter(Message.id == notification.id).first()
                if verify_notification:
                    emit_audit_log(
                        action="evidence.notify",
                        status="success",
                        message="Created evidence upload notification.",
                        entity_type="message",
                        entity_id=str(notification.id),
                    )
                else:
                    emit_audit_log(
                        action="evidence.notify",
                        status="error",
                        message="Evidence upload notification was not saved.",
                    )
            else:
                emit_audit_log(
                    action="evidence.notify",
                    status="warning",
                    message="No superadmin user found for evidence notification.",
                )
        except Exception as e:
            # Don't fail the evidence creation if notification fails
            import traceback
            error_msg = f"Failed to send superadmin notification for evidence upload: {e}"
            emit_audit_log(
                action="evidence.notify",
                status="error",
                message=error_msg,
                details={"traceback": traceback.format_exc()},
            )
        
        return db_evidence
    except HTTPException as he:
        # Re-raise HTTP exceptions as-is
        emit_audit_log(
            action="evidence.create",
            status="error",
            message="HTTP error creating evidence.",
            details={"error": he.detail},
        )
        raise
    except Exception as e:
        # Log the full error for debugging
        import traceback
        error_msg = f"Error creating evidence: {str(e)}\n{traceback.format_exc()}"
        emit_audit_log(
            action="evidence.create",
            status="error",
            message="Error creating evidence.",
            details={"traceback": error_msg},
        )
        raise HTTPException(
            status_code=500,
            detail=f"Failed to upload evidence: {str(e)}"
        )
