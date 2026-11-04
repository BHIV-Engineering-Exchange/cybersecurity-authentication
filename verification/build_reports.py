"""
Build the human-readable reports from the evidence files.

Every count and status below is derived from the evidence files or from git at build time; where a fact cannot
be derived, the report says NOT DETERMINED instead of assuming it.

Reads   evidence_packet/test_results/results.json      (integrated verification run)
        evidence_packet/test_results/*.txt              (raw unit-test outputs, if present)
        evidence_packet/api_samples/*.json              (recorded HTTP exchanges)
        evidence_packet/api_samples/outside_run/*       (live calls made by hand on the run day, outside the harness)
        evidence_packet/runtime_logs/cyber_service.log  (service-side TANTRA outcomes)
        verification/defects.py                         (static defect facts)
Writes  evidence_packet/test_results/{TEST_REPORT,DEFECTS,PROOF_MATRIX,LIVE_TANTRA_CALLS}.md
        evidence_packet/review_packet.md, review_packets/CYBER-P0-2026-11-04/{REVIEW_PACKET,EOD_REPORT}.md
        evidence_packet/replay_evidence/GOLDEN_TRACE.md, evidence_packet/architecture_and_integration_maps/CROSS_PILLAR_MAP.md
        evidence_packet/code_packet/*, evidence_packet/MANIFEST.sha256
Usage   python verification/build_reports.py [--evidence evidence_packet] [--branch <name>]
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path
from typing import Optional

HERE = Path(__file__).resolve().parent
REPO = HERE.parent
sys.path.insert(0, str(HERE))
from defects import DEFECTS  # noqa: E402

BASE_COMMIT = "59d2d63"  # last commit on main before this change (2026-10-27)
# The earlier live run that made the single TANTRA ledger write. Later runs do not repeat that write, so its evidence is
# kept under evidence_packet/previous_runs/<id>/ and carried over, labelled with its run id.
PREVIOUS_LIVE_RUN = "20261104T103939Z"
EVIDENCE_DIR = REPO / "evidence_packet"  # set from --evidence in main(); defect statuses read recorded files under it
PACKET_DIR = REPO / "review_packets" / "CYBER-P0-2026-11-04"
CORE_FILES = [
    ("cybercrime/backend/app/api/v1/endpoints/protected_access.py", "Entry point and core flow of the protected-access decision"),
    ("cybercrime/backend/app/core/bhiv_runtime.py", "The VAJRA and TANTRA contracts as called by Cybersecurity"),
    ("verification/checks/scenarios.py", "The executed checks that prove (or disprove) each requirement"),
]


# ------------------------------------------------------------------------------------- loading

def load(evidence: Path):
    data = json.loads((evidence / "test_results" / "results.json").read_text(encoding="utf-8"))
    results = {r["id"]: r for r in data["results"]}
    samples = {}
    for path in sorted((evidence / "api_samples").glob("*.json")):
        samples[path.stem] = json.loads(path.read_text(encoding="utf-8"))
    return data["meta"], data["results"], results, samples


def parse_raw_suites(evidence: Path) -> list[dict]:
    """Summaries parsed from raw outputs (the raw files stay the source of truth)."""
    suites = []
    tr = evidence / "test_results"
    for name, label, cmd in (
        ("cyber_unit_tests.txt", "Cybersecurity backend unit tests, after this change (peers SIMULATED in the bridge tests)",
         "cd cybercrime/backend && python -m pytest -v -p no:cacheprovider"),
        ("cyber_unit_tests_baseline_clean_clone.txt", "Same suite on the clean base commit, before this change",
         "cd cybercrime/backend && python -m pytest -v"),
        ("cyber_unit_tests_baseline_with_secret_key.txt", "Same, base commit, SECRET_KEY set, test_predictions.py excluded",
         "SECRET_KEY=... python -m pytest -v --ignore=test_predictions.py"),
    ):
        f = tr / name
        if f.exists():
            text = f.read_text(encoding="utf-8", errors="replace")
            found = re.findall(r"=+ (.+?) in [0-9.]+s", text)
            suites.append({"suite": label, "command": cmd, "result": found[-1] if found else "not parsed", "raw": name})
    f = tr / "vajra_go_tests.txt"
    if f.exists():
        text = f.read_text(encoding="utf-8", errors="replace")
        suites.append({"suite": "VAJRA's own Go tests (authority, permission, api packages)",
                       "command": "cd core/relay-chain && go test -count=1 -v ./authority/... ./permission/... ; "
                                  "go test -count=1 -v -run \"TestVajra|TestPermissionHandlers\" ./api/...",
                       "result": f"{text.count('--- PASS')} passed, {text.count('--- FAIL')} failed", "raw": "vajra_go_tests.txt"})
    for run in (1, 2):
        f = tr / f"fraud_evidence_jest_run{run}.txt"
        if f.exists():
            text = f.read_text(encoding="utf-8", errors="replace")
            m = re.search(r"Tests:\s+(.+)", text)
            suites.append({"suite": f"Fraud-evidence backend Jest suite (run {run})",
                           "command": "cd fraud-evidence-system/Backend && npx jest --forceExit",
                           "result": m.group(1).strip() if m else "not parsed", "raw": f"fraud_evidence_jest_run{run}.txt"})
    return suites


# ------------------------------------------------------------------------------------- helpers

def counts(results: list) -> dict:
    out = {s: 0 for s in ("PASS", "FAIL", "ERROR", "BLOCKED", "SKIPPED")}
    for r in results:
        out[r["status"]] = out.get(r["status"], 0) + 1
    return out


def status_of(by_id: dict, check_id: str) -> str:
    return by_id[check_id]["status"] if check_id in by_id else "NOT_RUN"


def defect_status(defect: dict, by_id: dict) -> str:
    if defect.get("status") == "FIXED":
        chk = defect.get("check")
        r = by_id.get(chk) if chk else None
        if r is None:
            return "FIXED in this change (unit tests; no runtime check)" if chk is None else f"FIXED in this change ({chk} not run)"
        if r["status"] == "PASS":
            return f"FIXED in this change; {chk} passes in this run"
        return f"FIX NOT CONFIRMED: {chk} {r['status']} in this run"
    failing = sorted(r["id"] for r in by_id.values() if r["status"] == "FAIL" and defect["id"] in r["defects"])
    if failing:
        return f"CONFIRMED at runtime by {', '.join(failing)}"
    proof = defect.get("confirmed_when")  # a check that passes BECAUSE the peer shows the defect (e.g. a contract gate refusing)
    if proof:
        r = by_id.get(proof["check"])
        if r and r["status"] == "PASS" and any(e.get("ok") and e.get("what") == proof["what"] and e.get("actual") == proof["actual"]
                                               for e in r["expectations"]):
            return f"CONFIRMED at runtime by {proof['check']} (it passes because the peer answered {proof['actual']})"
    seen = defect.get("observed_in")  # a recorded file that shows the defect
    if seen:
        path = EVIDENCE_DIR / seen["file"]
        text = path.read_text(encoding="utf-8", errors="replace") if path.exists() else ""
        if seen["contains"] in text:
            return f"CONFIRMED ({seen['how']}): recorded in {seen['file']}"
        return f"NOT FOUND in {seen['file']} (claim not re-verified)"
    chk = defect.get("check")
    if not chk:
        return "CODE-VERIFIED (found by reading code or repository state; no runtime check)"
    r = by_id.get(chk)
    if r is None:
        return f"NOT RUN ({chk} absent from this run)"
    if r["status"] == "FAIL" and defect["id"] in r["defects"]:
        return f"CONFIRMED at runtime by {chk}"
    if r["status"] in ("SKIPPED", "BLOCKED"):
        return f"NOT TESTED in this run ({chk} {r['status']})"
    if r["status"] == "PASS":
        return f"NOT REPRODUCED ({chk} passed)"
    return f"{r['status']} ({chk})"


def previous_run_dir(evidence: Optional[Path] = None) -> Path:
    return (evidence or EVIDENCE_DIR) / "previous_runs" / PREVIOUS_LIVE_RUN


def probe_record(samples: dict, evidence: Optional[Path] = None):
    """S8-02 exchanges from this run, else from the archived earlier live run, and a label saying which."""
    if samples.get("S8-02"):
        return samples["S8-02"], "this run"
    archived = previous_run_dir(evidence) / "api_samples" / "S8-02.json"
    if archived.exists():
        return json.loads(archived.read_text(encoding="utf-8")), f"run {PREVIOUS_LIVE_RUN} (carried over; not repeated)"
    return None, ""


def probe_status(by_id: dict, evidence: Optional[Path] = None) -> str:
    """PASS if this run made the ledger probe; CARRIED if the archived earlier live run did; else this run's status."""
    status = status_of(by_id, "S8-02")
    if status == "PASS":
        return "PASS"
    archived = previous_run_dir(evidence) / "test_results" / "results.json"
    if archived.exists():
        try:
            earlier = {r["id"]: r for r in json.loads(archived.read_text(encoding="utf-8"))["results"]}
        except (ValueError, KeyError):
            earlier = {}
        if earlier.get("S8-02", {}).get("status") == "PASS":
            return "CARRIED"
    return status


