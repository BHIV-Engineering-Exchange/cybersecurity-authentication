"""
Unit tests for the BHIV runtime bridge (app/core/bhiv_runtime.py) and
POST /api/v1/protected/access.

SIMULATED peers: every TANTRA and VAJRA response in this file comes from an in-process
httpx.MockTransport or a patched function. These tests prove the module's own logic
(status mapping, fail-closed decisions, no-bypass, idempotency, honest evidence reporting).
They are NOT integration evidence; the real-process checks are in verification/.
"""

import json
import uuid
from unittest.mock import patch

import httpx
import pytest
from fastapi.testclient import TestClient

from main import app
from app.core import bhiv_runtime
from app.core.bhiv_runtime import SinkResult
from app.core.config import settings
from app.core.security import create_access_token, get_password_hash
from app.db.database import SessionLocal
from app.db.models import AuditLog, User

client = TestClient(app)
TEST_SECRET = "unit-test-bearer-" + uuid.uuid4().hex


def _mock_client(handler):
    return lambda: httpx.Client(transport=httpx.MockTransport(handler))


@pytest.fixture(autouse=True)
def runtime_settings(monkeypatch):
    monkeypatch.setattr(settings, "VAJRA_API_URL", "http://vajra.test:8080")
    monkeypatch.setattr(settings, "VAJRA_TANTRA_SECRET", TEST_SECRET)
    monkeypatch.setattr(settings, "TANTRA_VALIDATION_URL", "http://tantra.test:8101")
    monkeypatch.setattr(settings, "TANTRA_KARMA_URL", "http://tantra.test:8102")
    yield


@pytest.fixture(scope="module")
def investigator_token():
    db = SessionLocal()
    user = db.query(User).filter(User.email == "inv_p0_bridge@bhiv.test").first()
    if not user:
        user = User(email="inv_p0_bridge@bhiv.test", hashed_password=get_password_hash("Not-Used-1!"),
                    full_name="P0 bridge investigator (synthetic)", role="investigator", is_active=True)
        db.add(user)
        db.commit()
        db.refresh(user)
    token = create_access_token({"sub": user.email, "user_id": user.id, "role": "investigator"})
    db.close()
    return token


# ---------------------------------------------------------------- bridge: VAJRA


def test_vajra_verify_maps_states():
    def handler(request):
        assert request.url.path == "/api/vajra/authority/verify"
        state = {"s-granted": "USE", "s-revoked": "REVOKE"}.get(request.url.params["subject"], "")
        return httpx.Response(200, json={"subject": request.url.params["subject"], "current_state": state,
                                         "is_authorized": state == "USE", "verified_at": 1})

    with patch.object(bhiv_runtime, "_client", _mock_client(handler)):
        ok = bhiv_runtime.vajra_verify_authority("s-granted", trace_id="t1")
        revoked = bhiv_runtime.vajra_verify_authority("s-revoked", trace_id="t1")
    assert ok.status == "OK" and ok.data["is_authorized"] is True
    assert revoked.status == "OK" and revoked.data["is_authorized"] is False
    assert revoked.data["current_state"] == "REVOKE"


def test_vajra_unreachable_is_unavailable_not_success():
    def handler(request):
        raise httpx.ConnectError("connection refused")

    with patch.object(bhiv_runtime, "_client", _mock_client(handler)):
        res = bhiv_runtime.vajra_verify_authority("anyone", trace_id="t2")
    assert res.status == "UNAVAILABLE"


@pytest.mark.parametrize(
    "code,body,expected",
    [
        (200, {"success": True, "stored": True, "evidence_hash": "sha256:ab"}, "RECORDED"),
        (200, {"success": True, "simulated": True, "stored": False, "evidence_hash": "rehearsal-x"}, "SIMULATED"),
        (409, {"success": False, "duplicate": True, "existing_hash": "sha256:ab"}, "DUPLICATE_TRACE"),
        (401, {"error": "UNAUTHORIZED"}, "UNAUTHORIZED"),
        (400, {"success": False, "error": "trace_id is mandatory"}, "REJECTED"),
        (503, {"success": False, "error": "STORE_UNAVAILABLE"}, "UNAVAILABLE"),
    ],
)
def test_vajra_evidence_status_mapping(code, body, expected):
    seen = {}

    def handler(request):
        seen["auth"] = request.headers.get("Authorization")
        seen["trace"] = request.headers.get("X-Trace-Id")
        return httpx.Response(code, json=body)

    with patch.object(bhiv_runtime, "_client", _mock_client(handler)):
        res = bhiv_runtime.vajra_record_evidence(trace_id="t3", action_taken="DENY", threat_type="ACCESS_DECISION",
                                                 severity="UNASSESSED", actor="s", details="d",
                                                 evidence_sha256_hex="00")
    assert res.status == expected
    assert seen["auth"] == f"Bearer {TEST_SECRET}"
    assert seen["trace"] == "t3"
    assert TEST_SECRET not in json.dumps(res.as_dict())  # the secret never leaves the header


