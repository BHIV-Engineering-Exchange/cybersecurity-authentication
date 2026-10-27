"""
Authorization Decision Endpoint (POST /api/v1/authz/check)
Owner: Kaushlendra — Data, API & Access Control
Conforms strictly to Phase 2 Access Control API Contract.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional
from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.core.canonical_event import emit_canonical_event, ALLOWED_ROLES


router = APIRouter()


class SubjectModel(BaseModel):
    actor_id: str
    role: str
    is_active: bool = True


class ResourceCheckModel(BaseModel):
    type: str
    id: str
    owner_id: Optional[str] = None


class AuthzCheckRequest(BaseModel):
    contract_version: str = "1.0.0"
    subject: SubjectModel
    action: str
    resource: ResourceCheckModel
    context: Optional[Dict[str, Any]] = None


class AuthzCheckResponse(BaseModel):
    contract_version: str = "1.0.0"
    decision: str  # ALLOW or DENY
    reason_code: str
    reason: str
    trace_id: str
    evaluated_at: str
    policy_applied: Optional[str] = "rbac_permissions_v1"


# Permitted action matrix for investigator role based on rbac-permissions.json
INVESTIGATOR_PERMITTED_ACTIONS = {
    "evidence": {"read", "create", "update", "upload", "verify", "anchor"},
    "case": {"read", "create", "update"},
    "wallet": {"read", "create", "update"},
    "transaction": {"read", "create", "update"},
    "incident": {"read", "create", "update"},
    "complaint": {"read", "create", "update"},
    "watchlist": {"read", "create", "update", "delete"},  # /api/v1/watchlist/* DELETE allowed
    "dashboard": {"read"},
}


@router.post("/check", response_model=AuthzCheckResponse, status_code=status.HTTP_200_OK)
async def check_authorization(
    req: AuthzCheckRequest,
    request: Request,
    db: Session = Depends(get_db),
    x_trace_id: Optional[str] = Header(None, alias="X-Trace-Id"),
):
    """
    Evaluates an authorization request under strict deny-by-default rules.
    Conforms to Phase 2 Access Control Contract POST /api/v1/authz/check.
    Requires verified authenticated caller.
    """
    trace_id = (
        x_trace_id
        or getattr(request.state, "trace_id", None)
        or f"trace-{uuid.uuid4().hex[:16]}"
    )
    request_id = getattr(request.state, "request_id", None) or f"req-{uuid.uuid4().hex[:12]}"

    # SEC-01: Require verified authenticated identity
    current_user = getattr(request.state, "current_user", None)
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required to query authorization decisions.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 1. Validate contract version
    if req.contract_version != "1.0.0":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported contract_version: {req.contract_version}. Must equal '1.0.0'",
        )

    # SEC-01: Prevent identity spoofing and oracle probing
    is_superadmin = (current_user.role == "superadmin")
    caller_actor_id = f"cc_usr_{current_user.id}"

    if not is_superadmin:
        # Non-superadmin may only query authorization for their own identity
        clean_subject_id = req.subject.actor_id.replace("cc_usr_", "").strip()
        if clean_subject_id != str(current_user.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: Subject actor_id '{req.subject.actor_id}' does not match authenticated principal '{caller_actor_id}'.",
            )
        # Bind role and active status to server truth, ignoring caller-provided JSON
        subject_role = current_user.role
        subject_is_active = current_user.is_active
    else:
        subject_role = req.subject.role
        subject_is_active = req.subject.is_active

    # 2. Strict Deny-by-Default Evaluation
    decision = "DENY"
    reason_code = "DENIED_BY_DEFAULT"
    reason = "Access denied: No matching policy grant found."

    # A. Account Active check
    if not subject_is_active:
        decision = "DENY"
        reason_code = "ACCOUNT_INACTIVE"
        reason = f"Access denied: Subject '{req.subject.actor_id}' account is deactivated."

    # B. Role check
    elif subject_role not in ALLOWED_ROLES:
        decision = "DENY"
        reason_code = "ROLE_NOT_PERMITTED"
        reason = f"Access denied: Role '{subject_role}' is not a recognized system role."

    # C. Superadmin role has universal allow
    elif subject_role == "superadmin":
        decision = "ALLOW"
        reason_code = "ALLOWED_BY_POLICY"
        reason = "Superadmin role granted full access across all resources."

    # D. Investigator role evaluation
    elif subject_role == "investigator":
        # Check self-boundary condition
        actor_num = req.subject.actor_id.replace("cc_usr_", "").strip()
        owner_num = req.resource.owner_id.replace("cc_usr_", "").strip() if req.resource.owner_id else None

        if owner_num and owner_num != actor_num and req.resource.type in ("investigator", "messages", "cases"):
            decision = "DENY"
            reason_code = "SELF_BOUNDARY_MISMATCH"
            reason = f"Access denied: Investigator '{req.subject.actor_id}' cannot access resources belonging to '{req.resource.owner_id}'."
        else:
            res_type = req.resource.type.lower()
            allowed_actions = INVESTIGATOR_PERMITTED_ACTIONS.get(res_type, set())
            clean_action = req.action.lower()

            if clean_action in allowed_actions:
                decision = "ALLOW"
                reason_code = "ALLOWED_BY_POLICY"
                reason = f"Investigator role authorized for action '{req.action}' on resource '{req.resource.type}'."
            else:
                decision = "DENY"
                reason_code = "ROLE_NOT_PERMITTED"
                reason = f"Investigator role is not authorized to perform action '{req.action}' on resource '{req.resource.type}'."

    # E. Public or other role evaluation
    elif req.subject.role == "public":
        if req.action.lower() in ("read", "login", "register") and req.resource.type.lower() in ("system_config", "auth"):
            decision = "ALLOW"
            reason_code = "ALLOWED_BY_POLICY"
            reason = "Public access allowed for public authentication/health endpoints."
        else:
            decision = "DENY"
            reason_code = "AUTHENTICATION_REQUIRED"
            reason = "Access denied: Authentication required for protected resource."

    # 3. Emit Canonical Security Event for auditability
    now_utc = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"

    # Map action to canonical enum if possible
    canonical_action = req.action.lower() if req.action.lower() in (
        "create", "read", "update", "delete", "login", "logout",
        "freeze", "unfreeze", "upload", "download", "verify", "anchor",
        "execute", "escalate", "revoke"
    ) else "read"

    emit_canonical_event(
        event_type="authz.decision",
        action=canonical_action,
        actor_id=req.subject.actor_id,
        role=req.subject.role,
        authenticated=req.subject.role != "public",
        resource_type=req.resource.type if req.resource.type in (
            "evidence", "case", "wallet", "transaction", "user", "policy", "system_config", "artifact"
        ) else "policy",
        resource_id=req.resource.id,
        outcome_status="SUCCESS" if decision == "ALLOW" else "DENIED",
        status_code=200,
        reason_code=reason_code,
        message=reason,
        trace_id=trace_id,
        request_id=request_id,
        policy_id="rbac_permissions_v1",
        rule_name=req.action,
        metadata={
            "requested_action": req.action,
            "decision": decision,
            "context": req.context,
        },
        db_session=db,
    )

    return AuthzCheckResponse(
        contract_version="1.0.0",
        decision=decision,
        reason_code=reason_code,
        reason=reason,
        trace_id=trace_id,
        evaluated_at=now_utc,
        policy_applied="rbac_permissions_v1",
    )