def actual_for(defect: dict, by_id: dict) -> str:
    r = by_id.get(defect.get("check") or "")
    if not r:
        return ""
    bad = [e for e in r["expectations"] if not e["ok"]]
    return "; ".join(f"{e['what']}: expected {e['expected']!r}, got {e['actual']!r}" for e in bad)


def recorded_replies(defect: dict, samples: dict) -> list[str]:
    """The peer's recorded replies for the defect's check (what each call actually did, not only its status code)."""
    if not defect.get("show_replies"):
        return []
    out = []
    for ex in samples.get(defect.get("check") or "", []):
        path = "/" + ex["request"]["url"].split("/", 3)[3] if ex["request"]["url"].count("/") >= 3 else ex["request"]["url"]
        body = json.dumps(ex["response"].get("body"), separators=(",", ":"), ensure_ascii=False)
        out.append(f"`{ex['request']['method']} {path}` -> {ex['response']['status']}: `{md_escape(body[:200])}`")
    return out


def md_escape(text) -> str:
    return str(text).replace("|", "\\|").replace("\n", " ")


def first_exchange(samples: dict, check_id: str, url_part: str, nth: int = 0, method: str = "POST"):
    hits = [ex for ex in samples.get(check_id, []) if url_part in ex["request"]["url"] and ex["request"]["method"] == method]
    return hits[nth] if len(hits) > nth else None


def json_block(obj) -> str:
    return "```json\n" + json.dumps(obj, indent=2, ensure_ascii=False) + "\n```"


def git(*args) -> str:
    return subprocess.run(["git", "-C", str(REPO), *args], capture_output=True, text=True).stdout.rstrip("\n")


def changed_files() -> list[str]:
    """Tracked changes since the base commit plus untracked files (generated evidence folded into one line)."""
    lines = [l for l in git("status", "--porcelain=v1", "-uall").splitlines() if l.strip()]
    committed = git("diff", "--name-status", BASE_COMMIT, "HEAD").splitlines() if git("rev-parse", "HEAD") else []
    entries = {}
    for line in committed:
        parts = line.split("\t")
        if len(parts) >= 2:
            entries[parts[-1]] = {"A": "added", "M": "modified", "D": "deleted"}.get(parts[0][0], parts[0])
    for line in lines:
        code, path = line[:2], line[3:].strip().strip('"')
        if path in entries and "D" not in code:
            continue  # the label is relative to the base commit; a later edit does not change it
        entries[path] = "added" if "?" in code or "A" in code else ("deleted" if "D" in code else "modified")
    folded, evidence_count = [], 0
    for path, kind in sorted(entries.items()):
        if path.startswith(("evidence_packet/", "review_packets/")):
            evidence_count += 1
            continue
        folded.append(f"{kind:9} {path}")
    if evidence_count:
        folded.append(f"added     evidence_packet/ and review_packets/ ({evidence_count} generated files)")
    return folded


def level_qualifier(checks: list, by_id: dict) -> str:
    passing = [by_id[c] for c in checks if c in by_id and by_id[c]["status"] == "PASS"]
    if not passing:
        return ""
    systems = {s for r in passing for s in r["systems"]}
    parts = []
    if "cybersecurity" in systems:
        parts.append("API: local")
    if "vajra-local" in systems:
        parts.append("VAJRA: local node")
    if "tantra-live" in systems:
        parts.append("TANTRA: live")
    if any("CODE-VERIFIED" in r["evidence_level"] for r in passing):
        parts.append("partly CODE-VERIFIED")
    if any("SIMULATED" in r["evidence_level"] for r in passing):
        parts.append("includes SIMULATED roles")
    return " (" + "; ".join(parts) + ")"


def row_status(checks, by_id, opts=None) -> str:
    statuses = [status_of(by_id, c) for c in checks]
    if all(s == "PASS" for s in statuses):
        base = "VERIFIED"
    elif any(s in ("FAIL", "ERROR") for s in statuses):
        base = "FAILING"
    elif any(s == "PASS" for s in statuses):
        base = "PARTIAL"
    else:
        base = "NOT VERIFIED"
    qualifier = level_qualifier(checks, by_id)
    if base == "VERIFIED" and opts:
        # Every mapped check passed, but the requirement asks for more than this run showed.
        reasons = []
        if opts.get("needs_live") and ("local" in qualifier or "SIMULATED" in qualifier):
            reasons.append("the checks passed against local processes or simulated roles; Task 1 section M asks for the live path")
        if opts.get("cap"):
            reasons.append(opts["cap"])
        if reasons:
            return "PARTIAL" + qualifier + " - " + "; ".join(reasons)
    return base + qualifier


# ------------------------------------------------------------------------------------- reports

def sample_link(check_id: str, samples: dict, prefix: str = "../api_samples/") -> str:
    return f"[{check_id}]({prefix}{check_id}.json)" if check_id in samples else check_id


def test_report(meta, results, by_id, suites, samples) -> str:
    c = counts(results)
    lines = [
        "# Test execution report - Cybersecurity P0 verification",
        "",
        "Generated by `verification/build_reports.py` from the raw files in this folder.",
        "",
        "## Run",
        "",
        f"- Run id: `{meta['run_id']}` - started {meta['started_utc']}, finished {meta['finished_utc']} (UTC)",
        f"- Command: `{meta['command']}`",
        f"- TANTRA mode: `{meta['mode']['tantra']}`; live TANTRA ledger write allowed: `{meta['mode']['live_tantra_write_allowed']}`",
        f"- Cybersecurity repository commit: `{meta['versions']['cybersecurity_repo_commit']}`",
        f"- VAJRA repository commit (node binary source): `{meta['versions']['vajra_repo_commit']}`",
        f"- Python {meta['versions']['python']} on {meta['versions']['os']}",
        "",
        "## Summary",
        "",
        "| Suite | Command | Result | Raw output |",
        "|---|---|---|---|",
        f"| Integrated verification (real processes) | `{meta['command']}` | "
        f"{c['PASS']} PASS, {c['FAIL']} FAIL, {c['ERROR']} ERROR, {c['BLOCKED']} BLOCKED, {c['SKIPPED']} SKIPPED of {len(results)} | "
        "[results.json](results.json), [junit.xml](junit.xml) |",
    ]
    for s in suites:
        lines.append(f"| {s['suite']} | `{s['command']}` | {s['result']} | [{s['raw']}]({s['raw']}) |")
    lines += [
        "",
        "Status words: PASS = every expectation held; FAIL = at least one did not (actual value recorded); "
        "BLOCKED = another owner's component is missing, nothing asserted; SKIPPED = deliberately not run in this mode; "
        "ERROR = the check crashed or was inconclusive. Only PASS counts as passed. The evidence level of each check says "
        "what was live, what was local and which roles the harness SIMULATED.",
        "",
        "## Results by check",
        "",
        "| Check | Scenario | Result | Evidence level | Systems | First trace id | Defects |",
        "|---|---|---|---|---|---|---|",
    ]
    for r in results:
        trace = r["trace_ids"][0] if r["trace_ids"] else ""
        lines.append(f"| {sample_link(r['id'], samples)} {md_escape(r['title'])} | {md_escape(r['scenario'])} | "
                     f"**{r['status']}** | {md_escape(r['evidence_level'])} | {', '.join(r['systems'])} | `{trace}` | "
                     f"{', '.join(r['defects'])} |")
    lines += ["", "## Failed, blocked and skipped checks", ""]
    for r in results:
        if r["status"] == "PASS":
            continue
        lines.append(f"### {r['id']} - {r['title']} ({r['status']})")
        lines.append("")
        for e in r["expectations"]:
            if not e["ok"]:
                lines.append(f"- {md_escape(e['what'])}: expected `{md_escape(e['expected'])}`, actual `{md_escape(e['actual'])}`")
        for n in r["notes"]:
            lines.append(f"- note: {md_escape(n)[:600]}")
        if r["id"] in samples:
            lines.append(f"- recorded exchanges: [api_samples/{r['id']}.json](../api_samples/{r['id']}.json)")
        lines.append("")
    lines += [
        "## How to reproduce",
        "",
        "```",
        "# 1. VAJRA node binary from bhiv-VAJRA_Blockchain (Go 1.23+):",
        "cd <bhiv-VAJRA_Blockchain>/core/relay-chain && go build -o <bin>/vajra-relay ./cmd/relay",
        "# 2. Python 3.12 environment with cybercrime/backend/requirements.txt minus the TTS package",
        "# 3. From the cybersecurity-authentication repository root:",
        "python verification/run_verification.py --vajra-bin <bin>/vajra-relay --vajra-repo <bhiv-VAJRA_Blockchain> --tantra off",
        "#    live TANTRA (health GETs + /validate calls; add --allow-live-tantra-write for the single ledger probe):",
        "python verification/run_verification.py --vajra-bin <bin>/vajra-relay --tantra live --tantra-base http://<tantra-host>",
        "python verification/build_reports.py",
        "```",
        "",
    ]
    return "\n".join(lines)