def test_vajra_evidence_without_secret_is_not_sent(monkeypatch):
    monkeypatch.setattr(settings, "VAJRA_TANTRA_SECRET", "")
    calls = []

    def handler(request):
        calls.append(request)
        return httpx.Response(200, json={"success": True})

    with patch.object(bhiv_runtime, "_client", _mock_client(handler)):
        res = bhiv_runtime.vajra_record_evidence(trace_id="t4", action_taken="DENY", threat_type="x",
                                                 severity="x", actor="s", details="d", evidence_sha256_hex="00")
    assert res.status == "NOT_CONFIGURED" and calls == []


# ---------------------------------------------------------------- bridge: TANTRA


def test_tantra_rejection_is_not_bypassed():
    paths = []

    def handler(request):
        paths.append(request.url.path)
        if request.url.path == "/validate/prana/ingress":
            return httpx.Response(422, json={"status": "rejected", "reason": "event_type_not_registered",
                                             "details": {"registered_event_types": ["integrity_probe"]}})
        return httpx.Response(200, json={"status": "success", "event_id": "should-not-happen"})

    env = bhiv_runtime.build_tantra_envelope(event_type="security_decision", submission_id="s1", payload={})
    with patch.object(bhiv_runtime, "_client", _mock_client(handler)):
        res = bhiv_runtime.tantra_submit(env, trace_id="t5")
    assert res.status == "CONTRACT_REJECTED"
    assert res.data["reason"] == "event_type_not_registered"
    assert paths == ["/validate/prana/ingress"]  # nothing was written to the karma ledger


def test_tantra_validated_envelope_is_ingested_and_replay_checked():
    paths = []

    def handler(request):
        paths.append(request.url.path)
        if request.url.path == "/validate/prana/ingress":
            return httpx.Response(200, json={"status": "valid", "envelope": json.loads(request.content)})
        if request.url.path == "/karma/ingest":
            return httpx.Response(200, json={"status": "success", "event_id": "ev-1", "payload_hash": "h",
                                             "prana": {"status": "forwarded"}})
        if request.url.path == "/karma/verify":
            assert request.url.params["event_id"] == "ev-1"
            return httpx.Response(200, json={"status": "MATCH"})
        return httpx.Response(404)

    env = bhiv_runtime.build_tantra_envelope(event_type="integrity_probe", submission_id="s2",
                                             payload={"sequence": 1, "status": "ok", "probe": "p"})
    with patch.object(bhiv_runtime, "_client", _mock_client(handler)):
        res = bhiv_runtime.tantra_submit(env, trace_id="t6")
    assert res.status == "RECORDED"
    assert res.data["karma_event_id"] == "ev-1" and res.data["replay_status"] == "MATCH"
    assert paths == ["/validate/prana/ingress", "/karma/ingest", "/karma/verify"]


def test_traceparent_only_for_uuid_trace_ids():
    tp = bhiv_runtime.traceparent_for("0b9d6c0e-6f3e-4c55-9d1a-2f4a1c9e7b10")
    assert tp is not None and tp.startswith("00-0b9d6c0e6f3e4c559d1a2f4a1c9e7b10-") and tp.endswith("-01")
    assert bhiv_runtime.traceparent_for("trace-not-a-uuid") is None




def test_vajra_verify_is_strict_about_booleans():
    def handler(request):
        return httpx.Response(200, json={"subject": "s", "current_state": "REVOKE", "is_authorized": "false"})

    with patch.object(bhiv_runtime, "_client", _mock_client(handler)):
        res = bhiv_runtime.vajra_verify_authority("s", trace_id="t7")
    assert res.status == "OK" and res.data["is_authorized"] is False


