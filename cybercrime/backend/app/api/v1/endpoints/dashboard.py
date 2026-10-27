"""
Dashboard endpoints: activity feed, priority queue, notifications, risk trends.
"""

from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, Query, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from sqlalchemy import or_
from sqlalchemy.exc import OperationalError

from app.db.database import get_db
from app.db.models import AuditLog, Complaint, IncidentReport, Message, InvestigatorAccessRequest, User
from app.core.ai_client import call_openrouter_json
from app.core.security import decode_access_token
from app.core.audit_logging import emit_audit_log

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)


router = APIRouter()


@router.get("/activity-feed")
async def get_activity_feed(
    db: Session = Depends(get_db),
    actor_id: Optional[int] = Query(None),
    type: Optional[str] = Query(None),
    start: Optional[datetime] = Query(None),
    end: Optional[datetime] = Query(None),
    limit: int = Query(50, ge=1, le=200),
):
    """
    Combined activity stream: evidence uploads, complaints, wallet freeze/unfreeze, AI reports, etc.
    Currently derived from AuditLog; can be extended later.
    """
    query = db.query(AuditLog).join(User, AuditLog.user_id == User.id, isouter=True).order_by(AuditLog.timestamp.desc())

    if actor_id is not None:
        query = query.filter(AuditLog.user_id == actor_id)
    if start:
        query = query.filter(AuditLog.timestamp >= start)
    if end:
        query = query.filter(AuditLog.timestamp <= end)

    # Exclude superadmin activities
    query = query.filter(or_(User.role != "superadmin", User.id.is_(None)))

    logs: List[AuditLog] = query.limit(limit).all()

    events = []
    for log in logs:
        action = log.action or ""
        # Use status instead of level (status can be: success, warning, error)
        status = log.status or "success"
        # Map status to severity level
        if status == "error":
            severity = "error"
        elif status == "warning":
            severity = "warning"
        else:
            severity = "info"

        # Infer high-level type from action text
        if "wallet" in action.lower():
            event_type = "wallet"
        elif "complaint" in action.lower():
            event_type = "complaint"
        elif "evidence" in action.lower():
            event_type = "evidence"
        elif "ai" in action.lower():
            event_type = "ai"
        else:
            event_type = "system"

        if type and event_type != type:
            continue

        # Get user email from relationship if available
        user_email = None
        if log.user:
            user_email = log.user.email

        events.append(
            {
                "id": log.id,
                "timestamp": log.timestamp.isoformat() if log.timestamp else None,
                "actor_id": log.user_id,
                "actor_email": user_email,
                "type": event_type,
                "raw_action": action,
                "entity_type": log.entity_type,
                "entity_id": log.entity_id,
                "summary": log.message or log.details or "",
                "severity": severity,
                "ip_address": log.ip_address,
                "is_ai": "ai" in action.lower(),
            }
        )

    return {"events": events}


@router.get("/priority-queue")
async def get_priority_queue(
    db: Session = Depends(get_db),
    limit: int = Query(20, ge=1, le=100),
):
    """
    Build a unified queue of complaints + high-risk incident reports,
    call OpenRouter for AI priority scoring, and return sorted list.
    """
    # Open complaints
    complaints: List[Complaint] = (
        db.query(Complaint)
        .filter(Complaint.status.in_(["submitted", "under_review"]))
        .order_by(Complaint.created_at.desc())
        .limit(limit)
        .all()
    )

    # Recent incident reports
    reports: List[IncidentReport] = (
        db.query(IncidentReport)
        .order_by(IncidentReport.created_at.desc())
        .limit(limit)
        .all()
    )

    items = []

    # Complaints
    now = datetime.utcnow()
    for c in complaints:
        created_at = c.created_at or now
        age_hours = (now - created_at).total_seconds() / 3600.0
        has_evidence = bool(c.evidence_ids and c.evidence_ids != "[]")

        items.append(
            {
                "id": f"complaint-{c.id}",
                "kind": "complaint",
                "wallet_address": c.wallet_address,
                "risk_score": 0,
                "risk_level": "MEDIUM",
                "age_hours": age_hours,
                "num_related_reports": 0,
                "has_evidence": has_evidence,
                "investigator_id": c.investigator_id,
                "status": c.status,
            }
        )

    # Incident reports
    for r in reports:
        created_at = r.created_at or now
        age_hours = (now - created_at).total_seconds() / 3600.0

        items.append(
            {
                "id": f"report-{r.id}",
                "kind": "wallet",
                "wallet_address": r.wallet_address,
                "risk_score": float(r.risk_score or 0),
                "risk_level": (r.risk_level or "MEDIUM").upper(),
                "age_hours": age_hours,
                "num_related_reports": 1,
                "has_evidence": False,
                "investigator_id": r.investigator_id,
                "status": r.status or "active",
            }
        )

    if not items:
        return {"items": []}

    # Try to get AI priority scores, but fall back to heuristic scoring if AI fails
    scores_map = {}
    try:
        prompt = (
            "You are a triage assistant for a cybercrime dashboard.\n"
            "For each item, assign:\n"
            '- \"priority_score\" between 0 and 100 (higher = more urgent)\n'
            '- \"recommended_action\" from [\"freeze\", \"monitor\", \"escalate\", \"review_later\"].\n\n'
            f"Items:\n{items}\n\n"
            "Return ONLY JSON: {\"items\": [{\"id\": \"...\", \"priority_score\": 90, \"recommended_action\": \"freeze\"}, ...]}"
        )

        ai_result = await call_openrouter_json(prompt)
        scores_map = {
            row.get("id"): row for row in ai_result.get("items", []) if isinstance(row, dict) and row.get("id")
        }
    except Exception as e:
        # If AI call fails, log error but continue with heuristic scoring
        emit_audit_log(
            action="dashboard.priority_queue",
            status="warning",
            message="AI priority scoring failed, using heuristic fallback.",
            details={"error": str(e)},
        )
        print(f"[WARNING] Priority queue AI scoring failed: {e}")

    # Enrich items with priority scores (from AI or heuristic fallback)
    enriched = []
    for item in items:
        row = scores_map.get(item["id"], {})
        
        # Use AI score if available, otherwise calculate heuristic score
        if "priority_score" in row:
            item["priority_score"] = int(row.get("priority_score", 0))
        else:
            # Heuristic scoring: higher risk_score and age = higher priority
            base_score = int((item.get("risk_score", 0) * 50))  # Risk contributes up to 50 points
            age_score = min(int(item.get("age_hours", 0) * 2), 30)  # Age contributes up to 30 points
            evidence_bonus = 10 if item.get("has_evidence", False) else 0  # Evidence bonus
            item["priority_score"] = base_score + age_score + evidence_bonus
        
        item["recommended_action"] = row.get("recommended_action", "review_later")
        enriched.append(item)

    enriched.sort(key=lambda x: x.get("priority_score", 0), reverse=True)
    return {"items": enriched[:limit]}


