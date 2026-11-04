"""
Protected access decision for VAJRA-controlled resources.

POST /api/v1/protected/access   (contract_version 1.0.0)

Runtime position (Task 1 sections D and M):
    VAJRA-controlled permission (consent) -> Cybersecurity enforcement (this endpoint)
    -> decision returned to the calling application (the operation runs only on ALLOW)
    -> evidence: local canonical audit event, then VAJRA evidence record, then TANTRA ledger
    -> replay references in the response.

What ALLOW means (and does not mean)
  * The caller passed RBAC, VAJRA reports the subject's authority state as GRANT or USE, and VAJRA
    confirmed the evidence record for this decision.
  * VAJRA's authority/verify returns no scope, so the requested action, resource and purpose are
    recorded but NOT checked against what the subject granted (response field vajra.scope_checked=false),
    and nothing binds the calling user to the subject. Both need a VAJRA contract that does not exist yet.

Order of work (VAJRA and TANTRA are written only after the local audit is stored)
  1. Read VAJRA authority (fail closed) and form the decision.
  2. Write the local canonical audit event. If that fails: HTTP 503, nothing else is called.
  3. Ask VAJRA to record evidence that commits to the audit event's hash.
  4. A tentative ALLOW whose VAJRA record is not RECORDED becomes DENY (VAJRA_EVIDENCE_NOT_RECORDED):
     a second audit event records the change and points to the first ("supersedes_event_id").
  5. Send a minimal projection of the final audit event to TANTRA (no free-text purpose, no keys).
  Edge cases: the local audit keeps the superseded tentative ALLOW next to the DENY that replaces it; if VAJRA
  stores the row but its reply is lost, VAJRA keeps a row for the tentative ALLOW while the caller gets DENY; if the
  process fails after step 3, the decision was made and recorded but the response was lost.

Other rules
  * Deny by default. TANTRA evidence is reported per sink and never changes the decision.
  * Cybersecurity only reads VAJRA authority state; it never changes it.
  * Idempotency: keys are scoped to the calling user and bound to the request content. A repeat of the
    same request returns the first decision with duplicate=true and re-executes nothing. A different
    request under the same key is refused (409). A stored ALLOW is replayed only within
    PROTECTED_ACCESS_REPLAY_TTL_SECONDS and only if VAJRA still reports GRANT/USE; otherwise 409
    STALE_DECISION. A claim left PENDING for more than 120 s (crashed request) is taken over.
  * Trace ids are limited to 128 characters of [A-Za-z0-9._:-] (they become part of the VAJRA record id).
  * This is a plain (sync) endpoint so slow VAJRA/TANTRA calls run in a worker thread and never block
    the server's event loop.
"""

from __future__ import annotations

import hashlib
import json
import re
import threading
import time
import uuid
from collections import deque
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core import bhiv_runtime
from app.core.audit_logging import emit_audit_log
from app.core.canonical_event import (
    ALLOWED_ACTIONS,
    ALLOWED_RESOURCE_TYPES,
    emit_canonical_event,
)
from app.core.config import settings
from app.core.error_responses import build_error_response
from app.db.database import get_db
from app.db.models import ProtectedAccessDecision

router = APIRouter()

CONTRACT_VERSION = "1.0.0"
POLICY_ID = "vajra_authority_v1"
PENDING_STALE_AFTER = timedelta(seconds=120)
TRACE_ID_RE = re.compile(r"^[A-Za-z0-9._:-]{1,128}$")

# Per-caller sliding window for PROTECTED_ACCESS_RATE_LIMIT_PER_MINUTE (CYB-14). Every accepted request can write
# an append-only VAJRA row, so a caller is capped. In memory, per process.
_rate_lock = threading.Lock()
_rate_windows: Dict[str, deque] = {}


def _within_rate_limit(actor_id: str) -> bool:
    limit = settings.PROTECTED_ACCESS_RATE_LIMIT_PER_MINUTE
    if limit <= 0:
        return True
    now = time.monotonic()
    with _rate_lock:
        window = _rate_windows.setdefault(actor_id, deque())
        while window and now - window[0] > 60.0:
            window.popleft()
        if len(window) >= limit:
            return False
        window.append(now)
        return True
TANTRA_METADATA_FIELDS = ("decision", "decision_id", "vajra_subject_ref", "vajra_status", "vajra_state",
                          "vajra_trace_id", "scope_checked", "supersedes_event_id")


