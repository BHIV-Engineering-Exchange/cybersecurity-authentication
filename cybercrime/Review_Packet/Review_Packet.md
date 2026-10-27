
---

## What is this system?

A cybercrime investigation portal for law-enforcement investigators. It lets investigators file complaints against suspicious crypto wallets, upload evidence files, run AI-based risk analysis, and communicate with a superadmin. Everything is logged in an immutable audit trail. Think: case management + evidence room + AI fraud detector, all in one internal web application.

---

## Who are the users and what can each role do?

**Superadmin:**
- Sees everything (all complaints, evidence, reports, investigators)
- Approves or rejects investigator access requests
- Can freeze/unfreeze wallets
- Sends broadcasts and direct messages
- Views threat map, risk trends, activity logs

**Investigator:**
- Files complaints against wallets
- Uploads evidence files
- Runs AI incident reports
- Manages their watchlist
- Messages superadmin

There is no self-registration for investigators. They must request access, and a superadmin must approve it.

---

## How does flagging / complaint filing work?

An investigator goes to the "File Complaint" section and submits a form with: the suspicious wallet address, incident description, officer contact details, and their current location. Optionally, they can link evidence IDs.

The complaint is saved to the `Complaint` table. It appears immediately in the superadmin's complaints view and on the threat map (using the investigator's location coordinates).

API: `POST /api/v1/complaints/`

There is no auto-flag based on transactions. All flagging is manual by an investigator.

---

## How does evidence work?

Evidence is uploaded as a file via `POST /api/v1/evidence/` (multipart form-data). The backend:
1. Receives the file
2. Computes SHA-256 hash
3. Saves the file to `backend/evidence_storage/`
4. Stores metadata (path, size, type, hash, wallet ID) in the `Evidence` table

Evidence is **immutable by design** (`immutable: true`). There is no delete endpoint for evidence. The hash is used to verify file integrity.

The `anchor_status` field exists for future blockchain anchoring but currently stays `"pending"` — it is not functional yet.

---

## How does escalation happen?

There is **no automated escalation trigger** in the current system. Escalation is 100% manual:
- Superadmin sees risk scores and incident reports in their dashboard
- They decide to freeze a wallet via `POST /api/v1/wallets/{address}/freeze`
- The freeze is logged in both the WalletState table and AuditLog

**Important:** No email or alert is fired automatically when risk is high. The superadmin must proactively check. This is a known gap.

---

## How is risk calculated?

Two ways:

**Manual:** An investigator or the system creates a `RiskScore` record with a category, numeric score (0–100), and level (low/medium/high/critical).

**AI-generated:** When an investigator runs an Incident Report (`POST /api/v1/reports/incident`), the backend calls OpenRouter LLM (or a rule-based fallback) and returns a `risk_score` (float) and `risk_level` string. The system also detects patterns like `rapid_outflow`, `layering`, `no_return_transactions`.

The AI does **not** automatically trigger any action based on the risk score. It produces a report that a human reviews.

---

## How is data stored?

- **Database:** SQLite locally (file: `backend/investigation.db`) or PostgreSQL in production
- **Evidence files:** Stored on disk at `backend/evidence_storage/`
- **ORM:** SQLAlchemy
- **No MongoDB.** Despite common patterns in similar projects, this system uses a relational SQL DB.
- **RL engine Q-table:** Stored in memory only. Resets on server restart. Not persisted to DB.

---

## What breaks most often?

1. **`evidence_storage/` directory missing** → evidence uploads return 500
2. **`.env` file missing or incomplete** → backend won't start
3. **CORS errors** → frontend can't reach backend (usually after deploy to new domain)
4. **JWT token expired** → user gets 401, must re-login (no refresh token)
5. **Evidence files lost on Render free tier** → disk is ephemeral, files gone after redeploy
6. **RL engine state lost on restart** → Q-table is in memory only

---

## How do I debug when something breaks?

**Backend errors:**
- Check terminal where `python main.py` is running — FastAPI/Uvicorn prints all exceptions
- Check `GET /api/v1/logs/` for recent audit log entries
- Check `GET /api/v1/health` to confirm DB is connected

**Frontend errors:**
- Open browser dev tools → Network tab → look for failed API calls
- Check the response status and body on 4xx/5xx errors
- CORS errors will appear as network failures with no response body

