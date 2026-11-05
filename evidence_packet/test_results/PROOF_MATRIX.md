# Final proof matrix

Each requirement maps to checks in this run. VERIFIED = every mapped check passed and the requirement asks for nothing more; FAILING = at least one failed; PARTIAL = some passed and the rest were blocked or skipped, or all passed but the requirement asks for more than the run showed (the reason follows the bracket); NOT VERIFIED = none passed. The bracket lists the systems the passing checks touched (live or local) and whether the harness simulated a role.

Run `20261105T151254Z`, TANTRA mode `off`. TANTRA was not called in this run (mode off, on purpose). The last run that called live TANTRA (read-only), `20261104T133229Z`, is archived under `previous_runs/20261104T133229Z/`; its TANTRA checks: O-02 PASS, S5-01 PASS, S5-04 PASS, S8-02 SKIPPED. The one TANTRA ledger write (S8-02) was made in run `20261104T103939Z`.

| Source | Requirement | Checks (result) | Status |
|---|---|---|---|
| EOD 04 Nov - mandatory scenario | Unauthorized access: denied at the enforcement point; actor, resource, decision, reason evidenced | S1-01 PASS, S1-02 PASS, S1-03 PASS, S1-04 PASS, S1-05 PASS, S1-06 PASS, S1-07 PASS, S1-08 PASS, V-01 PASS, V-03 FAIL, V-07 FAIL | **FAILING (API: local; VAJRA: local node; includes SIMULATED roles)** |
| EOD 04 Nov - mandatory scenario | Revoked permission: next request denied; stale grants do not persist | S2-01 PASS, S2-02 PASS, S2-03 PASS, S2-04 PASS, S4-05 PASS, V-02 PASS, V-04 FAIL | **FAILING (API: local; VAJRA: local node; includes SIMULATED roles)** |
| EOD 04 Nov - mandatory scenario | Ambiguous / low confidence: uncertainty visible; no autonomous high-impact action | S3-01 PASS, S3-02 PASS, S3-03 PASS | **VERIFIED (API: local)** |
| EOD 04 Nov - mandatory scenario | Duplicate event: no duplicate incident or repeated privileged action | S4-01 PASS, S4-02 PASS, S4-03 PASS, S4-04 PASS | **VERIFIED (API: local; VAJRA: local node; includes SIMULATED roles)** |
| EOD 04 Nov - mandatory scenario | TANTRA denial / outage: fails safely, no bypass, failure observable | S5-01 SKIPPED, S5-02 PASS, S5-03 PASS, S5-04 SKIPPED, S5-05 PASS | **PARTIAL (API: local; VAJRA: local node; partly CODE-VERIFIED; includes SIMULATED roles)** |
| EOD 04 Nov - mandatory scenario | Evidence failure: missing evidence visible, no false completion | S6-01 PASS, S6-02 PASS, S6-03 PASS, S6-04 PASS, S6-05 FAIL | **FAILING (API: local; VAJRA: local node; includes SIMULATED roles)** |
| EOD 04 Nov - mandatory scenario | Recovery failure: stays restricted until required checks pass | S7-01 PASS, S7-02 PASS, S7-03 PASS, S7-04 PASS, S7-05 PASS, V-06 FAIL, V-08 FAIL | **FAILING (API: local; VAJRA: local node; includes SIMULATED roles)** |
| EOD 04 Nov - mandatory scenario | Trace / replay: source, decision, enforcement and evidence linked; replay where supported | S8-01 PASS, S8-02 SKIPPED, S8-03 PASS | **PARTIAL (API: local; VAJRA: local node; includes SIMULATED roles)** |
| 10-day - mandatory proof | A NORMAL: user -> identity -> consent -> authorised access -> evidence | P-A PASS | **VERIFIED (API: local; VAJRA: local node; includes SIMULATED roles)** |
| 10-day - mandatory proof | B REVOCATION: active permission -> revoke -> future request denied -> evidence | S2-01 PASS, S4-05 PASS | **VERIFIED (API: local; VAJRA: local node; includes SIMULATED roles)** |
| 10-day - mandatory proof | C ATTACK: threat -> detect -> correlate -> govern -> contain -> evidence | P-C1 PASS, P-C2 PASS, P-C3 PASS | **PARTIAL (API: local; VAJRA: local node; includes SIMULATED roles) - the govern step (TANTRA approval) was played by the harness (SIMULATED); the approval contract is UNKNOWN** |
| 10-day - mandatory proof | D RECOVERY: failure -> candidate -> verify -> replay/integrity -> rebuild -> reinstate | S7-02 PASS, S7-03 PASS, S7-04 PASS, S7-05 PASS, S8-03 PASS, V-06 FAIL, V-08 FAIL | **FAILING (API: local; VAJRA: local node; includes SIMULATED roles)** |
| Task 1 section M - live path | Input signal / data-access event -> Cybersecurity processing -> decision | S1-05 PASS, P-A PASS | **PARTIAL (API: local; VAJRA: local node; includes SIMULATED roles) - the checks passed against local processes or simulated roles; Task 1 section M asks for the live path** |
| Task 1 section M - live path | Controlled downstream response (containment through VAJRA) | P-C3 PASS, S7-02 PASS | **PARTIAL (API: local; VAJRA: local node; includes SIMULATED roles) - the checks passed against local processes or simulated roles; Task 1 section M asks for the live path** |
| Task 1 section M - live path | Evidence / audit -> replay reference | S1-01 PASS, S8-01 PASS, S8-03 PASS | **PARTIAL (API: local; VAJRA: local node; includes SIMULATED roles) - the checks passed against local processes or simulated roles; Task 1 section M asks for the live path** |
| Task 1 section M - live path | Observability | O-01 PASS, O-03 PASS, O-04 PASS | **PARTIAL (API: local; VAJRA: local node) - the checks passed against local processes or simulated roles; Task 1 section M asks for the live path** |
| Task 1 section M - live path | TANTRA runtime participation | O-02 SKIPPED, S5-01 SKIPPED, S5-04 SKIPPED, S8-02 SKIPPED | **NOT VERIFIED** |
| Task 1 section M - Vajra boundary | Vajra consent state and scope -> Cybersecurity enforcement -> permitted operation -> evidence (caller binding NOT checked: CYB-13) | S2-01 PASS, P-A PASS, S1-05 PASS, S1-08 PASS, S5-03 PASS, S1-06 PASS | **PARTIAL (API: local; VAJRA: local node; partly CODE-VERIFIED; includes SIMULATED roles) - the checks passed against local processes or simulated roles; Task 1 section M asks for the live path; VAJRA ran as a local node with consent SIMULATED; the caller is not bound to the subject (CYB-13); the evidence-only VAJRA token is refused by VAJRA (VAJ-10)** |

