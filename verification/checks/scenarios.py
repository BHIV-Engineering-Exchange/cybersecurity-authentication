"""
End-to-end and negative checks against the real integrated path.

Systems under test
  cybersecurity  : the cybercrime FastAPI backend, run as a real uvicorn process
  vajra-local    : the real VAJRA relay node built from bhiv-VAJRA_Blockchain, run locally
                   (VAJRA's capability truth matrix, docs/CAPABILITY_TRUTH_MATRIX.md:38, asks that no test
                   records be posted to the live node until a staging instance or trace prefix is agreed)
  tantra-live    : the live TANTRA layer (validation, karma, PRANA) - only when --tantra live

Roles the harness plays (SIMULATED, stated in each affected check's evidence level):
  * VAJRA user journey: grants and revokes a synthetic subject's authority on the real VAJRA node
    (the user-facing journey is owned by the VAJRA UX team).
  * TANTRA governance: issues ISOLATE/TERMINATE on the real VAJRA node. Whether TANTRA's
    /intelligence/rajya/validate route is the approval contract for security responses is UNKNOWN,
    and it has no test lane, so it is not called.
All identities, subjects and payloads are synthetic.
"""

from __future__ import annotations

import base64
import hashlib
import json
import os
import socket
import stat
import threading
import time
import uuid
from pathlib import Path
from typing import Any, Dict, Optional

from harness.runner import Blocked, Context, Skipped, check
from harness.services import base_env

CYBER = "cybersecurity"
VAJRA = "vajra-local"
TANTRA = "tantra-live"
OFFLINE = "OFFLINE-VERIFIED"
SIM_USER = "OFFLINE-VERIFIED; VAJRA consent SIMULATED (harness plays the VAJRA user journey)"
SIM_GOV = "OFFLINE-VERIFIED; VAJRA consent and TANTRA approval SIMULATED (harness plays both roles)"
CODE = "CODE-VERIFIED"
TANTRA_REACHED = ("CONTRACT_REJECTED", "VALIDATED", "RECORDED", "RECORDED_UNVERIFIED")

SIM_ISSUER_USER = "VAJRA_USER_CONTROL_SIMULATOR (verification harness)"
SIM_ISSUER_TANTRA = "TANTRA_GOVERNANCE_SIMULATOR (verification harness)"


# ------------------------------------------------------------------------------------------- helpers

def cyber(ctx: Context):
    return ctx.data["cyber"]


def vajra(ctx: Context):
    return ctx.data["vajra"]


def auth(token: str, trace: Optional[str] = None) -> Dict[str, str]:
    headers = {"Authorization": f"Bearer {token}"}
    if trace:
        headers["X-Trace-Id"] = trace
    return headers


def token_of(ctx: Context, who: str) -> str:
    return ctx.data["users"][who]["token"]


def login(ctx: Context, email: str, password: str):
    return cyber(ctx).post("/api/v1/auth/login", data={"username": email, "password": password})


def jwt_claims(token: str) -> Dict[str, Any]:
    payload = token.split(".")[1]
    payload += "=" * (-len(payload) % 4)
    return json.loads(base64.urlsafe_b64decode(payload))


def new_subject(prefix: str) -> str:
    return f"cyber-p0-test-{prefix}-{uuid.uuid4().hex[:10]}"


DEFAULT_SCOPE = ("read:evidence",)  # what protected() asks for by default: action read on an evidence resource


def vajra_auth(ctx: Context, which: str = "governance") -> Dict[str, str]:
    """Headers for the local VAJRA node: 'governance' = VAJRA_TANTRA_SECRET, 'cyber' = VAJRA_CYBER_SECRET."""
    token = ctx.data["vajra_secret"] if which == "governance" else ctx.data["vajra_cyber_secret"]
    return {"Authorization": f"Bearer {token}", "X-Trace-Id": ctx.new_trace()}


def transition(ctx: Context, subject: str, to_state: str, issuer: str, *, bearer: Optional[str] = "valid",
               scope=DEFAULT_SCOPE):
    headers = {"X-Trace-Id": ctx.new_trace()}
    if bearer == "valid":
        headers["Authorization"] = f"Bearer {ctx.data['vajra_secret']}"
    elif bearer == "cyber":
        headers["Authorization"] = f"Bearer {ctx.data['vajra_cyber_secret']}"
    elif bearer:
        headers["Authorization"] = f"Bearer {bearer}"
    body = {
        "trace_id": headers["X-Trace-Id"], "subject": subject, "authority": "AUTH_ROLE_CLIENT", "issuer": issuer,
        "target": "VAJRA_LEDGER", "purpose": "BHIV_CYBER_P0_VERIFICATION (synthetic)", "scope": list(scope),
        "to_state": to_state, "policy_version": "v1.0.0", "evidence_ref": "synthetic-test",
    }
    return vajra(ctx).post("/api/vajra/authority/transition", json=body, headers=headers)


def grant_use(ctx: Context, subject: str, scope=DEFAULT_SCOPE) -> None:
    for state in ("GRANT", "USE"):
        r = transition(ctx, subject, state, SIM_ISSUER_USER, scope=scope)
        ctx.require(f"VAJRA {state} transition accepted for {subject}", 200, r.status_code)


def verify_view(ctx: Context, subject: str) -> Dict[str, Any]:
    r = vajra(ctx).get("/api/vajra/authority/verify", params={"subject": subject})
    return r.json() if r.status_code == 200 else {}


def reply_text(response, limit: int = 160) -> str:
    try:
        return json.dumps(response.json(), separators=(",", ":"))[:limit]
    except ValueError:
        return response.text[:limit]


def protected(ctx: Context, token: str, subject: str, *, trace: Optional[str] = None, key: Optional[str] = None,
              resource_id: str = "EV-P0-0001", action: str = "read", resource_type: str = "evidence"):
    trace = trace or ctx.new_trace(ctx.data.get("trace_prefix", ""))
    body = {"contract_version": "1.0.0", "vajra_subject": subject, "action": action,
            "resource": {"type": resource_type, "id": resource_id}, "purpose": "P0 verification (synthetic)"}
    if key:
        body["idempotency_key"] = key
    return cyber(ctx).post("/api/v1/protected/access", json=body, headers=auth(token, trace)), trace


def admin_health(ctx: Context) -> Dict[str, Any]:
    r = cyber(ctx).get("/api/v1/system/health", headers=auth(token_of(ctx, "superadmin")))
    return r.json() if r.status_code == 200 else {}


def audit_rows(ctx: Context, limit: int = 500):
    r = cyber(ctx).get("/api/v1/audit/", params={"limit": limit}, headers=auth(token_of(ctx, "superadmin")))
    if r.status_code != 200:
        return []
    rows = []
    for row in r.json():
        try:
            row["_details"] = json.loads(row.get("details") or "{}")
        except ValueError:
            row["_details"] = {}
        rows.append(row)
    return rows


def audit_for_trace(ctx: Context, trace: str):
    return [row for row in audit_rows(ctx) if row["_details"].get("trace_id") == trace]


def vajra_records(ctx: Context):
    r = vajra(ctx).get("/api/tantra/records")
    return r.json().get("records", []) if r.status_code == 200 else []


def vajra_rows_for(ctx: Context, trace: str):
    """VAJRA rows written for decisions on this trace (VAJRA trace = '<trace>::<decision_id>')."""
    return [x for x in vajra_records(ctx) if str(x.get("trace_id", "")).startswith(trace + "::")]


def restart_cyber(ctx: Context, overrides: Optional[Dict[str, str]] = None) -> float:
    service = ctx.data["services"]["cyber"]
    env = dict(ctx.data["cyber_base_env"])
    if overrides:
        env.update(overrides)
    service.env = base_env({**env, "PYTHONUNBUFFERED": "1"})
    return service.restart()


def live_tantra(ctx: Context) -> bool:
    return ctx.data["mode"]["tantra"] == "live"


def tantra_level(ctx: Context) -> None:
    """Evidence level for checks whose TANTRA part only exists in live mode."""
    if live_tantra(ctx):
        ctx.set_level("LIVE-VERIFIED (TANTRA contract gate) + OFFLINE-VERIFIED (cyber, local VAJRA); "
                      "VAJRA consent SIMULATED", [CYBER, VAJRA, TANTRA])
    else:
        ctx.set_level(SIM_USER + "; TANTRA not configured in this run", [CYBER, VAJRA])


# ------------------------------------------------------------------------------------------- observability

@check(id="O-01", title="Health endpoints report real state; peer topology is shown only to a superadmin", scenario="Observability",
       refs=["Task1 C health/status", "Task1 H health endpoint", "10-day Hemanth observability checks"],
       systems=[CYBER, VAJRA], evidence_level=OFFLINE)
def o01_health(ctx: Context):
    ctx.expect("cyber /health status", 200, cyber(ctx).get("/health").status_code)
    anon = cyber(ctx).get("/api/v1/system/health")
    ctx.expect("cyber /api/v1/system/health status (anonymous)", 200, anon.status_code)
    ctx.expect("anonymous health hides VAJRA/TANTRA topology", False, "bhiv_runtime" in (anon.json() or {}))
    anon_text = json.dumps(anon.json() or {})
    has_paths = '"path"' in anon_text or '"buffer_path"' in anon_text
    ctx.expect("anonymous health shows no server file-system paths", False, has_paths)
    if has_paths:
        ctx.defect("CYB-12")
    body = admin_health(ctx)
    ctx.expect("system health: database ok", True, body.get("database", {}).get("ok"))
    ctx.expect("superadmin health: VAJRA API reachable", True,
               body.get("bhiv_runtime", {}).get("vajra", {}).get("api", {}).get("reachable"))
    ctx.expect("superadmin health: VAJRA write token configured", True,
               body.get("bhiv_runtime", {}).get("vajra", {}).get("write_token_configured"))
    ctx.expect("VAJRA /api/health status", 200, vajra(ctx).get("/api/health").status_code)


@check(id="O-02", title="TANTRA live services healthy (read-only GET)", scenario="Observability",
       refs=["Task1 E observable execution", "EOD InsightFlow/Pravah actual state"], systems=[TANTRA],
       evidence_level="LIVE-VERIFIED (read-only)")
def o02_tantra_health(ctx: Context):
    if not live_tantra(ctx):
        raise Skipped("TANTRA live mode not enabled for this run (--tantra off)")
    for name in ("tantra_validation", "tantra_karma", "tantra_prana"):
        r = ctx.data[name].get("/health")
        ctx.expect(f"{name} /health status", 200, r.status_code)
        ctx.expect(f"{name} reports healthy", "healthy", (r.json() or {}).get("status") if r.status_code == 200 else None)


# ------------------------------------------------------------------------------------------- S1 unauthorized

@check(id="S1-01", title="Anonymous request is denied at the enforcement point, with actor/resource/decision/reason recorded",
       scenario="S1 Unauthorized access", refs=["EOD scenario: Unauthorized access", "Task1 C authorization"],
       systems=[CYBER], evidence_level=OFFLINE)
def s1_01(ctx: Context):
    trace = ctx.new_trace()
    r = cyber(ctx).get("/api/v1/cases", headers={"X-Trace-Id": trace})
    body = r.json()
    ctx.expect("HTTP status", 401, r.status_code)
    ctx.expect("error code", "AUTHENTICATION_REQUIRED", body.get("code"))
    ctx.expect("X-Trace-Id echoed", trace, r.headers.get("X-Trace-Id"))
    ctx.expect("trace_id in error body", trace, body.get("trace_id"))
    rows = [row["_details"] for row in audit_for_trace(ctx, trace)]
    denial = next((d for d in rows if d.get("event_type") == "authz.decision"), {})
    ctx.expect("audit event recorded for this trace", True, bool(denial))
    ctx.expect("audit actor", "anonymous", denial.get("actor", {}).get("actor_id"))
    ctx.expect("audit resource", "/api/v1/cases", denial.get("resource", {}).get("resource_id"))
    ctx.expect("audit decision", "DENIED", denial.get("outcome", {}).get("status"))
    ctx.expect("audit reason", "AUTHENTICATION_REQUIRED", denial.get("outcome", {}).get("reason_code"))


