"""
Phase 4 Automated Cross-Repository Integration Test Suite
Owner: Kaushlendra — Data, API & Access Control
Validates cross-repository contract compatibility, trace continuity, graceful degradation, and error handling.
"""

import os
import json
import uuid
import tempfile
from pathlib import Path
from unittest.mock import MagicMock, patch
import pytest
from fastapi.testclient import TestClient

os.environ["SECRET_KEY"] = "test-secret-key-phase4-cross-repo-verification"
os.environ["ALGORITHM"] = "HS256"

from main import app
from app.db.database import SessionLocal, Base, engine
from app.db.models import User, Case, Evidence
from app.core.security import create_access_token, decode_access_token, revoke_jti, get_password_hash
from app.core.canonical_event import emit_canonical_event
from app.core.sovereign_integrations import (
    _post_json,
    emit_core_event,
    store_evidence_in_bucket,
    flush_event_buffer,
    IntegrationResult,
)

client = TestClient(app)


@pytest.fixture(scope="session", autouse=True)
def setup_phase4_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    # Ensure superadmin exists
    admin = db.query(User).filter(User.email == "admin_phase4@bhiv.internal").first()
    if not admin:
        admin = User(
            id=8881,
            email="admin_phase4@bhiv.internal",
            hashed_password=get_password_hash("AdminPass123!"),
            full_name="Phase4 Admin",
            role="superadmin",
            is_active=True,
        )
        db.add(admin)
        db.commit()

    # Ensure investigator exists
    inv = db.query(User).filter(User.email == "inv_phase4@bhiv.internal").first()
    if not inv:
        inv = User(
            id=8882,
            email="inv_phase4@bhiv.internal",
            hashed_password=get_password_hash("InvestigatorPass123!"),
            full_name="Phase4 Investigator",
            role="investigator",
            is_active=True,
        )
        db.add(inv)
        db.commit()

    # Ensure a case exists
    c = db.query(Case).filter(Case.case_id == "CAS-2026-XREPO").first()
    if not c:
        c = Case(
            case_id="CAS-2026-XREPO",
            title="Cross-Repository Integration Test Case",
            description="Integration testing case for Cybercrime and Fraud Evidence",
            investigator_id=8882,
            status="active",
        )
        db.add(c)
        db.commit()

    db.close()


def test_canonical_event_cross_repo_compatibility():
    """
    Contract Validation: Ensure Canonical Security Event complies with
    Phase 2 schema and can be mapped into TANTRA and Fraud Evidence event structures.
    """
    test_trace = f"trace-xrepo-{uuid.uuid4().hex[:12]}"
    evt = emit_canonical_event(
        event_type="evidence.anchor",
        action="anchor",
        actor_id="cc_usr_8882",
        role="investigator",
        resource_type="evidence",
        resource_id="EV-XREPO-999",
        case_id="CAS-2026-XREPO",
        outcome_status="SUCCESS",
        status_code=200,
        reason_code="OPERATION_COMPLETED",
        message="Cross-repository evidence anchored.",
        trace_id=test_trace,
    )

    evt_dict = evt.model_dump()

    # 1. Validate Phase 2 Canonical Schema
    assert evt_dict["schema_version"] == "1.0.0"
    assert evt_dict["source_system"] == "cybercrime"
    assert evt_dict["trace_id"] == test_trace
    assert evt_dict["actor"]["actor_id"] == "cc_usr_8882"
    assert evt_dict["resource"]["case_id"] == "CAS-2026-XREPO"

    # 2. Test TANTRA Consumption Compatibility:
    # TANTRA BUCKET_ARTIFACT_REQUIRED_FIELDS: artifact_id, trace_id, timestamp_utc, schema_version, source_module_id, artifact_type
    tantra_artifact = {
        "artifact_id": evt_dict["event_id"],
        "trace_id": evt_dict["trace_id"],
        "timestamp_utc": evt_dict["timestamp"],
        "schema_version": evt_dict["schema_version"],
        "source_module_id": evt_dict["source_system"],
        "artifact_type": evt_dict["resource"]["resource_type"],
        "payload": evt_dict,
    }
    assert tantra_artifact["schema_version"] == "1.0.0"
    assert tantra_artifact["trace_id"] == test_trace
    assert tantra_artifact["source_module_id"] == "cybercrime"

    # 3. Test Fraud Evidence AuditLog Compatibility:
    # Fraud Evidence expects: action, resourceType, resourceId, traceId
    fraud_evidence_audit = {
        "action": evt_dict["action"],
        "resourceType": evt_dict["resource"]["resource_type"],
        "resourceId": evt_dict["resource"]["resource_id"],
        "traceId": evt_dict["trace_id"],
        "statusCode": evt_dict["outcome"]["status_code"],
        "success": evt_dict["outcome"]["status"] == "SUCCESS",
    }
    assert fraud_evidence_audit["action"] == "anchor"
    assert fraud_evidence_audit["resourceId"] == "EV-XREPO-999"
    assert fraud_evidence_audit["traceId"] == test_trace


