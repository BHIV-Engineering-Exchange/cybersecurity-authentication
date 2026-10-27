# API_AND_FLOW.md
> All API Endpoints, Request/Response Contracts, and Real Examples
> Base URL: `http://localhost:3000/api/v1`

---

## Auth Headers

All protected endpoints require:
```
Authorization: Bearer <jwt_token>
```

Token is obtained from `POST /auth/login`.

---

## GROUP 1 — Authentication & Access

### POST /auth/login
Login and get a JWT token.

**Request** (form-urlencoded):
```
username=admin@cybercrime.in&password=yourpassword
```

**Response 200:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

---

### POST /auth/access-request
Investigator requests access (no auth needed).

**Request:**
```json
{
  "full_name": "Raj Sharma",
  "email": "raj@cybercrime.in",
  "requested_password": "SecurePass123",
  "reason": "Assigned to Mumbai cell cybercrime unit"
}
```

**Response 201:**
```json
{
  "id": 12,
  "full_name": "Raj Sharma",
  "email": "raj@cybercrime.in",
  "reason": "Assigned to Mumbai cell cybercrime unit",
  "status": "pending",
  "reviewed_by": null,
  "reviewed_at": null,
  "rejection_reason": null,
  "created_at": "2026-05-07T10:00:00",
  "updated_at": "2026-05-07T10:00:00"
}
```

---

### PATCH /auth/access-request/{id}
Superadmin approves or rejects a request. On approval, creates investigator account.

**Request:**
```json
{
  "status": "approved",
  "initial_password": "TempPass@456"
}
```

---

### POST /auth/reset-password
Change a user's password.

**Request:**
```json
{
  "email": "raj@cybercrime.in",
  "old_password": "OldPass123",
  "new_password": "NewPass456"
}
```

---

### POST /auth/admin-set-password
Superadmin forcibly resets any user's password.

**Request:**
```json
{
  "email": "raj@cybercrime.in",
  "new_password": "ForcedReset789"
}
```

---

## GROUP 2 — Cases

### POST /cases/
Create a new case.

**Request:**
```json
{
  "case_id": "CASE-2026-042",
  "title": "Wallet Laundering - Mumbai",
  "description": "Suspected money laundering through crypto wallets",
  "status": "active",
  "investigator_id": 3
}
```

**Response 201:**
```json
{
  "id": 42,
  "case_id": "CASE-2026-042",
  "title": "Wallet Laundering - Mumbai",
  "description": "Suspected money laundering through crypto wallets",
  "status": "active",
  "investigator_id": 3,
  "created_at": "2026-05-07T11:00:00",
  "updated_at": "2026-05-07T11:00:00"
}
```

### GET /cases/
Returns all cases. Supports filtering by `status`.

### GET /cases/{id}
Returns a single case by integer DB id.

### PUT /cases/{id}
Full update of a case.

### DELETE /cases/{id}
Soft or hard delete (superadmin only).

---

## GROUP 3 — Evidence

### POST /evidence/
Upload a file as evidence. **Multipart form-data.**

**Form fields:**
| Field | Type | Required | Notes |
|---|---|---|---|
| `file` | binary | YES | Any file type |
| `wallet_id` | string | YES | Wallet address this evidence relates to |
| `title` | string | No | Human label |
| `description` | string | No | Free text |
| `risk_level` | string | No | default: `medium` |
| `tags` | string | No | comma-separated |
| `investigator_id` | integer | No | Defaults to calling user |

**Response 201:**
```json
{
  "id": 7,
  "evidence_id": "EVD-2026-007",
  "title": "Screenshot of transaction",
  "description": "Shows wallet-to-wallet transfer at 03:14 AM",
  "hash": "a1b2c3d4e5f6...",
  "file_path": "evidence_storage/EVD-2026-007.png",
  "file_size": 204800,
  "file_type": "image/png",
  "anchor_status": "pending",
  "immutable": true,
  "investigator_id": 3,
  "case_id": null,
  "created_at": "2026-05-07T11:15:00"
}
```

**Important:** `hash` is computed server-side (SHA-256). Never trust client-provided hashes.

