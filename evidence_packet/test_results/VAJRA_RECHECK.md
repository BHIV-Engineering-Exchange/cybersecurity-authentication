# VAJRA re-check (after VAJRA's fixes)

Run `20261105T151254Z` (2026-11-05T15:13:13Z to 2026-11-05T15:15:34Z) against a LOCAL node built from VAJRA commit `3cc883f760562767d7039c5067b7b7d822b22b68`. Nothing was written to VAJRA's live node. Every status below comes from this run's `results.json` or from `verification/defects.py` (CODE-VERIFIED items).

## 1. VAJRA's re-verification steps

| Step | VAJRA's step (paraphrased) | Check | Result in this run |
|---|---|---|---|
| 1 | Fetch branch vajra-tantra-runtime-increment and build it | - | set-up: node built from `3cc883f760562767d7039c5067b7b7d822b22b68` |
| 2 | Set VAJRA_TANTRA_SECRET, VAJRA_CYBER_SECRET and PORT=8080 | - | set-up: fresh random values for both secrets, and HTTP_PORT set to a free local port (the harness runs the node on a free port). The relay reads HTTP_PORT, not PORT (core/relay-chain/cmd/relay/main.go:230), so PORT=8080 has no effect; 8080 is only the default. |
| 3 | Freeze without a token answers 401 | V-01 | PASS: expected 401 or 403, got 401 |
| 4 | Evidence with the cyber token answers 200 | V-03 | FAIL: expected 200, success=true, got 401: {"details":"Authorization: Bearer <VAJRA_TANTRA_SECRET> required","error":"UNAUTHORIZED","success":false} |
| 5 | A transition with the cyber token answers 403 | V-03 | PASS: expected 403, got 403 |
| 6 | Verify shows the scope | V-05 | PASS: expected ['read:evidence'], got ['read:evidence'] |
| 7 | Authority state survives a reboot | S7-05 | PASS: expected USE, got USE |

## 2. The items VAJRA reported fixed, and what this re-check found

| ID | Severity | VAJRA's reply (paraphrased) | Status after this run |
|---|---|---|---|
| VAJ-01 | HIGH | docs now give port 8080 | PARTLY FIXED by the owner in VAJRA 3cc883f; CODE-VERIFIED (found by reading code or repository state; no runtime check) |
| VAJ-02 | HIGH | authority state persisted in an append-only authority_ledger.jsonl | FIXED by the owner in VAJRA 3cc883f; S7-05 passes in this run |
| VAJ-03 | LOW | hash-only evidence storage documented | PARTLY FIXED by the owner in VAJRA 3cc883f; CODE-VERIFIED (found by reading code or repository state; no runtime check) |
| VAJ-04 | MEDIUM | scripted steps labelled simulated; totals counted | FIXED by the owner in VAJRA 3cc883f (CODE-VERIFIED) |
| VAJ-05 | MEDIUM | deterministic Ed25519-format signature commitments | NOT FIXED in VAJRA 3cc883f (reported fixed by the owner); CONFIRMED at runtime by V-06 |
| VAJ-06 | HIGH | the routes now go through the auth middleware (401) | FIXED by the owner in VAJRA 3cc883f; V-01 passes in this run |
| VAJ-07 | HIGH | the hash part of the id is kept | PARTLY FIXED by the owner in VAJRA 3cc883f; CONFIRMED at runtime by V-04 |
| VAJ-08 | LOW | script fixed | FIXED by the owner in VAJRA 3cc883f (CODE-VERIFIED) |
| VAJ-09 | LOW | curl samples send the Bearer header | PARTLY FIXED by the owner in VAJRA 3cc883f; CODE-VERIFIED (found by reading code or repository state; no runtime check) |
| VAJ-10 | HIGH | new: found in this re-check | CONFIRMED at runtime by S6-05, V-03 |
| VAJ-11 | HIGH | new: found in this re-check | CONFIRMED at runtime by V-03 |
| VAJ-12 | MEDIUM | new: found in this re-check | CONFIRMED at runtime by V-05 |
| VAJ-13 | HIGH | new: found in this re-check | CONFIRMED at runtime by V-08 |
| VAJ-14 | HIGH | new: found in this re-check | CONFIRMED at runtime by V-07 |

Details, steps and suggested fixes for every item: [DEFECTS.md](DEFECTS.md).

## 3. The two asks

- Evidence-only token: V-03 FAIL, S6-05 FAIL. Linked defects: VAJ-10: The evidence-only token is refused by evidence/record, the one route it is meant for; VAJ-11: The 'evidence-only' token can still grant and revoke permissions and reach admin submit-transaction.
- Scope in verify: step 6 above; Cybersecurity checks it (S1-08 PASS). Scope after a later transition: V-05 FAIL; linked defects: VAJ-12: Scope in verify is the scope of the latest transition: a later USE can widen or erase what was granted.
- Token issuer: VAJRA's reply names security/jwt_handler.py (RS256) and TANTRA/Pravesh. CODE-VERIFIED at the tested commit: that file is in VAJRA's own repository (an RS256 JWT engine, default issuer 'tantra.governance.niyantran', used by VAJRA's Python services api/production.py and evaluation_engine/rule_engine.py), but the Go relay's bearer gate does not use it: it compares the bearer with two fixed values from its environment (core/relay-chain/api/server.go:380-439). Who issues and rotates those two values is still UNKNOWN.
