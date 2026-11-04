# Earlier live run 20261104T103939Z

The verification run was repeated after the fixes of 2026-11-04. The repeat did not make a second TANTRA ledger write, so the records of this earlier live run are kept here and carried over (labelled with this run id):

- `test_results/`: that run's results.json, junit.xml and LIVE_TANTRA_CALLS.md, unchanged.
- `api_samples/`: that run's recorded exchanges for every check that touched live TANTRA (O-02, P-A, S5-01, S5-04, S8-01, S8-02). In S8-02.json, TANTRA's internal Bucket address is replaced by a `[REDACTED after capture ...]` label.
- `replay_evidence/tantra_ledger_probe.json`: the single integrity_probe ledger write and its replay check.
- `tantra_calls.json`: every TANTRA call of that run (harness exchanges plus the API's own calls from its log), derived when this folder was made.