def defects_report(by_id, samples) -> str:
    lines = ["# Defects found by the P0 verification", "",
             "Generated from `verification/defects.py`, this run's `results.json` and the recorded files it names. A defect is "
             "CONFIRMED only when recorded evidence shows it: its check failed, its check passed because the peer refused "
             "(for example a contract gate), or a named recorded file contains it. CODE-VERIFIED means it was found by reading "
             "code or repository state. Owners follow the lanes named in the task documents.", ""]
    for system in ("Cybersecurity", "Cybersecurity (fraud-evidence-system)", "VAJRA", "TANTRA", "Bucket (owner UNKNOWN)"):
        rows = [d for d in DEFECTS if d["system"] == system]
        if not rows:
            continue
        lines += [f"## {system}", "", "| ID | Severity | Status | Title | Owner |", "|---|---|---|---|---|"]
        for d in rows:
            lines.append(f"| {d['id']} | {d['severity']} | {defect_status(d, by_id)} | {md_escape(d['title'])} | {md_escape(d['owner'])} |")
        lines.append("")
        for d in rows:
            lines += [f"### {d['id']} - {d['title']}", "",
                      f"- Severity: {d['severity']}; owner: {d['owner']}; status: {defect_status(d, by_id)}",
                      f"- Where: `{d['where']}`", "- Steps:"]
            lines += [f"  {i}. {s}" for i, s in enumerate(d["steps"], 1)]
            lines.append(f"- Expected: {d['expected']}")
            act = actual_for(d, by_id)
            if act:
                lines.append(f"- Actual (this run): {act}")
            replies = recorded_replies(d, samples)
            if replies:
                lines.append(f"- Recorded replies ([api_samples/{d['check']}.json](../api_samples/{d['check']}.json)):")
                lines += [f"  - {x}" for x in replies]
            if d.get("fixed_by"):
                lines.append(f"- Fixed by: {d['fixed_by']}")
            lines += [f"- {'Fix' if d.get('status') == 'FIXED' else 'Suggested fix'}: {d['fix']}", ""]
    return "\n".join(lines)


ROWS = [
    ("EOD 04 Nov - mandatory scenario", "Unauthorized access: denied at the enforcement point; actor, resource, decision, reason evidenced",
     ["S1-01", "S1-02", "S1-03", "S1-04", "S1-05", "S1-06", "S1-07", "V-01"]),
    ("EOD 04 Nov - mandatory scenario", "Revoked permission: next request denied; stale grants do not persist",
     ["S2-01", "S2-02", "S2-03", "S2-04", "S4-05", "V-02"]),
    ("EOD 04 Nov - mandatory scenario", "Ambiguous / low confidence: uncertainty visible; no autonomous high-impact action",
     ["S3-01", "S3-02", "S3-03"]),
    ("EOD 04 Nov - mandatory scenario", "Duplicate event: no duplicate incident or repeated privileged action",
     ["S4-01", "S4-02", "S4-03", "S4-04"]),
    ("EOD 04 Nov - mandatory scenario", "TANTRA denial / outage: fails safely, no bypass, failure observable",
     ["S5-01", "S5-02", "S5-03", "S5-04", "S5-05"]),
    ("EOD 04 Nov - mandatory scenario", "Evidence failure: missing evidence visible, no false completion",
     ["S6-01", "S6-02", "S6-03", "S6-04"]),
    ("EOD 04 Nov - mandatory scenario", "Recovery failure: stays restricted until required checks pass",
     ["S7-01", "S7-02", "S7-03", "S7-04", "S7-05"]),
    ("EOD 04 Nov - mandatory scenario", "Trace / replay: source, decision, enforcement and evidence linked; replay where supported",
     ["S8-01", "S8-02", "S8-03"]),
    ("10-day - mandatory proof", "A NORMAL: user -> identity -> consent -> authorised access -> evidence", ["P-A"]),
    ("10-day - mandatory proof", "B REVOCATION: active permission -> revoke -> future request denied -> evidence", ["S2-01", "S4-05"]),
    ("10-day - mandatory proof", "C ATTACK: threat -> detect -> correlate -> govern -> contain -> evidence", ["P-C1", "P-C2", "P-C3"]),
    ("10-day - mandatory proof", "D RECOVERY: failure -> candidate -> verify -> replay/integrity -> rebuild -> reinstate",
     ["S7-02", "S7-03", "S7-04", "S7-05", "S8-03"]),
    ("Task 1 section M - live path", "Input signal / data-access event -> Cybersecurity processing -> decision", ["S1-05", "P-A"],
     {"needs_live": True}),
    ("Task 1 section M - live path", "Controlled downstream response (containment through VAJRA)", ["P-C3", "S7-02"],
     {"needs_live": True}),
    ("Task 1 section M - live path", "Evidence / audit -> replay reference", ["S1-01", "S8-01", "S8-03"], {"needs_live": True}),
    ("Task 1 section M - live path", "Observability", ["O-01", "O-03", "O-04"], {"needs_live": True}),
    ("Task 1 section M - live path", "TANTRA runtime participation", ["O-02", "S5-01", "S5-04", "S8-02"],
     {"needs_live": True, "cap": "TANTRA's contract gate refuses the module's security decisions (TAN-01); only TANTRA's own "
                                 "integrity_probe contract was written"}),
    ("Task 1 section M - Vajra boundary", "Vajra consent state -> Cybersecurity enforcement -> permitted operation -> evidence "
     "(scope and caller binding are NOT checked: CYB-13)", ["S2-01", "P-A", "S1-05", "S5-03", "S1-06"],
     {"needs_live": True, "cap": "VAJRA ran as a local node with consent SIMULATED, and scope and caller binding are not "
                                 "checked (CYB-13)"}),
]


