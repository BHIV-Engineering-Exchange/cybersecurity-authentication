# DATA_MODELS.md
> All Database Models, Field Definitions, Relationships, and Criticality
> Source of truth: `backend/models.py` (SQLAlchemy ORM)

---

## Database Engine

- **Default (local):** SQLite → file `backend/investigation.db`
- **Production:** PostgreSQL via `DATABASE_URL` env var
- **ORM:** SQLAlchemy with Alembic migrations (or `create_all` on startup)

---

## MODEL: User

The central identity model. Both superadmins and investigators are stored here, distinguished by the `role` field.

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | Integer, PK | YES | Auto-incremented internal ID |
| `full_name` | String | YES | Display name |
| `email` | String, UNIQUE | YES | Login identifier |
| `hashed_password` | String | YES | bcrypt-hashed, never stored in plain text |
| `role` | String | YES | `"superadmin"` or `"investigator"` |
| `is_active` | Boolean | YES | `true` = can login. Set to `false` to disable without deleting |
| `availability_status` | String | No | `available` / `busy` / `away` / `offline` |
| `status_updated_at` | DateTime | No | When status was last changed |
| `location_city` | String | No | Captured at login or complaint filing |
| `location_country` | String | No | Same |
| `location_latitude` | Float | No | Same |
| `location_longitude` | Float | No | Same |
| `location_ip` | String | No | IP at time of last action |
| `last_login` | DateTime | No | Timestamp of most recent login |
| `created_at` | DateTime | YES | Auto set on creation |
| `updated_at` | DateTime | YES | Auto updated |

**Critical?** YES — everything else foreign-keys to this table.

**DO NOT** delete User rows. Set `is_active = false` instead.

---

## MODEL: AccessRequest

Tracks investigator onboarding requests before they become Users.

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | Integer, PK | YES | |
| `full_name` | String | YES | |
| `email` | String | YES | Will become the User email on approval |
| `requested_password` | String | YES | Stored temporarily, used to create User on approval |
| `reason` | String | No | Why they need access |
| `status` | String | YES | `pending` / `approved` / `rejected` |
| `reviewed_by` | Integer, FK→User | No | Superadmin who took action |
| `reviewed_at` | DateTime | No | When review happened |
| `rejection_reason` | String | No | Only populated on rejection |
| `created_at` | DateTime | YES | |
| `updated_at` | DateTime | YES | |

**Critical?** Medium. Needed for onboarding flow. Safe to archive old records.

---

## MODEL: Case

A container for grouping an investigation's evidence, complaints, and risk scores.

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | Integer, PK | YES | |
| `case_id` | String, UNIQUE | YES | Human-readable ID like `CASE-2026-042` |
| `title` | String | YES | Short name |
| `description` | String | No | Details |
| `status` | String | No | Default: `active`. Can be: `active`, `closed`, `archived` |
| `investigator_id` | Integer, FK→User | No | Assigned investigator |
| `created_at` | DateTime | YES | |
| `updated_at` | DateTime | YES | |

**Critical?** YES — Evidence and RiskScore records may reference Case.

**Relationship:** One Case → Many Evidence, Many RiskScores, Many Complaints (indirectly via wallet)

---

## MODEL: Evidence

Immutable record of an uploaded file tied to a wallet and optionally a case.

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | Integer, PK | YES | |
| `evidence_id` | String, UNIQUE | YES | System-generated ID like `EVD-2026-007` |
| `title` | String | YES | Human label |
| `description` | String | No | |
| `hash` | String | YES | SHA-256 of the file content. Integrity check. |
| `file_path` | String | No | Relative path in `evidence_storage/`. Null if file was not retained. |
| `file_size` | Integer | No | In bytes |
| `file_type` | String | No | MIME type |
| `anchor_status` | String | No | Default: `pending`. Can be: `pending`, `anchored`, `failed`. Tracks blockchain anchoring if implemented. |
| `immutable` | Boolean | No | Default: `true`. If true, file cannot be deleted or modified. |
| `risk_level` | String | No | `low` / `medium` / `high` |
| `tags` | String | No | Comma-separated tag string |
| `wallet_id` | String | No | Wallet address this evidence relates to |
| `investigator_id` | Integer, FK→User | No | Who uploaded it |
| `case_id` | Integer, FK→Case | No | Case it belongs to (may be null) |
| `created_at` | DateTime | YES | |

