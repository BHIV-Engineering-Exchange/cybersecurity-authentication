# Phase 1 — BHIV vNext Cybersecurity: Data, API & Access Control Audit

**Document Owner / Auditor:** Kaushlendra — Data, API & Access Control  
**Audit Date:** 2026-10-17  
**Artifact Path:** `PHASE_1_REPOSITORY_AUDIT.md`  
**Phase Status:** `COMPLETE`  
**Execution Mode:** Read-Only Audit (No features implemented, no application code changed, no configurations modified, no dependencies installed, no commits/pushes made)

---

## 1. Scope and Repositories Actually Inspected

The audit evaluated all cybersecurity repositories present within the workspace `c:\Users\A\Documents\CyberSecurity`:

| # | Repository Name | Local Directory Path | Tech Stack & Framework | Availability Status |
|---|---|---|---|---|
| 1 | **Cybercrime** | `c:\Users\A\Documents\CyberSecurity\cybercrime` | Python 3.12 (FastAPI), React + Vite, SQLAlchemy, SQLite/PostgreSQL | **AVAILABLE & INSPECTED** |
| 2 | **Fraud Evidence System** | `c:\Users\A\Documents\CyberSecurity\fraud-evidence-system` | Node.js (Express 4.18), React, MongoDB/Mongoose 7.6, Ethers.js | **AVAILABLE & INSPECTED** |
| 3 | **TANTRA** | `c:\Users\A\Documents\CyberSecurity\Full-tantra-constitutional-convergence` | Python 3.12 (FastAPI), Event Store, Canonical Hash Engines | **AVAILABLE & INSPECTED** |
| 4 | **VAJRA** | `c:\Users\A\Documents\CyberSecurity\bhiv-VAJRA_Blockchain-main\bhiv-VAJRA_Blockchain-main` | Go 1.21+ (Substrate/Relay-Chain), LevelDB, HTTP REST APIs | **AVAILABLE & INSPECTED** |

*Note: No repository in the assigned scope was absent (`NOT AVAILABLE: None`).*

---

## 2. Executive Summary

This audit establishes the concrete, evidence-based current state of the data schemas, access controls, API contracts, and integration interfaces across the BHIV Cybersecurity ecosystem. 

