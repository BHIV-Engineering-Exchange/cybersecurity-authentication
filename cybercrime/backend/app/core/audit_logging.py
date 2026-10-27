"""
Structured audit logging utilities.
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict, Optional


AUDIT_LOGGER_NAME = "audit"


def configure_logging(level: int = logging.INFO) -> None:
    logging.basicConfig(level=level, format="%(message)s")


def emit_audit_log(
    *,
    action: str,
    status: str,
    message: str,
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    user_id: Optional[int] = None,
    ip_address: Optional[str] = None,
    request_id: Optional[str] = None,
    trace_id: Optional[str] = None,
    path: Optional[str] = None,
    method: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
) -> None:
    payload: Dict[str, Any] = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "action": action,
        "status": status,
        "message": message,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "user_id": user_id,
        "ip_address": ip_address,
        "request_id": request_id,
        "trace_id": trace_id,
        "path": path,
        "method": method,
    }
    if details is not None:
        payload["details"] = details
    logger = logging.getLogger(AUDIT_LOGGER_NAME)
    logger.info(json.dumps(payload, ensure_ascii=True, separators=(",", ":")))
