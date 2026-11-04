# REVIEW_PACKET - Cybersecurity P0 verification and BHIV runtime bridge

Branch `hemanth/p0-verification-2026-11-04` - base commit `59d2d63` (main, 2026-10-27). Generated from run `20261104T123826Z` (2026-11-04T12:38:41Z to 2026-11-04T12:40:53Z UTC, TANTRA mode `live`).

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

What ALLOW means: the caller passed RBAC, VAJRA reports GRANT or USE for the subject, and VAJRA recorded the evidence. The requested action and resource are not checked against a VAJRA scope (`vajra.scope_checked: false`, CYB-13).

Golden trace for review: `cyber-p0-test-2eb753dd-f79b-4830-a7aa-9d079123534f` (check S8-01). The id appears in the HTTP response and the audit store, and it prefixes the VAJRA TruthStore row id (`<trace>::<decision_id>`); see `replay_evidence/GOLDEN_TRACE.md`.

## 4. Real JSON request/response (recorded, secrets redacted)

### ALLOW (check P-A)

```json
{
  "request": {
    "method": "POST",
    "url": "http://127.0.0.1:62636/api/v1/protected/access",
    "headers": {
      "authorization": "[REDACTED]",
      "x-trace-id": "cyber-p0-test-7e43993b-848c-4bba-a937-f37c5aa17a19",
      "content-type": "application/json"
    },
    "body": {
      "contract_version": "1.0.0",
      "vajra_subject": "cyber-p0-test-consenting-user-02d9c4dcef",
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
      "x-request-id": "1c57faef-343e-4d40-9d10-f5118464006b",
      "x-trace-id": "cyber-p0-test-7e43993b-848c-4bba-a937-f37c5aa17a19"
    },
    "body": {
      "contract_version": "1.0.0",
      "decision": "ALLOW",
      "reason_code": "ALLOWED_BY_VAJRA_AUTHORITY",
      "reason": "Access permitted: VAJRA authority state is 'USE', the caller passed RBAC and VAJRA recorded the evidence. Scope (action/resource) is not checked by VAJRA's verify contract.",
      "decision_id": "12f1c777628e447eab6b40f5c135979c",
      "trace_id": "cyber-p0-test-7e43993b-848c-4bba-a937-f37c5aa17a19",
      "request_id": "1c57faef-343e-4d40-9d10-f5118464006b",
      "idempotency_key": null,
      "duplicate": false,
      "actor_id": "cc_usr_2",
      "action": "read",
      "resource": {
        "type": "evidence",
        "id": "EV-P0-0001"
      },
      "vajra": {
        "subject_ref": "subj_sha256_a18d8764270e0f7b",
        "status": "OK",
        "is_authorized": true,
        "current_state": "USE",
        "scope_checked": false
      },
      "evidence": {
        "local_audit_event_id": "1ee9abe0-8c0b-4fab-b03c-b2a45f35924a",
        "superseded_audit_event_id": null,
        "vajra": {
          "status": "RECORDED",
          "http_status": 200,
          "detail": "",
          "data": {
            "evidence_hash": "sha256:b0ad9d0b38bc14ed5a06222fbdac7aa36301ed2e5ab8410a19ee4d072272a283",
            "stored_in": [
              "TruthStore (tantra_truth.jsonl)"
            ],
            "recorded_at": 1793795940
          }
        },
        "tantra": {
          "status": "CONTRACT_REJECTED",
          "http_status": 422,
          "detail": "event_type_not_registered",
          "data": {
            "reason": "event_type_not_registered",
            "message": "event_type 'security_decision' is not registered for PRANA ingress",
            "registered_event_types": [
              "adaptive_decision",
              "bucket_memory_saved",
              "integrity_probe",
              "review_completed",
              "task_submit",
              "task_submit_failed",
              "truth_classification"
            ]
          }
        },
        "complete": false,
        "gaps": [
          "tantra"
        ]
      },
      "policy_applied": "vajra_authority_v1",
      "evaluated_at": "2026-11-04T12:38:59.331Z"
    }
  }
}
```

### DENY after VAJRA revocation (check S2-01)

```json
{
  "request": {
    "method": "POST",
    "url": "http://127.0.0.1:62636/api/v1/protected/access",
    "headers": {
      "authorization": "[REDACTED]",
      "x-trace-id": "023ac7f6-b70c-4cdf-9bab-0ae0617c1199",
      "content-type": "application/json"
    },
    "body": {
      "contract_version": "1.0.0",
      "vajra_subject": "cyber-p0-test-revocable-user-a977aebc34",
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
      "x-request-id": "272b3a0b-8ac3-4faa-96ab-6ed68a8030dc",
      "x-trace-id": "023ac7f6-b70c-4cdf-9bab-0ae0617c1199"
    },
    "body": {
      "contract_version": "1.0.0",
      "decision": "DENY",
      "reason_code": "VAJRA_AUTHORITY_NOT_GRANTED",
      "reason": "Access denied: VAJRA authority state is 'REVOKE', which does not permit access.",
      "decision_id": "922180069e7b4b89bfde6272288e1499",
      "trace_id": "023ac7f6-b70c-4cdf-9bab-0ae0617c1199",
      "request_id": "272b3a0b-8ac3-4faa-96ab-6ed68a8030dc",
      "idempotency_key": null,
      "duplicate": false,
      "actor_id": "cc_usr_2",
      "action": "read",
      "resource": {
        "type": "evidence",
        "id": "EV-P0-0001"
      },
      "vajra": {
        "subject_ref": "subj_sha256_101c1950530b4a1f",
        "status": "OK",
        "is_authorized": false,
        "current_state": "REVOKE",
        "scope_checked": false
      },
      "evidence": {
        "local_audit_event_id": "fbd38cd8-7629-4229-be8f-344dd2cca1f3",
        "superseded_audit_event_id": null,
        "vajra": {
          "status": "RECORDED",
          "http_status": 200,
          "detail": "",
          "data": {
            "evidence_hash": "sha256:224a9ebf0e8b4d07c5301d3df43a7b8db3c4116d053a593468bfa0449fa1e016",
            "stored_in": [
              "TruthStore (tantra_truth.jsonl)"
            ],
            "recorded_at": 1793795928
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
      "evaluated_at": "2026-11-04T12:38:47.444Z"
    }
  }
}
```

