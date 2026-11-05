"""
BHIV runtime bridge: TANTRA layer and VAJRA trust node, at application-contract level.

Contracts used (taken from the owners' repositories and live OpenAPI documents, 2026-11-04):

TANTRA (bhiv-TANTRA_Layer)
  POST {TANTRA_VALIDATION_URL}/validate/prana/ingress   contract gate; 422 when the event type
                                                         is not registered in the TANTRA registry
  POST {TANTRA_KARMA_URL}/karma/ingest                   append-only integrity log (forwards to PRANA)
  POST {TANTRA_KARMA_URL}/karma/verify?event_id=...      replay check: recomputed hash vs stored hash
  GET  {TANTRA_PRANA_URL}/replay/{trace_id}              read-only replay lookup

VAJRA (bhiv-VAJRA_Blockchain relay node, HTTP API port)
  GET  {VAJRA_API_URL}/api/vajra/authority/verify?subject=...   authority state, and since VAJRA commit 3cc883f the
                                                                 granted scope and issuing authority (no auth)
  POST {VAJRA_API_URL}/api/vajra/evidence/record                evidence (Authorization: Bearer)

Scope of this slice
  * Cybersecurity READS VAJRA authority state and SUBMITS evidence. This slice deliberately does not
    call /api/vajra/authority/transition. (VAJRA's integration package assigns opt-out revocation via
    that route to "Kaushlendra / User UX"; who calls it is a team decision, not made here.)
  * Credential: VAJRA_CYBER_SECRET (VAJRA's evidence-only tier) is preferred. VAJRA_TANTRA_SECRET is VAJRA's
    governance token (it also authorizes authority transitions); it is used only when the evidence-only token is
    not configured, and runtime_health() then reports a warning. Re-check of 3cc883f on 05 Nov 2026: VAJRA's
    evidence/record handler still accepts only VAJRA_TANTRA_SECRET, so the evidence-only token is answered 401
    there (VAJ-10); the evidence write then fails and the decision fails closed.
  * TANTRA's contract gate is respected: an event TANTRA rejects is never written to the
    TANTRA ledger by another route (same order as TANTRA's own e2e test: validate, ingest, verify).

Honesty
  * Every call returns an explicit status. Nothing is reported as recorded unless the receiving
    service said so. VAJRA rehearsal writes (trace ids starting with "test_probe_") are reported
    as SIMULATED, never as RECORDED.
  * The VAJRA bearer secret is sent only in the Authorization header. Failure details returned to
    callers carry only the exception class name, so the secret cannot be echoed back.
"""

from __future__ import annotations

import hashlib
import json
import uuid
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import httpx

from app.core.audit_logging import emit_audit_log
from app.core.config import settings

# Statuses that count as "evidence exists at the sink".
EVIDENCE_OK_STATUSES = {"RECORDED"}


@dataclass
class SinkResult:
    """Outcome of one call to an external runtime."""

    status: str
    http_status: Optional[int] = None
    detail: str = ""
    data: Dict[str, Any] = field(default_factory=dict)

    def as_dict(self) -> Dict[str, Any]:
        out = asdict(self)
        if not out["data"]:
            out.pop("data")
        return out


def _now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"


def _timeout() -> float:
    return float(settings.BHIV_RUNTIME_TIMEOUT_SECONDS)


def subject_reference(subject: str) -> str:
    """Pseudonymous reference for a VAJRA subject, so raw identifiers are not copied into TANTRA."""
    return "subj_sha256_" + hashlib.sha256(subject.encode("utf-8")).hexdigest()[:16]


def traceparent_for(trace_id: str) -> Optional[str]:
    """Build a W3C traceparent header when the trace id is a UUID (32 hex digits)."""
    try:
        trace_hex = uuid.UUID(str(trace_id)).hex
    except (ValueError, AttributeError, TypeError):
        return None
    span_hex = uuid.uuid4().hex[:16]
    return f"00-{trace_hex}-{span_hex}-01"