def acceptance(meta, by_id, evidence: Path, suites: list) -> list[tuple]:
    c = counts(list(by_id.values()))
    unit = next((s for s in suites if s["raw"] == "cyber_unit_tests.txt"), None)
    unit_ok = bool(unit) and "failed" not in unit["result"] and "error" not in unit["result"]
    started = bool(meta["services"].get("cybersecurity-api")) and bool(meta["services"].get("vajra-relay-node"))
    required = ["api_samples", "runtime_logs", "test_results", "deployment_proof", "replay_evidence", "screenshots", "code_packet"]
    missing = [d for d in required if not (evidence / d).exists() or not any((evidence / d).iterdir())]
    vajra_ok = all(status_of(by_id, x) == "PASS" for x in ("S1-05", "S2-01", "P-A", "S8-01", "S1-06", "S5-03"))
    gate = status_of(by_id, "S5-01") == "PASS"
    probe = probe_status(by_id, evidence)
    blocked = [x for x in ("P-C2",) if status_of(by_id, x) == "BLOCKED"]
    return [
        ("BUILD WORKS", "YES" if started and unit_ok else "NOT DETERMINED",
         "OFFLINE-VERIFIED: both services started in this run (deployment_proof/local_runtime_proof.json)"
         + (f"; unit tests: {unit['result']}" if unit else "; unit-test output not found")),
        ("INTEGRATION WORKS", "PARTIAL" if vajra_ok else "NO",
         ("VAJRA path OFFLINE-VERIFIED on a local node (consent SIMULATED). " if vajra_ok else "VAJRA path checks not all passing. ")
         + ("TANTRA contract gate LIVE-VERIFIED; cybersecurity contract BLOCKED-EXTERNAL (TAN-01). " if gate else
            "TANTRA not exercised in this run. ")
         + (f"Detection/correlation BLOCKED-EXTERNAL ({', '.join(blocked)})." if blocked else "")),
        ("TESTS PASS", "NO" if c["FAIL"] or c["ERROR"] else "YES",
         f"{c['PASS']} PASS, {c['FAIL']} FAIL, {c['ERROR']} ERROR, {c['BLOCKED']} BLOCKED, {c['SKIPPED']} SKIPPED; failures are listed in DEFECTS.md"),
        ("EVIDENCE EXISTS", "YES" if not missing else "PARTIAL",
         "all evidence folders present" if not missing else f"missing or empty: {', '.join(missing)}"),
        ("VM DEPLOYMENT WORKS", "NO", "BLOCKED-EXTERNAL: no VM reference was provided to this work (owner: Rajaryan)"),
        ("TANTRA PARTICIPATION IS PROVEN", "PARTIAL" if gate else "NO",
         ("LIVE-VERIFIED: TANTRA's contract gate answered the module's decisions"
          + ({"PASS": "; the registered integrity_probe contract was written and replay-verified (S8-02)",
              "CARRIED": f"; the registered integrity_probe contract was written and replay-verified in run {PREVIOUS_LIVE_RUN} "
                         "(S8-02, carried over from previous_runs/; the write was not repeated in this run)"}
             .get(probe, "; no ledger write in this run"))
          + "; security decisions cannot enter the TANTRA ledger until TANTRA registers a contract (TAN-01)") if gate
         else "not exercised in this run"),
        ("VAJRA BOUNDARY IS PROVEN", "PARTIAL" if vajra_ok else "NO",
         "OFFLINE-VERIFIED against the real VAJRA code run locally, for consent state only; scope and caller binding are not "
         "enforced (CYB-13); live VAJRA not used (VAJRA asks for no test records on its live node)"),
        ("BCAES ALIGNMENT IS DOCUMENTED", "YES" if (REPO / "BCAES_ALIGNMENT.md").exists() else "NO",
         "BCAES_ALIGNMENT.md (unknowns marked UNKNOWN)"),
        ("HANDOVER IS COMPLETE", "PENDING" if (REPO / "HANDOVER.md").exists() else "NO",
         "HANDOVER.md covers the Task 1 section L items; acceptance by a receiving engineer is PENDING"),
        ("CENTRAL DEPOSITORY RECEIVES THE ASSET", "PENDING", "submission channel and reference are UNKNOWN"),
    ]


def proof_matrix(meta, by_id, evidence: Path, suites: list) -> str:
    lines = ["# Final proof matrix", "",
             "Each requirement maps to checks in this run. VERIFIED = every mapped check passed and the requirement asks for "
             "nothing more; FAILING = at least one failed; PARTIAL = some passed and the rest were blocked or skipped, or all "
             "passed but the requirement asks for more than the run showed (the reason follows the bracket); NOT VERIFIED = "
             "none passed. The bracket lists the systems the passing checks touched (live or local) and whether the harness "
             "simulated a role.", "",
             f"Run `{meta['run_id']}`, TANTRA mode `{meta['mode']['tantra']}`.", "",
             "| Source | Requirement | Checks (result) | Status |", "|---|---|---|---|"]
    for group, req, checks, *opts in ROWS:
        detail = ", ".join(f"{c} {status_of(by_id, c)}" for c in checks)
        lines.append(f"| {group} | {md_escape(req)} | {detail} | **{md_escape(row_status(checks, by_id, opts[0] if opts else None))}** |")
    lines += ["", "## Task 1 section O acceptance conditions", "",
              "| Condition | Met? | Basis (evidence status) |", "|---|---|---|"]
    for cond, status, basis in acceptance(meta, by_id, evidence, suites):
        lines.append(f"| {cond} | **{status}** | {md_escape(basis)} |")
    lines.append("")
    return "\n".join(lines)


def readiness_board(by_id) -> list[tuple]:
    def st(*checks):
        base = row_status(list(checks), by_id)
        return {"VERIFIED": "BUILT & VERIFIED", "FAILING": "BUILT - FAILING TESTS", "PARTIAL": "PARTIAL",
                "NOT VERIFIED": "BUILT NOT VERIFIED"}[base.split(" (")[0]] + (" (" + base.split(" (", 1)[1] if " (" in base else "")
    return [
        ("RBAC enforcement + canonical audit (Cybersecurity)", "cybersecurity-authentication", "Kaushlendra", st("S1-01", "S1-02", "S1-03", "O-03")),
        ("Self-registration control (Cybersecurity)", "cybersecurity-authentication", "Kaushlendra", st("S1-04")),
        ("Session revocation + deactivation (Cybersecurity)", "cybersecurity-authentication", "Kaushlendra", st("S2-02", "S2-03", "S7-01")),
        ("Tier-1 permission revocation (Cybersecurity)", "cybersecurity-authentication", "Kaushlendra", st("S2-04")),
        ("Protected access with VAJRA consent (new bridge)", "cybersecurity-authentication", "Rajaryan (review), Hemanth (built)",
         st("P-A", "S1-05", "S2-01", "S4-01", "S4-04", "S4-05", "S6-01")),
        ("Evidence: local audit + VAJRA record", "cybersecurity-authentication + VAJRA", "Rajaryan / Prakash", st("S8-01", "S6-03")),
        ("Wallet incident analysis (existing intelligence)", "cybersecurity-authentication", "Shivam", st("S3-01", "S3-03")),
        ("Threat assessment of access signals (rule auth.repeated_failed_login)",
         "cybersecurity-authentication (app/core/threat_detection.py)", "Shivam (review); built by Hemanth", st("P-C1", "P-C2")),
        ("Correlation into incidents (security_incidents)", "cybersecurity-authentication (app/core/threat_detection.py)",
         "Aryan Dias (review); built by Hemanth", st("P-C2")),
        ("TANTRA contract for security decisions", "TANTRA (live)", "TANTRA team", "BLOCKED" if status_of(by_id, "S5-01") == "PASS" else "NOT VERIFIED"),
        ("TANTRA ledger participation (probe contract)", "TANTRA (live)", "TANTRA team / Hemanth",
         {"PASS": "BUILT & VERIFIED (LIVE)",
          "CARRIED": f"BUILT & VERIFIED (LIVE, run {PREVIOUS_LIVE_RUN}; not repeated)"}.get(probe_status(by_id), "NOT VERIFIED")),
        ("TANTRA response approval (rajya/validate?)", "TANTRA", "TANTRA team", "UNKNOWN (no test lane)"),
        ("VAJRA authority lifecycle + bearer gate", "bhiv-VAJRA_Blockchain", "Prakash", st("S1-06", "S2-01", "S7-02")),
        ("VAJRA authority durability across restart", "bhiv-VAJRA_Blockchain", "Prakash / Samsoorya", st("S7-05")),
        ("VAJRA privileged routes auth (mint, permission, freeze)", "bhiv-VAJRA_Blockchain", "Prakash", st("V-01")),
        ("VAJRA recovery anchors (real signatures)", "bhiv-VAJRA_Blockchain", "Prakash / Samsoorya", "SIMULATED"),
        ("VM deployment of Cybersecurity", "assigned VM (UNKNOWN)", "Rajaryan", "BLOCKED"),
    ]


