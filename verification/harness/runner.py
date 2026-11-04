"""Check registry, recording HTTP clients and result model.

Statuses (never upgraded by hand):
  PASS     every expectation held
  FAIL     at least one expectation did not hold (the actual value is recorded)
  ERROR    the check crashed (traceback recorded); counts as not passed
  BLOCKED  a dependency owned by someone else is missing; nothing was asserted
  SKIPPED  deliberately not run in this mode (reason recorded); counts as not passed
"""

from __future__ import annotations

import json
import time
import traceback
import uuid
from dataclasses import asdict, dataclass, field
from typing import Any, Callable, Dict, List, Optional

import httpx

from .redact import Redactor


class Blocked(Exception):
    """Raised when a check cannot run because another owner's component is missing."""


class Skipped(Exception):
    """Raised when a check is deliberately not run in the current mode."""


@dataclass
class Expectation:
    what: str
    expected: Any
    actual: Any
    ok: bool


@dataclass
class CheckResult:
    id: str
    title: str
    scenario: str
    refs: List[str]
    systems: List[str]
    evidence_level: str
    status: str = "NOT_RUN"
    expectations: List[Expectation] = field(default_factory=list)
    trace_ids: List[str] = field(default_factory=list)
    notes: List[str] = field(default_factory=list)
    defects: List[str] = field(default_factory=list)
    started_utc: str = ""
    duration_ms: int = 0


@dataclass
class CheckSpec:
    id: str
    title: str
    scenario: str
    refs: List[str]
    systems: List[str]
    evidence_level: str
    fn: Callable[["Context"], None]


REGISTRY: List[CheckSpec] = []


def check(*, id: str, title: str, scenario: str, refs: List[str], systems: List[str], evidence_level: str):
    def decorator(fn: Callable[["Context"], None]):
        REGISTRY.append(CheckSpec(id, title, scenario, refs, systems, evidence_level, fn))
        return fn
    return decorator


def utc_now() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


class Recorder:
    """Captures every HTTP exchange (redacted), tagged with the running check id."""

    def __init__(self, redactor: Redactor) -> None:
        self.redactor = redactor
        self.current_check = "setup"
        self.exchanges: List[Dict[str, Any]] = []

    def client(self, base_url: str, system: str) -> httpx.Client:
        def on_request(request: httpx.Request) -> None:
            request.extensions["harness_started"] = time.monotonic()
            try:
                request.read()  # buffer streamed bodies (multipart uploads) so they can be recorded
            except Exception:
                pass

        def on_response(response: httpx.Response) -> None:
            response.read()
            request = response.request
            started = request.extensions.get("harness_started", time.monotonic())
            self.exchanges.append(self._entry(system, request, response, started))

        return httpx.Client(base_url=base_url, timeout=30.0,
                            event_hooks={"request": [on_request], "response": [on_response]})

    def _entry(self, system: str, request: httpx.Request, response: httpx.Response, started: float) -> Dict[str, Any]:
        def body_of(content: bytes, content_type: str) -> Any:
            if not content:
                return None
            text = content.decode("utf-8", errors="replace")
            if "json" in content_type:
                try:
                    return json.loads(text)
                except ValueError:
                    return text
            if "x-www-form-urlencoded" in content_type:
                return {k: v for k, v in (pair.split("=", 1) if "=" in pair else (pair, "") for pair in text.split("&"))}
            return text[:2000]

        keep_req = ("x-trace-id", "x-request-id", "traceparent", "authorization", "content-type")
        keep_resp = ("x-trace-id", "x-request-id", "content-type")
        entry = {
            "check_id": self.current_check,
            "system": system,
            "utc": utc_now(),
            "elapsed_ms": int((time.monotonic() - started) * 1000),
            "request": {
                "method": request.method,
                "url": str(request.url),
                "headers": {k: v for k, v in request.headers.items() if k.lower() in keep_req},
                "body": _request_body(request, body_of),
            },
            "response": {
                "status": response.status_code,
                "headers": {k: v for k, v in response.headers.items() if k.lower() in keep_resp},
                "body": body_of(response.content, response.headers.get("content-type", "")),
            },
        }
        return self.redactor.obj(entry)

    def for_check(self, check_id: str) -> List[Dict[str, Any]]:
        return [e for e in self.exchanges if e["check_id"] == check_id]