def _trace_headers(trace_id: str, request_id: Optional[str]) -> Dict[str, str]:
    headers = {"X-Trace-Id": trace_id, "X-Request-Id": request_id or f"req-{uuid.uuid4().hex[:12]}"}
    tp = traceparent_for(trace_id)
    if tp:
        headers["traceparent"] = tp
    return headers


def _exc_detail(exc: Exception) -> str:
    """Only the exception class: messages can contain request headers (and so the bearer token)."""
    return type(exc).__name__


def _secret_usable(secret: Optional[str]) -> bool:
    """A bearer token must be printable ASCII without whitespace or control characters."""
    return bool(secret) and all(33 <= ord(ch) <= 126 for ch in secret)


def _redact(text: str) -> str:
    import re
    return re.sub(r"(?i)(bearer\s+)[A-Za-z0-9._~+/=-]{8,}", r"\1[REDACTED]", text or "")


def _json_or_text(response: httpx.Response) -> Any:
    try:
        return response.json()
    except Exception:
        return {"raw": response.text[:500]}


def _client() -> httpx.Client:
    return httpx.Client(timeout=_timeout(), verify=settings.VALIDATE_CERTS)


# --------------------------------------------------------------------------------------------
# VAJRA
# --------------------------------------------------------------------------------------------

def vajra_verify_authority(subject: str, *, trace_id: str, request_id: Optional[str] = None) -> SinkResult:
    """Read the VAJRA authority state for a subject. Never changes VAJRA state."""
    if not settings.VAJRA_API_URL:
        return SinkResult(status="NOT_CONFIGURED", detail="VAJRA_API_URL is not set")
    url = settings.VAJRA_API_URL.rstrip("/") + "/api/vajra/authority/verify"
    try:
        with _client() as client:
            response = client.get(url, params={"subject": subject}, headers=_trace_headers(trace_id, request_id))
    except Exception as exc:  # network failure, DNS, timeout
        return SinkResult(status="UNAVAILABLE", detail=_exc_detail(exc))
    body = _json_or_text(response)
    if response.status_code != 200 or not isinstance(body, dict) or "is_authorized" not in body:
        return SinkResult(status="ERROR", http_status=response.status_code, detail="unexpected VAJRA verify response")
    scope = body.get("scope")
    # Strict: only a list of strings counts as a reported scope. Missing or malformed -> None, which the
    # protected-access decision treats as "scope cannot be checked" (deny).
    if not (isinstance(scope, list) and all(isinstance(item, str) for item in scope)):
        scope = None
    authority = body.get("authority")
    return SinkResult(
        status="OK",
        http_status=200,
        data={
            "is_authorized": body.get("is_authorized") is True,  # strict: the string "false" or 1 is not True
            "current_state": body.get("current_state") or "",
            "verified_at": body.get("verified_at"),
            "scope": scope,
            "authority": authority if isinstance(authority, str) else None,
        },
    )


def vajra_write_credential() -> Dict[str, Any]:
    """Which VAJRA bearer token evidence writes use: the evidence-only one when configured, else the legacy one."""
    if settings.VAJRA_CYBER_SECRET:
        return {"kind": "cyber_evidence_only", "setting": "VAJRA_CYBER_SECRET", "token": settings.VAJRA_CYBER_SECRET}
    if settings.VAJRA_TANTRA_SECRET:
        return {"kind": "tantra_governance", "setting": "VAJRA_TANTRA_SECRET", "token": settings.VAJRA_TANTRA_SECRET}
    return {"kind": "none", "setting": None, "token": None}


