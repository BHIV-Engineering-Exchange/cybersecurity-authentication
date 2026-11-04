# Changelog

## 2026-11-04 - P0 verification, evidence and BHIV runtime bridge (Hemanth)

### Added

**Verification harness (`verification/`):**
- Starts the real Cybersecurity API and a real VAJRA node, and optionally uses the live TANTRA layer.
- Runs the 8 EOD scenarios plus the 4 mandatory proofs and writes redacted evidence.
- Includes `build_reports.py` (reports derived from the evidence files) and `capture_screenshots.py`.

**`POST /api/v1/protected/access`** (`endpoints/protected_access.py`), an access decision for VAJRA-controlled resources:
- Deny by default; fails closed when VAJRA cannot be consulted.
- The local audit record is written first; if it fails, no decision is released and VAJRA/TANTRA are not called.
- No ALLOW without a VAJRA evidence record, which commits to the audit event's hash. A tentative ALLOW without one
  becomes DENY through a superseding audit event.
- TANTRA receives a minimal projection of the audit event (no free-text purpose, no idempotency key).
- Idempotency keys are scoped per caller and bound to the request content. A stored ALLOW is replayed only after VAJRA
  re-confirms the authority.
- Evidence is reported for each sink separately.
- Consent state only, not scope (CYB-13).

**Bridge and supporting code:**
- `app/core/bhiv_runtime.py`: VAJRA authority read and evidence record; TANTRA contract gate, karma ingest and replay
  verify; cached health probes. All off until configured.
- `GET /api/v1/system/health` includes `bhiv_runtime` peer reachability, for superadmins only.
- Table `protected_access_decisions` (idempotency records).
- Settings and `env.template` entries: `TANTRA_*` (including `TANTRA_SUBMISSION_PREFIX`), `VAJRA_API_URL`,
  `VAJRA_TANTRA_SECRET`, `BHIV_RUNTIME_TIMEOUT_SECONDS`, `PROTECTED_ACCESS_REPLAY_TTL_SECONDS`,
  `BHIV_HEALTH_CACHE_SECONDS`.
- RBAC rule: investigators may POST `/api/v1/protected/access`.

**Tests:** `cybercrime/backend/conftest.py` (reproducible, isolated, offline unit tests; cleans up after itself) and
`test_p0_runtime_bridge.py` (bridge and route tests with simulated peers).

**Documents:**
- Root: README, ARCHITECTURE, INTEGRATION, BCAES_ALIGNMENT, REVIEW_INDEX, HANDOVER, CHANGELOG, `DEP/`.
- `evidence_packet/` and `review_packets/CYBER-P0-2026-11-04/` (REVIEW_PACKET, EOD report).

### Changed
- **`cybercrime/openapi.yaml` regenerated from the running code.**
  - Paths 89 to 93, and operations 96 to 100 (97 to 101 counting the catch-all OPTIONS route). The added paths are
    `/api/v1/authz/check`, `/api/v1/access/revoke`,
    `/api/v1/tts/` (already served, but missing from the file) and `/api/v1/protected/access` (new).
  - 14 existing component schemas also changed, because the frozen file no longer matched the models the code serves.
    No property was removed and none became required. One change is stricter: the login form's `grant_type` pattern is
    now anchored (`password` became `^password$`).
    - **No longer required:**
      - AuditLogResponse: ip_address, message, method, path, request_id
      - CaseResponse: description, status
      - ComplaintResponse: 14 fields, such as created_at, officer_* and investigator_location_*
      - EvidenceResponse: anchor_status, description, file_path, file_size, file_type, immutable
      - IncidentReportResponse: report_id, transactions
      - MessageResponse: recipient_email, recipient_name, sender_email
      - RiskScoreResponse: description
      - TransactionDetail: suspicious, timestamp, type
      - TransactionResponse: amount, flagged, transaction_type
      - UserResponse: full_name, role
      - WalletResponse: anchor_status, balance, label, risk_level
    - **Added:** ComplaintResponse gains the optional investigator_email and investigator_name.
    - **Other changes:** Body_login_api_v1_auth_login_post (the anchored `grant_type` pattern above);
      RLFeedbackRequest and RLPredictionRequest differ only in schema metadata.
  - The version stays 1.0.0. The contract owner (Kaushlendra) should confirm the version decision.
