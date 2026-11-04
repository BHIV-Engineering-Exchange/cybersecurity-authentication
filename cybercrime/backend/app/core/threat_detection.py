"""
Rule-based detection and correlation of authentication attacks (10-day proof C: signal -> detect -> correlate).

Lanes: threat assessment (Shivam) and correlation (Aryan Dias). Added by Hemanth at the team's request; the lane
owners review it.

Input:  canonical `auth.login` DENIED events with reason INVALID_CREDENTIALS, one per failed login (written by auth.py).
        Logins refused because the account is deactivated are not counted.
Rule:   auth.repeated_failed_login v1.0.0 - at least THRESHOLD failed logins for one account within WINDOW.
Output: one open SecurityIncident per account and window (the correlation), updated as more attempts arrive, and one
        `threat.detected` canonical event when the incident opens.

Cost per failed login is bounded: an open incident is found by its indexed key and updated in place; below the
threshold the rule runs one COUNT query; only when an incident opens are events read, at most MAX_LINKED of them.
An incident lists at most MAX_LINKED event ids and trace ids; `event_count` keeps counting beyond that.

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

from sqlalchemy import func

from app.core import bhiv_runtime
from app.core.canonical_event import emit_canonical_event
from app.core.config import settings
from app.db.models import AuditLog, SecurityIncident

RULE_ID = "auth.repeated_failed_login"
RULE_VERSION = "1.0.0"
WINDOW = timedelta(minutes=10)
THRESHOLD = 5
MAX_LINKED = 50  # event ids and trace ids kept per incident
# Incident ids are derived from the correlation key and the first linked event, so the same input gives the same id.
INCIDENT_NAMESPACE = uuid.UUID("6f1d9a52-3c1e-4b8e-9d0a-5b7e2c4f8a11")
FAILED_LOGIN_ACTION = "auth.login:login"  # audit_logs.action of a canonical auth.login event (see canonical_event.py)
COUNTED_REASON = '"reason_code":"INVALID_CREDENTIALS"'  # as it appears in the stored event JSON


def _failed_login_filter(query, account_ref: str, since: datetime):
    return query.filter(AuditLog.action == FAILED_LOGIN_ACTION, AuditLog.status == "denied",
                        AuditLog.entity_type == "user", AuditLog.entity_id == account_ref,
                        AuditLog.timestamp >= since, AuditLog.details.like(f"%{COUNTED_REASON}%"))


def count_failed_logins(db, account_ref: str, since: datetime) -> int:
    return _failed_login_filter(db.query(func.count(AuditLog.id)), account_ref, since).scalar() or 0


def recent_failed_login_events(db, account_ref: str, since: datetime, limit: int = MAX_LINKED) -> List[Dict[str, Optional[str]]]:
    """The most recent counted failed-login events for one account since `since` (at most `limit`), oldest first."""
    rows = _failed_login_filter(db.query(AuditLog), account_ref, since).order_by(AuditLog.id.desc()).limit(limit).all()
    events = []
    for row in reversed(rows):
        try:
            event = json.loads(row.details or "{}")
        except ValueError:
            continue
        if event.get("event_id"):
            events.append({"event_id": event["event_id"], "trace_id": event.get("trace_id")})
    return events


def assess(count: int) -> Dict[str, object]:
    """The rule's assessment for `count` failed logins on one account (assumes count >= THRESHOLD)."""
    minutes = int(WINDOW.total_seconds() // 60)
    return {
        "threat_type": "credential_attack_suspected",
        "severity": "high" if count >= 2 * THRESHOLD else "medium",
        "confidence": round(min(0.9, 0.6 + 0.05 * (count - THRESHOLD)), 2),
        "uncertainty": [
            f"Rule-based count ({count} failed logins linked; {THRESHOLD} within {minutes} minutes open an incident); "
            "not a trained model, and the confidence is a fixed function of the count, not a calibrated probability.",
            "Cannot tell an attacker from a user who forgot the password.",
            "Source addresses are recorded in each event; no IP reputation or geolocation data is used.",
        ],
        "rationale": f"{count} failed logins for one account linked to this incident "
                     f"(rule {RULE_ID} {RULE_VERSION}: {THRESHOLD} within {minutes} minutes).",
    }


def _apply(incident: SecurityIncident, count: int, now: datetime) -> None:
    result = assess(count)
    incident.event_count = count
    incident.severity = str(result["severity"])
    incident.confidence = float(result["confidence"])
    incident.uncertainty = json.dumps(result["uncertainty"])
    incident.rationale = str(result["rationale"])
    incident.last_seen_at = now
    incident.updated_at = now


def detect_and_correlate_failed_logins(db, *, account_ref: str, trace_id: str, request_id: Optional[str] = None,
                                       event_id: Optional[str] = None, now: Optional[datetime] = None
                                       ) -> Optional[SecurityIncident]:
    """Run the rule after one counted failed login (`event_id`); open or update the incident. None below threshold."""
    now = now or datetime.utcnow()
    key = f"{RULE_ID}:{account_ref}"
    incident = (
        db.query(SecurityIncident)
        .filter(SecurityIncident.correlation_key == key, SecurityIncident.status == "open",
                SecurityIncident.last_seen_at >= now - WINDOW)
        .order_by(SecurityIncident.id.desc())
        .first()
    )
    if incident is not None:  # correlate this attempt into the open incident
        evidence = json.loads(incident.evidence_event_ids or "[]")
        if event_id and event_id in set(evidence):
            return incident  # duplicate delivery of an event already linked: nothing is counted twice
        traces = json.loads(incident.trace_ids or "[]")
        if event_id and len(evidence) < MAX_LINKED:
            evidence.append(event_id)
        if trace_id and trace_id not in set(traces) and len(traces) < MAX_LINKED:
            traces.append(trace_id)
        incident.evidence_event_ids = json.dumps(evidence)
        incident.trace_ids = json.dumps(traces)
        _apply(incident, (incident.event_count or 0) + 1, now)
        db.commit()
        return incident

    count = count_failed_logins(db, account_ref, now - WINDOW)
    if count < THRESHOLD:
        return None
    events = recent_failed_login_events(db, account_ref, now - WINDOW)
    first = events[0]["event_id"] if events else (event_id or str(uuid.uuid4()))
    incident = SecurityIncident(
        incident_id=str(uuid.uuid5(INCIDENT_NAMESPACE, f"{key}|{first}")), correlation_key=key, rule_id=RULE_ID, rule_version=RULE_VERSION,
        threat_type="credential_attack_suspected", target_ref=account_ref, status="open", requires_human_review=True,
        first_seen_at=now, created_at=now,
        evidence_event_ids=json.dumps([e["event_id"] for e in events]),
        trace_ids=json.dumps(list(dict.fromkeys(e["trace_id"] for e in events if e.get("trace_id")))),
        severity="medium", confidence=0.0, uncertainty="[]",
    )
    _apply(incident, count, now)
    db.add(incident)
    db.commit()
    db.refresh(incident)
    emit_canonical_event(
        event_type="threat.detected", action="escalate",
        actor_id="cybersecurity.threat_detection", actor_type="system", role="service_agent",
        authenticated=True, auth_method=None,
        resource_type="user", resource_id=account_ref,
        outcome_status="WARNING", reason_code="THREAT_DETECTED",
        message=f"Incident opened for human review: {incident.rationale}",
        trace_id=trace_id, request_id=request_id, rule_name=f"{RULE_ID}@{RULE_VERSION}",
        metadata={"incident_id": incident.incident_id, "rule_id": RULE_ID, "rule_version": RULE_VERSION,
                  "severity": incident.severity, "confidence": incident.confidence,
                  "evidence_event_count": incident.event_count, "requires_human_review": True},
        db_session=db, fail_on_persist_error=False,
    )
    return incident


PROPOSED_ACTIONS = {
    "medium": "Human review. Check with the account owner; if the attempts were not theirs, reset the password and "
              "watch the account. No automatic action is taken.",
    "high": "Human review now. If confirmed, ask TANTRA to approve containment (for example a VAJRA ISOLATE of the "
            "affected subject) and reset the password. No automatic action is taken.",
}


def explain(incident: SecurityIncident) -> dict:
    """The incident's explanation: observed facts kept apart from inference, evidence gaps, a proposed next action,
    and a TANTRA-compatible response envelope (not sent: TANTRA has no registered contract for it yet)."""
    linked = json.loads(incident.evidence_event_ids or "[]")
    first = incident.first_seen_at.isoformat() + "Z" if incident.first_seen_at else None
    last = incident.last_seen_at.isoformat() + "Z" if incident.last_seen_at else None
    observed_facts = [
        f"{incident.event_count} failed login(s) with a wrong password were recorded for account {incident.target_ref} "
        f"between {first} and {last}.",
        f"{len(linked)} of them are linked here by canonical event id (at most {MAX_LINKED} are listed).",
        "No successful login, privilege change or data access is part of this incident.",
    ]
    inference = (f"{incident.threat_type}: the pattern matches rule {incident.rule_id} {incident.rule_version} "
                 f"(severity {incident.severity}, confidence {incident.confidence}). This is an inference from the count, "
                 "not a confirmed attack.")
    evidence_gaps = [
        "TANTRA has no registered contract for security events, so this incident is not in the TANTRA ledger and its "
        "proposed response cannot be submitted for approval.",
        "No IP reputation, geolocation or device data is available to tell an attacker from the account owner.",
        "The account owner has not confirmed or denied the attempts.",
    ]
    proposed = PROPOSED_ACTIONS.get(incident.severity, PROPOSED_ACTIONS["medium"])
    envelope = bhiv_runtime.build_tantra_envelope(
        event_type=settings.TANTRA_EVENT_TYPE, submission_id=incident.incident_id,
        timestamp=incident.created_at.isoformat() + "Z" if incident.created_at else None,
        payload={"kind": "security_incident_response_proposal", "incident_id": incident.incident_id,
                 "rule": f"{incident.rule_id}@{incident.rule_version}", "threat_type": incident.threat_type,
                 "severity": incident.severity, "confidence": incident.confidence, "target_ref": incident.target_ref,
                 "evidence_event_ids": linked, "proposed_next_action": proposed, "requires_human_review": True})
    return {
        "observed_facts": observed_facts,
        "inference": inference,
        "evidence_gaps": evidence_gaps,
        "proposed_next_action": proposed,
        "tantra_response_envelope": envelope,
        "tantra_status": "NOT SENT: TANTRA has no registered contract for this event type yet (TAN-01); the envelope "
                         "is ready for when it does.",
    }
