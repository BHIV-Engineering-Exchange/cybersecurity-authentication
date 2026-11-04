# Handover - BHIV Cybersecurity module

For an engineer taking over with no earlier context. Statuses use one vocabulary:

| Status | Meaning |
|---|---|
| LIVE-VERIFIED | Run against a live service, with the run recorded |
| OFFLINE-VERIFIED | Run locally (real processes or unit tests), with the output recorded |
| CODE-VERIFIED | Confirmed by reading the code |
| BLOCKED-EXTERNAL | Needs another owner |
| UNKNOWN | Nobody has told us |
| PENDING | Ours to do |

## 1. System overview

The Cybersecurity module is the security layer of BHIV/BHQ. It does authentication, authorization, access-control
decisions, the security audit trail and investigation services. It also takes part in VAJRA (consent and evidence)
and TANTRA (contracts and evidence ledger) without taking over their authority. Overview: [README.md](README.md).
Limits: [BCAES_ALIGNMENT.md](BCAES_ALIGNMENT.md).

## 2. Build state (2026-11-04)

| What exists | Status | Where the proof is |
|---|---|---|
| FastAPI service `cybercrime/backend` | OFFLINE-VERIFIED: starts, health, RBAC deny paths, token and account revocation (also after a crash-restart) | `evidence_packet/test_results/TEST_REPORT.md` |
| Protected access + BHIV bridge (new) | OFFLINE-VERIFIED against a local VAJRA node: consent read, fail-closed decisions, no ALLOW without VAJRA evidence, audit, idempotency, gaps reported | Same; checks P-A, S1-05, S2-01, S4-*, S6-* |
| VAJRA integration | OFFLINE-VERIFIED against the real VAJRA code (commit `07d683c`) on a local node; consent state only, scope not checked (CYB-13) | Same |
| TANTRA integration | Contract gate: see checks S5-01, S5-04; ledger probe: see check S8-02 (both need a `--tantra live` run) | `evidence_packet/test_results/LIVE_TANTRA_CALLS.md` |
| fraud-evidence-system | Its own Jest suite runs; failures listed (FES-01) | `evidence_packet/test_results/` |
| Deployment | OFFLINE-VERIFIED as local processes; VM BLOCKED-EXTERNAL | `evidence_packet/deployment_proof/` |

## 3. Repository map

See the table in [README.md](README.md). Key files for the core flow:

- `cybercrime/backend/app/api/v1/endpoints/protected_access.py`
- `cybercrime/backend/app/core/bhiv_runtime.py`
- `verification/checks/scenarios.py`

## 4. Environment setup

1. Python 3.12. Install `cybercrime/backend/requirements.txt` without the `TTS` line (see README).
2. Copy `cybercrime/backend/env.template` to `.env`. Set `SECRET_KEY`; keep the integration URLs empty until you
   have real ones.
3. Optional peers:
   - VAJRA node: `cd core/relay-chain && go build ./cmd/relay` in `bhiv-VAJRA_Blockchain`, then run it with
     `BLOCKCHAIN_DOCKER=true HTTP_PORT=8080 VAJRA_TANTRA_SECRET=<token>`.
   - TANTRA: no local build is possible (TAN-02); use the TANTRA team's deployment.
4. Start: `python -m uvicorn main:app --host 0.0.0.0 --port 3000` from `cybercrime/backend`.

## 5. Architecture flow

[ARCHITECTURE.md](ARCHITECTURE.md). The live path is drawn in the REVIEW_PACKET, section 3.

## 6. Integration contracts

[INTEGRATION.md](INTEGRATION.md): inbound `/api/v1/protected/access`, VAJRA verify/evidence, TANTRA validate/ingest/verify,
and the token caveat.

## 7. VM deployment

**BLOCKED-EXTERNAL:** no VM reference has been provided to this work. Where the VM is, and who provides it, are UNKNOWN
(ask Rajaryan).

When a VM is available:

1. Install Python 3.12 and the requirements.
2. Set the environment (SECRET_KEY, DATABASE_URL, VAJRA_*, TANTRA_*).
3. Run uvicorn under a service manager (restart on failure).
4. Check `/health` and `/api/v1/system/health`.
5. Collect the logs (stdout JSON lines).
6. Rerun `verification/run_verification.py` against it.

The checklist is in [DEP/README.md](DEP/README.md).

## 8. Known issues

Full list with steps and fixes: [DEFECTS.md](evidence_packet/test_results/DEFECTS.md). The most important:

- **CYB-13:** protected access checks consent state only, not scope, and the VAJRA token is unscoped.
- **TAN-01:** no TANTRA contract for cybersecurity events.
- **VAJ-02:** VAJRA authority state is lost on restart.
- **VAJ-06:** VAJRA permission-grant and freeze routes (and the token-mint route) run without authentication.