def test_malformed_secret_is_not_sent_and_never_echoed(monkeypatch):
    bad = "secret-with-newline-" + uuid.uuid4().hex + "\n"
    monkeypatch.setattr(settings, "VAJRA_TANTRA_SECRET", bad)
    calls = []

    def handler(request):
        calls.append(request)
        return httpx.Response(200, json={"success": True})

    with patch.object(bhiv_runtime, "_client", _mock_client(handler)):
        res = bhiv_runtime.vajra_record_evidence(trace_id="t8", action_taken="DENY", threat_type="x", severity="x",
                                                 actor="s", details="d", evidence_sha256_hex="00")
    assert res.status == "NOT_CONFIGURED" and calls == []
    assert bad.strip() not in json.dumps(res.as_dict())


def test_exception_detail_is_class_name_only():
    def handler(request):
        raise httpx.ConnectError("connect failed while sending Authorization: Bearer " + TEST_SECRET)

    with patch.object(bhiv_runtime, "_client", _mock_client(handler)):
        res = bhiv_runtime.vajra_record_evidence(trace_id="t9", action_taken="DENY", threat_type="x", severity="x",
                                                 actor="s", details="d", evidence_sha256_hex="00")
    assert res.status == "UNAVAILABLE" and res.detail == "ConnectError"
    assert TEST_SECRET not in json.dumps(res.as_dict())


def test_karma_replay_mismatch_is_not_counted_as_recorded():
    def handler(request):
        if request.url.path == "/validate/prana/ingress":
            return httpx.Response(200, json={"status": "valid", "envelope": json.loads(request.content)})
        if request.url.path == "/karma/ingest":
            return httpx.Response(200, json={"status": "success", "event_id": "ev-2"})
        return httpx.Response(200, json={"status": "MISMATCH"})

    env = bhiv_runtime.build_tantra_envelope(event_type="integrity_probe", submission_id="s3", payload={})
    with patch.object(bhiv_runtime, "_client", _mock_client(handler)):
        res = bhiv_runtime.tantra_submit(env, trace_id="t10")
    assert res.status == "RECORDED_UNVERIFIED"
    assert bhiv_runtime.evidence_gaps({"tantra": res}) == ["tantra"]


def test_submission_prefix_marks_test_traffic(monkeypatch):
    monkeypatch.setattr(settings, "TANTRA_SUBMISSION_PREFIX", "cyber-p0-test-")
    env = bhiv_runtime.build_tantra_envelope(event_type="security_decision", submission_id="abc", payload={})
    assert env["submission_id"] == "cyber-p0-test-abc"


# ---------------------------------------------------------------- endpoint


def _ok_evidence(*args, **kwargs):
    return SinkResult(status="RECORDED", http_status=200, data={"evidence_hash": "sha256:00"})


def _authority(state="USE"):
    return SinkResult(status="OK", data={"is_authorized": state in ("GRANT", "USE"), "current_state": state})


def _body(key=None, subject="0xSubjectA", action="read"):
    body = {"contract_version": "1.0.0", "vajra_subject": subject, "action": action,
            "resource": {"type": "evidence", "id": "EV-UNIT-1"}, "purpose": "unit test"}
    if key:
        body["idempotency_key"] = key
    return body


def _token_for(email, role):
    db = SessionLocal()
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(email=email, hashed_password=get_password_hash("Not-Used-1!"), full_name=f"{role} (synthetic)",
                    role=role, is_active=True)
        db.add(user)
        db.commit()
        db.refresh(user)
    token = create_access_token({"sub": user.email, "user_id": user.id, "role": role})
    db.close()
    return token


def _post(token, body):
    return client.post("/api/v1/protected/access", json=body, headers={"Authorization": f"Bearer {token}"})


def test_endpoint_requires_authentication():
    r = client.post("/api/v1/protected/access", json=_body())
    assert r.status_code == 401