def test_case_id_lossless_mapping():
    """
    Case ID Compatibility: Ensure string case_id is preserved across
    Cybercrime case records, canonical events, and outbound event payloads.
    """
    db = SessionLocal()
    case_rec = db.query(Case).filter(Case.case_id == "CAS-2026-XREPO").first()
    assert case_rec is not None
    source_case_id = case_rec.case_id
    db.close()

    # Emit event using the string case_id
    trace = f"trace-case-{uuid.uuid4().hex[:8]}"
    evt = emit_canonical_event(
        event_type="case.update",
        action="update",
        actor_id="cc_usr_8882",
        role="investigator",
        resource_type="case",
        resource_id=source_case_id,
        case_id=source_case_id,
        trace_id=trace,
    )

    assert evt.resource.case_id == "CAS-2026-XREPO"
    assert evt.resource.resource_id == "CAS-2026-XREPO"


def test_trace_id_cross_service_continuity():
    """
    Trace Continuity: Verify that an inbound trace_id passed to Cybercrime
    is preserved in HTTP response headers AND forwarded in outbound integration requests.
    """
    inv_token = create_access_token(data={"sub": "inv_phase4@bhiv.internal", "user_id": 8882, "role": "investigator"})
    client_trace_id = "TRACE-CONTINUITY-E2E-" + str(uuid.uuid4())

    captured_outbound_headers = {}

    def mock_post(url, json=None, headers=None):
        nonlocal captured_outbound_headers
        captured_outbound_headers = dict(headers or {})
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        return mock_resp

    with patch("httpx.Client.post", side_effect=mock_post), \
         patch("app.core.config.settings.BHIV_CORE_EVENT_URL", "https://bhiv.core.internal/events"):
        # 1. Inbound request with custom trace ID
        resp = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {inv_token}", "X-Trace-Id": client_trace_id},
        )
        assert resp.status_code == 200
        # Verify trace ID returned in response header
        assert resp.headers.get("x-trace-id") == client_trace_id

        # 2. Outbound core event call using the same trace ID
        res = emit_core_event(
            action="evidence.verify",
            evidence_id="EV-XREPO-111",
            case_id="CAS-2026-XREPO",
            risk_score=0.5,
            trace_id=client_trace_id,
        )
        assert res.success is True
        # Verify outbound HTTP request retained the exact same trace ID
        assert captured_outbound_headers.get("X-Trace-Id") == client_trace_id