def review_packet(meta, results, by_id, samples, branch) -> str:
    c = counts(results)
    allow = first_exchange(samples, "P-A", "/api/v1/protected/access")
    deny = first_exchange(samples, "S2-01", "/api/v1/protected/access", nth=1)
    tantra_reject = first_exchange(samples, "S5-01", "/api/v1/protected/access")
    golden = by_id.get("S8-01", {}).get("trace_ids", [""])[-1] if by_id.get("S8-01") else ""
    gate = status_of(by_id, "S5-01")
    probe = probe_status(by_id)
    lines = [
        "# REVIEW_PACKET - Cybersecurity P0 verification and BHIV runtime bridge",
        "",
        f"Branch `{branch}` - base commit `{BASE_COMMIT}` (main, 2026-10-27). Generated from run `{meta['run_id']}` "
        f"({meta['started_utc']} to {meta['finished_utc']} UTC, TANTRA mode `{meta['mode']['tantra']}`).",
        "",
        "## 1. Entry point",
        "",
        "- API: `POST /api/v1/protected/access` in `cybercrime/backend/app/api/v1/endpoints/protected_access.py` "
        "(contract_version 1.0.0; RBAC: investigator and superadmin).",
        "- Verification: `python verification/run_verification.py --vajra-bin <vajra-relay> [--tantra live --tantra-base <url>]`.",
        "",
        "## 2. Core execution flow (three critical files)",
        "",
        "1. `cybercrime/backend/app/api/v1/endpoints/protected_access.py` - authenticate (RBAC middleware) -> claim the "
        "idempotency key (per caller, bound to the request) -> read VAJRA authority (fail closed) -> canonical audit event "
        "(no decision, and no VAJRA call, without it) -> VAJRA evidence record committing to the audit event's hash -> a "
        "tentative ALLOW without a VAJRA record becomes DENY (superseding audit event) -> minimal projection to TANTRA's "
        "contract gate -> response with per-sink evidence status.",
        "2. `cybercrime/backend/app/core/bhiv_runtime.py` - the TANTRA and VAJRA calls (verify, evidence record, validate, "
        "karma ingest + replay verify) with explicit statuses; no bypass of TANTRA's gate; never calls VAJRA transitions.",
        "3. `verification/checks/scenarios.py` - the checks against the real processes.",
        "",
        "## 3. Live flow",
        "",
        "```",
        "Investigator (JWT) --> Cybersecurity RBAC --> POST /api/v1/protected/access",
        "   --> VAJRA GET /api/vajra/authority/verify    (consent state; fail closed)",
        "   --> canonical audit event                     (SQL audit_logs, trace_id; 503 and nothing else if it fails)",
        "   --> VAJRA POST /api/vajra/evidence/record    (Bearer; evidence_hex = SHA-256 of the audit event;",
        "                                                  one row per decision: trace_id '<trace>::<decision_id>')",
        "   --> ALLOW only if VAJRA RECORDED, else DENY  (superseding audit event points to the first)",
        "   --> TANTRA POST /validate/prana/ingress       (minimal projection; ledger write only if validated)",
        "   --> response: decision, reason, decision_id, trace_id, evidence {local, vajra, tantra, complete, gaps}",
        "```",
        "",
        "What ALLOW means: the caller passed RBAC, VAJRA reports GRANT or USE for the subject, and VAJRA recorded the "
        "evidence. The requested action and resource are not checked against a VAJRA scope (`vajra.scope_checked: false`, "
        "CYB-13).",
        "",
        f"Golden trace for review: `{golden}` (check S8-01). The id appears in the HTTP response and the audit store, and it "
        "prefixes the VAJRA TruthStore row id (`<trace>::<decision_id>`); see `replay_evidence/GOLDEN_TRACE.md`.",
        "",
        "## 4. Real JSON request/response (recorded, secrets redacted)",
        "",
    ]
    if allow:
        lines += ["### ALLOW (check P-A)", "", json_block({"request": allow["request"], "response": allow["response"]}), ""]
    if deny:
        lines += ["### DENY after VAJRA revocation (check S2-01)", "", json_block({"request": deny["request"], "response": deny["response"]}), ""]
    if tantra_reject:
        body = tantra_reject["response"]["body"]
        lines += ["### TANTRA contract gate rejects the security event (check S5-01, live TANTRA)", "",
                  json_block({"response_evidence": body.get("evidence") if isinstance(body, dict) else None}), ""]
    lines += ["## 5. What changed (vs base commit, including new files)", "", "```", *changed_files(), "```", "",
              "## 6. Failure cases", "", "| Case | Check | Result in this run |", "|---|---|---|"]
    for chk, case in (("S5-02", "TANTRA unreachable"), ("S5-05", "TANTRA slow (never answers)"), ("S5-01", "TANTRA rejects the contract"),
                      ("S6-01", "VAJRA refuses the evidence token"), ("S6-02", "VAJRA down"), ("S6-03", "audit store not writable"),
                      ("S7-03", "VAJRA crash-restart (decision follows VAJRA)"), ("S7-05", "VAJRA authority after restart"),
                      ("S8-03", "stored evidence tampered"), ("S4-04", "key reused for another request"),
                      ("S4-05", "replay after revocation")):
        lines.append(f"| {case} | {chk} | {status_of(by_id, chk)} |")
    tantra_line = ("contract gate exercised live (" + gate + ")"
                   + {"PASS": "; registered probe contract written and replay-verified (S8-02 PASS)",
                      "CARRIED": f"; registered probe contract written and replay-verified in run {PREVIOUS_LIVE_RUN} "
                                 "(S8-02 PASS there, carried over; not repeated)"}.get(probe, f"; ledger probe {probe}")
                   ) if meta["mode"]["tantra"] == "live" else "not exercised in this run"
    vajra_line = ("consent read, evidence record, bearer gate and lifecycle - "
                  + ("OFFLINE-VERIFIED on a local node, consent SIMULATED" if all(status_of(by_id, x) == "PASS" for x in ("S1-05", "S2-01", "P-A", "S1-06"))
                     else "not all checks passing"))
    lines += [
        "",
        "## 7. Proof",
        "",
        f"- Integrated run: {c['PASS']} PASS, {c['FAIL']} FAIL, {c['ERROR']} ERROR, {c['BLOCKED']} BLOCKED, {c['SKIPPED']} SKIPPED of {len(results)} "
        "([test_results/TEST_REPORT.md](test_results/TEST_REPORT.md)).",
        "- Requirement mapping: [test_results/PROOF_MATRIX.md](test_results/PROOF_MATRIX.md).",
        "- Defects: [test_results/DEFECTS.md](test_results/DEFECTS.md).",
        "- Raw exchanges: `api_samples/<check>.json`; logs: `runtime_logs/`; replay: `replay_evidence/`; screenshots: `screenshots/`.",
        "",
        "## 8. Repository coverage",
        "",
        "Covered by checks: RBAC middleware, auth (login/register), access revoke (all three tiers), authz check, incident "
        "analysis, evidence upload, system health, failed-login detection and correlation, the protected-access route and "
        "bridge. Not covered: the React frontends, TTS, ML training scripts, most of fraud-evidence-system (its own Jest "
        "suite is reported).",
        "",
        "## 9. Integration status",
        "",
        "| Pillar | Status |",
        "|---|---|",
        f"| VAJRA (local node, real code) | {vajra_line} |",
        f"| TANTRA (live services) | {tantra_line} |",
        f"| Threat assessment / correlation of access signals | {status_of(by_id, 'P-C2')} (P-C2) |",
        "",
        "## 10. Deployment status",
        "",
        "Local process deployment with health, crash-restart and recovery checks (deployment_proof/). VM: BLOCKED-EXTERNAL "
        "(no VM reference provided).",
        "",
        "## 11. Known limitations",
        "",
        "- VAJRA was run locally from its repository (VAJRA asks for no test records on its live node). VAJRA authority "
        "state is held in memory (VAJ-02).",
        "- ALLOW does not check scope or bind the caller to the subject (CYB-13); the VAJRA token is unscoped (it also "
        "authorizes VAJRA transitions).",
        "- TANTRA has no registered contract for cybersecurity events (TAN-01), so decisions are not in the TANTRA ledger.",
        "- The harness plays the VAJRA user journey and TANTRA governance roles (labelled SIMULATED per check).",
        "- Failed-login detection is a count rule (5 in 10 minutes per account), not a model; its confidence is a fixed "
        "function of the count. The protected-access rate limit is kept per process.",
        "- The bridge, the checks and the fixes in other lanes (CHANGELOG.md) were written by the same person; review by "
        "the lane owners and the integration lead is requested.",
        "",
    ]
    return "\n".join(lines)


