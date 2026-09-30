# Cybersecurity Task 1 — Phase 1 Baseline

## 1. Executive Summary
This report provides a read-only technical baseline audit of the four primary repositories in the cybersecurity ecosystem: `cybercrime`, `fraud-evidence-system`, `bhiv-VAJRA_Blockchain-main`, and `Full-tantra-constitutional-convergence`. The audit focuses on data handling, APIs, authentication, access control boundaries, schemas, and persistence interfaces. No codebase changes or integrations were made during this phase. The ecosystem currently consists of overlapping implementations of evidence management, varied API standards, fragmented database strategies, and partially wired ecosystem components.

## 2. Repository Inventory

### cybercrime
- **Repository name:** cybercrime
- **Git remote:** UNKNOWN
- **Current branch:** UNKNOWN
- **Working-tree status:** UNKNOWN (Requires execution of git commands)
- **Technology stack:** Python (FastAPI), Node.js (React/Vite)
- **Frontend:** React + Vite
- **Backend:** FastAPI (Python 3.11)
- **Entry points:** `backend/main.py`, `frontend/index.html`
- **Startup commands:** `python main.py`, `npm run dev`
- **Ports:** 3000 (Backend API), 5173 (Frontend)
- **Databases:** SQLite (default), PostgreSQL supported
- **Configuration/environment files:** `backend/env.template`, `backend/requirements.txt`
- **Docker files:** `docker-compose.fullstack.yml`
- **Deployment files:** `render.yaml`, `RENDER_DEPLOYMENT.md`
- **Test directories:** Scattered `test_*.py` files in `backend/`
- **Documentation:** `FEATURES_AND_USAGE.md`, `integration-runbook.md`
- **API specifications:** `openapi.yaml` (VERIFIED)

### fraud-evidence-system
- **Repository name:** fraud-evidence-system
- **Git remote:** UNKNOWN
- **Current branch:** UNKNOWN
- **Working-tree status:** UNKNOWN
- **Technology stack:** Node.js (Express), React, MongoDB
- **Frontend:** React
- **Backend:** Express.js (Node.js)
- **Entry points:** `Backend/server.js`, `Frontend/src/App.jsx`
- **Startup commands:** `npm start` (Backend), `npm start` (Frontend)
- **Ports:** 5050 (Backend API), 3000 (Frontend)
- **Databases:** MongoDB Atlas (Cloud)
- **Configuration/environment files:** `.env.example` in both Backend/Frontend
- **Docker files:** `Dockerfile` (Backend/Frontend), `docker-compose.yml`, `docker-compose.production.yml`
- **Deployment files:** Multiple guides e.g. `PRODUCTION_READY_GUIDE.md`
- **Test directories:** `Backend/tests/`, multiple root `test-*.js` scripts
- **Documentation:** `START_HERE.md`, `README.md`, `AUDIT_LOGGING_GUIDE.md`
- **API specifications:** `openapi.yaml`, `Backend/swagger/` (VERIFIED)

### bhiv-VAJRA_Blockchain-main
- **Repository name:** bhiv-VAJRA_Blockchain-main
- **Git remote:** UNKNOWN
- **Current branch:** UNKNOWN
- **Working-tree status:** UNKNOWN
- **Technology stack:** Go (Core Blockchain), Shell scripts, Smart Contracts
- **Frontend:** Web wallet dashboard
- **Backend:** Go REST API (`relay-chain`)
- **Entry points:** `core/relay-chain/cmd/relay/`
- **Startup commands:** `start_blockchain.bat`, `start_wallet_web.bat`
- **Ports:** 8080 (REST API typically)
- **Databases:** LevelDB
- **Configuration/environment files:** `rpc_deployment_config.md`, `.env.example`
- **Docker files:** `Dockerfile`, `Dockerfile.blockchain`, `docker-compose.yml`
- **Deployment files:** `.bat` scripts, `deploy-bhx.sh`
- **Test directories:** Scattered scripts (e.g., `test_env.go`)
- **Documentation:** `PROJECT_OVERVIEW.md`, `VAJRA_MAINNET_ARCHITECTURE.md`
- **API specifications:** Mentioned `API_DOCUMENTATION.md` (VERIFIED)

