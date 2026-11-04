"""
Unit tests for the fixes made on 2026-11-04 in other lanes (by Hemanth, for the lane owners' review):
CYB-01 register, CYB-02 Tier 1 revocation, CYB-03/CYB-06 incident analysis, CYB-04/CYB-05 login,
CYB-07 trailing slash, CYB-08/CYB-09 Bucket, CYB-12 health, CYB-14 rate limit, the trace-id echo,
and the failed-login detection and correlation (proof C).

Every user and value here is synthetic; no peer is called (TANTRA and VAJRA are not configured).
"""

import json
import uuid

import pytest
from fastapi.testclient import TestClient

from main import app
from app.core import sovereign_integrations
from app.core.config import settings
from app.core.security import create_access_token, get_password_hash
from app.core.threat_detection import RULE_ID, THRESHOLD
from app.db.database import SessionLocal
from app.db.models import AuditLog, RevokedPermission, SecurityIncident, User

client = TestClient(app)


def _user(role: str, password: str = "Not-Used-1!", active: bool = True) -> User:
    db = SessionLocal()
    user = User(email=f"lane-{role}-{uuid.uuid4().hex[:8]}@bhiv-verification.example",
                hashed_password=get_password_hash(password), full_name=f"{role} (synthetic)", role=role,
                is_active=active)
    db.add(user)
    db.commit()
    db.refresh(user)
    db.expunge(user)
    db.close()
    return user


def _auth(user: User) -> dict:
    token = create_access_token({"sub": user.email, "user_id": user.id, "role": user.role})
    return {"Authorization": f"Bearer {token}"}


def _login(email: str, password: str):
    return client.post("/api/v1/auth/login", data={"username": email, "password": password})


@pytest.fixture(scope="module")
def superadmin():
    return _user("superadmin")


@pytest.fixture(scope="module")
def investigator():
    return _user("investigator")


# ------------------------------------------------------------------ CYB-01 register

def test_register_is_not_public(investigator, superadmin):
    body = {"email": f"stranger-{uuid.uuid4().hex[:6]}@bhiv-verification.example", "password": "Synthetic-pass-1",
            "full_name": "Stranger (synthetic)"}
    assert client.post("/api/v1/auth/register", json=body).status_code == 401
    assert client.post("/api/v1/auth/register", json=body, headers=_auth(investigator)).status_code == 403
    created = client.post("/api/v1/auth/register", json=body, headers=_auth(superadmin))
    assert created.status_code == 200 and created.json()["email"] == body["email"]


def test_public_access_request_route_still_open():
    r = client.post("/api/v1/access-requests/request", json={
        "email": f"applicant-{uuid.uuid4().hex[:6]}@bhiv-verification.example", "full_name": "Applicant (synthetic)",
        "password": "Synthetic-pass-1", "reason": "unit test of the approval flow (synthetic)"})
    assert r.status_code not in (401, 403)  # the reviewed sign-up path stays public


# ------------------------------------------------------------------ CYB-04 / CYB-05 login

def test_login_errors_are_identical_and_recorded():
    victim = _user("investigator", password="Right-pass-1")
    unknown = _login(f"nobody-{uuid.uuid4().hex[:6]}@bhiv-verification.example", "x")
    wrong = _login(victim.email, "x")
    assert unknown.status_code == wrong.status_code == 401
    assert unknown.json()["message"] == wrong.json()["message"] == "Invalid email or password."
    db = SessionLocal()
    rows = db.query(AuditLog).filter(AuditLog.action == "auth.login:login", AuditLog.status == "denied",
                                     AuditLog.entity_id == f"cc_usr_{victim.id}").all()
    db.close()
    assert len(rows) == 1
    event = json.loads(rows[0].details)
    assert event["actor"]["actor_id"] == "anonymous" and event["outcome"]["reason_code"] == "INVALID_CREDENTIALS"
    assert set(event["metadata"]) == {"client_ip", "account_known"}  # no password or email material in the event


def test_deactivated_account_message_only_after_correct_password():
    user = _user("investigator", password="Right-pass-1", active=False)
    assert _login(user.email, "wrong").json()["message"] == "Invalid email or password."
    assert "deactivated" in _login(user.email, "Right-pass-1").json()["message"]


# ------------------------------------------------------------------ proof C: detection and correlation

