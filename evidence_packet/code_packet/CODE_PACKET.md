# Code packet

Only the files that carry the core execution flow (maximum three). Each copy has LF line endings (as git stores the source), so its SHA-256 is the same on every checkout.

| File | Why | SHA-256 |
|---|---|---|
| `cybercrime/backend/app/api/v1/endpoints/protected_access.py` (copy: `protected_access.py`) | Entry point and core flow of the protected-access decision | `5d28fbdbb834f1c52919b66253a41a1279354fdfac37d40e7cdc1ba6f2506074` |
| `cybercrime/backend/app/core/bhiv_runtime.py` (copy: `bhiv_runtime.py`) | The VAJRA and TANTRA contracts as called by Cybersecurity | `f29a716375abce7d557b87b8b671856503613a849f81aa94ac3beaaa27b8a38f` |
| `verification/checks/scenarios.py` (copy: `scenarios.py`) | The executed checks that prove (or disprove) each requirement | `551b6afb1d4571af9f3e806551b7c6dfc37a50db3eca2e6bc5976da5a0965d51` |