@check(id="S1-02", title="Forged token is rejected", scenario="S1 Unauthorized access",
       refs=["EOD scenario: Unauthorized access", "Task1 C authentication"], systems=[CYBER], evidence_level=OFFLINE)
def s1_02(ctx: Context):
    forged = "eyJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjoxLCJyb2xlIjoic3VwZXJhZG1pbiJ9.forged-signature-value"
    r = cyber(ctx).get("/api/v1/cases", headers={"Authorization": f"Bearer {forged}", "X-Trace-Id": ctx.new_trace()})
    ctx.expect("HTTP status", 401, r.status_code)
    ctx.expect("error code", "INVALID_CREDENTIALS", r.json().get("code"))


@check(id="S1-03", title="Investigator cannot call a superadmin-only control (revoke)", scenario="S1 Unauthorized access",
       refs=["EOD scenario: Unauthorized access", "Task1 C access-control boundaries"], systems=[CYBER],
       evidence_level=OFFLINE)
def s1_03(ctx: Context):
    trace = ctx.new_trace()
    inv = ctx.data["users"]["investigator_a"]
    r = cyber(ctx).post("/api/v1/access/revoke", headers=auth(inv["token"], trace), json={
        "contract_version": "1.0.0", "revocation_type": "user_deactivation",
        "target": {"actor_id": f"cc_usr_{ctx.data['users']['investigator_c']['id']}"},
        "reason": "privilege escalation attempt (synthetic)", "requested_by": f"cc_usr_{inv['id']}"})
    ctx.expect("HTTP status", 403, r.status_code)
    ctx.expect("error code", "INSUFFICIENT_PERMISSIONS", r.json().get("code"))
    rows = [row["_details"] for row in audit_for_trace(ctx, trace)]
    denial = next((d for d in rows if d.get("event_type") == "authz.decision"), {})
    ctx.expect("audit actor is the investigator", f"cc_usr_{inv['id']}", denial.get("actor", {}).get("actor_id"))
    ctx.expect("audit reason", "INSUFFICIENT_PERMISSIONS", denial.get("outcome", {}).get("reason_code"))


@check(id="S1-04", title="Self-registered account cannot read investigator data without approval",
       scenario="S1 Unauthorized access", refs=["EOD scenario: Unauthorized access", "Task1 C authentication/authorization"],
       systems=[CYBER], evidence_level=OFFLINE)
def s1_04(ctx: Context):
    email = f"selfreg-{uuid.uuid4().hex[:8]}@bhiv-verification.example"
    password = "Synthetic-" + uuid.uuid4().hex
    ctx.data["redactor"].add(password)
    reg = cyber(ctx).post("/api/v1/auth/register", json={"email": email, "password": password,
                                                         "full_name": "Self-registered stranger (synthetic)"})
    if reg.status_code == 422:
        raise RuntimeError("inconclusive: the API rejected the test registration data (422), so nothing was tested")
    body = reg.json() if reg.status_code in (200, 201) else {}
    ctx.note(f"public register returned HTTP {reg.status_code}, role={body.get('role')}, is_active={body.get('is_active')}")
    lg = login(ctx, email, password)
    data_status = None
    if lg.status_code == 200:
        data_status = cyber(ctx).get("/api/v1/cases/", headers=auth(lg.json()["access_token"], ctx.new_trace())).status_code
    refused = reg.status_code in (401, 403)
    pending = reg.status_code in (200, 201, 202) and lg.status_code in (401, 403)
    denied = data_status in (401, 403)
    ok = refused or pending or denied
    ctx.expect("anonymous self-registration does not yield investigator data access",
               "registration refused (401/403), account pending (login 401/403), or data access 401/403",
               f"register={reg.status_code}, login={lg.status_code}, GET /api/v1/cases/={data_status}", ok=ok)
    if not ok:
        ctx.defect("CYB-01")


@check(id="S1-05", title="Subject without VAJRA consent is denied; decision and evidence recorded",
       scenario="S1 Unauthorized access", refs=["EOD scenario: Unauthorized access", "Task1 M Vajra boundary", "Task1 D"],
       systems=[CYBER, VAJRA], evidence_level=OFFLINE)
def s1_05(ctx: Context):
    subject = new_subject("never-granted")
    r, trace = protected(ctx, token_of(ctx, "investigator_a"), subject)
    body = r.json()
    ctx.expect("HTTP status", 200, r.status_code)
    ctx.expect("decision", "DENY", body.get("decision"))
    ctx.expect("reason", "VAJRA_AUTHORITY_NOT_GRANTED", body.get("reason_code"))
    ctx.expect("VAJRA evidence recorded", "RECORDED", body.get("evidence", {}).get("vajra", {}).get("status"))
    ctx.expect("local audit event id present", True, bool(body.get("evidence", {}).get("local_audit_event_id")))
    rows = vajra_rows_for(ctx, trace)
    ctx.expect("one VAJRA TruthStore row for this decision, decision DENY", ["DENY"], [x.get("fraud_decision") for x in rows])


@check(id="S1-08", title="An action outside the scope VAJRA reports is denied; inside it is allowed (CYB-13)",
       scenario="S1 Unauthorized access",
       refs=["EOD scenario: Unauthorized access", "Task1 M Vajra boundary", "CYB-13", "Principle: least privilege"],
       systems=[CYBER, VAJRA], evidence_level=SIM_USER)
def s1_08(ctx: Context):
    token = token_of(ctx, "investigator_a")
    subject = new_subject("scoped-consent")
    grant_use(ctx, subject, scope=("read:evidence",))
    cases = (("read", "evidence", "ALLOW", "ALLOWED_BY_VAJRA_AUTHORITY"),
             ("download", "evidence", "DENY", "VAJRA_SCOPE_NOT_GRANTED"),
             ("read", "case", "DENY", "VAJRA_SCOPE_NOT_GRANTED"))
    for action, resource_type, decision, reason in cases:
        r, trace = protected(ctx, token, subject, action=action, resource_type=resource_type)
        body = r.json()
        label = f"{action}:{resource_type} with VAJRA scope ['read:evidence']"
        ctx.expect(f"{label}: decision", decision, body.get("decision"))
        ctx.expect(f"{label}: reason", reason, body.get("reason_code"))
        ctx.expect(f"{label}: scope_checked", True, body.get("vajra", {}).get("scope_checked"))
        ctx.expect(f"{label}: VAJRA evidence recorded", "RECORDED", body.get("evidence", {}).get("vajra", {}).get("status"))
        rows = vajra_rows_for(ctx, trace)
        ctx.expect(f"{label}: VAJRA row carries the decision", [decision], [x.get("fraud_decision") for x in rows])


@check(id="S1-06", title="VAJRA write routes reject callers without the bearer token (VAJRA enforcement point)",
       scenario="S1 Unauthorized access", refs=["EOD scenario: Unauthorized access", "10-day TANTRA: refuse actions outside contract"],
       systems=[VAJRA], evidence_level=OFFLINE)
def s1_06(ctx: Context):
    subject = new_subject("attacker")
    ctx.expect("transition without token", 401, transition(ctx, subject, "GRANT", "ATTACKER (synthetic)", bearer=None).status_code)
    ctx.expect("transition with wrong token", 401,
               transition(ctx, subject, "GRANT", "ATTACKER (synthetic)", bearer="guessed-token").status_code)
    r = vajra(ctx).post("/api/vajra/evidence/record", json={"trace_id": ctx.new_trace(), "action_taken": "ALLOW"})
    ctx.expect("evidence write without token", 401, r.status_code)
    v = vajra(ctx).get("/api/vajra/authority/verify", params={"subject": subject}).json()
    ctx.expect("attacker subject gained no authority", False, v.get("is_authorized"))


@check(id="S1-07", title="Anonymous call to the protected-access API is rejected", scenario="S1 Unauthorized access",
       refs=["EOD scenario: Unauthorized access"], systems=[CYBER], evidence_level=OFFLINE)
def s1_07(ctx: Context):
    r = cyber(ctx).post("/api/v1/protected/access", headers={"X-Trace-Id": ctx.new_trace()}, json={
        "contract_version": "1.0.0", "vajra_subject": "x", "action": "read",
        "resource": {"type": "evidence", "id": "EV-1"}, "purpose": "anonymous attempt"})
    ctx.expect("HTTP status", 401, r.status_code)


@check(id="V-01", title="VAJRA privileged state-changing routes reject unauthenticated callers (local node)",
       scenario="S1 Unauthorized access", refs=["EOD scenario: Unauthorized access", "EOD VAJRA: no asset-protection claim without boundary proof"],
       systems=[VAJRA], evidence_level=OFFLINE)
def v_01(ctx: Context):
    probes = {
        "POST /api/admin/add-tokens": ("/api/admin/add-tokens", {"address": "cyber-p0-test-addr", "token": "BHX", "amount": 1}),
        "POST /api/v1/permission/grant": ("/api/v1/permission/grant",
                                          {"trace_id": ctx.new_trace(), "subject": "cyber-p0-test-subj", "requester": "attacker",
                                           "purpose": "unauthenticated grant attempt (synthetic)", "scope": "read", "ttl_seconds": 60}),
        "POST /api/cybercrime/freeze": ("/api/cybercrime/freeze", {"wallet_address": "cyber-p0-test-wallet", "admin_address": "attacker"}),
        "POST /api/cybercrime/unfreeze": ("/api/cybercrime/unfreeze", {"wallet_address": "cyber-p0-test-wallet", "admin_address": "attacker"}),
        "POST /api/admin/submit-transaction": ("/api/admin/submit-transaction",
                                               {"from": "cyber-p0-test-a", "to": "cyber-p0-test-b", "token": "BHX", "amount": 1}),
        "POST /api/v1/permission/revoke": ("/api/v1/permission/revoke",
                                           {"permission_id": "perm-cyber-p0-test", "trace_id": ctx.new_trace(), "reason": "unauthenticated revoke attempt (synthetic)"}),
        "POST /api/v1/permission/check": ("/api/v1/permission/check",
                                          {"trace_id": ctx.new_trace(), "subject": "cyber-p0-test-subj", "requester": "attacker", "scope": "read"}),
    }
    any_open = False
    for label, (path, body) in probes.items():
        resp = vajra(ctx).post(path, json=body)
        code = resp.status_code
        if 200 <= code < 300:
            any_open = True
            try:
                reply = json.dumps(resp.json(), separators=(",", ":"))
            except ValueError:
                reply = resp.text
            # The handler ran without credentials; the reply says whether it also changed state.
            ctx.expect(f"{label} without credentials is refused", "401 or 403", f"{code}, handler ran; reply: {reply[:160]}", ok=False)
        elif code in (401, 403):
            ctx.expect(f"{label} without credentials is refused", "401 or 403", code, ok=True)
        else:
            ctx.expect(f"{label} answered with an authentication refusal", "401 or 403", f"{code} (inconclusive)", ok=False)
    if any_open:
        ctx.defect("VAJ-06")


@check(id="V-02", title="VAJRA permission ids are unique per grant (local node)",
       scenario="S2 Revoked permission", refs=["EOD scenario: Revoked permission"], systems=[VAJRA], evidence_level=OFFLINE)
