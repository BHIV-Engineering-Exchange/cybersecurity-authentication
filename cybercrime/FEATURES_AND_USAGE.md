## Cybercrime Portal – Features & Usage Guide

### Overview
The Cybercrime Portal is a complete investigation platform for **superadmins** and **investigators**.  
It combines case management, evidence handling, AI‑based fraud analysis, investigator monitoring, and secure communication in a single system.

---

## Roles

### Superadmin
- Full control over dashboards, investigators, AI features, and system configuration.
- Can view and manage all complaints, evidence, incident reports, watchlists, and investigator activity.

### Investigator
- Files complaints, uploads evidence, runs AI analysis, manages watchlists, and tracks their own activity and status.
- Communicates with superadmin via the internal messaging system.

---

## Superadmin – Main Features

### Dashboard
- Real‑time overview of the investigation system:
  - Total complaints, active cases, investigators, and evidence items.
  - **Threat Map** showing complaint locations (city/country/coordinates) on an interactive world map.
  - **Activity Feed** showing recent actions (complaints filed, evidence uploaded, wallets frozen/unfrozen, AI reports).
  - **Notification Center** with important alerts (high‑risk cases, AI findings, workflow events).
  - **Risk Trends** (recent AI analysis and case trends over time).
  - **Smart Case / Wallet Queue** listing currently important wallets/cases with AI‑based prioritization.

### Investigators Management
- View all investigators (excluding the superadmin account).
- For each investigator:
  - Email, full name, active status.
  - Location (city, country, coordinates, IP) if captured.
  - Availability status (available, busy, away, offline).
  - Creation and last‑activity timestamps.

### Investigator Activity / Details
- Unified view in `InvestigatorActivityContent`:
  - **Dashboard tab** – high‑level stats and latest activity.
  - **Logs tab** – audit logs filtered by investigator, action type, and date range; exportable to CSV.
  - **Details tab** – sub‑tabs for:
    - Overview (profile + status).
    - Evidence linked to the investigator.
    - Complaints they have filed.
    - AI incident reports they triggered.
    - Watchlist entries they created.

### Status & Health
- Per‑investigator health status:
  - Online/offline, last login, session duration.
  - Activity score and login frequency.
  - Password and 2FA status.
  - Current geographic location (if available).
- Auto‑refresh option for continuous monitoring.

### Communication Hub
- Send **direct messages** to specific investigators.
- Send **broadcast announcements** to all investigators.
- View message history, timestamps, and read states.
- Investigators can **reply** from their dashboard, and replies are routed back to superadmin.

### Escalations
- View high‑risk / priority cases and wallet statuses.
- See lists of:
  - **Frozen wallets** (with reason, actor, timestamp).
  - **Unfrozen wallets** (with reason, actor, timestamp).
- Helps track enforcement actions and audit decisions.

### Evidence Library
- Global view of all evidence files submitted by investigators:
  - Wallet address, investigator name/email.
  - File hash, type, size, upload date.
  - View/download buttons (served from secure evidence storage).
- Older entries without stored file paths are marked as “file not stored”.
- Superadmin can **view and download**, but **not delete** investigator evidence.

### Complaints View
- Table of all filed complaints:
  - Complaint ID, wallet address, status, date.
  - Investigator (name instead of generic “officer”).
  - Investigator location and officer contact details.
- Clicking a row opens a **detail modal** with all fields:
  - Incident description, internal notes, location, linked evidence IDs, etc.

### AI Fraud Detection (ML + RL)
- **ML Model tab**:
  - Works with the `FraudTransaction` dataset (transaction‑level fraud vs normal).
  - Filters by transaction type, name, step, fraud label.
  - Calls `/api/v1/fraud-predictions` endpoints to check model status and predictions.
- **RL Engine tab**:
  - Q‑learning based agent that learns to classify fraud vs normal over time.
  - Endpoints under `/api/v1/rl-engine` for training, predicting, and fetching performance.
- **Compare tab**:
  - Side‑by‑side view of ML vs RL metrics.

### Access Requests
- Page to manage investigator access requests:
  - Shows name, email, reason, status, date.
  - Filter by status (all / pending / approved / rejected).
  - **Review modal** to approve or reject a request, with optional rejection reason.
  - On approval, a new **investigator user account** is automatically created.

---

## Investigator – Main Features

### Incident Report & AI Analysis
- Investigators open **Incident Report** section in their dashboard.
- Provide wallet address and description of suspicious activity.
- Click **“Submit Report & Analyze with AI”**:
  - Backend generates transaction patterns, graph data, timeline, and system conclusion.
  - Uses OpenRouter AI if `OPENROUTER_API_KEY` is set, otherwise uses a safe template.
  - Stores incident report in the database; appears in:
    - Investigator’s AI history.
    - Superadmin “Recent AI Analysis” panel.