@pytest.mark.parametrize(
    "authority,decision,reason",
    [
        (_authority("USE"), "ALLOW", "ALLOWED_BY_VAJRA_AUTHORITY"),
        (_authority("REVOKE"), "DENY", "VAJRA_AUTHORITY_NOT_GRANTED"),
        (SinkResult(status="UNAVAILABLE", detail="ConnectError"), "DENY", "VAJRA_UNAVAILABLE"),
        (SinkResult(status="NOT_CONFIGURED"), "DENY", "VAJRA_NOT_CONFIGURED"),
    ],
)
def test_endpoint_decisions_fail_closed(investigator_token, authority, decision, reason):
    with patch.object(bhiv_runtime, "vajra_verify_authority", return_value=authority), \
         patch.object(bhiv_runtime, "vajra_record_evidence", side_effect=_ok_evidence), \
         patch.object(bhiv_runtime, "tantra_submit", side_effect=_ok_evidence):
        r = _post(investigator_token, _body())
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["decision"] == decision and data["reason_code"] == reason
    assert data["vajra"]["scope_checked"] is False
    assert data["evidence"]["complete"] is True and data["evidence"]["gaps"] == []


def test_allow_requires_vajra_evidence(investigator_token):
    refused = SinkResult(status="UNAUTHORIZED", http_status=401, detail="VAJRA rejected the bearer token")
    with patch.object(bhiv_runtime, "vajra_verify_authority", return_value=_authority("USE")), \
         patch.object(bhiv_runtime, "vajra_record_evidence", return_value=refused), \
         patch.object(bhiv_runtime, "tantra_submit", side_effect=_ok_evidence):
        data = _post(investigator_token, _body()).json()
    assert data["decision"] == "DENY" and data["reason_code"] == "VAJRA_EVIDENCE_NOT_RECORDED"
    assert "vajra" in data["evidence"]["gaps"]
    first_id = data["evidence"]["superseded_audit_event_id"]
    assert first_id and first_id != data["evidence"]["local_audit_event_id"]
    db = SessionLocal()
    rows = [json.loads(r.details) for r in db.query(AuditLog).filter(AuditLog.action == "protected_access.decision:read").all()]
    db.close()
    final = next(e for e in rows if e["event_id"] == data["evidence"]["local_audit_event_id"])
    assert final["outcome"]["status"] == "DENIED" and final["metadata"]["supersedes_event_id"] == first_id


def test_endpoint_reports_tantra_gap_without_changing_decision(investigator_token):
    rejected = SinkResult(status="CONTRACT_REJECTED", http_status=422, detail="event_type_not_registered")
    with patch.object(bhiv_runtime, "vajra_verify_authority", return_value=_authority("USE")), \
         patch.object(bhiv_runtime, "vajra_record_evidence", side_effect=_ok_evidence), \
         patch.object(bhiv_runtime, "tantra_submit", return_value=rejected):
        data = _post(investigator_token, _body()).json()
    assert data["decision"] == "ALLOW"
    assert data["evidence"]["complete"] is False and data["evidence"]["gaps"] == ["tantra"]
    assert data["evidence"]["tantra"]["status"] == "CONTRACT_REJECTED"


def test_tantra_payload_is_the_canonical_event(investigator_token):
    seen = {}

    def capture(envelope, **kwargs):
        seen["envelope"] = envelope
        return _ok_evidence()

    with patch.object(bhiv_runtime, "vajra_verify_authority", return_value=_authority("USE")), \
         patch.object(bhiv_runtime, "vajra_record_evidence", side_effect=_ok_evidence), \
         patch.object(bhiv_runtime, "tantra_submit", side_effect=capture):
        data = _post(investigator_token, _body()).json()
    payload = seen["envelope"]["payload"]
    assert payload["schema_version"] == "1.0.0" and payload["event_type"] == "protected_access.decision"
    assert payload["event_id"] == data["evidence"]["local_audit_event_id"]
    assert "purpose" not in payload["metadata"] and "idempotency_key" not in payload["metadata"]
    assert payload["metadata"]["vajra_subject_ref"].startswith("subj_sha256_")


def test_idempotent_repeat_executes_once_and_rechecks_vajra(investigator_token):
    key = "idem-" + uuid.uuid4().hex
    with patch.object(bhiv_runtime, "vajra_verify_authority", return_value=_authority("USE")) as verify, \
         patch.object(bhiv_runtime, "vajra_record_evidence", side_effect=_ok_evidence) as record, \
         patch.object(bhiv_runtime, "tantra_submit", side_effect=_ok_evidence) as submit:
        first = _post(investigator_token, _body(key)).json()
        second = _post(investigator_token, _body(key)).json()
    assert first["duplicate"] is False and second["duplicate"] is True
    assert second["decision"] == first["decision"] == "ALLOW"
    assert second["decision_id"] == first["decision_id"]
    assert record.call_count == 1 and submit.call_count == 1
    assert verify.call_count == 2  # the decision, then the re-check before replaying an ALLOW