def v_02(ctx: Context):
    subject = "cyber-p0-test-long-subject-" + uuid.uuid4().hex[:6]  # 18+ characters
    grants = {}
    # Since VAJRA 3cc883f these routes need a token (VAJ-06 fix): the governance token plays the consent service here.
    for requester, scope in (("app-alpha", "read"), ("app-beta", "write")):
        r = vajra(ctx).post("/api/v1/permission/grant", headers=vajra_auth(ctx), json={
            "trace_id": ctx.new_trace(), "subject": subject, "requester": requester,
            "purpose": "P0 verification (synthetic)", "scope": scope, "ttl_seconds": 600})
        ctx.require(f"grant for {requester} created", True, r.status_code in (200, 201), ok=r.status_code in (200, 201))
        grants[requester] = (scope, r.json().get("permission_id"))
    ids = [pid for _, pid in grants.values()]
    ctx.expect("two different grants get two different permission ids", True, ids[0] != ids[1])
    rv = vajra(ctx).post("/api/v1/permission/revoke", headers=vajra_auth(ctx),
                         json={"permission_id": grants["app-beta"][1], "trace_id": ctx.new_trace(),
                               "reason": "revoke beta only (synthetic)"})
    ctx.note(f"permission ids: {ids}; revoke(beta) -> HTTP {rv.status_code}")

    def allowed(requester):
        scope = grants[requester][0]
        c = vajra(ctx).post("/api/v1/permission/check", headers=vajra_auth(ctx),
                            json={"trace_id": ctx.new_trace(), "subject": subject, "requester": requester, "scope": scope})
        return (c.json() or {}).get("allowed")

    ctx.expect("revoked grant (beta) is denied", False, allowed("app-beta"))
    ctx.expect("untouched grant (alpha) is still allowed", True, allowed("app-alpha"))
    if ids[0] == ids[1]:
        ctx.defect("VAJ-07")


@check(id="V-03", title="VAJRA evidence-only token (VAJRA_CYBER_SECRET): accepted for evidence, refused for governance and admin routes (local node)",
       scenario="S1 Unauthorized access",
       refs=["VAJRA reply 05 Nov 2026 (evidence-only tier)", "Task1 non-goal: no absorbing VAJRA authority", "Principle: least privilege"],
       systems=[VAJRA], evidence_level=OFFLINE)
def v_03(ctx: Context):
    trace = ctx.new_trace()
    ev = vajra(ctx).post("/api/vajra/evidence/record", headers=vajra_auth(ctx, "cyber"), json={
        "trace_id": trace, "source": "CYBERSECURITY_AUTHENTICATION", "threat_type": "ACCESS_DECISION",
        "severity": "UNASSESSED", "action_taken": "DENY", "actor": new_subject("evidence-only"), "details": "synthetic",
        "evidence_hex": hashlib.sha256(trace.encode()).hexdigest(), "metadata": {}})
    stored = ev.status_code == 200 and (ev.json() or {}).get("success") is True
    ctx.expect("evidence/record with the evidence-only token is stored", "200, success=true",
               f"{ev.status_code}: {reply_text(ev)}", ok=stored)
    if not stored:
        ctx.defect("VAJ-10")
    subject = new_subject("cyber-token-governance")
    ctx.expect("authority/transition with the evidence-only token is refused", 403,
               transition(ctx, subject, "GRANT", "EVIDENCE_ONLY_TOKEN_ATTEMPT (synthetic)", bearer="cyber").status_code)
    mint = vajra(ctx).post("/api/admin/add-tokens", headers=vajra_auth(ctx, "cyber"),
                           json={"address": "cyber-p0-test-addr", "token": "BHX", "amount": 1})
    ctx.expect("admin/add-tokens with the evidence-only token is refused", 403, mint.status_code)

    reached = []
    g = vajra(ctx).post("/api/v1/permission/grant", headers=vajra_auth(ctx, "cyber"), json={
        "trace_id": ctx.new_trace(), "subject": subject, "requester": "cyber-p0-test-requester",
        "purpose": "evidence-only token grant attempt (synthetic)", "scope": "read", "ttl_seconds": 60})
    target = vajra(ctx).post("/api/v1/permission/grant", headers=vajra_auth(ctx), json={
        "trace_id": ctx.new_trace(), "subject": new_subject("governance-grant"), "requester": "cyber-p0-test-requester",
        "purpose": "grant made with the governance token (synthetic)", "scope": "read", "ttl_seconds": 60})
    rv = vajra(ctx).post("/api/v1/permission/revoke", headers=vajra_auth(ctx, "cyber"), json={
        "permission_id": (target.json() or {}).get("permission_id"), "trace_id": ctx.new_trace(),
        "reason": "evidence-only token revoke attempt (synthetic)"})
    # A malformed body: if the auth layer lets the token through, the handler answers; no transaction is created.
    tx = vajra(ctx).post("/api/admin/submit-transaction", headers={**vajra_auth(ctx, "cyber"), "Content-Type": "application/json"},
                         content=b"not-json")
    for label, resp in (("permission/grant", g), ("permission/revoke", rv), ("admin/submit-transaction", tx)):
        refused = resp.status_code in (401, 403)
        ctx.expect(f"{label} with the evidence-only token is refused", "401 or 403",
                   resp.status_code if refused else f"{resp.status_code}, handler ran: {reply_text(resp)}", ok=refused)
        if not refused:
            reached.append(label)
    if reached:
        ctx.defect("VAJ-11")
    fr = vajra(ctx).post("/api/cybercrime/freeze", headers=vajra_auth(ctx, "cyber"),
                         json={"wallet_address": "cyber-p0-test-wallet-cyber-token", "admin_address": "cyber-p0-test-admin"})
    uf = vajra(ctx).post("/api/cybercrime/unfreeze", headers=vajra_auth(ctx, "cyber"),
                         json={"wallet_address": "cyber-p0-test-wallet-cyber-token", "admin_address": "cyber-p0-test-admin"})
    ctx.note(f"cybercrime freeze/unfreeze with the evidence-only token: HTTP {fr.status_code}/{uf.status_code} "
             "(VAJRA's reply says this tier may freeze/unfreeze; Cybersecurity never calls these routes)")


@check(id="V-04", title="VAJRA permission ids stay unique for subjects that share a prefix (same requester, scope and second; local node)",
       scenario="S2 Revoked permission", refs=["EOD scenario: Revoked permission", "VAJ-07 re-check 05 Nov 2026"],
       systems=[VAJRA], evidence_level=OFFLINE)
def v_04(ctx: Context):
    def grant(subject):
        r = vajra(ctx).post("/api/v1/permission/grant", headers=vajra_auth(ctx), json={
            "trace_id": ctx.new_trace(), "subject": subject, "requester": "app-alpha",
            "purpose": "P0 verification (synthetic)", "scope": "read", "ttl_seconds": 600})
        return r.json() if r.status_code in (200, 201) else {}

    pair = None
    for _ in range(8):  # both grants must land in the same second (VAJRA's id uses a seconds timestamp)
        frac = time.time() % 1
        if frac > 0.5:
            time.sleep(1.05 - frac)
        a, b = new_subject("collide-a"), new_subject("collide-b")  # same first 12 characters
        ga, gb = grant(a), grant(b)
        if ga.get("record", {}).get("created_at") and ga["record"]["created_at"] == gb.get("record", {}).get("created_at"):
            pair = (a, b, ga.get("permission_id"), gb.get("permission_id"))
            break
    ctx.require("two grants landed in the same second", True, pair is not None, ok=pair is not None)
    a, b, id_a, id_b = pair
    ctx.expect("the two grants get different permission ids", "different", f"{id_a} / {id_b}", ok=id_a != id_b)

    def allowed(subject):
        c = vajra(ctx).post("/api/v1/permission/check", headers=vajra_auth(ctx), json={
            "trace_id": ctx.new_trace(), "subject": subject, "requester": "app-alpha", "scope": "read"})
        return (c.json() or {}).get("allowed")

    vajra(ctx).post("/api/v1/permission/revoke", headers=vajra_auth(ctx), json={
        "permission_id": id_a, "trace_id": ctx.new_trace(), "reason": "revoke subject A only (synthetic)"})
    after_a, after_b = allowed(a), allowed(b)
    ctx.expect("revoking subject A's permission id denies subject A", False, after_a)
    ctx.expect("revoking subject A's permission id leaves subject B allowed", True, after_b)
    if id_a == id_b or after_a is not False or after_b is not True:
        ctx.defect("VAJ-07")


@check(id="V-05", title="VAJRA verify reports the granted scope and authority; a later transition does not change the granted scope (local node)",
       scenario="S1 Unauthorized access", refs=["VAJRA reply 05 Nov 2026 (scope in verify)", "CYB-13", "Principle: least privilege"],
       systems=[CYBER, VAJRA], evidence_level=SIM_USER)
def v_05(ctx: Context):
    subject = new_subject("scope-visible")
    grant_use(ctx, subject)
    view = verify_view(ctx, subject)
    posted = vajra(ctx).post("/api/vajra/authority/verify", json={"subject": subject})
    ctx.expect("verify (GET) reports the granted scope", list(DEFAULT_SCOPE), view.get("scope"))
    ctx.expect("verify (GET) reports the issuing authority", "AUTH_ROLE_CLIENT", view.get("authority"))
    ctx.expect("verify (POST) reports the same scope", view.get("scope"), (posted.json() or {}).get("scope"))

    cleared, widened = new_subject("scope-cleared"), new_subject("scope-widened")
    for subj, use_scope in ((cleared, ()), (widened, DEFAULT_SCOPE + ("delete:evidence",))):
        ctx.require(f"GRANT {list(DEFAULT_SCOPE)} accepted", 200, transition(ctx, subj, "GRANT", SIM_ISSUER_USER).status_code)
        ctx.require(f"USE with scope {list(use_scope)} accepted", 200,
                    transition(ctx, subj, "USE", SIM_ISSUER_USER, scope=use_scope).status_code)
    got_cleared, got_widened = verify_view(ctx, cleared).get("scope"), verify_view(ctx, widened).get("scope")
    ctx.expect("a USE sent without scope keeps the scope granted at GRANT", list(DEFAULT_SCOPE), got_cleared)
    ctx.expect("a USE sent with a wider scope does not widen the grant", list(DEFAULT_SCOPE), got_widened)
    if got_cleared != list(DEFAULT_SCOPE) or got_widened != list(DEFAULT_SCOPE):
        ctx.defect("VAJ-12")
    token = token_of(ctx, "investigator_a")
    after_clear = protected(ctx, token, cleared)[0].json()
    after_widen = protected(ctx, token, widened, action="delete")[0].json()
    ctx.note(f"Cybersecurity follows the scope VAJRA reports: read:evidence for the cleared subject -> "
             f"{after_clear.get('decision')} ({after_clear.get('reason_code')}); delete:evidence for the widened subject -> "
             f"{after_widen.get('decision')} ({after_widen.get('reason_code')})")


# ------------------------------------------------------------------------------------------- Proof A

@check(id="P-A", title="Proof A NORMAL: identity -> consent -> authorised access -> evidence",
       scenario="Mandatory proof A (10-day)", refs=["10-day 20.A", "Task1 M Vajra boundary path"],
       systems=[CYBER, VAJRA], evidence_level=SIM_USER)
def proof_a(ctx: Context):
    tantra_level(ctx)
    inv = ctx.data["users"]["investigator_a"]
    me = cyber(ctx).get("/api/v1/auth/me", headers=auth(inv["token"], ctx.new_trace()))
    ctx.expect("identity: authenticated investigator", 200, me.status_code)
    subject = new_subject("consenting-user")
    grant_use(ctx, subject)
    r, trace = protected(ctx, inv["token"], subject)
    body = r.json()
    ctx.expect("decision", "ALLOW", body.get("decision"))
    ctx.expect("VAJRA state seen by Cybersecurity", "USE", body.get("vajra", {}).get("current_state"))
    ctx.expect("the action was checked against the scope VAJRA reports (read:evidence)", True,
               body.get("vajra", {}).get("scope_checked"))
    ctx.expect("local audit event recorded", True, bool(body.get("evidence", {}).get("local_audit_event_id")))
    ctx.expect("VAJRA evidence recorded", "RECORDED", body.get("evidence", {}).get("vajra", {}).get("status"))
    tantra = body.get("evidence", {}).get("tantra", {})
    if live_tantra(ctx):
        ctx.expect("TANTRA reached and answered for this decision", "one of " + "/".join(TANTRA_REACHED),
                   tantra.get("status"), ok=tantra.get("status") in TANTRA_REACHED)
    ctx.note(f"TANTRA evidence status: {tantra.get('status')} ({tantra.get('detail')}); "
             f"evidence.complete={body.get('evidence', {}).get('complete')}, gaps={body.get('evidence', {}).get('gaps')}")


# ------------------------------------------------------------------------------------------- S2 revocation / Proof B