### Evidence Upload & Library
- Upload evidence files (PDFs, images, archives, etc.) related to cases/wallets.
- Files are stored under `evidence_storage/` with metadata in the DB:
  - `file_path`, `file_size`, `file_type`.
- Investigators can view/download their own evidence in their dashboard.

### File Complaint
- Formal complaint form:
  - Wallet address, detailed description.
  - Officer designation, contact information.
  - Internal notes and linked evidence.
  - Investigator location (city/country/coordinates/IP), including auto‑detect support.
- Complaints are saved for superadmin review and show up on:
  - Superadmin **Complaints View**.
  - **Threat Map** as complaint locations.

### AI Analysis History
- View all incident reports created by the investigator:
  - Risk level, score, detected patterns, status, timestamp.
  - Links into full report detail.

### Watchlist & Monitoring
- Add wallets to a watchlist for ongoing monitoring.
- Superadmin can also see watchlisted wallets to guide escalations and AI focus.

### Messages & Notifications
- “Messages” section in the investigator dashboard:
  - Shows superadmin broadcasts and direct messages.
  - Investigators can reply; replies are sent back via `/api/v1/messages` endpoints.
- **Notification bell** in the header:
  - Shows unread counts and recent alerts.
  - Fixed overlap issues using React Portals and high `z-index`.

### My Dashboard (Self‑Service)
- Personal analytics:
  - Total complaints, AI reports, evidence, unread messages.
  - Recent actions and activity timeline.
  - Auto‑refreshing summary from `/api/v1/investigators/{id}/dashboard`.

### Status Update
- Set availability: **Available / Busy / Away / Offline**.
- Uses `PATCH /api/v1/investigators/{id}/status`:
  - Updates `availability_status` and `status_updated_at` on the `User` model.
- Superadmin sees this in **Status & Health** and activity views.

---

## Access & Onboarding Flow

1. **Superadmin Login**
   - Use the Admin login from the landing page.
   - On successful login, you are routed to the superadmin dashboard.

2. **Investigator Access Request**
   - On the investigator login page, click **“REQUEST INVESTIGATOR ACCESS”**.
   - Fill in:
     - Full name.
     - Email address (this becomes the login identifier).
     - Reason (optional description of why access is needed).

3. **Superadmin Approval**
   - In the superadmin dashboard, open **Access Requests** from the sidebar.
   - Review pending requests:
     - See name, email, reason, and requested date.
   - Approve or reject:
     - Approve → investigator account is created automatically.
     - Reject → optionally store a rejection reason.

4. **Investigator Login**
   - After approval, the investigator logs in with their email and password (or a bootstrapped password workflow).
   - They are taken to the investigator dashboard with access to all assigned features.

---

## Running the System Locally

### Backend (FastAPI)
- Requirements:
  - Python 3.11 (matching the existing `venv`).
- Typical steps:
  - Activate virtualenv (if not already active):
    - Windows:
      - `cd backend`
      - `..\venv\Scripts\activate` (or use the existing `venv` in the project root).
  - Install dependencies:
    - `pip install -r requirements.txt`
  - Run the API server:
    - `python main.py`
- Default:
  - API base URL: `http://localhost:3000/api/v1`
  - Swagger UI: `http://localhost:3000/api/docs`

### Frontend (React + Vite)
- Requirements:
  - Node.js + npm.
- Typical steps:
  - `cd frontend`
  - `npm install`
  - `npm run dev`
- Default:
  - Frontend URL: `http://localhost:5173`
  - Landing page gives you:
    - **SUPERADMIN ACCESS** (admin login).
    - **INVESTIGATOR ACCESS** (investigator login).

---

## Configuration & Environment

Key backend environment variables (via `.env` or hosting provider):

- **Database**
  - `DATABASE_URL` – e.g. `sqlite:///./investigation.db` (default) or Postgres URL.

- **Security**
  - `SECRET_KEY` – JWT signing key (change from default in production).

- **AI (OpenRouter)**
  - `OPENROUTER_API_KEY` – optional; if set, AI analysis uses OpenRouter.
  - `OPENROUTER_MODEL` – model name (defaults to a free Qwen model).

- **Email (Brevo)**
  - `MAIL_FROM`, `MAIL_FROM_NAME` – sender identity.
  - `BREVO_API_KEY` – **preferred**: xkeysib‑style HTTPS API key.
    - When set, emails are sent via `https://api.brevo.com/v3/smtp/email`.
  - `MAIL_SERVER`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD` – SMTP (optional, mostly for local/dev).

- **CORS**
  - `CORS_ORIGINS` is pre‑configured in code for `http://localhost:5173` and `http://localhost:3000`.

---

## Notes

- This document is the **single source of truth** for:
  - What features exist.
  - Which role can use them.
  - How the main flows (complaints, evidence, AI, messaging, access requests) work.
- For exact request/response formats, always check the FastAPI docs at `/api/docs`.
