# Integration Runbook (Demo-Safe)

This runbook defines the stable application-level integration flow for:
- **BHIV Bucket** (evidence storage + provenance anchors)
- **BHIV Core** (governance/orchestration events)

No internal Core/Bucket mechanics are exposed from this backend.

## 1) Prerequisites

- Backend environment variables configured:
  - `SECRET_KEY`
  - `DATABASE_URL`
  - `RBAC_POLICY_PATH`
  - `BHIV_BUCKET_EVIDENCE_URL`
  - `BHIV_BUCKET_API_KEY` (if required by Ashmit interface)
  - `BHIV_CORE_EVENT_URL`
  - `EVENT_BUFFER_PATH`
- Backend running and reachable.

## 2) Health Verification

### Backend health

```bash
curl -s http://localhost:3000/health
```

### Full system health (DB + storage + queue buffer + integration configuration)

```bash
curl -s http://localhost:3000/api/v1/system/health
```

Expected:
- `status` is `healthy` or `degraded`
- `database.ok` is `true`
- `integrations.storage.exists` and `integrations.storage.writable` are `true`

### Flush buffered governance events

```bash
curl -s -X POST http://localhost:3000/api/v1/system/queue/flush \
  -H "Authorization: Bearer <SUPERADMIN_TOKEN>"
```

## 3) End-to-End Demo Path

Flow: `flag -> case -> upload -> hash -> store -> log -> event emit -> report`

### 3.1 Login (obtain token)

```bash
curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "superadmin@example.com",
    "password": "REPLACE_ME"
  }'
```

Capture `access_token`.

### 3.2 Upload evidence

```bash
curl -s -X POST http://localhost:3000/api/v1/evidence/ \
  -H "Authorization: Bearer <TOKEN>" \
  -F "file=@./sample-evidence.pdf" \
  -F "wallet_id=C1002941337" \
  -F "title=Demo Evidence" \
  -F "description=Regulatory demo upload" \
  -F "tags=demo,regulatory" \
  -F "risk_level=high"
```

Expected:
- File stored locally (`EVIDENCE_STORAGE_PATH`)
- SHA-256 hash generated and persisted
- Best-effort BHIV Bucket store attempted
- Core event attempted; if unavailable, event buffered in `EVENT_BUFFER_PATH`
- Audit logs emitted in unified schema

### 3.3 Validate evidence retrieval

```bash
curl -s http://localhost:3000/api/v1/evidence/ \
  -H "Authorization: Bearer <TOKEN>"
```

### 3.4 Validate wallet search/report path

```bash
curl -s http://localhost:3000/api/v1/wallets/search/C1002941337 \
  -H "Authorization: Bearer <TOKEN>"
```

## 4) Failure Behavior (Required)

- **Bucket unavailable**: evidence upload still succeeds locally; audit log includes warning.
- **Core unavailable**: event retries; on failure it is persisted to local queue buffer.
- **DB/storage unhealthy**: reflected in `/api/v1/system/health`.

## 5) Audit Contract

Every audit log entry is structured as:
- `timestamp`, `action`, `status`, `message`
- optional `entity_type`, `entity_id`, `user_id`, `ip_address`, `request_id`, `path`, `method`, `details`

## 6) Operator Notes

- Keep `openapi.yaml` in sync:
  ```bash
  python backend/scripts/generate_openapi.py
  ```
- For production deployments, use managed secrets and never commit real keys.