@check(id="S2-01", title="Proof B REVOCATION: active permission -> VAJRA revoke -> next request denied -> stale grant cannot return",
       scenario="S2 Revoked permission", refs=["EOD scenario: Revoked permission", "10-day 20.B"],
       systems=[CYBER, VAJRA], evidence_level=SIM_USER)
def s2_01(ctx: Context):
    token = token_of(ctx, "investigator_a")
    subject = new_subject("revocable-user")
    grant_use(ctx, subject)
    r, _ = protected(ctx, token, subject)
    ctx.require("before revoke: decision", "ALLOW", r.json().get("decision"))
    ctx.expect("VAJRA revoke accepted", 200, transition(ctx, subject, "REVOKE", SIM_ISSUER_USER).status_code)
    r, trace = protected(ctx, token, subject)
    body = r.json()
    ctx.expect("after revoke: decision", "DENY", body.get("decision"))
    ctx.expect("after revoke: VAJRA state", "REVOKE", body.get("vajra", {}).get("current_state"))
    ctx.expect("after revoke: evidence recorded at VAJRA", "RECORDED", body.get("evidence", {}).get("vajra", {}).get("status"))
    ctx.expect("illegal REVOKE -> USE rejected by VAJRA", 403, transition(ctx, subject, "USE", "STALE_GRANT_REPLAY (synthetic)").status_code)
    r, _ = protected(ctx, token, subject)
    ctx.expect("stale grant does not persist: still denied", "DENY", r.json().get("decision"))


@check(id="S2-02", title="Revoked session token (JTI) is rejected on the next request", scenario="S2 Revoked permission",
       refs=["EOD scenario: Revoked permission", "10-day Kaushlendra revocation path"], systems=[CYBER],
       evidence_level=OFFLINE)
def s2_02(ctx: Context):
    b = ctx.data["users"]["investigator_b"]
    ctx.require("token works before revocation", 200,
                cyber(ctx).get("/api/v1/auth/me", headers=auth(b["token"], ctx.new_trace())).status_code)
    sa = ctx.data["users"]["superadmin"]
    rv = cyber(ctx).post("/api/v1/access/revoke", headers=auth(sa["token"], ctx.new_trace()), json={
        "contract_version": "1.0.0", "revocation_type": "token_invalidation", "target": {"jti": jwt_claims(b["token"])["jti"]},
        "reason": "session revoked by P0 verification (synthetic)", "requested_by": f"cc_usr_{sa['id']}"})
    ctx.expect("revocation accepted", 200, rv.status_code)
    ctx.expect("revocation status", "REVOKED", rv.json().get("status"))
    r = cyber(ctx).get("/api/v1/auth/me", headers=auth(b["token"], ctx.new_trace()))
    ctx.expect("next request with revoked token", 401, r.status_code)
    ctx.expect("error code", "INVALID_CREDENTIALS", r.json().get("code"))


@check(id="S2-03", title="Deactivated account is rejected on the next request", scenario="S2 Revoked permission",
       refs=["EOD scenario: Revoked permission"], systems=[CYBER], evidence_level=OFFLINE)
def s2_03(ctx: Context):
    c = ctx.data["users"]["investigator_c"]
    ctx.require("account works before deactivation", 200,
                cyber(ctx).get("/api/v1/auth/me", headers=auth(c["token"], ctx.new_trace())).status_code)
    sa = ctx.data["users"]["superadmin"]
    rv = cyber(ctx).post("/api/v1/access/revoke", headers=auth(sa["token"], ctx.new_trace()), json={
        "contract_version": "1.0.0", "revocation_type": "user_deactivation", "target": {"actor_id": f"cc_usr_{c['id']}"},
        "reason": "account deactivated by P0 verification (synthetic)", "requested_by": f"cc_usr_{sa['id']}"})
    ctx.expect("deactivation status", "REVOKED", rv.json().get("status"))
    trace = ctx.new_trace()
    r = cyber(ctx).get("/api/v1/auth/me", headers=auth(c["token"], trace))
    ctx.expect("next request", 403, r.status_code)
    ctx.expect("error code", "ACCOUNT_DEACTIVATED", r.json().get("code"))
    ctx.expect("trace id carried in denial", trace, r.json().get("trace_id"))


@check(id="S2-04", title="Tier-1 permission revocation takes effect on the next request", scenario="S2 Revoked permission",
       refs=["EOD scenario: Revoked permission (stale grants do not persist)"], systems=[CYBER], evidence_level=OFFLINE)
def s2_04(ctx: Context):
    # Runs last: if Tier-1 revocation ever works, it removes investigator 'read' for the rest of the run.
    sa = ctx.data["users"]["superadmin"]
    inv = ctx.data["users"]["investigator_a"]
    rv = cyber(ctx).post("/api/v1/access/revoke", headers=auth(sa["token"], ctx.new_trace()), json={
        "contract_version": "1.0.0", "revocation_type": "permission_revocation",
        "target": {"role": "investigator", "action": "read"},
        "reason": "revoke investigator read (P0 verification, synthetic)", "requested_by": f"cc_usr_{sa['id']}"})
    ctx.expect("revocation reported", "REVOKED", rv.json().get("status"))
    r = cyber(ctx).get("/api/v1/cases/", headers=auth(inv["token"], ctx.new_trace()))
    az = cyber(ctx).post("/api/v1/authz/check", headers=auth(inv["token"], ctx.new_trace()), json={
        "contract_version": "1.0.0", "subject": {"actor_id": f"cc_usr_{inv['id']}", "role": "investigator"},
        "action": "read", "resource": {"type": "evidence", "id": "EV-1"}})
    ctx.expect("investigator read after 'read' was revoked", "403 (denied)", r.status_code, ok=r.status_code == 403)
    ctx.expect("authz decision for investigator read after revocation", "DENY", az.json().get("decision"))
    if r.status_code != 403 or az.json().get("decision") != "DENY":
        ctx.defect("CYB-02")


# ------------------------------------------------------------------------------------------- S3 low confidence

@check(id="S3-01", title="Ambiguous signal: uncertainty is visible in the intelligence output", scenario="S3 Ambiguous / low confidence",
       refs=["EOD scenario: Ambiguous / low confidence", "EOD Shivam: expose confidence and uncertainty"], systems=[CYBER],
       evidence_level=OFFLINE)
def s3_01(ctx: Context):
    inv = ctx.data["users"]["investigator_a"]
    r = cyber(ctx).post("/api/v1/incidents/analyze", headers=auth(inv["token"], ctx.new_trace()), json={
        "wallet_address": "0xAMBIGUOUS" + uuid.uuid4().hex[:12],
        "description": "unclear activity, possibly unusual, not sure (synthetic)", "investigator_id": inv["id"]})
    ctx.require("analysis returned", 200, r.status_code)
    body = r.json()
    fields = set(body.keys())
    has_conf = bool(fields & {"confidence", "confidence_score", "uncertainty", "confidence_level"})
    ctx.note(f"output fields: {sorted(fields)}; risk_score={body.get('risk_score')}, risk_level={body.get('risk_level')}; "
             f"system_conclusion={str(body.get('system_conclusion'))[:160]!r}")
    ctx.expect("structured confidence/uncertainty field present", True, has_conf)
    if not has_conf:
        ctx.defect("CYB-03")


@check(id="S3-02", title="Ambiguous signal: no autonomous high-impact action recorded", scenario="S3 Ambiguous / low confidence",
       refs=["EOD scenario: Ambiguous / low confidence", "10-day rule 8 no silent authority"], systems=[CYBER],
       evidence_level=OFFLINE)
def s3_02(ctx: Context):
    inv = ctx.data["users"]["investigator_a"]
    risky = lambda rows: [r for r in rows if any(w in r["action"] for w in ("freeze", "revoke", "deactivat", "terminate"))]
    count_before = len(risky(audit_rows(ctx, limit=1000)))
    r = cyber(ctx).post("/api/v1/incidents/analyze", headers=auth(inv["token"], ctx.new_trace()), json={
        "wallet_address": "0xAMBIGUOUS" + uuid.uuid4().hex[:12],
        "description": "maybe suspicious maybe not (synthetic)", "investigator_id": inv["id"]})
    ctx.require("analysis returned", 200, r.status_code)
    ctx.expect("no freeze/revoke/deactivate/terminate action recorded by the analysis", count_before,
               len(risky(audit_rows(ctx, limit=1000))))
    ctx.expect("response does not claim an executed action", False,
               any(k in r.json() for k in ("action_taken", "frozen", "enforced")))
    ctx.note("heuristic check: based on the audit store and the response fields (absence of recorded actions)")


@check(id="S3-03", title="Analysis of a wallet with no recorded history does not present generated transactions as evidence",
       scenario="S3 Ambiguous / low confidence",
       refs=["EOD scenario: Ambiguous / low confidence", "EOD Shivam: separate observed facts from inference",
             "Task1 C security intelligence"], systems=[CYBER], evidence_level=OFFLINE)
def s3_03(ctx: Context):
    inv = ctx.data["users"]["investigator_a"]
    wallet = "0xNOHISTORY" + uuid.uuid4().hex[:12]  # never seen by the system: no real transactions exist
    r = cyber(ctx).post("/api/v1/incidents/analyze", headers=auth(inv["token"], ctx.new_trace()), json={
        "wallet_address": wallet, "description": "routine check of an unknown wallet (synthetic)",
        "investigator_id": inv["id"]})
    ctx.require("analysis returned", 200, r.status_code)
    body = r.json()
    txns = body.get("transactions") or []
    labelled = all(isinstance(t, dict) and (t.get("synthetic") or t.get("simulated")) for t in txns) if txns else True
    ctx.note(f"returned {len(txns)} transactions, patterns={body.get('detected_patterns')}, risk={body.get('risk_level')}; "
             f"conclusion={str(body.get('system_conclusion'))[:140]!r}")
    ctx.expect("no unlabelled transactions are reported for a wallet with no history",
               "0 transactions, or every transaction labelled synthetic",
               f"{len(txns)} transactions, labelled synthetic: {labelled}", ok=(not txns) or labelled)
    ctx.expect("no fraud pattern asserted without observed data", [], body.get("detected_patterns") if not labelled else [],
               ok=labelled or not body.get("detected_patterns"))
    if txns and not labelled:
        ctx.defect("CYB-06")


# ------------------------------------------------------------------------------------------- S4 duplicates

@check(id="S4-01", title="Duplicate signal (same idempotency key, same request) is answered once; nothing re-executed",
       scenario="S4 Duplicate event", refs=["EOD scenario: Duplicate event"], systems=[CYBER, VAJRA], evidence_level=SIM_USER)
def s4_01(ctx: Context):
    token = token_of(ctx, "investigator_a")
    subject = new_subject("dup")
    grant_use(ctx, subject)
    key = "idem-" + uuid.uuid4().hex
    n_before = len(vajra_records(ctx))
    a = protected(ctx, token, subject, key=key)[0].json()
    second, t2 = protected(ctx, token, subject, key=key)
    b = second.json()
    ctx.expect("first is not a duplicate", False, a.get("duplicate"))
    ctx.expect("second is flagged duplicate", True, b.get("duplicate"))
    ctx.expect("same decision id (no second decision)", a.get("decision_id"), b.get("decision_id"))
    ctx.expect("same audit event", a.get("evidence", {}).get("local_audit_event_id"),
               b.get("evidence", {}).get("local_audit_event_id"))
    ctx.expect("exactly one new VAJRA evidence record", n_before + 1, len(vajra_records(ctx)))
    second_rows = [r for r in audit_for_trace(ctx, t2) if r["action"].startswith("protected_access.decision")]
    ctx.expect("no audit decision written for the duplicate", 0, len(second_rows))


@check(id="S4-02", title="VAJRA refuses a second evidence record for the same trace", scenario="S4 Duplicate event",
       refs=["EOD scenario: Duplicate event"], systems=[VAJRA], evidence_level=OFFLINE)