def eod_report(meta, results, by_id, suites, branch, commit="") -> str:
    c = counts(results)
    golden = by_id.get("S8-01", {}).get("trace_ids", [""])[-1] if by_id.get("S8-01") else ""
    confirmed = [d for d in DEFECTS if defect_status(d, by_id).startswith("CONFIRMED")]
    critical = [d["id"] for d in confirmed if d["severity"] == "CRITICAL"]
    suite_txt = "; ".join(f"{s['suite']}: {s['result']}" for s in suites)
    live = meta["mode"]["tantra"] == "live"
    probe = probe_status(by_id)
    detection = status_of(by_id, "P-C2")
    fixed_for_others = [d["id"] for d in DEFECTS if d.get("status") == "FIXED" and "for review by" in d.get("fixed_by", "")]
    failing = [r["id"] for r in results if r["status"] == "FAIL"]
    lines = [
        "# EOD report - 04 Nov 2026 - Hemanth (Independent Verification & Evidence)",
        "",
        "Format: BHIV Cybersecurity P0 task, section 8. Generated from the evidence packet.",
        "",
        "| Owner | Increment | Repository/PR/commit | Run/deploy status | Tests executed/results | Evidence/trace references | Integration status | Gaps | Rollback | Next owner/action |",
        "|---|---|---|---|---|---|---|---|---|---|",
        "| Hemanth | Verification harness against real processes (8 mandatory scenarios + 4 proofs), evidence packet, defect list; "
        "protected-access route and VAJRA/TANTRA bridge (off unless configured) to make the path testable | "
        f"BHIV-Engineering-Exchange/cybersecurity-authentication, branch `{branch}`, "
        + (f"commit `{commit}`" if commit else "commit: see the hand-over message") + " | "
        "Local processes: API and VAJRA node started, crash-restarted and recovered; no VM | "
        f"Integrated: {c['PASS']} PASS / {c['FAIL']} FAIL / {c['BLOCKED']} BLOCKED / {c['SKIPPED']} SKIPPED / {c['ERROR']} ERROR of {len(results)}. {suite_txt} | "
        f"`evidence_packet/`; golden trace `{golden}` | VAJRA: OFFLINE-VERIFIED on a local node (consent SIMULATED). TANTRA: "
        + (("contract gate LIVE-VERIFIED"
            + {"PASS": "; probe write LIVE-VERIFIED",
               "CARRIED": f"; probe write LIVE-VERIFIED in run {PREVIOUS_LIVE_RUN} (not repeated)"}.get(probe, ""))
           if live else "not exercised")
        + f". Detection/correlation of failed logins: {detection} (P-C2, local) | "
        f"Confirmed defects: {', '.join(d['id'] for d in confirmed)} | `git revert <commit>` (adds files, small config/RBAC/model "
        "additions, regenerated openapi.yaml, three junk files deleted - all restorable) | See next actions below |",
        "",
        "## Team closure",
        "",
        "- **What shipped:** the verification harness and evidence packet; the protected-access route with the VAJRA/TANTRA "
        "bridge (off unless configured); fixes for other lanes' open defects ("
        + ", ".join(fixed_for_others) + ") and rule-based detection and correlation of failed logins (proof C), each for "
        "its owner's review; reproducible unit tests (conftest) and a regenerated OpenAPI contract.",
        "- **What is actually integrated:** Cybersecurity -> VAJRA (consent read, evidence record) against the real VAJRA code "
        "on a local node" + ("; Cybersecurity -> TANTRA contract gate on the live TANTRA services" if live else "")
        + ("; failed-login detection and correlation inside Cybersecurity (local)" if detection == "PASS" else "")
        + ". Not integrated: the TANTRA ledger for security decisions (no contract), TANTRA response approval"
        + ("" if detection == "PASS" else ", threat assessment and correlation of access signals") + ".",
        f"- **What was tested:** {len(results)} integrated checks; unit suites listed in TEST_REPORT.md.",
        "- **What remains blocked:** VM (no reference), TANTRA security contract (TAN-01), a scope-aware VAJRA contract "
        "(CYB-13), a live VAJRA test lane, the Central Depository submission reference"
        + ("" if detection == "PASS" else ", assessment/correlation wiring") + ".",
        "- **Who owns the next action:** Kaushlendra - review the fixes in his lane (CYB-01, 02, 04, 05, 07, 08, 09, 12, 15); "
        "Shivam - review CYB-03, CYB-06 and the detection rule; Aryan Dias - review the correlation; Rajaryan - review and "
        "merge the branch, the CYB-13 scope decision with Prakash, the VM; Prakash - VAJ-01..VAJ-09; TANTRA team - "
        "TAN-01..TAN-04, TAN-06; Bucket owner (UNKNOWN, via the TANTRA team) - TAN-05.",
        "",
        "## Acceptance recommendation (technical, implementer's self-assessment)",
        "",
        "**Not accepted for production.** "
        + (f"{len(critical)} CRITICAL defect(s) are confirmed ({', '.join(critical)}). " if critical else "")
        + (f"{len(failing)} check(s) still fail ({', '.join(failing)}; see DEFECTS.md and PROOF_MATRIX.md). " if failing else "")
        + "The bridge, the harness and the fixes in other lanes were written and tested by the same person (Hemanth), so "
        "acceptance is for the lane owners and Rajaryan (integration lead) after review, together with the independent "
        "audit result.",
        "",
        "## Parikshak and UX (recorded separately)",
        "",
        "- Parikshak technical validation: NOT RUN (Parikshak is a separate quality-gate engine; this report is the team's own "
        "technical verification).",
        "- UX acceptance: NOT EVALUATED - no user-facing journey (denial/recovery screens) was tested in this increment.",
        "",
        "## BIQOS readiness board",
        "",
        "| Component | Repository | Owner | Status |",
        "|---|---|---|---|",
    ]
    for comp, repo, owner, status in readiness_board(by_id):
        lines.append(f"| {comp} | {repo} | {owner} | **{status}** |")
    lines.append("")
    return "\n".join(lines)


def probe_effects(samples: dict, evidence: Optional[Path] = None) -> list[str]:
    """What the single TANTRA ledger write caused, read from TANTRA's own /karma/ingest reply (check S8-02)."""
    exchanges, source = probe_record(samples, evidence)
    ingest = next((e for e in exchanges or [] if "/karma/ingest" in e["request"]["url"]), None)
    body = ingest["response"].get("body") if ingest else None
    if not isinstance(body, dict):
        return []
    prana = body.get("prana") or {}
    bucket = prana.get("bucket") or {}
    prop = bucket.get("propagation") or {}
    lines = [f"- Karma: status `{body.get('status')}`, event `{body.get('event_id')}`, submission `{body.get('submission_id')}`, "
             f"logged by TANTRA at {body.get('logged_at')} (the reply arrived at {ingest.get('utc')}).",
             f"- PRANA: `{prana.get('status')}`, PRANA event `{prana.get('event_id')}`."]
    if bucket:
        try:
            detail = (json.loads(prop.get("response_body") or "{}").get("detail") or {}).get("message", "")
        except (ValueError, AttributeError):
            detail = ""
        lines.append(f"- PRANA -> Bucket: `{bucket.get('status')}`"
                     + (f", HTTP {prop.get('http_status')}" if prop.get("http_status") else "")
                     + (f": {detail}" if detail else "")
                     + (" (TANTRA also reported a read timeout)" if "timed out" in str(prop.get("error", "")) else "")
                     + (" - reported to the TANTRA team as TAN-06." if bucket.get("status") == "failed" else "."))
    if "[REDACTED after capture" in json.dumps(body):
        lines.append("- TANTRA's internal Bucket address in this reply was replaced by a `[REDACTED after capture ...]` label "
                     "before publication; everything else is as received.")
    if source != "this run":
        lines.insert(0, f"- Source: {source}; see `previous_runs/{PREVIOUS_LIVE_RUN}/`.")
    return lines