### TANTRA contract gate rejects the security event (check S5-01, live TANTRA)

```json
{
  "response_evidence": {
    "local_audit_event_id": "87d504a1-b221-4199-90ea-726c73b3dea6",
    "superseded_audit_event_id": null,
    "vajra": {
      "status": "RECORDED",
      "http_status": 200,
      "detail": "",
      "data": {
        "evidence_hash": "sha256:e7af5df8998acb1c713b6a2b94381b1acd73dc40127f5fc6319e612640c9079a",
        "stored_in": [
          "TruthStore (tantra_truth.jsonl)"
        ],
        "recorded_at": 1793795945
      }
    },
    "tantra": {
      "status": "CONTRACT_REJECTED",
      "http_status": 422,
      "detail": "event_type_not_registered",
      "data": {
        "reason": "event_type_not_registered",
        "message": "event_type 'security_decision' is not registered for PRANA ingress",
        "registered_event_types": [
          "adaptive_decision",
          "bucket_memory_saved",
          "integrity_probe",
          "review_completed",
          "task_submit",
          "task_submit_failed",
          "truth_classification"
        ]
      }
    },
    "complete": false,
    "gaps": [
      "tantra"
    ]
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
modified  cybercrime/backend/main.py
added     cybercrime/backend/test_lane_fixes.py
deleted   cybercrime/backend/test_output.txt
added     cybercrime/backend/test_p0_runtime_bridge.py
modified  cybercrime/openapi.yaml
modified  cybercrime/rbac-permissions.json
deleted   investigation.db
added     verification/README.md
added     verification/build_reports.py
added     verification/capture_screenshots.py
added     verification/checks/__init__.py
added     verification/checks/scenarios.py
added     verification/defects.py
added     verification/harness/__init__.py
added     verification/harness/redact.py
added     verification/harness/runner.py
added     verification/harness/services.py
added     verification/run_verification.py
added     evidence_packet/ and review_packets/ (103 generated files)
```

## 6. Failure cases

| Case | Check | Result in this run |
|---|---|---|
| TANTRA unreachable | S5-02 | PASS |
| TANTRA slow (never answers) | S5-05 | PASS |
| TANTRA rejects the contract | S5-01 | PASS |
| VAJRA refuses the evidence token | S6-01 | PASS |
| VAJRA down | S6-02 | PASS |
| audit store not writable | S6-03 | PASS |
| VAJRA crash-restart (decision follows VAJRA) | S7-03 | PASS |
| VAJRA authority after restart | S7-05 | FAIL |
| stored evidence tampered | S8-03 | PASS |
| key reused for another request | S4-04 | PASS |
| replay after revocation | S4-05 | PASS |

## 7. Proof

- Integrated run: 42 PASS, 3 FAIL, 0 ERROR, 0 BLOCKED, 1 SKIPPED of 46 ([test_results/TEST_REPORT.md](../../evidence_packet/test_results/TEST_REPORT.md)).
- Requirement mapping: [test_results/PROOF_MATRIX.md](../../evidence_packet/test_results/PROOF_MATRIX.md).
- Defects: [test_results/DEFECTS.md](../../evidence_packet/test_results/DEFECTS.md).
- Raw exchanges: `api_samples/<check>.json`; logs: `runtime_logs/`; replay: `replay_evidence/`; screenshots: `screenshots/`.

## 8. Repository coverage

Covered by checks: RBAC middleware, auth (login/register), access revoke (all three tiers), authz check, incident analysis, evidence upload, system health, failed-login detection and correlation, the protected-access route and bridge. Not covered: the React frontends, TTS, ML training scripts, most of fraud-evidence-system (its own Jest suite is reported).

## 9. Integration status

| Pillar | Status |
|---|---|
| VAJRA (local node, real code) | consent read, evidence record, bearer gate and lifecycle - OFFLINE-VERIFIED on a local node, consent SIMULATED |
| TANTRA (live services) | contract gate exercised live (PASS); registered probe contract written and replay-verified in run 20261104T103939Z (S8-02 PASS there, carried over; not repeated) |
| Threat assessment / correlation of access signals | PASS (P-C2) |

## 10. Deployment status

Local process deployment with health, crash-restart and recovery checks (deployment_proof/). VM: BLOCKED-EXTERNAL (no VM reference provided).

## 11. Known limitations

- VAJRA was run locally from its repository (VAJRA asks for no test records on its live node). VAJRA authority state is held in memory (VAJ-02).
- ALLOW does not check scope or bind the caller to the subject (CYB-13); the VAJRA token is unscoped (it also authorizes VAJRA transitions).
- TANTRA has no registered contract for cybersecurity events (TAN-01), so decisions are not in the TANTRA ledger.
- The harness plays the VAJRA user journey and TANTRA governance roles (labelled SIMULATED per check).
- Failed-login detection is a count rule (5 in 10 minutes per account), not a model; its confidence is a fixed function of the count. The protected-access rate limit is kept per process.
- The bridge, the checks and the fixes in other lanes (CHANGELOG.md) were written by the same person; review by the lane owners and the integration lead is requested.
