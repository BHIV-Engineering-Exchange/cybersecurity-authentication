# Earlier live run 20261104T120458Z

The verification run was repeated later on 2026-11-04 on newer code. The records of this earlier live run that concern TANTRA are kept here, so every live call of the day stays listed (and, if this run made the ledger write, its evidence is carried over, labelled with this run id):

- `test_results/`: that run's results.json, junit.xml and LIVE_TANTRA_CALLS.md, unchanged.
- `api_samples/`: that run's recorded exchanges for every check that touched live TANTRA (O-02, P-A, S5-01, S5-04, S8-01).
- This run made no ledger write.
- `tantra_calls.json`: every TANTRA call of that run (harness exchanges plus the API's own calls from its log), derived when this folder was made.
