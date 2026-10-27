"""
System-level health checks for demo-safe operations.
"""

from __future__ import annotations

from fastapi import APIRouter
from sqlalchemy import text

from app.core.sovereign_integrations import integration_health, flush_event_buffer
from app.db.database import engine


router = APIRouter()


@router.get("/health")
async def system_health() -> dict:
    db_ok = False
    db_error = None
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        db_ok = True
    except Exception as exc:
        db_error = str(exc)

    integrations = integration_health()
    storage_ok = integrations["storage"]["exists"] and integrations["storage"]["writable"]

    status = "healthy" if db_ok and storage_ok else "degraded"
    return {
        "status": status,
        "database": {"ok": db_ok, "error": db_error},
        "integrations": integrations,
    }


@router.post("/queue/flush")
async def flush_queue() -> dict:
    result = flush_event_buffer(max_items=200)
    return {"success": True, "result": result}

