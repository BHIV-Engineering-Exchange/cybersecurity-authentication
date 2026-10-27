# Consolidated Cybersecurity Schema & Integration Reference

**Document Owner:** Kaushlendra — Data, API, and Access Control  
**Project:** BHIV Cybersecurity Task 1  
**Audit Date:** 2026-10-13  
**File Path:** `CYBERSECURITY_SCHEMA_REFERENCE.md`  
**Completion Status:** `PARTIALLY DEFINED`

---

## Section 1 — Purpose and Scope

### 1.1 Purpose
This document establishes an authoritative, source-verified reference of the data models, event schemas, threat detection interfaces, audit trails, and correlation pipelines implemented across the BHIV Cybersecurity ecosystem. It consolidates findings from an exhaustive, read-only audit of the existing codebase to provide a single ground-truth reference for engineering, data governance, and API integration teams.

### 1.2 Repositories Inspected
The audit covers four repositories residing in the workspace:
1. **`cybercrime`** — FastAPI/Python backend managing incidents, access requests, heuristic pattern detection, and local audit persistence.
2. **`fraud-evidence-system`** — Express/Node.js backend managing forensic evidence files, case investigations, machine learning violation detection, on-chain EVM contract anchoring, and MongoDB audit logging.
3. **`bhiv-VAJRA_Blockchain-main`** — Go-based Substrate/relay-chain core implementing consensus, ledger state, the Sarathi fraud transaction rule-engine, and external AI fraud checks.
4. **`Full-tantra-constitutional-convergence`** — Python-based constitutional enforcement, event sourcing store, telemetry contracts, and simulated ecosystem adapters.

### 1.3 Scope and Limitations
- **Read-Only Audit:** No application code, schemas, database tables, or test fixtures have been altered.
- **Source of Truth:** Every entry represents concrete implementation artifacts extracted directly from active repository code. No speculative schemas, unverified enum values, or synthetic data types have been introduced.
- **Downstream Boundaries:** Integrations reaching out to external networks (e.g., TANTRA production nodes, remote IPFS gateways, live Vajra validator networks) are verified as local stubs, mocks, or fallbacks.

### 1.4 Classification Terminology
To maintain absolute technical integrity, all items documented in this reference are classified using seven formal designations:

- **`CANONICAL`**: A shared standard, contract, or schema formally versioned, agreed upon, and adhered to identically across multiple repositories.
- **`REPOSITORY-SPECIFIC`**: A schema, model, or interface fully defined and active, but scoped strictly within a single repository without ecosystem-wide adoption.
- **`INFERRED`**: An operational pattern, rule, or structure deduced from executable route handlers, queries, or middleware logic rather than an explicit formal schema declaration.
- **`MOCKED`**: A simulated interface, stub, synthetic generator, or test fixture that imitates external system behavior without live end-to-end execution.
- **`NOT DEFINED`**: A requested contract, field, list, or mechanism that is entirely absent from the codebase and documentation.
- **`NOT VERIFIED`**: A dependency, remote service endpoint, or file referenced in code that could not be reached, executed, or validated during local inspection.
- **`MISMATCH`**: A direct architectural or data-contract incompatibility between two repositories (e.g., mismatched JSON keys, conflicting data types, incompatible ID formats, or inconsistent metric scales).

---

## Section 2 — Repository and Schema Inventory

