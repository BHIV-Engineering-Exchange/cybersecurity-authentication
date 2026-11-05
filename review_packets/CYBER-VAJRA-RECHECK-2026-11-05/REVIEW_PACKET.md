# REVIEW_PACKET - Cybersecurity P0 verification and BHIV runtime bridge

Branch `hemanth/p0-verification-2026-11-04` - base commit `59d2d63` (main, 2026-10-27). Generated from run `20261105T151254Z` (2026-11-05T15:13:13Z to 2026-11-05T15:15:34Z UTC, TANTRA mode `off`).

## 1. Entry point

- API: `POST /api/v1/protected/access` in `cybercrime/backend/app/api/v1/endpoints/protected_access.py` (contract_version 1.0.0; RBAC: investigator and superadmin).
- Verification: `python verification/run_verification.py --vajra-bin <vajra-relay> [--tantra live --tantra-base <url>]`.

## 2. Core execution flow (three critical files)

1. `cybercrime/backend/app/api/v1/endpoints/protected_access.py` - authenticate (RBAC middleware) -> claim the idempotency key (per caller, bound to the request) -> read VAJRA authority (fail closed) -> canonical audit event (no decision, and no VAJRA call, without it) -> VAJRA evidence record committing to the audit event's hash -> a tentative ALLOW without a VAJRA record becomes DENY (superseding audit event) -> minimal projection to TANTRA's contract gate -> response with per-sink evidence status.
2. `cybercrime/backend/app/core/bhiv_runtime.py` - the TANTRA and VAJRA calls (verify, evidence record, validate, karma ingest + replay verify) with explicit statuses; no bypass of TANTRA's gate; never calls VAJRA transitions.
3. `verification/checks/scenarios.py` - the checks against the real processes.

## 3. Live flow

```
Investigator (JWT) --> Cybersecurity RBAC --> POST /api/v1/protected/access
   --> VAJRA GET /api/vajra/authority/verify    (consent state; fail closed)
   --> canonical audit event                     (SQL audit_logs, trace_id; 503 and nothing else if it fails)
   --> VAJRA POST /api/vajra/evidence/record    (Bearer; evidence_hex = SHA-256 of the audit event;
                                                  one row per decision: trace_id '<trace>::<decision_id>')
   --> ALLOW only if VAJRA RECORDED, else DENY  (superseding audit event points to the first)
   --> TANTRA POST /validate/prana/ingress       (minimal projection; ledger write only if validated)
   --> response: decision, reason, decision_id, trace_id, evidence {local, vajra, tantra, complete, gaps}
```

What ALLOW means: the caller passed RBAC, VAJRA reports GRANT or USE for the subject, the scope VAJRA reports contains `<action>:<resource type>` (for example `read:evidence`; `vajra.scope_checked: true`), and VAJRA recorded the evidence. Not checked: the resource id, the purpose, and whether the caller may act for the subject (CYB-13).

Golden trace for review: `9f09a114-cd0f-46c4-bceb-f3714bbe513a` (check S8-01). The id appears in the HTTP response and the audit store, and it prefixes the VAJRA TruthStore row id (`<trace>::<decision_id>`); see `replay_evidence/GOLDEN_TRACE.md`.

## 4. Real JSON request/response (recorded, secrets redacted)

### ALLOW (check P-A)

