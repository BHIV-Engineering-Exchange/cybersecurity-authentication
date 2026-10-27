# Phase 2 — Canonical Security Event Schema Specification

**Document Identifier:** `PHASE_2_CANONICAL_SECURITY_SCHEMA.md`  
**Document Owner:** Kaushlendra — Data, API & Access Control  
**Status:** `PROPOSED CONTRACT DESIGN`  
**Version:** `1.0.0-draft`  
**Date:** 2026-10-17  
**Scope:** Cross-System Security & Audit Event Normalization for Cybercrime, Fraud Evidence System, TANTRA, and VAJRA  

---

## 1. Executive Overview and Design Objective

During Phase 1, the audit identified that all four repositories (`cybercrime`, `fraud-evidence-system`, `Full-tantra-constitutional-convergence`, and `bhiv-VAJRA_Blockchain-main`) implement mutually incompatible data models for audit, security events, evidence records, and actor tracking. 

The objective of **Workstream A** is to design a unified, versioned, vendor-neutral **Canonical Security Event Schema (`v1.0.0`)**. This schema establishes a common semantic contract for cross-system event exchange, telemetry correlation, regulatory compliance, and tamper-evident auditing without violating existing internal system boundaries or leaking sensitive credentials.

---

## 2. Core Design Principles

1. **Deny-by-Default Logging:** All security-relevant events must record both positive authorizations and negative denials/rejections.
2. **Strict Envelope & Data Typing:** Field names, data types, and nullability are rigidly specified. Dynamic, unvalidated properties are confined to namespaced extensions.
3. **Traceability by Construction:** Every event mandates an immutable `trace_id` propagated across distributed HTTP, RPC, or message-broker boundaries.
4. **Privacy & Secret Redaction by Default:** Passwords, password hashes, JWTs, private keys, symmetric API keys, session tokens, and raw personally identifiable information (PII) must never appear in log payloads.
5. **Lossless Extensibility:** System-specific properties that cannot be generalized cleanly are preserved in designated extension envelopes (`extensions.<system_name>`).

---

## 3. Canonical Security Event Schema (`v1.0.0`) Specification

### 3.1 Field-by-Field Specification