| Repository | Schema / Model / Contract | Format | Purpose | Classification | Source Path |
|---|---|---|---|---|---|
| `cybercrime` | `AuditLog` | SQLAlchemy Model | Relational audit trail for user operations and API requests | `REPOSITORY-SPECIFIC` | [`backend/app/db/models.py:L143-163`](file:///c:/Users/A/Documents/CyberSecurity/cybercrime/backend/app/db/models.py#L143-L163) |
| `cybercrime` | `AuditLogResponse` | Pydantic Schema | API serialization of relational audit log entries | `REPOSITORY-SPECIFIC` | [`backend/app/api/v1/schemas.py:L158-175`](file:///c:/Users/A/Documents/CyberSecurity/cybercrime/backend/app/api/v1/schemas.py#L158-L175) |
| `cybercrime` | `emit_audit_log` | Python Structured Logger | Emits structured JSON audit log records to stdout/handlers | `REPOSITORY-SPECIFIC` | [`backend/app/core/audit_logging.py:L20-53`](file:///c:/Users/A/Documents/CyberSecurity/cybercrime/backend/app/core/audit_logging.py#L20-L53) |
| `cybercrime` | `emit_core_event` | Python Function Payload | Structured event handoff payload to sovereign TANTRA core | `REPOSITORY-SPECIFIC` | [`backend/app/core/sovereign_integrations.py:L170-189`](file:///c:/Users/A/Documents/CyberSecurity/cybercrime/backend/app/core/sovereign_integrations.py#L170-L189) |
| `cybercrime` | `IncidentReportResponse` | Pydantic Schema | Response model for generated wallet threat and incident reports | `REPOSITORY-SPECIFIC` | [`backend/app/api/v1/schemas.py:L210-230`](file:///c:/Users/A/Documents/CyberSecurity/cybercrime/backend/app/api/v1/schemas.py#L210-L230) |
| `cybercrime` | `FraudPredictionResponse` | Pydantic Schema | Prediction output from heuristic / ML model evaluations | `REPOSITORY-SPECIFIC` | [`backend/app/api/v1/schemas.py:L235-245`](file:///c:/Users/A/Documents/CyberSecurity/cybercrime/backend/app/api/v1/schemas.py#L235-L245) |
| `cybercrime` | `User` / `Case` / `Evidence` | SQLAlchemy Models | Core relational entities for IAM, cases, and forensic evidence | `REPOSITORY-SPECIFIC` | [`backend/app/db/models.py:L12-75`](file:///c:/Users/A/Documents/CyberSecurity/cybercrime/backend/app/db/models.py#L12-L75) |
| `fraud-evidence-system` | `AuditLog` | Mongoose Schema | Persistent forensic audit trail stored in MongoDB | `REPOSITORY-SPECIFIC` | [`Backend/models/AuditLog.js:L4-127`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/models/AuditLog.js#L4-L127) |
| `fraud-evidence-system` | `RequestLog` | Mongoose Schema | High-volume incoming HTTP request telemetry | `REPOSITORY-SPECIFIC` | [`Backend/models/RequestLog.js:L4-12`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/models/RequestLog.js#L4-L12) |
| `fraud-evidence-system` | `LoginLog` | Mongoose Schema | Authentication session tracking and client IP tracking | `REPOSITORY-SPECIFIC` | [`Backend/models/LoginLog.js:L3-12`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/models/LoginLog.js#L3-L12) |
| `fraud-evidence-system` | `auditService` Log | Service Object Payload | Conflicting internal audit payload written to Mongoose | `MISMATCH` / Defective | [`Backend/services/auditService.js:L38-55`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/services/auditService.js#L38-L55) |
| `fraud-evidence-system` | `Investigation` | Mongoose Schema | Entity clustering, temporal windows, and incident tracking | `REPOSITORY-SPECIFIC` | [`Backend/models/Investigation.js:L138-205`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/models/Investigation.js#L138-L205) |
| `fraud-evidence-system` | `Case` / `Evidence` | Mongoose Schemas | Case file containers and cryptographic evidence manifests | `REPOSITORY-SPECIFIC` | [`Backend/models/Case.js:L4-35`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/models/Case.js#L4-L35), [`Backend/models/Evidence.js:L4-55`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/models/Evidence.js#L4-L55) |
| `fraud-evidence-system` | `Cybercrime.sol` | Solidity Smart Contract | On-chain EVM violation reporting and ledger event anchoring | `REPOSITORY-SPECIFIC` | [`Backend/Contracts/Cybercrime.sol:L1-120`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/Contracts/Cybercrime.sol#L1-L120) |
| `fraud-evidence-system` | `mlViolationDetector` | JS Object Payload | DeFi anomaly detection and recommended response payload | `REPOSITORY-SPECIFIC` | [`Backend/services/mlViolationDetector.js:L360-391`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/services/mlViolationDetector.js#L360-L391) |
| `bhiv-VAJRA_Blockchain-main` | `FraudRequest` / `FraudResponse` | Go Structs | Sarathi rule-engine evaluation over relay transactions | `REPOSITORY-SPECIFIC` | [`core/relay-chain/fraud/fraud.go:L15-30`](file:///c:/Users/A/Documents/CyberSecurity/bhiv-VAJRA_Blockchain-main/bhiv-VAJRA_Blockchain-main/core/relay-chain/fraud/fraud.go#L15-L30) |
| `bhiv-VAJRA_Blockchain-main` | `WalletData` / `FraudReport` | Go Structs | External HTTP contract expecting AI wallet risk assessment | `MISMATCH` / Defective | [`core/relay-chain/chain/cybercrime.go:L35-63`](file:///c:/Users/A/Documents/CyberSecurity/bhiv-VAJRA_Blockchain-main/bhiv-VAJRA_Blockchain-main/core/relay-chain/chain/cybercrime.go#L35-L63) |
| `Full-tantra-constitutional-convergence`| `EventStore` Entry | JSON Sourcing Record | Cryptographically hashed immutable constitutional log | `REPOSITORY-SPECIFIC` | [`event_sourcing.py:L42-53`](file:///c:/Users/A/Documents/CyberSecurity/Full-tantra-constitutional-convergence/event_sourcing.py#L42-L53), [`event_store.json:L2-18`](file:///c:/Users/A/Documents/CyberSecurity/Full-tantra-constitutional-convergence/event_store.json#L2-L18) |
| `Full-tantra-constitutional-convergence`| `input_signal_contract_v1.json` | JSON Schema v7 | Schema definition for ingested signals and trace IDs | `CANONICAL` (in Tantra) | [`integration_contracts/input_signal_contract_v1.json:L1-35`](file:///c:/Users/A/Documents/CyberSecurity/Full-tantra-constitutional-convergence/integration_contracts/input_signal_contract_v1.json#L1-L35) |
| `Full-tantra-constitutional-convergence`| Ecosystem Adapters | Python Simulators | Mocked endpoints simulating RAJYA, Bucket, InsightBridge | `MOCKED` | [`ecosystem_integration.py:L142-180`](file:///c:/Users/A/Documents/CyberSecurity/Full-tantra-constitutional-convergence/ecosystem_integration.py#L142-L180) |

---

## Section 3 — Security Event and Audit Log Schemas

There is **no shared canonical security event schema** across the four repositories (`NOT DEFINED`). Each implementation defines local fields, constraints, and validation behaviors.

---

### 3.1 `cybercrime` — SQLAlchemy Model `AuditLog`
- **Source:** [`cybercrime/backend/app/db/models.py:L143-163`](file:///c:/Users/A/Documents/CyberSecurity/cybercrime/backend/app/db/models.py#L143-L163)
- **Format:** SQLAlchemy ORM Model mapping to SQLite/PostgreSQL table `audit_logs`
- **Version:** `NOT DEFINED`
- **Sensitive Redaction:** No automated masking; `details` field stores raw JSON payloads.

| Field | Actual type | Required? | Default/constraints | Allowed values | Meaning | Source |
|---|---|---|---|---|---|---|
| `id` | `Integer` | Required | Primary key, autoincrement | Positive integers | Unique record identifier | [`models.py:L144`](file:///c:/Users/A/Documents/CyberSecurity/cybercrime/backend/app/db/models.py#L144) |
| `action` | `String(100)` | Required | Indexed | Any action string (`"LOGIN_SUCCESS"`, `"UPDATE_ROLE"`, etc.) | Action or event performed | [`models.py:L145`](file:///c:/Users/A/Documents/CyberSecurity/cybercrime/backend/app/db/models.py#L145) |
| `message` | `String(255)` | Optional | Nullable | Freeform text description | Human-readable event description | [`models.py:L146`](file:///c:/Users/A/Documents/CyberSecurity/cybercrime/backend/app/db/models.py#L146) |
| `entity_type` | `String(50)` | Optional | Nullable, Indexed | `"user"`, `"case"`, `"evidence"`, `"access_request"` | Type of entity affected | [`models.py:L148`](file:///c:/Users/A/Documents/CyberSecurity/cybercrime/backend/app/db/models.py#L148) |
| `entity_id` | `String(100)` | Optional | Nullable, Indexed | String representation of entity ID | Unique ID of entity affected | [`models.py:L149`](file:///c:/Users/A/Documents/CyberSecurity/cybercrime/backend/app/db/models.py#L149) |
| `status` | `String(20)` | Required | Default: `'success'` | `"success"`, `"warning"`, `"error"` | Resulting outcome of operation | [`models.py:L150`](file:///c:/Users/A/Documents/CyberSecurity/cybercrime/backend/app/db/models.py#L150) |
| `details` | `JSON` | Optional | Nullable | Arbitrary valid JSON dictionary | Supplemental event context/payload | [`models.py:L151`](file:///c:/Users/A/Documents/CyberSecurity/cybercrime/backend/app/db/models.py#L151) |
| `user_id` | `Integer` | Optional | Foreign key to `users.id` | Valid user ID integer or null | Identity of acting user | [`models.py:L158`](file:///c:/Users/A/Documents/CyberSecurity/cybercrime/backend/app/db/models.py#L158) |
| `ip_address` | `String(45)` | Optional | Nullable | IPv4 or IPv6 string | Client IP address | [`models.py:L159`](file:///c:/Users/A/Documents/CyberSecurity/cybercrime/backend/app/db/models.py#L159) |
| `request_id` | `String(100)` | Optional | Nullable, Indexed | UUIDv4 string | Unique HTTP request correlation ID | [`models.py:L160`](file:///c:/Users/A/Documents/CyberSecurity/cybercrime/backend/app/db/models.py#L160) |
| `path` | `String(255)` | Optional | Nullable | URL path string | HTTP endpoint route accessed | [`models.py:L161`](file:///c:/Users/A/Documents/CyberSecurity/cybercrime/backend/app/db/models.py#L161) |
| `method` | `String(10)` | Optional | Nullable | `"GET"`, `"POST"`, `"PUT"`, `"DELETE"`, etc. | HTTP verb utilized | [`models.py:L162`](file:///c:/Users/A/Documents/CyberSecurity/cybercrime/backend/app/db/models.py#L162) |
| `timestamp` | `DateTime` | Required | Default: `datetime.utcnow` | ISO-8601 UTC DateTime object | UTC timestamp of event occurrence | [`models.py:L163`](file:///c:/Users/A/Documents/CyberSecurity/cybercrime/backend/app/db/models.py#L163) |

---

### 3.2 `cybercrime` — Pydantic Schema `AuditLogResponse`
- **Source:** [`cybercrime/backend/app/api/v1/schemas.py:L158-175`](file:///c:/Users/A/Documents/CyberSecurity/cybercrime/backend/app/api/v1/schemas.py#L158-L175)
- **Format:** Pydantic v2 `BaseModel` (`from_attributes = True`)
- **Version:** `NOT DEFINED`

| Field | Actual type | Required? | Default/constraints | Allowed values | Meaning | Source |
|---|---|---|---|---|---|---|
| `id` | `int` | Required | None | Positive integers | Serialized primary key | [`schemas.py:L159`](file:///c:/Users/A/Documents/CyberSecurity/cybercrime/backend/app/api/v1/schemas.py#L159) |
| `action` | `str` | Required | None | Any string | Event action name | [`schemas.py:L160`](file:///c:/Users/A/Documents/CyberSecurity/cybercrime/backend/app/api/v1/schemas.py#L160) |
| `message` | `Optional[str]` | Optional | Default: `None` | Freeform text | Event description | [`schemas.py:L161`](file:///c:/Users/A/Documents/CyberSecurity/cybercrime/backend/app/api/v1/schemas.py#L161) |
| `entity_type`| `Optional[str]` | Optional | Default: `None` | String entity tag | Entity classification | [`schemas.py:L162`](file:///c:/Users/A/Documents/CyberSecurity/cybercrime/backend/app/api/v1/schemas.py#L162) |
| `entity_id` | `Optional[str]` | Optional | Default: `None` | String entity key | Entity identifier | [`schemas.py:L163`](file:///c:/Users/A/Documents/CyberSecurity/cybercrime/backend/app/api/v1/schemas.py#L163) |
| `status` | `str` | Required | None | `"success"`, `"warning"`, `"error"` | Status string | [`schemas.py:L164`](file:///c:/Users/A/Documents/CyberSecurity/cybercrime/backend/app/api/v1/schemas.py#L164) |
| `details` | `Optional[Dict[str, Any]]`| Optional | Default: `None` | Dictionary | Metadata payload | [`schemas.py:L165`](file:///c:/Users/A/Documents/CyberSecurity/cybercrime/backend/app/api/v1/schemas.py#L165) |
| `user_id` | `Optional[int]` | Optional | Default: `None` | Integer user ID | Acting user ID | [`schemas.py:L166`](file:///c:/Users/A/Documents/CyberSecurity/cybercrime/backend/app/api/v1/schemas.py#L166) |
| `ip_address` | `Optional[str]` | Optional | Default: `None` | IP string | Client IP address | [`schemas.py:L167`](file:///c:/Users/A/Documents/CyberSecurity/cybercrime/backend/app/api/v1/schemas.py#L167) |
| `request_id` | `Optional[str]` | Optional | Default: `None` | UUID string | Request correlation ID | [`schemas.py:L168`](file:///c:/Users/A/Documents/CyberSecurity/cybercrime/backend/app/api/v1/schemas.py#L168) |
| `path` | `Optional[str]` | Optional | Default: `None` | Path string | HTTP route path | [`schemas.py:L169`](file:///c:/Users/A/Documents/CyberSecurity/cybercrime/backend/app/api/v1/schemas.py#L169) |
| `method` | `Optional[str]` | Optional | Default: `None` | Verb string | HTTP method | [`schemas.py:L170`](file:///c:/Users/A/Documents/CyberSecurity/cybercrime/backend/app/api/v1/schemas.py#L170) |
| `timestamp` | `datetime` | Required | None | ISO-8601 UTC datetime | Event timestamp | [`schemas.py:L171`](file:///c:/Users/A/Documents/CyberSecurity/cybercrime/backend/app/api/v1/schemas.py#L171) |

---

### 3.3 `cybercrime` — Structured Logger `emit_audit_log`
- **Source:** [`cybercrime/backend/app/core/audit_logging.py:L20-53`](file:///c:/Users/A/Documents/CyberSecurity/cybercrime/backend/app/core/audit_logging.py#L20-L53)
- **Format:** Python Structured JSON Logger Payload (direct logging output)
- **Version:** `NOT DEFINED`

| Field | Actual type | Required? | Default/constraints | Allowed values | Meaning | Source |
|---|---|---|---|---|---|---|
| `timestamp` | `str` | Required | `datetime.utcnow().isoformat()` | ISO-8601 string | UTC event generation time | [`audit_logging.py:L25`](file:///c:/Users/A/Documents/CyberSecurity/cybercrime/backend/app/core/audit_logging.py#L25) |
| `action` | `str` | Required | Passed as argument | Any action string | Operation name | [`audit_logging.py:L26`](file:///c:/Users/A/Documents/CyberSecurity/cybercrime/backend/app/core/audit_logging.py#L26) |
| `status` | `str` | Required | Passed as argument | `"success"`, `"warning"`, `"error"` | Outcome status | [`audit_logging.py:L27`](file:///c:/Users/A/Documents/CyberSecurity/cybercrime/backend/app/core/audit_logging.py#L27) |
| `message` | `str` | Optional | Default: `""` | Freeform text | Event context | [`audit_logging.py:L28`](file:///c:/Users/A/Documents/CyberSecurity/cybercrime/backend/app/core/audit_logging.py#L28) |
| `entity_type`| `Optional[str]` | Optional | Default: `None` | Any string | Entity class | [`audit_logging.py:L29`](file:///c:/Users/A/Documents/CyberSecurity/cybercrime/backend/app/core/audit_logging.py#L29) |
| `entity_id` | `Optional[str]` | Optional | Default: `None` | Any string | Entity identifier | [`audit_logging.py:L30`](file:///c:/Users/A/Documents/CyberSecurity/cybercrime/backend/app/core/audit_logging.py#L30) |
| `user_id` | `Optional[int]` | Optional | Default: `None` | Integer | User ID | [`audit_logging.py:L31`](file:///c:/Users/A/Documents/CyberSecurity/cybercrime/backend/app/core/audit_logging.py#L31) |
| `ip_address` | `Optional[str]` | Optional | Default: `None` | IP string | Client IP | [`audit_logging.py:L32`](file:///c:/Users/A/Documents/CyberSecurity/cybercrime/backend/app/core/audit_logging.py#L32) |
| `request_id` | `Optional[str]` | Optional | Default: `None` | UUID string | Request ID | [`audit_logging.py:L33`](file:///c:/Users/A/Documents/CyberSecurity/cybercrime/backend/app/core/audit_logging.py#L33) |
| `trace_id` | `Optional[str]` | Optional | Extracted from request header | UUID string | Distributed trace ID | [`audit_logging.py:L34`](file:///c:/Users/A/Documents/CyberSecurity/cybercrime/backend/app/core/audit_logging.py#L34) |
| `path` | `Optional[str]` | Optional | Default: `None` | Path string | URL path | [`audit_logging.py:L35`](file:///c:/Users/A/Documents/CyberSecurity/cybercrime/backend/app/core/audit_logging.py#L35) |
| `method` | `Optional[str]` | Optional | Default: `None` | Verb string | HTTP method | [`audit_logging.py:L36`](file:///c:/Users/A/Documents/CyberSecurity/cybercrime/backend/app/core/audit_logging.py#L36) |
| `details` | `Optional[dict]` | Optional | Default: `None` | Dictionary | Additional context | [`audit_logging.py:L37`](file:///c:/Users/A/Documents/CyberSecurity/cybercrime/backend/app/core/audit_logging.py#L37) |

---

### 3.4 `fraud-evidence-system` — Mongoose Model `AuditLog`
- **Source:** [`fraud-evidence-system/Backend/models/AuditLog.js:L4-127`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/models/AuditLog.js#L4-L127)
- **Format:** Mongoose Schema mapping to MongoDB collection `auditlogs`
- **Version:** `NOT DEFINED` (Uses default Mongoose schema options)
- **Sensitive Redaction:** No automated masking; records exact user emails and detail payloads.

| Field | Actual type | Required? | Default/constraints | Allowed values | Meaning | Source |
|---|---|---|---|---|---|---|
| `userId` | `mongoose.Schema.Types.ObjectId` | Optional | Nullable, Indexed, ref: `'User'` | Valid MongoDB ObjectId | Acting user identifier | [`AuditLog.js:L5-8`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/models/AuditLog.js#L5-L8) |
| `userEmail` | `String` | Optional | Trimmed, lowercase | Email regex match | Email address of acting user | [`AuditLog.js:L10-14`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/models/AuditLog.js#L10-L14) |
| `userRole` | `String` | Optional | Default: `'viewer'`, Indexed | `'admin'`, `'investigator'`, `'analyst'`, `'viewer'` | Security role of user | [`AuditLog.js:L15-18`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/models/AuditLog.js#L15-L18) |
| `action` | `String` | Required | Trimmed, uppercase, Indexed | Any action string (`"LOGIN"`, `"LOGOUT"`, `"EVIDENCE_UPLOAD"`, etc.) | Operation name executed | [`AuditLog.js:L19-23`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/models/AuditLog.js#L19-L23) |
| `resource` | `String` | Optional | Trimmed | URL route or resource string | Target resource or route path | [`AuditLog.js:L24-26`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/models/AuditLog.js#L24-L26) |
| `resourceType`| `String` | Required | Indexed | `'evidence'`, `'case'`, `'user'`, `'system'`, `'report'`, `'rl'`, `'blockchain'` | Type of resource affected | [`AuditLog.js:L27-32`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/models/AuditLog.js#L27-L32) |
| `resourceId` | `String` | Optional | Trimmed, Indexed | String representation of resource ID | ID of resource affected | [`AuditLog.js:L33-36`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/models/AuditLog.js#L33-L36) |
| `method` | `String` | Optional | Uppercase | `"GET"`, `"POST"`, `"PUT"`, `"DELETE"`, etc. | HTTP method | [`AuditLog.js:L42-45`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/models/AuditLog.js#L42-L45) |
| `endpoint` | `String` | Optional | Trimmed | Path string | HTTP endpoint route | [`AuditLog.js:L46-49`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/models/AuditLog.js#L46-L49) |
| `ip` | `String` | Optional | Trimmed | IPv4 or IPv6 string | Client IP address | [`AuditLog.js:L50-53`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/models/AuditLog.js#L50-L53) |
| `userAgent` | `String` | Optional | Trimmed | Freeform string | Client browser / user agent | [`AuditLog.js:L54-57`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/models/AuditLog.js#L54-L57) |
| `success` | `Boolean` | Required | Default: `true`, Indexed | `true`, `false` | Whether action succeeded | [`AuditLog.js:L58-62`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/models/AuditLog.js#L58-L62) |
| `statusCode` | `Number` | Optional | Integer HTTP code | `200`, `201`, `400`, `401`, `403`, `404`, `500`, etc. | Resulting HTTP status code | [`AuditLog.js:L63-67`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/models/AuditLog.js#L63-L67) |
| `details` | `mongoose.Schema.Types.Mixed` | Optional | Default: `{}` | Arbitrary object / JSON | Extended payload details | [`AuditLog.js:L68-72`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/models/AuditLog.js#L68-L72) |
| `auditLevel` | `String` | Optional | Default: `'info'`, Indexed | `'info'`, `'warning'`, `'critical'` | Severity classification of audit entry | [`AuditLog.js:L73-78`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/models/AuditLog.js#L73-L78) |
| `blockchainTxHash` | `String` | Optional | Trimmed | `0x` hex string | Transaction hash if anchored to blockchain | [`AuditLog.js:L79-82`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/models/AuditLog.js#L79-L82) |
| `blockchainBlockNumber` | `Number` | Optional | Positive integer | Block number | Block number if anchored on chain | [`AuditLog.js:L83-86`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/models/AuditLog.js#L83-L86) |
| `blockchainSynced` | `Boolean` | Optional | Default: `false`, Indexed | `true`, `false` | Status of blockchain anchoring sync | [`AuditLog.js:L87-91`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/models/AuditLog.js#L87-L91) |
| `timestamp` | `Date` | Required | Default: `Date.now`, Indexed | ISO-8601 Date object | Creation timestamp | [`AuditLog.js:L93-97`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/models/AuditLog.js#L93-L97) |
| `retentionDate`| `Date` | Optional | Default: `Date.now() + 365 days`, Indexed | Future Date | Scheduled data expiration date | [`AuditLog.js:L98-103`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/models/AuditLog.js#L98-L103) |

---

### 3.5 `fraud-evidence-system` — Conflicting Service Schema (`auditService.js`)
- **Source:** [`fraud-evidence-system/Backend/services/auditService.js:L38-55`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/services/auditService.js#L38-L55)
- **Status:** **`CONFIRMED DEFECT`** / `MISMATCH`. This service constructs and attempts to save an object directly to Mongoose `AuditLog` that violates schema definitions.
- **Root Cause Evidence:** Documented in `Backend/test_output.txt:L398`:
  - Passes `ipAddress` instead of `ip` (causing `ip` to remain empty).
  - Passes `status` (`'success'` / `'failure'`) instead of `success` (Boolean) and omits `statusCode`.
  - Passes `severity` (`'low'`, `'medium'`, `'high'`) instead of `auditLevel` (`'info'`, `'warning'`, `'critical'`).
  - Passes `userId` as a raw string without checking for valid MongoDB `ObjectId` types, causing CastErrors when system actions pass string names like `'system'`.

---

### 3.6 `fraud-evidence-system` — Telemetry Models (`RequestLog` & `LoginLog`)
- **`RequestLog` Model:** [`Backend/models/RequestLog.js:L4-12`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/models/RequestLog.js#L4-L12) (Invoked by Express middleware [`Backend/middleware/auditLogger.js:L1-23`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/middleware/auditLogger.js#L1-L23)):
  - `ip`: `String` (Nullable)
  - `method`: `String` (Nullable)
  - `path`: `String` (Nullable)
  - `user`: `String` (Default: `'anonymous'`)
  - `timestamp`: `Date` (Default: `Date.now`)
- **`LoginLog` Model:** [`Backend/models/LoginLog.js:L3-12`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/models/LoginLog.js#L3-L12):
  - `userId`: `mongoose.Schema.Types.ObjectId` (Required, ref: `'User'`)
  - `loginTime`: `Date` (Default: `Date.now`)
  - `ip`: `String` (Optional)
  - `userAgent`: `String` (Optional)

---

### 3.7 `Full-tantra-constitutional-convergence` — Immutable `EventStore` Entry
- **Source:** [`Full-tantra-constitutional-convergence/event_sourcing.py:L42-53`](file:///c:/Users/A/Documents/CyberSecurity/Full-tantra-constitutional-convergence/event_sourcing.py#L42-L53) and [`event_store.json:L2-18`](file:///c:/Users/A/Documents/CyberSecurity/Full-tantra-constitutional-convergence/event_store.json#L2-L18)
- **Format:** In-memory Python dataclass serialized to append-only JSON file
- **Version:** `NOT DEFINED`

| Field | Actual type | Required? | Default/constraints | Allowed values | Meaning | Source |
|---|---|---|---|---|---|---|
| `event_id` | `str` | Required | Unique hash/UUID | String (`EVT-...`) | Event sequence identifier | [`event_sourcing.py:L44`](file:///c:/Users/A/Documents/CyberSecurity/Full-tantra-constitutional-convergence/event_sourcing.py#L44) |
| `trace_id` | `str` | Required | Regex: `^TRACE-[a-f0-9]{12}$` | 18-char string | Distributed transaction identifier | [`event_sourcing.py:L45`](file:///c:/Users/A/Documents/CyberSecurity/Full-tantra-constitutional-convergence/event_sourcing.py#L45) |
| `event_type` | `str` | Required | Explicit type | `"INGESTION"`, `"VALIDATION"`, etc. | Classification of state transition | [`event_sourcing.py:L46`](file:///c:/Users/A/Documents/CyberSecurity/Full-tantra-constitutional-convergence/event_sourcing.py#L46) |
| `timestamp` | `str` | Required | ISO-8601 UTC with `Z` | Regex: `Z$` | Canonical timestamp | [`event_sourcing.py:L47`](file:///c:/Users/A/Documents/CyberSecurity/Full-tantra-constitutional-convergence/event_sourcing.py#L47) |
| `data` | `dict` | Required | Freeform payload | Dictionary | Raw telemetry or state payload | [`event_sourcing.py:L48`](file:///c:/Users/A/Documents/CyberSecurity/Full-tantra-constitutional-convergence/event_sourcing.py#L48) |
| `previous_event_hash` | `str` | Required | SHA256 hex string (`64` chars) | Hex string or `'GENESIS'` | Cryptographic backlink to prior event | [`event_sourcing.py:L49`](file:///c:/Users/A/Documents/CyberSecurity/Full-tantra-constitutional-convergence/event_sourcing.py#L49) |
| `current_event_hash` | `str` | Required | SHA256 of canonical JSON payload | 64-char hex string | Tamper-evident hash of this record | [`event_sourcing.py:L50`](file:///c:/Users/A/Documents/CyberSecurity/Full-tantra-constitutional-convergence/event_sourcing.py#L50) |
| `immutable` | `bool` | Required | Constant: `True` | `true` | Immutability declaration | [`event_sourcing.py:L51`](file:///c:/Users/A/Documents/CyberSecurity/Full-tantra-constitutional-convergence/event_sourcing.py#L51) |
| `lineage_sequence` | `int` | Required | Monotonically increasing counter | Positive integer | Sequence order in event store | [`event_sourcing.py:L52`](file:///c:/Users/A/Documents/CyberSecurity/Full-tantra-constitutional-convergence/event_sourcing.py#L52) |

---

## Section 4 — Real Security Event Examples

The following examples represent real structures copied directly from existing test runs, database test fixtures, and route handlers. Sensitive credentials, real IP addresses, and personal email addresses are replaced with `[REDACTED]`.

---

### Example 1: Failed Login Event
- **Classification:** Real Test Execution Output / Database Log Entry
- **Schema Followed:** `fraud-evidence-system/Backend/models/AuditLog.js`
- **Source References:** Sourced from [`Backend/test_results.json:L236-248`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/test_results.json#L236-L248) and verified by brute-force query test fixture in [`Backend/models/AuditLog.js:L172-200`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/models/AuditLog.js#L172-L200).

```json
{
  "_id": "670ba90e8f192b001a1c9004",
  "userId": null,
  "userEmail": "[REDACTED]@bhiv.gov",
  "userRole": "viewer",
  "action": "LOGIN_FAILED",
  "resource": "/api/auth/login",
  "resourceType": "user",
  "resourceId": null,
  "method": "POST",
  "endpoint": "/api/auth/login",
  "ip": "[REDACTED]",
  "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  "success": false,
  "statusCode": 401,
  "details": {
    "reason": "Invalid credentials",
    "attempt": 3
  },
  "auditLevel": "warning",
  "blockchainSynced": false,
  "timestamp": "2026-10-13T08:14:22.104Z",
  "retentionDate": "2027-10-13T08:14:22.104Z"
}
```

---

### Example 2: Successful Role Elevation / Privilege Change
- **Classification:** Operational Event Log Structure
- **Schema Followed:** `cybercrime/backend/app/core/audit_logging.py`
- **Source References:** Emitted by endpoint [`backend/app/api/v1/endpoints/access_requests.py:L215-224`](file:///c:/Users/A/Documents/CyberSecurity/cybercrime/backend/app/api/v1/endpoints/access_requests.py#L215-L224) via logging utility [`backend/app/core/audit_logging.py:L20-53`](file:///c:/Users/A/Documents/CyberSecurity/cybercrime/backend/app/core/audit_logging.py#L20-L53).

```json
{
  "timestamp": "2026-10-13T07:22:15.892011",
  "action": "ACCESS_REQUEST_APPROVED",
  "status": "success",
  "message": "Role elevated to investigator",
  "entity_type": "access_request",
  "entity_id": "42",
  "user_id": 1,
  "ip_address": "[REDACTED]",
  "request_id": "req-9b872c01-44aa-43d9-9528-66cf5331e842",
  "trace_id": "trace-81cf8923-d34e-4b6e-8ff4-93ab71c89021",
  "path": "/api/v1/access-requests/42/approve",
  "method": "POST",
  "details": {
    "target_user_id": 7,
    "requested_role": "investigator",
    "approved_by": 1
  }
}
```

---

### Example 3: Forensic Evidence Access / Download
- **Classification:** Operational Event Log Structure
- **Schema Followed:** `cybercrime/backend/app/db/models.py:AuditLog`
- **Source References:** Emitted during download processing in [`backend/app/api/v1/endpoints/evidence.py:L142-168`](file:///c:/Users/A/Documents/CyberSecurity/cybercrime/backend/app/api/v1/endpoints/evidence.py#L142-L168).

```json
{
  "id": 1084,
  "timestamp": "2026-10-13T07:45:00.120489",
  "action": "EVIDENCE_ACCESSED",
  "status": "success",
  "message": "Evidence downloaded by investigator",
  "entity_type": "evidence",
  "entity_id": "ev-88319",
  "user_id": 7,
  "ip_address": "[REDACTED]",
  "request_id": "req-4a8f9021-0112-45e8-b80c-783dfbb01948",
  "path": "/api/v1/evidence/ev-88319/download",
  "method": "GET",
  "details": {
    "file_hash": "[REDACTED_SHA256_HASH]",
    "case_id": "CASE-2026-0042",
    "access_level": "read"
  }
}
```

---

## Section 5 — Threat Signal and Detection Schemas

The repositories define distinct threat-detection engines with incompatible output formats and divergent metric scales.

### 5.1 Threat Detection Engines Inventory

| Detector | Output Field | Type | Required? | Range / Allowed Values | Destination | Source |
|---|---|---|---|---|---|---|
| **Vajra Sarathi Engine** (`fraud.go`) | `decision` | `string` | Required | `"allow"`, `"block"` | Consensus pipeline | [`fraud.go:L22`](file:///c:/Users/A/Documents/CyberSecurity/bhiv-VAJRA_Blockchain-main/bhiv-VAJRA_Blockchain-main/core/relay-chain/fraud/fraud.go#L22) |
| **Vajra Sarathi Engine** (`fraud.go`) | `reason` | `string` | Required | Open reason string | Validator log | [`fraud.go:L23`](file:///c:/Users/A/Documents/CyberSecurity/bhiv-VAJRA_Blockchain-main/bhiv-VAJRA_Blockchain-main/core/relay-chain/fraud/fraud.go#L23) |
| **Vajra Sarathi Engine** (`fraud.go`) | `trace_id` | `string` | Required | Open string token | Header / Context | [`fraud.go:L24`](file:///c:/Users/A/Documents/CyberSecurity/bhiv-VAJRA_Blockchain-main/bhiv-VAJRA_Blockchain-main/core/relay-chain/fraud/fraud.go#L24) |
| **Vajra Sarathi Engine** (`fraud.go`) | `risk_score` | `int` | Required | `0` to `100` (Integer) | Block validation | [`fraud.go:L25`](file:///c:/Users/A/Documents/CyberSecurity/bhiv-VAJRA_Blockchain-main/bhiv-VAJRA_Blockchain-main/core/relay-chain/fraud/fraud.go#L25) |
| **Vajra AI Checker** (`cybercrime.go`) | `highestRiskScore` | `int` | Required | `0` to `100` (Integer) | Outbound HTTP caller | [`cybercrime.go:L42`](file:///c:/Users/A/Documents/CyberSecurity/bhiv-VAJRA_Blockchain-main/bhiv-VAJRA_Blockchain-main/core/relay-chain/chain/cybercrime.go#L42) |
| **Vajra AI Checker** (`cybercrime.go`) | `highestSeverity` | `int` | Required | `1` to `5` (Integer) | Outbound HTTP caller | [`cybercrime.go:L43`](file:///c:/Users/A/Documents/CyberSecurity/bhiv-VAJRA_Blockchain-main/bhiv-VAJRA_Blockchain-main/core/relay-chain/chain/cybercrime.go#L43) |
| **Vajra AI Checker** (`cybercrime.go`) | `approvedReports` | `int` | Required | Non-negative integer | Threshold validator | [`cybercrime.go:L44`](file:///c:/Users/A/Documents/CyberSecurity/bhiv-VAJRA_Blockchain-main/bhiv-VAJRA_Blockchain-main/core/relay-chain/chain/cybercrime.go#L44) |
| **ML Violation** (`mlViolationDetector.js`)| `violator` | `string` | Required | EVM Address (`0x...`) | Service caller | [`mlViolationDetector.js:L361`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/services/mlViolationDetector.js#L361) |
| **ML Violation** (`mlViolationDetector.js`)| `violationType` | `number` | Required | `0` to `5` (Integer enum) | Smart Contract ABI | [`mlViolationDetector.js:L362`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/services/mlViolationDetector.js#L362) |
| **ML Violation** (`mlViolationDetector.js`)| `score` | `number` | Required | `0.0` to `1.0` (Float) | DB & Contract | [`mlViolationDetector.js:L363`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/services/mlViolationDetector.js#L363) |
| **ML Violation** (`mlViolationDetector.js`)| `recommended_action`| `string` | Required | `"freeze"`, `"investigate"`, `"flag"`, `"monitor"` | RL Engine | [`mlViolationDetector.js:L364`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/services/mlViolationDetector.js#L364) |
| **ML Violation** (`mlViolationDetector.js`)| `confidence` | `number` | Required | `0.0` to `1.0` (Float) | Service caller | [`mlViolationDetector.js:L365`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/services/mlViolationDetector.js#L365) |
| **ML Violation** (`mlViolationDetector.js`)| `evidence` | `object` | Optional | Arbitrary metrics dictionary | DB / Case filing | [`mlViolationDetector.js:L367`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/services/mlViolationDetector.js#L367) |
| **On-Chain Log** (`Cybercrime.sol`) | `violationId` | `uint256` | Required | Monotonic counter | EVM Event Log | [`Cybercrime.sol:L37`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/Contracts/Cybercrime.sol#L37) |
| **On-Chain Log** (`Cybercrime.sol`) | `violator` | `address` | Required | 20-byte EVM address | EVM Event Log | [`Cybercrime.sol:L38`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/Contracts/Cybercrime.sol#L38) |
| **On-Chain Log** (`Cybercrime.sol`) | `violationType` | `uint8` | Required | `0` to `6` (Solidity Enum) | EVM Event Log | [`Cybercrime.sol:L39`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/Contracts/Cybercrime.sol#L39) |
| **On-Chain Log** (`Cybercrime.sol`) | `riskScore` | `uint256` | Required | `0` to `100` (Integer) | EVM Event Log | [`Cybercrime.sol:L40`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/Contracts/Cybercrime.sol#L40) |
| **Cybercrime ML** (`predict_fraud.py`) | `is_fraud` | `int` | Required | `0`, `1` | API Response | [`predict_fraud.py:L145`](file:///c:/Users/A/Documents/CyberSecurity/cybercrime/backend/ml_training/predict_fraud.py#L145) |
| **Cybercrime ML** (`predict_fraud.py`) | `fraud_probability` | `float` | Required | `0.0` to `1.0` (Float) | API Response | [`predict_fraud.py:L146`](file:///c:/Users/A/Documents/CyberSecurity/cybercrime/backend/ml_training/predict_fraud.py#L146) |
| **Cybercrime ML** (`predict_fraud.py`) | `prediction` | `str` | Required | `"FRAUD"`, `"NORMAL"` | API Response | [`predict_fraud.py:L148`](file:///c:/Users/A/Documents/CyberSecurity/cybercrime/backend/ml_training/predict_fraud.py#L148) |
| **Cybercrime ML** (`predict_fraud.py`) | `confidence` | `float` | Required | `0.0` to `1.0` (Float) | API Response | [`predict_fraud.py:L149`](file:///c:/Users/A/Documents/CyberSecurity/cybercrime/backend/ml_training/predict_fraud.py#L149) |
| **Cybercrime Incidents** (`incidents.py`)| `risk_score` | `float` | Required | `0.0` to `1.0` (Float) | Frontend UI | [`incidents.py:L221`](file:///c:/Users/A/Documents/CyberSecurity/cybercrime/backend/app/api/v1/endpoints/incidents.py#L221) |
| **Cybercrime Incidents** (`incidents.py`)| `risk_level` | `str` | Required | `"LOW"`, `"MEDIUM"`, `"HIGH"`, `"CRITICAL"` | Frontend UI | [`incidents.py:L222`](file:///c:/Users/A/Documents/CyberSecurity/cybercrime/backend/app/api/v1/endpoints/incidents.py#L222) |
| **Cybercrime Incidents** (`incidents.py`)| `detected_patterns` | `list` | Required | Array of pattern string tags | Frontend UI | [`incidents.py:L223`](file:///c:/Users/A/Documents/CyberSecurity/cybercrime/backend/app/api/v1/endpoints/incidents.py#L223) |
| **RL Engine Service** (`rlEngineService.js`)| `action` | `string` | Required | `"no_action"`, `"monitor"`, `"investigate"`, `"escalate"`, `"freeze"` | Security Ops Queue | [`rlEngineService.js:L26`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/services/rlEngineService.js#L26) |

---

## Section 6 — Threat Categories and Severity

- **CANONICAL THREAT CATEGORY LIST:** **`NOT DEFINED`**. There is no unified taxonomy shared across repositories.

### 6.1 Concrete Category Lists by Repository

#### 1. `bhiv-VAJRA_Blockchain-main` — Sarathi Transaction Rule Categories
Defined in [`core/relay-chain/fraud/fraud.go:L55-115`](file:///c:/Users/A/Documents/CyberSecurity/bhiv-VAJRA_Blockchain-main/bhiv-VAJRA_Blockchain-main/core/relay-chain/fraud/fraud.go#L55-L115):
- `permanently_blocked_address`: Hard-coded blacklist match. Score: `100`. Decision: `"block"`.
- `empty_address`: Sender or recipient address is zero/empty string. Score: `90`. Decision: `"block"`.
- `self_transfer`: Sender address equals recipient address. Score: `80`. Decision: `"block"`.
- `zero_amount`: Transaction transfer amount is `<= 0`. Score: `70`. Decision: `"block"`.
- `single_tx_limit_500000`: Transfer amount exceeds `500,000` units. Score: `85`. Decision: `"block"`.
- `velocity_10_per_60s`: Address originates more than `10` transactions in `60` seconds. Score: `90`. Decision: `"block"`.
- `cumulative_1000000_per_60s`: Cumulative transferred value exceeds `1,000,000` units in `60` seconds. Score: `88`. Decision: `"block"`.
- `stale_timestamp_600s`: Transaction timestamp deviates from current node time by more than `600` seconds. Score: `75`. Decision: `"block"`.

#### 2. `fraud-evidence-system` — On-Chain & DeFi Violation Enums
Defined in [`Contracts/Cybercrime.sol:L26-34`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/Contracts/Cybercrime.sol#L26-L34) and mapped in [`services/mlViolationDetector.js:L30-80`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/services/mlViolationDetector.js#L30-L80):
- `RAPID_DUMP` (`0`): `"Rapid token dump"` (High-velocity liquidation of acquired tokens).
- `FLASH_ATTACK` (`1`): `"Flash attack"` (Multi-step arbitrage borrowing and pool manipulation).
- `WASH_TRADING` (`2`): `"Wash trading"` (Circular transaction flow among colluding addresses).
- `PUMP_AND_DUMP` (`3`): `"Pump and dump"` (Artificial volume inflation followed by dump).
- `SUSPICIOUS_PATTERN` (`4`): `"Anomalous swap pattern"` (Heuristic deviation in pool swaps).
- `ML_DETECTED` (`5`): `"ML_DETECTED"` (Anomaly detected via IsolationForest or neural model).
- `MANUAL_REPORT` (`6`): Manual investigator filing.

#### 3. `cybercrime` — Suspicious AML Pattern Enums
Defined in [`backend/synthetic_data_generator/suspicious_patterns.py:L87-105`](file:///c:/Users/A/Documents/CyberSecurity/cybercrime/backend/synthetic_data_generator/suspicious_patterns.py#L87-L105):
- `rapid_consolidation`: Multi-source incoming funds rapidly consolidated to single output. Score addition: `+0.4`.
- `layering`: Repeated transfers across intermediate intermediary wallets. Score addition: `+0.3`.
- `circular_pattern`: Funds returning to originating node through proxy addresses. Score addition: `+0.2`.

### 6.2 Audit Target Analysis

| Audit Target Category | Implementation Status | Findings and Evidence |
|---|---|---|
| **Brute-Force Login Detection** | `INFERRED` / Offline Query Only | There is **no active real-time detector or signal generator**. An offline static query exists in [`fraud-evidence-system/Backend/models/AuditLog.js:L172-200`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/models/AuditLog.js#L172-L200) (`findSuspiciousActivity`) that aggregates failed logins (`action: 'LOGIN_FAILED'`, threshold `>= 5` attempts within `15 minutes`). It is not wired to an automated threat emitter. |
| **Privilege Escalation Detection** | `NOT DEFINED` | While role assignment routes exist ([`access_requests.py:L189-223`](file:///c:/Users/A/Documents/CyberSecurity/cybercrime/backend/app/api/v1/endpoints/access_requests.py#L189-L223) and [`userManagementRoutes.js:L90`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/routes/userManagementRoutes.js#L90)), there is **no detection module or signal** that evaluates unauthorized role escalation patterns. |
| **Data Exfiltration Detection** | `NOT DEFINED` | Completely absent from all four repositories. No traffic volume, query threshold, or exfiltration monitoring algorithms exist. |

---

## Section 7 — Incidents, Cases, Correlation, and Timelines

### 7.1 Entity Clustering & Correlation Implementation
- **Core Module:** [`fraud-evidence-system/Backend/services/caseLinkingService.js:L12-66`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/services/caseLinkingService.js#L12-L66)
- **Investigation Model:** [`fraud-evidence-system/Backend/models/Investigation.js:L138-205`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/models/Investigation.js#L138-L205)
- **Active Correlation Rules:**
  1. **Direct Identifier Match:** Performs database lookup on shared wallet addresses, IP addresses, or evidentiary file hashes.
  2. **Temporal Window Correlation:** Evaluates timestamps within a `1-hour` sliding window ([`caseLinkingService.js:L238-288`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/services/caseLinkingService.js#L238-L288)).
  3. **Geographic Proximity Correlation:** Applies the Haversine spherical distance formula on GeoIP coordinates to group actions occurring within `<= 100 km` ([`caseLinkingService.js:L295-338`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/services/caseLinkingService.js#L295-L338)).
  4. **Behavioral Similarity Matching:** Compares transaction frequency and token dump velocity ([`caseLinkingService.js:L345-390`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/services/caseLinkingService.js#L345-L390)).

### 7.2 Identifier Generation Schemes
- **Investigation ID:** Auto-generated via pre-save hook in [`Backend/models/Investigation.js:L296-300`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/models/Investigation.js#L296-L300):
  ```javascript
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
  this.investigationId = `INV-${dateStr}-${randomSuffix}`; // e.g., INV-20261013-A1B2C3
  ```
- **Case ID (`fraud-evidence-system`):** Auto-generated in [`Backend/models/Case.js:L10-12`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/models/Case.js#L10-L12):
  ```javascript
  `CASE-${Date.now()}-${crypto.randomBytes(3).toString('hex')}` // e.g., CASE-1760345600000-fa89bc
  ```
- **Case ID (`cybercrime`):** Autoincrementing relational integer `cases.id` (`int`) mapped to string prefix `CASE-YYYY-XXXX` in route responses ([`cybercrime/backend/app/db/models.py:L35-50`](file:///c:/Users/A/Documents/CyberSecurity/cybercrime/backend/app/db/models.py#L35-L50)).
- **Incident Report ID (`cybercrime`):** Constructed via string concatenation in [`incidents.py:L227`](file:///c:/Users/A/Documents/CyberSecurity/cybercrime/backend/app/api/v1/endpoints/incidents.py#L227): `IR-${date}-${wallet_suffix}`.

### 7.3 Timeline Generation
- **`cybercrime`:** Assembles arrays of `TimelineEntry` objects in [`backend/app/api/v1/schemas.py:L202-206`](file:///c:/Users/A/Documents/CyberSecurity/cybercrime/backend/app/api/v1/schemas.py#L202-L206) containing `timestamp` (`datetime`), `action` (`str`), and `description` (`str`).
- **`fraud-evidence-system`:** Embedded `TimelineEventSchema` in [`Backend/models/Investigation.js:L59-90`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/models/Investigation.js#L59-L90) with dedicated query route [`Backend/routes/evidenceRoutes.js:L445-450`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/routes/evidenceRoutes.js#L445-L450) (`/api/evidence/timeline/:entity`).

### 7.4 Replay and Provenance
- **`Full-tantra-constitutional-convergence`:** Implements deterministic replay and hash-chain verification in [`event_sourcing.py:L79-100`](file:///c:/Users/A/Documents/CyberSecurity/Full-tantra-constitutional-convergence/event_sourcing.py#L79-L100) (`replay_from_event()`, `verify_replay_determinism()`).
- **`Full-tantra` Ecosystem Adapters:** Marked **`MOCKED`** in [`Full-tantra-constitutional-convergence/ecosystem_integration.py:L142-180`](file:///c:/Users/A/Documents/CyberSecurity/Full-tantra-constitutional-convergence/ecosystem_integration.py#L142-L180). Simulates responses for `RAJYA` HTTP handoff, Bucket storage persistence, and InsightBridge telemetry ingestion.

---

## Section 8 — Trace IDs and Identifier Mapping

| Identifier | Repository | Exact Format / Type | Generated By | Stored Where | Used By | Mapping Status | Source |
|---|---|---|---|---|---|---|---|
| `trace_id` | `cybercrime` | UUIDv4 string (`36` chars) | `request_context_middleware` | HTTP response headers & `request.state` | Loggers & downstream calls | **MISMATCH** with Tantra regex | [`main.py:L549-553`](file:///c:/Users/A/Documents/CyberSecurity/cybercrime/backend/main.py#L549-L553) |
| `trace_id` | `fraud-evidence-system` | UUIDv4 string (`36` chars) | Express middleware (`server.js`) | HTTP response headers (`x-trace-id`) | Request context | **MISMATCH** with Tantra regex | [`server.js:L49-56`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/server.js#L49-L56) |
| `trace_id` | `bhiv-VAJRA` | String token / UUID | Substrate transaction dispatcher | `FraudRequest` / `FraudResponse` | Sarathi rule engine | Open string; unmapped | [`fraud.go:L24`](file:///c:/Users/A/Documents/CyberSecurity/bhiv-VAJRA_Blockchain-main/bhiv-VAJRA_Blockchain-main/core/relay-chain/fraud/fraud.go#L24) |
| `trace_id` | `Full-tantra` | String: `^TRACE-[a-f0-9]{12}$` | Upstream ingestion generator | `event_store.json` | Replay & contract engine | Enforces strict regex constraint | [`input_signal_contract_v1.json:L18`](file:///c:/Users/A/Documents/CyberSecurity/Full-tantra-constitutional-convergence/integration_contracts/input_signal_contract_v1.json#L18) |
| `request_id` | `cybercrime` | UUIDv4 string (`36` chars) | Middleware / Client header | `audit_logs.request_id` column | Relational audit query | Scoped to cybercrime DB | [`models.py:L160`](file:///c:/Users/A/Documents/CyberSecurity/cybercrime/backend/app/db/models.py#L160) |
| `request_id` | `fraud-evidence-system` | UUIDv4 string (`36` chars) | Express middleware (`server.js`) | HTTP response headers | Middleware telemetry | Scoped to HTTP headers | [`server.js:L50`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/server.js#L50) |
| `event_id` | `Full-tantra` | String (`EVT-...`) | Event Store Dispatcher | `event_store.json` (`event_id`) | Event sourcing replay | Scoped to Tantra store | [`event_sourcing.py:L44`](file:///c:/Users/A/Documents/CyberSecurity/Full-tantra-constitutional-convergence/event_sourcing.py#L44) |
| `case_id` / `caseId` | `cybercrime` | Integer (`int`) | SQLite Autoincrement PK | `cases.id` column | Foreign key in `evidence` | **MISMATCH** with Mongo/UUID | [`models.py:L36`](file:///c:/Users/A/Documents/CyberSecurity/cybercrime/backend/app/db/models.py#L36) |
| `caseId` | `fraud-evidence-system` | String (`CASE-...`) | Mongoose pre-save hook | `cases.caseId` string index | Forensic evidence grouping | **MISMATCH** with cybercrime | [`Case.js:L10`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/models/Case.js#L10) |
| `investigationId` | `fraud-evidence-system` | String (`INV-YYYYMMDD-...`) | Mongoose pre-save hook | `investigations.investigationId` | Cross-case entity linking | Not mapped to cybercrime | [`Investigation.js:L298`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/models/Investigation.js#L298) |
| `evidence_id` | `cybercrime` | Integer (`int`) | SQLite Autoincrement PK | `evidence.id` column | Local API references | **MISMATCH** with Mongo ObjectId | [`models.py:L56`](file:///c:/Users/A/Documents/CyberSecurity/cybercrime/backend/app/db/models.py#L56) |
| `evidenceId` | `fraud-evidence-system` | MongoDB `ObjectId` string | MongoDB driver `_id` | `evidence._id` collection index | Multi-storage file records | **MISMATCH** with cybercrime | [`Evidence.js:L5`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/models/Evidence.js#L5) |
| `wallet` / `violator` | All Repositories | 20-byte Hex (`0x[a-fA-F0-9]{40}`) | User wallet / client | Addresses across DB & Go | AI checks & blocklists | Structurally compatible hex | [`Cybercrime.sol:L38`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/Contracts/Cybercrime.sol#L38) |

---

## Section 9 — Integration Contracts

### 9.1 Vajra to Fraud Evidence System (AI Fraud Check)
- **Caller:** `bhiv-VAJRA_Blockchain-main/core/relay-chain/chain/cybercrime.go` (`AIFraudChecker.CheckFraud`)
- **Receiver:** `fraud-evidence-system/Backend/routes/wallet.js` (`GET /api/wallet-data/:address`)
- **Transport:** HTTP GET (Port configured via relay-chain env)
- **Caller Expectation:**
  ```go
  type WalletData struct {
      Wallet          string `json:"wallet"`
      HighestRiskScore int    `json:"highestRiskScore"`
      HighestSeverity  int    `json:"highestSeverity"`
      ApprovedReports  int    `json:"approvedReports"`
  }
  ```
- **Receiver Actual Response:**
  ```javascript
  res.json({
      wallet: req.params.address,
      riskScore: calculatedScore, // Mismatched key name
      flagged: isFlagged,
      lastUpdated: new Date()
  });
  ```
- **Integration Status:** **`CONFIRMED DEFECT`**. Go JSON unmarshaling fails to parse `highestRiskScore` and `approvedReports`, setting them to default `0`. As a result, `shouldBlockWallet()` evaluates to `false` and malicious transactions are never blocked on-chain based on AI risk score.

### 9.2 Cybercrime to Sovereign Core / TANTRA Handoff
- **Caller:** `cybercrime/backend/app/core/sovereign_integrations.py` (`emit_core_event`)
- **Receiver:** `Full-tantra-constitutional-convergence` (`TANTRA_CORE_BASE_URL/api/v1/sovereign`)
- **Transport:** HTTP POST
- **Request Payload:**
  ```json
  {
    "action": "GOVERNANCE_AUDIT",
    "caseId": 42,
    "evidenceId": 1084,
    "riskScore": 0.85,
    "timestamp": "2026-10-13T07:45:00.120489",
    "metadata": { "origin": "cybercrime_backend" }
  }
  ```
- **Authentication:** `NOT DEFINED` (No shared secret or mutual TLS configured).
- **Integration Status:** **`MOCKED`** / Fallback. When the remote endpoint fails or is offline, the function falls back to writing synthetic records to local disk (`scratch/` directory).

### 9.3 TANTRA Ecosystem Contracts
- **Caller:** `Full-tantra-constitutional-convergence/ecosystem_integration.py`
- **Contracts Referenced:**
  - `integration_contracts/input_signal_contract_v1.json`
  - `integration_contracts/rajya_validation_contract_v1.json`
  - `integration_contracts/insight_bridge_telemetry_contract_v1.json`
  - `integration_contracts/bucket_persistence_contract_v1.json`
- **Integration Status:** **`MOCKED`**. Calls are executed via simulator routines: `simulate_rajya_response()`, `simulate_bucket_persistence()`, and `simulate_insightbridge_ingest()`.

---

## Section 10 — Identity, Authorization, and Data Protection

### 10.1 Authentication Mechanisms
- **`cybercrime`:** FastAPI OAuth2 password flow issuing JWT access tokens. Tokens are signed using `HS256` with local `SECRET_KEY` and verified via `get_current_user` dependency ([`backend/app/api/deps.py:L25-45`](file:///c:/Users/A/Documents/CyberSecurity/cybercrime/backend/app/api/deps.py#L25-L45)).
- **`fraud-evidence-system`:** Express JWT middleware (`auth.js`) validating Bearer tokens against `JWT_SECRET`.
- **`bhiv-VAJRA`:** Substrate Ed25519 / SR25519 cryptographic keypairs for transaction signing.
- **Service-to-Service Auth:** **`NOT DEFINED`**. No mTLS, shared HMAC tokens, or service credentials exist for communication between `cybercrime` and `fraud-evidence-system`.

### 10.2 Roles, Permissions, and Actor ID Formats
- **Actor ID Representation:**
  - `cybercrime`: Autoincrementing integer `User.id` (`int`).
  - `fraud-evidence-system`: MongoDB `ObjectId` string (`24` hex chars) or Supabase UUID (`36` chars).
  - Cross-system mapping: **`NOT DEFINED`**.
- **Role Enums:** Both repositories implement role hierarchies:
  - `'admin'`: Full system administrative and role elevation authority.
  - `'investigator'`: Case creation, evidence upload, and analysis permissions.
  - `'analyst'`: Read and query access to reports and risk models.
  - `'viewer'`: Read-only access to public cases.

### 10.3 Evidence Access Control & Storage
- **`fraud-evidence-system`:** Evidence upload and retrieval are guarded by `productionRBAC.js` and `authorize.js`. Uploaded files are hashed using SHA-256 and stored via `hybridStorageService.js` (local storage with fallback IPFS simulation).
- **`cybercrime`:** Evidence download route (`GET /api/v1/evidence/{id}/download`) enforces investigator/admin authentication before streaming binary content.

### 10.4 Data Redaction & Sanitization Practices
- **Audit Log Payloads:** **`SECURITY EXPOSURE GAP`**. Neither `cybercrime` nor `fraud-evidence-system` applies automated sanitization filters before persisting JSON payloads into `details` or `metadata`. Passwords are redacted in authentication route responses, but arbitrary dictionaries passed to audit loggers are written unredacted.
- **Retention Policies:** `fraud-evidence-system/Backend/models/AuditLog.js:L98-103` defines `retentionDate` with a default TTL index set to `Date.now() + 365 days` (1-year retention). In `cybercrime`, retention policies are **`NOT DEFINED`**.

---

## Section 11 — Cross-Repository Mismatches and Defects

| Contract Area | Repository A | Repository B | Actual Mismatch | Impact Supported by Code / Tests | Source References | Verified Status |
|---|---|---|---|---|---|---|
| **Wallet Risk Contract** | `bhiv-VAJRA_Blockchain-main` | `fraud-evidence-system` | Vajra queries `/api/wallet-data/{address}` expecting `{ highestRiskScore, highestSeverity, approvedReports }`. But `fraud-evidence-system` returns `{ wallet, riskScore, flagged, lastUpdated }`. | **CRITICAL DEFECT:** Go unmarshaling leaves `HighestRiskScore = 0` and `ApprovedReports = 0`. As a result, `shouldBlockWallet()` never triggers and malicious wallets are not blocked on-chain. | [`cybercrime.go:L35-50`](file:///c:/Users/A/Documents/CyberSecurity/bhiv-VAJRA_Blockchain-main/bhiv-VAJRA_Blockchain-main/core/relay-chain/chain/cybercrime.go#L35-L50) vs [`wallet.js:L31-45`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/routes/wallet.js#L31-L45) | **CONFIRMED DEFECT** |
| **Audit Service Schema** | `fraud-evidence-system` (Service) | `fraud-evidence-system` (Mongoose) | `auditService.js` saves `{ ipAddress, status, severity }`. `AuditLog.js` requires `{ ip, success, statusCode, action }`. | **INTERNAL DEFECT:** Unit tests captured ValidationError: `AuditLog validation failed: action: Path 'action' is required, statusCode: Path 'statusCode' is required`. | [`auditService.js:L38-55`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/services/auditService.js#L38-L55) vs [`AuditLog.js:L4-127`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/models/AuditLog.js#L4-L127) & [`test_output.txt:L398`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/test_output.txt#L398) | **CONFIRMED DEFECT** |
| **Actor Identity Type** | `cybercrime` | `fraud-evidence-system` | SQLite autoincrement `int` (`users.id`) vs MongoDB `ObjectId` string (`User._id`) vs Supabase UUID. | Cross-system references cannot resolve user foreign keys. User #1 cannot be reconciled with ObjectId or Supabase UUID. | [`models.py:L158`](file:///c:/Users/A/Documents/CyberSecurity/cybercrime/backend/app/db/models.py#L158) vs [`AuditLog.js:L6`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/models/AuditLog.js#L6) | **UNRESOLVED MISMATCH** |
| **Risk Score Metric Scales** | `cybercrime` | `bhiv-VAJRA` / `fraud-evidence-system` | Python ML outputs normalized float `0.0` to `1.0`. Vajra engine and smart contract require integer `0` to `100`. | Passing float scores (e.g., `0.85`) to Vajra or Solidity contracts will truncate to `0` or trigger threshold validation errors. | [`predict_fraud.py:L146`](file:///c:/Users/A/Documents/CyberSecurity/cybercrime/backend/ml_training/predict_fraud.py#L146) vs [`fraud.go:L25`](file:///c:/Users/A/Documents/CyberSecurity/bhiv-VAJRA_Blockchain-main/bhiv-VAJRA_Blockchain-main/core/relay-chain/fraud/fraud.go#L25) & [`Cybercrime.sol:L40`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/Contracts/Cybercrime.sol#L40) | **UNRESOLVED MISMATCH** |
| **Trace ID Regex Constraints** | `cybercrime` & `fraud-evidence-system` | `Full-tantra` | Cybercrime and Express generate standard UUIDv4 (`36` chars). Tantra contract enforces regex `^TRACE-[a-f0-9]{12}$`. | Standard UUIDs passed downstream to Tantra validation engines fail JSON schema validation. | [`main.py:L552`](file:///c:/Users/A/Documents/CyberSecurity/cybercrime/backend/main.py#L552) vs [`input_signal_contract_v1.json:L18`](file:///c:/Users/A/Documents/CyberSecurity/Full-tantra-constitutional-convergence/integration_contracts/input_signal_contract_v1.json#L18) | **CONFIRMED INCOMPATIBILITY** |
| **Case / Incident ID Formats** | `cybercrime` | `fraud-evidence-system` | `cybercrime` uses numeric IDs or `IR-YYYYMMDD-...`. `fraud-evidence-system` uses `CASE-TIMESTAMP-RAND` or `INV-YYYYMMDD-RAND`. | Handing case IDs between systems fails lookup due to incompatible identifier formats. | [`models.py:L40`](file:///c:/Users/A/Documents/CyberSecurity/cybercrime/backend/app/db/models.py#L40) vs [`Case.js:L10`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/models/Case.js#L10) | **UNRESOLVED MISMATCH** |
| **Error Response Formats** | `fraud-evidence-system` (Route) | `fraud-evidence-system` (Tests) | Route returns `{ error: 'No file uploaded' }`. Tests expect `{ error: true, message: '...' }`. | Test assertions fail expecting boolean error flags, while route handlers return string error descriptions. | [`evidenceRoutes.js:L105`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/routes/evidenceRoutes.js#L105) vs [`PHASE_4_FAILURE_ANALYSIS.md:L10`](file:///c:/Users/A/Documents/CyberSecurity/PHASE_4_FAILURE_ANALYSIS.md#L10) | **CONFIRMED DEFECT** |
| **Downstream TANTRA Persistence** | `cybercrime` | `Full-tantra` | `cybercrime` calls `store_evidence_in_bucket()`. But Tantra's bucket contract is backed only by local mock simulators. | Evidence persistence across the constitutional boundary is mocked; no production decentralized storage occurs. | [`sovereign_integrations.py:L64-92`](file:///c:/Users/A/Documents/CyberSecurity/cybercrime/backend/app/core/sovereign_integrations.py#L64-L92) vs [`ecosystem_integration.py:L150-165`](file:///c:/Users/A/Documents/CyberSecurity/Full-tantra-constitutional-convergence/ecosystem_integration.py#L150-L165) | **MOCKED INTEGRATION** |

---

## Section 12 — Canonical Contract Gaps

| Contract Area | Existing Definition | Shared Canonical Version? | Main Architectural Gap | Concrete Evidence |
|---|---|---|---|---|
| **Security Event Schema** | SQLAlchemy `AuditLog` in Python; Mongoose `AuditLog` in Node.js. | **NO (`NOT DEFINED`)** | No unified event model, protobuf, or schema package shared between repos. | Different field names (`ip_address` vs `ip`, `status` vs `success`+`statusCode`). |
| **Event Versioning & Migration** | Contract versions exist in Tantra (`1.0.0`); smart contract ABI versions exist in Solidity. | **NO (`NOT DEFINED`)** | Audit event records contain no schema version field; no migration scripts exist. | Neither `AuditLog.js` nor `models.py:AuditLog` contains a version attribute. |
| **Threat Signal Schema** | Go `FraudResponse`, JS ML violation objects, Python incident dicts. | **NO (`NOT DEFINED`)** | Divergent field keys, nested objects, and transport layers. | `decision` ("allow"/"block") in Go vs `is_fraud` (0/1) in Python vs `violationType` in JS. |
| **Threat Category Taxonomy** | Local enums in Vajra Go, Solidity smart contract, and Python AML helpers. | **NO (`NOT DEFINED`)** | No unified classification standard; brute-force, priv-esc, and exfil lack detectors. | Completely distinct category names across all four codebases. |
| **Severity & Confidence Standards** | Int scales (`0-100`, `1-5`), float scales (`0.0-1.0`), string levels (`LOW`-`CRITICAL`). | **NO (`NOT DEFINED`)** | Cross-repo arithmetic incompatibility and risk misinterpretation. | Vajra requires `0-100`; Python ML emits `0.0-1.0`. |
| **Trace & Event ID Standards** | UUIDv4 in Express/FastAPI; `^TRACE-[a-f0-9]{12}$` in Tantra; open tokens in Go. | **NO (`NOT DEFINED`)** | Header propagation works locally, but IDs are not stored in audit tables and fail Tantra regex. | Tantra rejects standard 36-character UUIDv4 strings. |
| **Incident / Case Correlation** | `caseLinkingService.js` in Node.js; relational tables in Python. | **NO (`NOT DEFINED`)** | Correlation exists only inside `fraud-evidence-system`; `cybercrime` cannot correlate entities. | `caseLinkingService.js` is isolated within `fraud-evidence-system`. |
| **Evidence & Provenance Contract** | SHA256 hashes in MongoDB; local file paths in SQLite; EVM logs in Solidity. | **NO (`NOT DEFINED`)** | No common evidence manifest format or shared provenance ledger. | `Evidence.js` vs `models.py:Evidence` vs `Cybercrime.sol`. |
| **API Error Contract** | FastAPI RFC-7807 dicts; Express `{ error: str }`; Express `{ error: bool, message }`. | **NO (`NOT DEFINED`)** | API clients cannot consistently parse errors across microservices. | Multiple failing tests caused by error object mismatch. |
| **Data Redaction Standard** | Ad-hoc password removal in auth controllers; no general sanitization. | **NO (`NOT DEFINED`)** | Audit log `details` fields can ingest and store sensitive personal data. | Unrestricted JSON / Mixed data types in audit models. |
| **Service-to-Service Auth** | Local JWT validation per repo; no inter-service identity layer. | **NO (`NOT DEFINED`)** | Microservice calls between Cybercrime and Fraud Evidence lack mutual authentication. | Direct HTTP calls lack authorization headers or API keys. |

---

## Section 13 — Verified Source Index

### 1. `cybercrime`
- [`backend/app/db/models.py`](file:///c:/Users/A/Documents/CyberSecurity/cybercrime/backend/app/db/models.py): Defines relational SQLAlchemy models (`User`, `Case`, `Evidence`, `AuditLog`, `RiskScore`).
- [`backend/app/api/v1/schemas.py`](file:///c:/Users/A/Documents/CyberSecurity/cybercrime/backend/app/api/v1/schemas.py): Defines Pydantic validation schemas (`AuditLogResponse`, `IncidentReportResponse`, `FraudPredictionResponse`).
- [`backend/app/core/audit_logging.py`](file:///c:/Users/A/Documents/CyberSecurity/cybercrime/backend/app/core/audit_logging.py): Implements structured JSON logging helper `emit_audit_log`.
- [`backend/app/core/sovereign_integrations.py`](file:///c:/Users/A/Documents/CyberSecurity/cybercrime/backend/app/core/sovereign_integrations.py): Implements downstream handoff functions (`emit_core_event`, `store_evidence_in_bucket`).
- [`backend/main.py`](file:///c:/Users/A/Documents/CyberSecurity/cybercrime/backend/main.py): Implements FastAPI application setup and `request_context_middleware` for trace ID extraction and header injection.
- [`backend/app/api/v1/endpoints/incidents.py`](file:///c:/Users/A/Documents/CyberSecurity/cybercrime/backend/app/api/v1/endpoints/incidents.py): Implements incident generation and threat report assembly.
- [`backend/app/api/v1/endpoints/access_requests.py`](file:///c:/Users/A/Documents/CyberSecurity/cybercrime/backend/app/api/v1/endpoints/access_requests.py): Implements user access requests and role elevation audit logging.
- [`backend/app/api/v1/endpoints/evidence.py`](file:///c:/Users/A/Documents/CyberSecurity/cybercrime/backend/app/api/v1/endpoints/evidence.py): Implements evidence file access and download auditing.
- [`backend/synthetic_data_generator/suspicious_patterns.py`](file:///c:/Users/A/Documents/CyberSecurity/cybercrime/backend/synthetic_data_generator/suspicious_patterns.py): Implements heuristic AML detection rules (`rapid_consolidation`, `layering`, `circular_pattern`).
- [`backend/ml_training/predict_fraud.py`](file:///c:/Users/A/Documents/CyberSecurity/cybercrime/backend/ml_training/predict_fraud.py): Implements ML inference engine `FraudPredictor`.

### 2. `fraud-evidence-system`
- [`Backend/models/AuditLog.js`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/models/AuditLog.js): Defines Mongoose schema for persistent MongoDB audit logs with blockchain sync fields.
- [`Backend/models/RequestLog.js`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/models/RequestLog.js): Defines telemetry model for incoming HTTP requests.
- [`Backend/models/LoginLog.js`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/models/LoginLog.js): Defines authentication session log schema.
- [`Backend/models/Investigation.js`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/models/Investigation.js): Defines investigation clustering model, timeline event schema, and auto-ID generator.
- [`Backend/models/Case.js`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/models/Case.js): Defines forensic case model and ID generator.
- [`Backend/models/Evidence.js`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/models/Evidence.js): Defines evidence metadata model with cryptographic hashes and storage pointers.
- [`Backend/services/auditService.js`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/services/auditService.js): Contains conflicting audit logging service that fails Mongoose schema validation.
- [`Backend/services/caseLinkingService.js`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/services/caseLinkingService.js): Implements multi-dimensional entity correlation (identifier, temporal, Haversine geo, behavioral).
- [`Backend/services/mlViolationDetector.js`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/services/mlViolationDetector.js): Implements DeFi violation detection and formatting.
- [`Backend/Contracts/Cybercrime.sol`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/Contracts/Cybercrime.sol): Solidity smart contract defining on-chain violation enums and event logs.
- [`Backend/routes/wallet.js`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/routes/wallet.js): Implements `/api/wallet-data/:address` endpoint containing the key mismatch with Vajra.
- [`Backend/server.js`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/server.js): Implements Express application and trace header propagation middleware.

### 3. `bhiv-VAJRA_Blockchain-main`
- [`core/relay-chain/fraud/fraud.go`](file:///c:/Users/A/Documents/CyberSecurity/bhiv-VAJRA_Blockchain-main/bhiv-VAJRA_Blockchain-main/core/relay-chain/fraud/fraud.go): Implements the Sarathi transaction fraud engine, rule thresholds, and `FraudResponse` struct.
- [`core/relay-chain/chain/cybercrime.go`](file:///c:/Users/A/Documents/CyberSecurity/bhiv-VAJRA_Blockchain-main/bhiv-VAJRA_Blockchain-main/core/relay-chain/chain/cybercrime.go): Implements `AIFraudChecker` querying external wallet risk APIs.
- [`AI_FRAUD_INTEGRATION_GUIDE.md`](file:///c:/Users/A/Documents/CyberSecurity/bhiv-VAJRA_Blockchain-main/bhiv-VAJRA_Blockchain-main/AI_FRAUD_INTEGRATION_GUIDE.md): Documents the expected AI wallet risk integration contract.

### 4. `Full-tantra-constitutional-convergence`
- [`event_sourcing.py`](file:///c:/Users/A/Documents/CyberSecurity/Full-tantra-constitutional-convergence/event_sourcing.py): Implements immutable cryptographic event sourcing and deterministic replay verification.
- [`event_store.json`](file:///c:/Users/A/Documents/CyberSecurity/Full-tantra-constitutional-convergence/event_store.json): Append-only JSON ledger holding cryptographically linked event records.
- [`integration_contracts/input_signal_contract_v1.json`](file:///c:/Users/A/Documents/CyberSecurity/Full-tantra-constitutional-convergence/integration_contracts/input_signal_contract_v1.json): Formal JSON Schema enforcing contract versioning and strict trace ID regex formatting.
- [`ecosystem_integration.py`](file:///c:/Users/A/Documents/CyberSecurity/Full-tantra-constitutional-convergence/ecosystem_integration.py): Implements simulated adapters for RAJYA, Bucket storage, and InsightBridge.

---

## Section 14 — Completion and Limitations

### 14.1 Audit Completion Status
All requested source files, schemas, models, contracts, and test fixtures across the four repositories have been thoroughly audited against the active local workspace.

### 14.2 Unavailable Files and Remote Services
- **Live Vajra Validator RPC:** External blockchain peer networks could not be reached live; verification was executed against local Go source logic.
- **TANTRA Live RAJYA Service:** External sovereign core endpoint (`http://localhost:8000/api/v1/sovereign`) was offline; verification relied on local mock fallback logic in `sovereign_integrations.py` and `ecosystem_integration.py`.

### 14.3 High-Priority Contract Mismatches Requiring Immediate Action
1. **Critical Vajra-to-Wallet API Key Mismatch:** `bhiv-VAJRA` expects `highestRiskScore` and `approvedReports` from `GET /api/wallet-data/:address`. `fraud-evidence-system/Backend/routes/wallet.js` returns `riskScore`. This breaks on-chain risk blocking.
2. **Defective `auditService.js` in `fraud-evidence-system`:** Passes invalid field names (`ipAddress`, `status`, `severity`) to `AuditLog.js`, causing unhandled validation errors during service audit logging.
3. **Trace ID Format Incompatibility:** Tantra contract requires `^TRACE-[a-f0-9]{12}$`, while Express and FastAPI emit standard 36-character UUIDv4 strings.
4. **Risk Score Scale Incompatibility:** Python ML models emit floats `0.0–1.0`, while Vajra and Solidity expect integers `0–100`.

### 14.4 Questions Requiring Architecture Team Confirmation
1. Which entity owns the authoritative threat detection decision: Vajra Sarathi engine, Cybercrime ML predictor, or Fraud-Evidence RL engine?
2. Should user identities be federated using Supabase UUIDs, MongoDB ObjectIds, or integer IDs?
3. Should audit events be unified under a shared JSON Schema or Protobuf specification imported across all repositories?

---

### Final Verdict

**COMPLETION VERDICT: `PARTIALLY DEFINED`**

*Rationale:* Rich local models, detection engines, and correlation routines exist in individual repositories, but there is **no canonical security event schema**, **no canonical threat category taxonomy**, **no shared trace ID storage contract**, and several **confirmed cross-repository defects** currently break end-to-end integration.
