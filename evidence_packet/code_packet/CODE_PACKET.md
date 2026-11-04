# Code packet

Only the files that carry the core execution flow (maximum three). Each copy has LF line endings (as git stores the source), so its SHA-256 is the same on every checkout.

| File | Why | SHA-256 |
|---|---|---|
| `cybercrime/backend/app/api/v1/endpoints/protected_access.py` (copy: `protected_access.py`) | Entry point and core flow of the protected-access decision | `e037bf36222af4b06bdec02fb38a5f692dfca8a10fc98141b31fbfdbf29a4f5b` |
| `cybercrime/backend/app/core/bhiv_runtime.py` (copy: `bhiv_runtime.py`) | The VAJRA and TANTRA contracts as called by Cybersecurity | `15bd81931be0d114977789add2809da3eb783e1b27eda89bf0a6cb4ed4a7183a` |
| `verification/checks/scenarios.py` (copy: `scenarios.py`) | The executed checks that prove (or disprove) each requirement | `060143f8dd133dbc4d5d696cdb7e59ccec0725a7059cdbef8ae87dfae0fc7e9e` |
