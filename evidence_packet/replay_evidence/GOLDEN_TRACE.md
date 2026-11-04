# Golden trace `cyber-p0-test-2eb753dd-f79b-4830-a7aa-9d079123534f`

One synthetic protected-access decision followed through every place it was recorded (check S8-01). VAJRA stores the decision under `<trace>::<decision_id>`; the audit event names that VAJRA row.

## 1. Request and response (Cybersecurity API)

```json
{
  "request": {
    "method": "POST",
    "url": "http://127.0.0.1:62636/api/v1/protected/access",
    "headers": {
      "authorization": "[REDACTED]",
      "x-trace-id": "cyber-p0-test-2eb753dd-f79b-4830-a7aa-9d079123534f",
      "content-type": "application/json"
    },
    "body": {
      "contract_version": "1.0.0",
      "vajra_subject": "cyber-p0-test-traced-03a296b147",
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
      "x-request-id": "2fe723a8-73b5-4594-8864-12680373ffac",
      "x-trace-id": "cyber-p0-test-2eb753dd-f79b-4830-a7aa-9d079123534f"
    },
    "body": {
      "contract_version": "1.0.0",
      "decision": "ALLOW",
      "reason_code": "ALLOWED_BY_VAJRA_AUTHORITY",
      "reason": "Access permitted: VAJRA authority state is 'USE', the caller passed RBAC and VAJRA recorded the evidence. Scope (action/resource) is not checked by VAJRA's verify contract.",
      "decision_id": "acea7a6dab934f76967d3641c8e1e998",
      "trace_id": "cyber-p0-test-2eb753dd-f79b-4830-a7aa-9d079123534f",
      "request_id": "2fe723a8-73b5-4594-8864-12680373ffac",
      "idempotency_key": null,
      "duplicate": false,
      "actor_id": "cc_usr_2",
      "action": "read",
      "resource": {
        "type": "evidence",
        "id": "EV-P0-0001"
      },
      "vajra": {
        "subject_ref": "subj_sha256_e4d5017b17026388",
        "status": "OK",
        "is_authorized": true,
        "current_state": "USE",
        "scope_checked": false
      },
      "evidence": {
        "local_audit_event_id": "7b5d3b0f-6baf-4ebb-8c6f-c4d14e4d0670",
        "superseded_audit_event_id": null,
        "vajra": {
          "status": "RECORDED",
          "http_status": 200,
          "detail": "",
          "data": {
            "evidence_hash": "sha256:74072fb04365640228aa51fbddf3bd77bda3c58036d650b2d91f960581948151",
            "stored_in": [
              "TruthStore (tantra_truth.jsonl)"
            ],
            "recorded_at": 1793795943
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
      "evaluated_at": "2026-11-04T12:39:02.054Z"
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
    "timestamp": "2026-11-04T12:39:02.701005"
  },
  "canonical_event": {
    "schema_version": "1.0.0",
    "event_id": "7b5d3b0f-6baf-4ebb-8c6f-c4d14e4d0670",
    "event_type": "protected_access.decision",
    "timestamp": "2026-11-04T12:39:02.700Z",
    "source_system": "cybercrime",
    "trace_id": "cyber-p0-test-2eb753dd-f79b-4830-a7aa-9d079123534f",
    "request_id": "2fe723a8-73b5-4594-8864-12680373ffac",
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
      "decision_id": "acea7a6dab934f76967d3641c8e1e998",
      "vajra_subject_ref": "subj_sha256_e4d5017b17026388",
      "vajra_status": "OK",
      "vajra_state": "USE",
      "vajra_trace_id": "cyber-p0-test-2eb753dd-f79b-4830-a7aa-9d079123534f::acea7a6dab934f76967d3641c8e1e998",
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
  "trace_id": "cyber-p0-test-2eb753dd-f79b-4830-a7aa-9d079123534f::acea7a6dab934f76967d3641c8e1e998",
  "execution_hash": "sha256:74072fb04365640228aa51fbddf3bd77bda3c58036d650b2d91f960581948151",
  "validation_hash": "sha256:74072fb04365640228aa51fbddf3bd77bda3c58036d650b2d91f960581948151",
  "replay_hash": "sha256:74072fb04365640228aa51fbddf3bd77bda3c58036d650b2d91f960581948151",
  "tx_hash": "evidence_cyber-p0-test-2eb753dd-f79b-4830-a7aa-9d079123534f::acea7a6dab934f76967d3641c8e1e998",
  "fraud_decision": "ALLOW",
  "timestamp": 1793795943,
  "prev_hash": "68198ccaec5ad12289a1603f10efd96b2565bf1faf71c42df7461026279bb8c2",
  "entry_hash": "7df2416ece290539884b1c15faaa1dc5a720efa5110322504273513596f81ffa"
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