def test_repeated_failed_logins_open_one_incident_for_review():
    victim = _user("investigator", password="Right-pass-1")
    for _ in range(THRESHOLD + 2):
        assert _login(victim.email, "wrong-guess").status_code == 401
    db = SessionLocal()
    incidents = db.query(SecurityIncident).filter(SecurityIncident.target_ref == f"cc_usr_{victim.id}").all()
    detected = [r for r in db.query(AuditLog).filter(AuditLog.action == "threat.detected:escalate").all()
                if json.loads(r.details)["resource"]["resource_id"] == f"cc_usr_{victim.id}"]
    still_active = db.query(User).filter(User.id == victim.id).first().is_active
    db.close()
    assert len(incidents) == 1  # correlated: one incident, not one per attempt
    incident = incidents[0].to_dict()
    assert incident["rule_id"] == RULE_ID and incident["rule_version"]
    assert incident["event_count"] == THRESHOLD + 2 and len(incident["evidence_event_ids"]) == THRESHOLD + 2
    assert 0 < incident["confidence"] <= 0.9 and incident["uncertainty"]
    assert incident["status"] == "open" and incident["requires_human_review"] is True
    assert len(detected) == 1  # one threat.detected event when the incident opened
    assert still_active  # detection never deactivates or blocks anyone


def test_below_threshold_opens_nothing():
    victim = _user("investigator", password="Right-pass-1")
    for _ in range(THRESHOLD - 1):
        _login(victim.email, "wrong-guess")
    db = SessionLocal()
    count = db.query(SecurityIncident).filter(SecurityIncident.target_ref == f"cc_usr_{victim.id}").count()
    db.close()
    assert count == 0


def test_incident_api_is_superadmin_only(superadmin, investigator):
    assert client.get("/api/v1/threats/incidents").status_code == 401
    assert client.get("/api/v1/threats/incidents", headers=_auth(investigator)).status_code == 403
    r = client.get("/api/v1/threats/incidents", headers=_auth(superadmin))
    assert r.status_code == 200 and isinstance(r.json(), list)


# ------------------------------------------------------------------ CYB-02 Tier 1 revocation

def _revoke(superadmin, role, action):
    return client.post("/api/v1/access/revoke", headers=_auth(superadmin), json={
        "contract_version": "1.0.0", "revocation_type": "permission_revocation",
        "target": {"role": role, "action": action}, "reason": "unit test of Tier 1 revocation (synthetic)",
        "requested_by": f"cc_usr_{superadmin.id}"})


def _restore(superadmin, role, action):
    return client.post("/api/v1/access/restore", headers=_auth(superadmin), json={
        "contract_version": "1.0.0", "role": role, "action": action, "reason": "unit test restore (synthetic)"})


def test_permission_revocation_takes_effect_and_can_be_restored(superadmin, investigator):
    assert client.get("/api/v1/cases/", headers=_auth(investigator)).status_code == 200
    try:
        assert _revoke(superadmin, "investigator", "read").json()["status"] == "REVOKED"
        assert _revoke(superadmin, "investigator", "read").json()["status"] == "ALREADY_INACTIVE"
        denied = client.get("/api/v1/cases/", headers=_auth(investigator))
        assert denied.status_code == 403 and denied.json()["code"] == "PERMISSION_REVOKED"
        az = client.post("/api/v1/authz/check", headers=_auth(investigator), json={
            "contract_version": "1.0.0", "subject": {"actor_id": f"cc_usr_{investigator.id}", "role": "investigator"},
            "action": "read", "resource": {"type": "evidence", "id": "EV-1"}})
        assert az.json()["decision"] == "DENY" and az.json()["reason_code"] == "PERMISSION_REVOKED"
        assert client.get("/api/v1/cases/", headers=_auth(superadmin)).status_code == 200  # superadmin unaffected
    finally:
        restored = _restore(superadmin, "investigator", "read")
    assert restored.json()["status"] == "RESTORED"
    assert client.get("/api/v1/cases/", headers=_auth(investigator)).status_code == 200


def test_superadmin_and_unknown_pairs_cannot_be_revoked(superadmin):
    assert _revoke(superadmin, "superadmin", "read").status_code == 400
    assert _revoke(superadmin, "investigator", "launch").status_code == 400
    db = SessionLocal()
    assert db.query(RevokedPermission).filter(RevokedPermission.role == "superadmin").count() == 0
    db.close()


# ------------------------------------------------------------------ CYB-06 / CYB-03 incident analysis

def test_unknown_wallet_gets_no_invented_data(investigator):
    r = client.post("/api/v1/incidents/analyze", headers=_auth(investigator), json={
        "wallet_address": "0xNOHISTORY" + uuid.uuid4().hex[:10], "description": "scam victim fraud (synthetic)"})
    body = r.json()
    assert r.status_code == 200
    assert body["transactions"] == [] and body["detected_patterns"] == [] and body["graph_data"] == []
    assert body["data_basis"] == "none" and body["risk_score"] == 0.0 and body["confidence"] == 0.0
    assert body["uncertainty"] and body["risk_level"] == "INSUFFICIENT DATA"