async def get_current_user_optional(
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """Get current user if token is provided, otherwise return None"""
    try:
        if not token:
            return None
        
        payload = decode_access_token(token)
        if payload is None:
            return None
        
        email = payload.get("sub")
        if not email:
            return None
        
        user = db.query(User).filter(User.email == email).first()
        return user
    except Exception as e:
        # Log error but don't fail - just return None
        emit_audit_log(
            action="auth.optional_user",
            status="warning",
            message="Failed to resolve optional user.",
            details={"error": str(e)},
        )
        return None


@router.get("/notifications")
async def get_notifications(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
    type: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
):
    """
    Aggregated notifications: AI, complaints, wallets, system.
    Filtered by user role:
    - Superadmin: sees all notifications including access requests
    - Investigator: sees only their own activity and messages
    """
    notifications = []
    
    # Determine user role
    is_superadmin = current_user and current_user.role == "superadmin"
    is_investigator = current_user and current_user.role == "investigator"
    
    # Superadmin sees access request notifications and messages
    if is_superadmin:
        # Add pending access requests
        try:
            pending_requests = db.query(InvestigatorAccessRequest).filter(
                InvestigatorAccessRequest.status == "pending"
            ).order_by(InvestigatorAccessRequest.created_at.desc()).limit(10).all()
        except OperationalError:
            pending_requests = []
        
        for req in pending_requests:
            notifications.append({
                "id": f"access_request_{req.id}",
                "type": "system",
                "severity": "info",
                "title": f"New Access Request: {req.full_name}",
                "message": f"{req.full_name} ({req.email}) has requested investigator access.",
                "created_at": req.created_at.isoformat() if req.created_at else None,
                "entity_type": "access_request",
                "entity_id": req.id,
                "read": False,
                "pinned": False,
            })
        
        # Add unread messages for superadmin
        if current_user:
            try:
                unread_messages = db.query(Message).filter(
                    Message.recipient_id == current_user.id,
                    Message.is_read == False
                ).order_by(Message.created_at.desc()).limit(20).all()
            except OperationalError:
                unread_messages = []
            
            for msg in unread_messages:
                notifications.append({
                    "id": f"message_{msg.id}",
                    "type": "system",
                    "severity": "info" if msg.priority == "normal" else msg.priority,
                    "title": msg.subject or "New Message",
                    "message": msg.content[:100] + "..." if len(msg.content) > 100 else msg.content,
                    "entity_type": "message",
                    "entity_id": msg.id,
                    "created_at": msg.created_at.isoformat() if msg.created_at else None,
                    "read": msg.is_read,
                    "pinned": False,
                })
    
    # Filter audit logs based on role
    if is_superadmin:
        # Superadmin sees all audit logs
        try:
            logs: List[AuditLog] = (
                db.query(AuditLog)
                .join(User, AuditLog.user_id == User.id, isouter=True)
                # Exclude superadmin login/activity
                .filter(or_(User.role != "superadmin", User.id.is_(None)))
                .order_by(AuditLog.timestamp.desc())
                .limit(limit)
                .all()
            )
        except OperationalError:
            logs = []
    elif is_investigator and current_user:
        # Investigator sees only their own audit logs
        try:
            logs: List[AuditLog] = (
                db.query(AuditLog)
                .join(User, AuditLog.user_id == User.id, isouter=True)
                .filter(AuditLog.user_id == current_user.id)
                .order_by(AuditLog.timestamp.desc())
                .limit(limit)
                .all()
            )
        except OperationalError:
            logs = []
    else:
        # No user or unknown role - return empty
        logs = []
    
    # Add messages for investigators
    if is_investigator and current_user:
        # Get unread messages for this investigator
        try:
            messages = db.query(Message).filter(
                or_(
                    Message.recipient_id == current_user.id,
                    Message.is_broadcast == True
                ),
                Message.is_read == False
            ).order_by(Message.created_at.desc()).limit(20).all()
        except OperationalError:
            messages = []
        
        for msg in messages:
            notifications.append({
                "id": f"message_{msg.id}",
                "type": "system",
                "severity": "info" if msg.priority == "normal" else msg.priority,
                "title": msg.subject or "New Message",
                "message": msg.content[:100] + "..." if len(msg.content) > 100 else msg.content,
                "entity_type": "message",
                "entity_id": msg.id,
                "created_at": msg.created_at.isoformat() if msg.created_at else None,
                "read": msg.is_read,
                "pinned": False,
            })
    
    # Process audit logs
    for log in logs:
        action = log.action or ""
        # Use status instead of level (status can be: success, warning, error)
        log_status = log.status or "success"
        # Map status to severity level
        if log_status == "error":
            sev_level = "error"
        elif log_status == "warning":
            sev_level = "warning"
        else:
            sev_level = "info"

        if "wallet" in action.lower():
            n_type = "wallet"
        elif "complaint" in action.lower():
            n_type = "complaint"
        elif "ai" in action.lower():
            n_type = "ai"
        else:
            n_type = "system"

        notif = {
            "id": f"audit-{log.id}",
            "type": n_type,
            "severity": sev_level,
            "title": action or "Activity",
            "message": log.details or "",
            "entity_type": log.entity_type,
            "entity_id": log.entity_id,
            "created_at": log.timestamp.isoformat() if log.timestamp else None,
            "read": False,
            "pinned": False,
        }

        notifications.append(notif)

    if severity:
        notifications = [
            n for n in notifications if (n["severity"] or "").lower() == severity.lower()
        ]

    # Filter out notifications older than last_notification_read_at if set
    if current_user and current_user.last_notification_read_at:
        # Convert read_at to ISO string for comparison
        read_at_iso = current_user.last_notification_read_at.isoformat()
        notifications = [
            n for n in notifications 
            if n["created_at"] and n["created_at"] > read_at_iso
        ]

    notifications.sort(key=lambda n: n["created_at"] or "", reverse=True)
    return {"notifications": notifications[:limit]}


@router.get("/risk-trends")
async def get_risk_trends(
    db: Session = Depends(get_db),
    days: int = Query(30, ge=1, le=365),
):
    """
    Compute risk trends from incident reports (risk levels) and complaints (regional volume)
    over the last N days.
    """
    now = datetime.utcnow()
    since = now - timedelta(days=days)

    complaints: List[Complaint] = (
        db.query(Complaint)
        .filter(Complaint.created_at >= since)
        .all()
    )

    reports: List[IncidentReport] = (
        db.query(IncidentReport)
        .filter(IncidentReport.created_at >= since)
        .all()
    )

    by_day = {}
    for r in reports:
        created_at = r.created_at or now
        d = created_at.date().isoformat()
        day = by_day.setdefault(
            d, {"date": d, "critical": 0, "high": 0, "medium": 0, "low": 0}
        )
        level = (r.risk_level or "medium").lower()
        if level == "critical":
            day["critical"] += 1
        elif level == "high":
            day["high"] += 1
        elif level == "medium":
            day["medium"] += 1
        else:
            day["low"] += 1

    distribution = {"low": 0, "medium": 0, "high": 0, "critical": 0}
    for r in reports:
        level = (r.risk_level or "medium").lower()
        if level in distribution:
            distribution[level] += 1

    by_region = {}
    for c in complaints:
        region = c.investigator_location_country or "Unknown"
        entry = by_region.setdefault(region, {"region": region, "critical": 0, "high": 0})
        # For now, count each complaint as a high-risk signal; can be refined with AI later
        entry["high"] += 1

    return {
        "by_day": sorted(by_day.values(), key=lambda x: x["date"]),
        "distribution": distribution,
        "by_region": list(by_region.values()),
    }


@router.post("/notifications/mark-all-read")
async def mark_notifications_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_optional),
):
    """
    Mark all notifications as read for the current user.
    Updates User.last_notification_read_at and marks all Messages as read.
    """
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
        
    try:
        now = datetime.utcnow()
        current_user.last_notification_read_at = now
        
        # Mark all messages as read
        db.query(Message).filter(
            Message.recipient_id == current_user.id,
            Message.is_read == False
        ).update({"is_read": True, "read_at": now})
        
        db.commit()
        return {"status": "success", "marked_at": now.isoformat()}
    except Exception as e:
        db.rollback()
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Failed to mark notifications as read")


