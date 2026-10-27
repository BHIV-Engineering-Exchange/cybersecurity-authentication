"""
Canonical Security Event Schema and Emission Utilities (v1.0.0)
Owner: Kaushlendra — Data, API & Access Control
"""

from __future__ import annotations

import json
import logging
import re
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, field_validator

CANONICAL_LOGGER_NAME = "canonical_audit"

# Validation patterns
UUID4_REGEX = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$", re.IGNORECASE)
EVENT_TYPE_REGEX = re.compile(r"^[a-z0-9_]+(\.[a-z0-9_]+)+$")
ISO8601_REGEX = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?(Z|\+00:00)$")

ALLOWED_SOURCE_SYSTEMS = {"cybercrime", "fraud-evidence-system", "tantra", "vajra", "external_gateway"}
ALLOWED_ACTOR_TYPES = {"user", "service", "system", "anonymous"}
ALLOWED_ROLES = {"public", "user", "investigator", "admin", "superadmin", "service_agent"}
ALLOWED_RESOURCE_TYPES = {"evidence", "case", "wallet", "transaction", "user", "policy", "system_config", "artifact"}
ALLOWED_OUTCOME_STATUSES = {"SUCCESS", "DENIED", "ERROR", "WARNING"}
ALLOWED_ACTIONS = {
    "create", "read", "update", "delete", "login", "logout",
    "freeze", "unfreeze", "upload", "download", "verify", "anchor",
    "execute", "escalate", "revoke",
}

# Secret sanitization keywords
SENSITIVE_KEY_SUBSTRINGS = (
    "password", "passwd", "secret", "private_key", "secret_key",
    "api_key", "mnemonic", "seed_phrase", "token", "salt",
)


def sanitize_security_metadata(data: Any) -> Any:
    """
    Recursively scrub sensitive credential and token data from event metadata.
    Enforces Phase 2 privacy and zero-secret logging rules.
    """
    if data is None:
        return {}
    if isinstance(data, dict):
        sanitized = {}
        for key, val in data.items():
            k_lower = str(key).lower()
            if isinstance(val, (dict, list)):
                sanitized[key] = sanitize_security_metadata(val)
            elif any(sub in k_lower for sub in SENSITIVE_KEY_SUBSTRINGS):
                sanitized[key] = "[REDACTED]"
            else:
                sanitized[key] = sanitize_security_metadata(val)
        return sanitized
    elif isinstance(data, list):
        return [sanitize_security_metadata(item) for item in data]
    elif isinstance(data, str):
        if data.strip().startswith("Bearer "):
            return "Bearer [REDACTED]"
        if data.strip().startswith("Basic "):
            return "Basic [REDACTED]"
        # Detect raw JWT strings (header.payload.signature)
        if data.count(".") == 2 and data.startswith("eyJ"):
            return "[REDACTED_JWT]"
        return data
    return data


class ActorModel(BaseModel):
    actor_id: str
    actor_type: str = "user"
    role: str = "investigator"
    display_name: Optional[str] = None
    authenticated: bool = True
    auth_method: Optional[str] = "bearer_jwt"

    @field_validator("actor_type")
    @classmethod
    def validate_actor_type(cls, v: str) -> str:
        if v not in ALLOWED_ACTOR_TYPES:
            raise ValueError(f"Invalid actor_type: {v}. Must be one of {sorted(ALLOWED_ACTOR_TYPES)}")
        return v

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: str) -> str:
        if v not in ALLOWED_ROLES:
            raise ValueError(f"Invalid role: {v}. Must be one of {sorted(ALLOWED_ROLES)}")
        return v


class ResourceModel(BaseModel):
    resource_type: str
    resource_id: str
    case_id: Optional[str] = None
    target_address: Optional[str] = None
    integrity_hash: Optional[str] = None

    @field_validator("resource_type")
    @classmethod
    def validate_resource_type(cls, v: str) -> str:
        if v not in ALLOWED_RESOURCE_TYPES:
            raise ValueError(f"Invalid resource_type: {v}. Must be one of {sorted(ALLOWED_RESOURCE_TYPES)}")
        return v


class OutcomeModel(BaseModel):
    status: str
    status_code: Optional[int] = None
    reason_code: str
    message: str

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        if v not in ALLOWED_OUTCOME_STATUSES:
            raise ValueError(f"Invalid outcome status: {v}. Must be one of {sorted(ALLOWED_OUTCOME_STATUSES)}")
        return v


class PolicyReferenceModel(BaseModel):
    policy_id: Optional[str] = None
    rule_name: Optional[str] = None
    enforcement_mode: Optional[str] = "mandatory"
    boundary_checked: Optional[str] = None


