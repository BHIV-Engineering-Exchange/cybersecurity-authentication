# Cross-pillar map

From run `20261105T151254Z`. Status per component: see the readiness board in the EOD report.

| Component | Repository | Owner | Interface | Version |
|---|---|---|---|---|
| Cybersecurity API | BHIV-Engineering-Exchange/cybersecurity-authentication | Rajaryan, Kaushlendra, Shivam, Hemanth | /api/v1/protected/access, /api/v1/authz/check, /api/v1/access/revoke (contract 1.0.0) | `a176e98dfc51b11a1e0163f3c0556cd326863c99` |
| VAJRA relay node | BHIV-SYSTEM/bhiv-VAJRA_Blockchain | Prakash (VAJRA team) | GET /api/vajra/authority/verify; POST /api/vajra/evidence/record (Bearer) | `3cc883f760562767d7039c5067b7b7d822b22b68` |
| TANTRA validation layer | BHIV-Engineering-Exchange/bhiv-TANTRA_Layer (service code not in repo) | TANTRA team (name UNKNOWN) | POST /validate/prana/ingress (registry prana.event.contracts v1.0.0) | `live service; version 1.0.0 per its OpenAPI` |
| TANTRA karma helper | same | TANTRA team (name UNKNOWN) | POST /karma/ingest, POST /karma/verify | `live service; 1.0.0 per its OpenAPI` |
| TANTRA PRANA | same | TANTRA team (name UNKNOWN) | GET /replay/{trace_id} | `live service; 1.0.0 per its OpenAPI` |
| Wallet incident analysis | cybersecurity-authentication (incidents.py) | Shivam | POST /api/v1/incidents/analyze | `-` |
| Case-linking correlation | cybersecurity-authentication (fraud-evidence-system) | UNKNOWN | not wired to access signals | `-` |
| Brahmanda / MANTRA game events | not provided | product owners | not defined | `-` |
