# Review index

Read in this order; each item stands alone.

| # | Document | What you get |
|---|---|---|
| 0 | [review_packets/CYBER-VAJRA-RECHECK-2026-11-05/VAJRA_RECHECK.md](review_packets/CYBER-VAJRA-RECHECK-2026-11-05/VAJRA_RECHECK.md) - [REVIEW_PACKET.md](review_packets/CYBER-VAJRA-RECHECK-2026-11-05/REVIEW_PACKET.md) | 05 Nov: VAJRA's fixes (commit `3cc883f`) re-checked step by step, the scope check added to protected access; the review packet regenerated from the 05 Nov run (the current top-level evidence) |
| 1 | [review_packets/CYBER-P0-2026-11-04/REVIEW_PACKET.md](review_packets/CYBER-P0-2026-11-04/REVIEW_PACKET.md) | 04 Nov delivery (as delivered): entry point, core flow (3 files), live flow, real JSON, what changed, failure cases, status. Its run is archived in `evidence_packet/previous_runs/20261104T133229Z/` |
| 2 | [evidence_packet/test_results/PROOF_MATRIX.md](evidence_packet/test_results/PROOF_MATRIX.md) | Every task requirement mapped to executed checks, plus Task 1 acceptance conditions |
| 3 | [evidence_packet/test_results/TEST_REPORT.md](evidence_packet/test_results/TEST_REPORT.md) | Run details, all suites, every check with expected vs actual |
| 4 | [evidence_packet/test_results/DEFECTS.md](evidence_packet/test_results/DEFECTS.md) | Defects with owner, steps, actual result and fix |
| 5 | [review_packets/CYBER-P0-2026-11-04/EOD_REPORT.md](review_packets/CYBER-P0-2026-11-04/EOD_REPORT.md) | EOD 04 Nov report in the required format, team closure, BIQOS readiness board (as delivered; figures from run 20261104T133229Z) |
| 6 | [evidence_packet/test_results/LIVE_TANTRA_CALLS.md](evidence_packet/test_results/LIVE_TANTRA_CALLS.md) | Every call made to the live TANTRA services on 04 Nov (in the runs, and by hand outside them), and what the one ledger write caused inside TANTRA. The 05 Nov run made no TANTRA call |
| 7 | [INTEGRATION.md](INTEGRATION.md) - [ARCHITECTURE.md](ARCHITECTURE.md) - [BCAES_ALIGNMENT.md](BCAES_ALIGNMENT.md) | Contracts, as-built design, ownership and limits |
| 8 | [HANDOVER.md](HANDOVER.md) | Everything a receiving engineer needs, with no prior context |
| 9 | [CHANGELOG.md](CHANGELOG.md) | What changed and when |

## Evidence packet layout

| Folder | Contents |
|---|---|
| `evidence_packet/review_packet.md` | Same as the REVIEW_PACKET above |
| `evidence_packet/api_samples/` | Every HTTP exchange per check (request + response, secrets redacted); `outside_run/` holds the live calls made by hand on the same day |
| `evidence_packet/runtime_logs/` | Cybersecurity API log and VAJRA node log from the run |
| `evidence_packet/test_results/` | results.json, junit.xml, raw unit-test outputs, generated reports |
| `evidence_packet/replay_evidence/` | VAJRA TruthStore rows, golden trace walk-through, TANTRA ledger probe |
| `evidence_packet/deployment_proof/` | Start-up timings, versions, commands, restart evidence |
| `evidence_packet/screenshots/` | Screenshots of the running endpoints (see SCREENSHOTS_INDEX.md) |
| `evidence_packet/code_packet/` | The three files that carry the core flow |
| `evidence_packet/architecture_and_integration_maps/` | Cross-pillar map, VAJRA capability map |
| `evidence_packet/previous_runs/` | Earlier runs as byte-for-byte copies, each with an added README and a derived `tantra_calls.json`: the TANTRA records of three 04 Nov live runs and every file of the 04 Nov final run (`20261104T133229Z`) |
| `evidence_packet/MANIFEST.sha256` | SHA-256 of every evidence file |

## Re-run everything

See [verification/README.md](verification/README.md).
