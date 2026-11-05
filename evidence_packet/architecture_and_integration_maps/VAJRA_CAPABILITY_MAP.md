# VAJRA capability map (as tested from Cybersecurity)

From run `20261105T151254Z` against a local node built from VAJRA commit `3cc883f760562767d7039c5067b7b7d822b22b68` (VAJRA asks for no test records on its live node). Owner of every capability: Prakash / VAJRA team. Status per row comes from the named checks; a row with no check was not tested.

| Capability | VAJRA interface | Auth | Checks (result) | Status |
|---|---|---|---|---|
| Authority read (consent state) | `GET /api/vajra/authority/verify` | none | S1-05 PASS, S2-01 PASS, P-A PASS | **VERIFIED (API: local; VAJRA: local node; includes SIMULATED roles)** |
| Granted scope and authority in verify, kept by later transitions | `GET/POST /api/vajra/authority/verify` | none | S1-08 PASS, V-05 FAIL | **FAILING (API: local; VAJRA: local node; includes SIMULATED roles)** |
| Authority lifecycle GRANT -> USE -> REVOKE | `POST /api/vajra/authority/transition` | Bearer VAJRA_TANTRA_SECRET (governance) | S2-01 PASS, S4-05 PASS | **VERIFIED (API: local; VAJRA: local node; includes SIMULATED roles)** |
| Containment ISOLATE / TERMINATE and staged recovery | `POST /api/vajra/authority/transition` | Bearer (governance) | P-C3 PASS, S7-02 PASS | **VERIFIED (API: local; VAJRA: local node; includes SIMULATED roles)** |
| Write routes refuse callers without the token | `authority/transition, evidence/record` | Bearer (fail closed) | S1-06 PASS | **VERIFIED (VAJRA: local node)** |
| Evidence-only token: evidence accepted; governance, consent and admin routes refused | `evidence/record; authority/transition; permission/*; admin/*` | Bearer VAJRA_CYBER_SECRET | V-03 FAIL, S6-05 FAIL | **FAILING** |
| Evidence record, one row per trace | `POST /api/vajra/evidence/record` | Bearer | S8-01 PASS, S4-02 PASS | **VERIFIED (API: local; VAJRA: local node; includes SIMULATED roles)** |
| Evidence refused, so no ALLOW | `POST /api/vajra/evidence/record` | Bearer | S6-01 PASS | **VERIFIED (API: local; VAJRA: local node; includes SIMULATED roles)** |
| Tamper detection on stored evidence | `GET /api/tantra/chain-integrity` | none | S8-03 PASS | **VERIFIED (VAJRA: local node)** |
| Authority state survives a node restart | `node restart` | - | S7-05 PASS | **VERIFIED (VAJRA: local node)** |
| Authority ledger: unsaved, edited or damaged records are not trusted | `authority_ledger.jsonl, node restart` | - | V-08 FAIL | **FAILING** |
| Privileged routes (token mint and transfer, permission grant/revoke/check, wallet freeze/unfreeze) need a token | `/api/admin/*, /api/v1/permission/*, /api/cybercrime/freeze|unfreeze` | Bearer | V-01 PASS | **VERIFIED (VAJRA: local node)** |
| No wallet freeze from an anonymous report | `POST /api/cybercrime/report (auto-freeze)` | none (VAJ-14) | V-07 FAIL | **FAILING** |
| Permission ids are unique per grant | `POST /api/v1/permission/grant` | Bearer | V-02 PASS, V-04 FAIL | **FAILING (VAJRA: local node)** |
| Recovery anchors need real validator signatures | `POST /api/vajra/recovery/verify-anchor` | none | S7-04 PASS, V-06 FAIL | **FAILING (VAJRA: local node; includes SIMULATED roles)** |