def test_demo_mode_labels_every_generated_transaction(investigator, monkeypatch):
    monkeypatch.setattr(settings, "INCIDENT_SYNTHETIC_DEMO", True)
    r = client.post("/api/v1/incidents/analyze", headers=_auth(investigator), json={
        "wallet_address": "0xDEMO" + uuid.uuid4().hex[:10], "description": "demo (synthetic)"})
    body = r.json()
    assert r.status_code == 200 and body["data_basis"] == "synthetic_demo"
    assert body["transactions"] and all(t["synthetic"] for t in body["transactions"])
    assert body["confidence"] == 0.0 and body["system_conclusion"].startswith("DEMO")


# ------------------------------------------------------------------ CYB-07, CYB-12, trace-id echo

def test_collection_without_trailing_slash_redirects(investigator):
    r = client.get("/api/v1/cases", headers=_auth(investigator), follow_redirects=False)
    assert r.status_code == 307


def test_preflight_still_answered():
    r = client.options("/api/v1/cases/", headers={"Origin": "https://cybercrime-frontend.onrender.com",
                                                   "Access-Control-Request-Method": "GET"})
    assert r.status_code == 200


def test_anonymous_health_has_no_paths(superadmin):
    anon = client.get("/api/v1/system/health").json()
    assert '"path"' not in json.dumps(anon) and '"buffer_path"' not in json.dumps(anon)
    admin = client.get("/api/v1/system/health", headers=_auth(superadmin)).json()
    assert "path" in admin["integrations"]["storage"]  # operators still see it


def test_malformed_trace_id_is_not_echoed(investigator):
    bad = "bad trace\twith spaces"
    r = client.get("/api/v1/cases/", headers={**_auth(investigator), "X-Trace-Id": bad, "X-Request-Id": bad})
    assert r.status_code == 200
    assert r.headers["X-Trace-Id"] != bad and r.headers["X-Request-Id"] != bad
    good = client.get("/api/v1/cases/", headers={**_auth(investigator), "X-Trace-Id": "trace-ok-1"})
    assert good.headers["X-Trace-Id"] == "trace-ok-1"


# ------------------------------------------------------------------ CYB-08 / CYB-09 Bucket

def test_upload_reports_bucket_outcome(investigator):
    r = client.post("/api/v1/evidence/", headers=_auth(investigator),
                    files={"file": ("synthetic.txt", b"synthetic evidence", "text/plain")},
                    data={"wallet_id": "0xSYNTHETIC", "title": "unit test evidence"})
    assert r.status_code == 200 and r.json()["bucket_status"] == "not_configured"


def test_bucket_key_travels_in_a_header_not_the_payload(monkeypatch):
    seen = {}

    def fake_post(url, payload, timeout_seconds, headers=None, trace_id=None, request_id=None):
        seen.update(payload=payload, headers=headers)
        return sovereign_integrations.IntegrationResult(success=True, upstream_status=200)

    monkeypatch.setattr(settings, "BHIV_BUCKET_EVIDENCE_URL", "http://bucket.test/store")
    monkeypatch.setattr(settings, "BHIV_BUCKET_API_KEY", "unit-test-key-" + uuid.uuid4().hex)
    monkeypatch.setattr(sovereign_integrations, "_post_json", fake_post)
    sovereign_integrations.store_evidence_in_bucket(evidence_id="EV-UNIT", sha256="00", filename="f.txt",
                                                    content=b"x", content_type="text/plain")
    assert "apiKey" not in seen["payload"] and settings.BHIV_BUCKET_API_KEY not in json.dumps(seen["payload"])
    assert seen["headers"] == {"X-API-Key": settings.BHIV_BUCKET_API_KEY}


# ------------------------------------------------------------------ CYB-14 rate limit

def test_protected_access_is_rate_limited_per_caller(monkeypatch):
    caller = _user("investigator")
    monkeypatch.setattr(settings, "PROTECTED_ACCESS_RATE_LIMIT_PER_MINUTE", 2)
    body = {"contract_version": "1.0.0", "vajra_subject": "0xRateLimitSubject", "action": "read",
            "resource": {"type": "evidence", "id": "EV-UNIT-RL"}, "purpose": "unit test rate limit"}
    codes = [client.post("/api/v1/protected/access", json=body, headers=_auth(caller)).status_code for _ in range(3)]
    assert codes[:2] == [200, 200]  # VAJRA not configured: DENY decisions, still answered
    assert codes[2] == 429