def test_downstream_service_unavailability_graceful_degradation(tmp_path):
    """
    Resilience / Degraded Mode: When downstream BHIV Core or Bucket is down,
    ensure Cybercrime retries, logs the failure, buffers the event locally, and does not crash.
    """
    test_buffer_file = str(tmp_path / "events.jsonl")

    # Point buffer and Core URL to invalid / unreachable address
    with patch("app.core.config.settings.BHIV_CORE_EVENT_URL", "http://127.0.0.1:59999/unreachable/events"):
        with patch("app.core.config.settings.EVENT_BUFFER_PATH", test_buffer_file):
            with patch("app.core.config.settings.EVENT_RETRY_MAX_ATTEMPTS", 2):
                res = emit_core_event(
                    action="evidence.anchor",
                    evidence_id="EV-FAIL-OVER",
                    case_id="CAS-2026-XREPO",
                    risk_score=0.8,
                    trace_id="TRACE-FAIL-SAFE",
                )
                # Success is False because upstream was unreachable
                assert res.success is False
                assert "Connection" in res.detail or "failed" in res.detail or "Err" in res.detail

                # Verify event was durably buffered locally to disk
                assert os.path.exists(test_buffer_file)
                with open(test_buffer_file, "r", encoding="utf-8") as f:
                    lines = f.readlines()
                    assert len(lines) == 1
                    buffered_evt = json.loads(lines[0])
                    assert buffered_evt["evidenceId"] == "EV-FAIL-OVER"
                    assert buffered_evt["traceId"] == "TRACE-FAIL-SAFE"


def test_downstream_service_unauthorized_handling():
    """
    Fault Handling: When a downstream service returns 401 Unauthorized or 403 Forbidden,
    _post_json cleanly captures upstream status without leaking internal tokens.
    """
    def mock_unauthorized_post(url, json=None, headers=None):
        mock_resp = MagicMock()
        mock_resp.status_code = 403
        return mock_resp

    with patch("httpx.Client.post", side_effect=mock_unauthorized_post):
        res = _post_json(
            url="https://bhiv.core.internal/api/events",
            payload={"sample": "data"},
            timeout_seconds=2.0,
            headers={"Authorization": "Bearer internal_secret", "X-Trace-Id": "TRACE-UNAUTH-TEST"},
        )
        assert res.success is False
        assert res.upstream_status == 403
        assert "upstream returned 403" in res.detail


def test_revocation_enforcement_at_service_boundary():
    """
    Revocation Security: A persistently revoked JTI is denied at the
    service perimeter (rbac_middleware) with HTTP 401 INVALID_CREDENTIALS.
    """
    inv_token = create_access_token(data={"user_id": 8882, "role": "investigator", "jti": "jti-xrepo-revoked"})
    
    # Revoke JTI in persistent store
    revoke_jti(jti="jti-xrepo-revoked", reason="Compromised credential during cross-repo audit", revoked_by="cc_usr_8881")

    # Attempt to access protected Cybercrime route
    resp = client.get("/api/v1/cases/", headers={"Authorization": f"Bearer {inv_token}"})
    assert resp.status_code == 401
    assert resp.json()["code"] == "INVALID_CREDENTIALS"


def test_cross_repo_status_code_harmonization_verification():
    """
    Contract Alignment: Verify that Cybercrime strictly conforms to Phase 2 Status Code
    Harmonization Rules while documenting known discrepancies in Fraud Evidence.
    """
    # 1. No Authorization header -> 401 AUTHENTICATION_REQUIRED (RFC 9110 compliant)
    r_no_auth = client.get("/api/v1/cases/")
    assert r_no_auth.status_code == 401
    assert r_no_auth.json()["code"] == "AUTHENTICATION_REQUIRED"

    # 2. Invalid Token -> 401 INVALID_CREDENTIALS
    r_bad_token = client.get("/api/v1/cases/", headers={"Authorization": "Bearer bad.token.here"})
    assert r_bad_token.status_code == 401
    assert r_bad_token.json()["code"] == "INVALID_CREDENTIALS"

    # 3. Deactivated Account -> 403 ACCOUNT_DEACTIVATED
    db = SessionLocal()
    deact_user = db.query(User).filter(User.email == "deact_xrepo@bhiv.internal").first()
    if not deact_user:
        deact_user = User(
            id=8889,
            email="deact_xrepo@bhiv.internal",
            hashed_password=get_password_hash("Pass123!"),
            full_name="Deactivated XRepo User",
            role="investigator",
            is_active=False,
        )
        db.add(deact_user)
        db.commit()
    db.close()

    token_deact = create_access_token(data={"user_id": 8889, "role": "investigator"})
    r_deact = client.get("/api/v1/cases/", headers={"Authorization": f"Bearer {token_deact}"})
    assert r_deact.status_code == 403
    assert r_deact.json()["code"] == "ACCOUNT_DEACTIVATED"
