# Screenshots

Captured 20261104T120924Z (UTC) by `verification/capture_screenshots.py` with headless msedge. Each image is a real HTTP response from a running process; only images that were actually captured are listed.

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

- **Secret/PII review (2026-11-04):** the implementer's assistant (Claude, working for Hemanth) viewed all 6 images.
  No tokens, passwords, keys, user names, personal data or internal service addresses were found. Image 01 is the
  anonymous health reply, which no longer shows file-system paths. Image 03 shows synthetic local VAJRA rows.
- **Earlier capture (10:43:26Z, same day):** it also took TANTRA's `prana/system/health` page (image 07). That image
  shows TANTRA's internal service addresses, so it was withheld from this packet until TANTRA agrees to publish it.
  Its GET is listed in `test_results/LIVE_TANTRA_CALLS.md`.