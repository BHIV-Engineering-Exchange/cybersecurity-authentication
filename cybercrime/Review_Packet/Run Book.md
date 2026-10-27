# RUNBOOK.md
> How to run, deploy, configure, and test this system end-to-end.
> Audience: New developer on day one.

---

## Prerequisites

| Tool | Version | Check |
|---|---|---|
| Python | 3.11 exactly | `python --version` |
| pip | Latest | `pip --version` |
| Node.js | 18+ | `node --version` |
| npm | 9+ | `npm --version` |
| Git | Any | `git --version` |

---

## Step 1: Clone the Repo

```bash
git clone https://github.com/yashikart/cybercrime.git
cd cybercrime
```

---

## Step 2: Set Up Backend

```bash
cd backend

# Create and activate virtual environment
python -m venv venv

# On Windows:
venv\Scripts\activate

# On Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

---

## Step 3: Create .env File

Create `backend/.env` with the following:

```env
# --- REQUIRED ---
DATABASE_URL=sqlite:///./investigation.db
SECRET_KEY=your-very-secret-key-change-this-in-production

# --- OPTIONAL: AI Analysis ---
OPENROUTER_API_KEY=sk-or-xxxxxxxxxxxx
OPENROUTER_MODEL=qwen/qwen-2-7b-instruct:free

# --- OPTIONAL: Email via Brevo ---
BREVO_API_KEY=xkeysib-xxxxxxxxxxxxxxxx
MAIL_FROM=noreply@yourcybercrime.in
MAIL_FROM_NAME=Cybercrime Portal

# --- OPTIONAL: SMTP (fallback if Brevo not set) ---
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your@gmail.com
MAIL_PASSWORD=yourapppassword
```

**Minimum required to start:** `DATABASE_URL` and `SECRET_KEY`.

Everything else degrades gracefully if missing (AI uses fallback, emails are skipped).

---

## Step 4: Run Backend

```bash
# From backend/ directory, with venv activated:
python main.py
```

**Expected output:**
```
INFO:     Started server process [12345]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:3000 (Press CTRL+C to quit)
```

Backend is live at: **http://localhost:3000**

Swagger UI at: **http://localhost:3000/api/docs**

---

## Step 5: Create evidence_storage Directory

```bash
# From backend/ directory:
mkdir -p evidence_storage
```

This must exist before any evidence uploads.

---

## Step 6: Set Up Frontend

```bash
cd ../frontend
npm install
```

---

## Step 7: Configure Frontend API URL

The frontend API base URL should point to the backend. In local dev this is `http://localhost:3000/api/v1`.

Check `frontend/src/api/` or a config file like `frontend/.env` for:
```env
VITE_API_BASE_URL=http://localhost:3000/api/v1
```

If deploying to production, update this to your backend's deployed URL.

---

## Step 8: Run Frontend

```bash
# From frontend/ directory:
npm run dev
```

Frontend live at: **http://localhost:5173**

---

## Step 9: Create First Superadmin

The system has no registration UI for superadmin. Create one directly in the DB or via a seed script.

**Option A — Using Python shell:**
```python
# From backend/ with venv active:
python -c "
from database import SessionLocal
from models import User
from auth import get_password_hash
db = SessionLocal()
admin = User(
    full_name='Super Admin',
    email='admin@cybercrime.in',
    hashed_password=get_password_hash('Admin@123'),
    role='superadmin',
    is_active=True
)
db.add(admin)
db.commit()
print('Superadmin created.')
db.close()
"
```

**Option B — Check if there is a `seed.py` or `create_admin.py` in `backend/`.**

---

## Step 10: End-to-End Test (Manual)

Follow this sequence to verify the full system works:

1. **Open frontend** → http://localhost:5173
2. **Click "SUPERADMIN ACCESS"** → login with admin credentials
3. **Open "Access Requests"** in superadmin sidebar
4. **In a new tab**, open http://localhost:5173 → click "INVESTIGATOR ACCESS" → click "REQUEST ACCESS" → fill form → submit
5. **Back in superadmin tab** → refresh Access Requests → approve the new request
6. **Login as investigator** (use the email you registered)
7. **File a complaint** (any wallet address, fill all fields)
8. **Upload evidence** (any file)
9. **Run AI analysis** (Incident Report section, submit with same wallet)
10. **Superadmin dashboard** → verify complaint appears on threat map, evidence in library, report in AI panel
11. **Freeze a wallet** from superadmin escalations view
12. **Send a message** from superadmin to investigator
13. **Check audit logs** → all actions should be logged

---

## Environment Variables Reference

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | YES | none | DB connection string |
| `SECRET_KEY` | YES | none | JWT signing secret |
| `OPENROUTER_API_KEY` | No | none | LLM for AI reports |
| `OPENROUTER_MODEL` | No | `qwen/qwen-2-7b-instruct:free` | Model to use |
| `BREVO_API_KEY` | No | none | Transactional email |
| `MAIL_FROM` | No | none | Sender email address |
| `MAIL_FROM_NAME` | No | `Cybercrime Portal` | Sender display name |
| `MAIL_SERVER` | No | none | SMTP server |
| `MAIL_PORT` | No | `587` | SMTP port |
| `MAIL_USERNAME` | No | none | SMTP username |
| `MAIL_PASSWORD` | No | none | SMTP password |

---

## Docker Compose (Alternative)

To run both frontend and backend together:

```bash
# From repo root:
docker-compose -f docker-compose.fullstack.yml up --build
```

This will start both services. Check `docker-compose.fullstack.yml` for mapped ports.

---

## Deployment on Render.com

See `RENDER_DEPLOYMENT.md` and `render.yaml` for full Render configuration.

**Key points:**
- Backend deploys as a Web Service (Python)
- Frontend deploys as a Static Site (Vite build)
- Set all env vars in Render dashboard under "Environment"
- Use PostgreSQL addon for production DB (not SQLite)
- Evidence files are NOT persistent on Render free tier — use cloud storage for production

---

## Health Check

```bash
curl http://localhost:3000/health
```

Expected:
```json
{"status": "healthy", "database": "connected", "version": "1.0.0"}
```

---

## Common Issues on First Run

| Problem | Fix |
|---|---|
| `ModuleNotFoundError` | `pip install -r requirements.txt` again |
| `Port 3000 already in use` | Kill the occupying process |
| Frontend shows blank page | Check browser console for CORS or network errors |
| Login fails with valid credentials | Superadmin account may not be created yet |
| Evidence upload gives 500 | `evidence_storage/` directory missing |
| AI reports return template text | `OPENROUTER_API_KEY` not set — this is normal |

---

## Stopping the System

- Backend: `CTRL+C` in backend terminal
- Frontend: `CTRL+C` in frontend terminal
- Docker: `docker-compose -f docker-compose.fullstack.yml down`