def previous_run_calls(evidence: Path) -> list[dict]:
    """TANTRA calls made by the archived earlier live run (written when it was archived; see previous_runs/)."""
    f = previous_run_dir(evidence) / "tantra_calls.json"
    return json.loads(f.read_text(encoding="utf-8")) if f.exists() else []


def outside_run_calls(evidence: Path) -> tuple[list[dict], list[str]]:
    """Live calls made by hand on the run day, outside the harness (raw files and a manual record in api_samples/outside_run/)."""
    folder = evidence / "api_samples" / "outside_run"
    calls, notes = [], []
    if not folder.is_dir():
        return calls, notes
    for f in sorted(folder.glob("live_probe_*.txt")):
        current = None
        for line in f.read_text(encoding="utf-8").splitlines():
            m = re.match(r"=== (GET|POST) (\S+) @ (\S+)", line)
            if m:
                current = {"utc": m.group(3), "method": m.group(1), "url": m.group(2), "http": "not recorded",
                           "what": "read-only health / identity check", "source": f.name}
                calls.append(current)
            elif current is not None and current["http"] == "not recorded":
                m = re.match(r"HTTP (\d{3})", line)
                if m:
                    current["http"] = m.group(1)
    for f in sorted(folder.glob("validation_probe_*.json")):
        for ex in json.loads(f.read_text(encoding="utf-8")):
            req, resp = ex.get("request") or {}, ex.get("response") or {}
            calls.append({"utc": ex.get("utc"), "method": "POST", "url": ex.get("url"), "http": str(ex.get("http_status")),
                          "what": f"contract check of `{req.get('event_type')}` (submission `{req.get('submission_id')}`): "
                                  f"{resp.get('status')}" + (f" - {resp['reason']}" if resp.get("reason") else ""),
                          "source": f.name})
    record = folder / "manual_record.json"
    if record.exists():
        rec = json.loads(record.read_text(encoding="utf-8"))
        calls += [{**c, "source": f"{record.name} (time: {c.get('time_source', 'source not stated')})"} for c in rec.get("calls", [])]
        if rec.get("not_recorded"):
            notes.append("Not recorded: " + rec["not_recorded"])
    calls.sort(key=lambda c: str(c["utc"]))
    return calls, notes


def live_tantra_calls(meta, samples, evidence: Path) -> str:
    """Every call made to live TANTRA on the run day: this run's calls plus the recorded calls made by hand outside it."""
    lines = ["# Calls made to the live TANTRA services on the run day", "",
             f"Run `{meta['run_id']}`, TANTRA base `{meta['mode']['tantra_base']}`. Every trace id and submission id sent starts with "
             "`cyber-p0-test-` (request ids and ids inside payloads do not); every payload is synthetic. Generated from "
             "`api_samples/`, `runtime_logs/cyber_service.log` and `api_samples/outside_run/`.", "",
             "## Calls made by the verification harness", "",
             "The UTC column is the time the reply arrived; a slow call was sent earlier (see the next sections).", "",
             "| UTC (reply received) | Check | Method | Path | HTTP | Ledger write? |", "|---|---|---|---|---|---|"]
    writes = 0
    for check_id, exchanges in sorted(samples.items()):
        for ex in exchanges:
            if ex.get("system") != "tantra-live":
                continue
            url = ex["request"]["url"]
            path = "/" + url.split("/", 3)[3] if url.count("/") >= 3 else url
            is_write = "/karma/ingest" in url and ex["response"]["status"] == 200
            writes += 1 if is_write else 0
            kind = ("YES - one ledger event" if is_write else
                    "replay check (TANTRA may store a validation record)" if "/karma/verify" in url else
                    "no ledger write (validation or read; whether /validate stores anything is not known)")
            lines.append(f"| {ex['utc']} | {check_id} | {ex['request']['method']} | `{path.split('?')[0]}` | {ex['response']['status']} | {kind} |")
    lines += ["", "## Calls made by the Cybersecurity API itself", "",
              "The API runs with TANTRA_KARMA_URL empty in this run, so it can only call /validate.", "",
              "| UTC | Trace id | Outcome | Ledger write? |", "|---|---|---|---|"]
    log = evidence / "runtime_logs" / "cyber_service.log"
    local_only = 0
    if log.exists():
        for raw in log.read_text(encoding="utf-8", errors="replace").splitlines():
            if '"action":"bhiv_runtime.tantra_submit"' not in raw:
                continue
            try:
                entry = json.loads(raw[raw.index("{"):])
            except (ValueError, json.JSONDecodeError):
                continue
            status = (entry.get("details") or {}).get("status")
            if status == "NOT_CONFIGURED":
                continue
            if not str(entry.get("trace_id", "")).startswith("cyber-p0-test-"):
                local_only += 1  # induced-outage checks point the API at local closed/slow ports, not at TANTRA
                continue
            is_write = status in ("RECORDED", "RECORDED_UNVERIFIED")
            writes += 1 if is_write else 0
            lines.append(f"| {entry.get('timestamp')} | `{entry.get('trace_id')}` | {status} | {'YES' if is_write else 'no'} |")
    if local_only:
        lines += ["", f"Not listed: {local_only} outcome(s) from the induced-outage checks (S5-02, S5-05), where the API was "
                  "pointed at local closed or never-answering ports instead of TANTRA."]
    effects = probe_effects(samples, evidence)
    if effects:
        lines += ["", "## What the single ledger write caused inside TANTRA (from TANTRA's own reply, check S8-02)", "", *effects]
    host = meta["mode"]["tantra_base"].split("://", 1)[-1].split("/")[0].split(":")[0]
    earlier = previous_run_calls(evidence) if meta["run_id"] != PREVIOUS_LIVE_RUN else []
    if earlier:
        lines += ["", f"## Calls made by the earlier verification run {PREVIOUS_LIVE_RUN} (same day)", "",
                  f"Archived in `previous_runs/{PREVIOUS_LIVE_RUN}/` (that run's full call list: its LIVE_TANTRA_CALLS.md).", "",
                  "| UTC (reply received) | Source | Check | Method | Path | HTTP | Ledger write? |",
                  "|---|---|---|---|---|---|---|"]
        lines += [f"| {c['utc']} | {c['source']} | {c.get('check') or ''} | {c['method']} | `{c['path']}` | {c['http']} | "
                  f"{'YES' if c.get('ledger_write') else 'no'} |" for c in earlier]
    earlier_writes = sum(1 for c in earlier if c.get("ledger_write"))
    outside, notes = outside_run_calls(evidence)
    if outside:
        lines += ["", "## Calls made by hand on the same day, outside this run", "",
                  "Contract discovery before the run, and screenshots after it. Raw files: `api_samples/outside_run/`.", "",
                  "| UTC | Method | URL | HTTP | What | Record |", "|---|---|---|---|---|---|"]
        lines += [f"| {c['utc']} | {c['method']} | `{c['url']}` | {md_escape(c['http'])} | {md_escape(c['what'])} | {md_escape(c['source'])} |"
                  for c in outside]
        if notes:
            lines += ["", *notes]
    to_tantra = [c for c in outside if host and host in str(c["url"])]
    lines += ["", f"Ledger writes to TANTRA in this run: **{writes}**."
              + (f" In the earlier run {PREVIOUS_LIVE_RUN}: **{earlier_writes}** ({len(earlier)} TANTRA calls)." if earlier else "")
              + " Outside the runs, to TANTRA: "
              f"{sum(1 for c in to_tantra if c['method'] == 'GET')} read-only GET(s), "
              f"{sum(1 for c in to_tantra if '/validate/' in str(c['url']))} /validate call(s), "
              f"**{sum(1 for c in to_tantra if '/karma/ingest' in str(c['url']))}** ledger write(s); "
              f"to other services: {len(outside) - len(to_tantra)} read-only GET(s), listed above.", ""]
    return "\n".join(lines)