class ProtectedResource(BaseModel):
    type: str = Field(..., description="One of the canonical resource types (evidence, case, wallet, ...)")
    id: str = Field(..., min_length=1, max_length=256)


class ProtectedAccessRequest(BaseModel):
    contract_version: str = CONTRACT_VERSION
    idempotency_key: Optional[str] = Field(None, min_length=8, max_length=128)
    vajra_subject: str = Field(..., min_length=1, max_length=256, description="VAJRA subject whose consent governs the resource")
    action: str = Field(..., description="Canonical action (read, update, download, ...)")
    resource: ProtectedResource
    purpose: str = Field(..., min_length=3, max_length=256)


class VajraAuthorityView(BaseModel):
    subject_ref: str
    status: str
    is_authorized: Optional[bool] = None
    current_state: Optional[str] = None
    scope_checked: bool = False  # VAJRA's verify returns no scope; see module docstring


class EvidenceView(BaseModel):
    local_audit_event_id: str
    superseded_audit_event_id: Optional[str] = None
    vajra: Dict[str, Any]
    tantra: Dict[str, Any]
    complete: bool
    gaps: List[str]


class ProtectedAccessResponse(BaseModel):
    contract_version: str = CONTRACT_VERSION
    decision: str
    reason_code: str
    reason: str
    decision_id: str
    trace_id: str
    request_id: str
    idempotency_key: Optional[str] = None
    duplicate: bool = False
    actor_id: str
    action: str
    resource: ProtectedResource
    vajra: VajraAuthorityView
    evidence: EvidenceView
    policy_applied: str = POLICY_ID
    evaluated_at: str


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _iso(dt: datetime) -> str:
    return dt.strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"


def _aware(dt: datetime) -> datetime:
    return dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt


def _error(status_code: int, code: str, message: str, trace_id: str, request_id: str) -> JSONResponse:
    payload = build_error_response(code=code, message=message, request_id=request_id, trace_id=trace_id,
                                   status_code=status_code)
    response = JSONResponse(status_code=status_code, content=payload)
    response.headers["X-Trace-Id"] = trace_id
    response.headers["X-Request-Id"] = request_id
    return response


def _fingerprint(req: ProtectedAccessRequest, action: str, resource_type: str) -> str:
    content = {"vajra_subject": req.vajra_subject, "action": action, "resource_type": resource_type,
               "resource_id": req.resource.id, "purpose": req.purpose}
    return hashlib.sha256(bhiv_runtime.compact_json(content).encode("utf-8")).hexdigest()


def _decide(authority: bhiv_runtime.SinkResult) -> Dict[str, str]:
    """Deny by default; a tentative ALLOW only when VAJRA reports GRANT or USE."""
    if authority.status == "NOT_CONFIGURED":
        return {"decision": "DENY", "reason_code": "VAJRA_NOT_CONFIGURED",
                "reason": "Access denied: VAJRA authority service is not configured, so consent cannot be confirmed."}
    if authority.status != "OK":
        return {"decision": "DENY", "reason_code": "VAJRA_UNAVAILABLE",
                "reason": f"Access denied: VAJRA authority could not be confirmed ({authority.status})."}
    state = authority.data.get("current_state") or "NONE"
    if authority.data.get("is_authorized") is not True:
        return {"decision": "DENY", "reason_code": "VAJRA_AUTHORITY_NOT_GRANTED",
                "reason": f"Access denied: VAJRA authority state is '{state}', which does not permit access."}
    return {"decision": "ALLOW", "reason_code": "ALLOWED_BY_VAJRA_AUTHORITY",
            "reason": f"Access permitted: VAJRA authority state is '{state}', the caller passed RBAC and VAJRA "
                      "recorded the evidence. Scope (action/resource) is not checked by VAJRA's verify contract."}


def _tantra_projection(event_json: str) -> Dict[str, Any]:
    """The canonical event minus free text and client keys (data minimisation for TANTRA)."""
    event = json.loads(event_json)
    meta = event.get("metadata") or {}
    event["metadata"] = {k: meta[k] for k in TANTRA_METADATA_FIELDS if k in meta}
    event.pop("extensions", None)
    return event