### GET /evidence/
All evidence. Filterable by `investigator_id`, `wallet_id`, `risk_level`.

### GET /evidence/{id}
Single evidence record.

### GET /evidence/{id}/download
Returns the actual file (streams file content). Used by frontend Download button.

---

## GROUP 4 — Complaints

### POST /complaints/
File a formal complaint against a wallet.

**Request:**
```json
{
  "wallet_address": "0xABCDEF1234567890",
  "officer_designation": "Inspector",
  "incident_description": "Victim transferred ₹2,50,000 to this wallet under a fake investment scheme. Wallet went cold immediately after.",
  "officer_email": ["inspector.mehta@mumbaipolice.in"],
  "officer_mobile": ["9876543210"],
  "officer_telephone": ["022-22620111"],
  "officer_address": "Cyber Cell, CST, Mumbai 400001",
  "investigator_id": 3,
  "investigator_location_city": "Mumbai",
  "investigator_location_country": "India",
  "investigator_location_latitude": 19.0760,
  "investigator_location_longitude": 72.8777,
  "investigator_location_ip": "103.21.58.10",
  "evidence_ids": [7, 8],
  "internal_notes": "Witness corroborates phone call logs"
}
```

**Response 201:**
```json
{
  "id": 15,
  "wallet_address": "0xABCDEF1234567890",
  "officer_designation": "Inspector",
  "incident_description": "...",
  "status": "open",
  "investigator_id": 3,
  ...
  "created_at": "2026-05-07T11:20:00",
  "updated_at": "2026-05-07T11:20:00"
}
```

### GET /complaints/
All complaints. Filter by `status`, `investigator_id`.

### GET /complaints/{id}
Single complaint detail.

### PATCH /complaints/{id}
Update complaint status or notes.

---

## GROUP 5 — Risk Scores

### POST /risk-scores/
Manually create a risk score for a case.

**Request:**
```json
{
  "category": "transaction_velocity",
  "score": 82,
  "level": "high",
  "description": "23 transactions in 4 hours to new wallets",
  "case_id": 42
}
```

**Response 201:**
```json
{
  "id": 5,
  "category": "transaction_velocity",
  "score": 82,
  "level": "high",
  "description": "23 transactions in 4 hours to new wallets",
  "case_id": 42,
  "created_at": "2026-05-07T11:25:00"
}
```

### GET /risk-scores/
All risk scores. Filter by `case_id`, `level`.

---

## GROUP 6 — Incident Reports (AI)

### POST /reports/incident
Generate an AI-powered incident report for a wallet.

**Request:**
```json
{
  "wallet_address": "0xABCDEF1234567890",
  "description": "Victim transferred ₹2.5L under investment fraud. Immediate wallet movement detected.",
  "investigator_id": 3
}
```

**Response 200:**
```json
{
  "wallet": "0xABCDEF1234567890",
  "risk_score": 78.5,
  "risk_level": "high",
  "detected_patterns": ["rapid_outflow", "layering", "no_return_transactions"],
  "summary": {
    "total_transactions": 14,
    "total_volume": 250000,
    "unique_counterparties": 9,
    "avg_transaction_size": 17857,
    "first_transaction": "2026-04-30T03:00:00",
    "last_transaction": "2026-05-01T06:00:00"
  },
  "graph_data": [
    { "from": "0xABCDEF1234567890", "to": "0x111222333", "amount": 50000 },
    { "from": "0x111222333", "to": "0x444555666", "amount": 48000 }
  ],
  "timeline": [
    { "timestamp": "2026-04-30T03:00:00", "event": "First inbound transfer", "amount": 250000 }
  ],
  "transactions": [...],
  "system_conclusion": "HIGH RISK: Wallet shows layering pattern consistent with fraud money movement. Immediate freeze recommended.",
  "report_id": "RPT-2026-015"
}
```

**Note:** If `OPENROUTER_API_KEY` is not set, the backend returns a deterministic rule-based response instead of calling the LLM.

### GET /reports/
All incident reports. Filter by `investigator_id`.

### GET /reports/{id}
Single report detail.

