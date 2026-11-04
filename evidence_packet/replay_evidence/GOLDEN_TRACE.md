# Golden trace `cyber-p0-test-da205076-03ac-4a39-b08b-484d5f6798b8`

One synthetic protected-access decision followed through every place it was recorded (check S8-01). VAJRA stores the decision under `<trace>::<decision_id>`; the audit event names that VAJRA row.

## 1. Request and response (Cybersecurity API)

```json
{
  "request": {
    "method": "POST",
    "url": "http://127.0.0.1:57509/api/v1/protected/access",
    "headers": {
      "authorization": "[REDACTED]",
      "x-trace-id": "cyber-p0-test-da205076-03ac-4a39-b08b-484d5f6798b8",
      "content-type": "application/json"
    },
    "body": {
      "contract_version": "1.0.0",
      "vajra_subject": "cyber-p0-test-traced-61664c14d9",
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
      "x-request-id": "3df89ae8-c8de-485d-9e00-762b599f6d69",
      "x-trace-id": "cyber-p0-test-da205076-03ac-4a39-b08b-484d5f6798b8"
    },
    "body": {
      "contract_version": "1.0.0",
      "decision": "ALLOW",
      "reason_code": "ALLOWED_BY_VAJRA_AUTHORITY",
      "reason": "Access permitted: VAJRA authority state is 'USE', the caller passed RBAC and VAJRA recorded the evidence. Scope (action/resource) is not checked by VAJRA's verify contract.",
      "decision_id": "4cf67ca2a4fc40bc8f817be507ebfdee",
      "trace_id": "cyber-p0-test-da205076-03ac-4a39-b08b-484d5f6798b8",
      "request_id": "3df89ae8-c8de-485d-9e00-762b599f6d69",
      "idempotency_key": null,
      "duplicate": false,
      "actor_id": "cc_usr_2",
      "action": "read",
      "resource": {
        "type": "evidence",
        "id": "EV-P0-0001"
      },
      "vajra": {
        "subject_ref": "subj_sha256_a68314892131cc53",
        "status": "OK",
        "is_authorized": true,
        "current_state": "USE",
        "scope_checked": false
      },
      "evidence": {
        "local_audit_event_id": "4421ff08-7b30-46a4-bedc-60cb73084a41",
        "superseded_audit_event_id": null,
        "vajra": {
          "status": "RECORDED",
          "http_status": 200,
          "detail": "",
          "data": {
            "evidence_hash": "sha256:8ef4031553f1976173c21f52862f1bae965b3ac2ff30b79c4feb1f20b078fc89",
            "stored_in": [
              "TruthStore (tantra_truth.jsonl)"
            ],
            "recorded_at": 1793793945
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
      "evaluated_at": "2026-11-04T12:05:44.003Z"
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
    "timestamp": "2026-11-04T12:05:44.845377"
  },
  "canonical_event": {
    "schema_version": "1.0.0",
    "event_id": "4421ff08-7b30-46a4-bedc-60cb73084a41",
    "event_type": "protected_access.decision",
    "timestamp": "2026-11-04T12:05:44.842Z",
    "source_system": "cybercrime",
    "trace_id": "cyber-p0-test-da205076-03ac-4a39-b08b-484d5f6798b8",
    "request_id": "3df89ae8-c8de-485d-9e00-762b599f6d69",
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
      "decision_id": "4cf67ca2a4fc40bc8f817be507ebfdee",
      "vajra_subject_ref": "subj_sha256_a68314892131cc53",
      "vajra_status": "OK",
      "vajra_state": "USE",
      "vajra_trace_id": "cyber-p0-test-da205076-03ac-4a39-b08b-484d5f6798b8::4cf67ca2a4fc40bc8f817be507ebfdee",
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
  "trace_id": "cyber-p0-test-da205076-03ac-4a39-b08b-484d5f6798b8::4cf67ca2a4fc40bc8f817be507ebfdee",
  "execution_hash": "sha256:8ef4031553f1976173c21f52862f1bae965b3ac2ff30b79c4feb1f20b078fc89",
  "validation_hash": "sha256:8ef4031553f1976173c21f52862f1bae965b3ac2ff30b79c4feb1f20b078fc89",
  "replay_hash": "sha256:8ef4031553f1976173c21f52862f1bae965b3ac2ff30b79c4feb1f20b078fc89",
  "tx_hash": "evidence_cyber-p0-test-da205076-03ac-4a39-b08b-484d5f6798b8::4cf67ca2a4fc40bc8f817be507ebfdee",
  "fraud_decision": "ALLOW",
  "timestamp": 1793793945,
  "prev_hash": "35831623afe621673e8013f527d7c97c0ba60ce7cf7ee7c1533b9ed6d00f5d57",
  "entry_hash": "b93220c4a6fa1cfa14bc997b20cddf84a6ff4a1e01e7bd1cce779c3359bca26a"
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
