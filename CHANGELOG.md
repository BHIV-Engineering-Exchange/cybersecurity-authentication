# Changelog

## 2026-11-05 - VAJRA re-check, scope check in protected access (Hemanth)

VAJRA's owner reported VAJ-01..VAJ-09 fixed on branch `vajra-tantra-runtime-increment` (commit `3cc883f`) and added
two things Cybersecurity asked for: an evidence-only token tier (`VAJRA_CYBER_SECRET`) and the granted scope in
`authority/verify`. Everything was re-checked on a local node built from `3cc883f`; nothing was sent to VAJRA's live
node or to TANTRA.

- **Protected access checks scope (CYB-13, partly fixed):** ALLOW now also needs `<action>:<resource type>` (for
  example `read:evidence`) in the scope VAJRA reports. Exact match, no wildcards; no reported scope means DENY. New
  reason codes `VAJRA_SCOPE_NOT_GRANTED`, `VAJRA_SCOPE_UNAVAILABLE`. A replayed ALLOW re-checks the scope too. The
  caller is still not bound to the subject. The scope form is a proposal to agree with VAJRA and TANTRA.
- **Evidence-only VAJRA token:** new setting `VAJRA_CYBER_SECRET`, used for evidence writes when set;
  `VAJRA_TANTRA_SECRET` (VAJRA's governance token) is only a fallback, and superadmin health then warns
  (`write_credential`, `warnings`).
- **Verification:** new checks V-03..V-08, S1-08 and S6-05; V-02 and V-01 updated for routes that now need a token;
  S7-04 reads the recovery package correctly. Run `20261105T143237Z`: 43 PASS, 7 FAIL, 0 ERROR, 0 BLOCKED, 4 SKIPPED
  of 54. All 7 failures are VAJRA defects. The 4 skipped checks need live TANTRA, which was not called. Unit tests:
  119 passed. VAJRA's own Go tests at `3cc883f`: 27 passed with the 04 Nov command, and 24 packages ok in the whole
  module.
- **What the re-check found in VAJRA:**
  - Fixed: VAJ-02, VAJ-04, VAJ-06, VAJ-08.
  - Partly fixed: VAJ-01, VAJ-03, VAJ-07, VAJ-09.
  - Not fixed: VAJ-05.
  - New: VAJ-10 (the evidence-only token is refused by evidence/record), VAJ-11 (it still reaches permission
    grant/revoke and admin submit-transaction), VAJ-12 (a later transition replaces the granted scope), VAJ-13 (a
    revocation can be undone by a restart; the authority ledger is trusted on reload), VAJ-14 (one anonymous report
    can freeze any wallet).

  Details: `evidence_packet/test_results/VAJRA_RECHECK.md` and `DEFECTS.md`.
- **Evidence layout:** the 04 Nov final run (`20261104T133229Z`, the one the 04 Nov EOD describes) is archived in
  full under `evidence_packet/previous_runs/`. The 04 Nov review packet and EOD are unchanged. The 05 Nov packet is
  `review_packets/CYBER-VAJRA-RECHECK-2026-11-05/`. `build_reports.py` writes a packet folder only when one is named.

## 2026-11-04 (evening) - Remaining P0 items for other members (Hemanth, for the owners' review)

A check of the P0 task against every member's assignment found these items still open in this repository. Each is
built for its owner's review.

- **Aryan (correlation and explainability):** every incident from `GET /api/v1/threats/incidents` now carries:
  - `observed_facts` (kept apart from the `inference`);
  - `evidence_gaps` and a `proposed_next_action` (nothing is acted on);
  - a TANTRA-compatible `tantra_response_envelope`, marked NOT SENT until TANTRA registers a contract (TAN-01).

  Incident ids are deterministic (UUIDv5 of the correlation key and the first linked event). A re-delivered event is
  not counted twice. The response follows the new `security_incident` contract.
- **Shivam (threat intelligence):** `cybercrime/backend/fixtures/threat_scenarios.json` holds a first-release threat
  taxonomy (12 classes) and 15 synthetic scenarios covering the shared threat scenarios, each with its real coverage:
  - covered: 4;
  - partial: 2;
  - not covered: 9, each with the gap stated.

  `test_threat_scenarios.py` runs the runnable ones against the API. It also proves the declared password-spray gap.
- **Kaushlendra (contracts and security state):**
  - `cybercrime/contracts/` holds 12 versioned JSON Schema contracts, generated from the models the API uses;
    `test_contract_schemas.py` fails on drift.
  - `cybercrime/backend/requirements.lock.txt` pins the exact versions of the verified environment.
  - `verification/determinism_check.py` gives 50-run SHA-256 evidence for the module's deterministic functions.
  - T-GOV-F02 is **not** closed: the Parikshak `incorrect_logic` logs are not in any repository available to us. The
    blocker and owner are in `evidence_packet/test_results/DETERMINISM_50_RUNS.md`.
- **VAJRA (from the Cybersecurity side):** `evidence_packet/architecture_and_integration_maps/VAJRA_CAPABILITY_MAP.md`
  maps each VAJRA capability we use to the checks that test it.

Still not in this repository: the VAJRA end-user journey (VAJRA's UI), Brahmanda events (no repository), TANTRA's
security contract, the VM.

## 2026-11-04 (afternoon) - Fixes in other lanes and failed-login detection (Hemanth, for the owners' review)

At the team's request, open defects in other lanes were fixed in this repository. Each fix is for its lane owner to
review before merge. Unit tests: `cybercrime/backend/test_lane_fixes.py`. Runtime checks: see DEFECTS.md.

### Changed (behaviour)
- **CYB-01:** `POST /api/v1/auth/register` is superadmin-only. Public sign-up stays `POST /api/v1/access-requests/request`
  (reviewed by a superadmin). `rbac-permissions.json` no longer lists register as public.
- **CYB-05:** login answers "Invalid email or password." for both an unknown email and a wrong password, and checks a
  dummy hash for unknown emails, so timing does not reveal accounts. "Account is deactivated" is shown only after the
  correct password. Login is now a plain (sync) route, so bcrypt no longer blocks the event loop.
- **CYB-04:** every failed login writes a canonical `auth.login` DENIED security event. An unknown email is recorded
  only as a keyed hash (HMAC with the server key).
- **Login throttle (new):** more than `LOGIN_MAX_ATTEMPTS_PER_MINUTE` attempts (default 20) for one email in a minute
  answer `429` before any password check and write nothing to the database (per process).
- **CYB-02:** Tier 1 permission revocation is stored (`revoked_permissions`) and enforced by the RBAC middleware
  (`403 PERMISSION_REVOKED`) and by `/api/v1/authz/check`. New `POST /api/v1/access/restore` undoes it. `superadmin` and
  `public` cannot be revoked.
- **CYB-06 / CYB-03:** wallet incident analysis reads only the system's own transaction dataset (`fraud_transactions`);
  it never generates or mixes in data at analysis time, and no longer shifts timestamps. The response adds
  `confidence`, `uncertainty`, `data_basis` (`recorded`, `none`, `synthetic_demo`) and `observed_tx_count`; each
  transaction gets `synthetic`. The uncertainty list states that this repository fills `fraud_transactions` from a
  generator script (so it may be synthetic test data) and that times come from the dataset's step counter. Generated
  demo data exists only with `INCIDENT_SYNTHETIC_DEMO=true` (labelled synthetic). With no records, `risk_level` is
  `INSUFFICIENT DATA`: the frontends must handle this new value.
- **CYB-07:** the catch-all OPTIONS route is removed (the CORS middleware answers preflight), so a collection route
  without the trailing slash redirects (307) instead of 405.
- **CYB-08:** the evidence upload response reports `bucket_status` (`stored`, `unavailable`, `not_configured`).
- **CYB-09:** the Bucket API key is sent in an `X-API-Key` header, not in the JSON body. The Bucket owner must confirm
  this header.
- **CYB-12:** anonymous `GET /api/v1/system/health` no longer shows file-system paths or raw database errors.
- **CYB-14:** `POST /api/v1/protected/access` is rate limited per caller (`PROTECTED_ACCESS_RATE_LIMIT_PER_MINUTE`,
  default 60, per process); excess answers `429 RATE_LIMITED`.
- **CYB-15:** `X-Trace-Id` / `X-Request-Id` are echoed only in a safe form; anything else is replaced by a fresh UUID.
  Protected access still refuses a malformed trace id with 400.

### Added
- **Failed-login detection and correlation** (10-day proof C; Shivam and Aryan Dias to review):
  - `app/core/threat_detection.py`: rule `auth.repeated_failed_login` v1.0.0 (5 or more failed logins for one account
    within 10 minutes; wrong passwords only, not deactivated accounts) opens one `security_incidents` row per account
    and window, with severity, confidence, uncertainty, rationale and up to 50 evidence event ids, and writes a
    `threat.detected` event. Its cost per failed login is bounded. It never blocks anyone.
  - `GET /api/v1/threats/incidents` (superadmin) lists the incidents.
- Verification: check P-C2 now tests detection and correlation instead of being BLOCKED; O-01 and S6-04 test CYB-12 and
  CYB-08.
- `cybercrime/openapi.yaml` regenerated: 95 paths, 103 operations.

### Not changed
- CYB-13 (scope and caller binding) needs a scope-aware VAJRA contract and a team decision.
- VAJRA and TANTRA defects are reported to their owners, not fixed here.

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