- `cybercrime/backend/.gitignore`: ignore `event_buffer/` and `evidence_storage/` (runtime output).

### Removed
- `investigation.db` (empty database file at the repository root).
- `cybercrime/backend/event_buffer/events.jsonl` (a test event left from an earlier run).
- `cybercrime/backend/test_output.txt` (an error dump from another machine).

### Review
An independent audit reviewed this change before release.

Iteration 1 found 4 blocking issues:
- offline checks carried a live TANTRA label;
- an idempotent replay could return a stale ALLOW;
- the VAJRA boundary was described as proven although scope is not checked;
- a failed test was reported as passed.

The scope gap itself remains open as CYB-13; it is now disclosed.

Iteration 2 found 2 more blocking issues:
- a reproduced VAJRA defect was reported as not reproduced;
- VAJRA could keep an ALLOW record for a decision that was never released (fixed by writing the local audit first).

Fixes were applied; the final audit verdict is stated in the hand-over message.

### Fixes after the final audits (same day, before release)
Audit iteration 4 checked the evidence as first assembled and found 2 blocking issues. Both were fixed before release:
- TAN-01 was labelled "not reproduced". In fact the live contract gate's refusal (`event_type_not_registered`, check
  S5-01) reproduces it.
- The run logs were not committed, because `.gitignore` excluded `**/*.log`. They are now included.

Also fixed:
- **Manifest:** `.gitattributes` keeps evidence files byte-exact, so `MANIFEST.sha256` verifies on a clean checkout.
- **Live-call ledger:** `LIVE_TANTRA_CALLS.md` now covers the whole day.
  - It lists the calls made by hand: contract discovery before the run and screenshots after it.
  - It shows what the single probe write caused inside TANTRA. PRANA forwarded the probe, but PRANA's write to the
    Bucket failed (new defect TAN-06).
- **Proof matrix:** Task 1 section M rows in `PROOF_MATRIX.md` now say PARTIAL when the checks passed only against local
  processes. This matches the acceptance table.
- **Defect statuses:**
  - TAN-05, TAN-06, FES-01 and CYB-12 now name the recorded file that shows them.
  - VAJ-06 is reworded to what was shown. Grant and freeze changed state without a login; the token-mint route ran but
    reported an unknown token name.
- **Screenshot 07** (TANTRA's internal service addresses) is withdrawn until TANTRA agrees to publish it. Its GET is still
  listed.
- **Unit tests:** re-run on the final code; 67 passed.

Audit iteration 5 re-checked those fixes and found no blocking issues. Its remaining items were fixed as follows:
- The withdrawn screenshot was still in the first local commits. The branch history was rewritten before its first
  push, so no published commit contains the image.
- TANTRA's internal Bucket address in the recorded S8-02 reply is replaced by a `[REDACTED after capture ...]` label.
  Everything else in that reply is as received.
- Code-packet copies use LF line endings, so their SHA-256 values are the same on every checkout.
- The live-call ledger labels its time column as the time each reply arrived.

### Rollback
`git revert <commit>` restores the previous state, including the three deleted files and the earlier
`openapi.yaml`. The integrations are off unless their URLs are set, so leaving the new settings empty also disables
the bridge.

### Not changed on purpose
Defects found in code owned by other lanes are reported, not silently fixed: see
`evidence_packet/test_results/DEFECTS.md`.

## 2026-10-27 and earlier (Kaushlendra)
- `59d2d63` feat: complete unified cybersecurity repository with all services and documentation
- `dbd34f7` first commit
- `f65fd3c` last commit (2026-10-01)
- `45962f1` last commit Kaushal (2026-09-30)

Details of that work are in the `PHASE_1_*` to `PHASE_4_*` reports.
