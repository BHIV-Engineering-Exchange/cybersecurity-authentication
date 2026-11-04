"""
Determinism check: run the module's deterministic functions in N fresh processes and compare SHA-256 digests.

Each run is a new Python process with its own random hash seed. A target is deterministic when all N runs give the same
digest. This prepares the "50-run deterministic SHA-256 evidence" asked for T-GOV-F02; it does NOT close T-GOV-F02,
whose candidate modules come from Parikshak incorrect_logic logs that are not available (see the report).

Usage: python verification/determinism_check.py [--runs 50] [--out evidence_packet/test_results]
"""

from __future__ import annotations

import argparse
import json
import os
import platform
import subprocess
import sys
import tempfile
import time
from collections import Counter
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
BACKEND = REPO / "cybercrime" / "backend"

CHILD = r'''
import hashlib, json, os, sys
sys.path.insert(0, os.environ["BACKEND_DIR"])
def digest(obj):
    return hashlib.sha256(json.dumps(obj, sort_keys=True, separators=(",", ":"), default=str).encode("utf-8")).hexdigest()
out = {}
from app.core.canonical_event import CanonicalSecurityEvent, ActorModel, ResourceModel, OutcomeModel
event = CanonicalSecurityEvent(event_id="1b4e28ba-2fa1-4d3b-a3f5-ef19b5a7633b", event_type="auth.login",
    timestamp="2026-11-04T00:00:00.000Z", trace_id="determinism-trace", request_id="determinism-req",
    actor=ActorModel(actor_id="anonymous", actor_type="anonymous", role="public", authenticated=False, auth_method="password"),
    action="login", resource=ResourceModel(resource_type="user", resource_id="cc_usr_1"),
    outcome=OutcomeModel(status="DENIED", status_code=401, reason_code="INVALID_CREDENTIALS", message="Login failed."),
    metadata={"client_ip": "127.0.0.1", "account_known": True})
from app.core.bhiv_runtime import canonical_event_sha256, build_tantra_envelope
out["canonical_event_sha256"] = canonical_event_sha256(event.model_dump_json())
from pathlib import Path
from app.core.rbac import load_rbac_policy
policy = load_rbac_policy(Path(os.environ["BACKEND_DIR"]).parent / "rbac-permissions.json")
cases = [(r, m, p) for r in ("public", "investigator", "superadmin") for m in ("GET", "POST", "DELETE")
         for p in ("/api/v1/cases/", "/api/v1/auth/register", "/api/v1/threats/incidents", "/api/v1/protected/access", "/health")]
out["rbac_decision_matrix"] = digest([[r, m, p, policy.is_allowed(role=r, method=m, path=p)] for r, m, p in cases])
from app.core.threat_detection import assess
out["threat_assessment"] = digest([assess(c) for c in range(5, 16)])
out["tantra_envelope"] = digest(build_tantra_envelope(event_type="security_decision", submission_id="determinism-1",
    payload={"event_id": event.event_id, "decision": "DENY"}, timestamp="2026-11-04T00:00:00Z"))
from main import app
out["openapi_contract"] = digest(app.openapi())
print("DIGESTS " + json.dumps(out, sort_keys=True))
'''


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--runs", type=int, default=50)
    parser.add_argument("--out", type=Path, default=REPO / "evidence_packet" / "test_results")
    args = parser.parse_args()
    work = Path(tempfile.mkdtemp(prefix="cyber-determinism-"))
    env = {k: v for k, v in os.environ.items() if k in ("PATH", "SYSTEMROOT", "TEMP", "TMP", "USERPROFILE", "HOME")}
    env.update({"BACKEND_DIR": str(BACKEND), "SECRET_KEY": "determinism-check-only",
                "DATABASE_URL": f"sqlite:///{(work / 'd.db').as_posix()}", "EVIDENCE_STORAGE_PATH": str(work / "ev"),
                "EVENT_BUFFER_PATH": str(work / "buf" / "events.jsonl"), "PYTHONDONTWRITEBYTECODE": "1"})
    started = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    runs = []
    for i in range(args.runs):
        proc = subprocess.run([sys.executable, "-c", CHILD], cwd=str(BACKEND), env=env, capture_output=True, text=True,
                              timeout=180)
        line = next((l for l in proc.stdout.splitlines() if l.startswith("DIGESTS ")), None)
        if proc.returncode != 0 or line is None:
            print(proc.stderr[-2000:], file=sys.stderr)
            raise SystemExit(f"run {i + 1} failed")
        runs.append(json.loads(line[len("DIGESTS "):]))
    finished = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    targets = {name: dict(Counter(r[name] for r in runs)) for name in runs[0]}
    result = {"runs": args.runs, "started_utc": started, "finished_utc": finished, "python": platform.python_version(),
              "os": platform.platform(), "hash_seed": "random per process (PYTHONHASHSEED not set)",
              "targets": {name: {"distinct_digests": len(c), "digests": c} for name, c in targets.items()}}
    args.out.mkdir(parents=True, exist_ok=True)
    (args.out / "determinism_50_runs.json").write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8", newline="\n")
    lines = ["# Determinism check (SHA-256 over repeated runs)", "",
             f"`verification/determinism_check.py`: {args.runs} fresh Python processes ({started} to {finished} UTC, Python "
             f"{result['python']}), each with its own random hash seed. A target is deterministic when every run gives the "
             "same SHA-256.", "",
             "| Target | Runs | Distinct SHA-256 | SHA-256 | Deterministic? |", "|---|---|---|---|---|"]
    for name, counts in targets.items():
        digest, n = next(iter(counts.items()))
        lines.append(f"| {name} | {args.runs} | {len(counts)} | `{digest if len(counts) == 1 else 'see JSON'}` | "
                     f"{'YES' if len(counts) == 1 else 'NO'} |")
    lines += ["", "## T-GOV-F02", "",
              "This is **not** a T-GOV-F02 closure. The P0 task asks for T-GOV-F02 to be closed with the exact Parikshak "
              "`incorrect_logic` logs, the candidate modules named in them, an exact dependency pin and 50-run SHA-256 "
              "evidence for those modules.",
              "- Blocker: the Parikshak `incorrect_logic` logs for T-GOV-F02 are not in this repository, the VAJRA "
              "repository or the TANTRA repository. The VAJRA repository records the T-GOV-F02 knowledge submission to "
              "Parikshak through Niyantran (submitted by Prakash Yadav), so the logs are with Parikshak/Niyantran.",
              "- Owner of the next step: Kaushlendra (T-GOV-F02 lane), with the Parikshak/Niyantran admin or Prakash for the logs.",
              "- Ready now: the exact dependency pin (`cybercrime/backend/requirements.lock.txt`) and this harness. Once the "
              "candidate modules are known, add them as targets and re-run.", ""]
    (args.out / "DETERMINISM_50_RUNS.md").write_text("\n".join(lines), encoding="utf-8", newline="\n")
    print(f"{args.runs} runs: " + ", ".join(f"{n}={'deterministic' if len(c) == 1 else 'NOT deterministic'}" for n, c in targets.items()))
    return 0 if all(len(c) == 1 for c in targets.values()) else 1


if __name__ == "__main__":
    sys.exit(main())