Key high-level findings include:
1. **Severe Data Schema Fragmentation:** The core entity **Evidence** is defined in four incompatible schemas across the four repositories: a relational SQLAlchemy table (`cybercrime`), a document-based Mongoose collection with IPFS pointers (`fraud-evidence-system`), a strict envelope dictionary with SHA-256 pipeline hashing (`TANTRA`), and an in-memory Go struct with threat evidence slices (`VAJRA`).
2. **Divergent Authentication Models:** Authentication varies from 30-minute stateless JWTs with active-user DB verification in Cybercrime, to 7-day JWTs without revocation in Fraud Evidence System, to a single shared static `X-API-Key` in VAJRA, to completely unauthenticated endpoints in TANTRA.
3. **Confirmed Defect in Fraud Evidence Audit Logging:** The primary service [`fraud-evidence-system/Backend/services/auditService.js:L38-55`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/services/auditService.js#L38-L55) instantiates `AuditLog` documents with properties that violate the Mongoose model schema ([`Backend/models/AuditLog.js:L4-127`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/models/AuditLog.js#L4-L127)), causing validation failure on every write, which is swallowed silently in a try/catch block.
4. **Mocked Integration Boundaries:** All cross-system interfaces between Fraud Evidence System, VAJRA, and TANTRA (such as blockchain evidence anchoring, cross-chain bridge transfers, account freezing, and bucket storage) currently run as in-memory Javascript stubs, simulated hashes, or local fallback files.
5. **No Active Token/Session Revocation:** While account deactivation (`isActive: false` / `is_active = False`) is supported in both application backends, neither system implements token blacklisting or individual session revocation.

---

## 3. Findings by Repository

### 3.1 Cybercrime

#### A. Data & Security Schemas
- **Audit Logging Model:** Defined in [`cybercrime/backend/app/db/models.py:L143-160`](file:///c:/Users/A/Documents/CyberSecurity/cybercrime/backend/app/db/models.py#L143-L160). Table `audit_logs` has fields: `id` (Integer PK), `action` (String, nullable=False), `message` (String), `entity_type` (String), `entity_id` (String), `status` (String, default="success"), `details` (Text), `user_id` (Integer FK `users.id`), `ip_address` (String), `request_id` (String), `path` (String), `method` (String), `timestamp` (DateTime, UTC).
- **Structured Log Emission:** Handled by [`cybercrime/backend/app/core/audit_logging.py:L20-53`](file:///c:/Users/A/Documents/CyberSecurity/cybercrime/backend/app/core/audit_logging.py#L20-L53) emitting JSON to logger `"audit"`. It includes `trace_id`, which is present in logger payloads but *omitted from the relational database table*.
- **Evidence Model:** [`cybercrime/backend/app/db/models.py:L108-128`](file:///c:/Users/A/Documents/CyberSecurity/cybercrime/backend/app/db/models.py#L108-L128). Fields: `id`, `evidence_id` (String, unique), `title`, `description`, `hash` (SHA-256), `file_path`, `file_size`, `file_type`, `anchor_status` (default="pending"), `immutable` (Boolean, default=True), `investigator_id` (FK `users.id`), `case_id` (FK `cases.id`), `created_at`.
- **Sensitive Fields & Redaction:** 
  - `User.hashed_password` ([`models.py:L17`](file:///c:/Users/A/Documents/CyberSecurity/cybercrime/backend/app/db/models.py#L17)) is filtered out of `UserResponse` ([`schemas.py:L21-28`](file:///c:/Users/A/Documents/CyberSecurity/cybercrime/backend/app/api/v1/schemas.py#L21-L28)).
  - PII in `complaints` table ([`models.py:L200-223`](file:///c:/Users/A/Documents/CyberSecurity/cybercrime/backend/app/db/models.py#L200-L223)) includes `officer_mobile`, `officer_email`, `officer_address`, `investigator_location_ip`, `investigator_location_latitude`, and `investigator_location_longitude`. These fields are returned in plaintext via `ComplaintResponse` ([`schemas.py:L251-272`](file:///c:/Users/A/Documents/CyberSecurity/cybercrime/backend/app/api/v1/schemas.py#L251-L272)). Redaction behavior is **NOT DEFINED**.

#### B. Authentication and Authorization
- **Authentication:** JWT HS256 via OAuth2 password bearer ([`cybercrime/backend/app/core/security.py:L63-82`](file:///c:/Users/A/Documents/CyberSecurity/cybercrime/backend/app/core/security.py#L63-L82)). Access token expiration defaults to 30 minutes (`ACCESS_TOKEN_EXPIRE_MINUTES = 30`). Password hashing uses bcrypt with a 72-byte truncation safety guard ([`security.py:L14-28`](file:///c:/Users/A/Documents/CyberSecurity/cybercrime/backend/app/core/security.py#L14-L28)).
- **RBAC Policy:** Defined in [`cybercrime/rbac-permissions.json:L1-100`](file:///c:/Users/A/Documents/CyberSecurity/cybercrime/rbac-permissions.json#L1-L100). Defines roles: `public`, `investigator`, `superadmin`. Loaded on startup in lifespan ([`main.py:L435-439`](file:///c:/Users/A/Documents/CyberSecurity/cybercrime/backend/main.py#L435-L439)) and evaluated in `rbac_middleware` ([`main.py:L612-700`](file:///c:/Users/A/Documents/CyberSecurity/cybercrime/backend/main.py#L612-L700)).
- **Default Missing/Invalid Permission Behavior:**
  - If role is `"public"` and access denied: Returns HTTP 401 with JSON `{"error": {"code": "unauthorized", "message": "Authentication required.", "request_id": "..."}}`.
  - If authenticated user lacks role/path permissions: Returns HTTP 403 with JSON `{"error": {"code": "forbidden", "message": "Access denied.", "request_id": "..."}}`.
  - Self-boundary enforcement: If role is `"investigator"` and URL contains `/investigators/{id}`, requests with `path_id != user_id` are rejected with HTTP 403 ([`main.py:L676-698`](file:///c:/Users/A/Documents/CyberSecurity/cybercrime/backend/main.py#L676-L698)).

#### C. Access and Revocation
- **User Revocation:** In `rbac_middleware` ([`main.py:L642-646`](file:///c:/Users/A/Documents/CyberSecurity/cybercrime/backend/main.py#L642-L646)), if `user.is_active` is False in the database, the role is immediately downgraded to `"public"`, blocking subsequent protected requests even if the JWT is unexpired.
- **Session/Token Revocation:** Token revocation lists, redis token blacklists, and session invalidation tables are **NOT DEFINED**.
- **Access Requests:** Lifecycle defined in [`cybercrime/backend/app/api/v1/endpoints/access_requests.py`](file:///c:/Users/A/Documents/CyberSecurity/cybercrime/backend/app/api/v1/endpoints/access_requests.py). Public POST `/api/v1/access-requests/request` creates pending request with hashed password; Superadmin PATCH `/api/v1/access-requests/requests/{id}/review` activates user into `users` table.

#### D. API Contracts
- **Prefix & Versioning:** `/api/v1`, 21 mounted subrouters in [`cybercrime/backend/app/api/v1/api.py:L32-53`](file:///c:/Users/A/Documents/CyberSecurity/cybercrime/backend/app/api/v1/api.py#L32-L53).
- **Error Format:** Standardized via [`cybercrime/backend/app/core/error_responses.py`](file:///c:/Users/A/Documents/CyberSecurity/cybercrime/backend/app/core/error_responses.py): `{"error": {"code": str, "message": str, "request_id": Optional[str]}}`.
- **Trace Context:** [`cybercrime/backend/main.py:L549-598`](file:///c:/Users/A/Documents/CyberSecurity/cybercrime/backend/main.py#L549-L598) parses incoming `X-Request-Id` and `X-Trace-Id` or generates `uuid4()`, propagating them to `request.state` and outgoing HTTP response headers.

#### E. Integration Boundaries
- **Bucket/Core Integration:** Defined in [`cybercrime/backend/app/core/sovereign_integrations.py:L115-244`](file:///c:/Users/A/Documents/CyberSecurity/cybercrime/backend/app/core/sovereign_integrations.py#L115-L244).
  - `store_evidence_in_bucket`: Posts base64 content to `BHIV_BUCKET_EVIDENCE_URL`. If unconfigured, falls back gracefully to local file storage `EVIDENCE_STORAGE_PATH` (`./evidence_storage`).
  - `emit_core_event`: Posts event JSON (`caseId`, `evidenceId`, `riskScore`, `action`) to `BHIV_CORE_EVENT_URL` or Kafka. If unconfigured or failing, appends to durable local buffer `EVENT_BUFFER_PATH` (`./event_buffer/events.jsonl`).
- **VAJRA / TANTRA Direct Connections:** In `.env`, `BHIV_BUCKET_EVIDENCE_URL`, `BHIV_CORE_EVENT_URL`, and `KAFKA_BOOTSTRAP_SERVERS` are empty strings. Hence, integration is **CONFIGURED-ONLY** with local graceful degradation.

---

### 3.2 Fraud Evidence System

#### A. Data & Security Schemas
- **AuditLog Model:** Defined in [`fraud-evidence-system/Backend/models/AuditLog.js:L4-127`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/models/AuditLog.js#L4-L127). Fields: `userId` (ObjectId, ref: 'User', required), `userEmail` (String, required), `userRole` (enum: ['superadmin', 'admin', 'investigator', 'user'], required), `action` (String, required), `resource` (String, required), `resourceType` (enum: ['evidence', 'case', 'user', 'system', 'report', 'rl', 'blockchain'], required), `resourceId` (String), `method` (enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'], required), `endpoint` (String, required), `ip` (String, required), `userAgent` (String, required), `success` (Boolean, required), `statusCode` (Number, required), `details` (Mixed), `auditLevel` (enum: ['standard', 'high', 'critical']), `blockchainTxHash` (String), `blockchainBlockNumber` (Number), `blockchainSynced` (Boolean), `timestamp` (Date, default: Date.now), `retentionDate` (Date).
- **Confirmed Defect / Schema Mismatch in auditService.js:**
  - Source: [`fraud-evidence-system/Backend/services/auditService.js:L38-55`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/services/auditService.js#L38-L55)
  - `auditService.js` creates an `AuditLog` object passing `ipAddress` instead of `ip`, `status` instead of `success`/`statusCode`, `severity` instead of `auditLevel`, string `'system'` for `userId` (causing Mongoose ObjectId CastError), and omits the required `resource` field.
  - Runtime impact: Every call to `auditService.logAudit()` fails validation at `await auditLog.save()` ([`auditService.js:L55`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/services/auditService.js#L55)) and is swallowed by catch block at lines 75-80.
- **Evidence Model:** Defined in [`fraud-evidence-system/Backend/models/Evidence.js:L4-100`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/models/Evidence.js#L4-L100). Fields: `caseId`, `wallet`, `reporter`, `filename`, `originalFilename`, `filePath`, `fileSize`, `fileType`, `storageHash` (SHA-256, unique), `storageMetadata` (`s3Key`, `ipfsHash`, `bhivPointer`, `redundancy`, `locations`), `description`, `tags`, `riskLevel`, `blockchainTxHash`, `blockNumber`, `contractAddress`, `anchorStatus` (enum: ['not_anchored', 'pending', 'anchored', 'failed']), `verificationStatus` (enum: ['pending', 'verified', 'failed']), `integrityStatus` (enum: ['unknown', 'intact', 'corrupted']).
- **Telemetry Models:**
  - `RequestLog`: [`Backend/models/RequestLog.js:L4-12`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/models/RequestLog.js#L4-L12) (`ip`, `method`, `path`, `user`, `timestamp`).
  - `LoginLog`: [`Backend/models/LoginLog.js:L3-12`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/models/LoginLog.js#L3-L12) (`userId`, `ip`, `userAgent`, `timestamp`).

#### B. Authentication and Authorization
- **Authentication Middleware:** [`fraud-evidence-system/Backend/middleware/auth.js:L16-82`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/middleware/auth.js#L16-L82). Verifies JWT token from `Authorization: Bearer <token>` using `process.env.JWT_SECRET`. Queries `User.findById(payload.userId)`.
  - Defect/Behavior: If header is missing, it returns **HTTP 403 Forbidden** (`{ message: "No authorization header" }`, [`auth.js:L29`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/middleware/auth.js#L29)) instead of standard HTTP 401.
- **Authorization Middleware:** [`fraud-evidence-system/Backend/middleware/authorize.js:L23-110`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/middleware/authorize.js#L23-L110). Validates action permissions against `rbac-permissions.json`.
- **Roles:** Defined in [`fraud-evidence-system/Backend/rbac-permissions.json:L6`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/rbac-permissions.json#L6): `["user", "investigator", "admin", "superadmin"]`.
  - Discrepancy: `server.js:L129` advertises roles `['guest', 'user', 'analyst', 'investigator', 'admin', 'superadmin']`. Neither `guest` nor `analyst` exist in `rbac-permissions.json`.
- **Default Missing/Invalid Permission Behavior:**
  - `authorize.js:L31-36` returns HTTP 401 `{ error: true, code: 401, message: 'Authentication required' }` if `req.user` is absent.
  - `authorize.js:L51-59` returns HTTP 403 `{ error: true, code: 403, message: 'Account is deactivated' }` if `user.isActive` is false.
  - `authorize.js:L88-105` returns HTTP 403 `{ error: true, code: 403, message: 'Access denied: Insufficient permissions', ... }` if permission check fails.

#### C. Access and Revocation
- **User Revocation:** In `authorize.js:L51-59`, `user.isActive === false` halts the request with 403. However, in `auth.js:L68-77`, `isActive: user.isActive !== false` is attached to `req.user` without halting, allowing un-authorized routes that use only `auth.js` to execute.
- **Token Expiry & Revocation:** `authRoutes.js:L80,140` issues tokens with `expiresIn: '7d'`. Token revocation, blacklists, and logout endpoints are **NOT DEFINED**.

#### D. API Contracts
- **Mounted Paths:**
  - `/api/auth` -> `authRoutes.js`
  - `/api/evidence` -> `evidenceRoutes.js`
  - `/api/rl` -> `rlRoutes.js`
  - `/api/queue` -> `eventQueueRoutes.js`
  - `/api/admin/audit` -> `auditRoutes.js`
  - `/api/core` -> `coreRoutes.js`
  - `/api/core-webhooks` -> `coreWebhooksRoutes.js`
  - `/api/blockchain` -> `blockchainRoutes.js`
  - `/api/cybercrime` -> `cybercrimeRoutes.js`
- **Trace Propagation:** [`server.js:L49-56`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/server.js#L49-L56) extracts `x-trace-id` and `x-request-id` (or generates `uuidv4()`), setting them on `req.traceId`, `req.requestId`, and response headers `X-Trace-Id` and `X-Request-Id`.

#### E. Integration Boundaries
- **Smart Contract & Anchoring:** [`services/evidenceContractService.js:L8-44`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/services/evidenceContractService.js#L8-L44) simulates blockchain storage using an in-memory `Map` (`this.blockchainLedger`) with a dummy address `0x742d35Cc6761C65532534444`. Anchoring is **MOCKED**.
- **Bridge SDK:** [`services/bridgeSDK.js:L182-260`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/services/bridgeSDK.js#L182-L260) defines cross-chain bridge logic targeting `http://192.168.0.68:8080`, but token locking and minting are implemented via `setTimeout` and simulated hex generation. Bridge transfer is **MOCKED**.
- **Cybercrime Route Freezing:** [`routes/cybercrimeRoutes.js:L12-16`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/routes/cybercrimeRoutes.js#L12-L16) maintains `violations` array and `freezeRecords` in a Javascript `Map`. Account freezing is **MOCKED** in memory.
- **BHIV Storage:** [`services/mockBhivService.js:L1-54`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/services/mockBhivService.js#L1-L54) generates fake `bhiv://local/...` pointers and mock IPFS hashes. Bucket integration is **MOCKED**.

---

### 3.3 TANTRA (`Full-tantra-constitutional-convergence`)

#### A. Data & Security Schemas
- **Bucket Artifact Envelope:** Defined in [`Full-tantra-constitutional-convergence/api.py:L41-60,358-396`](file:///c:/Users/A/Documents/CyberSecurity/Full-tantra-constitutional-convergence/api.py#L41-L60).
  - Required Fields: `artifact_id`, `trace_id`, `timestamp_utc`, `schema_version`, `source_module_id`, `artifact_type`, `payload`.
  - Strict Rules: `schema_version` must equal `"1.0.0"`. `payload` must be a JSON object <= 16MB (`16 * 1024 * 1024` bytes). Disallowed envelope keys cause rejection with HTTP 400.
- **Truth Store Entry:** [`api.py:L420-436`](file:///c:/Users/A/Documents/CyberSecurity/Full-tantra-constitutional-convergence/api.py#L420-L436) persists truth events to `truth_store.json`: `trace_id`, `verdict`, `pipeline_hash` (canonical SHA-256 over pipeline inputs), `timestamp`, `contract_version: "v1"`.
- **Observability Log Entry:** [`api.py:L408-419`](file:///c:/Users/A/Documents/CyberSecurity/Full-tantra-constitutional-convergence/api.py#L408-L419) appends to `observability.log`: `trace_id`, `timestamp`, `stage`, `verdict`, `hash`.

#### B. Authentication and Authorization
- **Authentication Mechanism:** **NOT DEFINED**. The API in [`api.py`](file:///c:/Users/A/Documents/CyberSecurity/Full-tantra-constitutional-convergence/api.py) has zero authentication middleware, zero token verifiers, and zero API key checks.
- **Authorization & Access Control:** No user-based or role-based access control. All 22 exposed endpoints (`/signal`, `/bucket/artifact`, `/replay`, `/sdk/v1/*`, etc.) are completely unauthenticated.
- **Constitutional Boundary Enforcement:** In place of user authorization, TANTRA implements strict computational boundary enforcement via [`governance_boundary.py:L15-60`](file:///c:/Users/A/Documents/CyberSecurity/Full-tantra-constitutional-convergence/governance_boundary.py#L15-L60) and [`fail_closed_enforcer.py:L15-60`](file:///c:/Users/A/Documents/CyberSecurity/Full-tantra-constitutional-convergence/fail_closed_enforcer.py#L15-L60) (rejecting mutations exceeding score drift > 0.15, enforcing schema compatibility, and halting execution upon boundary violation).

#### C. Access and Revocation
- **User / Token Revocation:** **NOT DEFINED** (no user or token subsystem exists in TANTRA).

#### D. API Contracts
- **Key Endpoints:**
  - `POST /signal` — Accepts `SignalInput` (`trace_id`, `signal`, `contract_version: "v1"`), executes `run_sanskar`, `run_core`, `run_enforcement`, verifies trace continuity, logs observability, and writes to `truth_store.json`.
  - `GET /trace/{trace_id}` — Retrieves execution trace by ID.
  - `POST /replay` — Replays historical trace against canonical hash verification.
  - `POST /bucket/artifact` — Ingests artifact envelope validating schema version `"1.0.0"`.
  - `POST /sdk/v1/behavior/trace`, `/sdk/v1/karma/output`, `/sdk/v1/prana/event`, `/sdk/v1/replay/session`, `/sdk/v1/execution/event`, `/sdk/v1/validation/result`, `/sdk/v1/observability/event`, `/sdk/v1/authority/declaration`.
  - `GET /health` — Returns status.
- **Status/Error Formats:** Schema violations return HTTP 400 with structured detail: `{"missing_required_fields": [...]}`, `{"illegal_fields": [...]}`, or `{"schema_version": "..."}`.

#### E. Integration Boundaries
- **Ecosystem Placement:** TANTRA acts as a constitutional convergence layer. However, the expected `/bucket/artifact` envelope (`artifact_id`, `source_module_id`, `schema_version: "1.0.0"`) does *not* match the payload emitted by Cybercrime's `store_evidence_in_bucket` ([`sovereign_integrations.py:L130-137`](file:///c:/Users/A/Documents/CyberSecurity/cybercrime/backend/app/core/sovereign_integrations.py#L130-L137), which sends `evidenceId`, `sha256`, `filename`, `contentType`, `contentBase64`).

---

### 3.4 VAJRA (`bhiv-VAJRA_Blockchain-main`)

#### A. Data & Security Schemas
- **Evidence Struct:** Defined in [`core/relay-chain/cybersecurity/security_contract.go:L292-299`](file:///c:/Users/A/Documents/CyberSecurity/bhiv-VAJRA_Blockchain-main/bhiv-VAJRA_Blockchain-main/core/relay-chain/cybersecurity/security_contract.go#L292-L299):
  ```go
  type Evidence struct {
      Type        string                 `json:"type"`
      Description string                 `json:"description"`
      Data        string                 `json:"data"`
      Hash        string                 `json:"hash"`
      Timestamp   time.Time              `json:"timestamp"`
      Metadata    map[string]interface{} `json:"metadata"`
  }
  ```
- **AuditLog Struct:** Defined in [`security_contract.go:L113-124`](file:///c:/Users/A/Documents/CyberSecurity/bhiv-VAJRA_Blockchain-main/bhiv-VAJRA_Blockchain-main/core/relay-chain/cybersecurity/security_contract.go#L113-L124) and [`components.go:L218-230`](file:///c:/Users/A/Documents/CyberSecurity/bhiv-VAJRA_Blockchain-main/bhiv-VAJRA_Blockchain-main/core/relay-chain/cybersecurity/components.go#L218-L230):
  ```go
  type AuditLog struct {
      ID          string                 `json:"id"`
      Timestamp   time.Time              `json:"timestamp"`
      Actor       string                 `json:"actor"`
      Action      string                 `json:"action"`
      Resource    string                 `json:"resource"`
      Result      AuditResult            `json:"result"`
      Details     string                 `json:"details"`
      IPAddress   string                 `json:"ip_address"`
      UserAgent   string                 `json:"user_agent"`
      Metadata    map[string]interface{} `json:"metadata"`
  }
  ```
- **Storage:** Managed in memory by `AuditLogger` with maximum 100,000 logs and 365-day retention cleanup loop ([`components.go:L204-211,241-255`](file:///c:/Users/A/Documents/CyberSecurity/bhiv-VAJRA_Blockchain-main/bhiv-VAJRA_Blockchain-main/core/relay-chain/cybersecurity/components.go#L204-L211)).

#### B. Authentication and Authorization
- **Authentication Mechanism:** Single static API key verified via HTTP header `X-API-Key` ([`core/relay-chain/cybersecurity/api.go:L73-83`](file:///c:/Users/A/Documents/CyberSecurity/bhiv-VAJRA_Blockchain-main/bhiv-VAJRA_Blockchain-main/core/relay-chain/cybersecurity/api.go#L73-L83)):
  ```go
  apiKey := r.Header.Get("X-API-Key")
  if apiKey != api.apiKey {
      api.sendError(w, "Unauthorized - Invalid API Key", http.StatusUnauthorized)
      return
  }
  ```
- **Authorization & RBAC:** Handled by `AccessController` ([`components.go:L133-167`](file:///c:/Users/A/Documents/CyberSecurity/bhiv-VAJRA_Blockchain-main/bhiv-VAJRA_Blockchain-main/core/relay-chain/cybersecurity/components.go#L133-L167)) evaluating `subject`, `resource`, `action` against in-memory `accessRules`. Default policy is **default-deny** (`return false, "No explicit permission found"`).
- **Default Missing/Invalid Permission Behavior:** Returns HTTP 401 `{"error": "Unauthorized - Invalid API Key"}` if API key is invalid; returns HTTP 200 `{"allowed": false, "reason": "No explicit permission found"}` from `/api/v1/security/access`.

#### C. Access and Revocation
- **User / Session Revocation:** `SessionManager` struct exists with a 30-minute timeout ([`components.go:L196-202`](file:///c:/Users/A/Documents/CyberSecurity/bhiv-VAJRA_Blockchain-main/bhiv-VAJRA_Blockchain-main/core/relay-chain/cybersecurity/components.go#L196-L202)), but session creation/destruction is not wired to incoming HTTP requests. Dynamic key revocation is **NOT DEFINED**.

#### D. API Contracts
- **Server:** Runs HTTP server on configurable port ([`api.go:L70`](file:///c:/Users/A/Documents/CyberSecurity/bhiv-VAJRA_Blockchain-main/bhiv-VAJRA_Blockchain-main/core/relay-chain/cybersecurity/api.go#L70)).
- **Public Endpoints:**
  - `GET /api/v1/security/health`
  - `GET /api/v1/security/metrics`
  - `GET /api/v1/security/threats`
- **Protected Endpoints (`X-API-Key` required):**
  - `GET/POST /api/v1/security/contracts`
  - `GET/POST /api/v1/security/rules`
  - `GET/POST /api/v1/security/incidents`
  - `GET/POST /api/v1/security/audit`
  - `GET/POST /api/v1/security/compliance`
  - `POST /api/v1/security/access`
  - `POST /api/v1/security/admin/deploy`
  - `POST /api/v1/security/admin/configure`
  - `GET /security`, `GET /security/dashboard` (HTML UI)

#### E. Integration Boundaries
- **Ecosystem Status:** VAJRA exposes endpoints intended for relay chain and parachain telemetry, but no direct network callers exist from active Cybercrime or Fraud Evidence production code. Connections in `fraud-evidence-system/Backend/services/bridgeSDK.js` are simulated.

---

## 4. Current Schema and API Inventory

### 4.1 Cross-Repository Schema Comparison: `Evidence`

| Field Category | Cybercrime (`app/db/models.py`) | Fraud Evidence System (`models/Evidence.js`) | TANTRA (`api.py: BUCKET_ARTIFACT`) | VAJRA (`security_contract.go`) |
|---|---|---|---|---|
| **Identifier** | `evidence_id: String` (e.g. `EV-...`), `id: Integer PK` | `_id: ObjectId` | `artifact_id: String` | `Type: String` |
| **Case Association** | `case_id: Integer (FK)` | `caseId: String` | Not present (in payload) | `caseId` (in incident struct) |
| **Entity / Target** | Inferred via case relationships | `wallet: String`, `reporter: String` | Not present (in payload) | `Data: String` |
| **Integrity Hash** | `hash: String` (SHA-256) | `storageHash: String` (SHA-256) | `hash: String`, `parent_hash: String` | `Hash: String` |
| **File Attributes** | `file_path`, `file_size`, `file_type` | `filename`, `originalFilename`, `filePath`, `fileSize`, `fileType` | In envelope payload | `Description: String` |
| **Storage Pointers** | Local directory path | `storageMetadata` (`s3Key`, `ipfsHash`, `bhivPointer`) | In envelope payload | Not defined |
| **Blockchain Anchor** | `anchor_status: String` ('pending', 'anchored', 'verified') | `blockchainTxHash`, `blockNumber`, `contractAddress`, `anchorStatus` | `pipeline_hash` in `truth_store.json` | `Evidence` slice in contract |
| **Schema Version** | Unversioned | Unversioned | `schema_version: "1.0.0"` (Enforced) | Unversioned |
| **Classification** | `REPOSITORY-SPECIFIC` | `REPOSITORY-SPECIFIC` | `REPOSITORY-SPECIFIC` | `REPOSITORY-SPECIFIC` |

### 4.2 Cross-Repository Schema Comparison: `AuditLog`

| Property | Cybercrime (`models.AuditLog`) | Fraud Evidence (`models.AuditLog`) | Fraud Evidence (`services/auditService`) | VAJRA (`cybersecurity.AuditLog`) |
|---|---|---|---|---|
| **Storage Engine** | SQLite / PostgreSQL | MongoDB Atlas | MongoDB (Fails Validation) | In-Memory Slice |
| **Actor Identifier** | `user_id: Integer (FK)` | `userId: ObjectId (ref: User)` | `userId: String ('system')` -> `CastError` | `Actor: String` |
| **User Role** | Omitted (joined via User) | `userRole: Enum` (required) | `userRole: 'unknown'` -> `ValidationError` | Inferred |
| **Action** | `action: String` | `action: String` | `action: String` | `Action: String` |
| **Resource Type** | `entity_type: String` | `resourceType: Enum` (required) | `resourceType: String` | `Resource: String` |
| **Resource Identifier**| `entity_id: String` | `resourceId: String`, `resource: String` | `resourceId: String` (`resource` omitted) | `Resource: String` |
| **HTTP Verb** | `method: String` | `method: Enum` (GET/POST/PUT/DELETE/PATCH) | `method: 'UNKNOWN'` -> `ValidationError` | Not present |
| **Endpoint / Path** | `path: String` | `endpoint: String` | `endpoint: String` | Not present |
| **IP Address** | `ip_address: String` | `ip: String` | `ipAddress: String` (`ip` omitted) | `IPAddress: String` |
| **Outcome** | `status: String` ('success'/'warning'/'error') | `success: Boolean`, `statusCode: Number` | `status: String` (`success` omitted) | `Result: AuditResult` (0=Success, 1=Fail, 2=Error) |
| **Security Level** | Omitted | `auditLevel: Enum` ('standard'/'high'/'critical') | `severity: String` (`auditLevel` omitted) | Inferred |
| **Trace ID** | `request_id: String` | Echoed on response, omitted in DB | Omitted | Omitted |
| **Timestamp** | `timestamp: DateTime (UTC)` | `timestamp: Date (UTC)` | `timestamp: Date` | `Timestamp: time.Time` |

---

## 5. Authentication, Authorization and Revocation Behavior

```mermaid
flowchart TD
    subgraph Cybercrime [Cybercrime (FastAPI)]
        C1[Incoming Request] --> C2{Authorization Header?}
        C2 -- Missing --> C3[Assign role='public']
        C2 -- Bearer Token --> C4[Decode JWT HS256]
        C4 --> C5{User active in DB?}
        C5 -- No --> C3
        C5 -- Yes --> C6[Assign User Role]
        C3 --> C7{RBAC is_allowed?}
        C6 --> C7
        C7 -- Denied (Public) --> C8[401 Unauthorized]
        C7 -- Denied (User) --> C9[403 Forbidden]
        C7 -- Allowed --> C10[Execute Endpoint Handler]
    end

    subgraph FraudEvidence [Fraud Evidence System (Express)]
        F1[Incoming Request] --> F2{Authorization Header?}
        F2 -- Missing --> F3[403 Forbidden: No authorization header]
        F2 -- Bearer Token --> F4[Verify JWT HS256 (7d)]
        F4 -- Invalid/Expired --> F5[403 Forbidden: Invalid token]
        F4 -- Valid --> F6[Fetch User from MongoDB]
        F6 --> F7{Authorize Action?}
        F7 -- isActive == false --> F8[403 Forbidden: Account deactivated]
        F7 -- Insufficient Role --> F9[403 Forbidden: Insufficient permissions]
        F7 -- Allowed --> F10[Execute Route Handler]
    end
```

### Detailed Behavior Matrix

| Dimension | Cybercrime | Fraud Evidence System | TANTRA | VAJRA |
|---|---|---|---|---|
| **Auth Mechanism** | JWT (HS256) | JWT (HS256) | None | Static API Key (`X-API-Key`) |
| **Token Lifetime** | 30 minutes | 7 days | N/A | Infinite / Static |
| **Password Storage** | Bcrypt (truncated <= 72 bytes) | Bcrypt (salt rounds: 10) | N/A | N/A |
| **Roles Configured** | `public`, `investigator`, `superadmin` | `user`, `investigator`, `admin`, `superadmin` | None | None |
| **Policy Enforcement** | Policy file `rbac-permissions.json` | Matrix file `rbac-permissions.json` | Constitutional boundary checks | In-memory `AccessController` |
| **Missing Auth Status**| **401 Unauthorized** | **403 Forbidden** (Non-standard) | Allows (Unprotected) | **401 Unauthorized** |
| **Denied Role Status** | **403 Forbidden** | **403 Forbidden** | N/A | **200 OK** (`allowed: false`) |
| **User Deactivation** | Blocks immediately in middleware | Blocks in `authorize.js` only | N/A | N/A |
| **Token Blacklist** | **NOT DEFINED** | **NOT DEFINED** | **NOT DEFINED** | **NOT DEFINED** |
| **Session Invalidation**| **NOT DEFINED** | **NOT DEFINED** | **NOT DEFINED** | **NOT DEFINED** |

---

## 6. Cross-Repository Integration and Traceability

### 6.1 Existing Interfaces Matrix

| Integration Interface | Source Repository | Target Repository | Configured Channel | Runtime Status | Evidence Reference |
|---|---|---|---|---|---|
| **Evidence Bucket Storage** | `cybercrime` | TANTRA / Storage Bucket | HTTP POST `BHIV_BUCKET_EVIDENCE_URL` | `CONFIGURED-ONLY` (Falls back to local `./evidence_storage`) | [`cybercrime/backend/app/core/sovereign_integrations.py:L115-167`](file:///c:/Users/A/Documents/CyberSecurity/cybercrime/backend/app/core/sovereign_integrations.py#L115-L167) |
| **Core Governance Event** | `cybercrime` | TANTRA Core | HTTP POST `BHIV_CORE_EVENT_URL` / Kafka | `CONFIGURED-ONLY` (Falls back to local `./event_buffer/events.jsonl`) | [`cybercrime/backend/app/core/sovereign_integrations.py:L170-244`](file:///c:/Users/A/Documents/CyberSecurity/cybercrime/backend/app/core/sovereign_integrations.py#L170-L244) |
| **Core Events Proxy** | `fraud-evidence-system` | Python Core Service | HTTP POST `http://localhost:8004` | `MOCKED` (Falls back to in-memory `eventsStorage` Map) | [`fraud-evidence-system/Backend/core/events/core_events.js:L21-45`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/core/events/core_events.js#L21-L45) |
| **EVM Violation Reporting** | `fraud-evidence-system` | VAJRA / Ethereum | `Cybercrime.sol` contract calls | `MOCKED` (Uses in-memory `violations` array) | [`fraud-evidence-system/Backend/routes/cybercrimeRoutes.js:L12-16`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/routes/cybercrimeRoutes.js#L12-L16) |
| **Cross-Chain Bridge** | `fraud-evidence-system` | VAJRA (`192.168.0.68:8080`) | HTTP REST RPC | `MOCKED` (Simulated lock/mint hashes via `setTimeout`) | [`fraud-evidence-system/Backend/services/bridgeSDK.js:L180-260`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/services/bridgeSDK.js#L180-L260) |
| **Blockchain Evidence Anchor** | `fraud-evidence-system` | EVM Ledger | Contract `0x742d35Cc6761C65532534444` | `MOCKED` (In-memory `blockchainLedger` Map) | [`fraud-evidence-system/Backend/services/evidenceContractService.js:L8-44`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/services/evidenceContractService.js#L8-L44) |

### 6.2 Trace ID Propagation & Identifier Mappings
- **Trace Header Consistency:** Both `cybercrime` and `fraud-evidence-system` inspect incoming `x-trace-id` (case-insensitive) and return canonical `X-Trace-Id` on responses.
- **Trace Preservation Verified:** Verified via live test execution in [`integration_test.py:L15-26`](file:///c:/Users/A/Documents/CyberSecurity/integration_test.py#L15-L26), confirming incoming trace IDs are preserved across HTTP middleware cycles.
- **Envelope Incompatibility:**
  - `cybercrime` emits: `{"evidenceId": "...", "sha256": "...", "filename": "...", "contentType": "...", "contentBase64": "..."}`.
  - `TANTRA` `/bucket/artifact` expects: `{"artifact_id": "...", "trace_id": "...", "timestamp_utc": "...", "schema_version": "1.0.0", "source_module_id": "...", "artifact_type": "...", "payload": {...}}`.
  - Result: Sending Cybercrime's payload directly to TANTRA produces an immediate HTTP 400 schema error.

---

## 7. Gaps, Inconsistencies and Risks

### Gap 1: Critical Mongoose Validation Defect in `auditService.js`
- **Location:** [`fraud-evidence-system/Backend/services/auditService.js:L38-55`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/services/auditService.js#L38-L55)
- **Evidence:** Mongoose model [`Backend/models/AuditLog.js:L6-10`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/models/AuditLog.js#L6-L10) defines `userId` as `type: mongoose.Schema.Types.ObjectId, required: true`. The service passes `userId || 'system'`. Non-ObjectId strings trigger an immediate `CastError`. Furthermore, `ipAddress`, `status`, and `severity` are passed instead of schema-defined fields `ip`, `success`, and `auditLevel`.
- **Risk:** Zero audit events sent through `auditService.js` are persisted to MongoDB.

### Gap 2: HTTP Status Code Inconsistency (401 vs 403)
- **Location:** [`fraud-evidence-system/Backend/middleware/auth.js:L27-30`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/middleware/auth.js#L27-L30)
- **Evidence:** Missing authorization header returns `res.status(403).json({ message: "No authorization header" })`. Standard RFC 9110 requires HTTP 401 Unauthorized when credentials are required but missing. Cybercrime correctly returns 401.

### Gap 3: Unauthenticated Core Governance API
- **Location:** [`Full-tantra-constitutional-convergence/api.py:L15-35`](file:///c:/Users/A/Documents/CyberSecurity/Full-tantra-constitutional-convergence/api.py#L15-L35)
- **Evidence:** All 22 routes in TANTRA lack authentication dependencies. Any client with network access can invoke `/bucket/artifact`, `/signal`, and `/replay`.

### Gap 4: Missing Token Revocation Mechanism
- **Location:** All 4 repositories.
- **Evidence:** While accounts can be disabled in database tables, active JWT tokens remain valid until expiration (7 days in Fraud Evidence System; 30 minutes in Cybercrime). No JTI blacklisting exists.

### Gap 5: PII Exposure in Cybercrime Complaint Endpoints
- **Location:** [`cybercrime/backend/app/api/v1/schemas.py:L251-272`](file:///c:/Users/A/Documents/CyberSecurity/cybercrime/backend/app/api/v1/schemas.py#L251-L272)
- **Evidence:** Officer phone numbers, emails, addresses, and investigator GPS coordinates (`investigator_location_latitude`, `investigator_location_longitude`) are serialized in plaintext without masking or access-level redaction.

### Gap 6: Simulated / Mocked Ledger Operations
- **Location:** [`fraud-evidence-system/Backend/services/evidenceContractService.js:L8`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/services/evidenceContractService.js#L8), [`routes/cybercrimeRoutes.js:L12-16`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/routes/cybercrimeRoutes.js#L12-L16)
- **Evidence:** Evidence hashes, blockchain blocks, and account freezes are stored in Javascript memory (`new Map()`), disappearing upon server restart.

---

## 8. Tests Inspected / Run and Exact Results

The following test suites and scripts were inspected and executed locally:

```
========================================================================================
TEST EXECUTION AUDIT TABLE
========================================================================================
Repo: cybercrime
  - Command: py -3.13 -m pytest test_endpoint.py
    Result: PASSED (1 passed, 11 warnings in 0.85s)
  - Command: py -3.13 test_import.py
    Result: PASSED (Successfully imported analyze_wallet_description & incident)
  - Command: py -3.13 test_predictions.py
    Result: PASSED (Predictions executed: {'ponzi': 0.0, 'fraud': 0.25, ...})
  - Command: py -3.12 integration_test.py
    Result: PASSED (CASE A: Trace ID preserved; CASE B: Trace ID generated)

Repo: fraud-evidence-system
  - Command: node test-rbac-simple.js
    Result: PASSED (25 passed, 0 failed across roles, endpoints, and hierarchy)
  - Command: npx jest tests/rbac.test.js --forceExit
    Result: PASSED (1 suite passed, 20 tests passed in 2.639s)
  - Suite: tests/evidence.integration.test.js
    Result: INSPECTED / DOCUMENTED (13 documented failure points detailed in 
            PHASE_4_FAILURE_ANALYSIS.md due to schema property requirements)

Repo: Full-tantra-constitutional-convergence (TANTRA)
  - Command: py -3.12 -m unittest discover -s tests -p "test_*.py"
    Result: PASSED (5 tests ran in 0.007s, status OK)

Repo: bhiv-VAJRA_Blockchain-main (VAJRA)
  - Command: go test ./...
    Result: NOT VERIFIED (Go compiler not installed on host environment)
========================================================================================
```

---

## 9. NOT DEFINED / NOT VERIFIED / NOT AVAILABLE Items

### NOT DEFINED (Absent from codebase & documentation)
1. **Unified Token Blacklist:** No database table, Redis cache, or distributed ledger stores revoked JWT IDs (JTIs) in any repository.
2. **PII Masking & Redaction Rules:** No redaction pipeline exists for sensitive officer contact information or investigator GPS locations in Cybercrime or Fraud Evidence System.
3. **Cybercrime ↔ Fraud Evidence Direct API Contract:** No route, client, or schema exists for direct communication between the two application backends.
4. **TANTRA Authentication Gateway:** No authentication mechanism is defined for TANTRA’s HTTP API.
5. **VAJRA User-Level IAM:** Individual investigator identity and role management do not exist in VAJRA’s cybersecurity module (only a single static API key is defined).

### NOT VERIFIED (Referenced but inaccessible / unexecutable locally)
1. **Live VAJRA Relay-Chain Network:** Node RPC at `http://192.168.0.68:8080` could not be connected to.
2. **VAJRA Go Unit Tests:** Go runtime is not installed on the host system (`CommandNotFoundException`).
3. **Remote MongoDB Atlas / S3 / IPFS Endpoints:** External cloud endpoints referenced in `.env.example` files could not be reached.

### NOT AVAILABLE
- **None:** All 4 assigned repositories (`cybercrime`, `fraud-evidence-system`, `Full-tantra-constitutional-convergence`, `bhiv-VAJRA_Blockchain-main`) exist in the workspace and were audited.

---

## 10. Phase 1 Completion Checklist

- [x] Read-only audit conducted across all 4 available repositories.
- [x] Evidence citations provided with repository-relative paths and line numbers.
- [x] Data models and event schemas inventoried across all systems.
- [x] Authentication, RBAC, and revocation behaviors documented.
- [x] Cross-repository integration boundaries classified (`CONFIGURED-ONLY`, `MOCKED`, `MISMATCH`).
- [x] Tests actually executed documented with exact run outcomes.
- [x] Gaps, inconsistencies, and defects detailed with file/line evidence.
- [x] Unverified items marked `NOT VERIFIED` and missing concepts marked `NOT DEFINED`.
- [x] No application code, tests, or configurations modified.

---

## 11. Recommended Phase 2 Questions Requiring Team Agreement

*(The following questions are raised for team consensus prior to beginning any Phase 2 implementation)*

1. **Canonical Evidence Schema:** Will the ecosystem adopt Cybercrime's relational model, Fraud Evidence System's MongoDB/IPFS model, or TANTRA's artifact envelope as the single canonical evidence representation?
2. **AuditLog Schema Alignment:** Should `fraud-evidence-system/Backend/services/auditService.js` be corrected to conform to `models/AuditLog.js`, or should the Mongoose schema be simplified to accommodate system-generated string actors and variable statuses?
3. **HTTP 401 vs 403 Standardization:** Can team consensus be established to standardize all unauthenticated requests across all repositories to HTTP 401 Unauthorized?
4. **Token Revocation Architecture:** Should token revocation be handled via short-lived JWTs (e.g., 15 minutes) with refresh tokens, or via a distributed Redis/database blacklist?
5. **PII Redaction Standard:** What redaction policy should be enforced for investigator IP addresses, GPS coordinates, and officer mobile numbers in API responses?
6. **TANTRA API Protection:** Should TANTRA be placed behind an API gateway with mTLS/JWT validation, or implement internal middleware for service-to-service authentication?
7. **Transition from Mocks to True Anchoring:** When will live VAJRA relay-chain endpoints or local testnets be provided to replace the in-memory Maps in `evidenceContractService.js` and `bridgeSDK.js`?

---

## 12. Final Status

**Status:** **`COMPLETE`**

**Reasoning:**
Every accessible repository (`cybercrime`, `fraud-evidence-system`, `Full-tantra-constitutional-convergence`, and `bhiv-VAJRA_Blockchain-main`) has undergone an exhaustive, evidence-based current-state assessment. All existing schemas, endpoints, authorization mechanisms, revocation capabilities, and integration boundaries have been inventoried with exact file/line citations. Test suites were executed where feasible, and environmental limits were documented factually. No application code, configurations, or tests were altered.
