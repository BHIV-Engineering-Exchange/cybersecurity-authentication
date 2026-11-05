# Golden trace `b87529b7-cd7a-42fb-9be6-a2b0f5a5a30e`

One synthetic protected-access decision followed through every place it was recorded (check S8-01). VAJRA stores the decision under `<trace>::<decision_id>`; the audit event names that VAJRA row.

## 1. Request and response (Cybersecurity API)

```json
{
  "request": {
    "method": "POST",
    "url": "http://127.0.0.1:56282/api/v1/protected/access",
    "headers": {
      "authorization": "[REDACTED]",
      "x-trace-id": "b87529b7-cd7a-42fb-9be6-a2b0f5a5a30e",
      "content-type": "application/json"
    },
    "body": {
      "contract_version": "1.0.0",
      "vajra_subject": "cyber-p0-test-traced-614268e1f4",
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
      "x-request-id": "5fc48c34-3c0c-492d-b8c3-693a821d8a91",
      "x-trace-id": "b87529b7-cd7a-42fb-9be6-a2b0f5a5a30e"
    },
    "body": {
      "contract_version": "1.0.0",
      "decision": "ALLOW",
      "reason_code": "ALLOWED_BY_VAJRA_AUTHORITY",
      "reason": "Access permitted: VAJRA authority state is 'USE', the granted scope includes 'read:evidence', the caller passed RBAC and VAJRA recorded the evidence.",
      "decision_id": "57a15ba90703430d85f5973b6a27c897",
      "trace_id": "b87529b7-cd7a-42fb-9be6-a2b0f5a5a30e",
      "request_id": "5fc48c34-3c0c-492d-b8c3-693a821d8a91",
      "idempotency_key": null,
      "duplicate": false,
      "actor_id": "cc_usr_2",
      "action": "read",
      "resource": {
        "type": "evidence",
        "id": "EV-P0-0001"
      },
      "vajra": {
        "subject_ref": "subj_sha256_d3f49615d10ab745",
        "status": "OK",
        "is_authorized": true,
        "current_state": "USE",
        "scope_checked": true
      },
      "evidence": {
        "local_audit_event_id": "3325c83e-83ae-4485-9913-b96c7c089c6d",
        "superseded_audit_event_id": null,
        "vajra": {
          "status": "RECORDED",
          "http_status": 200,
          "detail": "",
          "data": {
            "evidence_hash": "sha256:5a9ca43d12be148d65080c8673038d81787882222fe21eb8fcbe4d70768f99da",
            "stored_in": [
              "TruthStore (tantra_truth.jsonl)"
            ],
            "recorded_at": 1793889172,
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
      "evaluated_at": "2026-11-05T14:32:51.742Z"
    }
  }
}
```

## 2. Canonical audit event (Cybersecurity audit store)

```json
{
  "audit_row": {
    "id": 26,
    "action": "protected_access.decision:read",
    "status": "success",
    "entity_type": "evidence",
    "entity_id": "EV-P0-0001",
    "timestamp": "2026-11-05T14:32:51.942275"
  },
  "canonical_event": {
    "schema_version": "1.0.0",
    "event_id": "3325c83e-83ae-4485-9913-b96c7c089c6d",
    "event_type": "protected_access.decision",
    "timestamp": "2026-11-05T14:32:51.941Z",
    "source_system": "cybercrime",
    "trace_id": "b87529b7-cd7a-42fb-9be6-a2b0f5a5a30e",
    "request_id": "5fc48c34-3c0c-492d-b8c3-693a821d8a91",
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
      "message": "Access permitted: VAJRA authority state is 'USE', the granted scope includes 'read:evidence', the caller passed RBAC and VAJRA recorded the evidence."
    },
    "policy_reference": {
      "policy_id": "vajra_authority_v1",
      "rule_name": "vajra_authority_verify",
      "enforcement_mode": "mandatory",
      "boundary_checked": null
    },
    "metadata": {
      "decision_id": "57a15ba90703430d85f5973b6a27c897",
      "vajra_subject_ref": "subj_sha256_d3f49615d10ab745",
      "vajra_status": "OK",
      "vajra_state": "USE",
      "vajra_authority": "AUTH_ROLE_CLIENT",
      "vajra_trace_id": "b87529b7-cd7a-42fb-9be6-a2b0f5a5a30e::57a15ba90703430d85f5973b6a27c897",
      "scope_checked": true,
      "required_scope": "read:evidence",
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
  "trace_id": "b87529b7-cd7a-42fb-9be6-a2b0f5a5a30e::57a15ba90703430d85f5973b6a27c897",
  "execution_hash": "sha256:5a9ca43d12be148d65080c8673038d81787882222fe21eb8fcbe4d70768f99da",
  "validation_hash": "sha256:5a9ca43d12be148d65080c8673038d81787882222fe21eb8fcbe4d70768f99da",
  "replay_hash": "sha256:5a9ca43d12be148d65080c8673038d81787882222fe21eb8fcbe4d70768f99da",
  "tx_hash": "evidence_b87529b7-cd7a-42fb-9be6-a2b0f5a5a30e::57a15ba90703430d85f5973b6a27c897",
  "fraud_decision": "ALLOW",
  "timestamp": 1793889172,
  "prev_hash": "7e486ead0775b6900569bc8dc650b4b07f82d48466d212daf9c28bf5b18f24fa",
  "entry_hash": "6d75c985fa551aaab1853dd6d4fc1266cc695d8b22199a1cff4f977afc4dfe20"
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