def test_same_key_different_request_is_refused(investigator_token):
    key = "idem-" + uuid.uuid4().hex
    with patch.object(bhiv_runtime, "vajra_verify_authority", return_value=_authority("USE")), \
         patch.object(bhiv_runtime, "vajra_record_evidence", side_effect=_ok_evidence) as record, \
         patch.object(bhiv_runtime, "tantra_submit", side_effect=_ok_evidence):
        _post(investigator_token, _body(key, subject="0xSubjectA"))
        r = _post(investigator_token, _body(key, subject="0xSubjectB", action="delete"))
    assert r.status_code == 409 and r.json()["code"] == "IDEMPOTENCY_KEY_CONFLICT"
    assert record.call_count == 1


def test_replay_after_revocation_is_refused(investigator_token):
    key = "idem-" + uuid.uuid4().hex
    with patch.object(bhiv_runtime, "vajra_record_evidence", side_effect=_ok_evidence) as record, \
         patch.object(bhiv_runtime, "tantra_submit", side_effect=_ok_evidence):
        with patch.object(bhiv_runtime, "vajra_verify_authority", return_value=_authority("USE")):
            assert _post(investigator_token, _body(key)).json()["decision"] == "ALLOW"
        with patch.object(bhiv_runtime, "vajra_verify_authority", return_value=_authority("REVOKE")):
            r = _post(investigator_token, _body(key))
    assert r.status_code == 409 and r.json()["code"] == "STALE_DECISION"
    assert "decision" not in r.json() and record.call_count == 1


def test_replay_of_a_deny_is_answered_as_duplicate(investigator_token):
    key = "idem-" + uuid.uuid4().hex
    with patch.object(bhiv_runtime, "vajra_verify_authority", return_value=_authority("REVOKE")), \
         patch.object(bhiv_runtime, "vajra_record_evidence", side_effect=_ok_evidence), \
         patch.object(bhiv_runtime, "tantra_submit", side_effect=_ok_evidence):
        first = _post(investigator_token, _body(key)).json()
        second = _post(investigator_token, _body(key)).json()
    assert first["decision"] == second["decision"] == "DENY" and second["duplicate"] is True


def test_keys_are_scoped_per_caller(investigator_token):
    other = _token_for("inv_p0_bridge_other@bhiv.example", "investigator")
    key = "idem-" + uuid.uuid4().hex
    with patch.object(bhiv_runtime, "vajra_verify_authority", return_value=_authority("USE")), \
         patch.object(bhiv_runtime, "vajra_record_evidence", side_effect=_ok_evidence) as record, \
         patch.object(bhiv_runtime, "tantra_submit", side_effect=_ok_evidence):
        a = _post(investigator_token, _body(key)).json()
        b = _post(other, _body(key, subject="0xOtherSubject")).json()
    assert a["duplicate"] is False and b["duplicate"] is False and record.call_count == 2


def test_in_flight_key_returns_409(investigator_token):
    from app.db.models import ProtectedAccessDecision
    key = "idem-" + uuid.uuid4().hex
    db = SessionLocal()
    me = db.query(User).filter(User.email == "inv_p0_bridge@bhiv.test").first()
    from app.api.v1.endpoints.protected_access import ProtectedAccessRequest, _fingerprint
    req = ProtectedAccessRequest(**_body(key))
    db.add(ProtectedAccessDecision(idempotency_key=f"cc_usr_{me.id}:{key}", actor_id=f"cc_usr_{me.id}", trace_id="t",
                                   request_fingerprint=_fingerprint(req, "read", "evidence"), decision="PENDING",
                                   response_json="{}"))
    db.commit()
    db.close()
    with patch.object(bhiv_runtime, "vajra_verify_authority", return_value=_authority("USE")) as verify:
        r = _post(investigator_token, _body(key))
    assert r.status_code == 409 and r.json()["code"] == "DUPLICATE_IN_PROGRESS" and verify.call_count == 0