def vajra_record_evidence(
    *,
    trace_id: str,
    action_taken: str,
    threat_type: str,
    severity: str,
    actor: str,
    details: str,
    evidence_sha256_hex: str,
    metadata: Optional[Dict[str, Any]] = None,
    request_id: Optional[str] = None,
) -> SinkResult:
    """Submit an evidence record to VAJRA (POST /api/vajra/evidence/record)."""
    if not settings.VAJRA_API_URL:
        return SinkResult(status="NOT_CONFIGURED", detail="VAJRA_API_URL is not set")
    credential = vajra_write_credential()
    if credential["kind"] == "none":
        # VAJRA's write routes fail closed without a bearer token; do not send a request that must fail.
        return SinkResult(status="NOT_CONFIGURED", detail="neither VAJRA_CYBER_SECRET nor VAJRA_TANTRA_SECRET is set")
    if not _secret_usable(credential["token"]):
        return SinkResult(status="NOT_CONFIGURED", detail=f"{credential['setting']} contains invalid characters")
    url = settings.VAJRA_API_URL.rstrip("/") + "/api/vajra/evidence/record"
    payload = {
        "trace_id": trace_id,
        "source": "CYBERSECURITY_AUTHENTICATION",
        "threat_type": threat_type,
        "severity": severity,
        "action_taken": action_taken,
        "actor": actor,
        "details": details,
        "evidence_hex": evidence_sha256_hex,
        "metadata": metadata or {},
    }
    headers = _trace_headers(trace_id, request_id)
    headers["Authorization"] = f"Bearer {credential['token']}"
    kind = credential["kind"]
    try:
        with _client() as client:
            response = client.post(url, json=payload, headers=headers)
    except Exception as exc:
        return SinkResult(status="UNAVAILABLE", detail=_exc_detail(exc), data={"credential": kind})
    body = _json_or_text(response)
    code = response.status_code
    if code == 200 and isinstance(body, dict) and body.get("success"):
        if body.get("simulated") or body.get("stored") is False:
            return SinkResult(status="SIMULATED", http_status=code, detail="VAJRA rehearsal: nothing stored",
                              data={"evidence_hash": body.get("evidence_hash"), "credential": kind})
        return SinkResult(status="RECORDED", http_status=code,
                          data={"evidence_hash": body.get("evidence_hash"), "stored_in": body.get("stored_in"),
                                "recorded_at": body.get("recorded_at"), "credential": kind})
    if code == 409:
        return SinkResult(status="DUPLICATE_TRACE", http_status=code,
                          detail="VAJRA keeps one evidence record per trace_id; this record was not stored",
                          data={"existing_hash": (body or {}).get("existing_hash") if isinstance(body, dict) else None,
                                "credential": kind})
    if code in (401, 403):
        return SinkResult(status="UNAUTHORIZED", http_status=code,
                          detail=f"VAJRA refused the {credential['setting']} bearer token on evidence/record",
                          data={"credential": kind})
    if code == 400:
        return SinkResult(status="REJECTED", http_status=code, detail=str((body or {}).get("error") if isinstance(body, dict) else body))
    if code >= 500:
        return SinkResult(status="UNAVAILABLE", http_status=code, detail=str((body or {}).get("error") if isinstance(body, dict) else body))
    return SinkResult(status="ERROR", http_status=code, detail="unexpected VAJRA evidence response")


# --------------------------------------------------------------------------------------------
# TANTRA
# --------------------------------------------------------------------------------------------

def build_tantra_envelope(
    *,
    event_type: str,
    submission_id: str,
    payload: Dict[str, Any],
    timestamp: Optional[str] = None,
) -> Dict[str, Any]:
    """Envelope for the TANTRA validation layer (registry reference + ingest fields)."""
    return {
        "registry_reference": {
            "registry": settings.TANTRA_REGISTRY,
            "event_type": event_type,
            "version": settings.TANTRA_CONTRACT_VERSION,
        },
        "submission_id": f"{settings.TANTRA_SUBMISSION_PREFIX}{submission_id}",
        "event_type": event_type,
        "timestamp": timestamp or _now_iso(),
        "payload": payload,
        "source_system": settings.TANTRA_SOURCE_SYSTEM,
    }