**Critical?** YES — this is the forensic record. Never delete. `hash` is the integrity anchor.

**IMPORTANT:** `anchor_status` is a placeholder for future blockchain anchoring. Currently stays `pending` unless manually updated.

---

## MODEL: Complaint

Formal complaint filed by an investigator against a wallet.

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | Integer, PK | YES | |
| `wallet_address` | String | YES | The suspicious wallet |
| `officer_designation` | String | YES | e.g. "Inspector", "DSP" |
| `officer_email` | JSON/String | No | List of contact emails |
| `officer_mobile` | JSON/String | No | List of mobile numbers |
| `officer_telephone` | JSON/String | No | List of landlines |
| `officer_address` | String | No | Office address |
| `incident_description` | String | YES | Core narrative of the complaint |
| `internal_notes` | String | No | Non-public investigator notes |
| `evidence_ids` | JSON | No | List of Evidence IDs linked to this complaint |
| `investigator_id` | Integer, FK→User | No | Filing investigator |
| `investigator_location_city` | String | No | |
| `investigator_location_country` | String | No | |
| `investigator_location_latitude` | Float | No | |
| `investigator_location_longitude` | Float | No | Powers the Threat Map |
| `investigator_location_ip` | String | No | |
| `status` | String | YES | Default: `open`. Can be: `open`, `under_review`, `closed`, `escalated` |
| `created_at` | DateTime | YES | |
| `updated_at` | DateTime | YES | |

**Critical?** YES — legal record of the complaint.

---

## MODEL: RiskScore

A scored assessment of threat level, linked to a case.

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | Integer, PK | YES | |
| `category` | String | YES | What aspect was scored (e.g. `transaction_velocity`, `layering_pattern`) |
| `score` | Integer | YES | 0–100 numeric score |
| `level` | String | YES | `low` / `medium` / `high` / `critical` |
| `description` | String | No | Explanation |
| `case_id` | Integer, FK→Case | No | Linked case |
| `created_at` | DateTime | YES | |

**Critical?** YES — feeds escalation logic and superadmin dashboards.

---

## MODEL: IncidentReport

AI-generated analysis report for a wallet.

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | Integer, PK | YES | |
| `report_id` | String, UNIQUE | YES | Like `RPT-2026-015` |
| `wallet_address` | String | YES | |
| `description` | String | YES | Input description from investigator |
| `risk_score` | Float | YES | 0.0–100.0 |
| `risk_level` | String | YES | `low` / `medium` / `high` / `critical` |
| `detected_patterns` | JSON | YES | List of pattern strings |
| `graph_data` | JSON | YES | List of `{from, to, amount}` edges |
| `timeline` | JSON | YES | List of `{timestamp, event, amount}` objects |
| `summary` | JSON | YES | Aggregate stats (total_transactions, volume, etc.) |
| `system_conclusion` | String | YES | LLM or rule-based conclusion text |
| `investigator_id` | Integer, FK→User | No | Who triggered the report |
| `created_at` | DateTime | YES | |

**Critical?** YES — forensic and AI evidence of risk.

---

## MODEL: Wallet / WalletState

Tracks freeze/unfreeze state for wallets.

| Field | Type | Description |
|---|---|---|
| `id` | Integer, PK | |
| `wallet_address` | String, UNIQUE | The crypto wallet address |
| `is_frozen` | Boolean | Current state |
| `freeze_reason` | String | Why it was frozen |
| `frozen_by` | String | Who froze it (name string) |
| `frozen_at` | DateTime | When frozen |
| `unfrozen_at` | DateTime | When unfrozen (null if still frozen) |
| `unfreeze_reason` | String | Why unfrozen |

**Critical?** YES — enforcement record.

---

## MODEL: Watchlist

