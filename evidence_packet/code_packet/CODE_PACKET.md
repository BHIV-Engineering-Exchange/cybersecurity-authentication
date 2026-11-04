# Code packet

Only the files that carry the core execution flow (maximum three). Each copy has LF line endings (as git stores the source), so its SHA-256 is the same on every checkout.

| File | Why | SHA-256 |
|---|---|---|
| `cybercrime/backend/app/api/v1/endpoints/protected_access.py` (copy: `protected_access.py`) | Entry point and core flow of the protected-access decision | `1c9311ee135cc8f2d2b73cdea06cb37cd9c1a04fa334b8179985b7fa4748b245` |
| `cybercrime/backend/app/core/bhiv_runtime.py` (copy: `bhiv_runtime.py`) | The VAJRA and TANTRA contracts as called by Cybersecurity | `15bd81931be0d114977789add2809da3eb783e1b27eda89bf0a6cb4ed4a7183a` |
| `verification/checks/scenarios.py` (copy: `scenarios.py`) | The executed checks that prove (or disprove) each requirement | `b546c7211c26deaeb99f792968d91b795bad11a57898b9efc4a72330b1bf962f` |
