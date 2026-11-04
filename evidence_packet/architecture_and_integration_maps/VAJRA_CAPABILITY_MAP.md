# VAJRA capability map (as tested from Cybersecurity)

From run `20261104T133229Z` against a local node built from VAJRA commit `07d683c3656b936152367989e8458d18941471a7` (VAJRA asks for no test records on its live node). Owner of every capability: Prakash / VAJRA team. Status per row comes from the named checks; a row with no check was not tested.

| Capability | VAJRA interface | Auth | Checks (result) | Status |
|---|---|---|---|---|
| Authority read (consent state) | `GET /api/vajra/authority/verify` | none | S1-05 PASS, S2-01 PASS, P-A PASS | **VERIFIED (API: local; VAJRA: local node; TANTRA: live; includes SIMULATED roles)** |
| Authority lifecycle GRANT -> USE -> REVOKE | `POST /api/vajra/authority/transition` | Bearer VAJRA_TANTRA_SECRET | S2-01 PASS, S4-05 PASS | **VERIFIED (API: local; VAJRA: local node; includes SIMULATED roles)** |
| Containment ISOLATE / TERMINATE and staged recovery | `POST /api/vajra/authority/transition` | Bearer | P-C3 PASS, S7-02 PASS | **VERIFIED (API: local; VAJRA: local node; includes SIMULATED roles)** |
| Write routes refuse callers without the token | `authority/transition, evidence/record` | Bearer (fail closed) | S1-06 PASS | **VERIFIED (VAJRA: local node)** |
| Evidence record, one row per trace | `POST /api/vajra/evidence/record` | Bearer | S8-01 PASS, S4-02 PASS | **VERIFIED (API: local; VAJRA: local node; TANTRA: live; includes SIMULATED roles)** |
| Evidence refused, so no ALLOW | `POST /api/vajra/evidence/record` | Bearer | S6-01 PASS | **VERIFIED (API: local; VAJRA: local node; includes SIMULATED roles)** |
| Tamper detection on stored evidence | `GET /api/tantra/chain-integrity` | none | S8-03 PASS | **VERIFIED (VAJRA: local node)** |
| Authority state survives a node restart | `node restart` | - | S7-05 FAIL | **FAILING** |
| Privileged routes (token mint, permission grant, wallet freeze) need auth | `/api/admin/add-tokens, /api/v1/permission/grant, /api/cybercrime/freeze` | none today (VAJ-06) | V-01 FAIL | **FAILING** |
| Permission ids are unique per grant | `POST /api/v1/permission/grant` | none today | V-02 FAIL | **FAILING** |
| Recovery anchors with real validator signatures | `recovery handlers` | - | - | **NOT TESTED (signatures are placeholders: VAJ-05)** |