## Task 1 section O acceptance conditions

| Condition | Met? | Basis (evidence status) |
|---|---|---|
| BUILD WORKS | **YES** | OFFLINE-VERIFIED: both services started in this run (deployment_proof/local_runtime_proof.json); unit tests: 119 passed, 336 warnings |
| INTEGRATION WORKS | **PARTIAL** | VAJRA path OFFLINE-VERIFIED on a local node (consent SIMULATED). TANTRA not exercised in this run.  |
| TESTS PASS | **NO** | 43 PASS, 7 FAIL, 0 ERROR, 0 BLOCKED, 4 SKIPPED; failures are listed in DEFECTS.md |
| EVIDENCE EXISTS | **YES** | all evidence folders present |
| VM DEPLOYMENT WORKS | **NO** | BLOCKED-EXTERNAL: no VM reference was provided to this work (owner: Rajaryan) |
| TANTRA PARTICIPATION IS PROVEN | **PARTIAL (archived run 20261104T133229Z)** | not exercised in this run. TANTRA was not called in this run (mode off, on purpose). The last run that called live TANTRA (read-only), `20261104T133229Z`, is archived under `previous_runs/20261104T133229Z/`; its TANTRA checks: O-02 PASS, S5-01 PASS, S5-04 PASS, S8-02 SKIPPED. The one TANTRA ledger write (S8-02) was made in run `20261104T103939Z`. |
| VAJRA BOUNDARY IS PROVEN | **PARTIAL** | OFFLINE-VERIFIED against the real VAJRA code (commit 3cc883f) run locally: consent state and granted scope (S1-08 PASS); the caller is not bound to the subject (CYB-13); least-privilege token set-up S6-05 FAIL; live VAJRA not used (VAJRA asks for no test records on its live node) |
| BCAES ALIGNMENT IS DOCUMENTED | **YES** | BCAES_ALIGNMENT.md (unknowns marked UNKNOWN) |
| HANDOVER IS COMPLETE | **PENDING** | HANDOVER.md covers the Task 1 section L items; acceptance by a receiving engineer is PENDING |
| CENTRAL DEPOSITORY RECEIVES THE ASSET | **PENDING** | submission channel and reference are UNKNOWN |