def s4_02(ctx: Context):
    trace = ctx.new_trace()
    headers = {"Authorization": f"Bearer {ctx.data['vajra_secret']}", "X-Trace-Id": trace}
    body = {"trace_id": trace, "source": "VERIFICATION_HARNESS", "action_taken": "DENY", "details": "synthetic"}
    r1 = vajra(ctx).post("/api/vajra/evidence/record", json=body, headers=headers)
    r2 = vajra(ctx).post("/api/vajra/evidence/record", json=body, headers=headers)
    ctx.expect("first write", 200, r1.status_code)
    ctx.expect("duplicate write", 409, r2.status_code)
    ctx.expect("duplicate flagged", True, r2.json().get("duplicate"))
    ctx.expect("only one row for the trace", 1, len([x for x in vajra_records(ctx) if x.get("trace_id") == trace]))


@check(id="S4-03", title="Repeating a deactivation does not repeat the privileged action", scenario="S4 Duplicate event",
       refs=["EOD scenario: Duplicate event"], systems=[CYBER], evidence_level=OFFLINE)
def s4_03(ctx: Context):
    sa = ctx.data["users"]["superadmin"]
    d = ctx.data["users"]["investigator_d"]
    statuses = []
    for _ in range(2):
        rv = cyber(ctx).post("/api/v1/access/revoke", headers=auth(sa["token"], ctx.new_trace()), json={
            "contract_version": "1.0.0", "revocation_type": "user_deactivation", "target": {"actor_id": f"cc_usr_{d['id']}"},
            "reason": "deactivation repeated on purpose (P0 verification, synthetic)", "requested_by": f"cc_usr_{sa['id']}"})
        statuses.append(rv.json().get("status"))
    ctx.expect("first deactivation, then the repeat is recognised", ["REVOKED", "ALREADY_INACTIVE"], statuses)


@check(id="S4-04", title="Same idempotency key with a different request is refused", scenario="S4 Duplicate event",
       refs=["EOD scenario: Duplicate event"], systems=[CYBER, VAJRA], evidence_level=SIM_USER)
def s4_04(ctx: Context):
    token = token_of(ctx, "investigator_a")
    subject = new_subject("key-owner")
    grant_use(ctx, subject)
    key = "idem-" + uuid.uuid4().hex
    n_before = len(vajra_records(ctx))
    first = protected(ctx, token, subject, key=key)[0]
    other = protected(ctx, token, new_subject("other"), key=key, action="delete")[0]
    ctx.expect("first request decided", 200, first.status_code)
    ctx.expect("different request under the same key", 409, other.status_code)
    ctx.expect("error code", "IDEMPOTENCY_KEY_CONFLICT", other.json().get("code"))
    ctx.expect("nothing re-executed (one VAJRA record)", n_before + 1, len(vajra_records(ctx)))


@check(id="S4-05", title="A repeated key cannot bring back an ALLOW after VAJRA revoked the subject", scenario="S4 Duplicate event",
       refs=["EOD scenario: Duplicate event", "EOD scenario: Revoked permission (stale grants do not persist)"],
       systems=[CYBER, VAJRA], evidence_level=SIM_USER)
def s4_05(ctx: Context):
    token = token_of(ctx, "investigator_a")
    subject = new_subject("replay-after-revoke")
    grant_use(ctx, subject)
    key = "idem-" + uuid.uuid4().hex
    ctx.require("first decision", "ALLOW", protected(ctx, token, subject, key=key)[0].json().get("decision"))
    ctx.require("VAJRA revoke accepted", 200, transition(ctx, subject, "REVOKE", SIM_ISSUER_USER).status_code)
    again = protected(ctx, token, subject, key=key)[0]
    ctx.expect("replay refused", 409, again.status_code)
    ctx.expect("error code", "STALE_DECISION", again.json().get("code"))
    ctx.expect("no ALLOW returned", False, again.json().get("decision") == "ALLOW")


# ------------------------------------------------------------------------------------------- S5 TANTRA

@check(id="S5-01", title="TANTRA contract gate rejects the unregistered security event; no bypass; gap visible",
       scenario="S5 TANTRA denial / outage", refs=["EOD scenario: TANTRA denial", "Task1 E contract/error handling"],
       systems=[CYBER, VAJRA, TANTRA],
       evidence_level="LIVE-VERIFIED (TANTRA contract gate) + OFFLINE-VERIFIED (cyber, local VAJRA); VAJRA consent SIMULATED")
def s5_01(ctx: Context):
    if not live_tantra(ctx):
        raise Skipped("needs --tantra live")
    token = token_of(ctx, "investigator_a")
    subject = new_subject("tantra-gate")
    grant_use(ctx, subject)
    r, trace = protected(ctx, token, subject)
    body = r.json()
    tantra = body.get("evidence", {}).get("tantra", {})
    ctx.expect("decision still made by Cybersecurity + VAJRA", "ALLOW", body.get("decision"))
    ctx.expect("TANTRA status", "CONTRACT_REJECTED", tantra.get("status"))
    ctx.expect("TANTRA reason", "event_type_not_registered", tantra.get("data", {}).get("reason"))
    ctx.expect("gap listed", True, "tantra" in body.get("evidence", {}).get("gaps", []))
    ctx.expect("evidence not claimed complete", False, body.get("evidence", {}).get("complete"))
    ctx.note(f"TANTRA registered event types reported by the live gate: {tantra.get('data', {}).get('registered_event_types')}")
    lookup = ctx.data["tantra_prana"].get(f"/replay/{trace}", params={"include_payload": "false"})
    ctx.expect("nothing stored by TANTRA for the rejected event (PRANA replay lookup)", 404, lookup.status_code)


@check(id="S5-02", title="TANTRA unreachable: decision still made by Cybersecurity + VAJRA, TANTRA gap reported and visible in health",
       scenario="S5 TANTRA denial / outage", refs=["EOD scenario: TANTRA outage"], systems=[CYBER, VAJRA],
       evidence_level=SIM_USER + "; induced outage (closed port)")
def s5_02(ctx: Context):
    from harness.services import free_port
    dead = f"http://127.0.0.1:{free_port()}"
    restart_cyber(ctx, {"TANTRA_VALIDATION_URL": dead, "TANTRA_KARMA_URL": dead, "TANTRA_PRANA_URL": dead})
    try:
        token = token_of(ctx, "investigator_a")
        subject = new_subject("tantra-down")
        grant_use(ctx, subject)
        body = protected(ctx, token, subject)[0].json()
        ctx.expect("decision unaffected by the TANTRA outage", "ALLOW", body.get("decision"))
        ctx.expect("TANTRA status", "UNAVAILABLE", body.get("evidence", {}).get("tantra", {}).get("status"))
        ctx.expect("gap listed", True, "tantra" in body.get("evidence", {}).get("gaps", []))
        ctx.expect("evidence not claimed complete", False, body.get("evidence", {}).get("complete"))
        ctx.expect("superadmin health shows TANTRA unreachable", False,
                   admin_health(ctx).get("bhiv_runtime", {}).get("tantra", {}).get("validation", {}).get("reachable"))
    finally:
        restart_cyber(ctx)


@check(id="S5-03", title="No bypass executor: Cybersecurity exposes no route that changes VAJRA authority",
       scenario="S5 TANTRA denial / outage", refs=["EOD: no bypass executor", "Task1 non-goal: no absorbed authority"],
       systems=[CYBER], evidence_level=CODE)
def s5_03(ctx: Context):
    root = ctx.data["repo_root"]
    spec = (root / "cybercrime" / "openapi.yaml").read_text(encoding="utf-8")
    ctx.expect("published API has no authority-transition route", False, "transition" in spec.lower())
    code_hits = []
    for path in (root / "cybercrime" / "backend" / "app").rglob("*.py"):
        text = path.read_text(encoding="utf-8")
        if '"/api/vajra/authority/transition"' in text or "'/api/vajra/authority/transition'" in text:
            code_hits.append(str(path.relative_to(root)))
    ctx.expect("no code calls VAJRA /authority/transition", [], code_hits)


@check(id="S5-04", title="TANTRA rejects a malformed envelope (live, validation endpoint)", scenario="S5 TANTRA denial / outage",
       refs=["EOD scenario: TANTRA denial", "Task1 E error handling"], systems=[TANTRA], evidence_level="LIVE-VERIFIED")
def s5_04(ctx: Context):
    if not live_tantra(ctx):
        raise Skipped("needs --tantra live")
    trace = ctx.new_trace("cyber-p0-test-")
    envelope = {"registry_reference": {"registry": "prana.event.contracts", "event_type": "integrity_probe", "version": "1.0.0"},
                "submission_id": trace, "event_type": "integrity_probe",
                "timestamp": "2026-11-04T00:00:00Z", "source_system": "cybersecurity"}  # payload missing on purpose
    r = ctx.data["tantra_validation"].post("/validate/prana/ingress", json=envelope, headers={"X-Trace-Id": trace})
    ctx.expect("HTTP status", 422, r.status_code)
    ctx.expect("TANTRA verdict", "rejected", (r.json() or {}).get("status"))


@check(id="S5-05", title="A slow TANTRA peer does not stall the rest of the API", scenario="S5 TANTRA denial / outage",
       refs=["EOD scenario: TANTRA outage (failure observable, fails safely)"], systems=[CYBER, VAJRA],
       evidence_level=SIM_USER + "; induced slow peer (socket that never answers)")
def s5_05(ctx: Context):
    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.bind(("127.0.0.1", 0))
    server.listen(16)
    server.settimeout(0.3)
    held, stop = [], threading.Event()

    def hold_connections():
        while not stop.is_set():
            try:
                conn, _ = server.accept()
                held.append(conn)  # accept and never answer
            except socket.timeout:
                continue
            except OSError:
                break

    threading.Thread(target=hold_connections, daemon=True).start()
    slow = f"http://127.0.0.1:{server.getsockname()[1]}"
    restart_cyber(ctx, {"TANTRA_VALIDATION_URL": slow, "BHIV_RUNTIME_TIMEOUT_SECONDS": "4"})
    try:
        token = token_of(ctx, "investigator_a")
        subject = new_subject("slow-peer")
        grant_use(ctx, subject)
        outcome: Dict[str, Any] = {}

        def call():
            started = time.monotonic()
            r, _ = protected(ctx, token, subject)
            outcome.update(body=r.json(), seconds=round(time.monotonic() - started, 2))

        worker = threading.Thread(target=call)
        worker.start()
        time.sleep(0.8)
        started = time.monotonic()
        health = cyber(ctx).get("/health")
        health_seconds = round(time.monotonic() - started, 2)
        worker.join(timeout=60)
        ctx.expect("/health answered while a protected request waits on the slow peer", "< 1.5 s",
                   f"{health_seconds} s (HTTP {health.status_code})", ok=health.status_code == 200 and health_seconds < 1.5)
        ctx.expect("slow TANTRA reported as UNAVAILABLE (timeout), not as recorded", "UNAVAILABLE",
                   outcome.get("body", {}).get("evidence", {}).get("tantra", {}).get("status"))
        ctx.note(f"protected request took {outcome.get('seconds')} s with a 4 s peer timeout")
    finally:
        stop.set()
        for conn in held:
            conn.close()
        server.close()
        restart_cyber(ctx)


# ------------------------------------------------------------------------------------------- S6 evidence failure

@check(id="S6-01", title="VAJRA refuses the evidence write: no ALLOW without evidence; the gap is visible", scenario="S6 Evidence failure",
       refs=["EOD scenario: Evidence failure"], systems=[CYBER, VAJRA], evidence_level=SIM_USER)