```json
{
  "request": {
    "method": "POST",
    "url": "http://127.0.0.1:53155/api/v1/protected/access",
    "headers": {
      "authorization": "[REDACTED]",
      "x-trace-id": "ba53ebbd-94f4-474b-ab3c-d81ddbf439d6",
      "content-type": "application/json"
    },
    "body": {
      "contract_version": "1.0.0",
      "vajra_subject": "cyber-p0-test-consenting-user-4312b0b439",
      "action": "read",
      "resource": {
        "type": "evidence",
        "id": "EV-P0-0001"
      },
      "purpose": "P0 verification (synthetic)"
    }
  },
  "response": {
    "status": 200,
    "headers": {
      "content-type": "application/json",
      "x-request-id": "1d580d68-fce5-4c5f-971e-e536aba19ef1",
      "x-trace-id": "ba53ebbd-94f4-474b-ab3c-d81ddbf439d6"
    },
    "body": {
      "contract_version": "1.0.0",
      "decision": "ALLOW",
      "reason_code": "ALLOWED_BY_VAJRA_AUTHORITY",
      "reason": "Access permitted: VAJRA authority state is 'USE', the granted scope includes 'read:evidence', the caller passed RBAC and VAJRA recorded the evidence.",
      "decision_id": "7dbd25f80d8f4972bdbb29ede992a60f",
      "trace_id": "ba53ebbd-94f4-474b-ab3c-d81ddbf439d6",
      "request_id": "1d580d68-fce5-4c5f-971e-e536aba19ef1",
      "idempotency_key": null,
      "duplicate": false,
      "actor_id": "cc_usr_2",
      "action": "read",
      "resource": {
        "type": "evidence",
        "id": "EV-P0-0001"
      },
      "vajra": {
        "subject_ref": "subj_sha256_79c1fee86e0a6f85",
        "status": "OK",
        "is_authorized": true,
        "current_state": "USE",
        "scope_checked": true
      },
      "evidence": {
        "local_audit_event_id": "0d5a4367-b651-46f1-b0d7-13ae3a116aaa",
        "superseded_audit_event_id": null,
        "vajra": {
          "status": "RECORDED",
          "http_status": 200,
          "detail": "",
          "data": {
            "evidence_hash": "sha256:1cfe1a78b2844cfbdcf0178d278fe94c682d38f1d1ea4cc3dff94227720ea1ea",
            "stored_in": [
              "TruthStore (tantra_truth.jsonl)"
            ],
            "recorded_at": 1793891615,
            "credential": "tantra_governance"
          }
        },
        "tantra": {
          "status": "NOT_CONFIGURED",
          "http_status": null,
          "detail": "TANTRA_VALIDATION_URL is not set"
        },
        "complete": false,
        "gaps": [
          "tantra"
        ]
      },
      "policy_applied": "vajra_authority_v1",
      "evaluated_at": "2026-11-05T15:13:34.526Z"
    }
  }
}
```

### DENY after VAJRA revocation (check S2-01)

```json
{
  "request": {
    "method": "POST",
    "url": "http://127.0.0.1:53155/api/v1/protected/access",
    "headers": {
      "authorization": "[REDACTED]",
      "x-trace-id": "2cb2e6f5-bec3-4c2c-8438-7c7798c97f6e",
      "content-type": "application/json"
    },
    "body": {
      "contract_version": "1.0.0",
      "vajra_subject": "cyber-p0-test-revocable-user-b5ba7b36c2",
      "action": "read",
      "resource": {
        "type": "evidence",
        "id": "EV-P0-0001"
      },
      "purpose": "P0 verification (synthetic)"
    }
  },
  "response": {
    "status": 200,
    "headers": {
      "content-type": "application/json",
      "x-request-id": "57b8e6b0-775a-4e15-83c0-4fd20b664460",
      "x-trace-id": "2cb2e6f5-bec3-4c2c-8438-7c7798c97f6e"
    },
    "body": {
      "contract_version": "1.0.0",
      "decision": "DENY",
      "reason_code": "VAJRA_AUTHORITY_NOT_GRANTED",
      "reason": "Access denied: VAJRA authority state is 'REVOKE', which does not permit access.",
      "decision_id": "d2ceea5f259f41e59eef9755752e654f",
      "trace_id": "2cb2e6f5-bec3-4c2c-8438-7c7798c97f6e",
      "request_id": "57b8e6b0-775a-4e15-83c0-4fd20b664460",
      "idempotency_key": null,
      "duplicate": false,
      "actor_id": "cc_usr_2",
      "action": "read",
      "resource": {
        "type": "evidence",
        "id": "EV-P0-0001"
      },
      "vajra": {
        "subject_ref": "subj_sha256_1385af754f31fe5e",
        "status": "OK",
        "is_authorized": false,
        "current_state": "REVOKE",
        "scope_checked": false
      },
      "evidence": {
        "local_audit_event_id": "128be5e2-7d5b-42a0-af92-63798b56cf68",
        "superseded_audit_event_id": null,
        "vajra": {
          "status": "RECORDED",
          "http_status": 200,
          "detail": "",
          "data": {
            "evidence_hash": "sha256:e8019bdb4e6c5e9f98bbc39db25895d1a658198fc8382d906b79c035d83b878b",
            "stored_in": [
              "TruthStore (tantra_truth.jsonl)"
            ],
            "recorded_at": 1793891606,
            "credential": "tantra_governance"
          }
        },
        "tantra": {
          "status": "NOT_CONFIGURED",
          "http_status": null,
          "detail": "TANTRA_VALIDATION_URL is not set"
        },
        "complete": false,
        "gaps": [
          "tantra"
        ]
      },
      "policy_applied": "vajra_authority_v1",
      "evaluated_at": "2026-11-05T15:13:25.603Z"
    }
  }
}
```

