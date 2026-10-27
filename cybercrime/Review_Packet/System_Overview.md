# SYSTEM_OVERVIEW.md
> Cybercrime Investigation Portal — Complete System Overview
> Audience: Any new developer with zero prior context

---

## 1. What Is This System?

This is a **Cybercrime Investigation Portal** — a web application that lets law-enforcement investigators and superadmins investigate suspicious crypto wallet activity and file cybercrime complaints.

Think of it as a case-management + evidence-room + AI-fraud-analysis tool, all in one place.

**In plain words:**
- A suspicious crypto wallet is identified.
- An investigator logs in, submits a complaint, uploads proof files (evidence), and runs an AI analysis.
- The AI scores risk, detects transaction patterns, and produces an incident report.
- High-risk cases are escalated. Wallets can be frozen.
- A superadmin monitors everything, manages investigators, and reviews access requests.
- Every action is logged in an immutable audit trail.

---

## 2. Who Uses It?

| Role | What they do |
|---|---|
| **Superadmin** | Monitors all cases, manages investigators, approves/rejects access, views escalations, sends broadcasts |
| **Investigator** | Files complaints, uploads evidence, runs AI analysis, manages watchlists, messages superadmin |

There is no "public user" role. The system is internal only.

---

## 3. Technology Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.11, FastAPI |
| Database | SQLite (default local) / PostgreSQL (production) via SQLAlchemy ORM |
| Auth | JWT (Bearer tokens), bcrypt password hashing |
| Frontend | React + Vite + TypeScript |
| AI Analysis | OpenRouter API (LLM, optional) — falls back to rule-based templates |
| Fraud Detection | Custom ML model + Q-learning RL engine (both in Python backend) |
| Email | Brevo HTTPS API (preferred) or SMTP fallback |
| Deployment | Render.com (see `render.yaml` and `RENDER_DEPLOYMENT.md`) |
| Container | Docker Compose (see `docker-compose.fullstack.yml`) |

---

## 4. Repository Layout

```
cybercrime/
├── backend/              ← FastAPI Python app
│   ├── main.py           ← App entry point, registers all routers
│   ├── models.py         ← SQLAlchemy DB models (ALL tables live here)
│   ├── database.py       ← DB connection, session factory
│   ├── auth.py           ← JWT creation & verification, password hashing
│   ├── routers/          ← One file per feature domain
│   │   ├── auth.py       ← Login, password reset, access requests
│   │   ├── cases.py      ← Case CRUD
│   │   ├── evidence.py   ← Evidence upload & retrieval
│   │   ├── complaints.py ← Complaint filing & management
│   │   ├── risk.py       ← Risk score creation & retrieval
│   │   ├── reports.py    ← Incident report generation (AI)
│   │   ├── wallets.py    ← Wallet freeze/unfreeze, watchlist
│   │   ├── investigators.py ← Investigator management, status
│   │   ├── messages.py   ← Internal messaging
│   │   ├── logs.py       ← Audit log retrieval
│   │   ├── fraud.py      ← ML fraud prediction
│   │   └── rl_engine.py  ← RL-based fraud agent
│   ├── evidence_storage/ ← Uploaded evidence files live here (local)
│   └── requirements.txt
│
├── frontend/             ← React + Vite + TypeScript app
│   ├── src/
│   │   ├── main.tsx      ← React entry point
│   │   ├── App.tsx       ← Router + role-based routing
│   │   ├── pages/        ← Superadmin & Investigator page components
│   │   ├── components/   ← Reusable UI components
│   │   └── api/          ← Axios API call wrappers
│   └── package.json
│
├── openapi.yaml          ← Full OpenAPI 3.0 spec (auto-generated from FastAPI)
├── postman_collection.json ← Importable Postman collection
├── rbac-permissions.json ← Role permission matrix
├── render.yaml           ← Render.com deployment config
├── docker-compose.fullstack.yml ← Full-stack Docker Compose
└── FEATURES_AND_USAGE.md ← Feature guide (role-by-role)
```

---

## 5. The Core Flow (End-to-End)