def s6_01(ctx: Context):
    restart_cyber(ctx, {"VAJRA_TANTRA_SECRET": "wrong-token-" + uuid.uuid4().hex})
    try:
        token = token_of(ctx, "investigator_a")
        subject = new_subject("evidence-refused")
        grant_use(ctx, subject)
        r, trace = protected(ctx, token, subject)
        body = r.json()
        ctx.expect("decision", "DENY", body.get("decision"))
        ctx.expect("reason", "VAJRA_EVIDENCE_NOT_RECORDED", body.get("reason_code"))
        ctx.expect("VAJRA evidence status", "UNAUTHORIZED", body.get("evidence", {}).get("vajra", {}).get("status"))
        ctx.expect("gap listed", True, "vajra" in body.get("evidence", {}).get("gaps", []))
        ctx.expect("evidence not claimed complete", False, body.get("evidence", {}).get("complete"))
        events = [row["_details"] for row in audit_for_trace(ctx, trace) if row["action"].startswith("protected_access.decision")]
        final = next((e for e in events if e.get("event_id") == body.get("evidence", {}).get("local_audit_event_id")), {})
        expected_first = body.get("evidence", {}).get("superseded_audit_event_id")
        pointer = (final.get("metadata") or {}).get("supersedes_event_id")
        ctx.expect("audit keeps the tentative ALLOW and the superseding DENY that points to it", expected_first, pointer,
                   ok=len(events) == 2 and bool(expected_first) and expected_first == pointer)
    finally:
        restart_cyber(ctx)


@check(id="S6-02", title="VAJRA down: access fails closed and the outage is visible", scenario="S6 Evidence failure",
       refs=["EOD scenario: Evidence failure", "EOD scenario: Recovery failure"], systems=[CYBER, VAJRA],
       evidence_level=OFFLINE + "; induced outage (VAJRA process stopped)")
def s6_02(ctx: Context):
    node = ctx.data["services"]["vajra"]
    node.stop()
    try:
        body = protected(ctx, token_of(ctx, "investigator_a"), new_subject("vajra-down"))[0].json()
        ctx.expect("decision", "DENY", body.get("decision"))
        ctx.expect("reason", "VAJRA_UNAVAILABLE", body.get("reason_code"))
        ctx.expect("VAJRA evidence status", "UNAVAILABLE", body.get("evidence", {}).get("vajra", {}).get("status"))
        ctx.expect("superadmin health shows VAJRA unreachable", False,
                   admin_health(ctx).get("bhiv_runtime", {}).get("vajra", {}).get("api", {}).get("reachable"))
    finally:
        node.start()


@check(id="S6-03", title="Audit store cannot be written: no decision is released", scenario="S6 Evidence failure",
       refs=["EOD scenario: Evidence failure (no false proof of completion)"], systems=[CYBER, VAJRA],
       evidence_level=SIM_USER + "; induced fault (database file set read-only)")
def s6_03(ctx: Context):
    db_file = ctx.data["db_path"]
    subject = new_subject("audit-down")
    grant_use(ctx, subject)
    os.chmod(db_file, stat.S_IREAD)
    try:
        # Restart so every database connection is opened against the read-only file
        # (connections opened earlier keep their write handle on Windows).
        restart_cyber(ctx)
        r, trace = protected(ctx, token_of(ctx, "investigator_a"), subject)
        ctx.expect("HTTP status", 503, r.status_code)
        ctx.expect("error code", "EVIDENCE_PERSISTENCE_FAILED", r.json().get("code"))
        ctx.expect("no decision in the response", False, "decision" in r.json())
        ctx.expect("no VAJRA evidence row for the withheld decision", [], vajra_rows_for(ctx, trace))
    finally:
        os.chmod(db_file, stat.S_IREAD | stat.S_IWRITE)
        restart_cyber(ctx)


@check(id="S6-05", title="Least-privilege set-up: with only VAJRA's evidence-only token, Cybersecurity records evidence and allows in-scope access",
       scenario="S6 Evidence failure",
       refs=["VAJRA reply 05 Nov 2026 (evidence-only tier)", "Principle: least privilege", "Task1 non-goal: no absorbing VAJRA authority"],
       systems=[CYBER, VAJRA], evidence_level=SIM_USER)
def s6_05(ctx: Context):
    restart_cyber(ctx, {"VAJRA_CYBER_SECRET": ctx.data["vajra_cyber_secret"], "VAJRA_TANTRA_SECRET": ""})
    try:
        health = admin_health(ctx).get("bhiv_runtime", {}).get("vajra", {})
        ctx.expect("health: evidence writes use the evidence-only token", "cyber_evidence_only", health.get("write_credential"))
        ctx.expect("health: no governance-token warning", [], health.get("warnings"))
        subject = new_subject("least-privilege")
        grant_use(ctx, subject)
        body = protected(ctx, token_of(ctx, "investigator_a"), subject)[0].json()
        vajra_ev = body.get("evidence", {}).get("vajra", {})
        recorded = vajra_ev.get("status") == "RECORDED"
        ctx.expect("VAJRA records the evidence sent with the evidence-only token", "RECORDED",
                   f"{vajra_ev.get('status')} (HTTP {vajra_ev.get('http_status')}; {vajra_ev.get('detail')})", ok=recorded)
        ctx.expect("in-scope access is allowed", "ALLOW", body.get("decision"))
        ctx.expect("no access without evidence: if VAJRA refuses the write, the decision is DENY", True,
                   recorded or (body.get("decision") == "DENY" and body.get("reason_code") == "VAJRA_EVIDENCE_NOT_RECORDED"))
        if not recorded:
            ctx.defect("VAJ-10")
    finally:
        restart_cyber(ctx)


@check(id="S6-04", title="Evidence upload without Bucket does not claim anchoring", scenario="S6 Evidence failure",
       refs=["EOD scenario: Evidence failure"], systems=[CYBER], evidence_level=OFFLINE)
def s6_04(ctx: Context):
    inv = ctx.data["users"]["investigator_a"]
    files = {"file": ("synthetic-evidence.txt", b"synthetic evidence for P0 verification", "text/plain")}
    r = cyber(ctx).post("/api/v1/evidence/", headers=auth(inv["token"], ctx.new_trace()), files=files,
                        data={"wallet_id": "0xSYNTHETIC-WALLET", "title": "P0 synthetic evidence", "risk_level": "low"})
    ctx.require("upload accepted", 200, r.status_code)
    ctx.expect("anchor status is not claimed", "pending", r.json().get("anchor_status"))
    ctx.expect("upload reports the Bucket outcome (Bucket not configured in this run)", "not_configured",
               r.json().get("bucket_status"))
    if r.json().get("bucket_status") is None:
        ctx.defect("CYB-08")


# ------------------------------------------------------------------------------------------- Proof C attack

@check(id="P-C1", title="Proof C ATTACK (signal): repeated failed logins are denied and recorded as security events",
       scenario="Mandatory proof C (10-day)", refs=["10-day 20.C", "10-day 19 repeated failed login", "Task1 C security-event ingestion"],
       systems=[CYBER], evidence_level=OFFLINE)
def proof_c1(ctx: Context):
    victim = ctx.data["users"]["investigator_a"]
    statuses = [login(ctx, victim["email"], "wrong-password-attempt").status_code for _ in range(6)]
    ctx.expect("every failed attempt denied", [401] * 6, statuses)
    good = login(ctx, victim["email"], victim["password"])
    ctx.note(f"correct password after 6 failures: HTTP {good.status_code} (no lockout or step-up observed)")
    rows = audit_rows(ctx, limit=1000)
    failed_events = [r for r in rows if "login" in r["action"] and r["status"] in ("denied", "failure", "error", "warning")]
    ctx.expect("failed logins recorded as security events in the audit store", ">= 6", len(failed_events),
               ok=len(failed_events) >= 6)
    if len(failed_events) < 6:
        ctx.defect("CYB-04")
    unknown = login(ctx, f"nobody-{uuid.uuid4().hex[:6]}@bhiv-verification.example", "x").json().get("message")
    wrong = login(ctx, victim["email"], "x").json().get("message")
    ctx.expect("login error does not reveal whether the account exists", True, unknown == wrong)
    if unknown != wrong:
        ctx.defect("CYB-05")


@check(id="P-C2", title="Proof C ATTACK (intelligence): the failed logins are detected and correlated into one incident for review",
       scenario="Mandatory proof C (10-day)",
       refs=["10-day 20.C", "EOD Shivam threat assessment", "EOD Aryan correlation", "10-day rule 8 no silent authority"],
       systems=[CYBER], evidence_level=OFFLINE)
def proof_c2(ctx: Context):
    # Runs after P-C1, whose failed logins against investigator_a are the attack signal.
    victim = ctx.data["users"]["investigator_a"]
    target = f"cc_usr_{victim['id']}"
    r = cyber(ctx).get("/api/v1/threats/incidents", params={"status_filter": "open"},
                       headers=auth(token_of(ctx, "superadmin"), ctx.new_trace()))
    ctx.require("incident list readable by a superadmin", 200, r.status_code)
    mine = [i for i in r.json() if i.get("target_ref") == target and i.get("rule_id") == "auth.repeated_failed_login"]
    ctx.expect("one open incident correlates the failed logins on the attacked account", 1, len(mine))
    if not mine:
        return
    incident = mine[0]
    rows = audit_rows(ctx, limit=2000)
    failed = {row["_details"].get("event_id") for row in rows
              if row["action"] == "auth.login:login" and row["status"] == "denied"
              and (row["_details"].get("resource") or {}).get("resource_id") == target}
    linked = set(incident.get("evidence_event_ids") or []) & failed
    ctx.expect("incident links >= 5 failed-login security events found in the audit store", ">= 5", len(linked),
               ok=len(linked) >= 5)
    confidence = incident.get("confidence")
    ctx.expect("confidence stated (0-1)", True, isinstance(confidence, (int, float)) and 0 < confidence <= 1)
    ctx.expect("uncertainty stated", True, bool(incident.get("uncertainty")))
    ctx.expect("rule id and version recorded", True, bool(incident.get("rule_id") and incident.get("rule_version")))
    ctx.expect("left open for human review (no autonomous action)", ["open", True],
               [incident.get("status"), incident.get("requires_human_review")])
    detected = [row for row in rows if row["action"] == "threat.detected:escalate"
                and (row["_details"].get("metadata") or {}).get("incident_id") == incident.get("incident_id")]
    ctx.expect("one threat.detected security event for the incident", 1, len(detected))
    ctx.expect("observed facts kept apart from the inference", True,
               bool(incident.get("observed_facts")) and bool(incident.get("inference")))
    ctx.expect("evidence gaps and a proposed next action stated (no action taken)", True,
               bool(incident.get("evidence_gaps")) and "No automatic action" in str(incident.get("proposed_next_action")))
    envelope = incident.get("tantra_response_envelope") or {}
    ctx.expect("TANTRA-compatible response envelope prepared, marked not sent (no contract yet)", True,
               bool(envelope.get("registry_reference")) and str(incident.get("tantra_status", "")).startswith("NOT SENT"))
    ctx.expect("attacked account still usable (detection blocks no one)", 200,
               login(ctx, victim["email"], victim["password"]).status_code)
    ctx.note(f"incident {incident.get('incident_id')}: {incident.get('event_count')} events, severity "
             f"{incident.get('severity')}, confidence {confidence}; uncertainty: {incident.get('uncertainty')}")


@check(id="P-C3", title="Proof C ATTACK (containment): ISOLATE/TERMINATE at VAJRA blocks the actor",
       scenario="Mandatory proof C (10-day)", refs=["10-day 20.C", "Task1 M controlled downstream response"],
       systems=[CYBER, VAJRA], evidence_level=SIM_GOV)
def proof_c3(ctx: Context):
    token = token_of(ctx, "investigator_a")
    attacker = new_subject("compromised-actor")
    grant_use(ctx, attacker)
    ctx.require("before containment: allowed", "ALLOW", protected(ctx, token, attacker)[0].json().get("decision"))
    ctx.expect("ISOLATE (TANTRA governance simulated)", 200, transition(ctx, attacker, "ISOLATE", SIM_ISSUER_TANTRA).status_code)
    ctx.expect("isolated actor denied", "DENY", protected(ctx, token, attacker)[0].json().get("decision"))
    ctx.expect("TERMINATE (TANTRA governance simulated)", 200, transition(ctx, attacker, "TERMINATE", SIM_ISSUER_TANTRA).status_code)
    body = protected(ctx, token, attacker)[0].json()
    ctx.expect("terminated actor denied", "DENY", body.get("decision"))
    ctx.expect("VAJRA state", "TERMINATE", body.get("vajra", {}).get("current_state"))
    ctx.expect("containment decision evidenced at VAJRA", "RECORDED", body.get("evidence", {}).get("vajra", {}).get("status"))
    ctx.note("Cybersecurity did not execute the containment; the transitions were issued by the harness standing in for TANTRA.")