## 5. What changed (vs base commit, including new files)

```
added     .gitattributes
modified  .gitignore
added     ARCHITECTURE.md
added     BCAES_ALIGNMENT.md
added     CHANGELOG.md
added     DEP/README.md
added     HANDOVER.md
added     INTEGRATION.md
added     README.md
added     REVIEW_INDEX.md
modified  cybercrime/backend/.gitignore
modified  cybercrime/backend/app/api/v1/api.py
modified  cybercrime/backend/app/api/v1/endpoints/access.py
modified  cybercrime/backend/app/api/v1/endpoints/auth.py
modified  cybercrime/backend/app/api/v1/endpoints/authz.py
modified  cybercrime/backend/app/api/v1/endpoints/evidence.py
modified  cybercrime/backend/app/api/v1/endpoints/incidents.py
added     cybercrime/backend/app/api/v1/endpoints/protected_access.py
modified  cybercrime/backend/app/api/v1/endpoints/system_health.py
added     cybercrime/backend/app/api/v1/endpoints/threats.py
modified  cybercrime/backend/app/api/v1/schemas.py
added     cybercrime/backend/app/core/bhiv_runtime.py
modified  cybercrime/backend/app/core/config.py
modified  cybercrime/backend/app/core/rbac.py
modified  cybercrime/backend/app/core/sovereign_integrations.py
added     cybercrime/backend/app/core/threat_detection.py
modified  cybercrime/backend/app/db/models.py
added     cybercrime/backend/conftest.py
modified  cybercrime/backend/env.template
deleted   cybercrime/backend/event_buffer/events.jsonl
added     cybercrime/backend/fixtures/threat_scenarios.json
modified  cybercrime/backend/main.py
added     cybercrime/backend/requirements.lock.txt
added     cybercrime/backend/scripts/export_contract_schemas.py
added     cybercrime/backend/test_contract_schemas.py
added     cybercrime/backend/test_lane_fixes.py
deleted   cybercrime/backend/test_output.txt
added     cybercrime/backend/test_p0_runtime_bridge.py
added     cybercrime/backend/test_threat_scenarios.py
added     cybercrime/contracts/README.md
added     cybercrime/contracts/access_restore_request.v1.0.0.schema.json
added     cybercrime/contracts/access_restore_response.v1.0.0.schema.json
added     cybercrime/contracts/access_revocation_request.v1.0.0.schema.json
added     cybercrime/contracts/access_revocation_response.v1.0.0.schema.json
added     cybercrime/contracts/authz_check_request.v1.0.0.schema.json
added     cybercrime/contracts/authz_check_response.v1.0.0.schema.json
added     cybercrime/contracts/canonical_security_event.v1.0.0.schema.json
added     cybercrime/contracts/incident_report_request.v1.0.0.schema.json
added     cybercrime/contracts/incident_report_response.v1.0.0.schema.json
added     cybercrime/contracts/protected_access_request.v1.0.0.schema.json
added     cybercrime/contracts/protected_access_response.v1.0.0.schema.json
added     cybercrime/contracts/security_incident.v1.0.0.schema.json
modified  cybercrime/openapi.yaml
modified  cybercrime/rbac-permissions.json
deleted   investigation.db
added     verification/README.md
added     verification/build_reports.py
added     verification/capture_screenshots.py
added     verification/checks/__init__.py
added     verification/checks/scenarios.py
added     verification/defects.py
added     verification/determinism_check.py
added     verification/harness/__init__.py
added     verification/harness/redact.py
added     verification/harness/runner.py
added     verification/harness/services.py
added     verification/run_verification.py
added     evidence_packet/ and review_packets/ (186 generated files)
```

