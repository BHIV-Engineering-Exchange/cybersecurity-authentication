# Defects found by the P0 verification

Generated from `verification/defects.py`, this run's `results.json` and the recorded files it names. A defect is CONFIRMED only when recorded evidence shows it: its check failed, its check passed because the peer refused (for example a contract gate), or a named recorded file contains it. CODE-VERIFIED means it was found by reading code or repository state. Owners follow the lanes named in the task documents.

## Cybersecurity

| ID | Severity | Status | Title | Owner |
|---|---|---|---|---|
| CYB-01 | CRITICAL | CONFIRMED at runtime by S1-04 | Anyone can self-register and immediately read investigator data | Kaushlendra (auth/authz) |
| CYB-02 | HIGH | CONFIRMED at runtime by S2-04 | Tier-1 'permission_revocation' reports REVOKED but changes nothing | Kaushlendra (access control) |
| CYB-06 | CRITICAL | CONFIRMED at runtime by S3-03 | Wallet analysis invents transactions and a fraud verdict for any wallet | Shivam (security intelligence) |
| CYB-03 | MEDIUM | CONFIRMED at runtime by S3-01 | Intelligence output has no confidence or uncertainty field | Shivam (security intelligence) |
| CYB-04 | HIGH | CONFIRMED at runtime by P-C1 | Failed logins are not recorded as security events | Kaushlendra (auth); consumed by Shivam/Aryan |
| CYB-05 | MEDIUM | CONFIRMED at runtime by P-C1 | Login errors reveal whether an account exists | Kaushlendra (auth) |
| CYB-07 | LOW | CONFIRMED at runtime by O-04 | Collection routes without a trailing slash return 405 for authorised users | Rajaryan (integration) / Kaushlendra (API) |
| CYB-08 | MEDIUM | CODE-VERIFIED (found by reading code or repository state; no runtime check) | Evidence upload ignores the Bucket result; callers cannot see whether the sovereign copy exists | Kaushlendra (data/API) |
| CYB-09 | MEDIUM | CODE-VERIFIED (found by reading code or repository state; no runtime check) | Bucket API key is sent inside the JSON body | Kaushlendra (data/API) |
| CYB-10 | MEDIUM | FIXED in this change | Unit test suite was not reproducible from a clean clone | Hemanth (testing) |
| CYB-11 | MEDIUM | FIXED in this change | Frozen OpenAPI contract was missing /authz/check, /access/revoke and /tts/ | Kaushlendra (API contracts) |
| CYB-12 | LOW | CONFIRMED (this run's health reply): recorded in api_samples/O-01.json | Public health endpoint shows server file-system paths (seen in api_samples/O-01.json) | Kaushlendra (API) |
| CYB-13 | HIGH | CODE-VERIFIED (found by reading code or repository state; no runtime check) | Protected access does not check scope or bind the caller to the subject; the VAJRA token is unscoped | Rajaryan (integration) with Prakash (VAJRA contract); bridge by Hemanth |
| CYB-14 | MEDIUM | CODE-VERIFIED (found by reading code or repository state; no runtime check) | Every protected-access decision appends a permanent VAJRA row; there is no rate limit | Rajaryan (integration); bridge by Hemanth |

### CYB-01 - Anyone can self-register and immediately read investigator data

- Severity: CRITICAL; owner: Kaushlendra (auth/authz); status: CONFIRMED at runtime by S1-04
- Where: `cybercrime/backend/app/api/v1/endpoints/auth.py:19-41 (register sets role=investigator, active); cybercrime/rbac-permissions.json (public POST /api/v1/auth/register)`
- Steps:
  1. POST /api/v1/auth/register with any email and password (no login).
  2. POST /api/v1/auth/login with the same credentials.
  3. GET /api/v1/cases/ with the token.
- Expected: Registration is refused or stays inactive until a superadmin approves it.
- Actual (this run): anonymous self-registration does not yield investigator data access: expected 'registration refused (401/403), account pending (login 401/403), or data access 401/403', got 'register=200, login=200, GET /api/v1/cases/=200'
- Suggested fix: Create self-registered users as inactive (or route them through /api/v1/access-requests), or remove the public route.

### CYB-02 - Tier-1 'permission_revocation' reports REVOKED but changes nothing

- Severity: HIGH; owner: Kaushlendra (access control); status: CONFIRMED at runtime by S2-04
- Where: `cybercrime/backend/app/api/v1/endpoints/access.py:158-166`
- Steps:
  1. As superadmin, POST /api/v1/access/revoke with revocation_type=permission_revocation, target role=investigator, action=read.
  2. As an investigator, GET /api/v1/cases/ and POST /api/v1/authz/check for read.
- Expected: The revoked permission is denied on the next request.
- Actual (this run): investigator read after 'read' was revoked: expected '403 (denied)', got 200; authz decision for investigator read after revocation: expected 'DENY', got 'ALLOW'
- Suggested fix: Persist revoked role:action pairs and enforce them in the RBAC middleware and /authz/check, or return NOT_IMPLEMENTED instead of REVOKED.

### CYB-06 - Wallet analysis invents transactions and a fraud verdict for any wallet

- Severity: CRITICAL; owner: Shivam (security intelligence); status: CONFIRMED at runtime by S3-03
- Where: `cybercrime/backend/app/api/v1/endpoints/incidents.py:366-384 ('Always generate synthetic fraud patterns ... use synthetic fraud data as primary')`
- Steps:
  1. POST /api/v1/incidents/analyze for a wallet address the system has never seen.
- Expected: No transactions or patterns are reported without observed data; any demo data is labelled synthetic.
- Actual (this run): no unlabelled transactions are reported for a wallet with no history: expected '0 transactions, or every transaction labelled synthetic', got '16 transactions, labelled synthetic: False'; no fraud pattern asserted without observed data: expected [], got ['Money Laundering (Layering)', 'Multiple Hop Transfers', 'Circular Movement', 'High Transaction Frequency']
- Suggested fix: Remove generated data from the investigation path, or gate it behind an explicit demo flag and mark every generated item synthetic:true.

### CYB-03 - Intelligence output has no confidence or uncertainty field

- Severity: MEDIUM; owner: Shivam (security intelligence); status: CONFIRMED at runtime by S3-01
- Where: `cybercrime/backend/app/api/v1/schemas.py:219-232 (IncidentReportResponse)`
- Steps:
  1. POST /api/v1/incidents/analyze for an ambiguous wallet and inspect the fields.
- Expected: A structured confidence/uncertainty value next to risk_score (EOD: expose severity, confidence, rationale, uncertainty).
- Actual (this run): structured confidence/uncertainty field present: expected True, got False
- Suggested fix: Add confidence and an uncertainty/evidence-basis field to the response contract.

### CYB-04 - Failed logins are not recorded as security events

- Severity: HIGH; owner: Kaushlendra (auth); consumed by Shivam/Aryan; status: CONFIRMED at runtime by P-C1
- Where: `cybercrime/backend/app/api/v1/endpoints/auth.py:44-71 (401 raised without a canonical security event; the only trace is a generic request.completed log line with status 401)`
- Steps:
  1. POST /api/v1/auth/login six times with a wrong password.
  2. As superadmin, GET /api/v1/audit/.
- Expected: One security event per failed attempt, so detection and correlation have an input.
- Actual (this run): failed logins recorded as security events in the audit store: expected '>= 6', got 0; login error does not reveal whether the account exists: expected True, got False
- Suggested fix: Emit a canonical security event (auth.login, DENIED, reason) for every failed login.

### CYB-05 - Login errors reveal whether an account exists

- Severity: MEDIUM; owner: Kaushlendra (auth); status: CONFIRMED at runtime by P-C1
- Where: `cybercrime/backend/app/api/v1/endpoints/auth.py (messages 'User not found ...' vs 'Incorrect password ...')`
- Steps:
  1. Log in with an unknown email.
  2. Log in with a known email and a wrong password.
  3. Compare the messages.
- Expected: The same generic message for both.
- Actual (this run): failed logins recorded as security events in the audit store: expected '>= 6', got 0; login error does not reveal whether the account exists: expected True, got False
- Suggested fix: Return one generic 'Invalid email or password' message.

### CYB-07 - Collection routes without a trailing slash return 405 for authorised users

- Severity: LOW; owner: Rajaryan (integration) / Kaushlendra (API); status: CONFIRMED at runtime by O-04
- Where: `cybercrime/backend/main.py:511 (catch-all OPTIONS route stops the slash redirect)`
- Steps:
  1. As an investigator, GET /api/v1/cases (no trailing slash).
- Expected: 200, or a 307 redirect to /api/v1/cases/.
- Actual (this run): GET /api/v1/cases (no slash) by an authorised investigator: expected '200 or 307', got 405
- Suggested fix: Drop the catch-all OPTIONS route (CORSMiddleware already answers preflight) or register both path forms.

### CYB-08 - Evidence upload ignores the Bucket result; callers cannot see whether the sovereign copy exists

- Severity: MEDIUM; owner: Kaushlendra (data/API); status: CODE-VERIFIED (found by reading code or repository state; no runtime check)
- Where: `cybercrime/backend/app/api/v1/endpoints/evidence.py:231-237`
- Steps:
  1. Upload evidence while the Bucket is unreachable; the response is identical to a successful Bucket store.
- Expected: The response states the Bucket outcome (stored / unavailable).
- Suggested fix: Return the store_evidence_in_bucket result in the response.

### CYB-09 - Bucket API key is sent inside the JSON body

- Severity: MEDIUM; owner: Kaushlendra (data/API); status: CODE-VERIFIED (found by reading code or repository state; no runtime check)
- Where: `cybercrime/backend/app/core/sovereign_integrations.py:165-166`
- Steps:
  1. Configure BHIV_BUCKET_API_KEY and upload evidence; the key travels in the payload that an append-only store may keep.
- Expected: Credentials travel only in a header.
- Suggested fix: Send the key in an Authorization or X-API-Key header.

### CYB-10 - Unit test suite was not reproducible from a clean clone

- Severity: MEDIUM; owner: Hemanth (testing); status: FIXED in this change
- Where: `cybercrime/backend (no conftest; tests relied on a local .env and a pre-filled database)`
- Steps:
  1. Fresh clone, run pytest -v in cybercrime/backend: 2 collection errors.
  2. With SECRET_KEY set and the non-test script test_predictions.py excluded: 29 passed, 1 failed.
- Expected: The suite runs the same everywhere.
- Suggested fix: Fixed in this change: cybercrime/backend/conftest.py (throwaway key, isolated database, offline settings).

### CYB-11 - Frozen OpenAPI contract was missing /authz/check, /access/revoke and /tts/

- Severity: MEDIUM; owner: Kaushlendra (API contracts); status: FIXED in this change
- Where: `cybercrime/openapi.yaml (89 paths before, 93 after regeneration)`
- Steps:
  1. Compare openapi.yaml with the routes the app serves; startup logged 'openapi.yaml is out of date'.
- Expected: The published contract lists every route.
- Suggested fix: Fixed in this change: regenerated with scripts/generate_openapi.py.

### CYB-12 - Public health endpoint shows server file-system paths (seen in api_samples/O-01.json)

- Severity: LOW; owner: Kaushlendra (API); status: CONFIRMED (this run's health reply): recorded in api_samples/O-01.json
- Where: `cybercrime/backend/app/core/sovereign_integrations.py:325-350 (integration_health returns storage and buffer paths); GET /api/v1/system/health is public in cybercrime/rbac-permissions.json`
- Steps:
  1. GET /api/v1/system/health without a token; the body contains absolute storage paths.
- Expected: Public health returns status only; details (paths) need an authenticated operator.
- Suggested fix: Drop paths from the public response or move the detailed view behind superadmin.

### CYB-13 - Protected access does not check scope or bind the caller to the subject; the VAJRA token is unscoped

- Severity: HIGH; owner: Rajaryan (integration) with Prakash (VAJRA contract); bridge by Hemanth; status: CODE-VERIFIED (found by reading code or repository state; no runtime check)
- Where: `cybercrime/backend/app/api/v1/endpoints/protected_access.py (_decide uses only VAJRA's GRANT/USE state; response field vajra.scope_checked=false); VAJRA_TANTRA_SECRET also authorizes VAJRA transitions (server.go:277,279,284)`
- Steps:
  1. Grant a subject with scope ['read'] in VAJRA.
  2. Ask /api/v1/protected/access for action 'delete' on any resource: ALLOW, because VAJRA's verify returns no scope.
  3. Any investigator can ask about any subject (no link between the caller and the subject).
- Expected: ALLOW only for actions inside the granted scope, for a caller entitled to act for that subject.
- Suggested fix: Needs a scope-aware VAJRA contract (UNKNOWN; VAJRA's /api/v1/permission/check has requester and scope but is a separate registry) and an evidence-only VAJRA credential; until then ALLOW means only 'subject is GRANT/USE in VAJRA'.

### CYB-14 - Every protected-access decision appends a permanent VAJRA row; there is no rate limit

- Severity: MEDIUM; owner: Rajaryan (integration); bridge by Hemanth; status: CODE-VERIFIED (found by reading code or repository state; no runtime check)
- Where: `cybercrime/backend/app/api/v1/endpoints/protected_access.py (one VAJRA evidence record per non-duplicate request, ALLOW or DENY)`
- Steps:
  1. Send many protected-access requests with different trace ids; each one adds a row to VAJRA's append-only TruthStore.
  2. Together with CYB-01 (open self-registration) any stranger can do this.
- Expected: Rate limiting on the route (and CYB-01 fixed), or recording only decisions that matter to VAJRA.
- Suggested fix: Add a per-caller rate limit; agree with the VAJRA owner which decisions should be recorded.

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
| VAJ-01 | HIGH | CODE-VERIFIED (found by reading code or repository state; no runtime check) | Integration docs give the API at port 4000, which is the P2P port | Prakash (VAJRA) |
| VAJ-02 | HIGH | CONFIRMED at runtime by S7-05 | Authority state (GRANT/USE/REVOKE...) is lost when the node restarts | Prakash (VAJRA) / Samsoorya (runtime) |
| VAJ-03 | LOW | CODE-VERIFIED (found by reading code or repository state; no runtime check) | Evidence fields other than trace_id and action_taken cannot be read back (they are bound only by the hash) | Prakash (VAJRA) |
| VAJ-04 | MEDIUM | CODE-VERIFIED (found by reading code or repository state; no runtime check) | The '4 mandatory proofs' are partly scripted text; pass totals are hard-coded | Prakash (VAJRA) |
| VAJ-05 | MEDIUM | CODE-VERIFIED (found by reading code or repository state; no runtime check) | Recovery package uses placeholder signatures; anchor check only counts strings | Prakash (VAJRA) / Samsoorya (recovery) |
| VAJ-06 | HIGH | CONFIRMED at runtime by V-01 | Permission grant, wallet freeze and token-mint routes run without any login | Prakash (VAJRA) |
| VAJ-07 | MEDIUM | CONFIRMED at runtime by V-02 | Permission ids collide for subjects of 18+ characters (ids no longer identify one grant) | Prakash (VAJRA) |
| VAJ-08 | LOW | CODE-VERIFIED (found by reading code or repository state; no runtime check) | Proof runner script references a file that does not exist | Prakash (VAJRA) |
| VAJ-09 | LOW | CODE-VERIFIED (found by reading code or repository state; no runtime check) | Integration package examples send no Authorization header, but those routes now return 401 without it | Prakash (VAJRA) |

### VAJ-01 - Integration docs give the API at port 4000, which is the P2P port

- Severity: HIGH; owner: Prakash (VAJRA); status: CODE-VERIFIED (found by reading code or repository state; no runtime check)
- Where: `bhiv-VAJRA_Blockchain/VAJRA_EXTERNAL_INTEGRATION_PACKAGE.md:7; start_blockchain.bat:13; cmd/relay/main.go:229-247`
- Steps:
  1. Start the node as documented; the HTTP API listens on HTTP_PORT (default 8080), not 4000.
- Expected: Docs name the HTTP API port.
- Suggested fix: Change the base URL in the integration package and review packet to the HTTP port.

### VAJ-02 - Authority state (GRANT/USE/REVOKE...) is lost when the node restarts

- Severity: HIGH; owner: Prakash (VAJRA) / Samsoorya (runtime); status: CONFIRMED at runtime by S7-05
- Where: `core/relay-chain/authority/lifecycle.go:91-105 (in-memory map)`
- Steps:
  1. GRANT then USE a subject.
  2. Restart the node.
  3. GET /api/vajra/authority/verify?subject=...
- Expected: State and history survive a restart.
- Actual (this run): authority state after restart (subject was USE): expected 'USE', got ''
- Suggested fix: Persist authority records (the hash chain already exists) and reload them at start.

### VAJ-03 - Evidence fields other than trace_id and action_taken cannot be read back (they are bound only by the hash)

- Severity: LOW; owner: Prakash (VAJRA); status: CODE-VERIFIED (found by reading code or repository state; no runtime check)
- Where: `core/relay-chain/api/vajra_handlers.go:301-314 (evidence_hash = SHA-256 of the full request; the row stores trace_id, the hash and action_taken)`
- Steps:
  1. POST /api/vajra/evidence/record with all fields.
  2. GET /api/tantra/records: the row has trace_id, the hash and fraud_decision; actor, severity, threat type and details are not readable (they are committed through evidence_hash).
- Expected: Either the fields are readable for audit, or the contract says clearly that only the hash is kept.
- Suggested fix: Document hash-only storage in the integration package, or store the fields alongside the hash.

### VAJ-04 - The '4 mandatory proofs' are partly scripted text; pass totals are hard-coded

- Severity: MEDIUM; owner: Prakash (VAJRA); status: CODE-VERIFIED (found by reading code or repository state; no runtime check)
- Where: `core/relay-chain/authority/mandatory_proofs_runner.go:177,185-186 (detection, correlation and TANTRA approval are log strings, not labelled simulated), :243 (node failure, labelled simulated), :464-465 (TotalProofs/PassedProofs = 5)`
- Steps:
  1. Read the runner: detection, correlation and TANTRA approval are log strings, not calls; the totals are constants.
- Expected: Proofs call the real components, or label those steps SIMULATED; totals are counted.
- Suggested fix: Label simulated steps and count passed proofs from the actual results.

### VAJ-05 - Recovery package uses placeholder signatures; anchor check only counts strings

- Severity: MEDIUM; owner: Prakash (VAJRA) / Samsoorya (recovery); status: CODE-VERIFIED (found by reading code or repository state; no runtime check)
- Where: `core/relay-chain/api/vajra_handlers.go:353,367,404; core/relay-chain/authority/recovery.go:127-128`
- Steps:
  1. GET /api/vajra/recovery/package: signatures are 'val1_sig'...'val4_sig'.
- Expected: Real validator signatures that are cryptographically verified.
- Suggested fix: Sign checkpoints with validator keys and verify the signatures in VerifySurvivingNode.

### VAJ-06 - Permission grant, wallet freeze and token-mint routes run without any login

- Severity: HIGH; owner: Prakash (VAJRA); status: CONFIRMED at runtime by V-01
- Where: `core/relay-chain/api/server.go:127 (/api/admin/add-tokens), :154-156 (/api/v1/permission/*), :292 (/api/cybercrime/freeze) - wrapped with enableCORS, not enableCORSWithAuth`
- Steps:
  1. On a local node, POST /api/admin/add-tokens, /api/v1/permission/grant and /api/cybercrime/freeze with no Authorization header.
  2. permission/grant creates a GRANT (201) and cybercrime/freeze answers success (200). add-tokens also runs (200); in this run it reported 'token BHX not found' because the test used a token name that does not exist, so no mint was shown.
- Expected: 401/403 without credentials.
- Actual (this run): POST /api/admin/add-tokens without credentials is refused: expected '401 or 403', got '200 (request accepted)'; POST /api/v1/permission/grant without credentials is refused: expected '401 or 403', got '201 (request accepted)'; POST /api/cybercrime/freeze without credentials is refused: expected '401 or 403', got '200 (request accepted)'
- Recorded replies ([api_samples/V-01.json](../api_samples/V-01.json)):
  - `POST /api/admin/add-tokens` -> 200: `{"error":"token BHX not found","success":false}`
  - `POST /api/v1/permission/grant` -> 201: `{"commitment":"0165a21b6cef30c1a43a03140c2438df8f45e31419d72cc697a01db4c78b6a7e","permission_id":"perm-cyber-p0-test-subj-","record":{"permission_id":"perm-cyber-p0-test-subj-","trace_id":"c69962a0-7b`
  - `POST /api/cybercrime/freeze` -> 200: `{"success":true}`
- Suggested fix: Wrap these routes with enableCORSWithAuth (or remove admin routes from public builds).

### VAJ-07 - Permission ids collide for subjects of 18+ characters (ids no longer identify one grant)

- Severity: MEDIUM; owner: Prakash (VAJRA); status: CONFIRMED at runtime by V-02
- Where: `core/relay-chain/permission/permission.go:110 ('perm-' + subject + '-' + hash, cut to 24 characters: no hash left once the subject has 18 or more characters)`
- Steps:
  1. Grant two permissions for one long subject with different requesters.
  2. Compare permission_id values.
- Expected: Different grants get different ids. (In our run the revoke still hit the intended grant, but list/revoke by id is ambiguous.)
- Actual (this run): two different grants get two different permission ids: expected True, got False
- Suggested fix: Do not truncate the hash part of the id (for example perm-<sha256 prefix> without the subject).

### VAJ-08 - Proof runner script references a file that does not exist

- Severity: LOW; owner: Prakash (VAJRA); status: CODE-VERIFIED (found by reading code or repository state; no runtime check)
- Where: `run_cyber_biqos_10day_proofs.bat:22 (api/api_test_helpers.go missing; the fallback always runs)`
- Steps:
  1. Run the .bat; step 2's first command always fails and the fallback runs.
- Expected: The script runs the intended command.
- Suggested fix: Use: go test -v -run TestVajra ./api/...

### VAJ-09 - Integration package examples send no Authorization header, but those routes now return 401 without it

- Severity: LOW; owner: Prakash (VAJRA); status: CODE-VERIFIED (found by reading code or repository state; no runtime check)
- Where: `VAJRA_EXTERNAL_INTEGRATION_PACKAGE.md:64-78 (evidence/record curl), :178-205 (authority/transition curls); core/relay-chain/api/server.go:372-406 (bearer gate)`
- Steps:
  1. Copy a documented curl for /api/vajra/evidence/record; it returns 401.
- Expected: Docs show the required 'Authorization: Bearer <VAJRA_TANTRA_SECRET>' header and how callers obtain it.
- Suggested fix: Update the samples and say who issues the token.

## TANTRA

| ID | Severity | Status | Title | Owner |
|---|---|---|---|---|
| TAN-01 | HIGH | CONFIRMED at runtime by S5-01 (it passes because the peer answered event_type_not_registered) | No TANTRA contract exists for cybersecurity events | TANTRA team (owner name UNKNOWN) |
| TAN-02 | HIGH | CODE-VERIFIED (found by reading code or repository state; no runtime check) | TANTRA repository has no service code: four submodule links with no .gitmodules | TANTRA team (owner name UNKNOWN) |
| TAN-03 | HIGH | CODE-VERIFIED (found by reading code or repository state; no runtime check) | A .env file is committed to the TANTRA repository | TANTRA team (owner name UNKNOWN) |
| TAN-04 | MEDIUM | CODE-VERIFIED (found by reading code or repository state; no runtime check) | No test lane for TANTRA's governed enforcement path | TANTRA team (owner name UNKNOWN) |
| TAN-06 | MEDIUM | CONFIRMED (live reply to this run's single probe write): recorded in api_samples/S8-02.json | PRANA's onward write to the Bucket fails: 400 'parent_hash required (not first artifact)' | TANTRA team (owner name UNKNOWN) |

### TAN-01 - No TANTRA contract exists for cybersecurity events

- Severity: HIGH; owner: TANTRA team (owner name UNKNOWN); status: CONFIRMED at runtime by S5-01 (it passes because the peer answered event_type_not_registered)
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

- Severity: MEDIUM; owner: TANTRA team (owner name UNKNOWN); status: CONFIRMED (live reply to this run's single probe write): recorded in api_samples/S8-02.json
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