def _replay_or_refuse(existing: ProtectedAccessDecision, req: ProtectedAccessRequest, fingerprint: str,
                      trace_id: str, request_id: str):
    """Answer a repeated idempotency key without re-executing anything (or refuse)."""
    if existing.request_fingerprint != fingerprint:
        return _error(409, "IDEMPOTENCY_KEY_CONFLICT",
                      "This idempotency_key was used for a different request.", trace_id, request_id)
    if existing.decision == "PENDING":
        return _error(409, "DUPLICATE_IN_PROGRESS",
                      "A request with this idempotency_key is still being processed.", trace_id, request_id)
    first = json.loads(existing.response_json)
    if existing.decision == "ALLOW":
        too_old = _now() - _aware(existing.created_at) > timedelta(seconds=settings.PROTECTED_ACCESS_REPLAY_TTL_SECONDS)
        recheck = None if too_old else bhiv_runtime.vajra_verify_authority(req.vajra_subject, trace_id=trace_id,
                                                                             request_id=request_id)
        still_allowed = recheck is not None and recheck.status == "OK" and recheck.data.get("is_authorized") is True
        if not still_allowed:
            emit_audit_log(action="protected_access.stale_replay_refused", status="warning",
                           message="A repeated key asked for an ALLOW that is expired or no longer authorized.",
                           trace_id=trace_id, request_id=request_id,
                           details={"first_decision_id": first.get("decision_id"), "expired": too_old,
                                    "vajra_status": recheck.status if recheck else None})
            return _error(409, "STALE_DECISION",
                          "The earlier ALLOW expired or VAJRA no longer reports this authority; send a new request "
                          "with a new idempotency_key.", trace_id, request_id)
    first["duplicate"] = True
    emit_audit_log(action="protected_access.duplicate", status="warning",
                   message="Duplicate request answered from the first decision; nothing re-executed.",
                   trace_id=trace_id, request_id=request_id,
                   details={"first_decision_id": first.get("decision_id"), "first_trace_id": existing.trace_id})
    response = JSONResponse(status_code=200, content=first)
    response.headers["X-Trace-Id"] = trace_id
    response.headers["X-Request-Id"] = request_id
    return response


def _audit(db: Session, current_user, *, action: str, resource_type: str, resource_id: str, verdict: Dict[str, str],
           trace_id: str, request_id: str, metadata: Dict[str, Any]):
    """Persist one canonical audit event (raises RuntimeError if it cannot be stored)."""
    return emit_canonical_event(
        event_type="protected_access.decision",
        action=action,
        actor_id=f"cc_usr_{current_user.id}",
        role=current_user.role,
        resource_type=resource_type,
        resource_id=resource_id,
        outcome_status="SUCCESS" if verdict["decision"] == "ALLOW" else "DENIED",
        status_code=200,
        reason_code=verdict["reason_code"],
        message=verdict["reason"],
        trace_id=trace_id,
        request_id=request_id,
        policy_id=POLICY_ID,
        rule_name="vajra_authority_verify",
        metadata=metadata,
        db_session=db,
        fail_on_persist_error=True,
    )