**Database directly (SQLite):**
```bash
cd backend
sqlite3 investigation.db
.tables          -- list all tables
SELECT * FROM users LIMIT 5;
SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 20;
.quit
```

**Test a specific endpoint:**
```bash
# Login first:
curl -X POST http://localhost:3000/api/v1/auth/login \
  -d "username=admin@cybercrime.in&password=Admin@123"

# Then use the token:
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/v1/cases/
```

Or use the Swagger UI at `http://localhost:3000/api/docs` — it has interactive testing with auth support.

---

## Where should I NOT make changes?

| Area | Why |
|---|---|
| `AuditLog` table | Never delete or modify audit logs — forensic chain of custody |
| `Evidence` records with `immutable: true` | Forensic integrity — do not add delete endpoints |
| `auth.py` password hashing | Only change if you fully understand bcrypt implications |
| `SECRET_KEY` in production | Changing it invalidates all active user sessions |
| `hash` field on Evidence | Never allow client to supply this — always server-computed |
| RL engine Q-table structure | Changes break backward compatibility of trained models |
| `anchor_status` logic | Currently placeholder — don't add logic that depends on `"anchored"` state without implementing the full anchoring flow |

---

## What is safe to modify?

| Area | Notes |
|---|---|
| Frontend UI components | Safe — no business logic lives there |
| Message content / email templates | Safe — cosmetic only |
| `OPENROUTER_MODEL` env var | Safe — just changes which LLM is used |
| Adding new optional fields to models | Safe if you add DB migration alongside |
| Risk score categories and levels | Safe — they're just strings |
| Watchlist feature | Low-risk, isolated |
| Superadmin dashboard panels | Safe — read-only views |
| Adding new API endpoints | Safe as long as you add audit logging |

---

## What is the entry point for the backend?

`backend/main.py` — this file creates the FastAPI app, registers all routers (from `backend/routers/`), sets up CORS, and starts Uvicorn.

---

## What is the entry point for the frontend?

`frontend/src/main.tsx` (React) → `frontend/src/App.tsx` (routing + role-based page loading).

---

## Is there a Postman collection?

Yes. Import `postman_collection.json` from the repo root into Postman. It has all endpoints pre-configured.

---

## Is there a complete API spec?

Yes. `openapi.yaml` in the repo root is the full OpenAPI 3.0 spec. You can:
- View it at `http://localhost:3000/api/docs` (Swagger UI)
- Import it into Postman, Insomnia, or any API client

---

## How does the RL (Reinforcement Learning) engine work?

It's a Q-learning agent that classifies transactions as fraud or normal. You train it via `POST /api/v1/rl-engine/train`, run predictions via `POST /api/v1/rl-engine/predict`, and give it feedback via `POST /api/v1/rl-engine/feedback` (which updates Q-values).

**Critical limitation:** The Q-table is in memory. Every server restart means all training is lost. In production, you'd need to serialize the Q-table to DB or a file.

---

## How does the ML fraud model work?

There's a trained model (likely scikit-learn) on the `FraudTransaction` dataset. You check its status with `GET /api/v1/fraud-predictions/model-status` and run predictions with `POST /api/v1/fraud-predictions/predict`. The frontend has a side-by-side comparison view for ML vs RL predictions.

---

## How do investigators get created?

1. Investigator visits the frontend and clicks "REQUEST INVESTIGATOR ACCESS"
2. Submits their name, email, and desired password
3. Superadmin sees this in "Access Requests" panel
4. Superadmin approves → backend automatically creates a User with `role="investigator"`
5. Investigator can now log in

There is no direct admin create-user API (only the access request flow).

---

## How are emails sent?

Via Brevo HTTPS API if `BREVO_API_KEY` is set. The system sends welcome emails on access approval and optionally on other events. If `BREVO_API_KEY` is not set, emails are silently skipped — they are not blocking for any feature.

---

## What does the Threat Map show?

It's an interactive world map on the superadmin dashboard that plots complaint locations. Each dot represents a filed complaint, positioned using `investigator_location_latitude` and `investigator_location_longitude` from the Complaint record.

---

## Where is the system deployed?

On Render.com. See `render.yaml` for service configuration and `RENDER_DEPLOYMENT.md` for the full deployment guide.