### Full-tantra-constitutional-convergence
- **Repository name:** Full-tantra-constitutional-convergence
- **Git remote:** UNKNOWN
- **Current branch:** UNKNOWN
- **Working-tree status:** UNKNOWN
- **Technology stack:** Python, Shell scripts
- **Frontend:** None
- **Backend:** Python runtime orchestrator (`tantra.py`, `api.py`)
- **Entry points:** `run.sh`, `api.py`
- **Startup commands:** `./run.sh --profile development`
- **Ports:** 8001 (API), 8002 (Health), 8003 (Metrics)
- **Databases:** Local event store (`event_store.json`), Truth store (`truth_store.json`)
- **Configuration/environment files:** `runtime_config/environment/`, `.env.example`
- **Docker files:** `Dockerfile`, `Dockerfile.backend`
- **Deployment files:** `run.sh`, `startup.sh`
- **Test directories:** `tests/`
- **Documentation:** `ARCHITECTURE_REFERENCE.md`, `plug_and_play_runtime.md`
- **API specifications:** API implemented in `api.py` with strict schema validation (VERIFIED)

## 3. Cybercrime Baseline
1. **Backend framework and entry point:** FastAPI, `c:\Users\A\Documents\CyberSecurity\cybercrime\backend\main.py`
2. **Frontend framework and entry point:** React + Vite, `c:\Users\A\Documents\CyberSecurity\cybercrime\frontend\src\`
3. **API routes:** `c:\Users\A\Documents\CyberSecurity\cybercrime\backend\app\api\v1\endpoints\`
4. **API versioning:** `v1`
5. **Request schemas:** `c:\Users\A\Documents\CyberSecurity\cybercrime\backend\app\api\v1\schemas.py`
6. **Response schemas:** `c:\Users\A\Documents\CyberSecurity\cybercrime\backend\app\api\v1\schemas.py`
7. **Authentication mechanism:** JWT (`SECRET_KEY`)
8. **Authorization mechanism:** Role-based checks via dependencies
9. **RBAC roles:** Superadmin, Investigator (`c:\Users\A\Documents\CyberSecurity\cybercrime\backend\app\core\rbac.py`)
10. **Permissions:** Hardcoded scope limits per role
11. **Middleware:** Standard FastAPI CORS/Auth middlewares
12. **Database models:** `c:\Users\A\Documents\CyberSecurity\cybercrime\backend\app\db\models.py`
13. **Evidence storage:** Local directory `evidence_storage/` with paths saved to DB
14. **Audit logging:** General DB event logging mapped to investigator IDs
15. **Provenance:** Inferred from DB timestamps and actor IDs
16. **Trace/request IDs:** Standard FastAPI tracking, no strict global standard
17. **Health endpoints:** Unknown/Default FastAPI endpoints
18. **Tests:** Dispersed `test_*.py` files in `backend/`
19. **Docker/deployment:** `docker-compose.fullstack.yml`
20. **Environment variables:** `.env` via `backend/app/core/config.py`

## 4. Fraud Evidence System Baseline
1. **Backend entry point:** Express, `c:\Users\A\Documents\CyberSecurity\fraud-evidence-system\Backend\server.js`
2. **Frontend entry point:** React, `c:\Users\A\Documents\CyberSecurity\fraud-evidence-system\Frontend\src\`
3. **API routes:** `c:\Users\A\Documents\CyberSecurity\fraud-evidence-system\Backend\routes\`
4. **Authentication:** Supabase + JWT tokens
5. **Authorization:** Custom RBAC Middleware
6. **RBAC roles:** guest, user, analyst, investigator, admin, superadmin
7. **Permissions:** Mapped in `c:\Users\A\Documents\CyberSecurity\fraud-evidence-system\Backend\rbac-permissions.json`
8. **Evidence APIs:** `/api/evidence/*`
9. **Evidence storage:** Handled via upload endpoints (Local/S3/Blockchain Anchors)
10. **Evidence verification:** Blockchain hashing mechanisms
11. **Audit logging:** `/api/admin/audit/*` endpoints, logged to DB
12. **Blockchain/hash verification:** Blockchain verification endpoints exposed
13. **Database:** MongoDB (`models/` folder schemas)
14. **Trace/request IDs:** Unknown
15. **Health endpoints:** `/health`
16. **Tests:** Extensive shell and JS test scripts (e.g., `test-rbac-e2e.js`) in `Backend/`
17. **Docker/deployment:** `docker-compose.production.yml`
18. **Environment/configuration:** `Backend/.env.example`

## 5. Vajra Baseline
1. **Identity mechanism:** Secure private key handling / Wallet Addresses
2. **Data ownership/control:** Native blockchain state management (Account balances)
3. **Permission mechanisms:** Administrator privileges for emergency operations
4. **Relevant APIs:** `/api/relay/submit`, `/api/balance/`
5. **Authentication/authorization:** Signed transactions
6. **Security/fraud interfaces:** ML-powered fraud detection interface, Wallet flagging
7. **Health/status endpoints:** `/api/health`
8. **Integration interfaces:** Cross-chain Bridge (ETH), Bridge SDK
9. **Events or transaction identifiers:** Standard TxHash hashes and Block heights
10. **Any interface that Cybersecurity could legitimately consume:** The REST API transaction query endpoints, fraud flagging APIs, and bridge event emitters. (VERIFIED)

## 6. TANTRA Baseline
1. **Runtime entry point:** `c:\Users\A\Documents\CyberSecurity\Full-tantra-constitutional-convergence\tantra.py`
2. **Service registration:** `c:\Users\A\Documents\CyberSecurity\Full-tantra-constitutional-convergence\service_registry.json`
3. **Capability registration:** `service_registry.py` tracking readiness/liveness.
4. **Input contract:** JSON with `trace_id` and `signal`
5. **Intelligence output contract:** SANSKAR output with `entities`, `ranking`, `metadata`, `decision_state`
6. **Core output:** Priority logic with `decision`, `priority`, `reasoning`
7. **Enforcement output:** Directives array with statuses
8. **Schema/versioning:** Handled via validation routines in `runtime_adapters.py` (e.g., checking `contract_version`)
9. **trace_id:** Explicit `trace_id` required on entry and persisted unchanged through the pipeline
10. **authentication:** Currently bounded by physical network/profile separation; no explicit JWT mentioned.
11. **provenance:** Maintained strictly via `trace_id` and `event_store.json` chaining.
12. **error handling:** Fail-closed semantics propagated via trace metadata.
13. **observability:** `observability.log` for stage timing and decision state capture.
14. **replay references:** Replay capabilities driven by comparing `event_store.json` deterministic hashes.
15. **downstream/upstream service interfaces:** RAJYA, Enforcement, Bucket, InsightBridge endpoints.
16. **current mocked/simulated/unwired integrations:** RAJYA responses are partially mocked, InsightBridge is marked "not wired" in architecture docs. (VERIFIED)

## 7. API Comparison

| Area | Cybercrime | Fraud Evidence | Vajra | TANTRA |
|------|------------|----------------|-------|--------|
| API | YES | YES | YES | YES |
| API version | YES (v1) | UNKNOWN | UNKNOWN | YES (contract_version) |
| Request schema | YES | YES | YES | YES |
| Response schema | YES | YES | YES | YES |
| Authentication | YES | YES | YES (Signatures) | NO / UNKNOWN |
| Authorization | YES | YES | YES | YES |
| RBAC | YES | YES | NO | NO |
| Permissions | YES | YES | YES | YES |
| Data model | YES (Relational) | YES (Document) | YES (State DB)| YES (Events) |
| Persistence | YES | YES | YES | YES |
| Evidence | YES | YES | NO | PARTIAL |
| Audit | PARTIAL | YES | YES | YES |
| Trace ID | NO | NO | YES (TxHash) | YES (trace_id)|
| Provenance | PARTIAL | YES | YES | YES |
| Health | UNKNOWN | YES | YES | YES |
| Error handling | YES | YES | YES | YES |

## 8. Authentication and Authorization Comparison
- **Cybercrime:** FastApi/JWT based, uses two primary roles (Superadmin, Investigator).
- **Fraud Evidence:** Express/JWT/Supabase based, heavily relies on RBAC via a JSON configuration file representing 6 distinct roles.
- **Vajra:** Blockchain consensus and private key cryptography. Some admin operations are exposed.
- **TANTRA:** Lacks standard human-facing auth; relies on service-to-service contracts and boundary assertions.

## 9. Data and Persistence Comparison
- **Cybercrime:** Relational (SQLite/PostgreSQL) with local file storage.
- **Fraud Evidence:** NoSQL Document (MongoDB) with robust evidence hashing.
- **Vajra:** Key-Value (LevelDB) managing canonical blockchain state.
- **TANTRA:** JSON-backed event streams (`event_store.json`) and truth states (`truth_store.json`).

## 10. Evidence and Audit Comparison
- **Cybercrime:** Simplistic database-tracked metadata for files stored in `evidence_storage/`.
- **Fraud Evidence:** Sophisticated evidence upload logic bundled with blockchain anchoring and explicit audit APIs.
- **Vajra:** Intrinsic block auditing and transaction histories.
- **TANTRA:** Strict event sourcing, tracing every functional stage via an immutable `trace_id`.

## 11. Duplicate Functionality
- **Functionality:** AI Fraud Detection
  - **Repository A:** cybercrime
  - **Repository B:** fraud-evidence-system
  - **Evidence/file paths:** `cybercrime/backend/app/api/v1/endpoints/rl_engine.py` vs. `fraud-evidence-system/Backend/routes/rl.js`
  - **Difference:** Potentially different RL configurations; Cybercrime links directly to incident reports.
  - **UNKNOWN questions:** Are these engines utilizing the exact same ML models under the hood?

- **Functionality:** Evidence Management / Upload
  - **Repository A:** cybercrime
  - **Repository B:** fraud-evidence-system
  - **Evidence/file paths:** `cybercrime/backend/app/api/v1/...` vs. `fraud-evidence-system/Backend/routes/evidence.js`
  - **Difference:** Fraud Evidence anchors files to the blockchain; Cybercrime only relies on basic hashes/metadata.
  - **UNKNOWN questions:** Should Cybercrime's evidence be migrated entirely to Fraud Evidence System, or are they meant to co-exist for distinct investigative bodies?

- **Functionality:** Role Based Access Control (RBAC)
  - **Repository A:** cybercrime
  - **Repository B:** fraud-evidence-system
  - **Evidence/file paths:** `cybercrime/backend/app/core/rbac.py` vs. `fraud-evidence-system/Backend/rbac-permissions.json`
  - **Difference:** Disparate IAM implementations and completely different user definitions.
  - **UNKNOWN questions:** How will identity be federated across both applications?

## 12. Existing Integration Points
- **Cybercrime → Vajra:** AI fraud analysis is mapped to wallets (wallet addresses as primary keys in `Cybercrime`).
- **Fraud Evidence → Vajra:** References to blockchain anchoring point to integration with a core blockchain logic system.
- **TANTRA → Ecosystem:** SANSKAR connects (or aims to connect) with RAJYA, Bucket, and InsightBridge endpoints.
- **Vajra → Cybercrime:** Vajra references "Fraud detection (95% Complete) ... Waiting for Keval & Aryan's API".

## 13. Integration Risks
- Disconnected identity systems (Supabase vs Local JWT).
- Fragmented data persistence engines (Mongo vs Postgres vs LevelDB vs JSON Event Store).
- Traceability breakdown: TANTRA requires a strict `trace_id` lifecycle, but Cybercrime and Fraud Evidence do not generate or propagate these exact traces natively yet.
- Integration endpoints for TANTRA (RAJYA, Bucket) are currently mocked in automated tests and may suffer contract mismatches when wired to live services.

## 14. Gaps
- **GAP-ID:** G-001
  - **Description:** No Unified Authentication
  - **Repository:** cybercrime, fraud-evidence-system
  - **Evidence:** Two entirely different authentication and user administration flows exist.
  - **Impact:** Investigators must maintain dual accounts; authorization boundaries are inconsistent.
  - **Status:** VERIFIED
- **GAP-ID:** G-002
  - **Description:** Missing end-to-end `trace_id` correlation
  - **Repository:** All
  - **Evidence:** TANTRA strictly defines `trace_id`, but upstream web APIs in Cybercrime/Fraud Evidence lack strict enforcement.
  - **Impact:** Breaks end-to-end observability and deterministic replay.
  - **Status:** VERIFIED
- **GAP-ID:** G-003
  - **Description:** Mocked TANTRA integrations
  - **Repository:** Full-tantra-constitutional-convergence
  - **Evidence:** `ARCHITECTURE_REFERENCE.md` outlines "RAJYA Request (not sent yet)".
  - **Impact:** System stability is unproven against live network delays and real schemas.
  - **Status:** VERIFIED

## 15. BCAES Boundary Findings
- **Cybersecurity owns:** Fraud incident reporting, evidence upload pipelines, localized access control logic, security intelligence ranking models.
- **Cybersecurity does NOT own:** Global IAM systems (Identity), core ledger consensus, canonical data custody.
- **Vajra owns:** Ledger state, core permissions/wallet authorities, block mining, multi-token balances.
- **TANTRA owns:** Execution determinism, cross-service orchestrating governance boundaries, `trace_id` generation logic, pipeline hashing.
- **Governance/data layer owns:** The truth store (`Bucket`), compliance logging (`InsightBridge`), and final authoritative decisions (`RAJYA`).

## 16. Identifier / trace_id Findings
- **Identifier:** `trace_id`
  - **Repository:** Full-tantra-constitutional-convergence
  - **Purpose:** Globally unique identifier binding a single analytical execution pipeline to ensure deterministic replay.
  - **Where generated:** At the ingestion point of the TANTRA API.
  - **Where stored:** `event_store.json`, `observability.log`
  - **Where transmitted:** Passed through all internal stages and out to Ecosystem adapters.
  - **Can it currently be correlated with other systems?** NO.
- **Identifier:** Wallet Address (0x...)
  - **Repository:** Vajra, Cybercrime, Fraud Evidence System
  - **Purpose:** The canonical target entity for investigations.
  - **Where generated:** Vajra (Client-side keygen)
  - **Where stored:** Across all databases.
  - **Where transmitted:** Across essentially all fraud analysis endpoints.
  - **Can it currently be correlated with other systems?** YES (Serves as the defacto cross-system entity ID).

## 17. UNKNOWN Items
- Which ML fraud detection engine is the single source of truth?
- Will Cybercrime user accounts be migrated to Supabase (from Fraud Evidence System), or vice versa?
- What are the exact schemas expected by the live RAJYA and Bucket instances?

## 18. Phase 1 Conclusions
The ecosystem is in a fragmented state regarding authentication, data persistence, and evidence tracking. The TANTRA component demonstrates a strong, deterministic execution pipeline but remains disconnected from live upstream sources (Cybercrime/Fraud Evidence). Duplication of effort in evidence management and RBAC between the two web portals is severe. Identity and global tracing (`trace_id`) must be harmonized before Phase 2 integration can succeed.

## 19. Recommended Inputs for Phase 2
- Single Unified Schema specifications for AI incident reports.
- Global federated Authentication plan.
- Upstream injection of TANTRA `trace_id` generation at the API gateway layer.
- Migration paths for overlapping evidence models.

PHASE 1 STATUS:
READY FOR REVIEW

VERIFIED:
- Repository stacks, entry points, APIs, deployment states.
- Separation of concerns between Vajra (Core) and TANTRA (Runtime).
- Redundancies in Cybercrime vs Fraud Evidence System logic.

PARTIAL:
- Test coverage evaluation (files exist, true coverage unknown).
- End-to-end trace correlation (conceptualized, not implemented).

UNKNOWN:
- Canonical identity migration plan.
- Live endpoint schemas for TANTRA mocks.

CRITICAL GAPS:
- Missing SSO/IAM unification.
- Disconnected event tracing identifiers.

DO NOT IMPLEMENT YET:
- Do not merge DBs.
- Do not refactor APIs.
- Do not dismantle redundant AI engines.

FILES INSPECTED:
- `cybercrime/FEATURES_AND_USAGE.md`
- `fraud-evidence-system/START_HERE.md`
- `bhiv-VAJRA_Blockchain-main/bhiv-VAJRA_Blockchain-main/PROJECT_OVERVIEW.md`
- `Full-tantra-constitutional-convergence/ARCHITECTURE_REFERENCE.md`
- `Full-tantra-constitutional-convergence/plug_and_play_runtime.md`
- Multiple internal code directories and `.json` schema references.