```
[Investigator logs in]
        |
        v
[Files a Complaint]
  wallet_address + incident_description + officer details + location
        |
        v
[Uploads Evidence]
  File → SHA-256 hash computed → stored in evidence_storage/ → metadata in DB
        |
        v
[Runs Incident Report (AI)]
  wallet_address → backend fetches/synthesizes transaction data →
  OpenRouter LLM (or rule template) → risk_score + risk_level + patterns + graph_data
        |
        v
[Risk Score saved] ← category, score (0-100), level (low/medium/high/critical)
        |
        v
[If HIGH / CRITICAL → Escalation path]
  Superadmin sees in dashboard → may freeze wallet
        |
        v
[Wallet Freeze]
  freeze_reason + frozen_by → wallet marked frozen → audit log entry
        |
        v
[Audit Log]
  Every action (login, complaint filed, evidence uploaded, wallet frozen, etc.)
  automatically written to AuditLog table
        |
        v
[Superadmin reviews everything via dashboard]
  Threat map, activity feed, risk trends, investigator health, message center
```

---

## 6. What Each Major Module Does

### `auth` router
Handles login (JWT issuance), password reset, access requests (investigator onboarding), and email sending (welcome emails via Brevo).

### `cases` router
CRUD for investigation cases. A Case is a container that groups complaints and evidence under one `case_id` string (e.g. `CASE-2024-001`).

### `evidence` router
File upload endpoint. Accepts multipart/form-data, computes SHA-256 hash, stores file in `evidence_storage/`, records metadata (path, size, type, hash, immutability flag) in DB.

### `complaints` router
Investigator-filed formal complaints against a wallet. Captures officer info, location, incident description, linked evidence IDs. These appear on the superadmin threat map.

### `risk` router
Creates and retrieves `RiskScore` records. Each score has a category (e.g. "transaction_pattern"), a numeric score (0-100), and a level string (low/medium/high/critical).

### `reports` router
Generates AI-powered incident reports. Takes a wallet address and description, calls OpenRouter or a rule-based fallback, and returns risk_score, patterns, graph_data (transaction graph edges), timeline, and a system_conclusion. Persists the report in DB.

### `wallets` router
Freeze/unfreeze wallets. Maintains watchlist. Wallet state (frozen/unfrozen) is tracked with reason, actor, and timestamp.

### `investigators` router
Manages investigator user accounts. Returns investigator dashboards, availability status updates (`PATCH /investigators/{id}/status`), and per-investigator stats (complaints, evidence, reports).

### `messages` router
Internal messaging between superadmin and investigators. Supports direct messages and broadcast announcements. Tracks `is_read` and `read_at`.

### `logs` router
Read-only access to the `AuditLog` table. Filterable by user, action type, date range. Exportable to CSV from the frontend.

### `fraud` router
ML-based fraud prediction using a trained model on the `FraudTransaction` dataset. Returns fraud probability for a given transaction.

### `rl_engine` router
Q-learning agent that learns from feedback over time. Endpoints for training (`/rl-engine/train`), prediction (`/rl-engine/predict`), and performance metrics.

---

## 7. What This System Does NOT Do

- Does NOT integrate with any real blockchain API (wallet data is synthetic / manually entered)
- Does NOT have a public-facing complaint portal (citizens cannot file reports; only investigators)
- Does NOT send SMS or push notifications
- Does NOT have multi-factor authentication (2FA) implemented (status field exists in DB but logic is not enforced)
- Does NOT support file deletion of evidence (by design — evidence is immutable)
- Does NOT have a payment system or billing
- Does NOT enforce rate limiting on API endpoints (as of current version)
- Does NOT support multi-tenancy (single organization deployment)

---

## 8. Persons Responsible

| Area | Person |
|---|---|
| Backend understanding & enforcement safety layer | Prakash Yadav |
| Storage & artifact integrity (BHIV Bucket) | Ashmit |
| Orchestration & enforcement integration (BHIV Core) | Raj Prajapati |
| System author / original developer | Yashika Tirkey |

---

## 9. Key URLs (Local Dev)

| Service | URL |
|---|---|
| Backend API | http://localhost:3000/api/v1 |
| Swagger/OpenAPI Docs | http://localhost:3000/api/docs |
| Frontend | http://localhost:5173 |

---

*Last updated: May 2026. For any gaps, refer to `openapi.yaml` (ground truth for API contracts) and `FEATURES_AND_USAGE.md` (ground truth for feature scope).*
