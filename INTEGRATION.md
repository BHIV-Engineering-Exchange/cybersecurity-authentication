# Integration contracts

Cybersecurity talks to two BHIV systems through `cybercrime/backend/app/core/bhiv_runtime.py`. Each integration stays
off until its URL is set. Contracts were taken from the owners' repositories and their live OpenAPI documents on
2026-11-04:

- VAJRA: `BHIV-SYSTEM/bhiv-VAJRA_Blockchain` at commit `07d683c`; re-checked on 2026-11-05 against commit `3cc883f`
  (branch `vajra-tantra-runtime-increment`) on a local node. Results: `evidence_packet/test_results/VAJRA_RECHECK.md`.
- TANTRA: `BHIV-Engineering-Exchange/bhiv-TANTRA_Layer` (scripts and docs) and its live services.

The order validate, then ingest, then verify is the order TANTRA's own end-to-end test uses
(`bhiv-TANTRA_Layer/e2e_test.py:49-75`).

## 1. Inbound contract offered by Cybersecurity

`POST /api/v1/protected/access`. Caller: an authenticated investigator or superadmin (JWT bearer).

Request (contract_version 1.0.0):

```json
{
  "contract_version": "1.0.0",
  "idempotency_key": "optional, 8-128 chars; scoped to the caller and bound to the request content",
  "vajra_subject": "VAJRA subject whose consent governs the resource",
  "action": "read | update | download | ... (canonical actions)",
  "resource": {"type": "evidence | case | wallet | transaction | user | policy | system_config | artifact", "id": "..."},
  "purpose": "why access is needed"
}
```

Response fields:

- `decision` (ALLOW / DENY), `reason_code`, `reason` and `decision_id`.
- `trace_id`, `request_id`, `idempotency_key` and `duplicate`.
- `actor_id`, `action` and `resource`.
- `vajra`: `subject_ref`, `status`, `is_authorized`, `current_state` and `scope_checked` (true when the required scope
  was compared with the scope VAJRA reported).
- `evidence`: `local_audit_event_id` (the final audit event), `superseded_audit_event_id` (set when a tentative ALLOW
  became DENY), plus `vajra` and `tantra` sink results, `complete` and `gaps`.
- `policy_applied` and `evaluated_at`.

**What ALLOW means:**

