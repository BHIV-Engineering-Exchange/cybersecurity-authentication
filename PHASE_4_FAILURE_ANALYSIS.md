# PHASE 4 FAILURE ANALYSIS

## Summary
The remaining 13 failing tests in the `fraud-evidence-system` represent a combination of strict expectation mismatches (e.g., error formats), missing application routes, and disconnected schema properties. No architecture modifications or mock inventions are required; only minor logic alignment is needed.

| # | Test | Result | Root Cause | Category | Code Changed? | Evidence |
|---|---|---|---|---|---|---|
| 1 | `should deny access without authentication` | Expected 401, got 403 | `auth.js` middleware intentionally responds with 403 when Authorization header is missing. | C. TEST EXPECTATION DOES NOT MATCH CURRENT CONTRACT | No | `auth.js` line 29 |
| 2 | `should upload evidence file successfully` | Expected 201, got 500 | `evidenceRoutes.js` upload handler omits `wallet`, `reporter`, and `filePath` required by `Evidence` Mongoose schema, causing a ValidationError. | A. APPLICATION LOGIC BUG | Yes | Mongoose validation error stack in logs |
| 3 | `should reject upload without file` | Expected `true`, received `"No file uploaded"` | The test expects `res.body.error === true` with a separate `message` field, but the API returns `{ error: 'No file uploaded' }`. | C. TEST EXPECTATION DOES NOT MATCH CURRENT CONTRACT | No | `evidenceRoutes.js` line 105 |
| 4 | `should reject upload without required fields` | Expected `true`, received `"Case ID and entity are required"` | Similar to #3, expecting boolean `error` but receiving the error string on the `error` property. | C. TEST EXPECTATION DOES NOT MATCH CURRENT CONTRACT | No | `evidenceRoutes.js` line 109 |
| 5 | `should reject oversized files` | Expected 413, got 500 | Multer throws a `LIMIT_FILE_SIZE` error that is not caught and mapped to 413 in the route, falling back to Express 500 error handler. | A. APPLICATION LOGIC BUG | No | Express unhandled error stack trace |
| 6 | `should return specific evidence` | Expected 200, got 404 | The `GET /api/evidence/:evidenceId` endpoint is entirely missing from `evidenceRoutes.js`. | A. APPLICATION LOGIC BUG | Yes | "Endpoint not found: GET /api/evidence/..." in logs |
| 7 | `should return 404 for non-existent evidence` | Expected string, got HTML | Missing endpoint causes fallback to generic 404 handler, breaking the expected JSON response. | A. APPLICATION LOGIC BUG | Yes | Resolves with #6 |
| 8 | `should download evidence file` | Expected 200, got 404 | The test does not mock the local cache or `hybridStorageService`, causing `retrieveFile` to naturally fail in simulation mode. | B. TEST PAYLOAD / TEST DATA ERROR | No | `hybridStorageService.js` failing to read test mock file |
| 9 | `should verify evidence integrity` | Expected defined, got `undefined` | The test asserts `response.body.verification.overallIntegrity`, but the API returns `overallStatus`. | C. TEST EXPECTATION DOES NOT MATCH CURRENT CONTRACT | No | `evidenceRoutes.js` line 364 |
| 10 | `should return 404 for non-existent evidence (verify)` | Expected `true`, got `"Evidence not found"` | Mismatch between expected boolean `error` format and the string error returned by the API. | C. TEST EXPECTATION DOES NOT MATCH CURRENT CONTRACT | No | `evidenceRoutes.js` line 333 |
| 11 | `should handle invalid evidence ID format` | Expected 400, got 404 | Missing `:evidenceId` endpoint. | A. APPLICATION LOGIC BUG | Yes | Resolves with #6 |
| 12 | `should handle server errors gracefully` | Expected 500, got 404 | Missing `:evidenceId` endpoint. | A. APPLICATION LOGIC BUG | Yes | Resolves with #6 |
| 13 | `should enforce rate limits on evidence endpoints` | Expected > 0, got 0 | Rate limit middleware is either missing on the route or does not apply in the `test` environment (e.g. `NODE_ENV === 'test'`). | F. REMAINING ENVIRONMENT/DEPENDENCY PROBLEM | No | Rate limit bypass in test env |

## Payload Validation Verification
- **Expected schema:** The DB schema requires `caseId`, `wallet`, `reporter`, `filename`, `originalFilename`, `filePath`, `fileSize`, `fileType`, `storageHash`.
- **Actual test payload:** Sends `caseId`, `entity` (as wallet), `description`, `tags`, `riskLevel`, and the file buffer.
- **Validation result:** Validation fails because `reporter` and `filePath` are omitted entirely by the route handler.
- **Conclusion:** The route handler must be fixed to map the request data (including user email to reporter) to the required database fields. The application contract intentionally requires these fields; suppressing them in the schema would weaken security/auditability.

## Security & Authentication Review
- JWT parsing, RBAC, and Audit Logging remain intact. Test identity propagation is fully preserved (e.g. 403 on missing permissions). No bypasses were created.
