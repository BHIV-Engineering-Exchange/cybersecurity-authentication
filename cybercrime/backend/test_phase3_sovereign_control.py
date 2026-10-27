"""
Phase 3B Automated Regression Test Suite: Security Remediation & Validation
Owner: Kaushlendra — Data, API & Access Control
Covers remediations for SEC-01 through SEC-08.
"""

import os
import uuid
import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient

# Ensure test secret key is configured before importing app
os.environ["SECRET_KEY"] = "test-secret-key-phase3-verification-token"
os.environ["ALGORITHM"] = "HS256"

from main import app
from app.db.database import SessionLocal, Base, engine
from app.db.models import User, RevokedToken
from app.core.canonical_event import (
    emit_canonical_event,
    sanitize_security_metadata,
    CanonicalSecurityEvent,
    UUID4_REGEX,
    EVENT_TYPE_REGEX,
    ISO8601_REGEX,
)
from app.core.security import (
    create_access_token,
    decode_access_token,
    revoke_jti,
    is_jti_revoked,
    get_password_hash,
)
from app.core.sovereign_integrations import _post_json, emit_core_event
from app.core.rbac import load_rbac_policy

client = TestClient(app)


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    # Ensure superadmin user exists for tests
    admin = db.query(User).filter(User.email == "admin_phase3@bhiv.internal").first()
    if not admin:
        admin = User(
            id=9991,
            email="admin_phase3@bhiv.internal",
            hashed_password=get_password_hash("AdminPass123!"),
            full_name="Phase3 SuperAdmin",
            role="superadmin",
            is_active=True,
        )
        db.add(admin)
        db.commit()
    
    # Ensure active investigator exists
    inv = db.query(User).filter(User.email == "inv_phase3@bhiv.internal").first()
    if not inv:
        inv = User(
            id=9992,
            email="inv_phase3@bhiv.internal",
            hashed_password=get_password_hash("InvestigatorPass123!"),
            full_name="Phase3 Investigator",
            role="investigator",
            is_active=True,
        )
        db.add(inv)
        db.commit()
    db.close()


def test_canonical_event_schema_and_secret_scrubbing():
    """Verify Canonical Security Event construction, regex validation, and secret scrubbing."""
    test_trace = f"trace-unit-{uuid.uuid4().hex[:12]}"
    raw_metadata = {
        "client_ip": "10.0.1.5",
        "user_password": "super_secret_plain_password",
        "api_key": "vajra_relay_key_secret_999",
        "nested_tokens": {
            "auth_token": "bearer_jwt_private_secret",
            "safe_counter": 42,
        },
        "auth_header": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy.sig",
    }

    # Verify secret scrubbing
    clean = sanitize_security_metadata(raw_metadata)
    assert clean["user_password"] == "[REDACTED]"
    assert clean["api_key"] == "[REDACTED]"
    assert clean["nested_tokens"]["auth_token"] == "[REDACTED]"
    assert clean["nested_tokens"]["safe_counter"] == 42
    assert clean["auth_header"] == "Bearer [REDACTED]"

    # Emit canonical security event
    evt = emit_canonical_event(
        event_type="evidence.upload",
        action="upload",
        actor_id="cc_usr_9992",
        role="investigator",
        resource_type="evidence",
        resource_id="EV-TEST-100",
        case_id="CAS-100",
        outcome_status="SUCCESS",
        status_code=201,
        reason_code="RECORD_CREATED",
        message="Test forensic evidence file uploaded.",
        trace_id=test_trace,
        metadata=raw_metadata,
    )

    assert evt.schema_version == "1.0.0"
    assert UUID4_REGEX.match(evt.event_id)
    assert EVENT_TYPE_REGEX.match(evt.event_type)
    assert ISO8601_REGEX.match(evt.timestamp)
    assert evt.source_system == "cybercrime"
    assert evt.trace_id == test_trace
    assert evt.metadata["user_password"] == "[REDACTED]"


def test_canonical_event_invalid_schema_rejection():
    """Verify that invalid schema fields trigger validation errors."""
    with pytest.raises(Exception):
        # Invalid schema version (must be 1.0.0)
        CanonicalSecurityEvent(
            schema_version="2.0.0",
            event_id=str(uuid.uuid4()),
            event_type="auth.login",
            trace_id="test-trace",
            actor={"actor_id": "1", "role": "investigator"},
            action="login",
            resource={"resource_type": "user", "resource_id": "1"},
            outcome={"status": "SUCCESS", "reason_code": "OK", "message": "ok"},
        )


# =========================================================================
# SEC-01: Protect Authorization Endpoint Tests
# =========================================================================

