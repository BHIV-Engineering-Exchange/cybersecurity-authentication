"""
Standardized error response helpers conforming to Phase 2 Canonical Error Contract.
"""

from datetime import datetime, timezone
from typing import Any, Dict, Optional


def build_error_response(
    *,
    code: str,
    message: str,
    request_id: Optional[str] = None,
    trace_id: Optional[str] = None,
    status_code: Optional[int] = None,
    details: Optional[Any] = None,
) -> Dict[str, Any]:
    """
    Builds a canonical error payload with correlation trace_id and ISO-8601 timestamp.
    """
    now_utc = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"
    clean_code = code.upper()

    payload: Dict[str, Any] = {
        "error": True,
        "code": clean_code,
        "status_code": status_code or 400,
        "message": message,
        "trace_id": trace_id,
        "request_id": request_id,
        "timestamp": now_utc,
        "details": details if details is not None else [],
    }
    return payload