## 6. Failure cases

| Case | Check | Result in this run |
|---|---|---|
| TANTRA unreachable | S5-02 | PASS |
| TANTRA slow (never answers) | S5-05 | PASS |
| TANTRA rejects the contract | S5-01 | SKIPPED |
| VAJRA refuses the evidence token | S6-01 | PASS |
| VAJRA down | S6-02 | PASS |
| audit store not writable | S6-03 | PASS |
| VAJRA crash-restart (decision follows VAJRA) | S7-03 | PASS |
| VAJRA authority after restart | S7-05 | PASS |
| stored evidence tampered | S8-03 | PASS |
| key reused for another request | S4-04 | PASS |
| replay after revocation | S4-05 | PASS |

## 7. Proof

- Integrated run: 43 PASS, 7 FAIL, 0 ERROR, 0 BLOCKED, 4 SKIPPED of 54 ([test_results/TEST_REPORT.md](../../evidence_packet/test_results/TEST_REPORT.md)).
- Requirement mapping: [test_results/PROOF_MATRIX.md](../../evidence_packet/test_results/PROOF_MATRIX.md).
- Defects: [test_results/DEFECTS.md](../../evidence_packet/test_results/DEFECTS.md).
- Raw exchanges: `api_samples/<check>.json`; logs: `runtime_logs/`; replay: `replay_evidence/`; screenshots: `screenshots/`.

## 8. Repository coverage

Covered by checks: RBAC middleware, auth (login/register), access revoke (all three tiers), authz check, incident analysis, evidence upload, system health, failed-login detection and correlation, the protected-access route and bridge. Not covered: the React frontends, TTS, ML training scripts, most of fraud-evidence-system (its own Jest suite is reported).

## 9. Integration status

| Pillar | Status |
|---|---|
| VAJRA (local node, real code) | consent read, evidence record, bearer gate and lifecycle - OFFLINE-VERIFIED on a local node, consent SIMULATED |
| TANTRA (live services) | not exercised in this run. TANTRA was not called in this run (mode off, on purpose). The last run that called live TANTRA (read-only), `20261104T133229Z`, is archived under `previous_runs/20261104T133229Z/`; its TANTRA checks: O-02 PASS, S5-01 PASS, S5-04 PASS, S8-02 SKIPPED. The one TANTRA ledger write (S8-02) was made in run `20261104T103939Z`. |
| Threat assessment / correlation of access signals | PASS (P-C2) |

## 10. Deployment status

Local process deployment with health, crash-restart and recovery checks (deployment_proof/). VM: BLOCKED-EXTERNAL (no VM reference provided).

## 11. Known limitations

- VAJRA was run locally from its repository, commit `3cc883f` (VAJRA asks for no test records on its live node). Open VAJRA defects confirmed in this run: VAJ-05 (MEDIUM), VAJ-07 (HIGH), VAJ-10 (HIGH), VAJ-11 (HIGH), VAJ-12 (MEDIUM), VAJ-13 (HIGH), VAJ-14 (HIGH) (DEFECTS.md).
- ALLOW checks the scope VAJRA reports (S1-08 PASS) but does not bind the caller to the subject (CYB-13). With only the evidence-only VAJRA token, evidence writes fail and every decision fails closed (S6-05 FAIL), so this run gave the API the governance token, which also authorizes VAJRA transitions.
- TANTRA has no registered contract for cybersecurity events (TAN-01), so decisions are not in the TANTRA ledger.
- The harness plays the VAJRA user journey and TANTRA governance roles (labelled SIMULATED per check).
- Failed-login detection is a count rule (5 in 10 minutes per account), not a model; its confidence is a fixed function of the count. The protected-access rate limit is kept per process.
- The bridge, the checks and the fixes in other lanes (CHANGELOG.md) were written by the same person; review by the lane owners and the integration lead is requested.