def test_authz_check_unauthenticated_rejection_sec01():
    """SEC-01: Verify POST /api/v1/authz/check rejects unauthenticated callers with HTTP 401."""
    payload = {
        "contract_version": "1.0.0",
        "subject": {
            "actor_id": "cc_usr_9992",
            "role": "investigator",
            "is_active": True,
        },
        "action": "read",
        "resource": {
            "type": "evidence",
            "id": "EV-TEST-100",
        },
    }
    r = client.post("/api/v1/authz/check", json=payload)
    assert r.status_code == 401
    data = r.json()
    assert data["code"] == "AUTHENTICATION_REQUIRED"
    assert data["error"] is True


def test_authz_check_invalid_credentials_sec01():
    """SEC-01: Verify POST /api/v1/authz/check rejects invalid tokens with HTTP 401."""
    payload = {
        "contract_version": "1.0.0",
        "subject": {
            "actor_id": "cc_usr_9992",
            "role": "investigator",
            "is_active": True,
        },
        "action": "read",
        "resource": {
            "type": "evidence",
            "id": "EV-TEST-100",
        },
    }
    r = client.post(
        "/api/v1/authz/check",
        json=payload,
        headers={"Authorization": "Bearer totally_bogus_token_signature_invalid"},
    )
    assert r.status_code == 401
    data = r.json()
    assert data["code"] == "INVALID_CREDENTIALS"


def test_authz_check_identity_spoofing_forbidden_sec01():
    """SEC-01: Verify non-superadmin cannot query decisions for another user ID (Oracle prevention)."""
    inv_token = create_access_token(data={"user_id": 9992, "role": "investigator"})
    payload = {
        "contract_version": "1.0.0",
        "subject": {
            "actor_id": "cc_usr_8888",  # Different user!
            "role": "superadmin",      # Forged role!
            "is_active": True,
        },
        "action": "read",
        "resource": {
            "type": "evidence",
            "id": "EV-TEST-100",
        },
    }
    r = client.post(
        "/api/v1/authz/check",
        json=payload,
        headers={"Authorization": f"Bearer {inv_token}"},
    )
    assert r.status_code == 403
    assert "does not match authenticated principal" in r.json()["message"]


