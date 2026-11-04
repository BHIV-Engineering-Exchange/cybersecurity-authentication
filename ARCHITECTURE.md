# Architecture (as built, 2026-11-04)

This describes what exists in the code at this commit. It does not add architecture. Where the task brief asks for
a stage that has no implementation yet, the stage is marked **not built** with the owner who holds it.

## Target chain from the task brief, mapped to the code

| Stage (task brief) | What implements it here | Status |
|---|---|---|
| Security signal | HTTP requests to the API; the request context and RBAC middleware (`cybercrime/backend/main.py:557-837`) | built |
| Intelligence | Incident analysis (`app/api/v1/endpoints/incidents.py`), ML fraud prediction (`ml_training/`) | built, with defects CYB-03 and CYB-06 |
| Decision support | `POST /api/v1/authz/check` (`endpoints/authz.py`), `POST /api/v1/protected/access` (`endpoints/protected_access.py`) | built |
| Contract | Versioned request/response models (contract_version 1.0.0); frozen `cybercrime/openapi.yaml` | built |
| Controlled execution | Cybersecurity does **not** execute containment. VAJRA executes authority transitions; TANTRA owns approval | boundary |
| Evidence | Canonical security event (`app/core/canonical_event.py`) to SQL `audit_logs` and the structured log; VAJRA evidence record; TANTRA ledger | built; TANTRA ledger blocked (no registered contract) |
| Replay | VAJRA TruthStore chain check; TANTRA karma replay check | built in the peers; used by verification |
| Observability | `/health`, `/api/v1/system/health` (VAJRA/TANTRA reachability for superadmins), `X-Trace-Id`/`X-Request-Id` on API responses (not on CORS preflight or the POLICY_UNAVAILABLE response), JSON log lines | built |
| Knowledge contribution | Not defined in the brief for this slice | UNKNOWN |
| Correlation of multiple signals | fraud-evidence-system has case-linking correlation; nothing correlates authentication/access signals (owner: Aryan Dias) | not wired |

## Runtime picture

```
            +-------------------------- Cybersecurity API (FastAPI, cybercrime/backend) ---------------------------+
 request -> | request context (trace/request ids) -> RBAC middleware (JWT + jti revocation + account state + policy)  |
            |    deny -> canonical error + canonical audit event (actor, resource, decision, reason, trace)           |
            |    allow -> route:                                                                                     |
            |      /authz/check         policy decision (deny by default)                                            |
            |      /access/revoke       token, account and (claimed) permission revocation                           |
            |      /protected/access    VAJRA consent read -> decision -> audit -> VAJRA evidence -> TANTRA gate       |
            |                           (no ALLOW unless VAJRA records it; otherwise a superseding DENY audit event) |
            |      investigation APIs   cases, wallets, evidence upload, incident analysis, ...                      |
            +------------------------------------------------------------------------------------------------------+
                      |  GET authority/verify, POST evidence/record (Bearer)        |  POST /validate/prana/ingress
                      v                                                             v  (then karma ingest + verify)
            VAJRA relay node (bhiv-VAJRA_Blockchain)                     TANTRA layer (bhiv-TANTRA_Layer)
            authority state machine, TruthStore hash chain               validation registry, karma ledger, PRANA
```

## Components

| Component | File(s) | Notes |
|---|---|---|
| Application and middleware | `cybercrime/backend/main.py` | CORS, trace/request ids, RBAC enforcement, canonical error handlers, OpenAPI drift check at startup |
| Settings | `app/core/config.py` | Environment variables; `SECRET_KEY` is mandatory |
| Tokens | `app/core/security.py` | HS256 JWT with `jti`; revoked `jti` stored in `revoked_tokens`; revocation check fails closed on database error |
| RBAC policy | `app/core/rbac.py`, `cybercrime/rbac-permissions.json` | Roles: public, investigator, superadmin; path + method rules |
| Canonical events | `app/core/canonical_event.py` | Schema 1.0.0; secret scrubbing; optional fail-closed persistence |
| Authorization decision | `app/api/v1/endpoints/authz.py` | Deny by default; non-superadmins can only ask about themselves |
| Revocation | `app/api/v1/endpoints/access.py` | Tiers: token, account, permission (permission tier changes nothing: CYB-02) |
| Protected access (new) | `app/api/v1/endpoints/protected_access.py` | VAJRA consent state (not scope: CYB-13), no ALLOW without VAJRA evidence, fail closed, per-caller idempotency bound to the request, per-sink evidence status |
| BHIV runtime bridge (new) | `app/core/bhiv_runtime.py` | VAJRA verify/evidence, TANTRA validate/ingest/verify, health probes |
| Earlier BHIV Core/Bucket hooks | `app/core/sovereign_integrations.py` | Evidence copy to Bucket, governance events to Core, local buffer when unreachable |
| Data | `app/db/models.py` | SQLAlchemy models; SQLite by default; table `protected_access_decisions` added |

## Data and state

- SQL database (`DATABASE_URL`): users, cases, evidence metadata, audit logs, revoked tokens, idempotency records.
- Files: evidence uploads (`EVIDENCE_STORAGE_PATH`), event buffer when Core is unreachable (`EVENT_BUFFER_PATH`).
- MongoDB (optional): incident report documents.
- Permission and consent state for VAJRA subjects lives in **VAJRA**, not here. This service stores only its own
  decisions and audit records.

## Security properties checked by the verification run

Deny by default on unknown or anonymous callers, token revocation and account deactivation take effect on the next
request and survive a restart, VAJRA consent is required for protected access and its absence fails closed, no ALLOW
without a VAJRA evidence record, no decision is released if the audit record cannot be written, duplicates do not
re-execute and cannot revive a revoked grant, slow peers do not stall the API, and evidence gaps are reported
instead of hidden. Not provided: scope checking and caller-to-subject binding (CYB-13). Results per property:
`evidence_packet/test_results/PROOF_MATRIX.md`.
