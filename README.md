# BHIV Cybersecurity module (cybersecurity-authentication)

The Cybersecurity capability for the BHIV/BHQ ecosystem: authentication, authorization and access-control
decisions, security audit evidence, investigation services, and bounded integration with **VAJRA** (identity,
permission and trust) and **TANTRA** (contracts, governed runtime, evidence ledger).

**Start here:** [REVIEW_INDEX.md](REVIEW_INDEX.md) lists every review document in reading order.
**Current verified state:** [evidence_packet/test_results/PROOF_MATRIX.md](evidence_packet/test_results/PROOF_MATRIX.md).

## What is in this repository

| Path | What it is |
|---|---|
| `cybercrime/backend/` | The module's runtime: FastAPI service (auth, RBAC, `/api/v1/authz/check`, `/api/v1/access/revoke`, `/api/v1/protected/access`, investigation APIs, health). |
| `cybercrime/backend/app/core/bhiv_runtime.py` | Bridge to VAJRA (authority read, evidence record) and TANTRA (contract gate, karma ledger, replay check). Disabled until configured. |
| `cybercrime/rbac-permissions.json` | Role-based access policy (deny by default). |
| `cybercrime/openapi.yaml` | Frozen API contract (checked against the live routes at startup). |
| `cybercrime/frontend/` | React investigator dashboard. |
| `fraud-evidence-system/` | Node.js evidence backend and React UI (separate subsystem with its own tests). |
| `verification/` | Independent verification harness: runs the real processes and records evidence. |
| `evidence_packet/` | Evidence from the latest verification run (logs, API samples, results, screenshots, replay). |
| `review_packets/` | REVIEW_PACKET and the EOD report for each review. |
| `DEP/` | Deployment folder required by the task brief (contents not yet defined; see `DEP/README.md`). |
| `PHASE_*.md` | Historical phase reports (Phases 1-4, October 2026). |

## Run the API locally

```bash
cd cybercrime/backend
python -m venv .venv && . .venv/bin/activate          # Windows: .venv\Scripts\activate
grep -v "^TTS" requirements.txt > requirements-no-tts.txt   # what the verification runs used (see note)
pip install -r requirements-no-tts.txt
cp env.template .env                                  # set SECRET_KEY; leave integration URLs empty to keep them off
python -m uvicorn main:app --host 127.0.0.1 --port 3000
curl http://127.0.0.1:3000/health
curl http://127.0.0.1:3000/api/v1/system/health       # database and storage; VAJRA/TANTRA reachability for superadmins
```

Python 3.12 is the target runtime (`cybercrime/backend/runtime.txt`). The Coqui `TTS` package is only needed by
`/api/v1/tts` and was left out of the verified installs; whether it installs on Python 3.12 was not checked. SQLite is
the default database (`DATABASE_URL`). PostgreSQL is supported through the same setting by SQLAlchemy, but it was not
tested here.

## Test

```bash
cd cybercrime/backend && python -m pytest -v -p no:cacheprovider        # unit tests (isolated, offline)
# integrated verification against real processes (see verification/README.md):
python verification/run_verification.py --vajra-bin <vajra-relay binary> --tantra off
python verification/build_reports.py
```

## Integrations (all off by default)

| Variable | Purpose |
|---|---|
| `VAJRA_API_URL`, `VAJRA_TANTRA_SECRET` | VAJRA relay node HTTP API (port 8080 by default) and its bearer token for write routes. |
| `TANTRA_VALIDATION_URL`, `TANTRA_KARMA_URL`, `TANTRA_PRANA_URL` | TANTRA layer services (validation, karma ledger, PRANA replay). |
| `TANTRA_EVENT_TYPE` | Event type sent to TANTRA; must be registered by TANTRA first. |
| `BHIV_CORE_EVENT_URL`, `BHIV_BUCKET_EVIDENCE_URL` | Earlier BHIV Core/Bucket hooks used by evidence upload. |
| `PROTECTED_ACCESS_RATE_LIMIT_PER_MINUTE` | Per-caller limit on protected access (default 60; per process). |
| `INCIDENT_SYNTHETIC_DEMO` | `true` only for demos: wallets with no history get generated data, labelled synthetic. Default `false`. |
| `LOGIN_MAX_ATTEMPTS_PER_MINUTE` | Login attempts per email per minute before `429` (default 20; per process). |

Versioned API and event contracts (JSON Schema) are in [cybercrime/contracts/](cybercrime/contracts/README.md). For the
exact dependency versions used in verification: `pip install -r cybercrime/backend/requirements.lock.txt`. Synthetic
threat scenarios and their coverage: `cybercrime/backend/fixtures/threat_scenarios.json`.

Contracts, errors and statuses: [INTEGRATION.md](INTEGRATION.md). Responsibilities and limits: [BCAES_ALIGNMENT.md](BCAES_ALIGNMENT.md).

## Status in one paragraph

The VAJRA consent path works against the real VAJRA code run locally: consent read, decision, audit and VAJRA
evidence. ALLOW means the subject's consent is active. It does not mean the requested action is in scope, because
VAJRA's verify contract has no scope (CYB-13).

TANTRA's contract gate answers live, but TANTRA has no registered contract for cybersecurity events yet, so security
decisions are not in the TANTRA ledger.

Repeated failed logins for one account are detected by a rule and correlated into one open incident for human review
(`GET /api/v1/threats/incidents`). This is rule-based decision support; it blocks no one. Whether TANTRA's
authority-validation route is the approval step for security responses is UNKNOWN.

On 2026-11-04 the open defects in other lanes (CYB-01 to CYB-09, CYB-12, CYB-14, CYB-15) were fixed for their owners'
review; see CHANGELOG.md.

No VM reference has been provided.

Open defects are listed, each with its severity and status, in
[evidence_packet/test_results/DEFECTS.md](evidence_packet/test_results/DEFECTS.md). Details: [HANDOVER.md](HANDOVER.md).