class CanonicalSecurityEvent(BaseModel):
    schema_version: str = "1.0.0"
    event_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    event_type: str
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    source_system: str = "cybercrime"
    trace_id: str
    request_id: Optional[str] = None
    actor: ActorModel
    action: str
    resource: ResourceModel
    outcome: OutcomeModel
    policy_reference: Optional[PolicyReferenceModel] = None
    metadata: Optional[Dict[str, Any]] = None
    extensions: Optional[Dict[str, Any]] = None

    @field_validator("schema_version")
    @classmethod
    def validate_schema_version(cls, v: str) -> str:
        if v != "1.0.0":
            raise ValueError(f"Invalid schema_version: {v}. Must be '1.0.0'")
        return v

    @field_validator("event_id")
    @classmethod
    def validate_event_id(cls, v: str) -> str:
        if not UUID4_REGEX.match(v):
            raise ValueError(f"event_id must be a valid UUIDv4 string, got: {v}")
        return v

    @field_validator("event_type")
    @classmethod
    def validate_event_type(cls, v: str) -> str:
        if not EVENT_TYPE_REGEX.match(v):
            raise ValueError(f"event_type must be dot-notated lowercase string (e.g. 'auth.login'), got: {v}")
        return v

    @field_validator("source_system")
    @classmethod
    def validate_source_system(cls, v: str) -> str:
        if v not in ALLOWED_SOURCE_SYSTEMS:
            raise ValueError(f"Invalid source_system: {v}. Must be one of {sorted(ALLOWED_SOURCE_SYSTEMS)}")
        return v

    @field_validator("trace_id")
    @classmethod
    def validate_trace_id(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("trace_id cannot be empty")
        return v.strip()

    @field_validator("action")
    @classmethod
    def validate_action(cls, v: str) -> str:
        if v not in ALLOWED_ACTIONS:
            raise ValueError(f"Invalid action: {v}. Must be one of {sorted(ALLOWED_ACTIONS)}")
        return v


def emit_canonical_event(
    *,
    event_type: str,
    action: str,
    actor_id: str,
    actor_type: str = "user",
    role: str = "investigator",
    display_name: Optional[str] = None,
    authenticated: bool = True,
    auth_method: Optional[str] = "bearer_jwt",
    resource_type: str = "evidence",
    resource_id: str,
    case_id: Optional[str] = None,
    target_address: Optional[str] = None,
    integrity_hash: Optional[str] = None,
    outcome_status: str = "SUCCESS",
    status_code: Optional[int] = None,
    reason_code: str = "OPERATION_COMPLETED",
    message: str = "Operation completed successfully.",
    trace_id: str,
    request_id: Optional[str] = None,
    policy_id: Optional[str] = None,
    rule_name: Optional[str] = None,
    enforcement_mode: Optional[str] = "mandatory",
    metadata: Optional[Dict[str, Any]] = None,
    extensions: Optional[Dict[str, Any]] = None,
    db_session: Optional[Any] = None,
    fail_on_persist_error: bool = False,
) -> CanonicalSecurityEvent:
    """
    Constructs, validates, sanitizes, and emits a Canonical Security Event (v1.0.0).
    Supports documented fail_on_persist_error failure policy for high-assurance operations.
    """
    clean_metadata = sanitize_security_metadata(metadata)

    actor = ActorModel(
        actor_id=actor_id,
        actor_type=actor_type,
        role=role,
        display_name=display_name,
        authenticated=authenticated,
        auth_method=auth_method,
    )

    resource = ResourceModel(
        resource_type=resource_type,
        resource_id=str(resource_id),
        case_id=str(case_id) if case_id is not None else None,
        target_address=target_address,
        integrity_hash=integrity_hash,
    )

    outcome = OutcomeModel(
        status=outcome_status,
        status_code=status_code,
        reason_code=reason_code,
        message=message,
    )

    policy_ref = None
    if policy_id or rule_name:
        policy_ref = PolicyReferenceModel(
            policy_id=policy_id,
            rule_name=rule_name,
            enforcement_mode=enforcement_mode,
        )

    # Format timestamp explicitly to UTC ISO 8601 with trailing Z if needed
    now_utc = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"

    event = CanonicalSecurityEvent(
        schema_version="1.0.0",
        event_id=str(uuid.uuid4()),
        event_type=event_type,
        timestamp=now_utc,
        source_system="cybercrime",
        trace_id=trace_id,
        request_id=request_id,
        actor=actor,
        action=action,
        resource=resource,
        outcome=outcome,
        policy_reference=policy_ref,
        metadata=clean_metadata,
        extensions=extensions,
    )

    # Log to structured audit log
    logger = logging.getLogger(CANONICAL_LOGGER_NAME)
    event_json = event.model_dump_json()
    logger.info(event_json)

    # Optionally persist into relational database if session provided
    if db_session is not None:
        try:
            from app.db.models import AuditLog
            db_log = AuditLog(
                action=f"{event.event_type}:{event.action}",
                message=event.outcome.message[:255] if event.outcome.message else None,
                entity_type=event.resource.resource_type,
                entity_id=event.resource.resource_id,
                status=event.outcome.status.lower(),
                details=event_json,
                user_id=int(actor_id.replace("cc_usr_", "")) if actor_id.startswith("cc_usr_") and actor_id.replace("cc_usr_", "").isdigit() else None,
                request_id=event.request_id,
                path=clean_metadata.get("path") if clean_metadata else None,
                method=clean_metadata.get("method") if clean_metadata else None,
            )
            db_session.add(db_log)
            db_session.commit()
        except Exception as e:
            try:
                db_session.rollback()
            except Exception:
                pass
            logger.error(f"Failed to record canonical event into database AuditLog: {e}")
            if fail_on_persist_error:
                raise RuntimeError(f"Audit log persistence failed: {e}") from e

    return event
