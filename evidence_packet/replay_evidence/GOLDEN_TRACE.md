# Golden trace `9f09a114-cd0f-46c4-bceb-f3714bbe513a`

One synthetic protected-access decision followed through every place it was recorded (check S8-01). VAJRA stores the decision under `<trace>::<decision_id>`; the audit event names that VAJRA row.

## 1. Request and response (Cybersecurity API)

```json
{
  "request": {
    "method": "POST",
    "url": "http://127.0.0.1:53155/api/v1/protected/access",
    "headers": {
      "authorization": "[REDACTED]",
      "x-trace-id": "9f09a114-cd0f-46c4-bceb-f3714bbe513a",
      "content-type": "application/json"
    },
    "body": {
      "contract_version": "1.0.0",
      "vajra_subject": "cyber-p0-test-traced-28220d752a",
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
      "x-request-id": "9a404d0a-320e-4b40-9726-e77a33edd8e3",
      "x-trace-id": "9f09a114-cd0f-46c4-bceb-f3714bbe513a"
    },
    "body": {
      "contract_version": "1.0.0",
      "decision": "ALLOW",
      "reason_code": "ALLOWED_BY_VAJRA_AUTHORITY",
      "reason": "Access permitted: VAJRA authority state is 'USE', the granted scope includes 'read:evidence', the caller passed RBAC and VAJRA recorded the evidence.",
      "decision_id": "680d5a7b249141588c290c43b568d176",
      "trace_id": "9f09a114-cd0f-46c4-bceb-f3714bbe513a",
      "request_id": "9a404d0a-320e-4b40-9726-e77a33edd8e3",
      "idempotency_key": null,
      "duplicate": false,
      "actor_id": "cc_usr_2",
      "action": "read",
      "resource": {
        "type": "evidence",
        "id": "EV-P0-0001"
      },
      "vajra": {
        "subject_ref": "subj_sha256_fa0e0c8c49cf938a",
        "status": "OK",
        "is_authorized": true,
        "current_state": "USE",
        "scope_checked": true
      },
      "evidence": {
        "local_audit_event_id": "4bea0888-7c98-4a33-b4e6-5281c706d854",
        "superseded_audit_event_id": null,
        "vajra": {
          "status": "RECORDED",
          "http_status": 200,
          "detail": "",
          "data": {
            "evidence_hash": "sha256:a34a9fdeff335f5edb07e7045e5b40deb804f77b41a6e80b63cbc6fa6d7dd0fb",
            "stored_in": [
              "TruthStore (tantra_truth.jsonl)"
            ],
            "recorded_at": 1793891617,
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
      "evaluated_at": "2026-11-05T15:13:35.882Z"
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
    "timestamp": "2026-11-05T15:13:36.530842"
  },
  "canonical_event": {
    "schema_version": "1.0.0",
    "event_id": "4bea0888-7c98-4a33-b4e6-5281c706d854",
    "event_type": "protected_access.decision",
    "timestamp": "2026-11-05T15:13:36.529Z",
    "source_system": "cybercrime",
    "trace_id": "9f09a114-cd0f-46c4-bceb-f3714bbe513a",
    "request_id": "9a404d0a-320e-4b40-9726-e77a33edd8e3",
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
      "decision_id": "680d5a7b249141588c290c43b568d176",
      "vajra_subject_ref": "subj_sha256_fa0e0c8c49cf938a",
      "vajra_status": "OK",
      "vajra_state": "USE",
      "vajra_authority": "AUTH_ROLE_CLIENT",
      "vajra_trace_id": "9f09a114-cd0f-46c4-bceb-f3714bbe513a::680d5a7b249141588c290c43b568d176",
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
  "trace_id": "9f09a114-cd0f-46c4-bceb-f3714bbe513a::680d5a7b249141588c290c43b568d176",
  "execution_hash": "sha256:a34a9fdeff335f5edb07e7045e5b40deb804f77b41a6e80b63cbc6fa6d7dd0fb",
  "validation_hash": "sha256:a34a9fdeff335f5edb07e7045e5b40deb804f77b41a6e80b63cbc6fa6d7dd0fb",
  "replay_hash": "sha256:a34a9fdeff335f5edb07e7045e5b40deb804f77b41a6e80b63cbc6fa6d7dd0fb",
  "tx_hash": "evidence_9f09a114-cd0f-46c4-bceb-f3714bbe513a::680d5a7b249141588c290c43b568d176",
  "fraud_decision": "ALLOW",
  "timestamp": 1793891617,
  "prev_hash": "47b4959d894a0aa828efc77baa25eaf8de6be6f533bd99b7447a0452307544fa",
  "entry_hash": "7dd0ca83123061402c824354371151cffb7f687ba3b6426812eef53c5c3dd269"
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