Wallets under active monitoring.

| Field | Type | Description |
|---|---|---|
| `id` | Integer, PK | |
| `wallet_address` | String | |
| `added_by` | Integer, FK→User | |
| `notes` | String | Why it's being watched |
| `created_at` | DateTime | |

---

## MODEL: Message

Internal messaging between users.

| Field | Type | Description |
|---|---|---|
| `id` | Integer, PK | |
| `sender_id` | Integer, FK→User | |
| `recipient_id` | Integer, FK→User | Null if broadcast |
| `subject` | String | |
| `content` | String | |
| `message_type` | String | `message` / `alert` / `notification` |
| `priority` | String | `normal` / `high` / `urgent` |
| `is_broadcast` | Boolean | If true, sent to all investigators |
| `is_read` | Boolean | Default: false |
| `read_at` | DateTime | When recipient read it |
| `created_at` | DateTime | |

---

## MODEL: AuditLog

Immutable log of every significant action in the system. Written automatically by middleware or manually in routers.

| Field | Type | Description |
|---|---|---|
| `id` | Integer, PK | |
| `action` | String | Machine-readable action name (e.g. `evidence_uploaded`) |
| `message` | String | Human-readable description |
| `entity_type` | String | What was acted on (e.g. `evidence`, `complaint`) |
| `entity_id` | String | The ID of the entity |
| `status` | String | `success` / `failure` |
| `details` | String | Extra JSON or notes |
| `user_id` | Integer, FK→User | Who did the action (null for system actions) |
| `ip_address` | String | Requester IP |
| `request_id` | String | Unique request trace ID |
| `path` | String | API path that was called |
| `method` | String | HTTP method |
| `timestamp` | DateTime | Exact time |

**Critical?** YES — **NEVER delete audit logs.** This is the forensic chain of custody.

---

## MODEL: FraudTransaction

Training/inference dataset for the ML fraud model.

| Field | Type | Description |
|---|---|---|
| `id` | Integer, PK | |
| `step` | Integer | Time step in simulation |
| `type` | String | Transaction type: CASH_IN, CASH_OUT, DEBIT, PAYMENT, TRANSFER |
| `amount` | Float | Transaction amount |
| `nameOrig` | String | Origin account |
| `oldbalanceOrg` | Float | Origin balance before |
| `newbalanceOrig` | Float | Origin balance after |
| `nameDest` | String | Destination account |
| `oldbalanceDest` | Float | Destination balance before |
| `newbalanceDest` | Float | Destination balance after |
| `isFraud` | Integer | 0 = normal, 1 = fraud (ground truth label) |
| `isFlaggedFraud` | Integer | System flag (legacy field from source dataset) |

---

## Relationships Summary

```
User (1) ──────────── (many) Evidence
User (1) ──────────── (many) Complaint
User (1) ──────────── (many) IncidentReport
User (1) ──────────── (many) Message (as sender)
User (1) ──────────── (many) Message (as recipient)
User (1) ──────────── (many) Watchlist entries
User (1) ──────────── (many) AuditLog entries

Case (1) ──────────── (many) Evidence
Case (1) ──────────── (many) RiskScore

AccessRequest ──────── resolved by → User (superadmin)
AccessRequest ──────── creates → User (investigator, on approval)
```

---

## Critical vs Optional Models

| Model | Critical | Reason |
|---|---|---|
| User | ✅ CRITICAL | Identity foundation |
| Evidence | ✅ CRITICAL | Forensic record, immutable |
| Complaint | ✅ CRITICAL | Legal filing record |
| AuditLog | ✅ CRITICAL | Chain of custody, never delete |
| IncidentReport | ✅ CRITICAL | AI evidence |
| Case | ✅ CRITICAL | Organizational container |
| RiskScore | ✅ CRITICAL | Escalation trigger |
| WalletState | ✅ CRITICAL | Enforcement state |
| AccessRequest | Medium | Onboarding only |
| Message | Medium | Operational comms |
| Watchlist | Low | Monitoring helper |
| FraudTransaction | Low | ML training data only |