def tantra_validate(envelope: Dict[str, Any], *, trace_id: str, request_id: Optional[str] = None) -> SinkResult:
    """Ask the TANTRA validation layer whether the envelope satisfies a registered contract."""
    if not settings.TANTRA_VALIDATION_URL:
        return SinkResult(status="NOT_CONFIGURED", detail="TANTRA_VALIDATION_URL is not set")
    url = settings.TANTRA_VALIDATION_URL.rstrip("/") + "/validate/prana/ingress"
    try:
        with _client() as client:
            response = client.post(url, json=envelope, headers=_trace_headers(trace_id, request_id))
    except Exception as exc:
        return SinkResult(status="UNAVAILABLE", detail=_exc_detail(exc))
    body = _json_or_text(response)
    if response.status_code == 200 and isinstance(body, dict) and body.get("status") == "valid":
        return SinkResult(status="VALIDATED", http_status=200, data={"envelope": body.get("envelope") or envelope})
    if response.status_code in (400, 422) and isinstance(body, dict):
        data: Dict[str, Any] = {"reason": body.get("reason"), "message": body.get("message")}
        registered = (body.get("details") or {}).get("registered_event_types") if isinstance(body.get("details"), dict) else None
        if registered:
            data["registered_event_types"] = registered
        return SinkResult(status="CONTRACT_REJECTED", http_status=response.status_code,
                          detail=str(body.get("reason") or "rejected"), data=data)
    if response.status_code >= 500:
        return SinkResult(status="UNAVAILABLE", http_status=response.status_code, detail="TANTRA validation layer error")
    return SinkResult(status="ERROR", http_status=response.status_code, detail="unexpected TANTRA validation response")


def tantra_ingest_and_verify(envelope: Dict[str, Any], *, trace_id: str, request_id: Optional[str] = None) -> SinkResult:
    """Write a VALIDATED envelope to the TANTRA karma log, then ask TANTRA to replay-verify it."""
    if not settings.TANTRA_KARMA_URL:
        return SinkResult(status="NOT_CONFIGURED", detail="TANTRA_KARMA_URL is not set")
    base = settings.TANTRA_KARMA_URL.rstrip("/")
    headers = _trace_headers(trace_id, request_id)
    try:
        with _client() as client:
            ingest = client.post(base + "/karma/ingest", json=envelope, headers=headers)
            ingest_body = _json_or_text(ingest)
            if ingest.status_code != 200 or not isinstance(ingest_body, dict) or ingest_body.get("status") != "success":
                status = "UNAVAILABLE" if ingest.status_code >= 500 else "REJECTED"
                return SinkResult(status=status, http_status=ingest.status_code, detail="TANTRA karma ingest failed",
                                  data={"response": ingest_body})
            event_id = ingest_body.get("event_id")
            verify = client.post(base + "/karma/verify", params={"event_id": event_id}, headers=headers)
            verify_body = _json_or_text(verify)
    except Exception as exc:
        return SinkResult(status="UNAVAILABLE", detail=_exc_detail(exc))
    replay_status = verify_body.get("status") if isinstance(verify_body, dict) else None
    return SinkResult(
        status="RECORDED" if replay_status == "MATCH" else "RECORDED_UNVERIFIED",
        http_status=200,
        data={
            "karma_event_id": event_id,
            "payload_hash": ingest_body.get("payload_hash"),
            "prana_forward": (ingest_body.get("prana") or {}).get("status") if isinstance(ingest_body.get("prana"), dict) else None,
            "replay_status": replay_status or "UNVERIFIED",
            "replay_http_status": verify.status_code,
        },
    )


def tantra_submit(envelope: Dict[str, Any], *, trace_id: str, request_id: Optional[str] = None) -> SinkResult:
    """Validate first; only a validated envelope is written to the TANTRA ledger (no bypass)."""
    validation = tantra_validate(envelope, trace_id=trace_id, request_id=request_id)
    if validation.status != "VALIDATED":
        return validation
    validated = validation.data.get("envelope") or envelope
    return tantra_ingest_and_verify(validated, trace_id=trace_id, request_id=request_id)


