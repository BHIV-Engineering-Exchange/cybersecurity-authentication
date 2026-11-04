# DEP

The Task 1 brief lists `/DEP/` as a required folder, but does not say what it must contain. Its meaning is
**UNKNOWN**, and the question is open with the integration lead. Until it is answered, this folder holds the
deployment checklist from the brief's section H, with the current status of each item.

| Section H item | Status (2026-11-04) | Where |
|---|---|---|
| VM deployment location/reference | BLOCKED-EXTERNAL: no VM reference has been provided to this work (UNKNOWN; ask Rajaryan) | - |
| Environment requirements | Python 3.12; SQL database (SQLite default); optional MongoDB; outbound HTTP to VAJRA/TANTRA | README.md, HANDOVER.md section 4 |
| Dependency installation | `cybercrime/backend/requirements.txt` without the `TTS` line (exact commands in README.md) | README.md |
| Startup command | `python -m uvicorn main:app --host 0.0.0.0 --port 3000` (cwd `cybercrime/backend`) | README.md |
| Health endpoint | `GET /health`, `GET /api/v1/system/health` | INTEGRATION.md section 4 |
| Service status | Local runs only; start-up timings in `evidence_packet/deployment_proof/` | evidence_packet |
| Logs | JSON lines on stdout (`request.completed`, `rbac.deny`, `bhiv_runtime.*`, canonical events) | evidence_packet/runtime_logs |
| Configuration requirements | `cybercrime/backend/env.template` (no secrets committed) | env.template |
| Restart/recovery procedure | Restart the process; revocations persist in the database (verified by check S7-01) | TEST_REPORT.md |
| Deployment proof | Local only (OFFLINE-VERIFIED); VM proof pending | evidence_packet/deployment_proof |