Fixed on 2026-11-04 by Hemanth at the team's request, for the lane owners' review:
- CYB-01, CYB-02, CYB-04, CYB-05, CYB-07, CYB-08, CYB-09, CYB-12, CYB-15 (Kaushlendra);
- CYB-03, CYB-06 (Shivam);
- CYB-14 (bridge rate limit).

New in the same change: failed-login detection and correlation (`app/core/threat_detection.py`, Shivam / Aryan Dias to
review). Details: CHANGELOG.md and DEFECTS.md.

## 9. Pending work

| Item | Owner |
|---|---|
| Review the fixes made in this lane (CYB-01, 02, 04, 05, 07, 08, 09, 12, 15) | Kaushlendra |
| Review CYB-03, CYB-06 and the detection rule `auth.repeated_failed_login` (threshold, window, confidence) | Shivam |
| Review the correlation (one open incident per account and window); decide how incidents close | Aryan Dias |
| Review and merge the branch; decide scope and caller binding with Prakash (CYB-13); provide the VM | Rajaryan |
| Confirm the Bucket reads its API key from the `X-API-Key` header (CYB-09) | Bucket owner (UNKNOWN) |
| Register the cybersecurity contract; a test lane for enforcement and authority validation; PRANA to Bucket (TAN-01..TAN-04, TAN-06) | TANTRA team |
| Durable authority state; auth on privileged routes; an evidence-only token; docs (VAJ-01..VAJ-09) | Prakash |
| Central Depository / BHEX submission | Rajaryan (submission reference UNKNOWN) |

## 10. FAQ

- **Why does protected access deny everything on a fresh install?** VAJRA is not configured, and the route fails
  closed (`VAJRA_NOT_CONFIGURED`).
- **Why is `evidence.complete` false?** At least one sink did not confirm a stored record; `evidence.gaps` names it.
  Today TANTRA always rejects the event type (TAN-01).
- **Why was the live VAJRA node not used for tests?** VAJRA's own capability matrix
  (`docs/CAPABILITY_TRUTH_MATRIX.md:38` in the VAJRA repo) asks that no test records be posted to the live node until a
  staging instance or a trace-prefix agreement exists. VAJRA's code treats trace ids starting with `test_probe_` as
  rehearsals that write nothing. Using that lane against the live node needs the VAJRA token and the VAJRA owner's
  agreement.
- **Is the threat intelligence trustworthy?** More than before, but it is still rule-based. Since 2026-11-04 the
  incident analysis reads only the system's own transaction dataset, and states its confidence and uncertainty
  (CYB-06, CYB-03). That dataset is filled by a generator script in this repository, so treat its results as test
  results until real data is loaded.
  Failed-login detection is a count rule, not a model. Generated demo data exists only with
  `INCIDENT_SYNTHETIC_DEMO=true`, and is labelled synthetic.
- **How do I undo a permission revocation?** `POST /api/v1/access/restore` as a superadmin.

## 11. Build history

| Commit | Date | Author | Message |
|---|---|---|---|
| 45962f1 | 2026-09-30 | kaushalendra | last commit Kaushal |
| f65fd3c | 2026-10-01 | kaushalendra | last commit |
| dbd34f7 | 2026-10-27 | kaushalendra | first commit |
| 59d2d63 | 2026-10-27 | kaushalendra | feat: complete unified cybersecurity repository with all services and documentation |
| (this change) | 2026-11-04 | Hemanth | verification harness, evidence packet, BHIV runtime bridge, docs (see CHANGELOG.md) |

The phase reports (`PHASE_1_*` to `PHASE_4_*`) record the work up to October 2026.

## 12. Testing evidence

The test report, proof matrix, raw outputs and per-check API samples are in `evidence_packet/`. How to rerun them:
[verification/README.md](verification/README.md).

## 13. Deployment evidence

Local start-up, health and crash-restart timings are in `evidence_packet/deployment_proof/`. Screenshots of running
endpoints are in `evidence_packet/screenshots/`. There is no VM evidence.

## 14. REVIEW_PACKET

[review_packets/CYBER-P0-2026-11-04/REVIEW_PACKET.md](review_packets/CYBER-P0-2026-11-04/REVIEW_PACKET.md).

## 15. Central Depository / BHEX

**PENDING.** The work is delivered on a review branch; the branch and commit are in the EOD report and the hand-over
message. The submission process and reference are UNKNOWN.

## 16. Still UNKNOWN

- What BCAES stands for.
- What "runtime registration" means here.
- Who approves security responses in TANTRA.
- Which VAJRA environment and token Cybersecurity may use, and who issues it.
- Who calls VAJRA transitions for opt-out.
- The VM.
- The Central Depository submission reference.
- What `DEP/` must contain.
- The URLs for the earlier BHIV Core and Bucket hooks.
