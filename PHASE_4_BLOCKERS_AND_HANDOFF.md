# Phase 4 — Cross-Repository Blockers & Engineering Handoff

**Document Identifier:** `PHASE_4_BLOCKERS_AND_HANDOFF.md`  
**Owner / Author:** Kaushlendra Yadav — Data, API & Access Control  
**Prerequisites:** `PHASE_4_INTEGRATION_REPORT.md`, `PHASE_4_TEST_RESULTS.md`  
**Date:** 2026-10-17  
**Status:** `ACTIONABLE HANDOFF SPECIFICATION`

---

## 1. Executive Summary

While all security remediations in the Cybercrime repository (`SEC-01` through `SEC-08`) are complete and 30 automated integration tests pass, full cross-repository production convergence requires decisions and actions from the owning teams of **Fraud Evidence System**, **TANTRA**, **VAJRA**, and **Infrastructure/DevOps**.

This document details every outstanding blocker, its impact, its root cause in code, and the exact handoff instructions required to reach Phase 5 (Full Production Readiness).

---

## 2. Inventory of Cross-Repository Blockers

### Blocker 1: TANTRA Inter-Service Authentication & Perimeter Protection
- **Status:** **`BLOCKED — TEAM DECISION REQUIRED`**
- **Impact:** High. TANTRA endpoints (`/api/v1/bucket/artifacts`, `/api/v1/keshav/execution`, `/api/v1/sanskar/evaluate`) are accessible to unauthenticated HTTP callers. An adversary with network visibility can inject arbitrary artifacts or invoke governance pipelines.
- **Root Cause Evidence:** In [`Full-tantra-constitutional-convergence/api.py:L27-35`](file:///c:/Users/A/Documents/CyberSecurity/Full-tantra-constitutional-convergence/api.py#L27-L35), CORS middleware is attached, but there is no authentication middleware or FastAPI `Security` dependency.
- **Proposed Solution Options:**
  1. *Option A (Recommended):* Implement a shared service-to-service Bearer token signed with HMAC-SHA256 or asymmetric ed25519 key, verified via FastAPI middleware.
  2. *Option B:* Implement mutual TLS (mTLS) at the service mesh / ingress gateway level, leaving application code untouched.
- **Owning Team:** TANTRA Core Team.

---

### Blocker 2: Fraud Evidence `auditService.js` vs `AuditLog.js` Schema Mismatch
- **Status:** **`BLOCKED — TEAM DECISION REQUIRED`**
- **Impact:** Medium. In the Fraud Evidence System, whenever `auditService.logAction()` is called, Mongoose throws a validation error during `.save()`, causing audit writes to silently fail or fall into error handlers.
- **Root Cause Evidence:**
  - In [`fraud-evidence-system/Backend/models/AuditLog.js:L7-49`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/models/AuditLog.js#L7-L49), the schema requires:
    - `userId`: `ObjectId` (ref `User`)
    - `userEmail`: `String` (required)
    - `userRole`: `enum: ['superadmin', 'admin', 'investigator', 'user']`
    - `resource`: `String` (required)
    - `method`: `enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']`
  - In [`fraud-evidence-system/Backend/services/auditService.js:L38-53`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/services/auditService.js#L38-L53), the code instantiates:
    ```javascript
    new AuditLog({
      userId: userId || 'system',        // Fails ObjectId cast
      userEmail: userEmail || null,      // Fails required validation
      userRole: userRole || 'unknown',   // Fails enum validation
      method: method || 'UNKNOWN',       // Fails enum validation
      // Omits 'resource' field entirely (fails required validation)
      ipAddress: ipAddress || 'unknown', // Schema expects field name 'ip'
    });
    ```
- **Proposed Solution:**
  Update `auditService.js` to supply a valid system `ObjectId` or make `userId` optional in `AuditLog.js`, map `ipAddress` to `ip`, and provide default values that satisfy schema enums.
- **Owning Team:** Fraud Evidence Backend Team.

---

### Blocker 3: Fraud Evidence HTTP 403 on Missing Authorization Header vs RFC 9110 HTTP 401
- **Status:** **`BLOCKED — TEAM DECISION REQUIRED`**
- **Impact:** Medium. Breaks cross-system error harmonization specified in Phase 2 Contract Section 5.2. Causes 1 test failure in Fraud Evidence's own integration suite (`should deny access without authentication`).
- **Root Cause Evidence:**
  In [`fraud-evidence-system/Backend/middleware/auth.js:L27-37`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/middleware/auth.js#L27-L37):
  ```javascript
  if (!authHeader) {
    return res.status(403).json({ message: "No authorization header" });
  }
  if (scheme !== "Bearer" || !token) {
    return res.status(403).json({ message: "Invalid authorization format" });
  }
  ```
- **Proposed Solution:**
  Change `res.status(403)` to `res.status(401)` in `auth.js` when the header is absent or invalid, aligning with standard RFC 9110 and resolving the failing test.
- **Owning Team:** Fraud Evidence Backend Team.

---

### Blocker 4: Production Multi-Worker / Distributed Token Revocation Store
- **Status:** **`NOT VERIFIED IN DISTRIBUTED CLUSTER — INFRASTRUCTURE DECISION REQUIRED`**
- **Impact:** Medium-Low. The persistent SQLite implementation in Cybercrime (`RevokedToken` table) guarantees persistence across application restarts and local inter-process synchronization. However, in a multi-host Kubernetes or multi-instance container deployment, separate SQLite databases will not synchronize JTI revocations across nodes.
- **Root Cause Evidence:** Application uses SQLite by default via [`config.py:L94`](file:///c:/Users/A/Documents/CyberSecurity/cybercrime/backend/app/core/config.py#L94) (`DATABASE_URL: str = "sqlite:///./investigation.db"`).
- **Proposed Solution:**
  For production clustering, deploy a shared PostgreSQL database or Redis cluster and set `DATABASE_URL=postgresql://...`. The existing SQLAlchemy model works without application code changes.
- **Owning Team:** DevOps / Cloud Infrastructure Team.

---

### Blocker 5: Global Case Identifier Standard
- **Status:** **`PENDING TEAM AGREEMENT`**
- **Impact:** Low. Cybercrime supports both internal integer `id` and external string `case_id` (`CAS-...`), while Fraud Evidence expects string `caseId`.
- **Proposed Solution:**
  Confirm that all inter-service communications standardize on `CAS-<identifier>` strings, preserving internal integer primary keys as implementation details private to each repository.
- **Owning Team:** Cross-Repository Architecture Working Group.

---

## 3. Engineering Handoff Instructions

### Handoff to Cybercrime Engineering Team
1. **Maintain Remediation Integrity:** Do not revert changes made to `authz.py`, `access.py`, `models.py`, `security.py`, `main.py`, or `sovereign_integrations.py`.
2. **Database Migrations:** The `RevokedToken` model is auto-created by `Base.metadata.create_all(bind=engine)` on startup. If Alembic is introduced, generate a revision migration for `revoked_tokens`.
3. **Environment Setup:** Ensure `SECRET_KEY` is configured in production `.env`.

### Handoff to Fraud Evidence System Team
1. **Apply HTTP 401 Fix:** In [`middleware/auth.js:L29,36`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/middleware/auth.js#L29), change `status(403)` to `status(401)`.
2. **Align Audit Service:** In [`services/auditService.js:L38-53`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/services/auditService.js#L38-L53), fix field names and types to match [`models/AuditLog.js`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/models/AuditLog.js).
3. **Evidence Upload Handler:** In [`routes/evidenceRoutes.js:L95-130`](file:///c:/Users/A/Documents/CyberSecurity/fraud-evidence-system/Backend/routes/evidenceRoutes.js#L95-L130), ensure `wallet`, `reporter`, and `filePath` are provided when creating `Evidence` documents.

### Handoff to TANTRA Engineering Team
1. **Perimeter Authentication:** Add an API key or Bearer token validation middleware in [`Full-tantra-constitutional-convergence/api.py`](file:///c:/Users/A/Documents/CyberSecurity/Full-tantra-constitutional-convergence/api.py).
2. **Trace Verification:** Validate that incoming requests containing `trace_id` in the JSON payload correlate properly with `observability.log`.

### Handoff to VAJRA Blockchain Team
1. **API Key Distribution:** Provide the configured `X-API-Key` to the Cybercrime team to enable live blockchain anchoring integration on port 8080.
2. **Severity Mapping:** Verify that severity levels emitted by Cybercrime (`low: 0.25`, `medium: 0.50`, `high: 0.75`, `critical: 1.0`) align with VAJRA's `SeverityLow`, `SeverityMedium`, `SeverityHigh`, `SeverityCritical` enums in `security_contract.go`.

---

## 4. Final Git Status

Working tree state in `cybercrime`:
```text
On branch main
Changes not staged for commit:
	modified:   backend/app/api/v1/api.py
	modified:   backend/app/core/audit_logging.py
	modified:   backend/app/core/canonical_event.py
	modified:   backend/app/core/error_responses.py
	modified:   backend/app/core/security.py
	modified:   backend/app/core/sovereign_integrations.py
	modified:   backend/app/db/models.py
	modified:   backend/main.py
	modified:   backend/test_endpoint.py
	modified:   backend/test_phase3_sovereign_control.py
	modified:   backend/test_phase4_cross_repo_integration.py
	modified:   rbac-permissions.json

Untracked files:
	backend/app/api/v1/endpoints/access.py
	backend/app/api/v1/endpoints/authz.py
	backend/event_buffer/
```

Workspace root state:
- All pre-existing untracked and modified files preserved.
- No commits or pushes performed.
