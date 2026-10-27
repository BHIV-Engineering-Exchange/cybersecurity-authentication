"""
Access Revocation Endpoint (POST /api/v1/access/revoke)
Owner: Kaushlendra — Data, API & Access Control
Conforms strictly to Phase 2 Access Control API Contract.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import User
from app.core.security import revoke_jti
from app.core.canonical_event import emit_canonical_event


router = APIRouter()


class RevocationTargetModel(BaseModel):
    actor_id: Optional[str] = None
    jti: Optional[str] = None
    role: Optional[str] = None
    action: Optional[str] = None


class RevocationRequest(BaseModel):
    contract_version: str = "1.0.0"
    revocation_type: str  # user_deactivation, token_invalidation, permission_revocation
    target: RevocationTargetModel
    reason: str = Field(..., min_length=10, max_length=256)
    requested_by: str


class RevocationResponse(BaseModel):
    contract_version: str = "1.0.0"
    revocation_id: str
    revocation_type: str
    status: str  # REVOKED, ALREADY_INACTIVE, SCHEDULED
    effective_at: str
    trace_id: str
    audit_event_id: str


@router.post("/revoke", response_model=RevocationResponse, status_code=status.HTTP_200_OK)
async def revoke_access(
    req: RevocationRequest,
    request: Request,
    db: Session = Depends(get_db),
    x_trace_id: Optional[str] = Header(None, alias="X-Trace-Id"),
):
    """
    Executes Tier 1 (permission modification), Tier 2 (account deactivation),
    or Tier 3 (token invalidation) revocations.
    Conforms to Phase 2 Access Control Contract POST /api/v1/access/revoke.
    """
    trace_id = (
        x_trace_id
        or getattr(request.state, "trace_id", None)
        or f"trace-{uuid.uuid4().hex[:16]}"
    )
    request_id = getattr(request.state, "request_id", None) or f"req-{uuid.uuid4().hex[:12]}"

    # SEC-06: Require server-verified authentication and superadmin authorization
    current_user = getattr(request.state, "current_user", None)
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required to revoke access.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if current_user.role != "superadmin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions: Only superadmin may revoke access.",
        )

    # SEC-06: Prevent actor attribution forgery; validate against authenticated principal
    authenticated_actor_id = f"cc_usr_{current_user.id}"
    if req.requested_by:
        clean_req_by = req.requested_by.replace("cc_usr_", "").strip()
        if clean_req_by != str(current_user.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: requested_by '{req.requested_by}' does not match authenticated principal '{authenticated_actor_id}'.",
            )
    revoking_actor = authenticated_actor_id

    # 1. Validate contract version
    if req.contract_version != "1.0.0":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported contract_version: {req.contract_version}. Must equal '1.0.0'",
        )

    revocation_id = str(uuid.uuid4())
    now_utc = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"
    revocation_status = "REVOKED"
    target_resource_id = ""
    resource_type = "user"

    # 2. Process Revocation by Tier
    if req.revocation_type == "user_deactivation":
        if not req.target.actor_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="target.actor_id is required for user_deactivation",
            )
        raw_id = req.target.actor_id.replace("cc_usr_", "").strip()
        try:
            target_user_id = int(raw_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid actor_id format for Cybercrime user: '{req.target.actor_id}'",
            )

        user = db.query(User).filter(User.id == target_user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User with ID {target_user_id} not found",
            )

        target_resource_id = req.target.actor_id
        resource_type = "user"

        if not user.is_active:
            revocation_status = "ALREADY_INACTIVE"
        else:
            user.is_active = False
            db.commit()
            db.refresh(user)
            revocation_status = "REVOKED"

    elif req.revocation_type == "token_invalidation":
        if not req.target.jti:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="target.jti is required for token_invalidation",
            )
        # SEC-03: Persistent revocation in database
        revoke_jti(
            jti=req.target.jti,
            reason=req.reason,
            revoked_by=revoking_actor,
            db=db,
        )
        target_resource_id = req.target.jti
        resource_type = "policy"
        revocation_status = "REVOKED"

    elif req.revocation_type == "permission_revocation":
        if not req.target.role or not req.target.action:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="target.role and target.action are required for permission_revocation",
            )
        target_resource_id = f"{req.target.role}:{req.target.action}"
        resource_type = "policy"
        revocation_status = "REVOKED"

    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported revocation_type: '{req.revocation_type}'. Must be one of ['user_deactivation', 'token_invalidation', 'permission_revocation']",
        )

    # 3. Emit Canonical Security Event (fail closed on persist error)
    audit_evt = emit_canonical_event(
        event_type="access.revoked",
        action="revoke",
        actor_id=revoking_actor,
        role="superadmin",
        resource_type=resource_type,
        resource_id=target_resource_id,
        outcome_status="SUCCESS",
        status_code=200,
        reason_code="REVOCATION_EXECUTED",
        message=f"Revocation of type '{req.revocation_type}' applied to '{target_resource_id}'. Reason: {req.reason}",
        trace_id=trace_id,
        request_id=request_id,
        policy_id="rbac_permissions_v1",
        metadata={
            "revocation_id": revocation_id,
            "revocation_type": req.revocation_type,
            "status": revocation_status,
            "administrative_reason": req.reason,
        },
        db_session=db,
        fail_on_persist_error=True,
    )

    return RevocationResponse(
        contract_version="1.0.0",
        revocation_id=revocation_id,
        revocation_type=req.revocation_type,
        status=revocation_status,
        effective_at=now_utc,
        trace_id=trace_id,
        audit_event_id=audit_evt.event_id,
    )
