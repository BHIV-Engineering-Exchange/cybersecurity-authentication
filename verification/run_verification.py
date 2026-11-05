"""
Independent verification run for the Cybersecurity module (BHIV P0, owner: Hemanth - testing/evidence).

What it does
  1. Creates an isolated run folder (fresh SQLite database, throwaway secrets, synthetic users).
  2. Starts the REAL VAJRA relay node (binary built from bhiv-VAJRA_Blockchain) and the REAL
     Cybersecurity API (uvicorn). Optional: points the API at the live TANTRA layer.
  3. Runs the checks in verification/checks/scenarios.py and records every HTTP exchange.
  4. Writes redacted evidence: api_samples/, test_results/, runtime_logs/, replay_evidence/,
     deployment_proof/. Refuses to write anything if a generated secret would appear in any output.

Live TANTRA footprint (only with --tantra live):
  * read-only GET /health on the three TANTRA services;
  * the Cybersecurity API calls TANTRA's /validate endpoint during three checks only (P-A, S8-01, S5-01),
    with TANTRA_KARMA_URL left EMPTY so the API itself can never write to the TANTRA ledger in this run;
  * one malformed envelope sent to /validate (S5-04);
  * ONE karma ledger write (S8-02) - only when --allow-live-tantra-write is also given.
  Every id the run sends to TANTRA (trace ids and submission ids) starts with "cyber-p0-test-";
  every payload is synthetic. Whether TANTRA's /validate stores anything is not known to us.

Usage (from the repository root, with the backend virtualenv's python):
  python verification/run_verification.py --vajra-bin <path-to-vajra-relay> [--vajra-repo <path>]
         [--tantra off|live] [--tantra-base http://<tantra-host>] [--allow-live-tantra-write]
         [--work-root <folder for the temporary run data>] [--out evidence_packet]
"""

from __future__ import annotations

import argparse
import json
import os
import platform
import secrets
import shutil
import subprocess
import sys
import tempfile
import time
from pathlib import Path
from xml.sax.saxutils import escape

HERE = Path(__file__).resolve().parent
REPO = HERE.parent
BACKEND = REPO / "cybercrime" / "backend"
sys.path.insert(0, str(HERE))

from harness.redact import Redactor  # noqa: E402
from harness.runner import REGISTRY, Context, Recorder, results_as_dicts, run_checks, utc_now  # noqa: E402
from harness import services  # noqa: E402

TEST_PREFIX = "cyber-p0-test-"
SEGMENT_1 = ["O-01", "O-02", "S1-01", "S1-02", "S1-03", "S1-07", "S1-06", "V-01", "V-02", "V-03", "V-04", "V-05",
             "S1-05", "S1-08", "S1-04", "S2-01", "S4-01", "S4-02", "S4-04", "S4-05"]
SEGMENT_LIVE = ["P-A", "S8-01", "S5-01"]  # the only checks during which the API is pointed at live TANTRA
SEGMENT_3 = ["S5-04", "S8-02", "S3-01", "S3-02", "S3-03", "S6-04", "P-C1", "P-C2", "P-C3", "S2-02", "S2-03", "S4-03",
             "S7-01", "S7-02", "S7-04", "V-06", "V-07", "S5-02", "S5-05", "S6-01", "S6-03", "S6-02", "S6-05", "S7-03",
             "S7-05", "S8-03", "V-08", "S5-03", "O-03", "O-04",
             "S2-04"]  # S2-04 last: it would remove investigator 'read' if it worked


def git_head(path: Path) -> str:
    try:
        sha = subprocess.run(["git", "-C", str(path), "rev-parse", "HEAD"], capture_output=True, text=True).stdout.strip()
        dirty = subprocess.run(["git", "-C", str(path), "status", "--porcelain"], capture_output=True, text=True).stdout.strip()
        return f"{sha}{' (+ uncommitted changes)' if dirty else ''}"
    except Exception:
        return "unknown"