# ------------------------------------------------------------------ audit iteration 6 follow-ups

def test_recorded_dataset_path_states_provenance(investigator):
    from app.db.models import FraudTransaction
    wallet = "CREC" + uuid.uuid4().hex[:10]
    db = SessionLocal()
    for step, (orig, dest, amount) in enumerate([(wallet, "C1", 900.0), ("C2", wallet, 1200.0), (wallet, "M3", 50.0)], 1):
        db.add(FraudTransaction(step=step, type="TRANSFER", amount=amount, name_orig=orig, old_balance_orig=0.0,
                                new_balance_orig=0.0, name_dest=dest, is_fraud=0))
    db.commit()
    db.close()
    body = client.post("/api/v1/incidents/analyze", headers=_auth(investigator), json={
        "wallet_address": wallet, "description": "routine check (synthetic)"}).json()
    assert body["data_basis"] == "recorded" and body["observed_tx_count"] == 3
    assert body["transactions"] and not any(t["synthetic"] for t in body["transactions"])
    assert 0 < body["confidence"] <= 0.8
    text = " ".join(body["uncertainty"])
    assert "generator script" in text and "step counter" in text  # provenance and invented times are disclosed


def test_login_is_throttled_per_account_without_db_writes(monkeypatch):
    monkeypatch.setattr(settings, "LOGIN_MAX_ATTEMPTS_PER_MINUTE", 3)
    email = f"throttle-{uuid.uuid4().hex[:8]}@bhiv-verification.example"
    codes = [_login(email, "x").status_code for _ in range(4)]
    assert codes == [401, 401, 401, 429]
    from app.api.v1.endpoints.auth import _account_ref
    db = SessionLocal()
    stored = db.query(AuditLog).filter(AuditLog.action == "auth.login:login",
                                       AuditLog.entity_id == _account_ref(email, None)).count()
    db.close()
    assert stored == 3  # the throttled attempt wrote nothing


def test_unknown_email_identifier_is_keyed():
    import hashlib
    from app.api.v1.endpoints.auth import _account_ref
    email = "someone@bhiv-verification.example"
    ref = _account_ref(email, None)
    assert ref.startswith("unknown:") and ref != "unknown:" + hashlib.sha256(email.encode()).hexdigest()[:16]


def test_deactivated_account_attempts_are_not_counted_as_an_attack():
    user = _user("investigator", password="Right-pass-1", active=False)
    for _ in range(THRESHOLD + 1):
        assert _login(user.email, "Right-pass-1").status_code == 401  # correct password, inactive account
    db = SessionLocal()
    count = db.query(SecurityIncident).filter(SecurityIncident.target_ref == f"cc_usr_{user.id}").count()
    db.close()
    assert count == 0


def test_restore_is_undone_if_its_audit_event_cannot_be_written(superadmin, monkeypatch):
    from app.api.v1.endpoints import access as access_module
    assert _revoke(superadmin, "investigator", "delete").json()["status"] == "REVOKED"
    try:
        def failing_emit(**kwargs):
            raise RuntimeError("audit store unavailable (unit test)")
        monkeypatch.setattr(access_module, "emit_canonical_event", failing_emit)
        r = TestClient(app, raise_server_exceptions=False).post(
            "/api/v1/access/restore", headers=_auth(superadmin),
            json={"contract_version": "1.0.0", "role": "investigator", "action": "delete", "reason": "unit test restore (synthetic)"})
        assert r.status_code == 500
        db = SessionLocal()
        still_revoked = db.query(RevokedPermission).filter(RevokedPermission.role == "investigator",
                                                           RevokedPermission.action == "delete").count()
        db.close()
        assert still_revoked == 1  # no un-audited change
    finally:
        monkeypatch.undo()
        assert _restore(superadmin, "investigator", "delete").json()["status"] == "RESTORED"


def test_authz_check_does_not_echo_a_bad_trace_id(investigator):
    bad = "bad trace with spaces"
    r = client.post("/api/v1/authz/check", headers={**_auth(investigator), "X-Trace-Id": bad}, json={
        "contract_version": "1.0.0", "subject": {"actor_id": f"cc_usr_{investigator.id}", "role": "investigator"},
        "action": "read", "resource": {"type": "evidence", "id": "EV-1"}})
    assert r.status_code == 200 and r.json()["trace_id"] != bad