def _request_body(request: httpx.Request, body_of) -> Any:
    content_type = request.headers.get("content-type", "")
    if "multipart/form-data" in content_type:
        return "<multipart upload: synthetic file, body not recorded>"
    try:
        return body_of(request.content, content_type)
    except httpx.RequestNotRead:
        return "<streamed body not recorded>"


class Context:
    """Everything a check needs. Filled in by run_verification.py."""

    def __init__(self, recorder: Recorder) -> None:
        self.recorder = recorder
        self.result: Optional[CheckResult] = None
        self.data: Dict[str, Any] = {}

    def new_trace(self, prefix: str = "") -> str:
        trace = prefix + str(uuid.uuid4())
        if self.result is not None:
            self.result.trace_ids.append(trace)
        return trace

    def set_level(self, evidence_level: str, systems: Optional[List[str]] = None) -> None:
        """Record what this run actually exercised (the decorator value is only the default)."""
        assert self.result is not None
        self.result.evidence_level = evidence_level
        if systems is not None:
            self.result.systems = systems

    def expect(self, what: str, expected: Any, actual: Any, ok: Optional[bool] = None) -> bool:
        passed = (expected == actual) if ok is None else bool(ok)
        assert self.result is not None
        self.result.expectations.append(Expectation(what, expected, actual, passed))
        return passed

    def require(self, what: str, expected: Any, actual: Any, ok: Optional[bool] = None) -> None:
        """Like expect, but a failure stops the check (later steps would be meaningless)."""
        if not self.expect(what, expected, actual, ok):
            raise _StopCheck(what)

    def note(self, text: str) -> None:
        assert self.result is not None
        self.result.notes.append(text)

    def defect(self, defect_id: str) -> None:
        assert self.result is not None
        if defect_id not in self.result.defects:
            self.result.defects.append(defect_id)


class _StopCheck(Exception):
    pass


def run_checks(ctx: Context, specs: List[CheckSpec], only: Optional[List[str]] = None) -> List[CheckResult]:
    results: List[CheckResult] = []
    for spec in specs:
        if only and spec.id not in only:
            continue
        result = CheckResult(spec.id, spec.title, spec.scenario, spec.refs, spec.systems, spec.evidence_level,
                             started_utc=utc_now())
        ctx.result = result
        ctx.recorder.current_check = spec.id
        started = time.monotonic()
        try:
            spec.fn(ctx)
            result.status = "PASS" if result.expectations and all(e.ok for e in result.expectations) else (
                "FAIL" if result.expectations else "ERROR")
            if not result.expectations:
                result.notes.append("check asserted nothing; reported as ERROR, not PASS")
        except _StopCheck as stop:
            result.status = "FAIL"
            result.notes.append(f"stopped after failed precondition: {stop}")
        except Blocked as blocked:
            result.status = "BLOCKED"
            result.evidence_level = "BLOCKED-EXTERNAL (nothing executed)"
            result.notes.append(str(blocked))
        except Skipped as skipped:
            result.status = "SKIPPED"
            result.evidence_level = "NOT RUN (skipped in this mode)"
            result.notes.append(str(skipped))
        except Exception:  # crash in the check or the system under test
            result.status = "ERROR"
            result.notes.append(traceback.format_exc(limit=6))
        result.duration_ms = int((time.monotonic() - started) * 1000)
        results.append(result)
        print(f"[{result.status:7}] {spec.id} {spec.title}", flush=True)
    ctx.recorder.current_check = "teardown"
    return results


def results_as_dicts(results: List[CheckResult]) -> List[Dict[str, Any]]:
    return [asdict(r) for r in results]
