"""
Rule-based detection and correlation of authentication attacks (10-day proof C: signal -> detect -> correlate).

Lanes: threat assessment (Shivam) and correlation (Aryan Dias). Added by Hemanth at the team's request; the lane
owners review it.

Input:  canonical `auth.login` DENIED events in the audit store, one per failed login (written by auth.py).
Rule:   auth.repeated_failed_login v1.0.0 - at least THRESHOLD failed logins for one account within WINDOW.
Output: one open SecurityIncident per account and window (the correlation), updated as more attempts arrive, and one
        `threat.detected` canonical event when the incident opens.

Limits, stated in every incident's `uncertainty`:
- a rule-based count, not a trained model; the confidence is a fixed function of the count, not a calibrated
  probability;
- it cannot tell an attacker from a user who forgot the password;
- no IP reputation or geolocation data is used.

The detector never blocks, deactivates or contains anything. Containment needs governance approval and VAJRA
(proof C: govern -> contain). Concurrent failures for the same account can, rarely, open two incidents; both list
their evidence.
"""

from __future__ import annotations

import json
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional

from app.core.canonical_event import emit_canonical_event
from app.db.models import AuditLog, SecurityIncident

RULE_ID = "auth.repeated_failed_login"
RULE_VERSION = "1.0.0"
WINDOW = timedelta(minutes=10)
THRESHOLD = 5
FAILED_LOGIN_ACTION = "auth.login:login"  # audit_logs.action of a canonical auth.login event (see canonical_event.py)


def failed_login_events(db, account_ref: str, since: datetime) -> List[Dict[str, Optional[str]]]:
    """Failed-login canonical events for one account since `since`, oldest first."""
    rows = (
        db.query(AuditLog)
        .filter(AuditLog.action == FAILED_LOGIN_ACTION, AuditLog.status == "denied",
                AuditLog.entity_type == "user", AuditLog.entity_id == account_ref, AuditLog.timestamp >= since)
        .order_by(AuditLog.id)
        .all()
    )
    events = []
    for row in rows:
        try:
            event = json.loads(row.details or "{}")
        except ValueError:
            continue
        if event.get("event_id"):
            events.append({"event_id": event["event_id"], "trace_id": event.get("trace_id"),
                           "client_ip": (event.get("metadata") or {}).get("client_ip")})
    return events


def assess(events: List[Dict[str, Optional[str]]]) -> Dict[str, object]:
    """The rule's assessment of a set of failed logins for one account (assumes len(events) >= THRESHOLD)."""
    count = len(events)
    sources = {e["client_ip"] for e in events if e.get("client_ip")}
    minutes = int(WINDOW.total_seconds() // 60)
    return {
        "threat_type": "credential_attack_suspected",
        "severity": "high" if count >= 2 * THRESHOLD else "medium",
        "confidence": round(min(0.9, 0.6 + 0.05 * (count - THRESHOLD)), 2),
        "uncertainty": [
            f"Rule-based count ({count} failed logins within {minutes} minutes); not a trained model, and the "
            "confidence is a fixed function of the count, not a calibrated probability.",
            "Cannot tell an attacker from a user who forgot the password.",
            f"{len(sources)} distinct source address(es) seen; no IP reputation or geolocation data is used.",
        ],
        "rationale": f"{count} failed logins for one account within {minutes} minutes "
                     f"(rule {RULE_ID} {RULE_VERSION}: threshold {THRESHOLD}).",
    }


def detect_and_correlate_failed_logins(db, *, account_ref: str, trace_id: str, request_id: Optional[str] = None,
                                       now: Optional[datetime] = None) -> Optional[SecurityIncident]:
    """Run the rule for one account; open or update the correlated incident. Returns it, or None below threshold."""
    now = now or datetime.utcnow()
    events = failed_login_events(db, account_ref, now - WINDOW)
    if len(events) < THRESHOLD:
        return None
    result = assess(events)
    key = f"{RULE_ID}:{account_ref}"
    incident = (
        db.query(SecurityIncident)
        .filter(SecurityIncident.correlation_key == key, SecurityIncident.status == "open",
                SecurityIncident.last_seen_at >= now - WINDOW)
        .order_by(SecurityIncident.id.desc())
        .first()
    )
    opened = incident is None
    if opened:
        incident = SecurityIncident(
            incident_id=str(uuid.uuid4()), correlation_key=key, rule_id=RULE_ID, rule_version=RULE_VERSION,
            threat_type=str(result["threat_type"]), target_ref=account_ref, status="open", requires_human_review=True,
            first_seen_at=now, created_at=now, evidence_event_ids="[]", trace_ids="[]",
            severity=str(result["severity"]), confidence=float(result["confidence"]), uncertainty="[]",
        )
        db.add(incident)
    evidence = json.loads(incident.evidence_event_ids or "[]")
    traces = json.loads(incident.trace_ids or "[]")
    for event in events:
        if event["event_id"] not in evidence:
            evidence.append(event["event_id"])
        if event.get("trace_id") and event["trace_id"] not in traces:
            traces.append(event["trace_id"])
    incident.evidence_event_ids = json.dumps(evidence)
    incident.trace_ids = json.dumps(traces)
    incident.event_count = len(evidence)
    incident.severity = str(result["severity"])
    incident.confidence = float(result["confidence"])
    incident.uncertainty = json.dumps(result["uncertainty"])
    incident.rationale = str(result["rationale"])
    incident.last_seen_at = now
    incident.updated_at = now
    db.commit()
    db.refresh(incident)

    if opened:
        emit_canonical_event(
            event_type="threat.detected", action="escalate",
            actor_id="cybersecurity.threat_detection", actor_type="system", role="service_agent",
            authenticated=True, auth_method=None,
            resource_type="user", resource_id=account_ref,
            outcome_status="WARNING", reason_code="THREAT_DETECTED",
            message=f"Incident opened for human review: {result['rationale']}",
            trace_id=trace_id, request_id=request_id, rule_name=f"{RULE_ID}@{RULE_VERSION}",
            metadata={"incident_id": incident.incident_id, "rule_id": RULE_ID, "rule_version": RULE_VERSION,
                      "severity": incident.severity, "confidence": incident.confidence,
                      "evidence_event_count": incident.event_count, "requires_human_review": True},
            db_session=db, fail_on_persist_error=False,
        )
    return incident