---

## GROUP 7 — Wallets

### POST /wallets/{address}/freeze
Freeze a wallet.

**Request:**
```json
{
  "freeze_reason": "Linked to investment fraud case CASE-2026-042",
  "frozen_by": "Inspector Mehta"
}
```

**Response 200:**
```json
{
  "wallet_address": "0xABCDEF1234567890",
  "is_frozen": true,
  "freeze_reason": "Linked to investment fraud case CASE-2026-042",
  "frozen_by": "Inspector Mehta",
  "frozen_at": "2026-05-07T11:30:00"
}
```

### POST /wallets/{address}/unfreeze
Unfreeze a wallet (same body pattern, reason required).

### GET /wallets/frozen
All currently frozen wallets.

### GET /wallets/watchlist
All watchlisted wallets.

### POST /wallets/watchlist
Add wallet to watchlist.

### DELETE /wallets/watchlist/{address}
Remove wallet from watchlist.

---

## GROUP 8 — Investigators

### GET /investigators/
All investigator accounts (excludes superadmin).

### GET /investigators/{id}
Single investigator profile + stats.

### GET /investigators/{id}/dashboard
Summary stats: total complaints, evidence, reports, unread messages, recent activity.

### PATCH /investigators/{id}/status
Update availability status.

**Request:**
```json
{ "status": "busy" }
```
Valid values: `available`, `busy`, `away`, `offline`

---

## GROUP 9 — Messages

### POST /messages/
Send a message.

**Request:**
```json
{
  "subject": "Urgent: New wallet flagged",
  "content": "Please review wallet 0xABCDEF immediately. Risk score is 85.",
  "recipient_id": 3,
  "is_broadcast": false,
  "message_type": "alert",
  "priority": "high"
}
```

### GET /messages/
All messages for the authenticated user.

### GET /messages/unread-count
Returns `{ "unread_count": 4 }`.

### PATCH /messages/{id}/read
Mark message as read.

---

## GROUP 10 — Audit Logs

### GET /logs/
All audit logs. Filter by `user_id`, `action`, date range.

**Response sample (one item):**
```json
{
  "id": 204,
  "action": "evidence_uploaded",
  "message": "Evidence EVD-2026-007 uploaded for wallet 0xABCDEF",
  "entity_type": "evidence",
  "entity_id": "7",
  "status": "success",
  "details": null,
  "user_id": 3,
  "ip_address": "103.21.58.10",
  "request_id": "req-abc-123",
  "path": "/api/v1/evidence/",
  "method": "POST",
  "timestamp": "2026-05-07T11:15:00"
}
```

---

## GROUP 11 — Fraud Prediction (ML)

### GET /fraud-predictions/model-status
Returns current model accuracy, training status, dataset stats.

### POST /fraud-predictions/predict
Run ML fraud prediction on a transaction.

**Request:**
```json
{
  "transaction_data": {
    "step": 1,
    "type": "TRANSFER",
    "amount": 250000,
    "nameOrig": "C1234567",
    "oldbalanceOrg": 250000,
    "newbalanceOrig": 0,
    "nameDest": "C9876543",
    "oldbalanceDest": 0,
    "newbalanceDest": 250000
  }
}
```

---

## GROUP 12 — RL Engine

### POST /rl-engine/train
Train the Q-learning agent.

**Request:**
```json
{ "epochs": 5, "limit": 1000 }
```

### POST /rl-engine/predict
Get RL agent prediction.

**Request:**
```json
{
  "transaction_data": { ... }
}
```

### POST /rl-engine/feedback
Submit real outcome to update agent.

**Request:**
```json
{
  "transaction_data": { ... },
  "predicted_action": 1,
  "actual_is_fraud": 1,
  "reward": 1.0
}
```

### GET /rl-engine/performance
Returns Q-table size, accuracy, training episodes.

---

## Health Check

### GET /health
No auth required. Returns system health.

**Response:**
```json
{
  "status": "healthy",
  "database": "connected",
  "version": "1.0.0"
}
```

---

*For the complete schema of every field, refer to `openapi.yaml` in the repo root.*
