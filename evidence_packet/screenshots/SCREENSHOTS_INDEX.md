# Screenshots

Captured 20261104T104326Z (UTC) by `verification/capture_screenshots.py` with headless msedge. Each image is a real HTTP response from a running process; only images that were actually captured are listed.

| File | What it shows | Source |
|---|---|---|
| 01_cyber_system_health.png | api/v1/system/health | local process started by the script |
| 02_cyber_api_docs_protected_access.png | api/docs | local process started by the script |
| 03_vajra_truthstore_records.png | api/tantra/records | local process started by the script |
| 04_vajra_chain_integrity.png | api/tantra/chain-integrity | local process started by the script |
| 05_vajra_verify_revoked_subject.png | api/vajra/authority/verify?subject=cyber-p0-test-shot-revoked | local process started by the script |
| 06_tantra_live_validation_health.png | health | live TANTRA (read-only GET) |

Ports are random free local ports. Subjects shown start with `cyber-p0-test-`; all data is synthetic.

## Manual record (added after generation)

- **Withdrawn after capture (2026-11-04):** `07_tantra_live_prana_system_health.png` (live TANTRA `prana/system/health`,
  read-only GET). It shows TANTRA's internal service addresses and registry URL. It stays out of this packet until the
  TANTRA team agrees to publish it. The GET itself is listed in `test_results/LIVE_TANTRA_CALLS.md`.
- **Secret/PII review 1 (2026-11-04):** the implementer's assistant (Claude, working for Hemanth) viewed all 7 captured
  images. No tokens, passwords, keys, user names or personal data were found. Image 01 shows temporary run folders under
  `C:\tmp`.
- **Secret/PII review 2 (2026-11-04):** the independent auditor agent (audit iteration 4) viewed all 7 images. It found no
  secrets, tokens or personal data, and flagged image 07 for TANTRA's internal addresses, which led to the withdrawal above.
