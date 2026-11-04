"""
Capture focused screenshots of real runtime endpoints with headless Microsoft Edge (or Chrome).

It starts the same real processes as run_verification.py (local VAJRA node + Cybersecurity API),
records a few protected-access decisions (TANTRA not configured, so no TANTRA calls), then screenshots
JSON endpoints and the API docs. The API health page is captured anonymously, so it shows no peer data.
With --tantra-base, TANTRA's live validation health page is also captured (one read-only GET).

Usage: python verification/capture_screenshots.py --vajra-bin <vajra-relay> [--tantra-base http://<host>]
       [--browser <path to msedge.exe or chrome.exe>] [--out evidence_packet/screenshots]
"""

from __future__ import annotations

import argparse
import os
import secrets
import shutil
import subprocess
import sys
import tempfile
import time
from pathlib import Path

import httpx

HERE = Path(__file__).resolve().parent
REPO = HERE.parent
BACKEND = REPO / "cybercrime" / "backend"
sys.path.insert(0, str(HERE))
from harness import services  # noqa: E402
from harness.redact import Redactor  # noqa: E402

DEFAULT_BROWSERS = [r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
                    r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
                    r"C:\Program Files\Google\Chrome\Application\chrome.exe"]


def shoot(browser: str, url: str, out: Path, profile: Path, size: str = "1280,900") -> None:
    out.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run([browser, "--headless=new", "--disable-gpu", "--hide-scrollbars", f"--window-size={size}",
                    f"--user-data-dir={profile}", "--virtual-time-budget=8000", f"--screenshot={out}", url],
                   check=False, capture_output=True, timeout=90)
    print(("saved " if out.exists() else "FAILED ") + str(out.name), flush=True)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--vajra-bin", required=True, type=Path)
    parser.add_argument("--tantra-base", default="")
    parser.add_argument("--browser", default=next((b for b in DEFAULT_BROWSERS if Path(b).exists()), ""))
    parser.add_argument("--out", type=Path, default=REPO / "evidence_packet" / "screenshots")
    parser.add_argument("--work-root", type=Path, default=Path(tempfile.gettempdir()),
                        help="folder for temporary run data (paths under it appear in the health screenshot)")
    args = parser.parse_args()
    if not args.browser:
        raise SystemExit("no Edge/Chrome found; pass --browser")
    args.out = args.out.resolve()  # the browser resolves --screenshot against its own working folder

    args.work_root.mkdir(parents=True, exist_ok=True)
    work = Path(tempfile.mkdtemp(prefix="cyber-p0-shots-", dir=str(args.work_root)))
    secret_key, vajra_secret = secrets.token_urlsafe(32), secrets.token_urlsafe(32)
    env = {"SECRET_KEY": secret_key, "DATABASE_URL": f"sqlite:///{(work / 'cyber.db').as_posix()}",
           "EVENT_BUFFER_PATH": str(work / "event_buffer" / "events.jsonl"), "EVIDENCE_STORAGE_PATH": str(work / "evidence"),
           "EXPOSE_API_DOCS": "true", "SUPERADMIN_BOOTSTRAP_ENABLED": "false", "VAJRA_TANTRA_SECRET": vajra_secret,
           "BHIV_HEALTH_CACHE_SECONDS": "0",
           "TANTRA_VALIDATION_URL": "", "TANTRA_KARMA_URL": "", "TANTRA_PRANA_URL": "",
           "BHIV_CORE_EVENT_URL": "", "BHIV_BUCKET_EVIDENCE_URL": "", "KAFKA_BOOTSTRAP_SERVERS": ""}
    os.environ.update(env)
    sys.path.insert(0, str(BACKEND))
    from run_verification import seed_users  # same synthetic identities as the verification run

    users = seed_users(Redactor())
    vajra = services.vajra_node(args.vajra_bin.resolve(), work / "vajra", vajra_secret, work / "logs")
    vajra.start()
    env["VAJRA_API_URL"] = vajra.base_url
    cyber = services.cyber_service(Path(sys.executable), BACKEND, env, work / "logs")
    cyber.start()
    try:
        inv = users["investigator_a"]
        token = httpx.post(cyber.base_url + "/api/v1/auth/login",
                           data={"username": inv["email"], "password": inv["password"]}).json()["access_token"]
        headers = {"Authorization": f"Bearer {vajra_secret}"}
        for subject, states in (("cyber-p0-test-shot-granted", ["GRANT", "USE"]), ("cyber-p0-test-shot-revoked", ["GRANT", "USE", "REVOKE"])):
            for state in states:
                httpx.post(vajra.base_url + "/api/vajra/authority/transition", headers=headers, json={
                    "trace_id": f"cyber-p0-test-{secrets.token_hex(6)}", "subject": subject, "authority": "AUTH_ROLE_CLIENT",
                    "issuer": "VAJRA_USER_CONTROL_SIMULATOR (screenshots)", "target": "VAJRA_LEDGER",
                    "purpose": "screenshot data (synthetic)", "scope": ["read"], "to_state": state,
                    "policy_version": "v1.0.0", "evidence_ref": "synthetic"})
            httpx.post(cyber.base_url + "/api/v1/protected/access", headers={"Authorization": f"Bearer {token}"}, json={
                "contract_version": "1.0.0", "vajra_subject": subject, "action": "read",
                "resource": {"type": "evidence", "id": "EV-SCREENSHOT-1"}, "purpose": "screenshot data (synthetic)"})
        profile = work / "browser-profile"
        stamp = time.strftime("%Y%m%dT%H%M%SZ", time.gmtime())
        shots = [
            ("01_cyber_system_health", cyber.base_url + "/api/v1/system/health"),
            ("02_cyber_api_docs_protected_access", cyber.base_url + "/api/docs"),
            ("03_vajra_truthstore_records", vajra.base_url + "/api/tantra/records"),
            ("04_vajra_chain_integrity", vajra.base_url + "/api/tantra/chain-integrity"),
            ("05_vajra_verify_revoked_subject", vajra.base_url + "/api/vajra/authority/verify?subject=cyber-p0-test-shot-revoked"),
        ]
        if args.tantra_base:
            # Only TANTRA's plain health page: /prana/system/health lists TANTRA's internal service addresses.
            shots.append(("06_tantra_live_validation_health", args.tantra_base.rstrip("/") + ":8101/health"))
        captured = []
        for name, url in shots:
            shoot(args.browser, url, args.out / f"{name}.png", profile, size="1280,1500" if "docs" in name else "1280,900")
            if (args.out / f"{name}.png").exists():
                captured.append((name, url))
        (args.out / "SCREENSHOTS_INDEX.md").write_text("\n".join(
            ["# Screenshots", "", f"Captured {stamp} (UTC) by `verification/capture_screenshots.py` with headless "
             f"{Path(args.browser).stem}. Each image is a real HTTP response from a running process; only images that "
             "were actually captured are listed.", "",
             "| File | What it shows | Source |", "|---|---|---|"] +
            [f"| {n}.png | {u.split('://', 1)[1].split('/', 1)[1] if '/' in u.split('://', 1)[1] else u} | "
             f"{'live TANTRA (read-only GET)' if args.tantra_base and args.tantra_base in u else 'local process started by the script'} |"
             for n, u in captured] +
            ["", "Ports are random free local ports. Subjects shown start with `cyber-p0-test-`; all data is synthetic.", "",
             "## Manual record (added after generation)", "",
             "- Secret/PII review: PENDING - before release, a reviewer adds a dated line here with the result."]),
            encoding="utf-8")
    finally:
        cyber.stop()
        vajra.stop()
        shutil.rmtree(work, ignore_errors=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
