# Golden trace `cyber-p0-test-1f574eec-e2dc-47a1-888c-ddeadd919e77`

One synthetic protected-access decision followed through every place it was recorded (check S8-01). VAJRA stores the decision under `<trace>::<decision_id>`; the audit event names that VAJRA row.

## 1. Request and response (Cybersecurity API)

```json
{
  "request": {
    "method": "POST",
    "url": "http://127.0.0.1:62513/api/v1/protected/access",
    "headers": {
      "authorization": "[REDACTED]",
      "x-trace-id": "cyber-p0-test-1f574eec-e2dc-47a1-888c-ddeadd919e77",
      "content-type": "application/json"
    },
    "body": {
      "contract_version": "1.0.0",
      "vajra_subject": "cyber-p0-test-traced-fbb67a88d0",
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
      "x-request-id": "ba1d0bf1-9a08-4a02-8b55-0d02850ad2e4",
      "x-trace-id": "cyber-p0-test-1f574eec-e2dc-47a1-888c-ddeadd919e77"
    },
    "body": {
      "contract_version": "1.0.0",
      "decision": "ALLOW",
      "reason_code": "ALLOWED_BY_VAJRA_AUTHORITY",
      "reason": "Access permitted: VAJRA authority state is 'USE', the caller passed RBAC and VAJRA recorded the evidence. Scope (action/resource) is not checked by VAJRA's verify contract.",
      "decision_id": "364826d5b0d04140ab72965389a1e092",
      "trace_id": "cyber-p0-test-1f574eec-e2dc-47a1-888c-ddeadd919e77",
      "request_id": "ba1d0bf1-9a08-4a02-8b55-0d02850ad2e4",
      "idempotency_key": null,
      "duplicate": false,
      "actor_id": "cc_usr_2",
      "action": "read",
      "resource": {
        "type": "evidence",
        "id": "EV-P0-0001"
      },
      "vajra": {
        "subject_ref": "subj_sha256_a8f50d05637f8368",
        "status": "OK",
        "is_authorized": true,
        "current_state": "USE",
        "scope_checked": false
      },
      "evidence": {
        "local_audit_event_id": "0a96efea-4d21-4720-be42-ed3d3df49b52",
        "superseded_audit_event_id": null,
        "vajra": {
          "status": "RECORDED",
          "http_status": 200,
          "detail": "",
          "data": {
            "evidence_hash": "sha256:83865c8477b957be6b68940fa4f47a6aab7e2e4dbed17194d5e8d54eff87ac91",
            "stored_in": [
              "TruthStore (tantra_truth.jsonl)"
            ],
            "recorded_at": 1793799193
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
      "evaluated_at": "2026-11-04T13:33:11.722Z"
    }
  }
}
```

## 2. Canonical audit event (Cybersecurity audit store)

```json
{
  "audit_row": {
    "id": 21,
    "action": "protected_access.decision:read",
    "status": "success",
    "entity_type": "evidence",
    "entity_id": "EV-P0-0001",
    "timestamp": "2026-11-04T13:33:12.411620"
  },
  "canonical_event": {
    "schema_version": "1.0.0",
    "event_id": "0a96efea-4d21-4720-be42-ed3d3df49b52",
    "event_type": "protected_access.decision",
    "timestamp": "2026-11-04T13:33:12.411Z",
    "source_system": "cybercrime",
    "trace_id": "cyber-p0-test-1f574eec-e2dc-47a1-888c-ddeadd919e77",
    "request_id": "ba1d0bf1-9a08-4a02-8b55-0d02850ad2e4",
    "actor": {
      "actor_id": "cc_usr_2",
      "actor_type": "user",
      "role": "investigator",
      "display_name": null,
      "authenticated": true,
      "auth_method": "bearer_jwt"
    },
    "action": "read",
    "resource": {
      "resource_type": "evidence",
      "resource_id": "EV-P0-0001",
      "case_id": null,
      "target_address": null,
      "integrity_hash": null
    },
    "outcome": {
      "status": "SUCCESS",
      "status_code": 200,
      "reason_code": "ALLOWED_BY_VAJRA_AUTHORITY",
      "message": "Access permitted: VAJRA authority state is 'USE', the caller passed RBAC and VAJRA recorded the evidence. Scope (action/resource) is not checked by VAJRA's verify contract."
    },
    "policy_reference": {
      "policy_id": "vajra_authority_v1",
      "rule_name": "vajra_authority_verify",
      "enforcement_mode": "mandatory",
      "boundary_checked": null
    },
    "metadata": {
      "decision_id": "364826d5b0d04140ab72965389a1e092",
      "vajra_subject_ref": "subj_sha256_a8f50d05637f8368",
      "vajra_status": "OK",
      "vajra_state": "USE",
      "vajra_trace_id": "cyber-p0-test-1f574eec-e2dc-47a1-888c-ddeadd919e77::364826d5b0d04140ab72965389a1e092",
      "scope_checked": false,
      "purpose": "P0 verification (synthetic)",
      "idempotency_key": {},
      "decision": "ALLOW"
    },
    "extensions": null
  }
}
```

## 3. VAJRA TruthStore row (hash-chained)

```json
{
  "trace_id": "cyber-p0-test-1f574eec-e2dc-47a1-888c-ddeadd919e77::364826d5b0d04140ab72965389a1e092",
  "execution_hash": "sha256:83865c8477b957be6b68940fa4f47a6aab7e2e4dbed17194d5e8d54eff87ac91",
  "validation_hash": "sha256:83865c8477b957be6b68940fa4f47a6aab7e2e4dbed17194d5e8d54eff87ac91",
  "replay_hash": "sha256:83865c8477b957be6b68940fa4f47a6aab7e2e4dbed17194d5e8d54eff87ac91",
  "tx_hash": "evidence_cyber-p0-test-1f574eec-e2dc-47a1-888c-ddeadd919e77::364826d5b0d04140ab72965389a1e092",
  "fraud_decision": "ALLOW",
  "timestamp": 1793799193,
  "prev_hash": "26ce42008a05a142914244532ec1008bd7ddd2a0b04632948f61b8ef37c54f89",
  "entry_hash": "55dc7ea5bac3e0a76f031c444a0817f5854e62f19b52052648f22f1735a87e76"
}
```

## 4. VAJRA chain integrity right after the decision

```json
{
  "intact": true,
  "message": "truth store chain is intact — no tampering detected",
  "success": true
}
```
