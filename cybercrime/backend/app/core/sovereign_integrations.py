"""
Sovereign integration layer for BHIV Bucket and BHIV Core.

This module keeps integration at the application contract level and does not
expose internal Core/Bucket implementation details.
"""

from __future__ import annotations

import base64
import json
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional

import httpx

from app.core.audit_logging import emit_audit_log
from app.core.config import settings


@dataclass
class IntegrationResult:
    success: bool
    detail: str = ""
    upstream_status: Optional[int] = None


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _risk_to_score(risk_level: Optional[str]) -> float:
    if not risk_level:
        return 0.0
    normalized = risk_level.strip().lower()
    mapping = {
        "low": 0.25,
        "medium": 0.50,
        "high": 0.75,
        "critical": 1.0,
    }
    return mapping.get(normalized, 0.0)


def _append_buffer(path: Path, payload: Dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as fp:
        fp.write(json.dumps(payload, ensure_ascii=True))
        fp.write("\n")


def _iter_buffer(path: Path) -> list[Dict[str, Any]]:
    if not path.exists():
        return []
    items: list[Dict[str, Any]] = []
    with path.open("r", encoding="utf-8") as fp:
        for line in fp:
            line = line.strip()
            if not line:
                continue
            try:
                items.append(json.loads(line))
            except Exception:
                continue
    return items


def _rewrite_buffer(path: Path, items: list[Dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as fp:
        for item in items:
            fp.write(json.dumps(item, ensure_ascii=True))
            fp.write("\n")


def _post_json(
    url: str,
    payload: Dict[str, Any],
    timeout_seconds: float,
    headers: Optional[Dict[str, str]] = None,
    trace_id: Optional[str] = None,
    request_id: Optional[str] = None,
) -> IntegrationResult:
    """
    Executes outbound JSON POST request propagating X-Trace-Id and X-Request-Id headers (SEC-04).
    Strips credentials and session headers to prevent accidental leakage.
    """
    req_headers = dict(headers or {})
    chosen_trace_id = trace_id or req_headers.get("X-Trace-Id") or f"trace-{uuid.uuid4().hex[:16]}"
    chosen_request_id = request_id or req_headers.get("X-Request-Id") or f"req-{uuid.uuid4().hex[:12]}"
    req_headers["X-Trace-Id"] = chosen_trace_id
    req_headers["X-Request-Id"] = chosen_request_id

    # Do not forward authentication headers or other sensitive headers indiscriminately
    req_headers.pop("Authorization", None)
    req_headers.pop("authorization", None)
    req_headers.pop("Cookie", None)
    req_headers.pop("cookie", None)

    try:
        with httpx.Client(timeout=timeout_seconds, verify=settings.VALIDATE_CERTS) as client:
            response = client.post(url, json=payload, headers=req_headers)
        if 200 <= response.status_code < 300:
            return IntegrationResult(success=True, upstream_status=response.status_code)
        return IntegrationResult(
            success=False,
            detail=f"upstream returned {response.status_code}",
            upstream_status=response.status_code,
        )
    except Exception as exc:
        return IntegrationResult(success=False, detail=f"{type(exc).__name__}: {exc}")


def _publish_kafka_best_effort(payload: Dict[str, Any]) -> IntegrationResult:
    if not settings.KAFKA_BOOTSTRAP_SERVERS:
        return IntegrationResult(success=False, detail="kafka not configured")
    try:
        from kafka import KafkaProducer  # type: ignore
    except Exception:
        return IntegrationResult(success=False, detail="kafka-python not installed")

    try:
        producer = KafkaProducer(
            bootstrap_servers=settings.KAFKA_BOOTSTRAP_SERVERS.split(","),
            value_serializer=lambda v: json.dumps(v, ensure_ascii=True).encode("utf-8"),
            retries=settings.EVENT_RETRY_MAX_ATTEMPTS,
        )
        producer.send(settings.KAFKA_EVENT_TOPIC, payload).get(timeout=settings.BHIV_INTEGRATION_TIMEOUT_SECONDS)
        producer.flush(timeout=settings.BHIV_INTEGRATION_TIMEOUT_SECONDS)
        producer.close()
        return IntegrationResult(success=True, detail="published via kafka")
    except Exception as exc:
        return IntegrationResult(success=False, detail=f"kafka publish failed: {exc}")


def store_evidence_in_bucket(
    *,
    evidence_id: str,
    sha256: str,
    filename: str,
    content: bytes,
    content_type: str,
    trace_id: Optional[str] = None,
    request_id: Optional[str] = None,
) -> IntegrationResult:
    """
    Store evidence through BHIV Bucket application contract.
    If unavailable, caller should continue local flow and rely on audit + events.
    """
    if not settings.BHIV_BUCKET_EVIDENCE_URL:
        return IntegrationResult(success=False, detail="BHIV bucket URL not configured")

    payload = {
        "evidenceId": evidence_id,
        "sha256": sha256,
        "filename": filename,
        "contentType": content_type,
        "contentBase64": base64.b64encode(content).decode("ascii"),
        "timestamp": _utc_now_iso(),
        "traceId": trace_id or f"trace-{uuid.uuid4().hex[:16]}",
    }
    if settings.BHIV_BUCKET_API_KEY:
        payload["apiKey"] = settings.BHIV_BUCKET_API_KEY

    result = IntegrationResult(success=False, detail="not attempted")
    for _ in range(settings.EVENT_RETRY_MAX_ATTEMPTS):
        result = _post_json(
            settings.BHIV_BUCKET_EVIDENCE_URL,
            payload,
            timeout_seconds=settings.BHIV_INTEGRATION_TIMEOUT_SECONDS,
            trace_id=trace_id,
            request_id=request_id,
        )
        if result.success:
            break
    if result.success:
        emit_audit_log(
            action="bucket.store",
            status="success",
            message="Evidence stored in BHIV Bucket.",
            entity_type="evidence",
            entity_id=evidence_id,
            trace_id=trace_id,
            request_id=request_id,
        )
    else:
        emit_audit_log(
            action="bucket.store",
            status="warning",
            message="BHIV Bucket unavailable; continuing with local storage.",
            entity_type="evidence",
            entity_id=evidence_id,
            trace_id=trace_id,
            request_id=request_id,
            details={"error": result.detail, "status": result.upstream_status},
        )
    return result


def emit_core_event(
    *,
    action: str,
    evidence_id: str,
    case_id: Optional[str],
    risk_score: float,
    trace_id: Optional[str] = None,
    request_id: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
) -> IntegrationResult:
    """
    Emit Core-consumable governance event.
    Contract fields are stable: caseId, evidenceId, riskScore, action, traceId.
    """
    final_trace_id = trace_id or f"trace-{uuid.uuid4().hex[:16]}"
    final_request_id = request_id or f"req-{uuid.uuid4().hex[:12]}"
    event = {
        "action": action,
        "caseId": case_id,
        "evidenceId": evidence_id,
        "riskScore": risk_score,
        "timestamp": _utc_now_iso(),
        "traceId": final_trace_id,
        "metadata": metadata or {},
    }

    if not settings.BHIV_CORE_EVENT_URL:
        kafka_result = _publish_kafka_best_effort(event)
        if kafka_result.success:
            emit_audit_log(
                action="core.event.emit",
                status="success",
                message="Core event emitted via Kafka.",
                entity_type="evidence",
                entity_id=evidence_id,
                trace_id=final_trace_id,
                request_id=final_request_id,
            )
            return kafka_result
        buffer_path = Path(settings.EVENT_BUFFER_PATH)
        _append_buffer(buffer_path, event)
        emit_audit_log(
            action="core.event.buffered",
            status="warning",
            message="BHIV Core URL not configured; event buffered locally.",
            entity_type="evidence",
            entity_id=evidence_id,
            trace_id=final_trace_id,
            request_id=final_request_id,
            details={"kafka": kafka_result.detail},
        )
        return IntegrationResult(success=False, detail="BHIV core URL not configured")

    last_result = IntegrationResult(success=False, detail="not attempted")
    for attempt in range(settings.EVENT_RETRY_MAX_ATTEMPTS):
        last_result = _post_json(
            settings.BHIV_CORE_EVENT_URL,
            event,
            timeout_seconds=settings.BHIV_INTEGRATION_TIMEOUT_SECONDS,
            trace_id=final_trace_id,
            request_id=final_request_id,
        )
        if last_result.success:
            emit_audit_log(
                action="core.event.emit",
                status="success",
                message="Core event emitted.",
                entity_type="evidence",
                entity_id=evidence_id,
                trace_id=final_trace_id,
                request_id=final_request_id,
                details={"attempt": attempt + 1, "action": action},
            )
            return last_result

    # Graceful degradation: local durable buffer
    buffer_path = Path(settings.EVENT_BUFFER_PATH)
    _append_buffer(buffer_path, event)
    emit_audit_log(
        action="core.event.buffered",
        status="warning",
        message="Core event emit failed after retries; buffered locally.",
        entity_type="evidence",
        entity_id=evidence_id,
        trace_id=final_trace_id,
        request_id=final_request_id,
        details={"error": last_result.detail, "action": action},
    )
    return last_result


def flush_event_buffer(max_items: int = 100) -> Dict[str, Any]:
    """
    Attempt to flush locally buffered events to BHIV Core.
    Safe to call from health checks/admin tooling.
    """
    buffer_path = Path(settings.EVENT_BUFFER_PATH)
    buffered = _iter_buffer(buffer_path)
    if not buffered:
        return {"flushed": 0, "remaining": 0}
    if not settings.BHIV_CORE_EVENT_URL:
        return {"flushed": 0, "remaining": len(buffered), "detail": "core URL not configured"}

    keep: list[Dict[str, Any]] = []
    flushed = 0
    for item in buffered[:max_items]:
        item_trace = item.get("traceId") or item.get("trace_id")
        result = _post_json(
            settings.BHIV_CORE_EVENT_URL,
            item,
            timeout_seconds=settings.BHIV_INTEGRATION_TIMEOUT_SECONDS,
            trace_id=item_trace,
        )
        if result.success:
            flushed += 1
        else:
            keep.append(item)
    keep.extend(buffered[max_items:])
    _rewrite_buffer(buffer_path, keep)
    return {"flushed": flushed, "remaining": len(keep)}


def integration_health() -> Dict[str, Any]:
    """
    Lightweight health status for storage/bucket/core/queue signals.
    """
    storage_dir = Path(settings.EVIDENCE_STORAGE_PATH)
    buffer_path = Path(settings.EVENT_BUFFER_PATH)

    bucket_configured = bool(settings.BHIV_BUCKET_EVIDENCE_URL)
    core_configured = bool(settings.BHIV_CORE_EVENT_URL)

    return {
        "storage": {
            "path": str(storage_dir),
            "exists": storage_dir.exists(),
            "writable": storage_dir.exists() and os_access_writable(storage_dir),
        },
        "event_queue": {
            "buffer_path": str(buffer_path),
            "buffer_exists": buffer_path.exists(),
            "buffered_events": len(_iter_buffer(buffer_path)),
            "kafka_configured": bool(settings.KAFKA_BOOTSTRAP_SERVERS),
            "kafka_topic": settings.KAFKA_EVENT_TOPIC,
        },
        "bucket": {"configured": bucket_configured},
        "core": {"configured": core_configured},
    }


def os_access_writable(path: Path) -> bool:
    try:
        test_file = path / ".write_test.tmp"
        test_file.write_text("ok", encoding="utf-8")
        test_file.unlink(missing_ok=True)
        return True
    except Exception:
        return False

