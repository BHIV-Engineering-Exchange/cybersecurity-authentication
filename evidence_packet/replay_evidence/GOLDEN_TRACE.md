# Golden trace `cyber-p0-test-80c17aba-e107-426e-af95-7904ea5c1eb1`

One synthetic protected-access decision followed through every place it was recorded (check S8-01). VAJRA stores the decision under `<trace>::<decision_id>`; the audit event names that VAJRA row.

## 1. Request and response (Cybersecurity API)

```json
{
  "request": {
    "method": "POST",
    "url": "http://127.0.0.1:51300/api/v1/protected/access",
    "headers": {
      "authorization": "[REDACTED]",
      "x-trace-id": "cyber-p0-test-80c17aba-e107-426e-af95-7904ea5c1eb1",
      "content-type": "application/json"
    },
    "body": {
      "contract_version": "1.0.0",
      "vajra_subject": "cyber-p0-test-traced-3edd842050",
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
      "x-request-id": "481022e7-8c88-409c-a08d-373ee4e707cf",
      "x-trace-id": "cyber-p0-test-80c17aba-e107-426e-af95-7904ea5c1eb1"
    },
    "body": {
      "contract_version": "1.0.0",
      "decision": "ALLOW",
      "reason_code": "ALLOWED_BY_VAJRA_AUTHORITY",
      "reason": "Access permitted: VAJRA authority state is 'USE', the caller passed RBAC and VAJRA recorded the evidence. Scope (action/resource) is not checked by VAJRA's verify contract.",
      "decision_id": "1a5b84c3e2b243b2b5de34dab842fb31",
      "trace_id": "cyber-p0-test-80c17aba-e107-426e-af95-7904ea5c1eb1",
      "request_id": "481022e7-8c88-409c-a08d-373ee4e707cf",
      "idempotency_key": null,
      "duplicate": false,
      "actor_id": "cc_usr_2",
      "action": "read",
      "resource": {
        "type": "evidence",
        "id": "EV-P0-0001"
      },
      "vajra": {
        "subject_ref": "subj_sha256_c9599dc51d8c00fc",
        "status": "OK",
        "is_authorized": true,
        "current_state": "USE",
        "scope_checked": false
      },
      "evidence": {
        "local_audit_event_id": "bbe66d6d-5ab4-4f3d-8e42-11fc61c0ecbd",
        "superseded_audit_event_id": null,
        "vajra": {
          "status": "RECORDED",
          "http_status": 200,
          "detail": "",
          "data": {
            "evidence_hash": "sha256:97724ad07d01e82eaac19ae146b5f30466f6646d717cf82a2a44695a1d525adc",
            "stored_in": [
              "TruthStore (tantra_truth.jsonl)"
            ],
            "recorded_at": 1793788815
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
      "evaluated_at": "2026-11-04T10:40:14.464Z"
    }
  }
}
```

## 2. Canonical audit event (Cybersecurity audit store)

```json
{
  "audit_row": {
    "id": 20,
    "action": "protected_access.decision:read",
    "status": "success",
    "entity_type": "evidence",
    "entity_id": "EV-P0-0001",
    "timestamp": "2026-11-04T10:40:15.068060"
  },
  "canonical_event": {
    "schema_version": "1.0.0",
    "event_id": "bbe66d6d-5ab4-4f3d-8e42-11fc61c0ecbd",
    "event_type": "protected_access.decision",
    "timestamp": "2026-11-04T10:40:15.068Z",
    "source_system": "cybercrime",
    "trace_id": "cyber-p0-test-80c17aba-e107-426e-af95-7904ea5c1eb1",
    "request_id": "481022e7-8c88-409c-a08d-373ee4e707cf",
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
      "decision_id": "1a5b84c3e2b243b2b5de34dab842fb31",
      "vajra_subject_ref": "subj_sha256_c9599dc51d8c00fc",
      "vajra_status": "OK",
      "vajra_state": "USE",
      "vajra_trace_id": "cyber-p0-test-80c17aba-e107-426e-af95-7904ea5c1eb1::1a5b84c3e2b243b2b5de34dab842fb31",
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
  "trace_id": "cyber-p0-test-80c17aba-e107-426e-af95-7904ea5c1eb1::1a5b84c3e2b243b2b5de34dab842fb31",
  "execution_hash": "sha256:97724ad07d01e82eaac19ae146b5f30466f6646d717cf82a2a44695a1d525adc",
  "validation_hash": "sha256:97724ad07d01e82eaac19ae146b5f30466f6646d717cf82a2a44695a1d525adc",
  "replay_hash": "sha256:97724ad07d01e82eaac19ae146b5f30466f6646d717cf82a2a44695a1d525adc",
  "tx_hash": "evidence_cyber-p0-test-80c17aba-e107-426e-af95-7904ea5c1eb1::1a5b84c3e2b243b2b5de34dab842fb31",
  "fraud_decision": "ALLOW",
  "timestamp": 1793788815,
  "prev_hash": "175c0c5e1231218ced1ce95da033f9b9079bd1241b7a8f4db6e4b411f072fcb9",
  "entry_hash": "80e2e2ebd2c320ee614d3421d342276e3b7bdbfcf82512b7350db574e02fd5d2"
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
