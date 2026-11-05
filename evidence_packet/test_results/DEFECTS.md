# Defects found by the P0 verification

Generated from `verification/defects.py`, this run's `results.json` and the recorded files it names. A defect is CONFIRMED only when recorded evidence shows it: its check failed, its check passed because the peer refused (for example a contract gate), or a named recorded file contains it. CODE-VERIFIED means it was found by reading code or repository state. Owners follow the lanes named in the task documents.

## Cybersecurity

| ID | Severity | Status | Title | Owner |
|---|---|---|---|---|
| CYB-01 | CRITICAL | FIXED in this change; S1-04 passes in this run | Anyone can self-register and immediately read investigator data | Kaushlendra (auth/authz) |
| CYB-02 | HIGH | FIXED in this change; S2-04 passes in this run | Tier-1 'permission_revocation' reports REVOKED but changes nothing | Kaushlendra (access control) |
| CYB-06 | CRITICAL | FIXED in this change; S3-03 passes in this run | Wallet analysis invents transactions and a fraud verdict for any wallet | Shivam (security intelligence) |
| CYB-03 | MEDIUM | FIXED in this change; S3-01 passes in this run | Intelligence output has no confidence or uncertainty field | Shivam (security intelligence) |
| CYB-04 | HIGH | FIXED in this change; P-C1 passes in this run | Failed logins are not recorded as security events | Kaushlendra (auth); consumed by Shivam/Aryan |
| CYB-05 | MEDIUM | FIXED in this change; P-C1 passes in this run | Login errors reveal whether an account exists | Kaushlendra (auth) |
| CYB-07 | LOW | FIXED in this change; O-04 passes in this run | Collection routes without a trailing slash return 405 for authorised users | Rajaryan (integration) / Kaushlendra (API) |
| CYB-08 | MEDIUM | FIXED in this change; S6-04 passes in this run | Evidence upload ignores the Bucket result; callers cannot see whether the sovereign copy exists | Kaushlendra (data/API) |
| CYB-09 | MEDIUM | FIXED in this change (no runtime check; verified by unit test test_bucket_key_travels_in_a_header_not_the_payload) | Bucket API key is sent inside the JSON body | Kaushlendra (data/API) |
| CYB-10 | MEDIUM | FIXED in this change (no runtime check; verified by the unit suite running on a clean checkout (test_results/cyber_unit_tests.txt)) | Unit test suite was not reproducible from a clean clone | Hemanth (testing) |
| CYB-11 | MEDIUM | FIXED in this change (no runtime check; verified by the regenerated cybercrime/openapi.yaml; the API's start-up drift check logged no warning in this run) | Frozen OpenAPI contract was missing /authz/check, /access/revoke and /tts/ | Kaushlendra (API contracts) |
| CYB-12 | LOW | FIXED in this change; O-01 passes in this run | Public health endpoint shows server file-system paths (seen in api_samples/O-01.json) | Kaushlendra (API) |
| CYB-13 | HIGH | PARTLY FIXED in this change (S1-08 PASS in this run); still open: see details | Protected access does not check scope or bind the caller to the subject; the VAJRA token is unscoped | Rajaryan (integration) with Prakash (VAJRA contract); bridge by Hemanth |
| CYB-14 | MEDIUM | FIXED in this change (no runtime check; verified by unit test test_protected_access_is_rate_limited_per_caller) | Every protected-access decision appends a permanent VAJRA row; there is no rate limit | Rajaryan (integration); bridge by Hemanth |
| CYB-15 | LOW | FIXED in this change (no runtime check; verified by unit test test_malformed_trace_id_is_not_echoed) | Caller-supplied X-Trace-Id / X-Request-Id were echoed unvalidated in response headers and logs | Kaushlendra (API) |

### CYB-01 - Anyone can self-register and immediately read investigator data

- Severity: CRITICAL; owner: Kaushlendra (auth/authz); status: FIXED in this change; S1-04 passes in this run
- Where: `cybercrime/backend/app/api/v1/endpoints/auth.py:19-41 (register sets role=investigator, active); cybercrime/rbac-permissions.json (public POST /api/v1/auth/register)`
- Steps:
  1. POST /api/v1/auth/register with any email and password (no login).
  2. POST /api/v1/auth/login with the same credentials.
  3. GET /api/v1/cases/ with the token.
- Expected: Registration is refused or stays inactive until a superadmin approves it.
- Fixed by: Hemanth on 2026-11-04 at the team's request; for review by Kaushlendra
- Fix: Create self-registered users as inactive (or route them through /api/v1/access-requests), or remove the public route.

### CYB-02 - Tier-1 'permission_revocation' reports REVOKED but changes nothing

- Severity: HIGH; owner: Kaushlendra (access control); status: FIXED in this change; S2-04 passes in this run
- Where: `cybercrime/backend/app/api/v1/endpoints/access.py:158-166`
- Steps:
  1. As superadmin, POST /api/v1/access/revoke with revocation_type=permission_revocation, target role=investigator, action=read.
  2. As an investigator, GET /api/v1/cases/ and POST /api/v1/authz/check for read.
- Expected: The revoked permission is denied on the next request.
- Fixed by: Hemanth on 2026-11-04 at the team's request; for review by Kaushlendra
- Fix: Persist revoked role:action pairs and enforce them in the RBAC middleware and /authz/check, or return NOT_IMPLEMENTED instead of REVOKED.

### CYB-06 - Wallet analysis invents transactions and a fraud verdict for any wallet

- Severity: CRITICAL; owner: Shivam (security intelligence); status: FIXED in this change; S3-03 passes in this run
- Where: `cybercrime/backend/app/api/v1/endpoints/incidents.py:366-384 ('Always generate synthetic fraud patterns ... use synthetic fraud data as primary')`
- Steps:
  1. POST /api/v1/incidents/analyze for a wallet address the system has never seen.
- Expected: No transactions or patterns are reported without observed data; any demo data is labelled synthetic.
- Fixed by: Hemanth on 2026-11-04 at the team's request; for review by Shivam
- Fix: Remove generated data from the investigation path, or gate it behind an explicit demo flag and mark every generated item synthetic:true.

### CYB-03 - Intelligence output has no confidence or uncertainty field

- Severity: MEDIUM; owner: Shivam (security intelligence); status: FIXED in this change; S3-01 passes in this run
- Where: `cybercrime/backend/app/api/v1/schemas.py:219-232 (IncidentReportResponse)`
- Steps:
  1. POST /api/v1/incidents/analyze for an ambiguous wallet and inspect the fields.
- Expected: A structured confidence/uncertainty value next to risk_score (EOD: expose severity, confidence, rationale, uncertainty).
- Fixed by: Hemanth on 2026-11-04 at the team's request; for review by Shivam
- Fix: Add confidence and an uncertainty/evidence-basis field to the response contract.

### CYB-04 - Failed logins are not recorded as security events

- Severity: HIGH; owner: Kaushlendra (auth); consumed by Shivam/Aryan; status: FIXED in this change; P-C1 passes in this run
- Where: `cybercrime/backend/app/api/v1/endpoints/auth.py:44-71 (401 raised without a canonical security event; the only trace is a generic request.completed log line with status 401)`
- Steps:
  1. POST /api/v1/auth/login six times with a wrong password.
  2. As superadmin, GET /api/v1/audit/.
- Expected: One security event per failed attempt, so detection and correlation have an input.
- Fixed by: Hemanth on 2026-11-04 at the team's request; for review by Kaushlendra
- Fix: Emit a canonical security event (auth.login, DENIED, reason) for every failed login.

### CYB-05 - Login errors reveal whether an account exists

- Severity: MEDIUM; owner: Kaushlendra (auth); status: FIXED in this change; P-C1 passes in this run
- Where: `cybercrime/backend/app/api/v1/endpoints/auth.py (messages 'User not found ...' vs 'Incorrect password ...')`
- Steps:
  1. Log in with an unknown email.
  2. Log in with a known email and a wrong password.
  3. Compare the messages.
- Expected: The same generic message for both.
- Fixed by: Hemanth on 2026-11-04 at the team's request; for review by Kaushlendra
- Fix: Return one generic 'Invalid email or password' message.

### CYB-07 - Collection routes without a trailing slash return 405 for authorised users

- Severity: LOW; owner: Rajaryan (integration) / Kaushlendra (API); status: FIXED in this change; O-04 passes in this run
- Where: `cybercrime/backend/main.py:511 (catch-all OPTIONS route stops the slash redirect)`
- Steps:
  1. As an investigator, GET /api/v1/cases (no trailing slash).
- Expected: 200, or a 307 redirect to /api/v1/cases/.
- Fixed by: Hemanth on 2026-11-04 at the team's request; for review by Rajaryan and Kaushlendra
- Fix: Drop the catch-all OPTIONS route (CORSMiddleware already answers preflight) or register both path forms.

### CYB-08 - Evidence upload ignores the Bucket result; callers cannot see whether the sovereign copy exists

- Severity: MEDIUM; owner: Kaushlendra (data/API); status: FIXED in this change; S6-04 passes in this run
- Where: `cybercrime/backend/app/api/v1/endpoints/evidence.py:231-237`
- Steps:
  1. Upload evidence while the Bucket is unreachable; the response is identical to a successful Bucket store.
- Expected: The response states the Bucket outcome (stored / unavailable).
- Fixed by: Hemanth on 2026-11-04 at the team's request; for review by Kaushlendra
- Fix: Return the store_evidence_in_bucket result in the response.

### CYB-09 - Bucket API key is sent inside the JSON body

- Severity: MEDIUM; owner: Kaushlendra (data/API); status: FIXED in this change (no runtime check; verified by unit test test_bucket_key_travels_in_a_header_not_the_payload)
- Where: `cybercrime/backend/app/core/sovereign_integrations.py:165-166`
- Steps:
  1. Configure BHIV_BUCKET_API_KEY and upload evidence; the key travels in the payload that an append-only store may keep.
- Expected: Credentials travel only in a header.
- Fixed by: Hemanth on 2026-11-04 at the team's request; for review by Kaushlendra
- Fix: Send the key in an Authorization or X-API-Key header.

### CYB-10 - Unit test suite was not reproducible from a clean clone

- Severity: MEDIUM; owner: Hemanth (testing); status: FIXED in this change (no runtime check; verified by the unit suite running on a clean checkout (test_results/cyber_unit_tests.txt))
- Where: `cybercrime/backend (no conftest; tests relied on a local .env and a pre-filled database)`
- Steps:
  1. Fresh clone, run pytest -v in cybercrime/backend: 2 collection errors.
  2. With SECRET_KEY set and the non-test script test_predictions.py excluded: 29 passed, 1 failed.
- Expected: The suite runs the same everywhere.
- Fix: Fixed in this change: cybercrime/backend/conftest.py (throwaway key, isolated database, offline settings).

### CYB-11 - Frozen OpenAPI contract was missing /authz/check, /access/revoke and /tts/

- Severity: MEDIUM; owner: Kaushlendra (API contracts); status: FIXED in this change (no runtime check; verified by the regenerated cybercrime/openapi.yaml; the API's start-up drift check logged no warning in this run)
- Where: `cybercrime/openapi.yaml (89 paths before, 93 after regeneration)`
- Steps:
  1. Compare openapi.yaml with the routes the app serves; startup logged 'openapi.yaml is out of date'.
- Expected: The published contract lists every route.
- Fix: Fixed in this change: regenerated with scripts/generate_openapi.py.

### CYB-12 - Public health endpoint shows server file-system paths (seen in api_samples/O-01.json)

- Severity: LOW; owner: Kaushlendra (API); status: FIXED in this change; O-01 passes in this run
- Where: `cybercrime/backend/app/core/sovereign_integrations.py:325-350 (integration_health returns storage and buffer paths); GET /api/v1/system/health is public in cybercrime/rbac-permissions.json`
- Steps:
  1. GET /api/v1/system/health without a token; the body contains absolute storage paths.
- Expected: Public health returns status only; details (paths) need an authenticated operator.
- Fixed by: Hemanth on 2026-11-04 at the team's request; for review by Kaushlendra
- Fix: Drop paths from the public response or move the detailed view behind superadmin.

### CYB-13 - Protected access does not check scope or bind the caller to the subject; the VAJRA token is unscoped

- Severity: HIGH; owner: Rajaryan (integration) with Prakash (VAJRA contract); bridge by Hemanth; status: PARTLY FIXED in this change (S1-08 PASS in this run); still open: see details
- Still open: nothing binds the calling user to the VAJRA subject (needs a team decision); the evidence-only VAJRA token is supported, but VAJRA 3cc883f refuses it on evidence/record (VAJ-10), so the main run still sends the governance token; the '<action>:<resource type>' scope form is Cybersecurity's proposal, not yet agreed with VAJRA/TANTRA
- Where: `cybercrime/backend/app/api/v1/endpoints/protected_access.py (until 05 Nov, _decide used only VAJRA's GRANT/USE state and vajra.scope_checked was always false; since then _decide also requires the scope); the caller-to-subject link is still absent. VAJRA_TANTRA_SECRET also authorizes VAJRA transitions (server.go:277,279,284 at 07d683c)`
- Steps:
  1. Grant a subject with scope ['read:evidence'] in VAJRA.
  2. Ask /api/v1/protected/access for action 'download' on evidence: ALLOW until 05 Nov (VAJRA's verify returned no scope); since 05 Nov DENY VAJRA_SCOPE_NOT_GRANTED (S1-08).
  3. Still open: any investigator can ask about any subject (no link between the caller and the subject).
- Expected: ALLOW only for actions inside the granted scope, for a caller entitled to act for that subject.
- Fixed by: Hemanth on 2026-11-05 (his bridge), after VAJRA 3cc883f added scope to verify; for review by Rajaryan
- Fix: Done on 05 Nov for scope: ALLOW now also needs '<action>:<resource type>' in the scope VAJRA's verify reports (exact match, no wildcards; missing scope denies), and the bridge prefers VAJRA_CYBER_SECRET. Still needed: a caller-to-subject binding and an agreed scope vocabulary.

### CYB-14 - Every protected-access decision appends a permanent VAJRA row; there is no rate limit

- Severity: MEDIUM; owner: Rajaryan (integration); bridge by Hemanth; status: FIXED in this change (no runtime check; verified by unit test test_protected_access_is_rate_limited_per_caller)
- Where: `cybercrime/backend/app/api/v1/endpoints/protected_access.py (one VAJRA evidence record per non-duplicate request, ALLOW or DENY)`
- Steps:
  1. Send many protected-access requests with different trace ids; each one adds a row to VAJRA's append-only TruthStore.
  2. Together with CYB-01 (open self-registration) any stranger can do this.
- Expected: Rate limiting on the route (and CYB-01 fixed), or recording only decisions that matter to VAJRA.
- Fixed by: Hemanth on 2026-11-04 (his bridge); for review by Rajaryan
- Fix: Add a per-caller rate limit; agree with the VAJRA owner which decisions should be recorded.

### CYB-15 - Caller-supplied X-Trace-Id / X-Request-Id were echoed unvalidated in response headers and logs

- Severity: LOW; owner: Kaushlendra (API); status: FIXED in this change (no runtime check; verified by unit test test_malformed_trace_id_is_not_echoed)
- Where: `cybercrime/backend/main.py request_context_middleware and rbac_middleware`
- Steps:
  1. Send any request with X-Trace-Id containing spaces or control characters; the value came back in the response header.
- Expected: Only a safe id form is echoed; anything else is replaced by a fresh id.
- Fixed by: Hemanth on 2026-11-04 at the team's request; for review by Kaushlendra
- Fix: Fixed in this change: both middlewares accept ^[A-Za-z0-9._:-]{1,128}$ and otherwise mint a UUID (protected access still answers 400 INVALID_TRACE_ID). Unit test: test_lane_fixes.py.

## Cybersecurity (fraud-evidence-system)

| ID | Severity | Status | Title | Owner |
|---|---|---|---|---|
| FES-01 | MEDIUM | CONFIRMED (OFFLINE, Jest run 2; run 1 is in fraud_evidence_jest_run1.txt): recorded in test_results/fraud_evidence_jest_run2.txt | Fraud-evidence backend: 11 of 40 Jest tests fail; a first run fails 20 | UNKNOWN (fraud-evidence backend; not named in the task documents) |

### FES-01 - Fraud-evidence backend: 11 of 40 Jest tests fail; a first run fails 20

- Severity: MEDIUM; owner: UNKNOWN (fraud-evidence backend; not named in the task documents); status: CONFIRMED (OFFLINE, Jest run 2; run 1 is in fraud_evidence_jest_run1.txt): recorded in test_results/fraud_evidence_jest_run2.txt
- Where: `fraud-evidence-system/Backend/tests/evidence.integration.test.js`
- Steps:
  1. cd fraud-evidence-system/Backend && npm ci && npx jest --forceExit (run it twice: the first run can time out in beforeAll).
- Expected: All tests pass, or failures are fixed or marked as known.
- Suggested fix: Run 2: 11 failed, 29 passed; the 11 names are in the raw output and include the rate-limit test, which also failed in run 1 and is listed in PHASE_4_FAILURE_ANALYSIS.md (#13). Run 1: 20 failed because beforeAll (MongoMemoryServer.create) exceeded Jest's 5 s hook timeout; why it was slow was not established (the MongoDB binary was already cached by npm ci). 'should return specific evidence', listed as failing in PHASE_4_TEST_RESULTS.md, passed in run 2.

## VAJRA

| ID | Severity | Status | Title | Owner |
|---|---|---|---|---|
| VAJ-01 | HIGH | PARTLY FIXED by the owner in VAJRA 3cc883f; CODE-VERIFIED (found by reading code or repository state; no runtime check) | Integration docs give the API at port 4000, which is the P2P port | Prakash (VAJRA) |
| VAJ-02 | HIGH | FIXED by the owner in VAJRA 3cc883f; S7-05 passes in this run | Authority state (GRANT/USE/REVOKE...) is lost when the node restarts | Prakash (VAJRA) / Samsoorya (runtime) |
| VAJ-03 | LOW | PARTLY FIXED by the owner in VAJRA 3cc883f; CODE-VERIFIED (found by reading code or repository state; no runtime check) | Evidence fields other than trace_id and action_taken cannot be read back (they are bound only by the hash) | Prakash (VAJRA) |
| VAJ-04 | MEDIUM | FIXED by the owner in VAJRA 3cc883f (CODE-VERIFIED) | The '4 mandatory proofs' are partly scripted text; pass totals are hard-coded | Prakash (VAJRA) |
| VAJ-05 | MEDIUM | NOT FIXED in VAJRA 3cc883f (reported fixed by the owner); CONFIRMED at runtime by V-06 | Recovery package uses placeholder signatures; anchor check only counts strings | Prakash (VAJRA) / Samsoorya (recovery) |
| VAJ-06 | HIGH | FIXED by the owner in VAJRA 3cc883f; V-01 passes in this run | Permission grant, wallet freeze and token-mint routes run without any login | Prakash (VAJRA) |
| VAJ-07 | HIGH | PARTLY FIXED by the owner in VAJRA 3cc883f; CONFIRMED at runtime by V-04 | Permission ids collide (ids do not identify one grant); revoke by id can hit the wrong subject | Prakash (VAJRA) |
| VAJ-08 | LOW | FIXED by the owner in VAJRA 3cc883f (CODE-VERIFIED) | Proof runner script references a file that does not exist | Prakash (VAJRA) |
| VAJ-09 | LOW | PARTLY FIXED by the owner in VAJRA 3cc883f; CODE-VERIFIED (found by reading code or repository state; no runtime check) | Integration package examples send no Authorization header, but those routes now return 401 without it | Prakash (VAJRA) |
| VAJ-10 | HIGH | CONFIRMED at runtime by S6-05, V-03 | The evidence-only token is refused by evidence/record, the one route it is meant for | Prakash (VAJRA) |
| VAJ-11 | HIGH | CONFIRMED at runtime by V-03 | The 'evidence-only' token can still grant and revoke permissions and reach admin submit-transaction | Prakash (VAJRA) |
| VAJ-12 | MEDIUM | CONFIRMED at runtime by V-05 | Scope in verify is the scope of the latest transition: a later USE can widen or erase what was granted | Prakash (VAJRA) |
| VAJ-13 | HIGH | CONFIRMED at runtime by V-08 | Authority ledger: a revocation can be undone by a restart; edited lines are trusted; one bad line wipes all state | Prakash (VAJRA) / Samsoorya (runtime) |
| VAJ-14 | HIGH | CONFIRMED at runtime by V-07 | One anonymous report can freeze any wallet; a negative severity can hide reports | Prakash (VAJRA) |

### VAJ-01 - Integration docs give the API at port 4000, which is the P2P port

- Severity: HIGH; owner: Prakash (VAJRA); status: PARTLY FIXED by the owner in VAJRA 3cc883f; CODE-VERIFIED (found by reading code or repository state; no runtime check)
- Still open after VAJRA 3cc883f: review_packets/CYBER-BIQOS-10DAY/deployment_proof/deployment_proof.md:48-54 still uses localhost:4000 (VAJRA_EXTERNAL_INTEGRATION_PACKAGE.md:7 now says 8080)
- Where: `at 07d683c: bhiv-VAJRA_Blockchain/VAJRA_EXTERNAL_INTEGRATION_PACKAGE.md:7; start_blockchain.bat:13; cmd/relay/main.go:229-247`
- Steps:
  1. Start the node as documented; the HTTP API listens on HTTP_PORT (default 8080), not 4000.
- Expected: Docs name the HTTP API port.
- Suggested fix: Change the base URL in the integration package and review packet to the HTTP port.

### VAJ-02 - Authority state (GRANT/USE/REVOKE...) is lost when the node restarts

- Severity: HIGH; owner: Prakash (VAJRA) / Samsoorya (runtime); status: FIXED by the owner in VAJRA 3cc883f; S7-05 passes in this run
- Owner fix verified by: S7-05 (state and scope survive a restart)
- Note: the new ledger file has its own problems: see VAJ-13
- Where: `at 07d683c: core/relay-chain/authority/lifecycle.go:91-105 (in-memory map); at 3cc883f: NewManagerWithPath and loadFromFile (lifecycle.go:110-153), api/server.go:98-106`
- Steps:
  1. GRANT then USE a subject.
  2. Restart the node.
  3. GET /api/vajra/authority/verify?subject=...
- Expected: State and history survive a restart.
- Suggested fix: Persist authority records (the hash chain already exists) and reload them at start.

### VAJ-03 - Evidence fields other than trace_id and action_taken cannot be read back (they are bound only by the hash)

- Severity: LOW; owner: Prakash (VAJRA); status: PARTLY FIXED by the owner in VAJRA 3cc883f; CODE-VERIFIED (found by reading code or repository state; no runtime check)
- Still open after VAJRA 3cc883f: hash-only storage is stated in a code comment (api/vajra_handlers.go:204) but not in VAJRA_EXTERNAL_INTEGRATION_PACKAGE.md, which integrators read
- Where: `core/relay-chain/api/vajra_handlers.go:301-314 at 07d683c (311-327 at 3cc883f) (evidence_hash = SHA-256 of the full request; the row stores trace_id, the hash and action_taken)`
- Steps:
  1. POST /api/vajra/evidence/record with all fields.
  2. GET /api/tantra/records: the row has trace_id, the hash and fraud_decision; actor, severity, threat type and details are not readable (they are committed through evidence_hash).
- Expected: Either the fields are readable for audit, or the contract says clearly that only the hash is kept.
- Suggested fix: Document hash-only storage in the integration package, or store the fields alongside the hash.

### VAJ-04 - The '4 mandatory proofs' are partly scripted text; pass totals are hard-coded

- Severity: MEDIUM; owner: Prakash (VAJRA); status: FIXED by the owner in VAJRA 3cc883f (CODE-VERIFIED)
- Owner fix verified by: read at 3cc883f: authority/mandatory_proofs_runner.go:177,185-186 label the scripted steps [SIMULATED ...]; :461-475 count passes from each proof's status
- Note: a failed proof aborts the whole report (mandatory_proofs_runner.go:419-442), so a report that exists always says 5 of 5; the count is honest but cannot show a partial result
- Where: `at 07d683c: core/relay-chain/authority/mandatory_proofs_runner.go:177,185-186 (detection, correlation and TANTRA approval are log strings, not labelled simulated), :243 (node failure, labelled simulated), :464-465 (TotalProofs/PassedProofs = 5)`
- Steps:
  1. Read the runner: detection, correlation and TANTRA approval are log strings, not calls; the totals are constants.
- Expected: Proofs call the real components, or label those steps SIMULATED; totals are counted.
- Suggested fix: Label simulated steps and count passed proofs from the actual results.

### VAJ-05 - Recovery package uses placeholder signatures; anchor check only counts strings

- Severity: MEDIUM; owner: Prakash (VAJRA) / Samsoorya (recovery); status: NOT FIXED in VAJRA 3cc883f (reported fixed by the owner); CONFIRMED at runtime by V-06
- Where: `core/relay-chain/api/vajra_handlers.go:358-361 (3cc883f: '<validator>_sig_ed25519_' + 8 bytes of SHA-256 over public data - not a signature); authority/recovery.go:128 (still counts strings); authority/mandatory_proofs_runner.go:251 (still 'val1_sig'...)`
- Steps:
  1. GET /api/vajra/recovery/package: signatures are 'val1_sig'...'val4_sig' (07d683c) or 'val1_sig_ed25519_<16 hex>' (3cc883f): anyone can compute them; no key signs anything.
  2. POST /api/vajra/recovery/verify-anchor with the public genesis id and four made-up signature strings: qualified=true (V-06).
- Expected: Real validator signatures that are cryptographically verified.
- Actual (this run): a candidate with four made-up signatures is not qualified as recovery anchor: expected False, got True
- Suggested fix: Sign checkpoints with validator keys and verify the signatures in VerifySurvivingNode.

### VAJ-06 - Permission grant, wallet freeze and token-mint routes run without any login

- Severity: HIGH; owner: Prakash (VAJRA); status: FIXED by the owner in VAJRA 3cc883f; V-01 passes in this run
- Owner fix verified by: V-01 (7 routes answer 401 without a token)
- Note: a wallet can still be frozen without a token through /api/cybercrime/report: see VAJ-14
- Where: `at 07d683c: core/relay-chain/api/server.go:127 (/api/admin/add-tokens), :154-156 (/api/v1/permission/*), :292 (/api/cybercrime/freeze) - wrapped with enableCORS, not enableCORSWithAuth; at 3cc883f wrapped with enableCORSWithAuth (:135-136, :162-164, :300-301)`
- Steps:
  1. On a local node, POST /api/admin/add-tokens, /api/v1/permission/grant and /api/cybercrime/freeze with no Authorization header.
  2. permission/grant creates a GRANT (201) and cybercrime/freeze answers success (200). add-tokens also runs (200); in this run it reported 'token BHX not found' because the test used a token name that does not exist, so no mint was shown.
- Expected: 401/403 without credentials.
- Recorded replies ([api_samples/V-01.json](../api_samples/V-01.json)):
  - `POST /api/admin/add-tokens` -> 401: `{"error":"UNAUTHORIZED","message":"Missing or malformed Authorization: Bearer [REDACTED]"}`
  - `POST /api/v1/permission/grant` -> 401: `{"error":"UNAUTHORIZED","message":"Missing or malformed Authorization: Bearer [REDACTED]"}`
  - `POST /api/cybercrime/freeze` -> 401: `{"error":"UNAUTHORIZED","message":"Missing or malformed Authorization: Bearer [REDACTED]"}`
  - `POST /api/cybercrime/unfreeze` -> 401: `{"error":"UNAUTHORIZED","message":"Missing or malformed Authorization: Bearer [REDACTED]"}`
  - `POST /api/admin/submit-transaction` -> 401: `{"error":"UNAUTHORIZED","message":"Missing or malformed Authorization: Bearer [REDACTED]"}`
  - `POST /api/v1/permission/revoke` -> 401: `{"error":"UNAUTHORIZED","message":"Missing or malformed Authorization: Bearer [REDACTED]"}`
  - `POST /api/v1/permission/check` -> 401: `{"error":"UNAUTHORIZED","message":"Missing or malformed Authorization: Bearer [REDACTED]"}`
- Suggested fix: Wrap these routes with enableCORSWithAuth (or remove admin routes from public builds).

### VAJ-07 - Permission ids collide (ids do not identify one grant); revoke by id can hit the wrong subject

- Severity: HIGH; owner: Prakash (VAJRA); status: PARTLY FIXED by the owner in VAJRA 3cc883f; CONFIRMED at runtime by V-04
- Still open after VAJRA 3cc883f: our original case passes (V-02), but the subject is still cut to 12 characters and is not in the hashed input, so two subjects with the same first 12 characters, granted by the same requester for the same scope in the same second, get one id; the second grant replaces the first in the id map, so revoking A's id revokes B and A stays allowed (V-04)
- Where: `core/relay-chain/permission/permission.go:110 at 07d683c (cut to 24 characters); at 3cc883f :110-115 (subject cut to 12 characters, hash input requester:scope:seconds without the subject) and :141 (m.permissions[permID] = record overwrites)`
- Steps:
  1. 07d683c: grant two permissions for one long subject with different requesters; both get the same id (V-02).
  2. 3cc883f: grant subjects 'cyber-p0-test-collide-a-...' and 'cyber-p0-test-collide-b-...' with the same requester and scope in one second; both get the same id. Revoke that id; check both subjects (V-04).
- Expected: Different grants get different ids, and a revoke by id affects only that grant.
- Actual (this run): the two grants get different permission ids: expected 'different', got 'perm-cyber-p0-tes-44fe0dcbd77f16e3 / perm-cyber-p0-tes-44fe0dcbd77f16e3'; revoking subject A's permission id denies subject A: expected False, got True; revoking subject A's permission id leaves subject B allowed: expected True, got False
- Suggested fix: Derive the id from all identifying fields plus a random or sequence part (for example perm-<uuid4>), and refuse to overwrite an existing id. Severity raised from MEDIUM on 05 Nov: the revoke now shown to hit the wrong subject.

### VAJ-08 - Proof runner script references a file that does not exist

- Severity: LOW; owner: Prakash (VAJRA); status: FIXED by the owner in VAJRA 3cc883f (CODE-VERIFIED)
- Owner fix verified by: read at 3cc883f: run_cyber_biqos_10day_proofs.bat:22 now runs 'go test -v -run TestVajra ./api/...'; that test set passes here (test_results/vajra_go_tests.txt)
- Where: `run_cyber_biqos_10day_proofs.bat:22 (api/api_test_helpers.go missing; the fallback always runs)`
- Steps:
  1. Run the .bat; step 2's first command always fails and the fallback runs.
- Expected: The script runs the intended command.
- Suggested fix: Use: go test -v -run TestVajra ./api/...

### VAJ-09 - Integration package examples send no Authorization header, but those routes now return 401 without it

- Severity: LOW; owner: Prakash (VAJRA); status: PARTLY FIXED by the owner in VAJRA 3cc883f; CODE-VERIFIED (found by reading code or repository state; no runtime check)
- Still open after VAJRA 3cc883f: the samples now send an Authorization header, but the evidence/record sample says '<VAJRA_TANTRA_SECRET_OR_CYBER_SECRET>' and the cyber token is refused there (VAJ-10); the package still does not say who issues or rotates the two fixed token values the relay compares (server.go:380-439), or what the cyber tier may do. VAJRA's repository also has an RS256 JWT engine (security/jwt_handler.py, used by its Python services), which the Go relay's gate does not use
- Where: `at 07d683c: VAJRA_EXTERNAL_INTEGRATION_PACKAGE.md:64-78 (evidence/record curl), :178-205 (authority/transition curls); core/relay-chain/api/server.go:372-406 (bearer gate; :380-439 at 3cc883f)`
- Steps:
  1. Copy a documented curl for /api/vajra/evidence/record; it returns 401.
- Expected: Docs show the required 'Authorization: Bearer <VAJRA_TANTRA_SECRET>' header and how callers obtain it.
- Suggested fix: Update the samples and say who issues the token.

### VAJ-10 - The evidence-only token is refused by evidence/record, the one route it is meant for

- Severity: HIGH; owner: Prakash (VAJRA); status: CONFIRMED at runtime by S6-05, V-03
- Where: `core/relay-chain/api/vajra_handlers.go:241-252 (handleVajraEvidenceRecord checks the bearer again and accepts only VAJRA_TANTRA_SECRET); VAJRA's own test (vajra_handlers_test.go:231-272) covers only authority/transition`
- Steps:
  1. Start a node with VAJRA_TANTRA_SECRET and VAJRA_CYBER_SECRET set (both are needed in a real deployment).
  2. POST /api/vajra/evidence/record with 'Authorization: Bearer <VAJRA_CYBER_SECRET>': 401 'Authorization: Bearer <VAJRA_TANTRA_SECRET> required' (V-03).
  3. Cybersecurity configured with only the evidence-only token: the evidence write fails, so an in-scope request is denied with VAJRA_EVIDENCE_NOT_RECORDED (S6-05; it fails closed).
- Expected: evidence/record accepts the evidence-only token (step 4 of VAJRA's own re-verification steps).
- Actual (this run): evidence/record with the evidence-only token is stored: expected '200, success=true', got '401: {"details":"Authorization: Bearer <VAJRA_TANTRA_SECRET> required","error":"UNAUTHORIZED","success":false}'; permission/grant with the evidence-only token is refused: expected '401 or 403', got '201, handler ran: {"commitment":"b817965201a52c904464c855ec02696aa7abba76666917926c0349f13414e9c7","permission_id":"perm-cyber-p0-tes-c33664cb93316277","record":{"permission_id":'; permission/revoke with the evidence-only token is refused: expected '401 or 403', got '200, handler ran: {"permission_id":"perm-cyber-p0-tes-c33664cb93316277","record":{"permission_id":"perm-cyber-p0-tes-c33664cb93316277","trace_id":"62f46ae6-4487-4b96-a614-c58fb09'; admin/submit-transaction with the evidence-only token is refused: expected '401 or 403', got '200, handler ran: {"error":"Invalid request format","success":false}'
- Recorded replies ([api_samples/V-03.json](../api_samples/V-03.json)):
  - `POST /api/vajra/evidence/record` -> 401: `{"details":"Authorization: Bearer <VAJRA_TANTRA_SECRET> required","error":"UNAUTHORIZED","success":false}`
  - `POST /api/vajra/authority/transition` -> 403: `{"error":"FORBIDDEN","message":"Cybersecurity token is restricted to evidence-only; authority transitions require TANTRA governance token."}`
  - `POST /api/admin/add-tokens` -> 403: `{"error":"FORBIDDEN","message":"Cybersecurity token is restricted to evidence-only; authority transitions require TANTRA governance token."}`
  - `POST /api/v1/permission/grant` -> 201: `{"commitment":"b817965201a52c904464c855ec02696aa7abba76666917926c0349f13414e9c7","permission_id":"perm-cyber-p0-tes-c33664cb93316277","record":{"permission_id":"perm-cyber-p0-tes-c33664cb93316277","tr`
  - `POST /api/v1/permission/grant` -> 201: `{"commitment":"f31f7aa3c8f18d310fcca3d8314656ce25f2ab9c8a420e2093921d9a683b8ad3","permission_id":"perm-cyber-p0-tes-c33664cb93316277","record":{"permission_id":"perm-cyber-p0-tes-c33664cb93316277","tr`
  - `POST /api/v1/permission/revoke` -> 200: `{"permission_id":"perm-cyber-p0-tes-c33664cb93316277","record":{"permission_id":"perm-cyber-p0-tes-c33664cb93316277","trace_id":"62f46ae6-4487-4b96-a614-c58fb09f5f14","subject":"cyber-p0-test-governan`
  - `POST /api/admin/submit-transaction` -> 200: `{"error":"Invalid request format","success":false}`
  - `POST /api/cybercrime/freeze` -> 200: `{"success":true}`
  - `POST /api/cybercrime/unfreeze` -> 200: `{"success":true}`
- Suggested fix: Accept VAJRA_CYBER_SECRET in handleVajraEvidenceRecord (or drop the second check, since enableCORSWithAuth already authenticates) and add a test that records evidence with the cyber token while VAJRA_TANTRA_SECRET is set.

### VAJ-11 - The 'evidence-only' token can still grant and revoke permissions and reach admin submit-transaction

- Severity: HIGH; owner: Prakash (VAJRA); status: CONFIRMED at runtime by V-03
- Where: `core/relay-chain/api/server.go:412-424 (the cyber token is refused only on /api/vajra/authority/transition and /api/admin/add-tokens; every other enableCORSWithAuth route accepts it: :136, :162-164, :292, :300-301)`
- Steps:
  1. With 'Authorization: Bearer <VAJRA_CYBER_SECRET>': POST /api/v1/permission/grant -> 201 GRANTED; POST /api/v1/permission/revoke on a grant made with the governance token -> 200; POST /api/admin/submit-transaction (malformed body) -> 200 from the handler, so the token passed (V-03).
- Expected: An evidence-only token reaches only the evidence routes; consent changes and admin transactions are refused.
- Actual (this run): evidence/record with the evidence-only token is stored: expected '200, success=true', got '401: {"details":"Authorization: Bearer <VAJRA_TANTRA_SECRET> required","error":"UNAUTHORIZED","success":false}'; permission/grant with the evidence-only token is refused: expected '401 or 403', got '201, handler ran: {"commitment":"b817965201a52c904464c855ec02696aa7abba76666917926c0349f13414e9c7","permission_id":"perm-cyber-p0-tes-c33664cb93316277","record":{"permission_id":'; permission/revoke with the evidence-only token is refused: expected '401 or 403', got '200, handler ran: {"permission_id":"perm-cyber-p0-tes-c33664cb93316277","record":{"permission_id":"perm-cyber-p0-tes-c33664cb93316277","trace_id":"62f46ae6-4487-4b96-a614-c58fb09'; admin/submit-transaction with the evidence-only token is refused: expected '401 or 403', got '200, handler ran: {"error":"Invalid request format","success":false}'
- Recorded replies ([api_samples/V-03.json](../api_samples/V-03.json)):
  - `POST /api/vajra/evidence/record` -> 401: `{"details":"Authorization: Bearer <VAJRA_TANTRA_SECRET> required","error":"UNAUTHORIZED","success":false}`
  - `POST /api/vajra/authority/transition` -> 403: `{"error":"FORBIDDEN","message":"Cybersecurity token is restricted to evidence-only; authority transitions require TANTRA governance token."}`
  - `POST /api/admin/add-tokens` -> 403: `{"error":"FORBIDDEN","message":"Cybersecurity token is restricted to evidence-only; authority transitions require TANTRA governance token."}`
  - `POST /api/v1/permission/grant` -> 201: `{"commitment":"b817965201a52c904464c855ec02696aa7abba76666917926c0349f13414e9c7","permission_id":"perm-cyber-p0-tes-c33664cb93316277","record":{"permission_id":"perm-cyber-p0-tes-c33664cb93316277","tr`
  - `POST /api/v1/permission/grant` -> 201: `{"commitment":"f31f7aa3c8f18d310fcca3d8314656ce25f2ab9c8a420e2093921d9a683b8ad3","permission_id":"perm-cyber-p0-tes-c33664cb93316277","record":{"permission_id":"perm-cyber-p0-tes-c33664cb93316277","tr`
  - `POST /api/v1/permission/revoke` -> 200: `{"permission_id":"perm-cyber-p0-tes-c33664cb93316277","record":{"permission_id":"perm-cyber-p0-tes-c33664cb93316277","trace_id":"62f46ae6-4487-4b96-a614-c58fb09f5f14","subject":"cyber-p0-test-governan`
  - `POST /api/admin/submit-transaction` -> 200: `{"error":"Invalid request format","success":false}`
  - `POST /api/cybercrime/freeze` -> 200: `{"success":true}`
  - `POST /api/cybercrime/unfreeze` -> 200: `{"success":true}`
- Suggested fix: Use an allow-list for the cyber token (evidence/record, plus anything else agreed) instead of a deny-list of two paths.

### VAJ-12 - Scope in verify is the scope of the latest transition: a later USE can widen or erase what was granted

- Severity: MEDIUM; owner: Prakash (VAJRA); status: CONFIRMED at runtime by V-05
- Where: `core/relay-chain/authority/lifecycle.go:243 (subjectRecord = latest record; GetSubjectInfo returns its scope); Transition accepts any scope on any transition (no comparison with the GRANT scope)`
- Steps:
  1. GRANT a subject with scope ['read:evidence'], then USE with scope [] -> verify reports [] (V-05).
  2. GRANT ['read:evidence'], then USE ['read:evidence','delete:evidence'] -> verify reports both; Cybersecurity then allows delete:evidence, which was never granted (V-05 note).
- Expected: The scope granted at GRANT stays until a new GRANT; a later transition cannot widen it.
- Actual (this run): a USE sent without scope keeps the scope granted at GRANT: expected ['read:evidence'], got []; a USE sent with a wider scope does not widen the grant: expected ['read:evidence'], got ['read:evidence', 'delete:evidence']
- Suggested fix: Keep the GRANT scope as the subject's scope, and refuse or ignore a different scope on later transitions (or document that each transition re-states the scope, and who may widen it).

### VAJ-13 - Authority ledger: a revocation can be undone by a restart; edited lines are trusted; one bad line wipes all state

- Severity: HIGH; owner: Prakash (VAJRA) / Samsoorya (runtime); status: CONFIRMED at runtime by V-08
- Where: `core/relay-chain/authority/lifecycle.go:246-255 (write errors ignored; the transition still succeeds), :127-152 (loadFromFile trusts each line; prev_hash/entry_hash are not checked, although the same file has VerifyChain()), :261-268 (CalculateHash leaves out the scope, so an edited scope would pass even a chain check), api/server.go:102-106 (any load error -> in-memory manager: nothing is loaded and nothing is saved from then on)`
- Steps:
  1. GRANT, USE, then REVOKE a subject while the ledger file cannot be written: REVOKE answers 200; after a restart the subject is USE and authorized again (V-08).
  2. Edit the REVOKE line to USE in authority_ledger.jsonl and restart: the subject is USE and authorized (V-08).
  3. Append one unreadable line and restart: every subject's state is gone, and a GRANT accepted afterwards is not written to the ledger file (V-08).
- Expected: A transition that cannot be saved fails (and does not change state); the hash chain, including the scope, is checked on reload; a damaged ledger stops the node (fail closed) or is reported, never silently replaced by an empty one.
- Actual (this run): a REVOKE record edited to USE on disk is not trusted after restart: expected 'still REVOKE, or the node refuses the edited ledger', got 'after restart: USE, is_authorized=True'; a REVOKE that could not be saved is not answered as done: expected 'an error reply, or REVOKE after restart', got 'REVOKE reply HTTP 200; after restart: USE, is_authorized=True'; one unreadable line neither wipes the stored state nor stops saving: expected 'earlier subject USE and the new GRANT kept, or the node refuses to start', got "earlier subject ''; new subject after another restart ''"
- Suggested fix: Return an error and roll back when the append (and fsync) fails; call VerifyChain() after loading and refuse to start on a failure or a load error, instead of falling back to memory-only; include the scope in CalculateHash.

### VAJ-14 - One anonymous report can freeze any wallet; a negative severity can hide reports

- Severity: HIGH; owner: Prakash (VAJRA); status: CONFIRMED at runtime by V-07
- Where: `core/relay-chain/api/server.go:298 (/api/cybercrime/report without login); api/cybercrime_handlers.go:55 (severity is any int the caller sends), :41 and :86 (auto-freeze when the sum reaches 15)`
- Steps:
  1. POST /api/cybercrime/report with no token and severity 15: the wallet is frozen by SYSTEM_AUTO_FREEZE (V-07).
  2. Report severity -1000, then two reports of 10: the sum is -980 and the wallet stays active (V-07).
- Expected: Only an authenticated, bounded report counts, and reports alone do not freeze a wallet without review.
- Actual (this run): one report without a token, severity 15, does not freeze the wallet: expected 'wallet not frozen', got 'report HTTP 200; wallet frozen (by SYSTEM_AUTO_FREEZE)'; a report with severity -1000 cannot cancel two later reports of 10 (freeze threshold 15): expected 'wallet frozen', got 'wallet active, total severity -980'
- Suggested fix: Require login on report, bound severity (for example 1-10), count distinct authenticated reporters, and keep freezing behind the authenticated freeze route. This bypasses the VAJ-06 fix for freeze.

## TANTRA

| ID | Severity | Status | Title | Owner |
|---|---|---|---|---|
| TAN-01 | HIGH | NOT TESTED in this run (S5-01 SKIPPED) | No TANTRA contract exists for cybersecurity events | TANTRA team (owner name UNKNOWN) |
| TAN-02 | HIGH | CODE-VERIFIED (found by reading code or repository state; no runtime check) | TANTRA repository has no service code: four submodule links with no .gitmodules | TANTRA team (owner name UNKNOWN) |
| TAN-03 | HIGH | CODE-VERIFIED (found by reading code or repository state; no runtime check) | A .env file is committed to the TANTRA repository | TANTRA team (owner name UNKNOWN) |
| TAN-04 | MEDIUM | CODE-VERIFIED (found by reading code or repository state; no runtime check) | No test lane for TANTRA's governed enforcement path | TANTRA team (owner name UNKNOWN) |
| TAN-06 | MEDIUM | CONFIRMED (live reply to the single probe write, run 20261104T103939Z): recorded in previous_runs/20261104T103939Z/api_samples/S8-02.json | PRANA's onward write to the Bucket fails: 400 'parent_hash required (not first artifact)' | TANTRA team (owner name UNKNOWN) |

### TAN-01 - No TANTRA contract exists for cybersecurity events

- Severity: HIGH; owner: TANTRA team (owner name UNKNOWN); status: NOT TESTED in this run (S5-01 SKIPPED)
- Where: `live TANTRA validation layer :8101 /validate/prana/ingress (registry prana.event.contracts)`
- Steps:
  1. POST a 'security_decision' envelope to /validate/prana/ingress.
  2. Reply: 422 event_type_not_registered, with the list of registered types.
- Expected: A registered contract (schema + version) for cybersecurity decisions, so they can enter the TANTRA ledger.
- Suggested fix: Register a 'security_decision' event type (or name the registered type Cybersecurity should use).

### TAN-02 - TANTRA repository has no service code: four submodule links with no .gitmodules

- Severity: HIGH; owner: TANTRA team (owner name UNKNOWN); status: CODE-VERIFIED (found by reading code or repository state; no runtime check)
- Where: `bhiv-TANTRA_Layer: Karma-Tracker, bhiv-karma-helper, bhiv-prana, bhiv-validation-layer (git mode 160000, no .gitmodules)`
- Steps:
  1. git clone the repo; the four folders are empty and cannot be fetched.
- Expected: Service code (or reachable submodules) so TANTRA can be built and tested outside the live VM.
- Suggested fix: Add .gitmodules with reachable URLs, or vendor the services.

### TAN-03 - A .env file is committed to the TANTRA repository

- Severity: HIGH; owner: TANTRA team (owner name UNKNOWN); status: CODE-VERIFIED (found by reading code or repository state; no runtime check)
- Where: `bhiv-TANTRA_Layer/.env (tracked; contents not opened by us)`
- Steps:
  1. git ls-files shows .env.
- Expected: No .env in git.
- Suggested fix: Remove it from git, add it to .gitignore, rotate anything it contained.

### TAN-04 - No test lane for TANTRA's governed enforcement path

- Severity: MEDIUM; owner: TANTRA team (owner name UNKNOWN); status: CODE-VERIFIED (found by reading code or repository state; no runtime check)
- Where: `live karma :8102 /intelligence/sarathi/enforce ('Forward signal enforcement request to Sarathi Policy Enforcement Layer') and /intelligence/rajya/validate ('Forward authority validation request to RAJYA Authority Validation Layer'), per TANTRA's OpenAPI`
- Steps:
  1. These routes forward to other live systems (policy enforcement, authority validation); there is no dry-run flag or test prefix, so we did not call them. Whether rajya/validate is the approval contract for security responses is UNKNOWN.
- Expected: A safe way to test 'authorize or deny a bounded response' (dry-run flag or agreed test prefix).
- Suggested fix: Add a dry-run/test-prefix mode like VAJRA's test_probe_.

### TAN-06 - PRANA's onward write to the Bucket fails: 400 'parent_hash required (not first artifact)'

- Severity: MEDIUM; owner: TANTRA team (owner name UNKNOWN); status: CONFIRMED (live reply to the single probe write, run 20261104T103939Z): recorded in previous_runs/20261104T103939Z/api_samples/S8-02.json
- Where: `live TANTRA /karma/ingest reply, field prana.bucket.propagation (PRANA forwarding to the Bucket's artifact endpoint)`
- Steps:
  1. POST a valid integrity_probe envelope (it passes /validate) to /karma/ingest.
  2. The reply says prana.status 'forwarded', but prana.bucket.status 'failed': HTTP 400 'Artifact validation failed: parent_hash required (not first artifact)', reported together with a 5 s read timeout.
- Expected: Events that PRANA forwards reach the Bucket, or the caller is told what it must supply.
- Suggested fix: Have PRANA send the parent hash the Bucket requires, or document what the submitter must include.

## Bucket (owner UNKNOWN)

| ID | Severity | Status | Title | Owner |
|---|---|---|---|---|
| TAN-05 | MEDIUM | CONFIRMED (live read-only GET at 07:48Z, before the run): recorded in api_samples/outside_run/live_probe_20261104T074845Z.txt | Bucket health reports 'degraded' (redis disconnected) | Bucket owner (UNKNOWN; sent to the TANTRA team to forward) |

### TAN-05 - Bucket health reports 'degraded' (redis disconnected)

- Severity: MEDIUM; owner: Bucket owner (UNKNOWN; sent to the TANTRA team to forward); status: CONFIRMED (live read-only GET at 07:48Z, before the run): recorded in api_samples/outside_run/live_probe_20261104T074845Z.txt
- Where: `live https://bhiv-bucket-i1l6.onrender.com/health (GET, 2026-11-04T07:48:51Z)`
- Steps:
  1. GET /health on the Bucket.
- Expected: healthy
- Suggested fix: Restore the Bucket's redis connection.
