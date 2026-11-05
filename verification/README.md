# Verification harness

Independent, repeatable checks of the Cybersecurity module against **real processes**:

- the Cybersecurity API, run with uvicorn;
- a VAJRA relay node built from `bhiv-VAJRA_Blockchain`;
- optionally, the live TANTRA layer.

Nothing in the integrated checks is mocked. Where the harness stands in for another team's role, the check's evidence
level says SIMULATED. Examples: granting or revoking consent as the VAJRA user journey would, or issuing
ISOLATE/TERMINATE as TANTRA governance would.

## Run

```bash
# 1. Build the VAJRA node (Go 1.23+)
cd <bhiv-VAJRA_Blockchain>/core/relay-chain && go build -o <bin>/vajra-relay ./cmd/relay
# 2. From this repository's root, with the backend's Python environment
python verification/run_verification.py --vajra-bin <bin>/vajra-relay --vajra-repo <bhiv-VAJRA_Blockchain> --tantra off
# live TANTRA: health GETs + /validate calls; add --allow-live-tantra-write for ONE ledger probe
python verification/run_verification.py --vajra-bin <bin>/vajra-relay --tantra live --tantra-base http://<tantra-host> --allow-live-tantra-write
python verification/capture_screenshots.py --vajra-bin <bin>/vajra-relay [--tantra-base http://<tantra-host>]
python verification/build_reports.py --packet-dir review_packets/<new packet name>
```

`build_reports.py` rewrites the reports in `evidence_packet/`, and writes a review packet only into the folder named
with `--packet-dir` (`--eod` adds an EOD report). Delivered packets such as `review_packets/CYBER-P0-2026-11-04/` stay
as delivered. Before a new run replaces the top-level evidence, archive the old run under `evidence_packet/previous_runs/`.

The local node gets fresh random values for both VAJRA tokens: `VAJRA_TANTRA_SECRET` (governance; the harness uses it
to play the consent and governance roles) and `VAJRA_CYBER_SECRET` (evidence-only). The Cybersecurity API gets the
governance token in the main run, because VAJRA `3cc883f` refuses the evidence-only token on evidence/record (VAJ-10).
Check S6-05 runs the API with the evidence-only token alone.

Each run uses a new folder under `--work-root` (default: the system temp folder), with a fresh database, throwaway
secrets and synthetic users. The folder is deleted at the end. If deletion fails, the run prints a warning naming the
folder, because the folder holds unredacted logs and a throwaway VAJRA node key.

## What it checks

| Group | Checks |
|---|---|
| EOD mandatory scenarios | S1 unauthorized access, S2 revoked permission, S3 low confidence, S4 duplicates (including S4-04 key reuse and S4-05 replay after revocation), S5 TANTRA denial, outage and slow peer, S6 evidence failure, S7 recovery failure, S8 trace/replay |
| 10-day mandatory proofs | P-A normal, S2-01 revocation, P-C1..P-C3 attack, S7-02/S7-03/S7-04/S7-05/S8-03 recovery |
| Scope (CYB-13) | S1-08 (inside the VAJRA scope: ALLOW; outside: DENY), plus `scope_checked` in P-A |
| Peer boundaries (VAJRA, local node) | V-01 routes need a token; V-02/V-04 permission ids; V-03 evidence-only token tiers; V-05 scope in verify and after later transitions; V-06 forged recovery signatures; V-07 freeze through anonymous reports; V-08 authority ledger edited, unsaved or damaged; S6-05 Cybersecurity with the evidence-only token alone |
| Observability | O-01..O-04 |

## Results

| Status | Meaning |
|---|---|
| PASS | Every expectation held |
| FAIL | At least one expectation did not hold; the actual value is recorded |
| BLOCKED | Another owner's component is missing |
| SKIPPED | Not run in this mode |
| ERROR | The check crashed, or its result was inconclusive |

Only PASS counts as passed. Each check's evidence level is set from what the run actually exercised.

## What is written

`run_verification.py` writes to `evidence_packet/`:

- `api_samples/<check>.json`: every request and response;
- `test_results/results.json` and `junit.xml`;
- `runtime_logs/`, `replay_evidence/` and `deployment_proof/`.

Before writing, it redacts tokens, passwords and generated secrets. If any of them would still appear, it writes
nothing.

## Live TANTRA footprint

With `--tantra live`, the run makes these calls:

- three health GETs;
- `/validate` calls from the API during P-A, S8-01 and S5-01;
- one read-only PRANA replay lookup (S5-01);
- one malformed envelope sent to `/validate` (S5-04);
- with `--allow-live-tantra-write` (S8-02): one `/validate`, then exactly one karma ledger write using TANTRA's
  registered `integrity_probe` contract, then a replay check.

During the live checks the API runs with an empty `TANTRA_KARMA_URL`, so it cannot write to the TANTRA ledger itself.
Every trace id and submission id sent to TANTRA starts with `cyber-p0-test-`; request ids and ids inside payloads
do not. `test_results/LIVE_TANTRA_CALLS.md`
lists every call and counts the ledger writes.
