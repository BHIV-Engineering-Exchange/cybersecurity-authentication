# 🛡️ Fraud Evidence System — Complete System Guide

A unified, end-to-end guide that consolidates all information for the Fraud Evidence System: architecture, features, APIs, environment setup, authentication and RBAC, external data integration, logging/monitoring, testing, and troubleshooting.

---

## 1) Overview

Fraud Evidence System is a full‑stack platform for fraud reporting, ML-based behavioral analysis, and digital evidence management with blockchain integrity. It provides:
- Real-time ML analysis on wallet behavior
- Evidence library with verification, sharing, and export
- Role-based access control (RBAC) for Admin, Investigator, and Public users
- Logging and health endpoints to monitor external API integration and system status

---

## 2) Core Features

- ML-Powered Fraud Detection
  - Behavioral pattern analysis: rapid dumping, large transfers, flash loans, phishing
  - Composite risk scoring (0.0–1.0) and recommended actions
  - Endpoints to analyze a wallet and retrieve results/config

- Evidence Management
  - Upload, verify, download, share, export case report (PDF)
  - Chain-of-custody visualization
  - Advanced, user-friendly Evidence Library UI

- External Transaction Data Integration
  - Primary Data Endpoint: http://192.168.0.80:8080/api/transaction-data
  - Fallback Data Endpoint: http://192.168.0.68:8080/api/transaction-data
  - Caching, local backup, and fallback logic built-in

- Security & RBAC
  - JWT-based authentication
  - Roles: admin, investigator, public
  - Fine-grained permissions for evidence operations
  - Route guard for /admin page (restricted to admin role or configured admin email)

- Observability
  - Structured API call logs (success, errors, cache/fallback usage)
  - Health endpoints and log statistics

- Frontend
  - Modern React (Vite) + Tailwind CSS UI
  - Unified dashboard for reporting, analysis, evidence, and timeline

---

## 3) Architecture

- Backend: Node.js + Express, MongoDB, JWT Auth
  - Services: ML detection service, API logger, blockchain simulation, etc.
  - Routes: Authentication, Evidence, ML, Reports, Risk, Exports, Users, Admin, and more

- Frontend: React (Vite), Tailwind CSS
  - Pages: Home Dashboard, Admin, Investigator, Public
  - Components: EvidenceLibrary, ChainVisualizer, Timeline, ProtectedRoute

- Data Flow (high-level)
  1. User submits fraud report or requests ML analysis on a wallet address.
  2. Backend ML service fetches transaction data from external API (primary → fallback → cache → backup).
  3. ML detection scores risk and returns violation/recommended action.
  4. Evidence files can be uploaded and verified (hashing) and exported to PDF.
  5. All operations are logged; health and logs can be retrieved via endpoints.

---

## 4) Prerequisites

- Node.js (v16+ recommended)
- MongoDB running locally or accessible remotely
- Windows/macOS/Linux shell

Optional (for full feature set):
- Access to the external transaction data APIs on your network

---

## 5) Setup & Start

Backend
- Directory: Backend/
- Steps:
  1. Install dependencies:
     - npm install
  2. Configure environment: Backend/.env
     - Example values:
       - MONGO_URI=mongodb://localhost:27017/fraudDB
       - PORT=5050
       - ADMIN_EMAIL=aryangupta3103@gmail.com
       - ADMIN_PASSWORD=Aryan&Keval
       - JWT_SECRET=fraud-evidence-system-jwt-secret-key-2024
     - Other keys in .env are already present; adjust as needed.
  3. Start server:
     - node server.js
  4. On first start, default users are initialized (admin + investigator) after Mongo connects.

Frontend
- Directory: Frontend/
- Steps:
  1. Install dependencies:
     - npm install
  2. Configure environment: Frontend/.env
     - VITE_BACKEND_URL=http://localhost:5050
  3. Start dev server:
     - npm run dev
  4. Open http://localhost:3000

Default Access & Routes
- Admin route: http://localhost:3000/admin
  - Restricted to admin role or configured admin email in the route guard.
