"""
Defect catalogue for the P0 verification (static facts only).

Whether a defect is CONFIRMED in a given run is decided by build_reports.py from results.json
(a check that lists the defect id must have status FAIL). Defects with check=None were found by
reading code or repository state and are labelled CODE-VERIFIED.
Owner names follow the task documents' lanes; "UNKNOWN" means no owner is named in any task document.
"""

DEFECTS = [
    # ------------------------------------------------------------------ Cybersecurity module
    {"id": "CYB-01", "severity": "CRITICAL", "system": "Cybersecurity", "owner": "Kaushlendra (auth/authz)", "status": "FIXED", "fixed_by": "Hemanth on 2026-11-04 at the team's request; for review by Kaushlendra",
     "check": "S1-04", "title": "Anyone can self-register and immediately read investigator data",
     "where": "cybercrime/backend/app/api/v1/endpoints/auth.py:19-41 (register sets role=investigator, active); "
              "cybercrime/rbac-permissions.json (public POST /api/v1/auth/register)",
     "steps": ["POST /api/v1/auth/register with any email and password (no login).",
               "POST /api/v1/auth/login with the same credentials.",
               "GET /api/v1/cases/ with the token."],
     "expected": "Registration is refused or stays inactive until a superadmin approves it.",
     "fix": "Create self-registered users as inactive (or route them through /api/v1/access-requests), or remove the public route."},
    {"id": "CYB-02", "severity": "HIGH", "system": "Cybersecurity", "owner": "Kaushlendra (access control)", "status": "FIXED", "fixed_by": "Hemanth on 2026-11-04 at the team's request; for review by Kaushlendra",
     "check": "S2-04", "title": "Tier-1 'permission_revocation' reports REVOKED but changes nothing",
     "where": "cybercrime/backend/app/api/v1/endpoints/access.py:158-166",
     "steps": ["As superadmin, POST /api/v1/access/revoke with revocation_type=permission_revocation, target role=investigator, action=read.",
               "As an investigator, GET /api/v1/cases/ and POST /api/v1/authz/check for read."],
     "expected": "The revoked permission is denied on the next request.",
     "fix": "Persist revoked role:action pairs and enforce them in the RBAC middleware and /authz/check, or return NOT_IMPLEMENTED instead of REVOKED."},
    {"id": "CYB-06", "severity": "CRITICAL", "system": "Cybersecurity", "owner": "Shivam (security intelligence)", "status": "FIXED", "fixed_by": "Hemanth on 2026-11-04 at the team's request; for review by Shivam",
     "check": "S3-03", "title": "Wallet analysis invents transactions and a fraud verdict for any wallet",
     "where": "cybercrime/backend/app/api/v1/endpoints/incidents.py:366-384 ('Always generate synthetic fraud patterns ... use synthetic fraud data as primary')",
     "steps": ["POST /api/v1/incidents/analyze for a wallet address the system has never seen."],
     "expected": "No transactions or patterns are reported without observed data; any demo data is labelled synthetic.",
     "fix": "Remove generated data from the investigation path, or gate it behind an explicit demo flag and mark every generated item synthetic:true."},
    {"id": "CYB-03", "severity": "MEDIUM", "system": "Cybersecurity", "owner": "Shivam (security intelligence)", "status": "FIXED", "fixed_by": "Hemanth on 2026-11-04 at the team's request; for review by Shivam",
     "check": "S3-01", "title": "Intelligence output has no confidence or uncertainty field",
     "where": "cybercrime/backend/app/api/v1/schemas.py:219-232 (IncidentReportResponse)",
     "steps": ["POST /api/v1/incidents/analyze for an ambiguous wallet and inspect the fields."],
     "expected": "A structured confidence/uncertainty value next to risk_score (EOD: expose severity, confidence, rationale, uncertainty).",
     "fix": "Add confidence and an uncertainty/evidence-basis field to the response contract."},
    {"id": "CYB-04", "severity": "HIGH", "system": "Cybersecurity", "owner": "Kaushlendra (auth); consumed by Shivam/Aryan", "status": "FIXED", "fixed_by": "Hemanth on 2026-11-04 at the team's request; for review by Kaushlendra",
     "check": "P-C1", "title": "Failed logins are not recorded as security events",
     "where": "cybercrime/backend/app/api/v1/endpoints/auth.py:44-71 (401 raised without a canonical security event; the only "
              "trace is a generic request.completed log line with status 401)",
     "steps": ["POST /api/v1/auth/login six times with a wrong password.", "As superadmin, GET /api/v1/audit/."],
     "expected": "One security event per failed attempt, so detection and correlation have an input.",
     "fix": "Emit a canonical security event (auth.login, DENIED, reason) for every failed login."},
    {"id": "CYB-05", "severity": "MEDIUM", "system": "Cybersecurity", "owner": "Kaushlendra (auth)", "status": "FIXED", "fixed_by": "Hemanth on 2026-11-04 at the team's request; for review by Kaushlendra",
     "check": "P-C1", "title": "Login errors reveal whether an account exists",
     "where": "cybercrime/backend/app/api/v1/endpoints/auth.py (messages 'User not found ...' vs 'Incorrect password ...')",
     "steps": ["Log in with an unknown email.", "Log in with a known email and a wrong password.", "Compare the messages."],
     "expected": "The same generic message for both.",
     "fix": "Return one generic 'Invalid email or password' message."},
    {"id": "CYB-07", "severity": "LOW", "system": "Cybersecurity", "owner": "Rajaryan (integration) / Kaushlendra (API)", "status": "FIXED", "fixed_by": "Hemanth on 2026-11-04 at the team's request; for review by Rajaryan and Kaushlendra",
     "check": "O-04", "title": "Collection routes without a trailing slash return 405 for authorised users",
     "where": "cybercrime/backend/main.py:511 (catch-all OPTIONS route stops the slash redirect)",
     "steps": ["As an investigator, GET /api/v1/cases (no trailing slash)."],
     "expected": "200, or a 307 redirect to /api/v1/cases/.",
     "fix": "Drop the catch-all OPTIONS route (CORSMiddleware already answers preflight) or register both path forms."},
    {"id": "CYB-08", "severity": "MEDIUM", "system": "Cybersecurity", "owner": "Kaushlendra (data/API)", "status": "FIXED", "fixed_by": "Hemanth on 2026-11-04 at the team's request; for review by Kaushlendra",
     "check": "S6-04", "title": "Evidence upload ignores the Bucket result; callers cannot see whether the sovereign copy exists",
     "where": "cybercrime/backend/app/api/v1/endpoints/evidence.py:231-237",
     "steps": ["Upload evidence while the Bucket is unreachable; the response is identical to a successful Bucket store."],
     "expected": "The response states the Bucket outcome (stored / unavailable).",
     "fix": "Return the store_evidence_in_bucket result in the response."},
    {"id": "CYB-09", "verified_by": "unit test test_bucket_key_travels_in_a_header_not_the_payload",  "severity": "MEDIUM", "system": "Cybersecurity", "owner": "Kaushlendra (data/API)", "status": "FIXED", "fixed_by": "Hemanth on 2026-11-04 at the team's request; for review by Kaushlendra",
     "check": None, "title": "Bucket API key is sent inside the JSON body",
     "where": "cybercrime/backend/app/core/sovereign_integrations.py:165-166",
     "steps": ["Configure BHIV_BUCKET_API_KEY and upload evidence; the key travels in the payload that an append-only store may keep."],
     "expected": "Credentials travel only in a header.",
     "fix": "Send the key in an Authorization or X-API-Key header."},
    {"id": "CYB-10", "verified_by": "the unit suite running on a clean checkout (test_results/cyber_unit_tests.txt)",  "severity": "MEDIUM", "system": "Cybersecurity", "owner": "Hemanth (testing)", "status": "FIXED",
     "check": None, "title": "Unit test suite was not reproducible from a clean clone",
     "where": "cybercrime/backend (no conftest; tests relied on a local .env and a pre-filled database)",
     "steps": ["Fresh clone, run pytest -v in cybercrime/backend: 2 collection errors.",
               "With SECRET_KEY set and the non-test script test_predictions.py excluded: 29 passed, 1 failed."],
     "expected": "The suite runs the same everywhere.",
     "fix": "Fixed in this change: cybercrime/backend/conftest.py (throwaway key, isolated database, offline settings)."},
    {"id": "CYB-11", "verified_by": "the regenerated cybercrime/openapi.yaml; the API's start-up drift check logged no warning in this run",  "severity": "MEDIUM", "system": "Cybersecurity", "owner": "Kaushlendra (API contracts)", "status": "FIXED",
     "check": None, "title": "Frozen OpenAPI contract was missing /authz/check, /access/revoke and /tts/",
     "where": "cybercrime/openapi.yaml (89 paths before, 93 after regeneration)",
     "steps": ["Compare openapi.yaml with the routes the app serves; startup logged 'openapi.yaml is out of date'."],
     "expected": "The published contract lists every route.",
     "fix": "Fixed in this change: regenerated with scripts/generate_openapi.py."},
    {"id": "CYB-12", "severity": "LOW", "system": "Cybersecurity", "owner": "Kaushlendra (API)", "status": "FIXED", "fixed_by": "Hemanth on 2026-11-04 at the team's request; for review by Kaushlendra",
     "check": "O-01",
     "title": "Public health endpoint shows server file-system paths (seen in api_samples/O-01.json)",
     "where": "cybercrime/backend/app/core/sovereign_integrations.py:325-350 (integration_health returns storage and buffer paths); "
              "GET /api/v1/system/health is public in cybercrime/rbac-permissions.json",
     "steps": ["GET /api/v1/system/health without a token; the body contains absolute storage paths."],
     "expected": "Public health returns status only; details (paths) need an authenticated operator.",
     "fix": "Drop paths from the public response or move the detailed view behind superadmin."},
    {"id": "CYB-13", "severity": "HIGH", "system": "Cybersecurity", "owner": "Rajaryan (integration) with Prakash (VAJRA contract); bridge by Hemanth",
     "status": "PARTLY FIXED", "fixed_by": "Hemanth on 2026-11-05 (his bridge), after VAJRA 3cc883f added scope to verify; for review by Rajaryan",
     "remaining": "nothing binds the calling user to the VAJRA subject (needs a team decision); the evidence-only VAJRA token is "
                  "supported, but VAJRA 3cc883f refuses it on evidence/record (VAJ-10), so the main run still sends the "
                  "governance token; the '<action>:<resource type>' scope form is Cybersecurity's proposal, not yet agreed with "
                  "VAJRA/TANTRA",
     "check": "S1-08", "title": "Protected access does not check scope or bind the caller to the subject; the VAJRA token is unscoped",
     "where": "cybercrime/backend/app/api/v1/endpoints/protected_access.py (until 05 Nov, _decide used only VAJRA's GRANT/USE "
              "state and vajra.scope_checked was always false; since then _decide also requires the scope); the caller-to-"
              "subject link is still absent. VAJRA_TANTRA_SECRET also authorizes VAJRA transitions (server.go:277,279,284 at 07d683c)",
     "steps": ["Grant a subject with scope ['read:evidence'] in VAJRA.",
               "Ask /api/v1/protected/access for action 'download' on evidence: ALLOW until 05 Nov (VAJRA's verify returned no "
               "scope); since 05 Nov DENY VAJRA_SCOPE_NOT_GRANTED (S1-08).",
               "Still open: any investigator can ask about any subject (no link between the caller and the subject)."],
     "expected": "ALLOW only for actions inside the granted scope, for a caller entitled to act for that subject.",
     "fix": "Done on 05 Nov for scope: ALLOW now also needs '<action>:<resource type>' in the scope VAJRA's verify reports "
            "(exact match, no wildcards; missing scope denies), and the bridge prefers VAJRA_CYBER_SECRET. Still needed: a "
            "caller-to-subject binding and an agreed scope vocabulary."},
    {"id": "CYB-14", "verified_by": "unit test test_protected_access_is_rate_limited_per_caller",  "severity": "MEDIUM", "system": "Cybersecurity", "owner": "Rajaryan (integration); bridge by Hemanth", "status": "FIXED", "fixed_by": "Hemanth on 2026-11-04 (his bridge); for review by Rajaryan",
     "check": None, "title": "Every protected-access decision appends a permanent VAJRA row; there is no rate limit",
     "where": "cybercrime/backend/app/api/v1/endpoints/protected_access.py (one VAJRA evidence record per non-duplicate request, "
              "ALLOW or DENY)",
     "steps": ["Send many protected-access requests with different trace ids; each one adds a row to VAJRA's append-only TruthStore.",
               "Together with CYB-01 (open self-registration) any stranger can do this."],
     "expected": "Rate limiting on the route (and CYB-01 fixed), or recording only decisions that matter to VAJRA.",
     "fix": "Add a per-caller rate limit; agree with the VAJRA owner which decisions should be recorded."},
    {"id": "CYB-15", "verified_by": "unit test test_malformed_trace_id_is_not_echoed",  "severity": "LOW", "system": "Cybersecurity", "owner": "Kaushlendra (API)", "status": "FIXED", "fixed_by": "Hemanth on 2026-11-04 at the team's request; for review by Kaushlendra",
     "check": None, "title": "Caller-supplied X-Trace-Id / X-Request-Id were echoed unvalidated in response headers and logs",
     "where": "cybercrime/backend/main.py request_context_middleware and rbac_middleware",
     "steps": ["Send any request with X-Trace-Id containing spaces or control characters; the value came back in the response header."],
     "expected": "Only a safe id form is echoed; anything else is replaced by a fresh id.",
     "fix": "Fixed in this change: both middlewares accept ^[A-Za-z0-9._:-]{1,128}$ and otherwise mint a UUID "
            "(protected access still answers 400 INVALID_TRACE_ID). Unit test: test_lane_fixes.py."},
    {"id": "FES-01", "severity": "MEDIUM", "system": "Cybersecurity (fraud-evidence-system)", "owner": "UNKNOWN (fraud-evidence backend; not named in the task documents)",
     "check": None, "observed_in": {"file": "test_results/fraud_evidence_jest_run2.txt", "contains": "11 failed", "how": "OFFLINE, Jest run 2; run 1 is in fraud_evidence_jest_run1.txt"},
     "title": "Fraud-evidence backend: 11 of 40 Jest tests fail; a first run fails 20",
     "where": "fraud-evidence-system/Backend/tests/evidence.integration.test.js",
     "steps": ["cd fraud-evidence-system/Backend && npm ci && npx jest --forceExit (run it twice: the first run can time out in beforeAll)."],
     "expected": "All tests pass, or failures are fixed or marked as known.",
     "fix": "Run 2: 11 failed, 29 passed; the 11 names are in the raw output and include the rate-limit test, which also "
            "failed in run 1 and is listed in PHASE_4_FAILURE_ANALYSIS.md (#13). Run 1: 20 failed because beforeAll "
            "(MongoMemoryServer.create) exceeded Jest's 5 s hook timeout; why it was slow was not established (the MongoDB "
            "binary was already cached by npm ci). 'should return specific evidence', listed as failing in "
            "PHASE_4_TEST_RESULTS.md, passed in run 2."},
    # ------------------------------------------------------------------ VAJRA
    {"id": "VAJ-01", "severity": "HIGH", "system": "VAJRA", "owner": "Prakash (VAJRA)",
     "owner_fix": {"commit": "3cc883f", "state": "PARTLY FIXED",
                   "remaining": "review_packets/CYBER-BIQOS-10DAY/deployment_proof/deployment_proof.md:48-54 still uses "
                                "localhost:4000 (VAJRA_EXTERNAL_INTEGRATION_PACKAGE.md:7 now says 8080)"},
     "check": None, "title": "Integration docs give the API at port 4000, which is the P2P port",
     "where": "at 07d683c: bhiv-VAJRA_Blockchain/VAJRA_EXTERNAL_INTEGRATION_PACKAGE.md:7; start_blockchain.bat:13; "
              "cmd/relay/main.go:229-247",
     "steps": ["Start the node as documented; the HTTP API listens on HTTP_PORT (default 8080), not 4000."],
     "expected": "Docs name the HTTP API port.",
     "fix": "Change the base URL in the integration package and review packet to the HTTP port."},
    {"id": "VAJ-02", "severity": "HIGH", "system": "VAJRA", "owner": "Prakash (VAJRA) / Samsoorya (runtime)",
     "owner_fix": {"commit": "3cc883f", "state": "FIXED", "verified_by": "S7-05 (state and scope survive a restart)",
                   "note": "the new ledger file has its own problems: see VAJ-13"},
     "check": "S7-05", "title": "Authority state (GRANT/USE/REVOKE...) is lost when the node restarts",
     "where": "at 07d683c: core/relay-chain/authority/lifecycle.go:91-105 (in-memory map); at 3cc883f: NewManagerWithPath "
              "and loadFromFile (lifecycle.go:110-153), api/server.go:98-106",
     "steps": ["GRANT then USE a subject.", "Restart the node.", "GET /api/vajra/authority/verify?subject=..."],
     "expected": "State and history survive a restart.",
     "fix": "Persist authority records (the hash chain already exists) and reload them at start."},
    {"id": "VAJ-03", "severity": "LOW", "system": "VAJRA", "owner": "Prakash (VAJRA)",
     "owner_fix": {"commit": "3cc883f", "state": "PARTLY FIXED",
                   "remaining": "hash-only storage is stated in a code comment (api/vajra_handlers.go:204) but not in "
                                "VAJRA_EXTERNAL_INTEGRATION_PACKAGE.md, which integrators read"},
     "check": None, "title": "Evidence fields other than trace_id and action_taken cannot be read back (they are bound only by the hash)",
     "where": "core/relay-chain/api/vajra_handlers.go:301-314 at 07d683c (311-327 at 3cc883f) (evidence_hash = SHA-256 of the full request; the row stores trace_id, "
              "the hash and action_taken)",
     "steps": ["POST /api/vajra/evidence/record with all fields.",
               "GET /api/tantra/records: the row has trace_id, the hash and fraud_decision; actor, severity, threat type and details "
               "are not readable (they are committed through evidence_hash)."],
     "expected": "Either the fields are readable for audit, or the contract says clearly that only the hash is kept.",
     "fix": "Document hash-only storage in the integration package, or store the fields alongside the hash."},
    {"id": "VAJ-04", "severity": "MEDIUM", "system": "VAJRA", "owner": "Prakash (VAJRA)",
     "owner_fix": {"commit": "3cc883f", "state": "FIXED",
                   "verified_by": "read at 3cc883f: authority/mandatory_proofs_runner.go:177,185-186 label the scripted steps "
                                  "[SIMULATED ...]; :461-475 count passes from each proof's status",
                   "note": "a failed proof aborts the whole report (mandatory_proofs_runner.go:419-442), so a report that "
                           "exists always says 5 of 5; the count is honest but cannot show a partial result"},
     "check": None, "title": "The '4 mandatory proofs' are partly scripted text; pass totals are hard-coded",
     "where": "at 07d683c: core/relay-chain/authority/mandatory_proofs_runner.go:177,185-186 (detection, correlation and TANTRA approval are log "
              "strings, not labelled simulated), :243 (node failure, labelled simulated), :464-465 (TotalProofs/PassedProofs = 5)",
     "steps": ["Read the runner: detection, correlation and TANTRA approval are log strings, not calls; the totals are constants."],
     "expected": "Proofs call the real components, or label those steps SIMULATED; totals are counted.",
     "fix": "Label simulated steps and count passed proofs from the actual results."},
    {"id": "VAJ-05", "severity": "MEDIUM", "system": "VAJRA", "owner": "Prakash (VAJRA) / Samsoorya (recovery)",
     "owner_fix": {"commit": "3cc883f", "state": "NOT FIXED"},
     "check": "V-06", "title": "Recovery package uses placeholder signatures; anchor check only counts strings",
     "where": "core/relay-chain/api/vajra_handlers.go:358-361 (3cc883f: '<validator>_sig_ed25519_' + 8 bytes of SHA-256 over "
              "public data - not a signature); authority/recovery.go:128 (still counts strings); "
              "authority/mandatory_proofs_runner.go:251 (still 'val1_sig'...)",
     "steps": ["GET /api/vajra/recovery/package: signatures are 'val1_sig'...'val4_sig' (07d683c) or "
               "'val1_sig_ed25519_<16 hex>' (3cc883f): anyone can compute them; no key signs anything.",
               "POST /api/vajra/recovery/verify-anchor with the public genesis id and four made-up signature strings: qualified=true (V-06)."],
     "expected": "Real validator signatures that are cryptographically verified.",
     "fix": "Sign checkpoints with validator keys and verify the signatures in VerifySurvivingNode."},
    {"id": "VAJ-06", "severity": "HIGH", "system": "VAJRA", "owner": "Prakash (VAJRA)",
     "owner_fix": {"commit": "3cc883f", "state": "FIXED", "verified_by": "V-01 (7 routes answer 401 without a token)",
                   "note": "a wallet can still be frozen without a token through /api/cybercrime/report: see VAJ-14"},
     "check": "V-01", "show_replies": True,
     "title": "Permission grant, wallet freeze and token-mint routes run without any login",
     "where": "at 07d683c: core/relay-chain/api/server.go:127 (/api/admin/add-tokens), :154-156 (/api/v1/permission/*), :292 (/api/cybercrime/freeze) - wrapped with enableCORS, not enableCORSWithAuth; at 3cc883f wrapped with enableCORSWithAuth (:135-136, :162-164, :300-301)",
     "steps": ["On a local node, POST /api/admin/add-tokens, /api/v1/permission/grant and /api/cybercrime/freeze with no Authorization header.",
               "permission/grant creates a GRANT (201) and cybercrime/freeze answers success (200). add-tokens also runs (200); in this "
               "run it reported 'token BHX not found' because the test used a token name that does not exist, so no mint was shown."],
     "expected": "401/403 without credentials.",
     "fix": "Wrap these routes with enableCORSWithAuth (or remove admin routes from public builds)."},
    {"id": "VAJ-07", "severity": "HIGH", "system": "VAJRA", "owner": "Prakash (VAJRA)",
     "owner_fix": {"commit": "3cc883f", "state": "PARTLY FIXED",
                   "remaining": "our original case passes (V-02), but the subject is still cut to 12 characters and is not in the "
                                "hashed input, so two subjects with the same first 12 characters, granted by the same requester "
                                "for the same scope in the same second, get one id; the second grant replaces the first in the id "
                                "map, so revoking A's id revokes B and A stays allowed (V-04)"},
     "check": "V-04", "title": "Permission ids collide (ids do not identify one grant); revoke by id can hit the wrong subject",
     "where": "core/relay-chain/permission/permission.go:110 at 07d683c (cut to 24 characters); at 3cc883f :110-115 (subject cut "
              "to 12 characters, hash input requester:scope:seconds without the subject) and :141 (m.permissions[permID] = record "
              "overwrites)",
     "steps": ["07d683c: grant two permissions for one long subject with different requesters; both get the same id (V-02).",
               "3cc883f: grant subjects 'cyber-p0-test-collide-a-...' and 'cyber-p0-test-collide-b-...' with the same requester "
               "and scope in one second; both get the same id. Revoke that id; check both subjects (V-04)."],
     "expected": "Different grants get different ids, and a revoke by id affects only that grant.",
     "fix": "Derive the id from all identifying fields plus a random or sequence part (for example perm-<uuid4>), and refuse "
            "to overwrite an existing id. Severity raised from MEDIUM on 05 Nov: the revoke now shown to hit the wrong subject."},
    {"id": "VAJ-08", "severity": "LOW", "system": "VAJRA", "owner": "Prakash (VAJRA)",
     "owner_fix": {"commit": "3cc883f", "state": "FIXED",
                   "verified_by": "read at 3cc883f: run_cyber_biqos_10day_proofs.bat:22 now runs 'go test -v -run TestVajra "
                                  "./api/...'; that test set passes here (test_results/vajra_go_tests.txt)"},
     "check": None, "title": "Proof runner script references a file that does not exist",
     "where": "run_cyber_biqos_10day_proofs.bat:22 (api/api_test_helpers.go missing; the fallback always runs)",
     "steps": ["Run the .bat; step 2's first command always fails and the fallback runs."],
     "expected": "The script runs the intended command.",
     "fix": "Use: go test -v -run TestVajra ./api/..."},
    {"id": "VAJ-09", "severity": "LOW", "system": "VAJRA", "owner": "Prakash (VAJRA)",
     "owner_fix": {"commit": "3cc883f", "state": "PARTLY FIXED",
                   "remaining": "the samples now send an Authorization header, but the evidence/record sample says "
                                "'<VAJRA_TANTRA_SECRET_OR_CYBER_SECRET>' and the cyber token is refused there (VAJ-10); the "
                                "package still does not say who issues or rotates the two fixed token values the relay "
                                "compares (server.go:380-439), or what the cyber tier may do. VAJRA's repository also has an "
                                "RS256 JWT engine (security/jwt_handler.py, used by its Python services), which the Go relay's "
                                "gate does not use"},
     "check": None, "title": "Integration package examples send no Authorization header, but those routes now return 401 without it",
     "where": "at 07d683c: VAJRA_EXTERNAL_INTEGRATION_PACKAGE.md:64-78 (evidence/record curl), :178-205 (authority/transition "
              "curls); core/relay-chain/api/server.go:372-406 (bearer gate; :380-439 at 3cc883f)",
     "steps": ["Copy a documented curl for /api/vajra/evidence/record; it returns 401."],
     "expected": "Docs show the required 'Authorization: Bearer <VAJRA_TANTRA_SECRET>' header and how callers obtain it.",
     "fix": "Update the samples and say who issues the token."},
    # ---- found while re-checking VAJRA 3cc883f on 2026-11-05 (local node only)
    {"id": "VAJ-10", "severity": "HIGH", "system": "VAJRA", "owner": "Prakash (VAJRA)",
     "check": "V-03", "show_replies": True,
     "title": "The evidence-only token is refused by evidence/record, the one route it is meant for",
     "where": "core/relay-chain/api/vajra_handlers.go:241-252 (handleVajraEvidenceRecord checks the bearer again and accepts only "
              "VAJRA_TANTRA_SECRET); VAJRA's own test (vajra_handlers_test.go:231-272) covers only authority/transition",
     "steps": ["Start a node with VAJRA_TANTRA_SECRET and VAJRA_CYBER_SECRET set (both are needed in a real deployment).",
               "POST /api/vajra/evidence/record with 'Authorization: Bearer <VAJRA_CYBER_SECRET>': 401 'Authorization: Bearer "
               "<VAJRA_TANTRA_SECRET> required' (V-03).",
               "Cybersecurity configured with only the evidence-only token: the evidence write fails, so an in-scope request is "
               "denied with VAJRA_EVIDENCE_NOT_RECORDED (S6-05; it fails closed)."],
     "expected": "evidence/record accepts the evidence-only token (step 4 of VAJRA's own re-verification steps).",
     "fix": "Accept VAJRA_CYBER_SECRET in handleVajraEvidenceRecord (or drop the second check, since enableCORSWithAuth already "
            "authenticates) and add a test that records evidence with the cyber token while VAJRA_TANTRA_SECRET is set."},
    {"id": "VAJ-11", "severity": "HIGH", "system": "VAJRA", "owner": "Prakash (VAJRA)",
     "check": "V-03", "show_replies": True,
     "title": "The 'evidence-only' token can still grant and revoke permissions and reach admin submit-transaction",
     "where": "core/relay-chain/api/server.go:412-424 (the cyber token is refused only on /api/vajra/authority/transition and "
              "/api/admin/add-tokens; every other enableCORSWithAuth route accepts it: :136, :162-164, :292, :300-301)",
     "steps": ["With 'Authorization: Bearer <VAJRA_CYBER_SECRET>': POST /api/v1/permission/grant -> 201 GRANTED; "
               "POST /api/v1/permission/revoke on a grant made with the governance token -> 200; "
               "POST /api/admin/submit-transaction (malformed body) -> 200 from the handler, so the token passed (V-03)."],
     "expected": "An evidence-only token reaches only the evidence routes; consent changes and admin transactions are refused.",
     "fix": "Use an allow-list for the cyber token (evidence/record, plus anything else agreed) instead of a deny-list of two paths."},
    {"id": "VAJ-12", "severity": "MEDIUM", "system": "VAJRA", "owner": "Prakash (VAJRA)",
     "check": "V-05",
     "title": "Scope in verify is the scope of the latest transition: a later USE can widen or erase what was granted",
     "where": "core/relay-chain/authority/lifecycle.go:243 (subjectRecord = latest record; GetSubjectInfo returns its scope); "
              "Transition accepts any scope on any transition (no comparison with the GRANT scope)",
     "steps": ["GRANT a subject with scope ['read:evidence'], then USE with scope [] -> verify reports [] (V-05).",
               "GRANT ['read:evidence'], then USE ['read:evidence','delete:evidence'] -> verify reports both; Cybersecurity then "
               "allows delete:evidence, which was never granted (V-05 note)."],
     "expected": "The scope granted at GRANT stays until a new GRANT; a later transition cannot widen it.",
     "fix": "Keep the GRANT scope as the subject's scope, and refuse or ignore a different scope on later transitions "
            "(or document that each transition re-states the scope, and who may widen it)."},
    {"id": "VAJ-13", "severity": "HIGH", "system": "VAJRA", "owner": "Prakash (VAJRA) / Samsoorya (runtime)",
     "check": "V-08",
     "title": "Authority ledger: a revocation can be undone by a restart; edited lines are trusted; one bad line wipes all state",
     "where": "core/relay-chain/authority/lifecycle.go:246-255 (write errors ignored; the transition still succeeds), :127-152 "
              "(loadFromFile trusts each line; prev_hash/entry_hash are not checked, although the same file has VerifyChain()), "
              ":261-268 (CalculateHash leaves out the scope, so an edited scope would pass even a chain check), "
              "api/server.go:102-106 (any load error -> in-memory manager: nothing is loaded and nothing is saved from then on)",
     "steps": ["GRANT, USE, then REVOKE a subject while the ledger file cannot be written: REVOKE answers 200; after a "
               "restart the subject is USE and authorized again (V-08).",
               "Edit the REVOKE line to USE in authority_ledger.jsonl and restart: the subject is USE and authorized (V-08).",
               "Append one unreadable line and restart: every subject's state is gone, and a GRANT accepted afterwards is not "
               "written to the ledger file (V-08)."],
     "expected": "A transition that cannot be saved fails (and does not change state); the hash chain, including the scope, "
                 "is checked on reload; a damaged ledger stops the node (fail closed) or is reported, never silently replaced "
                 "by an empty one.",
     "fix": "Return an error and roll back when the append (and fsync) fails; call VerifyChain() after loading and refuse to "
            "start on a failure or a load error, instead of falling back to memory-only; include the scope in CalculateHash."},
    {"id": "VAJ-14", "severity": "HIGH", "system": "VAJRA", "owner": "Prakash (VAJRA)",
     "check": "V-07",
     "title": "One anonymous report can freeze any wallet; a negative severity can hide reports",
     "where": "core/relay-chain/api/server.go:298 (/api/cybercrime/report without login); api/cybercrime_handlers.go:55 "
              "(severity is any int the caller sends), :41 and :86 (auto-freeze when the sum reaches 15)",
     "steps": ["POST /api/cybercrime/report with no token and severity 15: the wallet is frozen by SYSTEM_AUTO_FREEZE (V-07).",
               "Report severity -1000, then two reports of 10: the sum is -980 and the wallet stays active (V-07)."],
     "expected": "Only an authenticated, bounded report counts, and reports alone do not freeze a wallet without review.",
     "fix": "Require login on report, bound severity (for example 1-10), count distinct authenticated reporters, and keep "
            "freezing behind the authenticated freeze route. This bypasses the VAJ-06 fix for freeze."},
    # ------------------------------------------------------------------ TANTRA
    {"id": "TAN-01", "severity": "HIGH", "system": "TANTRA", "owner": "TANTRA team (owner name UNKNOWN)",
     "check": "S5-01", "confirmed_when": {"check": "S5-01", "what": "TANTRA reason", "actual": "event_type_not_registered"},
     "title": "No TANTRA contract exists for cybersecurity events",
     "where": "live TANTRA validation layer :8101 /validate/prana/ingress (registry prana.event.contracts)",
     "steps": ["POST a 'security_decision' envelope to /validate/prana/ingress.", "Reply: 422 event_type_not_registered, with the list of registered types."],
     "expected": "A registered contract (schema + version) for cybersecurity decisions, so they can enter the TANTRA ledger.",
     "fix": "Register a 'security_decision' event type (or name the registered type Cybersecurity should use)."},
    {"id": "TAN-02", "severity": "HIGH", "system": "TANTRA", "owner": "TANTRA team (owner name UNKNOWN)",
     "check": None, "title": "TANTRA repository has no service code: four submodule links with no .gitmodules",
     "where": "bhiv-TANTRA_Layer: Karma-Tracker, bhiv-karma-helper, bhiv-prana, bhiv-validation-layer (git mode 160000, no .gitmodules)",
     "steps": ["git clone the repo; the four folders are empty and cannot be fetched."],
     "expected": "Service code (or reachable submodules) so TANTRA can be built and tested outside the live VM.",
     "fix": "Add .gitmodules with reachable URLs, or vendor the services."},
    {"id": "TAN-03", "severity": "HIGH", "system": "TANTRA", "owner": "TANTRA team (owner name UNKNOWN)",
     "check": None, "title": "A .env file is committed to the TANTRA repository",
     "where": "bhiv-TANTRA_Layer/.env (tracked; contents not opened by us)",
     "steps": ["git ls-files shows .env."],
     "expected": "No .env in git.",
     "fix": "Remove it from git, add it to .gitignore, rotate anything it contained."},
    {"id": "TAN-04", "severity": "MEDIUM", "system": "TANTRA", "owner": "TANTRA team (owner name UNKNOWN)",
     "check": None, "title": "No test lane for TANTRA's governed enforcement path",
     "where": "live karma :8102 /intelligence/sarathi/enforce ('Forward signal enforcement request to Sarathi Policy Enforcement "
              "Layer') and /intelligence/rajya/validate ('Forward authority validation request to RAJYA Authority Validation Layer'), "
              "per TANTRA's OpenAPI",
     "steps": ["These routes forward to other live systems (policy enforcement, authority validation); there is no dry-run flag or "
               "test prefix, so we did not call them. Whether rajya/validate is the approval contract for security responses is UNKNOWN."],
     "expected": "A safe way to test 'authorize or deny a bounded response' (dry-run flag or agreed test prefix).",
     "fix": "Add a dry-run/test-prefix mode like VAJRA's test_probe_."},
    {"id": "TAN-06", "severity": "MEDIUM", "system": "TANTRA", "owner": "TANTRA team (owner name UNKNOWN)",
     "check": None, "observed_in": {"file": "previous_runs/20261104T103939Z/api_samples/S8-02.json", "contains": "parent_hash required", "how": "live reply to the single probe write, run 20261104T103939Z"},
     "title": "PRANA's onward write to the Bucket fails: 400 'parent_hash required (not first artifact)'",
     "where": "live TANTRA /karma/ingest reply, field prana.bucket.propagation (PRANA forwarding to the Bucket's artifact endpoint)",
     "steps": ["POST a valid integrity_probe envelope (it passes /validate) to /karma/ingest.",
               "The reply says prana.status 'forwarded', but prana.bucket.status 'failed': HTTP 400 'Artifact validation failed: "
               "parent_hash required (not first artifact)', reported together with a 5 s read timeout."],
     "expected": "Events that PRANA forwards reach the Bucket, or the caller is told what it must supply.",
     "fix": "Have PRANA send the parent hash the Bucket requires, or document what the submitter must include."},
    {"id": "TAN-05", "severity": "MEDIUM", "system": "Bucket (owner UNKNOWN)", "owner": "Bucket owner (UNKNOWN; sent to the TANTRA team to forward)",
     "check": None, "observed_in": {"file": "api_samples/outside_run/live_probe_20261104T074845Z.txt", "contains": "\"redis\":\"disconnected\"",
                                    "how": "live read-only GET at 07:48Z, before the run"},
     "title": "Bucket health reports 'degraded' (redis disconnected)",
     "where": "live https://bhiv-bucket-i1l6.onrender.com/health (GET, 2026-11-04T07:48:51Z)",
     "steps": ["GET /health on the Bucket."],
     "expected": "healthy",
     "fix": "Restore the Bucket's redis connection."},
]
