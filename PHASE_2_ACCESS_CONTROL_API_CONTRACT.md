# Phase 2 — Access Control API Contract Specification

**Document Identifier:** `PHASE_2_ACCESS_CONTROL_API_CONTRACT.md`  
**Document Owner:** Kaushlendra — Data, API & Access Control  
**Status:** `PROPOSED CONTRACT DESIGN`  
**Version:** `1.0.0-draft`  
**Date:** 2026-10-17  
**Scope:** Canonical Access Authorization, Policy Evaluation, Revocation, and Error Contracts across BHIV Cybersecurity Services  

---

## 1. Objective and Architecture Context

During the Phase 1 audit, authorization and access evaluation were found to be fragmented:
- **Cybercrime:** Implements custom FastAPI HTTP middleware [`cybercrime/backend/main.py:L612-700`](file:///c:/Users/A/Documents/CyberSecurity/cybercrime/backend/main.py#L612-L700) parsing [`rbac-permissions.json`](file:///c:/Users/A/Documents/CyberSecurity/cybercrime/rbac-permissions.json) with path globbing and self-boundary enforcement.
- **Fraud Evidence System:** Implements an Express middleware stack [`fraud-evidence-system/Backend/middleware/authorize.js:L23-110`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/middleware/authorize.js#L23-L110) checking action-to-role mappings against [`rbac-permissions.json`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/rbac-permissions.json).
- **VAJRA:** Implements a Go `AccessController` struct with default-deny evaluation in memory [`core/relay-chain/cybersecurity/components.go:L133-167`](file:///c:/Users/A/Documents/CyberSecurity/bhiv-VAJRA_Blockchain-main/bhiv-VAJRA_Blockchain-main/core/relay-chain/cybersecurity/components.go#L133-L167).
- **TANTRA:** Relies on fail-closed computational boundary assertions without human IAM [`Full-tantra-constitutional-convergence/fail_closed_enforcer.py:L15-60`](file:///c:/Users/A/Documents/CyberSecurity/Full-tantra-constitutional-convergence/fail_closed_enforcer.py#L15-L60).

**Workstream B** establishes a unified, versioned REST/JSON Access Control API Contract enabling any service to request authorization evaluations and invoke revocation procedures consistently.

---

## 2. Core Architectural Principles

### 2.1 The Deny-by-Default Imperative
Every authorization contract enforces **strict deny-by-default**:
1. If an incoming request lacks valid authentication, access **MUST NOT** be granted (HTTP 401).
2. If an actor's role cannot be established or verified against database state, access **MUST NOT** be granted (HTTP 401/403).
3. If an action or resource is not explicitly permitted by policy, access **MUST NOT** be granted (HTTP 403).
4. If an upstream authorization evaluation times out or errors, access **MUST NOT** be granted (Fail Closed -> HTTP 503/500).

### 2.2 Taxonomy of Revocation
The contract clearly segregates three distinct tiers of revocation:
1. **Tier 1: Permission Revocation** (`policy_mutation`): Modifying a role's permissions in policy files (e.g., removing `delete` from `investigator`). Takes effect on subsequent request evaluations.
2. **Tier 2: Account Deactivation** (`user_deactivation`): Setting `is_active: false` on a user account in database storage. Verified in middleware on every protected hop, immediately halting requests.
3. **Tier 3: Individual Token/Session Revocation** (`session_invalidation`): Invalidating an active JWT before its natural expiration (e.g., token blacklist / JTI checking). 
   - *Audit Status:* **NOT DEFINED** in existing Cybercrime, Fraud Evidence, TANTRA, or VAJRA codebases.
   - *Design Status:* Formally specified in this contract as a target requirement for Phase 3 implementation via a centralized JTI revocation store.

---

## 3. Contract 1: Authorization Decision (`POST /api/v1/authz/check`)

### 3.1 Purpose
Allows internal services or API gateways to query whether a specific subject/actor is authorized to execute an action on a target resource.

### 3.2 Request Schema

- **HTTP Method:** `POST`
- **Path:** `/api/v1/authz/check`
- **Headers Required:**
  - `Content-Type: application/json`
  - `X-Trace-Id`: String (Required, correlation trace)
  - `X-Request-Id`: String (Optional, hop correlation)
  - `Authorization`: `Bearer <token>` OR `X-API-Key: <key>` (Service authentication)

| Field Name | Type | Required | Validation Rules | Description |
|---|---|---|---|---|
| **`contract_version`** | `String` | Yes | Must equal `"1.0.0"` | API contract version. |
| **`subject`** | `Object` | Yes | Non-null JSON object | Information regarding the actor requesting access. |
| `subject.actor_id` | `String` | Yes | 3-64 chars, alphanumeric + prefix | Identifier (e.g. `cc_usr_1`, `fe_usr_652fa...`). |
| `subject.role` | `String` | Yes | Enum: `["public", "user", "investigator", "admin", "superadmin", "service_agent"]` | Assigned role. |
| `subject.is_active` | `Boolean` | Yes | Boolean | Whether account is active in source DB. |
| **`action`** | `String` | Yes | Enum: `["read", "create", "update", "delete", "freeze", "unfreeze", "upload", "download", "verify", "anchor", "execute"]` | Operation attempted. |
| **`resource`** | `Object` | Yes | Non-null JSON object | Target resource specification. |
| `resource.type` | `String` | Yes | Enum: `["evidence", "case", "wallet", "transaction", "user", "policy", "artifact"]` | Resource type. |
| `resource.id` | `String` | Yes | 1-128 chars | Target identifier. |
| `resource.owner_id` | `String` | Optional | Max 64 chars | Owner identifier (for self-boundary checking). |
| **`context`** | `Object` | Optional | Key-value dictionary | Environmental telemetry (`ip_address`, `method`, `path`). |

### 3.3 Response Schema

- **Status Code:** `200 OK` (when evaluation completes normally, regardless of whether result is allow or deny).

| Field Name | Type | Required | Description |
|---|---|---|---|
| **`contract_version`** | `String` | Yes | `"1.0.0"` |
| **`decision`** | `String` | Yes | Enum: `["ALLOW", "DENY"]` |
| **`reason_code`** | `String` | Yes | Machine-readable explanation: `ALLOWED_BY_POLICY`, `DENIED_BY_DEFAULT`, `ACCOUNT_INACTIVE`, `ROLE_NOT_PERMITTED`, `SELF_BOUNDARY_MISMATCH`. |
| **`reason`** | `String` | Yes | Safe human-readable description. |
| **`trace_id`** | `String` | Yes | Echoed from request header. |
| **`evaluated_at`** | `String` | Yes | ISO 8601 UTC timestamp. |
| **`policy_applied`** | `String` | Optional | Identifier of policy applied (e.g., `rbac-permissions-v1`). |

---

## 4. Contract 2: Access Revocation (`POST /api/v1/access/revoke`)

### 4.1 Purpose
Provides a formal administrative endpoint to execute Tier 1 (permission modification), Tier 2 (account deactivation), or Tier 3 (token invalidation) revocations.

### 4.2 Request Schema

- **HTTP Method:** `POST`
- **Path:** `/api/v1/access/revoke`
- **Headers Required:**
  - `Content-Type: application/json`
  - `X-Trace-Id`: String (Required)
  - `Authorization`: `Bearer <token>` (Must have `admin` or `superadmin` role)

| Field Name | Type | Required | Validation Rules | Description |
|---|---|---|---|---|
| **`contract_version`** | `String` | Yes | Must equal `"1.0.0"` | API contract version. |
| **`revocation_type`** | `String` | Yes | Enum: `["user_deactivation", "token_invalidation", "permission_revocation"]` | The tier of revocation requested. |
| **`target`** | `Object` | Yes | Non-null JSON object | Target entity to be revoked. |
| `target.actor_id` | `String` | Conditional | Required if `user_deactivation` | Target user identifier. |
| `target.jti` | `String` | Conditional | Required if `token_invalidation` | Unique JWT ID to invalidate. |
| `target.role` | `String` | Conditional | Required if `permission_revocation`| Role undergoing permission change. |
| `target.action` | `String` | Conditional | Required if `permission_revocation`| Specific action being revoked. |
| **`reason`** | `String` | Yes | 10-256 chars | Administrative justification for audit logging. |
| **`requested_by`** | `String` | Yes | 3-64 chars | Admin actor ID requesting revocation. |

### 4.3 Response Schema

- **Status Code:** `200 OK` (Revocation successful)

| Field Name | Type | Required | Description |
|---|---|---|---|
| **`contract_version`** | `String` | Yes | `"1.0.0"` |
| **`revocation_id`** | `String` | Yes | UUIDv4 audit record identifier. |
| **`revocation_type`** | `String` | Yes | Echoed from request. |
| **`status`** | `String` | Yes | Enum: `["REVOKED", "ALREADY_INACTIVE", "SCHEDULED"]` |
| **`effective_at`** | `String` | Yes | ISO 8601 UTC timestamp. |
| **`trace_id`** | `String` | Yes | Echoed correlation trace. |
| **`audit_event_id`** | `String` | Yes | Canonical security event ID recorded for this action. |

---

## 5. Contract 3: Standard Validation & Authorization Errors

To eliminate divergent error payloads across repositories, all services must conform to the following error schema:

### 5.1 Canonical Error Schema

```json
{
  "error": true,
  "code": "FORBIDDEN",
  "status_code": 403,
  "message": "Access denied: Insufficient permissions for requested action.",
  "trace_id": "trace-8842-fe91-44aa",
  "request_id": "req-1029-44ab",
  "timestamp": "2026-10-17T11:22:00.000Z",
  "details": []
}
```

### 5.2 HTTP Status Code Harmonization Rules

| Condition | Canonical HTTP Code | Canonical Error Code | Mandatory Behavior |
|---|---|---|---|
| **No Authorization header provided** | `401 Unauthorized` | `AUTHENTICATION_REQUIRED` | Must **NOT** return 403. (Remediates Fraud Evidence System defect in [`auth.js:L29`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/middleware/auth.js#L29)). |
| **Token expired or signature invalid** | `401 Unauthorized` | `INVALID_CREDENTIALS` | Rejects request; logs warning to security audit. |
| **Account is deactivated (`is_active = false`)** | `403 Forbidden` | `ACCOUNT_DEACTIVATED` | Rejects request immediately in middleware. |
| **User lacks required role/action** | `403 Forbidden` | `INSUFFICIENT_PERMISSIONS` | Rejects request; logs authorization denial event. |
| **Investigator requests another's path** | `403 Forbidden` | `SELF_BOUNDARY_VIOLATION` | Aligns with Cybercrime [`main.py:L676-698`](file:///c:/Users/A/Documents/CyberSecurity/cybercrime/backend/main.py#L676-L698). |
| **Request fails schema validation** | `400 Bad Request` | `VALIDATION_FAILED` | Returns structured field errors in `details`. |
| **Internal server or database fault** | `500 Internal Server Error` | `INTERNAL_ERROR` | Never expose raw database stack trace in production. |

---

## 6. Illustrative API Contract Examples

> **NOTICE:** The following payloads are **illustrative contract examples**. They do NOT represent live production requests.

### 6.1 Illustrative Authorization Request (`ALLOW` Decision Expected)

```http
POST /api/v1/authz/check HTTP/1.1
Host: authz.cybersecurity.internal
Content-Type: application/json
X-Trace-Id: trace-canonical-101
Authorization: Bearer <valid_service_token>

{
  "contract_version": "1.0.0",
  "subject": {
    "actor_id": "cc_usr_2",
    "role": "investigator",
    "is_active": true
  },
  "action": "read",
  "resource": {
    "type": "evidence",
    "id": "EV-1718000000000"
  },
  "context": {
    "ip_address": "10.0.1.20",
    "method": "GET",
    "path": "/api/v1/evidence/EV-1718000000000"
  }
}
```

#### Illustrative Authorization Response (`ALLOW`)

```http
HTTP/1.1 200 OK
Content-Type: application/json
X-Trace-Id: trace-canonical-101

{
  "contract_version": "1.0.0",
  "decision": "ALLOW",
  "reason_code": "ALLOWED_BY_POLICY",
  "reason": "Investigator has read access to evidence library.",
  "trace_id": "trace-canonical-101",
  "evaluated_at": "2026-10-17T11:25:00.100Z",
  "policy_applied": "rbac_v1"
}
```

---

### 6.2 Illustrative Authorization Request (`DENY` Decision Expected)

```http
POST /api/v1/authz/check HTTP/1.1
Host: authz.cybersecurity.internal
Content-Type: application/json
X-Trace-Id: trace-canonical-102
Authorization: Bearer <valid_service_token>

{
  "contract_version": "1.0.0",
  "subject": {
    "actor_id": "fe_usr_84920",
    "role": "investigator",
    "is_active": true
  },
  "action": "delete",
  "resource": {
    "type": "evidence",
    "id": "EV-1718000000000"
  }
}
```

#### Illustrative Authorization Response (`DENY`)

```http
HTTP/1.1 200 OK
Content-Type: application/json
X-Trace-Id: trace-canonical-102

{
  "contract_version": "1.0.0",
  "decision": "DENY",
  "reason_code": "ROLE_NOT_PERMITTED",
  "reason": "Investigator role is not authorized to perform action 'delete' on resource 'evidence'.",
  "trace_id": "trace-canonical-102",
  "evaluated_at": "2026-10-17T11:25:10.200Z",
  "policy_applied": "rbac_v1"
}
```

---

### 6.3 Illustrative Revocation Request (Tier 2: Account Deactivation)

```http
POST /api/v1/access/revoke HTTP/1.1
Host: authz.cybersecurity.internal
Content-Type: application/json
X-Trace-Id: trace-canonical-103
Authorization: Bearer <superadmin_token>

{
  "contract_version": "1.0.0",
  "revocation_type": "user_deactivation",
  "target": {
    "actor_id": "cc_usr_5"
  },
  "reason": "Investigator suspended pending internal security inquiry.",
  "requested_by": "cc_usr_1"
}
```

#### Illustrative Revocation Response

```http
HTTP/1.1 200 OK
Content-Type: application/json
X-Trace-Id: trace-canonical-103

{
  "contract_version": "1.0.0",
  "revocation_id": "rev-d1a2c3-4b5f-6a7b",
  "revocation_type": "user_deactivation",
  "status": "REVOKED",
  "effective_at": "2026-10-17T11:26:00.000Z",
  "trace_id": "trace-canonical-103",
  "audit_event_id": "evt-77a8b9-11c2-33d4"
}
```

---

## 7. Acceptance Criteria for Workstream B

- [x] Full contracts provided for Authorization Request, Authorization Decision, Revocation Request, Revocation Result, and Standard Errors.
- [x] Deny-by-default explicitly specified for all evaluations and error fallbacks.
- [x] Clear technical distinction between Permission Revocation, Account Deactivation, and Token/Session Invalidation.
- [x] Status code harmonization specified (remediating 401 vs 403 discrepancies).
- [x] Trace correlation via `X-Trace-Id` mandated on all requests and responses.
- [x] Illustrative valid and invalid examples provided and explicitly labeled.