@router.post("/access", response_model=ProtectedAccessResponse)
def protected_access(req: ProtectedAccessRequest, request: Request, db: Session = Depends(get_db)):
    trace_id = getattr(request.state, "trace_id", None) or str(uuid.uuid4())
    request_id = getattr(request.state, "request_id", None) or f"req-{uuid.uuid4().hex[:12]}"

    current_user = getattr(request.state, "current_user", None)
    if not current_user:  # defence in depth; RBAC middleware already blocks anonymous callers
        return _error(401, "AUTHENTICATION_REQUIRED", "Authentication required.", trace_id, request_id)
    # The middleware replaces a malformed X-Trace-Id with a fresh one; this route refuses it instead.
    raw_trace = request.headers.get("X-Trace-Id")
    if (raw_trace is not None and not TRACE_ID_RE.match(raw_trace)) or not TRACE_ID_RE.match(trace_id):
        return _error(400, "INVALID_TRACE_ID", "X-Trace-Id must be 1-128 characters of A-Z a-z 0-9 . _ : -",
                      str(uuid.uuid4()), request_id)
    if not _within_rate_limit(f"cc_usr_{current_user.id}"):
        response = _error(429, "RATE_LIMITED",
                          f"More than {settings.PROTECTED_ACCESS_RATE_LIMIT_PER_MINUTE} protected-access requests in a "
                          "minute; try again later.", trace_id, request_id)
        response.headers["Retry-After"] = "60"
        emit_audit_log(action="protected_access.rate_limited", status="warning",
                       message="Caller exceeded the protected-access rate limit; nothing was sent to VAJRA or TANTRA.",
                       trace_id=trace_id, request_id=request_id, details={"actor_id": f"cc_usr_{current_user.id}"})
        return response
    if req.contract_version != CONTRACT_VERSION:
        return _error(400, "UNSUPPORTED_CONTRACT_VERSION",
                      f"contract_version must be '{CONTRACT_VERSION}'.", trace_id, request_id)
    action = req.action.lower().strip()
    if action not in ALLOWED_ACTIONS:
        return _error(400, "UNSUPPORTED_ACTION", f"action must be one of {sorted(ALLOWED_ACTIONS)}.", trace_id, request_id)
    resource_type = req.resource.type.lower().strip()
    if resource_type not in ALLOWED_RESOURCE_TYPES:
        return _error(400, "UNSUPPORTED_RESOURCE_TYPE",
                      f"resource.type must be one of {sorted(ALLOWED_RESOURCE_TYPES)}.", trace_id, request_id)

    actor_id = f"cc_usr_{current_user.id}"
    fingerprint = _fingerprint(req, action, resource_type)
    claim: Optional[ProtectedAccessDecision] = None

    # Idempotency: claim (actor, key) before doing anything, so a repeat cannot re-execute.
    if req.idempotency_key:
        scoped_key = f"{actor_id}:{req.idempotency_key}"
        for _ in range(2):
            claim = ProtectedAccessDecision(idempotency_key=scoped_key, actor_id=actor_id, trace_id=trace_id,
                                            request_fingerprint=fingerprint, decision="PENDING", response_json="{}")
            db.add(claim)
            try:
                db.commit()
                break
            except IntegrityError:
                db.rollback()
                claim = None
                existing = db.query(ProtectedAccessDecision).filter(
                    ProtectedAccessDecision.idempotency_key == scoped_key).first()
                if existing is None:
                    continue
                if existing.decision == "PENDING" and _now() - _aware(existing.created_at) > PENDING_STALE_AFTER:
                    db.delete(existing)  # abandoned claim (crashed request): take it over once
                    db.commit()
                    continue
                return _replay_or_refuse(existing, req, fingerprint, trace_id, request_id)
        if claim is None:
            return _error(409, "DUPLICATE_IN_PROGRESS", "Could not claim the idempotency_key.", trace_id, request_id)

    def release_claim() -> None:
        if claim is not None:
            try:
                db.rollback()
                db.delete(claim)
                db.commit()
            except Exception:
                db.rollback()

    try:
        decision_id = uuid.uuid4().hex
        evaluated_at = _iso(_now())
        subject_ref = bhiv_runtime.subject_reference(req.vajra_subject)
        vajra_trace = f"{trace_id}::{decision_id}"

        # 1. Consent / authority: read VAJRA state (fail closed).
        authority = bhiv_runtime.vajra_verify_authority(req.vajra_subject, trace_id=trace_id, request_id=request_id)
        bhiv_runtime.log_sink_outcome("vajra_verify", authority, trace_id=trace_id, request_id=request_id)
        verdict = _decide(authority)
        base_meta = {
            "decision_id": decision_id,
            "vajra_subject_ref": subject_ref,
            "vajra_status": authority.status,
            "vajra_state": authority.data.get("current_state") if authority.data else None,
            "vajra_trace_id": vajra_trace,
            "scope_checked": False,
            "purpose": req.purpose,
            "idempotency_key": req.idempotency_key,
        }

        # 2. Local canonical audit event first: if it cannot be stored, nothing else is called.
        try:
            event = _audit(db, current_user, action=action, resource_type=resource_type, resource_id=req.resource.id,
                           verdict=verdict, trace_id=trace_id, request_id=request_id,
                           metadata={**base_meta, "decision": verdict["decision"]})
        except RuntimeError:
            emit_audit_log(action="protected_access.withheld", status="error",
                           message="Audit record could not be stored; no decision was released and VAJRA/TANTRA were not called.",
                           trace_id=trace_id, request_id=request_id,
                           details={"decision_id": decision_id, "would_have_been": verdict["decision"]})
            release_claim()
            return _error(503, "EVIDENCE_PERSISTENCE_FAILED",
                          "The audit record could not be stored, so no decision was released.", trace_id, request_id)

        # 3. VAJRA evidence committing to the stored audit event (one VAJRA row per decision).
        vajra_evidence = bhiv_runtime.vajra_record_evidence(
            trace_id=vajra_trace,
            action_taken=verdict["decision"],
            threat_type="ACCESS_DECISION",
            severity="UNASSESSED",
            actor=req.vajra_subject,
            details=verdict["reason_code"],
            evidence_sha256_hex=bhiv_runtime.canonical_event_sha256(event.model_dump_json()),
            metadata={"decision_id": decision_id, "canonical_event_id": event.event_id, "resource_type": resource_type},
            request_id=request_id,
        )
        bhiv_runtime.log_sink_outcome("vajra_evidence", vajra_evidence, trace_id=trace_id, request_id=request_id)

        # 4. No access without evidence: a tentative ALLOW without a VAJRA record becomes DENY (recorded locally).
        superseded_id = None
        if verdict["decision"] == "ALLOW" and vajra_evidence.status != "RECORDED":
            superseded_id = event.event_id
            verdict = {"decision": "DENY", "reason_code": "VAJRA_EVIDENCE_NOT_RECORDED",
                       "reason": f"Access denied: VAJRA did not confirm the evidence record ({vajra_evidence.status}); "
                                 "no access without evidence."}
            try:
                event = _audit(db, current_user, action=action, resource_type=resource_type, resource_id=req.resource.id,
                               verdict=verdict, trace_id=trace_id, request_id=request_id,
                               metadata={**base_meta, "decision": "DENY", "supersedes_event_id": superseded_id,
                                         "vajra_evidence_status": vajra_evidence.status})
            except RuntimeError:
                emit_audit_log(action="protected_access.withheld", status="error",
                               message="The superseding DENY could not be stored; no decision was released.",
                               trace_id=trace_id, request_id=request_id,
                               details={"decision_id": decision_id, "superseded_event_id": superseded_id})
                release_claim()
                return _error(503, "EVIDENCE_PERSISTENCE_FAILED",
                              "The audit record could not be stored, so no decision was released.", trace_id, request_id)

        # 5. TANTRA ledger: a minimal projection of the final canonical event (same schema, fewer metadata fields).
        envelope = bhiv_runtime.build_tantra_envelope(
            event_type=settings.TANTRA_EVENT_TYPE,
            submission_id=event.event_id,
            payload=_tantra_projection(event.model_dump_json()),
            timestamp=event.timestamp,
        )
        tantra_evidence = bhiv_runtime.tantra_submit(envelope, trace_id=trace_id, request_id=request_id)
        bhiv_runtime.log_sink_outcome("tantra_submit", tantra_evidence, trace_id=trace_id, request_id=request_id)

        sinks = {"vajra": vajra_evidence, "tantra": tantra_evidence}
        gaps = bhiv_runtime.evidence_gaps(sinks)
        body = ProtectedAccessResponse(
            decision=verdict["decision"],
            reason_code=verdict["reason_code"],
            reason=verdict["reason"],
            decision_id=decision_id,
            trace_id=trace_id,
            request_id=request_id,
            idempotency_key=req.idempotency_key,
            duplicate=False,
            actor_id=actor_id,
            action=action,
            resource=ProtectedResource(type=resource_type, id=req.resource.id),
            vajra=VajraAuthorityView(
                subject_ref=subject_ref,
                status=authority.status,
                is_authorized=authority.data.get("is_authorized") if authority.data else None,
                current_state=authority.data.get("current_state") if authority.data else None,
                scope_checked=False,
            ),
            evidence=EvidenceView(
                local_audit_event_id=event.event_id,
                superseded_audit_event_id=superseded_id,
                vajra=vajra_evidence.as_dict(),
                tantra=tantra_evidence.as_dict(),
                complete=not gaps,
                gaps=gaps,
            ),
            evaluated_at=evaluated_at,
        ).model_dump()

        if claim is not None:
            claim.decision = body["decision"]
            claim.response_json = json.dumps(body, ensure_ascii=True)
            db.commit()

        emit_audit_log(action="protected_access.completed", status="success",
                       message=f"Decision {body['decision']}; evidence complete={body['evidence']['complete']}.",
                       trace_id=trace_id, request_id=request_id,
                       details={"decision": body["decision"], "reason_code": body["reason_code"],
                                "decision_id": decision_id, "evidence_gaps": gaps,
                                "canonical_event_id": event.event_id})
        return body
    except Exception:
        # Release the idempotency claim so a failed attempt can be retried, then re-raise (HTTP 500).
        if claim is not None and claim.decision == "PENDING":
            release_claim()
        raise