# ------------------------------------------------------------------------------------------- S7 recovery / Proof D

@check(id="S7-01", title="After a crash-restart of Cybersecurity, revoked sessions and accounts stay blocked",
       scenario="S7 Recovery failure", refs=["EOD scenario: Recovery failure", "10-day 20.D"], systems=[CYBER],
       evidence_level=OFFLINE + "; process killed and restarted")
def s7_01(ctx: Context):
    a = ctx.data["users"]["investigator_a"]
    e = ctx.data["users"]["investigator_e"]
    sa = ctx.data["users"]["superadmin"]
    fresh = login(ctx, a["email"], a["password"]).json()["access_token"]
    ctx.data["redactor"].add(fresh)
    ctx.require("fresh session revoked", 200, cyber(ctx).post("/api/v1/access/revoke", headers=auth(sa["token"], ctx.new_trace()), json={
        "contract_version": "1.0.0", "revocation_type": "token_invalidation", "target": {"jti": jwt_claims(fresh)["jti"]},
        "reason": "revoke before restart (P0 verification, synthetic)", "requested_by": f"cc_usr_{sa['id']}"}).status_code)
    ctx.require("account deactivated", 200, cyber(ctx).post("/api/v1/access/revoke", headers=auth(sa["token"], ctx.new_trace()), json={
        "contract_version": "1.0.0", "revocation_type": "user_deactivation", "target": {"actor_id": f"cc_usr_{e['id']}"},
        "reason": "deactivate before restart (P0 verification, synthetic)", "requested_by": f"cc_usr_{sa['id']}"}).status_code)
    ctx.note(f"cyber service healthy {restart_cyber(ctx)} s after a crash-restart")
    ctx.expect("revoked token still rejected", 401, cyber(ctx).get("/api/v1/auth/me", headers=auth(fresh, ctx.new_trace())).status_code)
    ctx.expect("deactivated account still rejected", 403,
               cyber(ctx).get("/api/v1/auth/me", headers=auth(e["token"], ctx.new_trace())).status_code)
    ctx.expect("unaffected session still works", 200,
               cyber(ctx).get("/api/v1/auth/me", headers=auth(a["token"], ctx.new_trace())).status_code)


@check(id="S7-02", title="Proof D (staged recovery): a contained actor stays restricted until the full recovery path completes",
       scenario="S7 Recovery failure", refs=["EOD scenario: Recovery failure", "10-day 20.D"], systems=[CYBER, VAJRA],
       evidence_level=SIM_GOV)
def s7_02(ctx: Context):
    token = token_of(ctx, "investigator_a")
    subject = new_subject("recovering-actor")
    grant_use(ctx, subject)
    for state in ("ISOLATE", "TERMINATE"):
        ctx.require(f"{state} accepted", 200, transition(ctx, subject, state, SIM_ISSUER_TANTRA).status_code)
    ctx.expect("TERMINATE -> USE shortcut rejected", 403, transition(ctx, subject, "USE", "SHORTCUT (synthetic)").status_code)
    for state in ("RECOVER", "REINSTATE"):
        ctx.require(f"{state} accepted", 200, transition(ctx, subject, state, SIM_ISSUER_TANTRA).status_code)
        ctx.expect(f"still restricted at {state}", "DENY", protected(ctx, token, subject)[0].json().get("decision"))
    ctx.require("GRANT accepted", 200, transition(ctx, subject, "GRANT", SIM_ISSUER_USER).status_code)
    ctx.expect("access returns only after re-GRANT", "ALLOW", protected(ctx, token, subject)[0].json().get("decision"))


@check(id="S7-03", title="After a VAJRA crash-restart, Cybersecurity follows VAJRA's reported state; evidence survives",
       scenario="S7 Recovery failure", refs=["EOD scenario: Recovery failure", "10-day Samsoorya restart and state recovery"],
       systems=[CYBER, VAJRA], evidence_level=SIM_USER + "; process killed and restarted")
def s7_03(ctx: Context):
    token = token_of(ctx, "investigator_a")
    subject = new_subject("survivor")
    grant_use(ctx, subject)
    rows_before = len(vajra_records(ctx))
    ctx.note(f"VAJRA node healthy {ctx.data['services']['vajra'].restart()} s after a crash-restart")
    ctx.expect("TruthStore evidence rows survive restart", rows_before, len(vajra_records(ctx)))
    ctx.expect("TruthStore chain intact after restart", True, (vajra(ctx).get("/api/tantra/chain-integrity").json() or {}).get("intact"))
    state = vajra(ctx).get("/api/vajra/authority/verify", params={"subject": subject}).json().get("current_state") or ""
    expected = "ALLOW" if state in ("GRANT", "USE") else "DENY"
    ctx.expect(f"decision follows VAJRA's state after restart (state '{state or 'none'}')", expected,
               protected(ctx, token, subject)[0].json().get("decision"))


@check(id="S7-04", title="Recovery anchor check rejects a corrupt candidate (inputs synthetic)", scenario="S7 Recovery failure",
       refs=["10-day 20.D", "10-day Prakash recovery verification path"], systems=[VAJRA],
       evidence_level="OFFLINE-VERIFIED; signatures are placeholders in VAJRA (SIMULATED)")
def s7_04(ctx: Context):
    pkg = vajra(ctx).get("/api/vajra/recovery/package")
    ctx.require("recovery package served", 200, pkg.status_code)
    p = pkg.json().get("recovery_package") or pkg.json().get("package") or pkg.json()
    ctx.note(f"recovery package keys: {sorted(p.keys())[:12]}")
    checkpoints = p.get("signed_checkpoints") or p.get("checkpoints")
    latest = checkpoints[-1] if isinstance(checkpoints, list) and checkpoints else p.get("latest_checkpoint", {})
    candidate = {
        "node_id": "cyber-p0-test-candidate", "genesis_id": p.get("genesis_id"), "config_hash": p.get("config_hash"),
        "latest_checkpoint": latest,
        "current_state_root": latest.get("state_root") or p.get("state_commitment_root") or p.get("current_state_root"),
        "akashic_lineage_hash": p.get("akashic_lineage_hash") or "unknown", "chain_intact": True,
        "validator_count": p.get("validator_count") or 0,
    }
    corrupt = dict(candidate, chain_intact=False, genesis_id="forged-genesis", current_state_root="0xdeadbeef")
    verdict = ((vajra(ctx).post("/api/vajra/recovery/verify-anchor", json=corrupt).json() or {}).get("verification") or {}).get("qualified")
    ctx.expect("corrupt candidate not qualified", False, verdict)
    ok = vajra(ctx).post("/api/vajra/recovery/verify-anchor", json=candidate)
    ctx.note(f"informational only: a candidate copied from the node's own package -> qualified="
             f"{((ok.json() or {}).get('verification') or {}).get('qualified')}; VAJRA counts signature strings and does "
             "not verify them, so this is not cryptographic proof (VAJ-05; see V-06)")


@check(id="V-06", title="VAJRA recovery anchor check rejects a candidate whose validator signatures are made up (local node)",
       scenario="S7 Recovery failure", refs=["10-day 20.D", "10-day Prakash recovery verification path", "VAJ-05 re-check 05 Nov 2026"],
       systems=[VAJRA], evidence_level=OFFLINE + "; inputs synthetic")
def v_06(ctx: Context):
    pkg = vajra(ctx).get("/api/vajra/recovery/package")
    ctx.require("recovery package served", 200, pkg.status_code)
    p = (pkg.json() or {}).get("recovery_package") or {}
    checkpoints = p.get("signed_checkpoints") or [{}]
    ctx.note(f"signatures in the node's recovery package: {checkpoints[-1].get('signatures')}")
    forged = {
        "node_id": "cyber-p0-test-forged-node", "genesis_id": p.get("genesis_id"),  # public: served by /recovery/package
        "config_hash": "forged",
        "latest_checkpoint": {"block_height": 1, "block_hash": "forged", "state_root": "forged-root",
                              "signatures": ["forged-1", "forged-2", "forged-3", "forged-4"], "timestamp": int(time.time())},
        "current_state_root": "forged-root", "akashic_lineage_hash": "forged", "chain_intact": True,
        "revoked_entities": {}, "validator_count": 5,
    }
    verdict = ((vajra(ctx).post("/api/vajra/recovery/verify-anchor", json=forged).json() or {}).get("verification") or {})
    ctx.expect("a candidate with four made-up signatures is not qualified as recovery anchor", False, verdict.get("qualified"))
    ctx.note(f"verdict for the forged candidate: {json.dumps(verdict, separators=(',', ':'))[:300]}")
    if verdict.get("qualified") is not False:
        ctx.defect("VAJ-05")


@check(id="V-07", title="One anonymous report cannot freeze a wallet, and a negative severity cannot hide reports (local node)",
       scenario="S1 Unauthorized access", refs=["EOD scenario: Unauthorized access", "VAJ-06 follow-up 05 Nov 2026"],
       systems=[VAJRA], evidence_level=OFFLINE + "; synthetic wallets")
def v_07(ctx: Context):
    def report(wallet, severity, reporter="anonymous (synthetic)"):
        return vajra(ctx).post("/api/cybercrime/report", json={"wallet_address": wallet, "reporter_id": reporter,
                                                                "reason": "synthetic test", "severity": severity, "tx_hash": ""})

    def status(wallet):
        return vajra(ctx).get(f"/api/cybercrime/status/{wallet}").json() or {}

    w1 = "cyber-p0-test-wallet-" + uuid.uuid4().hex[:8]
    r1 = report(w1, 15)
    s1 = status(w1)
    ctx.expect("one report without a token, severity 15, does not freeze the wallet", "wallet not frozen",
               f"report HTTP {r1.status_code}; wallet {s1.get('status')} (by {s1.get('frozen_by')})", ok=s1.get("status") != "frozen")
    w2 = "cyber-p0-test-wallet-" + uuid.uuid4().hex[:8]
    report(w2, -1000)
    for _ in range(2):
        report(w2, 10, reporter="reporter (synthetic)")
    s2 = status(w2)
    ctx.expect("a report with severity -1000 cannot cancel two later reports of 10 (freeze threshold 15)", "wallet frozen",
               f"wallet {s2.get('status')}, total severity {s2.get('total_severity_score')}", ok=s2.get("status") == "frozen")
    if s1.get("status") == "frozen" or s2.get("status") != "frozen":
        ctx.defect("VAJ-14")


@check(id="S7-05", title="VAJRA authority state survives a node restart", scenario="S7 Recovery failure",
       refs=["10-day Samsoorya: prove restart and state recovery", "10-day Prakash authority lifecycle"],
       systems=[VAJRA], evidence_level=OFFLINE + "; process killed and restarted")
def s7_05(ctx: Context):
    subject = new_subject("persistence")
    grant_use(ctx, subject)
    ctx.data["services"]["vajra"].restart()
    view = verify_view(ctx, subject)
    state = view.get("current_state")
    ctx.expect("authority state after restart (subject was USE)", "USE", state)
    ctx.expect("granted scope after restart", list(DEFAULT_SCOPE), view.get("scope"),
               ok=view.get("scope") == list(DEFAULT_SCOPE) or "scope" not in view)
    if "scope" not in view:
        ctx.note("this VAJRA build's verify reports no scope (older than 3cc883f)")
    if state != "USE":
        ctx.defect("VAJ-02")


# ------------------------------------------------------------------------------------------- S8 trace / replay

@check(id="S8-01", title="One trace id links request, decision, audit record and VAJRA evidence", scenario="S8 Trace / replay",
       refs=["EOD scenario: Trace / replay", "Task1 E trace identifier/provenance/replay reference"],
       systems=[CYBER, VAJRA], evidence_level=SIM_USER)
