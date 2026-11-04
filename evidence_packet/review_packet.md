# REVIEW_PACKET - Cybersecurity P0 verification and BHIV runtime bridge

Branch `hemanth/p0-verification-2026-11-04` - base commit `59d2d63` (main, 2026-10-27). Generated from run `20261104T133229Z` (2026-11-04T13:32:47Z to 2026-11-04T13:34:57Z UTC, TANTRA mode `live`).

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

Golden trace for review: `cyber-p0-test-1f574eec-e2dc-47a1-888c-ddeadd919e77` (check S8-01). The id appears in the HTTP response and the audit store, and it prefixes the VAJRA TruthStore row id (`<trace>::<decision_id>`); see `replay_evidence/GOLDEN_TRACE.md`.

## 4. Real JSON request/response (recorded, secrets redacted)

### ALLOW (check P-A)

```json
{
  "request": {
    "method": "POST",
    "url": "http://127.0.0.1:62513/api/v1/protected/access",
    "headers": {
      "authorization": "[REDACTED]",
      "x-trace-id": "cyber-p0-test-2bac3fe6-29e1-4c70-b81d-ca01188a9127",
      "content-type": "application/json"
    },
    "body": {
      "contract_version": "1.0.0",
      "vajra_subject": "cyber-p0-test-consenting-user-5db9e34290",
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
      "x-request-id": "17c696bb-485c-4908-80cf-b36f8381ddf1",
      "x-trace-id": "cyber-p0-test-2bac3fe6-29e1-4c70-b81d-ca01188a9127"
    },
    "body": {
      "contract_version": "1.0.0",
      "decision": "ALLOW",
      "reason_code": "ALLOWED_BY_VAJRA_AUTHORITY",
      "reason": "Access permitted: VAJRA authority state is 'USE', the caller passed RBAC and VAJRA recorded the evidence. Scope (action/resource) is not checked by VAJRA's verify contract.",
      "decision_id": "b8855859f42f4fa784dd5e9ac53e5527",
      "trace_id": "cyber-p0-test-2bac3fe6-29e1-4c70-b81d-ca01188a9127",
      "request_id": "17c696bb-485c-4908-80cf-b36f8381ddf1",
      "idempotency_key": null,
      "duplicate": false,
      "actor_id": "cc_usr_2",
      "action": "read",
      "resource": {
        "type": "evidence",
        "id": "EV-P0-0001"
      },
      "vajra": {
        "subject_ref": "subj_sha256_cd9acea8b297ae43",
        "status": "OK",
        "is_authorized": true,
        "current_state": "USE",
        "scope_checked": false
      },
      "evidence": {
        "local_audit_event_id": "ddbc1036-f1d7-4123-a74d-bc8c14cf9aad",
        "superseded_audit_event_id": null,
        "vajra": {
          "status": "RECORDED",
          "http_status": 200,
          "detail": "",
          "data": {
            "evidence_hash": "sha256:8f993fb1b510eb5747040dbfa56526cf0c5793b6cc228556057628db2b8af513",
            "stored_in": [
              "TruthStore (tantra_truth.jsonl)"
            ],
            "recorded_at": 1793799190
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
      "evaluated_at": "2026-11-04T13:33:08.844Z"
    }
  }
}
```

### DENY after VAJRA revocation (check S2-01)

```json
{
  "request": {
    "method": "POST",
    "url": "http://127.0.0.1:62513/api/v1/protected/access",
    "headers": {
      "authorization": "[REDACTED]",
      "x-trace-id": "9b47b68f-090d-4aa5-b2e7-f122314fa360",
      "content-type": "application/json"
    },
    "body": {
      "contract_version": "1.0.0",
      "vajra_subject": "cyber-p0-test-revocable-user-8c03db452e",
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
      "x-request-id": "b09afdd4-3681-494f-b517-7772590cf6a8",
      "x-trace-id": "9b47b68f-090d-4aa5-b2e7-f122314fa360"
    },
    "body": {
      "contract_version": "1.0.0",
      "decision": "DENY",
      "reason_code": "VAJRA_AUTHORITY_NOT_GRANTED",
      "reason": "Access denied: VAJRA authority state is 'REVOKE', which does not permit access.",
      "decision_id": "455b803fc9804366baff9d4719b7ace8",
      "trace_id": "9b47b68f-090d-4aa5-b2e7-f122314fa360",
      "request_id": "b09afdd4-3681-494f-b517-7772590cf6a8",
      "idempotency_key": null,
      "duplicate": false,
      "actor_id": "cc_usr_2",
      "action": "read",
      "resource": {
        "type": "evidence",
        "id": "EV-P0-0001"
      },
      "vajra": {
        "subject_ref": "subj_sha256_67038b3cd1ba5df1",
        "status": "OK",
        "is_authorized": false,
        "current_state": "REVOKE",
        "scope_checked": false
      },
      "evidence": {
        "local_audit_event_id": "8a3ddaf8-62d3-4020-a9a7-d1168521fe0f",
        "superseded_audit_event_id": null,
        "vajra": {
          "status": "RECORDED",
          "http_status": 200,
          "detail": "",
          "data": {
            "evidence_hash": "sha256:b307f37fc48f7771214eca64e3e9c27961cf13d1c2b97efd5e27e9e8af1ad9cb",
            "stored_in": [
              "TruthStore (tantra_truth.jsonl)"
            ],
            "recorded_at": 1793799176
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
      "evaluated_at": "2026-11-04T13:32:54.708Z"
    }
  }
}
```

### TANTRA contract gate rejects the security event (check S5-01, live TANTRA)

```json
{
  "response_evidence": {
    "local_audit_event_id": "a1267294-d90f-4a93-8fab-458b75c0e2f7",
    "superseded_audit_event_id": null,
    "vajra": {
      "status": "RECORDED",
      "http_status": 200,
      "detail": "",
      "data": {
        "evidence_hash": "sha256:3f802af79ff47cf58b9cb44a9eb16f93c21e17b41e31529236c93e4a86bde83c",
        "stored_in": [
          "TruthStore (tantra_truth.jsonl)"
        ],
        "recorded_at": 1793799196
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
added     evidence_packet/ and review_packets/ (116 generated files)
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

- Integrated run: 42 PASS, 3 FAIL, 0 ERROR, 0 BLOCKED, 1 SKIPPED of 46 ([test_results/TEST_REPORT.md](test_results/TEST_REPORT.md)).
- Requirement mapping: [test_results/PROOF_MATRIX.md](test_results/PROOF_MATRIX.md).
- Defects: [test_results/DEFECTS.md](test_results/DEFECTS.md).
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