- Investigator route: http://localhost:3000/investigator
- Public route: http://localhost:3000/public
- Home dashboard (authenticated): http://localhost:3000

---

## 6) Authentication & RBAC

- JWT-based Authentication
  - Login endpoint issues JWT for subsequent requests in the Authorization header (Bearer token)

- Roles & Permissions
  - admin
    - Full permissions, including manageRoles, deleteEvidence, exportEvidence, userManagement
  - investigator
    - Evidence view, verify, share, export
  - public
    - Minimal/default access

- Route Guard
  - The /admin route on the frontend is protected
  - Only the admin role or configured admin email (Backend/.env ADMIN_EMAIL) can access

- Default Users (initialized at backend startup)
  - Admin: email from ADMIN_EMAIL; password from ADMIN_PASSWORD
  - Investigator: investigator1@example.com / SecureInv2024!

---

## 7) External Transaction Data Integration

- Primary Endpoint
  - http://192.168.0.80:8080/api/transaction-data
- Fallback Endpoint
  - http://192.168.0.68:8080/api/transaction-data

Behavior
- MLDetectionService attempts fetch from primary, then fallback
- If both fail:
  - Uses cached data if available
  - Otherwise falls back to local backup file: Backend/bhx_transactions_backup.json (if present)
- Logging records which endpoint was used and any fallback/cache activity

Manual Extraction Test
- File: Backend/test-transaction-data-extraction.js
- Run:
  - cd Backend
  - node test-transaction-data-extraction.js
- Output:
  - Console summary of records and a sample
  - Logs written to Backend/logs/api-transaction-data.log

---

## 8) Logging & Monitoring

- Logger Service: Backend/services/apiLogger.js
  - Log file path: Backend/logs/api-transaction-data.log
  - Entries include:
    - [INFO] API call initiated
    - [SUCCESS] Successful API call (HTTP status, response time, sample)
    - [ERROR] Failures with stack and response data
    - [CACHE] Cache hits/fallback cache usage
    - [FALLBACK] Backup or old-endpoint fallback
    - [ML] ML analysis requests
    - [HEALTH] Health checks
    - [API_ENDPOINT_USED] Explicit endpoint selection note

- Health & Log Endpoints (requires auth)
  - GET /api/ml/data-health
    - Returns status of external API, cache statistics, and log statistics
  - GET /api/ml/logs?lines=100
    - Recent log lines
  - GET /api/ml/logs?stats=true
    - Aggregated log statistics
  - DELETE /api/ml/logs
    - Clears log file and writes header

---

## 9) REST API Summary (Selected)

Authentication
- POST /api/auth/login
  - Body: { email, password }
  - Returns: { token, user, redirectUrl }
- GET /api/auth/verify
  - Validates JWT and returns user info
- POST /api/auth/register

Evidence
- POST /api/evidence/upload
- GET /api/evidence (pagination/filtering supported)
- GET /api/evidence/download/:id
- POST /api/evidence/verify/:id
- POST /api/evidence/share/:id
- GET /api/evidence/case/:caseId/report (PDF)

ML Analysis
- POST /api/ml/analyze
  - Body: { address, reason }
  - Returns analysis with risk score and details
- GET /api/ml/results
  - Query: risk_level, violation_type, limit, offset
- GET /api/ml/config
  - Returns detection rules and risk tier mapping
- GET /api/ml/data-health
  - Health + cache + log stats
- GET /api/ml/logs (and stats, see above)

Reports & Risk
- GET /api/reports (query by user)
- POST /api/reports
- GET /api/risk/:wallet