def tantra_replay_lookup(trace_id: str) -> SinkResult:
    """Read-only lookup of a trace in PRANA's replay store."""
    if not settings.TANTRA_PRANA_URL:
        return SinkResult(status="NOT_CONFIGURED", detail="TANTRA_PRANA_URL is not set")
    url = settings.TANTRA_PRANA_URL.rstrip("/") + f"/replay/{trace_id}"
    try:
        with _client() as client:
            response = client.get(url, params={"include_payload": "false"})
    except Exception as exc:
        return SinkResult(status="UNAVAILABLE", detail=_exc_detail(exc))
    body = _json_or_text(response)
    if response.status_code == 200:
        return SinkResult(status="FOUND", http_status=200, data={"record": body})
    if response.status_code == 404:
        return SinkResult(status="NOT_FOUND", http_status=404)
    return SinkResult(status="ERROR", http_status=response.status_code)


# --------------------------------------------------------------------------------------------
# Health
# --------------------------------------------------------------------------------------------

def _probe(url: Optional[str], path: str) -> Dict[str, Any]:
    if not url:
        return {"configured": False}
    try:
        with httpx.Client(timeout=min(_timeout(), 3.0), verify=settings.VALIDATE_CERTS) as client:
            response = client.get(url.rstrip("/") + path)
        return {"configured": True, "reachable": True, "http_status": response.status_code,
                "healthy": response.status_code == 200}
    except Exception as exc:
        return {"configured": True, "reachable": False, "error": _exc_detail(exc)}


_HEALTH_CACHE: Dict[str, Any] = {"at": 0.0, "value": None}


def runtime_health() -> Dict[str, Any]:
    """Reachability of the configured BHIV runtimes (GET health endpoints only), cached BHIV_HEALTH_CACHE_SECONDS."""
    import time
    now = time.monotonic()
    if _HEALTH_CACHE["value"] is not None and now - _HEALTH_CACHE["at"] < float(settings.BHIV_HEALTH_CACHE_SECONDS):
        return _HEALTH_CACHE["value"]
    value = _runtime_health_uncached()
    _HEALTH_CACHE.update(at=now, value=value)
    return value


def _runtime_health_uncached() -> Dict[str, Any]:
    return {
        "tantra": {
            "validation": _probe(settings.TANTRA_VALIDATION_URL, "/health"),
            "karma": _probe(settings.TANTRA_KARMA_URL, "/health"),
            "prana": _probe(settings.TANTRA_PRANA_URL, "/health"),
            "event_type": settings.TANTRA_EVENT_TYPE,
        },
        "vajra": _vajra_health(),
    }


def _vajra_health() -> Dict[str, Any]:
    kind = vajra_write_credential()["kind"]
    warnings = []
    if kind == "tantra_governance":
        warnings.append("Evidence writes use VAJRA_TANTRA_SECRET, VAJRA's governance token (it also authorizes authority "
                        "transitions). Configure the evidence-only VAJRA_CYBER_SECRET instead.")
    if settings.VAJRA_CYBER_SECRET and settings.VAJRA_TANTRA_SECRET:
        warnings.append("VAJRA_TANTRA_SECRET is set but not used (VAJRA_CYBER_SECRET takes precedence); remove it.")
    return {
        "api": _probe(settings.VAJRA_API_URL, "/api/health"),
        "write_token_configured": kind != "none",
        "write_credential": kind,
        "warnings": warnings,
    }


def log_sink_outcome(sink: str, result: SinkResult, *, trace_id: str, request_id: Optional[str]) -> None:
    """Structured log line for every external evidence attempt (observability)."""
    emit_audit_log(
        action=f"bhiv_runtime.{sink}",
        status="success" if result.status in EVIDENCE_OK_STATUSES or result.status == "OK" else "warning",
        message=f"{sink}: {result.status}",
        trace_id=trace_id,
        request_id=request_id,
        details={"status": result.status, "http_status": result.http_status, "detail": _redact(result.detail)[:200]},
    )


def evidence_gaps(results: Dict[str, SinkResult]) -> List[str]:
    """Names of evidence sinks that did not confirm a stored record."""
    return [name for name, res in results.items() if res.status not in EVIDENCE_OK_STATUSES]


def canonical_event_sha256(event_json: str) -> str:
    return hashlib.sha256(event_json.encode("utf-8")).hexdigest()


def compact_json(data: Any) -> str:
    return json.dumps(data, sort_keys=True, separators=(",", ":"), ensure_ascii=True)