def code_packet(evidence: Path) -> None:
    out = evidence / "code_packet"
    out.mkdir(parents=True, exist_ok=True)
    rows = ["# Code packet", "", "Only the files that carry the core execution flow (maximum three). Each copy has LF line "
            "endings (as git stores the source), so its SHA-256 is the same on every checkout.", "",
            "| File | Why | SHA-256 |", "|---|---|---|"]
    for rel, why in CORE_FILES:
        src = REPO / rel
        data = src.read_bytes().replace(b"\r\n", b"\n")
        (out / src.name).write_bytes(data)
        rows.append(f"| `{rel}` (copy: `{src.name}`) | {why} | `{hashlib.sha256(data).hexdigest()}` |")
    (out / "CODE_PACKET.md").write_text("\n".join(rows) + "\n", encoding="utf-8")


def golden_trace(by_id, samples, evidence: Path) -> str:
    r = by_id.get("S8-01")
    if not r or not r["trace_ids"]:
        return "# Golden trace\n\nCheck S8-01 did not run.\n"
    trace = r["trace_ids"][-1]
    exchanges = samples.get("S8-01", [])
    call = next((e for e in exchanges if "/api/v1/protected/access" in e["request"]["url"]
                 and e["request"]["headers"].get("x-trace-id") == trace), None)
    audit = None
    for e in exchanges:
        if "/api/v1/audit/" in e["request"]["url"] and isinstance(e["response"]["body"], list):
            for row in e["response"]["body"]:
                try:
                    details = json.loads(row.get("details") or "{}")
                except ValueError:
                    continue
                if details.get("trace_id") == trace and str(row.get("action", "")).startswith("protected_access.decision"):
                    audit = {"audit_row": {k: row[k] for k in ("id", "action", "status", "entity_type", "entity_id", "timestamp") if k in row},
                             "canonical_event": details}
    vajra_row = None
    store = evidence / "replay_evidence" / "vajra_truthstore_rows.jsonl"
    if store.exists():
        for line in store.read_text(encoding="utf-8").splitlines():
            if line.strip() and str(json.loads(line).get("trace_id", "")).startswith(trace + "::"):
                vajra_row = json.loads(line)
    integrity = next((e["response"]["body"] for e in exchanges if "/api/tantra/chain-integrity" in e["request"]["url"]), None)
    parts = [f"# Golden trace `{trace}`", "",
             "One synthetic protected-access decision followed through every place it was recorded (check S8-01). "
             "VAJRA stores the decision under `<trace>::<decision_id>`; the audit event names that VAJRA row.", "",
             "## 1. Request and response (Cybersecurity API)", ""]
    parts.append(json_block({"request": call["request"], "response": call["response"]}) if call else "_not recorded_")
    parts += ["", "## 2. Canonical audit event (Cybersecurity audit store)", "",
              json_block(audit) if audit else "_not found_", "",
              "## 3. VAJRA TruthStore row (hash-chained)", "", json_block(vajra_row) if vajra_row else "_not found_", "",
              "## 4. VAJRA chain integrity right after the decision", "", json_block(integrity) if integrity else "_not recorded_", ""]
    return "\n".join(parts)


def cross_pillar_map(meta, by_id) -> str:
    rows = [
        ("Cybersecurity API", "BHIV-Engineering-Exchange/cybersecurity-authentication", "Rajaryan, Kaushlendra, Shivam, Hemanth",
         "/api/v1/protected/access, /api/v1/authz/check, /api/v1/access/revoke (contract 1.0.0)", meta["versions"]["cybersecurity_repo_commit"]),
        ("VAJRA relay node", "BHIV-SYSTEM/bhiv-VAJRA_Blockchain", "Prakash (VAJRA team)",
         "GET /api/vajra/authority/verify; POST /api/vajra/evidence/record (Bearer)", meta["versions"]["vajra_repo_commit"]),
        ("TANTRA validation layer", "BHIV-Engineering-Exchange/bhiv-TANTRA_Layer (service code not in repo)", "TANTRA team (name UNKNOWN)",
         "POST /validate/prana/ingress (registry prana.event.contracts v1.0.0)", "live service; version 1.0.0 per its OpenAPI"),
        ("TANTRA karma helper", "same", "TANTRA team (name UNKNOWN)", "POST /karma/ingest, POST /karma/verify", "live service; 1.0.0 per its OpenAPI"),
        ("TANTRA PRANA", "same", "TANTRA team (name UNKNOWN)", "GET /replay/{trace_id}", "live service; 1.0.0 per its OpenAPI"),
        ("Wallet incident analysis", "cybersecurity-authentication (incidents.py)", "Shivam", "POST /api/v1/incidents/analyze", "-"),
        ("Case-linking correlation", "cybersecurity-authentication (fraud-evidence-system)", "UNKNOWN", "not wired to access signals", "-"),
        ("Brahmanda / MANTRA game events", "not provided", "product owners", "not defined", "-"),
    ]
    out = ["# Cross-pillar map", "", f"From run `{meta['run_id']}`. Status per component: see the readiness board in the EOD report.", "",
           "| Component | Repository | Owner | Interface | Version |", "|---|---|---|---|---|"]
    out += [f"| {a} | {b} | {c} | {md_escape(d)} | `{e}` |" for a, b, c, d, e in rows]
    out.append("")
    return "\n".join(out)


def manifest(evidence: Path) -> str:
    lines = []
    for path in sorted(evidence.rglob("*")):
        if path.is_file() and path.name != "MANIFEST.sha256":
            lines.append(f"{hashlib.sha256(path.read_bytes()).hexdigest()}  {path.relative_to(evidence).as_posix()}")
    return "\n".join(lines) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--evidence", type=Path, default=REPO / "evidence_packet")
    parser.add_argument("--branch", default=git("rev-parse", "--abbrev-ref", "HEAD") or "unknown")
    parser.add_argument("--commit", default="", help="the delivery commit to name in the EOD report")
    args = parser.parse_args()
    evidence = args.evidence.resolve()
    global EVIDENCE_DIR
    EVIDENCE_DIR = evidence
    meta, results, by_id, samples = load(evidence)
    suites = parse_raw_suites(evidence)
    tr = evidence / "test_results"
    code_packet(evidence)
    (evidence / "replay_evidence").mkdir(parents=True, exist_ok=True)
    (evidence / "replay_evidence" / "GOLDEN_TRACE.md").write_text(golden_trace(by_id, samples, evidence), encoding="utf-8")
    maps = evidence / "architecture_and_integration_maps"
    maps.mkdir(parents=True, exist_ok=True)
    (maps / "CROSS_PILLAR_MAP.md").write_text(cross_pillar_map(meta, by_id), encoding="utf-8")
    (tr / "TEST_REPORT.md").write_text(test_report(meta, results, by_id, suites, samples), encoding="utf-8")
    (tr / "DEFECTS.md").write_text(defects_report(by_id, samples), encoding="utf-8")
    (tr / "PROOF_MATRIX.md").write_text(proof_matrix(meta, by_id, evidence, suites), encoding="utf-8")
    if meta["mode"]["tantra"] == "live":
        (tr / "LIVE_TANTRA_CALLS.md").write_text(live_tantra_calls(meta, samples, evidence), encoding="utf-8")
    packet = review_packet(meta, results, by_id, samples, args.branch)
    (evidence / "review_packet.md").write_text(packet, encoding="utf-8")
    PACKET_DIR.mkdir(parents=True, exist_ok=True)
    (PACKET_DIR / "REVIEW_PACKET.md").write_text(
        packet.replace("](test_results/", "](../../evidence_packet/test_results/"), encoding="utf-8")
    (PACKET_DIR / "EOD_REPORT.md").write_text(eod_report(meta, results, by_id, suites, args.branch, args.commit), encoding="utf-8")
    # LF line endings, so `sha256sum -c MANIFEST.sha256` works on every platform (.gitattributes keeps the bytes).
    (evidence / "MANIFEST.sha256").write_text(manifest(evidence), encoding="utf-8", newline="\n")
    print(f"reports written for run {meta['run_id']}: {counts(results)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
