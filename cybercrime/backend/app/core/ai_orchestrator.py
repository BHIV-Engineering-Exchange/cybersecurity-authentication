"""
Integration client for an external AI orchestrator service
(for example, the Primary_Bucket_Owner multi‑agent platform).

This module is intentionally generic: it calls a configurable HTTP endpoint
with a JSON payload and expects back a JSON response. The exact behavior
of the orchestrator is defined on that side.
"""

from typing import Any, Dict, Optional

import httpx

from app.core.config import settings
from app.core.audit_logging import emit_audit_log


def call_incident_orchestrator(payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Call the external AI orchestrator for incident / wallet analysis.

    Configuration (in .env or environment):
      - AI_ORCHESTRATOR_INCIDENT_URL: full URL for the incident-analysis basket
      - AI_ORCHESTRATOR_API_KEY: optional auth token (sent as Bearer Authorization)

    Expected (recommended) response fields on success:
      - system_conclusion: str         # main AI conclusion text
      - risk_score: float (0‑1)       # optional, overrides local risk score
      - risk_level: str               # optional, overrides local risk level
      - detected_patterns: list[str]  # optional, additional patterns

    If anything fails, this returns None so callers can fall back
    to the existing OpenRouter/template logic.
    """
    url = settings.AI_ORCHESTRATOR_INCIDENT_URL
    if not url:
        # Orchestrator not configured; skip integration.
        return None

    headers: Dict[str, str] = {
        "Content-Type": "application/json",
    }
    if settings.AI_ORCHESTRATOR_API_KEY:
        headers["Authorization"] = f"Bearer {settings.AI_ORCHESTRATOR_API_KEY}"

    try:
        emit_audit_log(
            action="ai_orchestrator.call",
            status="success",
            message="Calling incident orchestrator.",
            details={"url": url},
        )
        with httpx.Client(timeout=30.0, verify=settings.VALIDATE_CERTS) as client:
            response = client.post(url, headers=headers, json=payload)

        if not (200 <= response.status_code < 300):
            emit_audit_log(
                action="ai_orchestrator.call",
                status="warning",
                message="Incident orchestrator returned non-success status.",
                details={"status_code": response.status_code, "body": response.text},
            )
            return None

        data = response.json()
        emit_audit_log(
            action="ai_orchestrator.call",
            status="success",
            message="Received response from orchestrator.",
        )
        return data

    except Exception as exc:
        emit_audit_log(
            action="ai_orchestrator.call",
            status="error",
            message="Error calling orchestrator.",
            details={"error": str(exc)},
        )
        return None

