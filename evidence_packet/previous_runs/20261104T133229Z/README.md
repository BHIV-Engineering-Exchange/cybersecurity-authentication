# 04 Nov final run 20261104T133229Z

This is the run that the 04 Nov EOD report and review packet (`review_packets/CYBER-P0-2026-11-04/`) describe: 42 PASS / 3 FAIL / 0 BLOCKED / 1 SKIPPED / 0 ERROR of 46, Cybersecurity commit `4d1c687248fc1ee4a3d4be32233af75658298239`, VAJRA commit `07d683c3656b936152367989e8458d18941471a7`, TANTRA live (read-only).

On 2026-11-05 the verification was repeated against VAJRA commit 3cc883f, with TANTRA not called, and that run replaced the top-level evidence. The 61 files this run produced are kept here as byte-for-byte copies; this
README and `tantra_calls.json` were added on 2026-11-05 (the second is derived from the copied files):

- `test_results/`: results.json, junit.xml, the reports generated from them, the VAJRA Go test output (VAJRA 07d683c) and the unit-test output of that day;
- `api_samples/`: every recorded HTTP exchange of the run;
- `runtime_logs/`, `replay_evidence/`, `deployment_proof/`, `architecture_and_integration_maps/`: as generated;
- `tantra_calls.json`: the 8 live TANTRA calls of this run, derived from the exchanges and the API log.

This was the last run that called live TANTRA. Links inside the 04 Nov reports point to the top-level evidence; the matching files of that day are the ones in this folder.