def seed_users(redactor: Redactor) -> dict:
    """Create synthetic identities in the run database using the module's own models."""
    from app.core.security import get_password_hash
    from app.db.database import Base, SessionLocal, engine
    from app.db.models import User
    import app.db.models  # noqa: F401

    Base.metadata.create_all(bind=engine)
    people = {
        "superadmin": "superadmin", "investigator_a": "investigator", "investigator_b": "investigator",
        "investigator_c": "investigator", "investigator_d": "investigator", "investigator_e": "investigator",
    }
    users = {}
    db = SessionLocal()
    try:
        for key, role in people.items():
            email = f"{key.replace('_', '.')}@bhiv-verification.example"
            password = "Synthetic-" + secrets.token_urlsafe(12)
            redactor.add(password)
            user = User(email=email, hashed_password=get_password_hash(password), full_name=f"{key} (synthetic)",
                        role=role, is_active=True)
            db.add(user)
            db.commit()
            db.refresh(user)
            users[key] = {"id": user.id, "email": email, "password": password, "role": role}
    finally:
        db.close()
        engine.dispose()  # release the database file so the run folder can be removed
    return users


def junit_xml(results: list) -> str:
    failures = sum(1 for r in results if r["status"] == "FAIL")
    errors = sum(1 for r in results if r["status"] == "ERROR")
    skipped = sum(1 for r in results if r["status"] in ("SKIPPED", "BLOCKED"))
    lines = [f'<testsuite name="cyber-p0-verification" tests="{len(results)}" failures="{failures}" errors="{errors}" '
             f'skipped="{skipped}">']
    for r in results:
        lines.append(f'  <testcase classname="{escape(r["scenario"])}" name="{escape(r["id"] + " " + r["title"])}" '
                     f'time="{r["duration_ms"] / 1000:.3f}">')
        failed = [e for e in r["expectations"] if not e["ok"]]
        if r["status"] == "FAIL":
            msg = "; ".join(f'{e["what"]}: expected {e["expected"]!r}, got {e["actual"]!r}' for e in failed)
            lines.append(f'    <failure message="{escape(msg[:900])}"/>')
        elif r["status"] == "ERROR":
            lines.append(f'    <error message="{escape(" ".join(r["notes"])[:900])}"/>')
        elif r["status"] in ("SKIPPED", "BLOCKED"):
            lines.append(f'    <skipped message="{escape(r["status"] + ": " + " ".join(r["notes"])[:900])}"/>')
        lines.append("  </testcase>")
    lines.append("</testsuite>")
    return "\n".join(lines) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--vajra-bin", required=True, type=Path, help="VAJRA relay node binary (go build ./cmd/relay)")
    parser.add_argument("--vajra-repo", type=Path, help="bhiv-VAJRA_Blockchain checkout the binary was built from")
    parser.add_argument("--tantra", choices=["off", "live"], default="off")
    parser.add_argument("--tantra-base", default="", help="e.g. http://<tantra-host> (ports 8101/8102/8103)")
    parser.add_argument("--allow-live-tantra-write", action="store_true", help="permit the single TANTRA ledger probe")
    parser.add_argument("--work-root", type=Path, default=Path(tempfile.gettempdir()),
                        help="folder for the temporary run data (deleted at the end)")
    parser.add_argument("--out", type=Path, default=REPO / "evidence_packet")
    parser.add_argument("--only", nargs="*", help="run only these check ids (debugging; checks are written to be independent)")
    args = parser.parse_args()
    if args.tantra == "live" and not args.tantra_base:
        parser.error("--tantra live needs --tantra-base")

    run_id = time.strftime("%Y%m%dT%H%M%SZ", time.gmtime())
    args.work_root.mkdir(parents=True, exist_ok=True)
    work = Path(tempfile.mkdtemp(prefix=f"cyber-p0-verify-{run_id}-", dir=str(args.work_root)))
    logs = work / "logs"
    redactor = Redactor()
    secret_key, vajra_secret, vajra_cyber_secret = (secrets.token_urlsafe(32), secrets.token_urlsafe(32),
                                                    secrets.token_urlsafe(32))
    redactor.add(secret_key, vajra_secret, vajra_cyber_secret)

    db_path = work / "cyber.db"
    tantra_live_env = {}
    if args.tantra == "live":
        base = args.tantra_base.rstrip("/")
        tantra_live_env = {"TANTRA_VALIDATION_URL": f"{base}:8101", "TANTRA_PRANA_URL": f"{base}:8103",
                           "TANTRA_KARMA_URL": "",  # the API never writes to the TANTRA ledger in this run
                           "TANTRA_SUBMISSION_PREFIX": TEST_PREFIX}
    cyber_base_env = {
        "SECRET_KEY": secret_key,
        "DATABASE_URL": f"sqlite:///{db_path.as_posix()}",
        "EVENT_BUFFER_PATH": str(work / "event_buffer" / "events.jsonl"),
        "EVIDENCE_STORAGE_PATH": str(work / "evidence_storage"),
        "UPLOAD_DIR": str(work / "uploads"),
        "EXPOSE_API_DOCS": "true",
        "SUPERADMIN_BOOTSTRAP_ENABLED": "false",
        "BHIV_CORE_EVENT_URL": "", "BHIV_BUCKET_EVIDENCE_URL": "", "KAFKA_BOOTSTRAP_SERVERS": "",
        "TANTRA_VALIDATION_URL": "", "TANTRA_KARMA_URL": "", "TANTRA_PRANA_URL": "", "TANTRA_SUBMISSION_PREFIX": "",
        "BHIV_HEALTH_CACHE_SECONDS": "0",
        # Main run: the legacy governance token, because VAJRA 3cc883f's evidence/record handler refuses the
        # evidence-only token (VAJ-10). Check S6-05 runs the API with the evidence-only token alone.
        "VAJRA_TANTRA_SECRET": vajra_secret,
        "VAJRA_CYBER_SECRET": "",
    }
    os.environ.update(cyber_base_env)  # the harness process imports the module for seeding and the S8-02 probe
    sys.path.insert(0, str(BACKEND))
    users = seed_users(redactor)

    vajra = services.vajra_node(args.vajra_bin.resolve(), work / "vajra", vajra_secret, logs,
                                cyber_secret=vajra_cyber_secret)
    print(f"run {run_id}: work folder {work}", flush=True)
    vajra.start()
    cyber_base_env["VAJRA_API_URL"] = vajra.base_url
    os.environ["VAJRA_API_URL"] = vajra.base_url
    cyber = services.cyber_service(Path(sys.executable), BACKEND, cyber_base_env, logs)
    cyber.start()

    recorder = Recorder(redactor)
    ctx = Context(recorder)
    ctx.data.update({
        "cyber": recorder.client(cyber.base_url, "cybersecurity"),
        "vajra": recorder.client(vajra.base_url, "vajra-local"),
        "vajra_secret": vajra_secret,
        "vajra_cyber_secret": vajra_cyber_secret,
        "users": users,
        "services": {"cyber": cyber, "vajra": vajra},
        "cyber_base_env": cyber_base_env,
        "mode": {"tantra": args.tantra, "allow_live_write": bool(args.allow_live_tantra_write)},
        "tantra_base": args.tantra_base.rstrip("/"),
        "db_path": db_path,
        "repo_root": REPO,
        "redactor": redactor,
    })
    if args.tantra == "live":
        base = args.tantra_base.rstrip("/")
        for name, port in (("tantra_validation", 8101), ("tantra_karma", 8102), ("tantra_prana", 8103)):
            ctx.data[name] = recorder.client(f"{base}:{port}", "tantra-live")

    for who, user in users.items():
        response = ctx.data["cyber"].post("/api/v1/auth/login", data={"username": user["email"], "password": user["password"]})
        if response.status_code != 200:
            raise SystemExit(f"setup failed: login for {who} returned {response.status_code}")
        user["token"] = response.json()["access_token"]
        redactor.add(user["token"])

    import checks.scenarios  # noqa: F401  (registers the checks)
    by_id = {spec.id: spec for spec in REGISTRY}
    started = utc_now()
    results = []
    try:
        results += run_checks(ctx, [by_id[i] for i in SEGMENT_1], args.only)
        if tantra_live_env:
            ctx.data["cyber_base_env"] = {**cyber_base_env, **tantra_live_env}
            ctx.data["trace_prefix"] = TEST_PREFIX
            cyber.env = services.base_env({**ctx.data["cyber_base_env"], "PYTHONUNBUFFERED": "1"})
            cyber.restart()
        results += run_checks(ctx, [by_id[i] for i in SEGMENT_LIVE], args.only)
        if tantra_live_env:
            ctx.data["cyber_base_env"] = cyber_base_env
            ctx.data["trace_prefix"] = ""
            cyber.env = services.base_env({**cyber_base_env, "PYTHONUNBUFFERED": "1"})
            cyber.restart()
        results += run_checks(ctx, [by_id[i] for i in SEGMENT_3], args.only)
    finally:
        finished = utc_now()
        cyber.stop()
        vajra.stop()

    # ---------------------------------------------------------------- write evidence (redacted, gated)
    out = args.out.resolve()
    result_dicts = redactor.obj(results_as_dicts(results))
    summary = {s: sum(1 for r in result_dicts if r["status"] == s) for s in ("PASS", "FAIL", "ERROR", "BLOCKED", "SKIPPED")}
    meta = {
        "run_id": run_id, "started_utc": started, "finished_utc": finished,
        "command": " ".join(["python", "verification/run_verification.py"] + [a for a in sys.argv[1:]]),
        "mode": {"tantra": args.tantra, "tantra_base": args.tantra_base or None,
                 "live_tantra_write_allowed": bool(args.allow_live_tantra_write)},
        "versions": {
            "cybersecurity_repo_commit": git_head(REPO),
            "vajra_repo_commit": git_head(args.vajra_repo) if args.vajra_repo else "not recorded",
            "python": platform.python_version(), "os": platform.platform(),
        },
        "services": {"cybersecurity-api": cyber.starts, "vajra-relay-node": vajra.starts},
        "summary": summary, "total": len(result_dicts),
    }
    outputs: dict[Path, str] = {
        out / "test_results" / "results.json": json.dumps({"meta": meta, "results": result_dicts}, indent=2, default=str),
        out / "test_results" / "junit.xml": junit_xml(result_dicts),
    }
    by_check: dict[str, list] = {}
    for exchange in recorder.exchanges:
        by_check.setdefault(exchange["check_id"], []).append(exchange)
    for check_id, exchanges in by_check.items():
        outputs[out / "api_samples" / f"{check_id}.json"] = json.dumps(exchanges, indent=2, default=str)
    for name in ("cyber_service.log", "vajra_node.log"):
        src = logs / name
        if src.exists():
            outputs[out / "runtime_logs" / name] = redactor.text(src.read_text(encoding="utf-8", errors="replace"))
    store = Path(vajra.truth_store)
    if store.exists():
        outputs[out / "replay_evidence" / "vajra_truthstore_rows.jsonl"] = redactor.text(store.read_text(encoding="utf-8"))
    if ctx.data.get("tantra_probe"):
        outputs[out / "replay_evidence" / "tantra_ledger_probe.json"] = json.dumps(redactor.obj(ctx.data["tantra_probe"]), indent=2)
    outputs[out / "deployment_proof" / "local_runtime_proof.json"] = json.dumps(
        {"run_id": run_id, "versions": meta["versions"], "services": meta["services"],
         "startup_commands": {
             "cybersecurity-api": "python -m uvicorn main:app --host 127.0.0.1 --port <free port>  (cwd cybercrime/backend)",
             "vajra-relay-node": "<vajra-relay binary> with BLOCKCHAIN_DOCKER=true HTTP_PORT P2P_PORT TRUTH_STORE_PATH ..."},
         "health_endpoints": {"cybersecurity-api": ["/health", "/api/v1/system/health"], "vajra-relay-node": ["/api/health"]},
         "note": "Local process deployment (OFFLINE-VERIFIED). No VM reference was available to this run."}, indent=2)

    leaks = redactor.contains_secret(list(outputs.values()))
    if leaks:
        print(f"REFUSING TO WRITE EVIDENCE: generated secrets found in outputs: {leaks}", file=sys.stderr)
        return 3
    for path, text in outputs.items():
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8")

    print(f"\nsummary: {summary} (total {len(result_dicts)})")
    print(f"evidence written to {out}")
    shutil.rmtree(work, ignore_errors=True)  # run database, unredacted logs, VAJRA data and its node key
    if work.exists():
        print(f"WARNING: could not fully remove the run folder {work}; delete it by hand (it holds unredacted logs "
              "and a throwaway VAJRA node key)", file=sys.stderr)
    return 0 if summary["FAIL"] == 0 and summary["ERROR"] == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