def s8_01(ctx: Context):
    tantra_level(ctx)
    token = token_of(ctx, "investigator_a")
    subject = new_subject("traced")
    grant_use(ctx, subject)
    trace = ctx.new_trace(ctx.data.get("trace_prefix", ""))
    r, _ = protected(ctx, token, subject, trace=trace)
    body = r.json()
    ctx.data["golden_trace"] = trace
    ctx.expect("response header trace", trace, r.headers.get("X-Trace-Id"))
    ctx.expect("response body trace", trace, body.get("trace_id"))
    rows = [row for row in audit_for_trace(ctx, trace) if row["action"].startswith("protected_access.decision")]
    ctx.expect("audit record for the trace", 1, len(rows))
    details = rows[0]["_details"] if rows else {}
    ctx.expect("audit event id matches the response", body.get("evidence", {}).get("local_audit_event_id"), details.get("event_id"))
    vrows = vajra_rows_for(ctx, trace)
    ctx.expect("one VAJRA row for this decision", 1, len(vrows))
    vrow = vrows[0] if vrows else {}
    ctx.expect("audit record points to the VAJRA row", vrow.get("trace_id"), (details.get("metadata") or {}).get("vajra_trace_id"))
    ctx.expect("VAJRA row carries the decision", body.get("decision"), vrow.get("fraud_decision"))
    ctx.expect("VAJRA evidence hash matches the response", body.get("evidence", {}).get("vajra", {}).get("data", {}).get("evidence_hash"),
               vrow.get("execution_hash"))
    ctx.expect("VAJRA chain intact (replayable)", True, (vajra(ctx).get("/api/tantra/chain-integrity").json() or {}).get("intact"))
    if live_tantra(ctx):
        tantra = body.get("evidence", {}).get("tantra", {})
        ctx.expect("TANTRA reached and answered for this trace", "one of " + "/".join(TANTRA_REACHED), tantra.get("status"),
                   ok=tantra.get("status") in TANTRA_REACHED)


@check(id="S8-02", title="TANTRA ledger participation: probe written, replay-verified and forwarded (live write)",
       scenario="S8 Trace / replay", refs=["Task1 E TANTRA participation", "Task1 M TANTRA runtime participation", "EOD trace/replay"],
       systems=[CYBER, TANTRA],
       evidence_level="LIVE-VERIFIED (TANTRA registered integrity_probe contract; sent by the module's client code in-process)")
def s8_02(ctx: Context):
    if not live_tantra(ctx):
        raise Skipped("needs --tantra live")
    if not ctx.data["mode"]["allow_live_write"]:
        raise Skipped("live TANTRA write not enabled (--allow-live-tantra-write); nothing sent")
    from app.core import bhiv_runtime  # the Cybersecurity module's own TANTRA client, run in-process
    from app.core.config import settings
    trace = ctx.data.get("golden_trace") or ctx.new_trace("cyber-p0-test-")
    if trace not in ctx.result.trace_ids:
        ctx.result.trace_ids.append(trace)
    probe_id = trace if trace.startswith("cyber-p0-test-") else f"cyber-p0-test-{trace}"
    base = ctx.data["tantra_base"]
    settings.TANTRA_VALIDATION_URL = f"{base}:8101"
    settings.TANTRA_KARMA_URL = f"{base}:8102"
    settings.TANTRA_PRANA_URL = f"{base}:8103"
    settings.TANTRA_SUBMISSION_PREFIX = ""
    original_client = bhiv_runtime._client
    bhiv_runtime._client = lambda: ctx.recorder.client("", TANTRA)
    try:
        envelope = bhiv_runtime.build_tantra_envelope(
            event_type="integrity_probe", submission_id=probe_id,
            payload={"sequence": 1, "status": "ok", "probe": probe_id})
        result = bhiv_runtime.tantra_submit(envelope, trace_id=trace)
        ctx.data["tantra_probe"] = result.as_dict()
        ctx.expect("TANTRA ledger write", "RECORDED", result.status)
        ctx.expect("TANTRA replay verification", "MATCH", result.data.get("replay_status"))
        ctx.expect("TANTRA forwarded to PRANA", "forwarded", result.data.get("prana_forward"))
        ctx.note(f"karma_event_id={result.data.get('karma_event_id')} payload_hash={result.data.get('payload_hash')}")
    finally:
        bhiv_runtime._client = original_client


@check(id="S8-03", title="Tampering with stored evidence is detected by VAJRA's chain check", scenario="S8 Trace / replay",
       refs=["10-day Hemanth replay/integrity verification", "EOD replay proves history"], systems=[VAJRA],
       evidence_level="OFFLINE-VERIFIED; induced fault (one stored row edited)")
def s8_03(ctx: Context):
    node = ctx.data["services"]["vajra"]
    store: Path = node.truth_store
    original = store.read_bytes()
    lines = original.decode("utf-8").splitlines()
    ctx.require("TruthStore has rows to tamper with", True, len(lines) >= 2, ok=len(lines) >= 2)
    node.stop()
    row = json.loads(lines[0])
    row["fraud_decision"] = "ALLOW" if row.get("fraud_decision") != "ALLOW" else "DENY"
    lines[0] = json.dumps(row, separators=(",", ":"))
    store.write_text("\n".join(lines) + "\n", encoding="utf-8")
    try:
        try:
            node.start()
        except TimeoutError:
            ctx.expect("node starts with the tampered store and reports it", "started", "node did not start (inconclusive)", ok=False)
            return
        integ = vajra(ctx).get("/api/tantra/chain-integrity")
        ctx.expect("tampered store reported broken", False, (integ.json() or {}).get("intact"))
        ctx.note(f"chain-integrity after tamper: HTTP {integ.status_code} {str(integ.json())[:200]}")
    finally:
        node.stop()
        store.write_bytes(original)
        node.start()
        ctx.expect("restored store reported intact", True, (vajra(ctx).get("/api/tantra/chain-integrity").json() or {}).get("intact"))


@check(id="V-08", title="VAJRA authority ledger: an edited, unsaved or unreadable record is not trusted after a restart (local node)",
       scenario="S7 Recovery failure",
       refs=["VAJ-02 re-check 05 Nov 2026", "10-day Samsoorya: prove restart and state recovery", "Principle: provenance / tamper evidence"],
       systems=[VAJRA], evidence_level=OFFLINE + "; induced faults on the local node (ledger line edited, file read-only, corrupt line)")
def v_08(ctx: Context):
    node = ctx.data["services"]["vajra"]
    ledger: Path = node.authority_ledger
    sentinel = new_subject("ledger-sentinel")
    grant_use(ctx, sentinel)
    if not ledger.exists():
        raise Skipped("this VAJRA build keeps no authority ledger file (authority state is held in memory only)")
    original = ledger.read_bytes()
    problems = 0

    def start_or_refused() -> bool:
        """Start the node; False when it refuses to start (an acceptable, fail-closed answer to a damaged ledger)."""
        try:
            node.start()
            return True
        except TimeoutError:
            node.stop()
            return False

    try:
        # 1. A REVOKE record edited to USE on disk.
        edited = new_subject("ledger-edited")
        grant_use(ctx, edited)
        ctx.require("REVOKE accepted", 200, transition(ctx, edited, "REVOKE", SIM_ISSUER_USER).status_code)
        node.stop()
        lines = ledger.read_text(encoding="utf-8").splitlines()
        for i in range(len(lines) - 1, -1, -1):
            rec = json.loads(lines[i])
            if rec.get("subject") == edited and (rec.get("state_transition") or {}).get("to") == "REVOKE":
                rec["state_transition"]["to"] = "USE"
                lines[i] = json.dumps(rec, separators=(",", ":"))
                break
        ledger.write_text("\n".join(lines) + "\n", encoding="utf-8")
        if start_or_refused():
            v = verify_view(ctx, edited)
            ok = v.get("is_authorized") is False
            ctx.expect("a REVOKE record edited to USE on disk is not trusted after restart",
                       "still REVOKE, or the node refuses the edited ledger",
                       f"after restart: {v.get('current_state')}, is_authorized={v.get('is_authorized')}", ok=ok)
        else:
            ok = True
            ctx.expect("a REVOKE record edited to USE on disk is not trusted after restart",
                       "still REVOKE, or the node refuses the edited ledger", "node refused to start", ok=True)
            ledger.write_bytes(original)
            node.start()
        problems += not ok

        # 2. A REVOKE that cannot be saved (ledger file read-only).
        unsaved = new_subject("ledger-unsaved")
        grant_use(ctx, unsaved)
        os.chmod(ledger, stat.S_IREAD)
        try:
            code = transition(ctx, unsaved, "REVOKE", SIM_ISSUER_USER).status_code
        finally:
            os.chmod(ledger, stat.S_IREAD | stat.S_IWRITE)
        node.restart()
        v = verify_view(ctx, unsaved)
        ok = not (code == 200 and v.get("is_authorized") is True)
        ctx.expect("a REVOKE that could not be saved is not answered as done", "an error reply, or REVOKE after restart",
                   f"REVOKE reply HTTP {code}; after restart: {v.get('current_state')}, is_authorized={v.get('is_authorized')}", ok=ok)
        problems += not ok

        # 3. One unreadable line at the end of the ledger.
        node.stop()
        with open(ledger, "a", encoding="utf-8") as fh:
            fh.write("{corrupt line (synthetic)\n")
        if start_or_refused():
            earlier = verify_view(ctx, sentinel).get("current_state")
            later = new_subject("ledger-after-corrupt")
            ctx.require("GRANT accepted after the corrupt line", 200, transition(ctx, later, "GRANT", SIM_ISSUER_USER).status_code)
            node.restart()
            kept = verify_view(ctx, later).get("current_state")
            ok = earlier == "USE" and kept == "GRANT"
            ctx.expect("one unreadable line neither wipes the stored state nor stops saving",
                       "earlier subject USE and the new GRANT kept, or the node refuses to start",
                       f"earlier subject '{earlier}'; new subject after another restart '{kept}'", ok=ok)
        else:
            ok = True
            ctx.expect("one unreadable line neither wipes the stored state nor stops saving",
                       "earlier subject USE and the new GRANT kept, or the node refuses to start", "node refused to start", ok=True)
        problems += not ok
        warnings = [line for line in node.log_path.read_text(encoding="utf-8", errors="replace").splitlines()
                    if "Failed to load authority ledger" in line]
        ctx.note(f"node log lines 'Failed to load authority ledger': {len(warnings)}")
    finally:
        node.stop()
        os.chmod(ledger, stat.S_IREAD | stat.S_IWRITE)
        ledger.write_bytes(original)  # the ledger exactly as before this check
        node.start()
    ctx.expect("restored ledger: the sentinel subject is back to USE", "USE", verify_view(ctx, sentinel).get("current_state"))
    if problems:
        ctx.defect("VAJ-13")


# ------------------------------------------------------------------------------------------- closing observability

@check(id="O-03", title="Error responses follow the canonical error contract (code, trace_id, request_id, timestamp)",
       scenario="Observability", refs=["Task1 E error handling", "Task1 C structured outputs"], systems=[CYBER],
       evidence_level=OFFLINE)
def o03_error_contract(ctx: Context):
    r = cyber(ctx).get("/api/v1/wallets", headers={"X-Trace-Id": ctx.new_trace()})
    body = r.json()
    for key in ("error", "code", "message", "trace_id", "request_id", "timestamp", "status_code"):
        ctx.expect(f"error body has '{key}'", True, key in body)
    ctx.expect("X-Request-Id header present", True, bool(r.headers.get("X-Request-Id")))


@check(id="O-04", title="Collection route without trailing slash is served or redirected (API contract)",
       scenario="Observability", refs=["Task1 C API contracts"], systems=[CYBER], evidence_level=OFFLINE)
def o04_trailing_slash(ctx: Context):
    r = cyber(ctx).get("/api/v1/cases", headers=auth(token_of(ctx, "investigator_a"), ctx.new_trace()))
    ctx.expect("GET /api/v1/cases (no slash) by an authorised investigator", "200 or 307", r.status_code,
               ok=r.status_code in (200, 307))
    if r.status_code == 405:
        ctx.defect("CYB-07")