- The caller passed RBAC.
- VAJRA reports the subject's authority state as GRANT or USE.
- The scope VAJRA reports for the subject contains `<action>:<resource type>`, for example `read:evidence` (since
  2026-11-05; VAJRA's verify reports a scope since VAJRA commit `3cc883f`).
- VAJRA confirmed the evidence record for this decision.

**Scope rule:** exact, case-sensitive match of one list entry; no wildcards and no implied supersets (`admin` or `*`
do not match). If VAJRA reports no scope (field missing or not a list of strings) the answer is DENY
`VAJRA_SCOPE_UNAVAILABLE`. The `<action>:<resource type>` form follows VAJRA's own example (`read:telemetry`); VAJRA
defines no scope vocabulary, so this form is Cybersecurity's proposal and still needs the VAJRA and TANTRA owners'
agreement (whoever issues GRANTs must use it). The agreed vocabulary is UNKNOWN until then.

**What ALLOW does not mean:** the resource id and the purpose are recorded but not checked, and nothing links the
calling user to the subject (defect CYB-13, still open; who may ask about which subject is UNKNOWN). Note also VAJ-12: VAJRA reports the scope of the subject's
latest transition, so a later USE can widen or erase what the GRANT gave; Cybersecurity follows what VAJRA reports.

| Reason code | Meaning |
|---|---|
| `ALLOWED_BY_VAJRA_AUTHORITY` | VAJRA state GRANT/USE, required scope in the VAJRA scope, RBAC passed, VAJRA evidence RECORDED |
| `VAJRA_SCOPE_NOT_GRANTED` | Consent is active, but the scope VAJRA reports does not contain `<action>:<resource type>` |
| `VAJRA_SCOPE_UNAVAILABLE` | Consent is active, but VAJRA reported no scope, so the action cannot be checked: deny |
| `VAJRA_AUTHORITY_NOT_GRANTED` | Any other VAJRA state (REVOKE, ISOLATE, TERMINATE, RECOVER, REINSTATE, unknown) |
| `VAJRA_EVIDENCE_NOT_RECORDED` | Consent was active, but VAJRA did not confirm the evidence record: no access without evidence |
| `VAJRA_UNAVAILABLE` | VAJRA could not be reached or answered unexpectedly: deny (fail closed) |
| `VAJRA_NOT_CONFIGURED` | `VAJRA_API_URL` is not set: deny |

| Error | Meaning |
|---|---|
| 401 `AUTHENTICATION_REQUIRED` | No or invalid token |
| 400 `UNSUPPORTED_*` | Bad contract version, action or resource type |
| 400 `INVALID_TRACE_ID` | `X-Trace-Id` must be 1-128 characters of `A-Z a-z 0-9 . _ : -` (it becomes part of the VAJRA record id) |
| 409 `IDEMPOTENCY_KEY_CONFLICT` | The key was used for a different request |
| 409 `DUPLICATE_IN_PROGRESS` | The same request is still being processed |
| 409 `STALE_DECISION` | The earlier ALLOW expired (`PROTECTED_ACCESS_REPLAY_TTL_SECONDS`, default 300) or VAJRA no longer reports GRANT/USE with the required scope; send a new request with a new key |
| 503 `EVIDENCE_PERSISTENCE_FAILED` | The audit record could not be written, so no decision was released |

Order of work (VAJRA and TANTRA are written only after the local audit is stored):

1. Read VAJRA authority and form the decision.
2. Write the local audit event. If that fails, return 503 and call nothing else.
3. Record the VAJRA evidence, which commits to the audit event's SHA-256.
4. If a tentative ALLOW has no VAJRA record, it becomes DENY: a second audit event records the change and points to
   the first.
5. Send a minimal projection of the final event to TANTRA.

Edge cases:

- The local audit keeps the superseded tentative ALLOW (outcome SUCCESS) next to the DENY that replaces it.
- If VAJRA stores the row but its reply is lost (for example a timeout), Cybersecurity reports UNAVAILABLE and denies,
  while VAJRA keeps a row that commits to the tentative ALLOW.
- If the process fails after step 3, the decision was made and recorded, but the response was lost.

How idempotent repeats work:

- A repeat of the same request returns the first decision with `duplicate: true`. Nothing is re-executed: no new
  audit event and no new VAJRA or TANTRA record.
- A stored ALLOW is replayed only after VAJRA confirms the authority and the scope again.
- A claim left PENDING for more than 120 seconds (a crashed request) is taken over by the next attempt.

Errors use the canonical error body: `error`, `code`, `status_code`, `message`, `trace_id`, `request_id`, `timestamp`
and `details`. A caller sending more than `PROTECTED_ACCESS_RATE_LIMIT_PER_MINUTE` requests a minute gets
`429 RATE_LIMITED` with `Retry-After: 60`, and nothing is sent to VAJRA or TANTRA.

### 1a. Other inbound contracts changed or added on 2026-11-04

| Route | Contract |
|---|---|
| `POST /api/v1/auth/register` | Superadmin only (401/403 otherwise). Public sign-up is `POST /api/v1/access-requests/request`, reviewed by a superadmin. |
| `POST /api/v1/auth/login` | Unknown email and wrong password both answer `401` "Invalid email or password.". Each failed login writes a canonical `auth.login` DENIED event (actor anonymous; resource = the account, `cc_usr_<id>`, or `unknown:<HMAC prefix>` of the email with the server key). More than `LOGIN_MAX_ATTEMPTS_PER_MINUTE` attempts for one email in a minute answer `429` (nothing stored). |
| `GET /api/v1/threats/incidents[?status_filter=open]`, `GET /api/v1/threats/incidents/{incident_id}` | Superadmin only. Contract `security_incident` v1.0.0 (`cybercrime/contracts/`). Incidents opened by rule `auth.repeated_failed_login` v1.0.0 (>= 5 wrong-password logins for one account in 10 minutes; `evidence_event_ids` lists up to 50). Each also has `observed_facts`, `inference`, `evidence_gaps`, `proposed_next_action` and a TANTRA-compatible `tantra_response_envelope` with `tantra_status` NOT SENT (no TANTRA contract yet). Fields: `incident_id, correlation_key, rule_id, rule_version, threat_type, target_ref, severity, confidence, uncertainty[], rationale, status, requires_human_review, event_count, evidence_event_ids[], trace_ids[], first_seen_at, last_seen_at`. Opening one writes a `threat.detected` event. Decision support only: nothing is blocked. |
| `POST /api/v1/access/revoke` (`permission_revocation`) | The `role:action` pair is now stored and enforced: the RBAC middleware answers `403 PERMISSION_REVOKED` (read=GET/HEAD, create=POST, update=PUT/PATCH, delete=DELETE), and `/api/v1/authz/check` answers DENY `PERMISSION_REVOKED`. `superadmin` and `public` cannot be revoked. A repeat answers `ALREADY_INACTIVE`. |
| `POST /api/v1/access/restore` | Superadmin only. Body `{contract_version, role, action, reason}`; answers `RESTORED` or `NOT_REVOKED` and writes an `access.restored` event. |
| `POST /api/v1/incidents/analyze` | Reads only the system's `fraud_transactions` dataset (filled by a generator script in this repository; stated in `uncertainty`, with how times are derived). New fields: `confidence` (0-1, a rule of thumb, not a calibrated probability), `uncertainty[]`, `data_basis` (`recorded`, `none`, `synthetic_demo`), `observed_tx_count`; each transaction has `synthetic`. With no records: no transactions or patterns, `risk_level` `INSUFFICIENT DATA`. |
| `POST /api/v1/evidence/` | Response adds `bucket_status`: `stored`, `unavailable` or `not_configured`. |
| `GET /api/v1/system/health` | Anonymous callers no longer see file-system paths or raw database errors. |
| Any route | `X-Trace-Id` / `X-Request-Id` are echoed and used (also in `/authz/check` and `/access/revoke` bodies and audit events) only if they match `^[A-Za-z0-9._:-]{1,128}$`; otherwise a fresh UUID is used. A collection route without the trailing slash now redirects (307) instead of 405. |

Outbound change: the Bucket API key now travels in an `X-API-Key` header, not in the JSON body. The Bucket owner must
confirm the Bucket reads it from there.

### 1b. Changed on 2026-11-05

| What | Contract |
|---|---|
| `POST /api/v1/protected/access` | ALLOW also needs `<action>:<resource type>` in the scope VAJRA reports (section 1). New reason codes `VAJRA_SCOPE_NOT_GRANTED` and `VAJRA_SCOPE_UNAVAILABLE`; `vajra.scope_checked` is true when the comparison was made. The request and response shapes are unchanged (contract 1.0.0). The local audit event and the TANTRA projection carry `required_scope`; the audit event also carries `vajra_authority`. |
| VAJRA credential | New setting `VAJRA_CYBER_SECRET` (VAJRA's evidence-only tier), used for evidence writes when set. `VAJRA_TANTRA_SECRET` is now only a fallback (section 2). |
| `GET /api/v1/system/health` (superadmin) | `bhiv_runtime.vajra` adds `write_credential` (`cyber_evidence_only`, `tantra_governance` or `none`; never the token) and `warnings`. |

## 2. VAJRA (relay node HTTP API)

| Property | Value |
|---|---|
| Base URL | `VAJRA_API_URL`. The node's HTTP port is `HTTP_PORT`, 8080 by default. Port 4000 in some VAJRA docs is the P2P port. Use https in production: the verify response is unauthenticated, so its integrity depends on the transport. |
| Authority read | `GET /api/vajra/authority/verify?subject=<id>`. No auth. Returns `{subject, current_state, is_authorized, verified_at}`, and since commit `3cc883f` also `scope` (list of strings) and `authority`; `is_authorized` is true only for GRANT/USE, and Cybersecurity accepts only a JSON boolean true and only a list of strings as a scope. |
| Evidence write | `POST /api/vajra/evidence/record` with `Authorization: Bearer <token>` (see "The tokens"). Body: `trace_id, source, threat_type, severity, action_taken, actor, details, evidence_hex, metadata`. |
| One record per decision | VAJRA keeps one row per `trace_id`, so Cybersecurity sends `trace_id = "<request trace>::<decision_id>"`. The audit event stores that value as `metadata.vajra_trace_id`. |
| Evidence responses | 200 `stored:true` maps to RECORDED; 200 `simulated:true` (trace starting `test_probe_`) maps to SIMULATED; 409 maps to DUPLICATE_TRACE; 401 or 403 to UNAUTHORIZED; 400 to REJECTED; 5xx or network failure to UNAVAILABLE. Only RECORDED allows an ALLOW. The sink result names the credential kind used (`credential`). |
| Provenance | `evidence_hex` is the SHA-256 of the stored canonical audit event (exactly the JSON in `audit_logs.details`). VAJRA hashes the full request into `evidence_hash`, so the VAJRA row commits to our audit event. TruthStore rows are hash-chained. |
| Replay reference | `GET /api/tantra/records`, `GET /api/tantra/chain-integrity` on the VAJRA node. |
| The tokens | Two shared values; VAJRA compares the bearer with them as fixed strings (no JWT is checked). `VAJRA_CYBER_SECRET`, VAJRA's evidence-only tier (commit `3cc883f`), is what Cybersecurity should hold and is used when set. `VAJRA_TANTRA_SECRET` is VAJRA's governance token: it also authorizes `/api/vajra/authority/transition`, so Cybersecurity uses it only when the evidence-only token is not configured, and health then warns. Re-check of `3cc883f` (2026-11-05, local node): evidence/record still accepts only the governance token, so the evidence-only token gets 401 there (VAJ-10; with only that token every decision fails closed), and the evidence-only token is still accepted by permission grant/revoke and admin submit-transaction (VAJ-11). VAJRA's reply names `security/jwt_handler.py` (RS256) as the issuer; that file is in VAJRA's repository and is used by its Python services, but the relay's gate does not use it. Who issues and rotates the two fixed values is UNKNOWN (asked of the VAJRA owner). |
| Not called in this slice | `POST /api/vajra/authority/transition` (a deliberate scope choice). VAJRA's integration package (`VAJRA_EXTERNAL_INTEGRATION_PACKAGE.md:18`) assigns opt-out revocation through this route to "Kaushlendra / User UX"; who calls it is a team decision that has not been made yet. |

## 3. TANTRA (validation layer, karma helper, PRANA)

| Property | Value |
|---|---|
| Contract gate | `POST {TANTRA_VALIDATION_URL}/validate/prana/ingress`. Envelope: `registry_reference {registry, event_type, version}, submission_id, event_type, timestamp, payload, source_system`. It answers `valid` or `rejected`; whether it also stores anything is not known (TANTRA's service code is not in its repository). |
| Schema / version | Registry `prana.event.contracts`, version `1.0.0`. Event type `TANTRA_EVENT_TYPE` (default `security_decision`). |
| Current state | Live TANTRA answers `422 event_type_not_registered` for `security_decision`. Registered types on 2026-11-04: adaptive_decision, bucket_memory_saved, integrity_probe, review_completed, task_submit, task_submit_failed, truth_classification. |
| Ledger write | Only after `status: valid`: `POST {TANTRA_KARMA_URL}/karma/ingest` with the validated envelope, then `POST /karma/verify?event_id=...`. MATCH maps to RECORDED; any other replay result maps to RECORDED_UNVERIFIED, which is reported as a gap. A rejected event is never written by another route. |
| Payload | A projection of the canonical security event (schema 1.0.0; one contract, not a second schema). It carries `event_id, event_type, timestamp, source_system, trace_id, request_id, actor (actor_id is the internal pseudonymous user id), action, resource, outcome, policy_reference` and these metadata fields: `decision, decision_id, vajra_subject_ref, vajra_status, vajra_state, vajra_trace_id, scope_checked, required_scope, supersedes_event_id`. The free-text `purpose` and the idempotency key are not sent. `vajra_subject_ref` is an unsalted SHA-256 prefix: pseudonymous and linkable, not anonymous. |
| Test traffic | `TANTRA_SUBMISSION_PREFIX` (for example `cyber-p0-test-`) is prepended to every submission id. |
| Authentication | The TANTRA services accepted our calls without credentials (observed 2026-11-04). |
| Errors | 422 maps to CONTRACT_REJECTED (with TANTRA's reason); 5xx, timeout or network failure to UNAVAILABLE. The decision is unaffected, and the gap is listed in `evidence.gaps`. |
| Replay reference | `karma_event_id` with `replay_status` in the response; `GET {TANTRA_PRANA_URL}/replay/{trace_id}` (read-only). |
| Not called | `/intelligence/sarathi/enforce` ("Forward signal enforcement request to Sarathi Policy Enforcement Layer") and `/intelligence/rajya/validate` ("Forward authority validation request to RAJYA Authority Validation Layer"), quoted from TANTRA's OpenAPI. They forward to other live systems and have no test lane. Whether RAJYA is the approval contract for security responses is UNKNOWN. |

## 4. Observability of the integrations

- `GET /api/v1/system/health` shows `bhiv_runtime` only to a superadmin. It lists configuration and reachability of
  each TANTRA service and the VAJRA API, plus whether a VAJRA token is configured, which kind is used
  (`write_credential`) and any warning (never the token itself).
  Probes are cached for `BHIV_HEALTH_CACHE_SECONDS` (default 15). Anonymous callers get the earlier health body and
  trigger no outbound probes.
- Every external call writes one JSON log line, `bhiv_runtime.<sink>`, with status, HTTP code, trace id and a
  redacted detail. Each decision then ends with `protected_access.completed`, or with `protected_access.withheld` if
  the audit write failed.
- The endpoint is a plain (sync) FastAPI route, so slow peers occupy a worker thread, not the event loop.

## 5. What is still needed from the owners

| Owner | Needed |
|---|---|
| TANTRA team | Register a contract for cybersecurity decisions (or name the registered type to use); a dry-run lane for the enforcement and authority-validation routes |
| VAJRA (Prakash) | After the 2026-11-05 re-check of `3cc883f`: accept the evidence-only token on evidence/record (VAJ-10) and refuse it elsewhere (VAJ-11); keep the GRANT scope fixed (VAJ-12); a ledger that fails closed and checks its hash chain (VAJ-13); no freeze from anonymous reports (VAJ-14); unique permission ids (VAJ-07); real recovery signatures (VAJ-05); the token issuer and rotation; agreement on the scope form; a staging node or test prefix for live tests |
| Integration lead (Rajaryan) | The VM; deployment URLs for VAJRA and TANTRA; the decision on who calls VAJRA transitions for opt-out |