def test_authz_check_allow_case():
    """Verify POST /api/v1/authz/check returns ALLOW for authorized investigator actions."""
    inv_token = create_access_token(data={"user_id": 9992, "role": "investigator"})
    custom_trace = "TRACE-AUTHZ-ALLOW-001"
    payload = {
        "contract_version": "1.0.0",
        "subject": {
            "actor_id": "cc_usr_9992",
            "role": "investigator",
            "is_active": True,
        },
        "action": "read",
        "resource": {
            "type": "evidence",
            "id": "EV-TEST-100",
        },
        "context": {
            "ip_address": "127.0.0.1",
            "method": "GET",
            "path": "/api/v1/evidence/EV-TEST-100",
        },
    }

    r = client.post(
        "/api/v1/authz/check",
        json=payload,
        headers={"Authorization": f"Bearer {inv_token}", "X-Trace-Id": custom_trace},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["contract_version"] == "1.0.0"
    assert data["decision"] == "ALLOW"
    assert data["reason_code"] == "ALLOWED_BY_POLICY"
    assert data["trace_id"] == custom_trace


def test_authz_check_deny_investigator_delete():
    """Verify POST /api/v1/authz/check denies investigator delete on evidence."""
    inv_token = create_access_token(data={"user_id": 9992, "role": "investigator"})
    payload = {
        "contract_version": "1.0.0",
        "subject": {
            "actor_id": "cc_usr_9992",
            "role": "investigator",
            "is_active": True,
        },
        "action": "delete",
        "resource": {
            "type": "evidence",
            "id": "EV-TEST-100",
        },
    }

    r = client.post(
        "/api/v1/authz/check",
        json=payload,
        headers={"Authorization": f"Bearer {inv_token}"},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["decision"] == "DENY"
    assert data["reason_code"] == "ROLE_NOT_PERMITTED"


def test_authz_check_deny_inactive_user():
    """Verify POST /api/v1/authz/check denies inactive/deactivated users when queried by superadmin."""
    admin_token = create_access_token(data={"user_id": 9991, "role": "superadmin"})
    payload = {
        "contract_version": "1.0.0",
        "subject": {
            "actor_id": "cc_usr_9992",
            "role": "investigator",
            "is_active": False,
        },
        "action": "read",
        "resource": {
            "type": "evidence",
            "id": "EV-TEST-100",
        },
    }

    r = client.post(
        "/api/v1/authz/check",
        json=payload,
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["decision"] == "DENY"
    assert data["reason_code"] == "ACCOUNT_INACTIVE"


def test_authz_check_self_boundary_violation():
    """Verify POST /api/v1/authz/check enforces investigator self-boundary."""
    inv_token = create_access_token(data={"user_id": 9992, "role": "investigator"})
    payload = {
        "contract_version": "1.0.0",
        "subject": {
            "actor_id": "cc_usr_9992",
            "role": "investigator",
            "is_active": True,
        },
        "action": "read",
        "resource": {
            "type": "cases",
            "id": "CAS-99",
            "owner_id": "cc_usr_8888",  # Belongs to a different investigator
        },
    }

    r = client.post(
        "/api/v1/authz/check",
        json=payload,
        headers={"Authorization": f"Bearer {inv_token}"},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["decision"] == "DENY"
    assert data["reason_code"] == "SELF_BOUNDARY_MISMATCH"


def test_authz_check_superadmin_allow_all():
    """SEC-01: Superadmin has universal allow across resources."""
    admin_token = create_access_token(data={"user_id": 9991, "role": "superadmin"})
    payload = {
        "contract_version": "1.0.0",
        "subject": {
            "actor_id": "cc_usr_9991",
            "role": "superadmin",
            "is_active": True,
        },
        "action": "delete",
        "resource": {
            "type": "evidence",
            "id": "EV-TEST-100",
        },
    }
    r = client.post(
        "/api/v1/authz/check",
        json=payload,
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert r.status_code == 200
    assert r.json()["decision"] == "ALLOW"


# =========================================================================
# SEC-06 & SEC-03: Access Revocation & Persistence Tests
# =========================================================================

def test_access_revoke_unauthenticated_rejection_sec06():
    """SEC-06: Unauthenticated request to /api/v1/access/revoke must return 401."""
    r = client.post("/api/v1/access/revoke", json={"contract_version": "1.0.0"})
    assert r.status_code == 401
    assert r.json()["code"] == "AUTHENTICATION_REQUIRED"


def test_access_revoke_non_superadmin_forbidden_sec06():
    """SEC-06: Non-superadmin cannot call /api/v1/access/revoke (HTTP 403)."""
    inv_token = create_access_token(data={"user_id": 9992, "role": "investigator"})
    payload = {
        "contract_version": "1.0.0",
        "revocation_type": "user_deactivation",
        "target": {"actor_id": "cc_usr_9992"},
        "reason": "Test non-superadmin revocation attempt",
        "requested_by": "cc_usr_9992",
    }
    r = client.post(
        "/api/v1/access/revoke",
        json=payload,
        headers={"Authorization": f"Bearer {inv_token}"},
    )
    assert r.status_code == 403


def test_access_revoke_forged_requested_by_forbidden_sec06():
    """SEC-06: Superadmin submitting mismatched requested_by is rejected with 403."""
    admin_token = create_access_token(data={"user_id": 9991, "role": "superadmin"})
    payload = {
        "contract_version": "1.0.0",
        "revocation_type": "user_deactivation",
        "target": {"actor_id": "cc_usr_9992"},
        "reason": "Administrative action with forged attribution",
        "requested_by": "cc_usr_8888",  # Forged! Does not match 9991
    }
    r = client.post(
        "/api/v1/access/revoke",
        json=payload,
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert r.status_code == 403
    assert "does not match authenticated principal" in r.json()["message"]


def test_access_revoke_tier2_user_deactivation():
    """Verify Tier 2 user deactivation via POST /api/v1/access/revoke."""
    db = SessionLocal()
    temp_user = User(
        id=9995,
        email="temp_revoke_test@bhiv.internal",
        hashed_password=get_password_hash("TempPass123!"),
        full_name="Revoke Candidate",
        role="investigator",
        is_active=True,
    )
    db.merge(temp_user)
    db.commit()
    db.close()

    admin_token = create_access_token(data={"user_id": 9991, "role": "superadmin"})
    auth_headers = {"Authorization": f"Bearer {admin_token}"}

    custom_trace = "TRACE-REVOKE-USER-001"
    payload = {
        "contract_version": "1.0.0",
        "revocation_type": "user_deactivation",
        "target": {
            "actor_id": "cc_usr_9995",
        },
        "reason": "Administrative suspension pending forensic investigation.",
        "requested_by": "cc_usr_9991",
    }

    r = client.post(
        "/api/v1/access/revoke",
        json=payload,
        headers={"Authorization": f"Bearer {admin_token}", "X-Trace-Id": custom_trace},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "REVOKED"
    assert UUID4_REGEX.match(data["revocation_id"])
    assert UUID4_REGEX.match(data["audit_event_id"])
    assert data["trace_id"] == custom_trace

    # Verify user is now deactivated in database
    db = SessionLocal()
    updated_user = db.query(User).filter(User.id == 9995).first()
    assert updated_user.is_active is False
    db.close()

    # Calling revoke again should report ALREADY_INACTIVE
    r2 = client.post("/api/v1/access/revoke", json=payload, headers=auth_headers)
    assert r2.status_code == 200
    assert r2.json()["status"] == "ALREADY_INACTIVE"


# =========================================================================
# SEC-05: Deactivated Account Response Tests
# =========================================================================

def test_deactivated_account_response_403_sec05():
    """SEC-05: Deactivated user with valid token receives HTTP 403 ACCOUNT_DEACTIVATED."""
    db = SessionLocal()
    deact_user = User(
        id=9996,
        email="deactivated_user@bhiv.internal",
        hashed_password=get_password_hash("Pass123!"),
        full_name="Deactivated Investigator",
        role="investigator",
        is_active=False,  # Deactivated!
    )
    db.merge(deact_user)
    db.commit()
    db.close()

    token = create_access_token(data={"user_id": 9996, "role": "investigator"})
    custom_trace = f"trace-deact-{uuid.uuid4().hex[:8]}"

    # Request protected route with valid JWT for deactivated user
    r = client.get(
        "/api/v1/cases/",
        headers={"Authorization": f"Bearer {token}", "X-Trace-Id": custom_trace},
    )
    assert r.status_code == 403
    data = r.json()
    assert data["code"] == "ACCOUNT_DEACTIVATED"
    assert data["error"] is True
    assert data["status_code"] == 403
    assert data["trace_id"] == custom_trace
    assert r.headers.get("x-trace-id") == custom_trace
    assert "x-request-id" in r.headers


# =========================================================================
# SEC-03: Persistent JTI Revocation & Fail-Closed Tests
# =========================================================================

def test_access_revoke_tier3_token_invalidation_and_persistence_sec03():
    """SEC-03: Token revocation persists in RevokedToken SQLite table across queries."""
    admin_token = create_access_token(data={"user_id": 9991, "role": "superadmin"})
    auth_headers = {"Authorization": f"Bearer {admin_token}"}

    test_jti = f"jti-persist-{uuid.uuid4().hex}"
    token = create_access_token(data={"user_id": 9991, "role": "superadmin", "jti": test_jti})

    # Token must decode successfully initially
    payload_before = decode_access_token(token)
    assert payload_before is not None
    assert payload_before["jti"] == test_jti

    # Invoke revocation API for this JTI
    revoke_payload = {
        "contract_version": "1.0.0",
        "revocation_type": "token_invalidation",
        "target": {
            "jti": test_jti,
        },
        "reason": "Token compromised during credential audit.",
        "requested_by": "cc_usr_9991",
    }

    r = client.post("/api/v1/access/revoke", json=revoke_payload, headers=auth_headers)
    assert r.status_code == 200
    assert r.json()["status"] == "REVOKED"

    # Subsequent decode MUST fail due to persistent JTI blacklist
    payload_after = decode_access_token(token)
    assert payload_after is None
    assert is_jti_revoked(test_jti) is True

    # Verify persistence directly in SQLite table
    db = SessionLocal()
    rev_entry = db.query(RevokedToken).filter(RevokedToken.jti == test_jti).first()
    assert rev_entry is not None
    assert rev_entry.jti == test_jti
    assert rev_entry.reason == "Token compromised during credential audit."
    assert rev_entry.revoked_by == "cc_usr_9991"
    db.close()


def test_jti_revocation_fail_closed_on_db_error_sec03():
    """SEC-03: When revocation database fails, system fails closed (treats token as untrusted)."""
    mock_db = MagicMock()
    mock_db.query.side_effect = Exception("Simulated SQLite database read timeout")

    test_jti = f"jti-failclose-{uuid.uuid4().hex}"
    # is_jti_revoked must return True (fail closed)
    assert is_jti_revoked(test_jti, db=mock_db) is True


# =========================================================================
# SEC-04: Outbound Trace Propagation Tests
# =========================================================================

def test_outbound_trace_propagation_sec04():
    """SEC-04: Outbound HTTP requests propagate X-Trace-Id and strip credentials."""
    captured_headers = {}

    def mock_post(url, json=None, headers=None):
        nonlocal captured_headers
        captured_headers = dict(headers or {})
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        return mock_resp

    with patch("httpx.Client.post", side_effect=mock_post):
        custom_trace = "TRACE-OUTBOUND-TEST-4422"
        res = _post_json(
            url="https://bhiv.core.internal/api/events",
            payload={"test": "payload"},
            timeout_seconds=5.0,
            headers={"Authorization": "Bearer sensitive_secret_token", "Custom": "123"},
            trace_id=custom_trace,
            request_id="req-outbound-11",
        )
        assert res.success is True
        assert captured_headers.get("X-Trace-Id") == custom_trace
        assert captured_headers.get("X-Request-Id") == "req-outbound-11"
        assert "Authorization" not in captured_headers
        assert "authorization" not in captured_headers


def test_emit_core_event_trace_propagation_sec04():
    """SEC-04: emit_core_event passes traceId in event payload and headers."""
    with patch("app.core.config.settings.BHIV_CORE_EVENT_URL", "https://bhiv.core.internal/events"):
        captured_payload = {}
        captured_headers = {}

        def mock_post(url, json=None, headers=None):
            nonlocal captured_payload, captured_headers
            captured_payload = dict(json or {})
            captured_headers = dict(headers or {})
            mock_resp = MagicMock()
            mock_resp.status_code = 200
            return mock_resp

        with patch("httpx.Client.post", side_effect=mock_post):
            custom_trace = "TRACE-CORE-EVENT-9900"
            res = emit_core_event(
                action="evidence.anchor",
                evidence_id="EV-999",
                case_id="CAS-123",
                risk_score=0.75,
                trace_id=custom_trace,
            )
            assert res.success is True
            assert captured_payload.get("traceId") == custom_trace
            assert captured_headers.get("X-Trace-Id") == custom_trace


# =========================================================================
# SEC-07: Canonical Audit Persistence Failure Policy Tests
# =========================================================================

def test_canonical_audit_persistence_failure_policy_sec07():
    """SEC-07: Verifies fail-closed behavior on persist error when required."""
    mock_db = MagicMock()
    mock_db.commit.side_effect = Exception("Simulated DB disk failure")

    # When fail_on_persist_error=True, must raise RuntimeError (fail closed)
    with pytest.raises(RuntimeError, match="Audit log persistence failed"):
        emit_canonical_event(
            event_type="access.revoked",
            action="revoke",
            actor_id="cc_usr_9991",
            resource_type="user",
            resource_id="cc_usr_9992",
            trace_id="test-trace-fail",
            db_session=mock_db,
            fail_on_persist_error=True,
        )

    # When fail_on_persist_error=False, logs error and returns gracefully
    evt = emit_canonical_event(
        event_type="evidence.read",
        action="read",
        actor_id="cc_usr_9992",
        resource_type="evidence",
        resource_id="EV-100",
        trace_id="test-trace-safe",
        db_session=mock_db,
        fail_on_persist_error=False,
    )
    assert evt is not None


# =========================================================================
# SEC-08: RBAC Supported Roles Review Tests
# =========================================================================

def test_rbac_supported_roles_alignment_sec08():
    """SEC-08: Verify active roles ('superadmin', 'investigator', 'public') and obsolete 'admin' role."""
    import json
    from pathlib import Path
    policy_path = Path(__file__).resolve().parent.parent / "rbac-permissions.json"
    data = json.loads(policy_path.read_text(encoding="utf-8"))
    
    # Confirmed active supported roles in RBAC contract
    assert "roles" in data
    assert "superadmin" in data["roles"]
    assert "investigator" in data["roles"]
    assert "public" in data["roles"]
    # Legacy 'admin' from models.py comment is obsolete and intentionally excluded
    assert "admin" not in data["roles"]

    policy = load_rbac_policy(policy_path)
    # Obsolete 'admin' role has zero permissions
    assert policy.is_allowed(role="admin", method="GET", path="/api/v1/cases/") is False
    assert policy.is_allowed(role="admin", method="POST", path="/api/v1/access/revoke") is False


# =========================================================================
# Inbound Trace & Canonical Error Test
# =========================================================================

def test_trace_id_propagation_and_canonical_error():
    """Verify X-Trace-Id propagation and canonical error response on unauthenticated endpoint."""
    known_trace = "KNOWN-TRACE-PHASE3-" + str(uuid.uuid4())
    headers = {"X-Trace-Id": known_trace}

    # Request protected route without authentication
    r = client.get("/api/v1/cases/", headers=headers)
    assert r.status_code == 401
    assert r.headers.get("x-trace-id") == known_trace

    err = r.json()
    assert err["error"] is True
    assert err["code"] == "AUTHENTICATION_REQUIRED"
    assert err["status_code"] == 401
    assert err["trace_id"] == known_trace