| Field Name | Type | Presence | Validation Rules | Purpose & Description | Privacy & Redaction Rules | Existing Source Alignment |
|---|---|---|---|---|---|---|
| **`schema_version`** | `String` | **Required** | Must strictly equal `"1.0.0"`. Regex: `^1\.0\.0$` | Declares contract version for deterministic deserialization. | Non-sensitive. | Aligns with TANTRA [`api.py:L393`](file:///c:/Users/A/Documents/CyberSecurity/Full-tantra-constitutional-convergence/api.py#L393) strict check. |
| **`event_id`** | `String` | **Required** | UUIDv4 string. Regex: `^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$` | Globally unique identifier for this discrete event instance. | Non-sensitive. | Replaces integer PKs ([`cybercrime/models.py:L147`](file:///c:/Users/A/Documents/CyberSecurity/cybercrime/backend/app/db/models.py#L147)) and Mongo ObjectIds. |
| **`event_type`** | `String` | **Required** | Hierarchical dot-notated string. Length: 3-64 chars. Regex: `^[a-z0-9_]+(\.[a-z0-9_]+)+$` | Semantic categorization of the event (e.g., `auth.login`, `evidence.upload`, `wallet.freeze`). | Non-sensitive. | Generalizes Cybercrime `action` ([`audit_logging.py:L22`](file:///c:/Users/A/Documents/CyberSecurity/cybercrime/backend/app/core/audit_logging.py#L22)) and Fraud Evidence `action`. |
| **`timestamp`** | `String` | **Required** | ISO 8601 UTC format with explicit `Z` or `+00:00`. Regex: `^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?(Z\|\+00:00)$` | Exact UTC time of event occurrence at source. | Non-sensitive. | Resolves timezone ambiguity across Python `utcnow()` and JS `Date.toISOString()`. |
| **`source_system`** | `String` | **Required** | Enum: `["cybercrime", "fraud-evidence-system", "tantra", "vajra", "external_gateway"]` | Declares the originating repository / service boundary. | Non-sensitive. | Equivalent to TANTRA `source_module_id` ([`api.py:L46`](file:///c:/Users/A/Documents/CyberSecurity/Full-tantra-constitutional-convergence/api.py#L46)). |
| **`trace_id`** | `String` | **Required** | Non-empty string. 16-64 chars. ASCII alphanumeric + hyphens. | End-to-end distributed correlation trace identifier. | Non-sensitive. | Aligns with `X-Trace-Id` headers in Cybercrime ([`main.py:L551`](file:///c:/Users/A/Documents/CyberSecurity/cybercrime/backend/main.py#L551)) and Fraud Evidence ([`server.js:L50`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/server.js#L50)). |
| **`request_id`** | `String` | Optional | Non-empty string if present. Max 64 chars. | Correlation identifier for the specific incoming HTTP hop. | Non-sensitive. | Aligns with `X-Request-Id` headers in Cybercrime and Fraud Evidence. |
| **`actor`** | `Object` | **Required** | Complex JSON object (see Section 3.2). | Identifies the subject initiating or triggering the action. | Contains identity metadata; must be masked as specified. | Normalizes Cybercrime `user_id` and Fraud Evidence `userId`/`userEmail`. |
| **`action`** | `String` | **Required** | Standard verb enum: `["create", "read", "update", "delete", "login", "logout", "freeze", "unfreeze", "upload", "download", "verify", "anchor", "execute", "escalate"]` | Atomic operational verb executed by the actor. | Non-sensitive. | Standardizes action strings across all four codebases. |
| **`resource`** | `Object` | **Required** | Complex JSON object (see Section 3.3). | The entity, artifact, or system component targeted. | May contain addresses or IDs; prohibits embedding secrets. | Normalizes Cybercrime `entity_type`/`entity_id` and Fraud Evidence `resourceType`/`resourceId`. |
| **`outcome`** | `Object` | **Required** | Complex JSON object (see Section 3.4). | Status, HTTP code, and safe explanatory message. | Prohibits embedding raw exception stack traces. | Standardizes Cybercrime `status` and Fraud Evidence `success`/`statusCode`. |
| **`policy_reference`**| `Object` | Optional | Complex JSON object (see Section 3.5). | Rule or boundary reference applied during evaluation. | Non-sensitive. | Aligns with Cybercrime/Fraud Evidence `rbac-permissions.json` and TANTRA boundaries. |
| **`metadata`** | `Object` | Optional | Key-value dictionary. Max 50 keys. Key max 64 chars, value primitive or string. | Non-sensitive contextual telemetry (IP, user-agent, environment). | Must be filtered through PII/secret sanitizer before serialization. | Normalizes Cybercrime `details` Text and Fraud Evidence `details` Mixed. |
| **`extensions`** | `Object` | Optional | Namespaced object: `cybercrime`, `fraud_evidence`, `tantra`, `vajra`. | Preserves repository-specific fields that lack common semantics. | Subject to strict scrubbing. | Prevents loss of repository-unique operational telemetry. |

---

### 3.2 Actor / Subject Specification (`actor`)

```json
{
  "actor_id": "usr_948201",
  "actor_type": "user",
  "role": "investigator",
  "display_name": "Investigator Sharma",
  "authenticated": true,
  "auth_method": "bearer_jwt"
}
```

- **`actor_id`** (`String`, **Required**): Global canonical actor identifier. For Cybercrime integer IDs, prefix with `cc_usr_<id>` (e.g. `cc_usr_1`). For Fraud Evidence Mongo ObjectIds, prefix with `fe_usr_<hex>` (e.g. `fe_usr_650fa89b21...`). For automated services, prefix with `svc_<service_name>`.
- **`actor_type`** (`String`, **Required**): Enum: `["user", "service", "system", "anonymous"]`.
- **`role`** (`String`, **Required**): Standardized role enum: `["public", "user", "investigator", "admin", "superadmin", "service_agent"]`.
- **`display_name`** (`String`, Optional): Sanitized display name. Must not contain personal email address unless explicit team approval is granted.
- **`authenticated`** (`Boolean`, **Required**): True if validated by cryptographic token/key; False for public/unauthenticated requests.
- **`auth_method`** (`String`, Optional): Enum: `["bearer_jwt", "api_key", "internal_mTLS", "none"]`.

---

### 3.3 Resource Specification (`resource`)

```json
{
  "resource_type": "evidence",
  "resource_id": "EV-1718000000000",
  "case_id": "CAS-2026-089",
  "target_address": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
  "integrity_hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
}
```

- **`resource_type`** (`String`, **Required**): Enum: `["evidence", "case", "wallet", "transaction", "user", "policy", "system_config", "artifact"]`.
- **`resource_id`** (`String`, **Required**): Identifier of the primary resource. (e.g., `evidence_id`, `wallet_address`, `case_id`).
- **`case_id`** (`String`, Optional): Associated investigation case identifier where applicable.
- **`target_address`** (`String`, Optional): Blockchain wallet or contract address targeted (if applicable).
- **`integrity_hash`** (`String`, Optional): SHA-256 hex digest of the underlying evidence or payload.

---

### 3.4 Outcome Specification (`outcome`)

```json
{
  "status": "DENIED",
  "status_code": 403,
  "reason_code": "INSUFFICIENT_ROLE_PERMISSIONS",
  "message": "Access denied: Investigator cannot delete evidence."
}
```

- **`status`** (`String`, **Required**): Enum: `["SUCCESS", "DENIED", "ERROR", "WARNING"]`.
- **`status_code`** (`Integer`, Optional): HTTP status code representation (e.g., `200`, `201`, `401`, `403`, `404`, `500`).
- **`reason_code`** (`String`, **Required**): Standardized enum:
  - Success: `OPERATION_COMPLETED`, `RECORD_CREATED`, `ACCESS_GRANTED`.
  - Denial: `AUTHENTICATION_REQUIRED`, `INVALID_CREDENTIALS`, `INSUFFICIENT_ROLE_PERMISSIONS`, `ACCOUNT_DEACTIVATED`, `SELF_BOUNDARY_VIOLATION`, `CONSTITUTIONAL_BOUNDARY_BREACH`.
  - Error: `VALIDATION_FAILED`, `STORAGE_UNAVAILABLE`, `UPSTREAM_TIMEOUT`, `INTERNAL_EXCEPTION`.
- **`message`** (`String`, **Required**): Safe, human-readable summary. **Rule:** Must never expose internal database exception strings, table names, or file system paths.

---

### 3.5 Policy Reference Specification (`policy_reference`)

```json
{
  "policy_id": "rbac_cybersecurity_v1",
  "rule_name": "evidence_delete_restricted",
  "enforcement_mode": "mandatory",
  "boundary_checked": "execution_authority"
}
```

- **`policy_id`** (`String`, Optional): Identifier of the governing policy document (e.g., `"rbac-permissions.json"`).
- **`rule_name`** (`String`, Optional): Evaluated rule or action name (e.g., `"delete"`, `"read-evidence"`).
- **`enforcement_mode`** (`String`, Optional): Enum: `["mandatory", "strict", "advisory"]`. Aligns with VAJRA [`security_contract.go:L215-220`](file:///c:/Users/A/Documents/CyberSecurity/bhiv-VAJRA_Blockchain-main/bhiv-VAJRA_Blockchain-main/core/relay-chain/cybersecurity/security_contract.go#L215-L220).
- **`boundary_checked`** (`String`, Optional): Constitutional boundary name if verified by TANTRA ([`fail_closed_enforcer.py:L15-25`](file:///c:/Users/A/Documents/CyberSecurity/Full-tantra-constitutional-convergence/fail_closed_enforcer.py#L15-L25)).

---

## 4. Illustrative Schema Examples

> **NOTICE:** The following payloads are **illustrative examples** for contract design and testing. They do NOT represent live production tokens or evidence of current runtime state.

### 4.1 Valid Canonical Security Event: Evidence Upload

```json
{
  "schema_version": "1.0.0",
  "event_id": "c7a8b3d2-4e5f-4a1b-9c3d-2e1f4a5b6c7d",
  "event_type": "evidence.upload",
  "timestamp": "2026-10-17T11:15:30.125Z",
  "source_system": "cybercrime",
  "trace_id": "trace-8842-fe91-44aa",
  "request_id": "req-1029-44ab",
  "actor": {
    "actor_id": "cc_usr_4",
    "actor_type": "user",
    "role": "investigator",
    "display_name": "Investigator 4",
    "authenticated": true,
    "auth_method": "bearer_jwt"
  },
  "action": "upload",
  "resource": {
    "resource_type": "evidence",
    "resource_id": "EV-1718000000000",
    "case_id": "CAS-104",
    "target_address": "0x4b20993bc481177ec7e8f571cecae8a9e22c02db",
    "integrity_hash": "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08"
  },
  "outcome": {
    "status": "SUCCESS",
    "status_code": 201,
    "reason_code": "RECORD_CREATED",
    "message": "Forensic file uploaded and hash calculated."
  },
  "policy_reference": {
    "policy_id": "rbac_permissions_v1",
    "rule_name": "evidence.create",
    "enforcement_mode": "mandatory"
  },
  "metadata": {
    "client_ip": "192.168.1.100",
    "file_size_bytes": 1048576,
    "mime_type": "application/pdf"
  },
  "extensions": {
    "cybercrime": {
      "local_file_path": "./evidence_storage/EV-1718000000000.pdf",
      "immutable_flag": true
    }
  }
}
```

### 4.2 Valid Canonical Security Event: RBAC Denial (Access Violation)

```json
{
  "schema_version": "1.0.0",
  "event_id": "b1a2c3d4-e5f6-4a1b-9c3d-2e1f4a5b6c7d",
  "event_type": "evidence.delete",
  "timestamp": "2026-10-17T11:18:42.000Z",
  "source_system": "fraud-evidence-system",
  "trace_id": "trace-9912-aa34-11bc",
  "request_id": "req-8871-33da",
  "actor": {
    "actor_id": "fe_usr_652fa102b48a",
    "actor_type": "user",
    "role": "investigator",
    "display_name": "Field Agent",
    "authenticated": true,
    "auth_method": "bearer_jwt"
  },
  "action": "delete",
  "resource": {
    "resource_type": "evidence",
    "resource_id": "fe_ev_849201948",
    "case_id": "CAS-9941"
  },
  "outcome": {
    "status": "DENIED",
    "status_code": 403,
    "reason_code": "INSUFFICIENT_ROLE_PERMISSIONS",
    "message": "Access denied: Investigator role cannot delete evidence records."
  },
  "policy_reference": {
    "policy_id": "fraud_rbac_v1",
    "rule_name": "delete",
    "enforcement_mode": "strict"
  },
  "metadata": {
    "client_ip": "10.0.4.12",
    "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
  }
}
```

### 4.3 Invalid Canonical Security Event (Validation Rejection Example)

```json
{
  "schema_version": "2.0.0", 
  "event_id": "not-a-valid-uuid",
  "event_type": "UPPERCASE_INVALID_TYPE",
  "timestamp": "17 Oct 2026 11:20:00",
  "source_system": "unknown_repo",
  "trace_id": "",
  "actor": {
    "actor_id": "1",
    "role": "super_user_invented"
  },
  "action": "hack_system",
  "outcome": {
    "status": "FAILED_BADLY"
  },
  "metadata": {
    "raw_password": "super_secret_password_exposed_here!"
  }
}
```

**Rejection Reasons for Example 4.3:**
1. `schema_version`: Value `"2.0.0"` rejected. Must strictly match `"1.0.0"`.
2. `event_id`: Value `"not-a-valid-uuid"` violates UUIDv4 regex.
3. `event_type`: Violates lowercase dot-notation regex.
4. `timestamp`: `"17 Oct 2026..."` is not in ISO 8601 UTC format (`YYYY-MM-DDTHH:MM:SSZ`).
5. `source_system`: `"unknown_repo"` is not in permitted enum.
6. `trace_id`: Empty string rejected; must be non-empty ASCII string.
7. `actor.role`: `"super_user_invented"` violates defined role enum.
8. `action`: `"hack_system"` is not in permitted action verb enum.
9. `outcome.status`: `"FAILED_BADLY"` violates permitted outcome enum.
10. `metadata.raw_password`: Direct violation of zero-credential logging rule.

---

## 5. Acceptance Criteria for Workstream A

- [x] Schema is explicitly versioned (`1.0.0`).
- [x] Every common field has data type, required/optional status, regex/enum validation rules, purpose, and privacy impact documented.
- [x] Field inclusion is justified by cross-repository necessity rather than single-repo presence.
- [x] System-specific properties are segregated into namespaced `extensions`.
- [x] Valid and invalid illustrative examples are provided and explicitly labeled.
- [x] Zero application source code was modified during schema design.