def test_endpoint_withholds_decision_when_audit_cannot_persist(investigator_token):
    with patch.object(bhiv_runtime, "vajra_verify_authority", return_value=_authority("USE")), \
         patch("app.api.v1.endpoints.protected_access.emit_canonical_event",
               side_effect=RuntimeError("Audit log persistence failed: simulated")), \
         patch.object(bhiv_runtime, "vajra_record_evidence", side_effect=_ok_evidence) as record, \
         patch.object(bhiv_runtime, "tantra_submit", side_effect=_ok_evidence) as submit:
        r = _post(investigator_token, _body("idem-" + uuid.uuid4().hex))
    assert r.status_code == 503
    assert r.json()["code"] == "EVIDENCE_PERSISTENCE_FAILED"
    assert "decision" not in r.json()
    record.assert_not_called()  # no VAJRA record for a decision that was never released
    submit.assert_not_called()


def test_endpoint_audit_row_written(investigator_token):
    trace = str(uuid.uuid4())
    with patch.object(bhiv_runtime, "vajra_verify_authority", return_value=_authority("TERMINATE")), \
         patch.object(bhiv_runtime, "vajra_record_evidence", side_effect=_ok_evidence), \
         patch.object(bhiv_runtime, "tantra_submit", side_effect=_ok_evidence):
        r = client.post("/api/v1/protected/access", json=_body(),
                        headers={"Authorization": f"Bearer {investigator_token}", "X-Trace-Id": trace})
    assert r.headers["X-Trace-Id"] == trace and r.json()["trace_id"] == trace
    db = SessionLocal()
    row = db.query(AuditLog).filter(AuditLog.entity_id == "EV-UNIT-1",
                                    AuditLog.action == "protected_access.decision:read").order_by(AuditLog.id.desc()).first()
    db.close()
    assert row is not None
    stored = json.loads(row.details)
    assert stored["trace_id"] == trace and stored["outcome"]["status"] == "DENIED"
    assert stored["metadata"]["decision_id"] == r.json()["decision_id"]


def test_health_hides_peer_topology_from_anonymous_callers():
    anon = client.get("/api/v1/system/health")
    assert anon.status_code == 200 and "bhiv_runtime" not in anon.json()
    admin = _token_for("superadmin_p0_bridge@bhiv.example", "superadmin")
    with patch.object(bhiv_runtime, "runtime_health", return_value={"tantra": {}, "vajra": {}}):
        with patch("app.api.v1.endpoints.system_health.runtime_health", return_value={"tantra": {}, "vajra": {}}):
            full = client.get("/api/v1/system/health", headers={"Authorization": f"Bearer {admin}"})
    assert full.status_code == 200 and "bhiv_runtime" in full.json()


def test_vajra_evidence_commits_to_the_stored_audit_event(investigator_token):
    import hashlib
    seen = {}

    def capture(**kwargs):
        seen.update(kwargs)
        return _ok_evidence()

    with patch.object(bhiv_runtime, "vajra_verify_authority", return_value=_authority("USE")), \
         patch.object(bhiv_runtime, "vajra_record_evidence", side_effect=capture), \
         patch.object(bhiv_runtime, "tantra_submit", side_effect=_ok_evidence):
        data = _post(investigator_token, _body()).json()
    db = SessionLocal()
    row = db.query(AuditLog).filter(AuditLog.action == "protected_access.decision:read").order_by(AuditLog.id.desc()).first()
    db.close()
    assert json.loads(row.details)["event_id"] == data["evidence"]["local_audit_event_id"]
    assert seen["evidence_sha256_hex"] == hashlib.sha256(row.details.encode("utf-8")).hexdigest()
    assert seen["trace_id"] == f"{data['trace_id']}::{data['decision_id']}"


def test_invalid_trace_id_is_rejected(investigator_token):
    r = client.post("/api/v1/protected/access", json=_body(),
                    headers={"Authorization": f"Bearer {investigator_token}", "X-Trace-Id": "bad trace/with spaces"})
    assert r.status_code == 400 and r.json()["code"] == "INVALID_TRACE_ID"


def test_redaction_keeps_plain_words():
    assert bhiv_runtime._redact("VAJRA rejected the bearer token") == "VAJRA rejected the bearer token"
    assert "abcdefgh12345" not in bhiv_runtime._redact("Authorization: Bearer abcdefgh12345")
