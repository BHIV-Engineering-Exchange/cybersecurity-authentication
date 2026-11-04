# Determinism check (SHA-256 over repeated runs)

`verification/determinism_check.py`: 50 fresh Python processes (2026-11-04T13:27:57Z to 2026-11-04T13:32:10Z UTC, Python 3.12.7), each with its own random hash seed. A target is deterministic when every run gives the same SHA-256.

| Target | Runs | Distinct SHA-256 | SHA-256 | Deterministic? |
|---|---|---|---|---|
| canonical_event_sha256 | 50 | 1 | `0046f13639e8f9194658ee73e4200316bb22872af5b398156580bd891531a3a1` | YES |
| openapi_contract | 50 | 1 | `dc8c1bd28b6ce64c87ed0fad50cd2815172a80c983476fa719f8b022977cf487` | YES |
| rbac_decision_matrix | 50 | 1 | `a6cb19ca1f4f18d2bb3e7ed9a4bacf76c01379ad891c232b8d409ddcf7306bff` | YES |
| tantra_envelope | 50 | 1 | `ec67432d6903acfdd716e0e64190f4e0c44a5c0977182a23f7c87d51c89c71fb` | YES |
| threat_assessment | 50 | 1 | `a7ec63752036679950dd395fb5ed1f3a2d1259dafa54e8642a5f1bd1b64b5305` | YES |

## T-GOV-F02

This is **not** a T-GOV-F02 closure. The P0 task asks for T-GOV-F02 to be closed with the exact Parikshak `incorrect_logic` logs, the candidate modules named in them, an exact dependency pin and 50-run SHA-256 evidence for those modules.
- Blocker: the Parikshak `incorrect_logic` logs for T-GOV-F02 are not in this repository, the VAJRA repository or the TANTRA repository. The VAJRA repository records the T-GOV-F02 knowledge submission to Parikshak through Niyantran (submitted by Prakash Yadav), so the logs are with Parikshak/Niyantran.
- Owner of the next step: Kaushlendra (T-GOV-F02 lane), with the Parikshak/Niyantran admin or Prakash for the logs.
- Ready now: the exact dependency pin (`cybercrime/backend/requirements.lock.txt`) and this harness. Once the candidate modules are known, add them as targets and re-run.