Admin & Users (auth/z required)
- GET/POST/DELETE /api/user-management/users
- GET /api/login-logs
- GET /api/admin/* (admin utilities)

Other
- GET /health, GET /status, GET /test (public) for service readiness

Note: Some endpoints are mocked or simplified for demonstration.

---

## 10) Evidence Library — Frontend UX

- Hero header with gradient and quick stats
- Polished search/filter/sort toolbar
- Cards with:
  - Risk accent bar (critical/high/medium/low)
  - Status/risk badges
  - Metadata: file hash, timestamp, size, uploader
  - Action buttons (Download, Verify, Chain, Share, Report)
  - Admin-only destructive actions (Delete)
- Role-based controls integrated (only permitted actions visible)

---

## 11) ML Detection Details

Patterns analyzed
- Rapid token dumping (time-window sequences)
- Large transfers (threshold-based)
- Flash loans (short-interval multi-step patterns)
- Phishing indicators (address patterns + reason keywords)
- Report history weighting

Risk scoring
- Weighted composite score:
  - Rapid Dumping: 30%
  - Large Amount: 25%
  - Flash Loan: 20%
  - Phishing: 15%
  - Report History: 10%

Recommended actions by score
- 0.0–0.39: no_action / low risk
- 0.4–0.59: monitor
- 0.6–0.79: investigate
- 0.8–1.0: freeze

---

## 12) Running Tests & Utilities

Transaction Data Extraction (manual)
- cd Backend
- node test-transaction-data-extraction.js

Ad-hoc Integration Tests (examples in Backend/)
- test-external-api.js: calls the external API endpoint directly
- test-api-integration.js: verifies pipeline + ML integration (example/demo)
- test-api-logging.js: demonstrates log writing/statistics utilities

Note: These scripts are designed for developer verification. They assume access to the configured network endpoints and a running backend where necessary.

---

## 13) Troubleshooting

- MongoDB connection errors
  - Ensure Mongo is running on localhost:27017 or change MONGO_URI accordingly
  - Verify firewall/port accessibility

- Login not working
  - Ensure backend is running and Frontend/.env points to the correct backend URL
  - Clear localStorage in the browser and retry
  - Check /api/auth/login response in DevTools Network

- Admin route blocked
  - Confirm your account has admin role; default admin is created at server startup from Backend/.env
  - The /admin route guard also allows the configured ADMIN_EMAIL

- External API unreachable
  - The system will fallback; check Backend/logs/api-transaction-data.log for [ERROR] and [FALLBACK]
  - Validate reachability of http://192.168.0.80:8080 and http://192.168.0.68:8080

- CORS / mixed content
  - Ensure consistent http/https usage and that backend has CORS enabled (it is)

- Ports in use
  - Frontend default: 3000 (Vite configured)
  - Backend default: 5050

---

## 14) Security Notes

- Keep JWT_SECRET private and strong
- Change default ADMIN_PASSWORD in production
- Consider IP whitelisting for /admin if exposed beyond trusted network
- Logs may contain metadata; store and rotate responsibly

---

## 15) Project Structure Reference

```
fraud-evidence-system/
├── Backend/
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── middleware/
│   ├── logs/
│   └── server.js
├── Frontend/
│   ├── src/
│   └── public/
└── Documentation/
    └── COMPLETE_SYSTEM_GUIDE.md  ← You are here
```

---

## 16) Example cURL

Login
```
curl -X POST http://localhost:5050/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"aryangupta3103@gmail.com","password":"Aryan&Keval"}'
```

Verify
```
curl -X GET http://localhost:5050/api/auth/verify \
  -H "Authorization: Bearer YOUR_JWT"
```

ML Analyze
```
curl -X POST http://localhost:5050/api/ml/analyze \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{"address":"0xabc...","reason":"suspicious behavior"}'
```

Evidence List (auth required)
```
curl -X GET 'http://localhost:5050/api/evidence?page=1&limit=20' \
  -H "Authorization: Bearer YOUR_JWT"
```

Logs (last 100 lines)
```
curl -X GET 'http://localhost:5050/api/ml/logs?lines=100' \
  -H "Authorization: Bearer YOUR_JWT"
```

Health
```
curl -X GET http://localhost:5050/api/ml/data-health \
  -H "Authorization: Bearer YOUR_JWT"
```

---

## 17) Changelog (Key Migration)

- External Transaction Data API updated
  - Primary: 192.168.0.80 → active
  - Fallback: 192.168.0.68 → retained for reliability
  - Logging enhanced to record endpoint used

---

## 18) License & Contact

- License: MIT (see repository LICENSE if provided)
- Contact: See repository README for maintainer details

---

End of Complete System Guide.
