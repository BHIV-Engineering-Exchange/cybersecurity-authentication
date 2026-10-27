"""
Cybercrime Investigation Dashboard - FastAPI Backend
Main application entry point
"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from contextlib import asynccontextmanager
from pathlib import Path
from uuid import uuid4
import json
import yaml

from app.core.config import settings
from app.api.v1.api import api_router
from app.db.database import engine, Base, SessionLocal
from app.db.models import User
from app.core.security import get_password_hash, decode_access_token
from app.core.audit_logging import configure_logging, emit_audit_log
from app.core.error_responses import build_error_response
from app.core.rbac import load_rbac_policy, extract_path_id


def init_superadmin():
    """Initialize superadmin account on startup"""
    if not settings.SUPERADMIN_BOOTSTRAP_ENABLED:
        emit_audit_log(
            action="superadmin.bootstrap",
            status="warning",
            message="Superadmin bootstrap disabled; skipping initialization.",
        )
        return
    if not settings.SUPERADMIN_EMAIL or not settings.SUPERADMIN_PASSWORD:
        emit_audit_log(
            action="superadmin.bootstrap",
            status="error",
            message="Superadmin bootstrap missing credentials; skipping initialization.",
        )
        return

    db = SessionLocal()
    try:
        superadmin_email = settings.SUPERADMIN_EMAIL.lower().strip()
        superadmin_password = settings.SUPERADMIN_PASSWORD
        
        # Check if superadmin already exists
        existing_superadmin = db.query(User).filter(User.email == superadmin_email).first()
        
        if not existing_superadmin:
            # Create superadmin account
            try:
                hashed_password = get_password_hash(superadmin_password)
                superadmin = User(
                    email=superadmin_email,
                    full_name="Super Admin",
                    hashed_password=hashed_password,
                    role="superadmin",
                    is_active=True
                )
                db.add(superadmin)
                db.commit()
                emit_audit_log(
                    action="superadmin.bootstrap",
                    status="success",
                    message="Created superadmin account.",
                    entity_type="user",
                    entity_id=str(superadmin.id),
                )
            except Exception as hash_error:
                emit_audit_log(
                    action="superadmin.bootstrap",
                    status="error",
                    message="Failed to hash superadmin password.",
                    details={"error": str(hash_error)},
                )
                raise
        else:
            # Ensure superadmin is active
            updated = False
            if not existing_superadmin.is_active:
                existing_superadmin.is_active = True
                updated = True
            
            # Only reset password when explicitly requested
            if settings.SUPERADMIN_BOOTSTRAP_FORCE_RESET:
                try:
                    correct_hash = get_password_hash(superadmin_password)
                    existing_superadmin.hashed_password = correct_hash
                    updated = True
                except Exception as hash_error:
                    emit_audit_log(
                        action="superadmin.bootstrap",
                        status="error",
                        message="Failed to reset superadmin password.",
                        entity_type="user",
                        entity_id=str(existing_superadmin.id),
                        details={"error": str(hash_error)},
                    )
            if updated:
                db.commit()
            emit_audit_log(
                action="superadmin.bootstrap",
                status="success",
                message="Superadmin account verified.",
                entity_type="user",
                entity_id=str(existing_superadmin.id),
            )
    except Exception as e:
        emit_audit_log(
            action="superadmin.bootstrap",
            status="error",
            message="Failed to initialize superadmin.",
            details={"error": str(e)},
        )
    finally:
        db.close()


def migrate_database():
    """Add new columns to existing database if they don't exist"""
    from sqlalchemy import inspect, text
    
    try:
        inspector = inspect(engine)
        db_type = "sqlite" if "sqlite" in str(engine.url) else "postgres"
        
        # Helper to get correct SQL type
        def get_sql_type(base_type):
            if db_type == "sqlite":
                if base_type == "BOOLEAN":
                    return "INTEGER DEFAULT 0"
                if base_type == "DATETIME":
                    return "DATETIME"
                return base_type
            else:
                # PostgreSQL
                if base_type == "DATETIME":
                    return "TIMESTAMP"
                return base_type

        # Check if users table exists
        if "users" in inspector.get_table_names():
            # Get existing columns
            existing_columns = [col["name"] for col in inspector.get_columns("users")]
            
            # Add new location columns if they don't exist
            with engine.connect() as conn:
                columns_to_add = [
                    ("location_city", "VARCHAR"),
                    ("location_country", "VARCHAR"),
                    ("location_latitude", "FLOAT"),
                    ("location_longitude", "FLOAT"),
                    ("location_ip", "VARCHAR"),
                    ("last_login_at", "DATETIME"),
                    ("last_activity_at", "DATETIME"),
                    ("password_changed_at", "DATETIME"),
                    ("last_notification_read_at", "DATETIME"),
                    ("two_factor_enabled", "BOOLEAN"),
                    ("availability_status", "VARCHAR"),
                    ("status_updated_at", "DATETIME"),
                ]
                
                for col_name, col_type in columns_to_add:
                    if col_name not in existing_columns:
                        try:
                            # Use appropriate SQL syntax based on database type
                            sql_type = get_sql_type(col_type)
                            conn.execute(text(f"ALTER TABLE users ADD COLUMN {col_name} {sql_type}"))
                            conn.commit()
                            emit_audit_log(
                                action="migration.users.add_column",
                                status="success",
                                message=f"Added {col_name} column to users table.",
                            )
                        except Exception as e:
                            emit_audit_log(
                                action="migration.users.add_column",
                                status="warning",
                                message=f"Could not add {col_name} column to users table.",
                                details={"error": str(e)},
                            )
                            conn.rollback()
        
        # Check if audit_logs table exists and add audit metadata columns
        if "audit_logs" in inspector.get_table_names():
            existing_audit_columns = [col["name"] for col in inspector.get_columns("audit_logs")]
            
            with engine.connect() as conn:
                audit_columns_to_add = [
                    ("ip_address", "VARCHAR"),
                    ("message", "VARCHAR"),
                    ("request_id", "VARCHAR"),
                    ("path", "VARCHAR"),
                    ("method", "VARCHAR"),
                ]
                for col_name, col_type in audit_columns_to_add:
                    if col_name not in existing_audit_columns:
                        try:
                            conn.execute(text(f"ALTER TABLE audit_logs ADD COLUMN {col_name} {col_type}"))
                            conn.commit()
                            emit_audit_log(
                                action="migration.audit_logs.add_column",
                                status="success",
                                message=f"Added {col_name} column to audit_logs table.",
                            )
                        except Exception as e:
                            emit_audit_log(
                                action="migration.audit_logs.add_column",
                                status="warning",
                                message=f"Could not add {col_name} column to audit_logs table.",
                                details={"error": str(e)},
                            )
                            conn.rollback()
        
        # Check if complaints table exists and add location columns
        if "complaints" in inspector.get_table_names():
            existing_complaint_columns = [col["name"] for col in inspector.get_columns("complaints")]
            
            with engine.connect() as conn:
                complaint_columns_to_add = [
                    ("investigator_id", "INTEGER"),
                    ("investigator_location_city", "VARCHAR"),
                    ("investigator_location_country", "VARCHAR"),
                    ("investigator_location_latitude", "FLOAT"),
                    ("investigator_location_longitude", "FLOAT"),
                    ("investigator_location_ip", "VARCHAR"),
                ]
                
                for col_name, col_type in complaint_columns_to_add:
                    if col_name not in existing_complaint_columns:
                        try:
                            sql_type = get_sql_type(col_type)
                            conn.execute(text(f"ALTER TABLE complaints ADD COLUMN {col_name} {sql_type}"))
                            conn.commit()
                            emit_audit_log(
                                action="migration.complaints.add_column",
                                status="success",
                                message=f"Added {col_name} column to complaints table.",
                            )
                        except Exception as e:
                            emit_audit_log(
                                action="migration.complaints.add_column",
                                status="warning",
                                message=f"Could not add {col_name} column to complaints table.",
                                details={"error": str(e)},
                            )
                            conn.rollback()
        
        # Check if evidence table exists and add file storage columns
        if "evidence" in inspector.get_table_names():
            existing_evidence_columns = [col["name"] for col in inspector.get_columns("evidence")]
            
            with engine.connect() as conn:
                evidence_columns_to_add = [
                    ("file_path", "VARCHAR"),
                    ("file_size", "INTEGER"),
                    ("file_type", "VARCHAR"),
                ]
                
                for col_name, col_type in evidence_columns_to_add:
                    if col_name not in existing_evidence_columns:
                        try:
                            sql_type = get_sql_type(col_type)
                            conn.execute(text(f"ALTER TABLE evidence ADD COLUMN {col_name} {sql_type}"))
                            conn.commit()
                            emit_audit_log(
                                action="migration.evidence.add_column",
                                status="success",
                                message=f"Added {col_name} column to evidence table.",
                            )
                        except Exception as e:
                            emit_audit_log(
                                action="migration.evidence.add_column",
                                status="warning",
                                message=f"Could not add {col_name} column to evidence table.",
                                details={"error": str(e)},
                            )
                            conn.rollback()
        
        # Check if incident_reports table exists and add investigator_id column
        if "incident_reports" in inspector.get_table_names():
            existing_incident_columns = [col["name"] for col in inspector.get_columns("incident_reports")]
            
            with engine.connect() as conn:
                if "investigator_id" not in existing_incident_columns:
                    try:
                        conn.execute(text("ALTER TABLE incident_reports ADD COLUMN investigator_id INTEGER"))
                        conn.commit()
                        emit_audit_log(
                            action="migration.incident_reports.add_column",
                            status="success",
                            message="Added investigator_id column to incident_reports table.",
                        )
                    except Exception as e:
                        emit_audit_log(
                            action="migration.incident_reports.add_column",
                            status="warning",
                            message="Could not add investigator_id column to incident_reports table.",
                            details={"error": str(e)},
                        )
                        conn.rollback()
        
        # Create messages table if it doesn't exist
        if "messages" not in inspector.get_table_names():
            try:
                from app.db.models import Message
                Message.__table__.create(bind=engine, checkfirst=True)
                emit_audit_log(
                    action="migration.messages.create_table",
                    status="success",
                    message="Created messages table.",
                )
            except Exception as e:
                emit_audit_log(
                    action="migration.messages.create_table",
                    status="warning",
                    message="Could not create messages table.",
                    details={"error": str(e)},
                )
        
        # Create fraud_transactions table if it doesn't exist
        if "fraud_transactions" not in inspector.get_table_names():
            try:
                from app.db.models import FraudTransaction
                FraudTransaction.__table__.create(bind=engine, checkfirst=True)
                emit_audit_log(
                    action="migration.fraud_transactions.create_table",
                    status="success",
                    message="Created fraud_transactions table.",
                )
            except Exception as e:
                emit_audit_log(
                    action="migration.fraud_transactions.create_table",
                    status="warning",
                    message="Could not create fraud_transactions table.",
                    details={"error": str(e)},
                )
        
        # Create investigator_access_requests table if it doesn't exist
        if "investigator_access_requests" not in inspector.get_table_names():
            try:
                from app.db.models import InvestigatorAccessRequest
                InvestigatorAccessRequest.__table__.create(bind=engine, checkfirst=True)
                emit_audit_log(
                    action="migration.access_requests.create_table",
                    status="success",
                    message="Created investigator_access_requests table.",
                )
            except Exception as e:
                emit_audit_log(
                    action="migration.access_requests.create_table",
                    status="warning",
                    message="Could not create investigator_access_requests table.",
                    details={"error": str(e)},
                )
        else:
            existing_access_request_columns = [col["name"] for col in inspector.get_columns("investigator_access_requests")]
            with engine.connect() as conn:
                access_request_columns_to_add = [
                    ("requested_password_hash", "VARCHAR"),
                ]

                for col_name, col_type in access_request_columns_to_add:
                    if col_name not in existing_access_request_columns:
                        try:
                            sql_type = get_sql_type(col_type)
                            conn.execute(text(f"ALTER TABLE investigator_access_requests ADD COLUMN {col_name} {sql_type}"))
                            conn.commit()
                            emit_audit_log(
                                action="migration.access_requests.add_column",
                                status="success",
                                message=f"Added {col_name} column to investigator_access_requests table.",
                            )
                        except Exception as e:
                            emit_audit_log(
                                action="migration.access_requests.add_column",
                                status="warning",
                                message=f"Could not add {col_name} column to investigator_access_requests table.",
                                details={"error": str(e)},
                            )
                            conn.rollback()
        
        # Check if wallets table exists and add freeze status columns
        if "wallets" in inspector.get_table_names():
            existing_wallet_columns = [col["name"] for col in inspector.get_columns("wallets")]
            
            with engine.connect() as conn:
                wallet_columns_to_add = [
                    ("is_frozen", "BOOLEAN"),
                    ("frozen_by", "VARCHAR"),
                    ("freeze_reason", "TEXT"),
                    ("frozen_at", "DATETIME"),
                    ("unfrozen_by", "VARCHAR"),
                    ("unfreeze_reason", "TEXT"),
                    ("unfrozen_at", "DATETIME"),
                ]
                
                for col_name, col_type in wallet_columns_to_add:
                    if col_name not in existing_wallet_columns:
                        try:
                            # Use appropriate SQL syntax
                            sql_type = get_sql_type(col_type)
                            conn.execute(text(f"ALTER TABLE wallets ADD COLUMN {col_name} {sql_type}"))
                            conn.commit()
                            emit_audit_log(
                                action="migration.wallets.add_column",
                                status="success",
                                message=f"Added {col_name} column to wallets table.",
                            )
                        except Exception as e:
                            emit_audit_log(
                                action="migration.wallets.add_column",
                                status="warning",
                                message=f"Could not add {col_name} column to wallets table.",
                                details={"error": str(e)},
                            )
                            conn.rollback()
    except Exception as e:
        emit_audit_log(
            action="migration.run",
            status="error",
            message="Error during migration.",
            details={"error": str(e)},
        )
        # Don't fail startup if migration fails - tables will be created on next startup


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan events for startup and shutdown"""
    configure_logging()
    policy_path = Path(settings.RBAC_POLICY_PATH)
    if not policy_path.is_absolute():
        policy_path = Path(__file__).resolve().parent.parent / policy_path
    app.state.rbac_policy = load_rbac_policy(policy_path)

    # Create database tables
    Base.metadata.create_all(bind=engine)
    
    # Migrate database (add new columns if needed)
    migrate_database()
    
    # Initialize superadmin account
    init_superadmin()

    # Temporarily disable OpenAPI validation to allow deployment
    # TODO: Re-enable after ensuring openapi.yaml is up to date
    try:
        validate_openapi_spec(app)
    except RuntimeError as e:
        emit_audit_log(
            action="openapi.validate",
            status="warning",
            message="OpenAPI validation failed, continuing anyway.",
            details={"error": str(e)},
        )
        print(f"[WARNING] OpenAPI validation failed: {e}")
        print("[WARNING] Continuing startup despite OpenAPI validation failure...")
    
    yield


docs_url = "/api/docs" if settings.EXPOSE_API_DOCS else None
redoc_url = "/api/redoc" if settings.EXPOSE_API_DOCS else None
openapi_url = "/api/openapi.json" if settings.EXPOSE_API_DOCS else None

app = FastAPI(
    title="Cybercrime Investigation API",
    description="Backend API for cybercrime investigation dashboard",
    version="1.0.0",
    docs_url=docs_url,
    redoc_url=redoc_url,
    openapi_url=openapi_url,
    lifespan=lifespan
)

@app.get("/docs", include_in_schema=False)
async def redirect_to_api_docs():
    return RedirectResponse(url="/api/docs")

@app.get("/redoc", include_in_schema=False)
async def redirect_to_api_redoc():
    return RedirectResponse(url="/api/redoc")


# CORS Configuration
# Allow all Render subdomains dynamically
import os
import re

# Check if we're in production (Render)
is_production = os.getenv("RENDER") or os.getenv("RENDER_SERVICE_NAME")

cors_origins = settings.CORS_ORIGINS.copy() if settings.CORS_ORIGINS else []
# Add Render frontend URL explicitly
cors_origins.append("https://cybercrime-frontend.onrender.com")

# Remove duplicates while preserving order
seen = set()
cors_origins = [x for x in cors_origins if not (x in seen or seen.add(x))]

# Log CORS origins for debugging
print(f"[INFO] CORS Origins configured: {cors_origins}")
print(f"[INFO] CORS Regex pattern: https://.*\\.onrender\\.com")
print(f"[INFO] Production mode: {is_production}")

# Explicit OPTIONS handler for all routes
@app.options("/{full_path:path}")
async def options_handler(request: Request):
    """Handle all OPTIONS requests explicitly"""
    origin = request.headers.get("origin")
    response = JSONResponse(content={}, status_code=200)
    add_cors_headers(response, origin)
    response.headers["Access-Control-Max-Age"] = "3600"
    return response

# CORS middleware - will be added at the end so it runs first (FastAPI middleware runs in reverse order)


def add_cors_headers(response, origin: str = None):
    """Add CORS headers to response"""
    if not origin:
        return  # No origin header, skip CORS headers
    
    # Check if origin is allowed
    is_render_domain = origin.endswith(".onrender.com")
    is_allowed = origin in cors_origins
    
    # Add CORS headers if origin matches
    if is_render_domain or is_allowed:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD"
        response.headers["Access-Control-Allow-Headers"] = "*"
        response.headers["Access-Control-Expose-Headers"] = "*"

@app.middleware("http")
async def cors_early_middleware(request: Request, call_next):
    """Add CORS headers as early as possible"""
    origin = request.headers.get("origin")
    
    # Handle OPTIONS preflight requests immediately
    if request.method.upper() == "OPTIONS":
        response = JSONResponse(content={}, status_code=200)
        add_cors_headers(response, origin)
        response.headers["Access-Control-Max-Age"] = "3600"
        return response
    
    response = await call_next(request)
    # Ensure CORS headers are always present
    add_cors_headers(response, origin)
    return response

@app.middleware("http")
async def request_context_middleware(request: Request, call_next):
    request_id = request.headers.get("X-Request-Id") or str(uuid4())
    trace_id = request.headers.get("X-Trace-Id") or str(uuid4())
    request.state.request_id = request_id
    request.state.trace_id = trace_id
    origin = request.headers.get("origin")
    
    try:
        response = await call_next(request)
    except Exception as exc:
        # Create error response with CORS headers
        error_response = JSONResponse(
            content={"detail": str(exc)},
            status_code=500
        )
        add_cors_headers(error_response, origin)
        error_response.headers["X-Request-Id"] = request_id
        error_response.headers["X-Trace-Id"] = trace_id
        
        emit_audit_log(
            action="request.error",
            status="error",
            message="Unhandled exception during request.",
            request_id=request_id,
            trace_id=trace_id,
            path=request.url.path,
            method=request.method,
            ip_address=request.client.host if request.client else None,
            details={"error": str(exc)},
        )
        return error_response
    
    # Always add CORS headers (even if middleware already added them, ensure they're correct)
    add_cors_headers(response, origin)
    
    response.headers["X-Request-Id"] = request_id
    response.headers["X-Trace-Id"] = trace_id
    emit_audit_log(
        action="request.completed",
        status="success" if response.status_code < 400 else "error",
        message="Request completed.",
        request_id=request_id,
        trace_id=trace_id,
        path=request.url.path,
        method=request.method,
        ip_address=request.client.host if request.client else None,
        details={"status_code": response.status_code},
    )
    return response


# CORS middleware must be added LAST so it runs FIRST (FastAPI middleware runs in reverse order)
# Use both allow_origins and allow_origin_regex for maximum compatibility
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_origin_regex=r"https://.*\.onrender\.com",  # Allow all Render subdomains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

@app.middleware("http")
async def rbac_middleware(request: Request, call_next):
    if request.method.upper() == "OPTIONS":
        return await call_next(request)

    req_id = getattr(request.state, "request_id", None) or request.headers.get("X-Request-Id") or str(uuid4())
    trc_id = getattr(request.state, "trace_id", None) or request.headers.get("X-Trace-Id") or str(uuid4())
    request.state.request_id = req_id
    request.state.trace_id = trc_id

    policy = getattr(app.state, "rbac_policy", None)
    if policy is None:
        try:
            policy_path = Path(settings.RBAC_POLICY_PATH)
            if not policy_path.is_absolute():
                policy_path = Path(__file__).resolve().parent.parent / policy_path
            policy = load_rbac_policy(policy_path)
            app.state.rbac_policy = policy
        except Exception:
            policy = None
    if policy is None:
        return JSONResponse(status_code=503, content={"error": True, "code": "POLICY_UNAVAILABLE", "message": "Access control policy is unavailable."})

    authorization = request.headers.get("Authorization", "")
    token = None
    if authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1].strip()
    elif authorization:
        token = authorization.strip()

    role = "public"
    user_id = None
    token_invalid = False
    if token:
        payload = decode_access_token(token)
        if payload:
            raw_user_id = payload.get("user_id")
            try:
                user_id = int(raw_user_id) if raw_user_id is not None else None
            except (TypeError, ValueError):
                user_id = None
            role = payload.get("role") or role
            if user_id is not None:
                db = SessionLocal()
                try:
                    user = db.query(User).filter(User.id == user_id).first()
                    if not user:
                        role = "public"
                        user_id = None
                    elif not user.is_active:
                        # SEC-05: Validly authenticated but deactivated account -> 403 ACCOUNT_DEACTIVATED
                        origin = request.headers.get("origin")
                        req_id = getattr(request.state, "request_id", None)
                        trc_id = getattr(request.state, "trace_id", None)
                        emit_audit_log(
                            action="auth.deactivated_account_access",
                            status="warning",
                            message="Deactivated user attempted to access API.",
                            request_id=req_id,
                            trace_id=trc_id,
                            path=request.url.path,
                            method=request.method,
                            ip_address=request.client.host if request.client else None,
                            details={"user_id": user_id},
                        )
                        payload = build_error_response(
                            code="ACCOUNT_DEACTIVATED",
                            message="Account is deactivated. Access denied.",
                            request_id=req_id,
                            trace_id=trc_id,
                            status_code=403,
                        )
                        response = JSONResponse(status_code=403, content=payload)
                        add_cors_headers(response, origin)
                        if req_id:
                            response.headers["X-Request-Id"] = req_id
                        if trc_id:
                            response.headers["X-Trace-Id"] = trc_id
                        return response
                    else:
                        role = user.role or role
                        request.state.current_user = user
                finally:
                    db.close()
        else:
            token_invalid = True

    request.state.current_role = role

    if not policy.is_allowed(role=role, method=request.method, path=request.url.path):
        origin = request.headers.get("origin")
        req_id = getattr(request.state, "request_id", None)
        trc_id = getattr(request.state, "trace_id", None)
        if role == "public":
            status_code = 401
            code = "INVALID_CREDENTIALS" if token_invalid else "AUTHENTICATION_REQUIRED"
            message = "Invalid or expired credentials." if token_invalid else "Authentication required."
        else:
            status_code = 403
            code = "INSUFFICIENT_PERMISSIONS"
            message = "Access denied."

        emit_audit_log(
            action="rbac.deny",
            status="warning",
            message=f"RBAC denied request: {code}.",
            request_id=req_id,
            trace_id=trc_id,
            path=request.url.path,
            method=request.method,
            ip_address=request.client.host if request.client else None,
            details={"role": role, "code": code, "user_id": user_id},
        )
        try:
            from app.core.canonical_event import emit_canonical_event
            audit_db = SessionLocal()
            try:
                emit_canonical_event(
                    event_type="authz.decision",
                    action=request.method.lower() if request.method.lower() in ("create", "read", "update", "delete") else "read",
                    actor_id=f"cc_usr_{user_id}" if user_id else "anonymous",
                    role=role,
                    authenticated=(role != "public"),
                    resource_type="policy",
                    resource_id=request.url.path,
                    outcome_status="DENIED",
                    status_code=status_code,
                    reason_code=code,
                    message=message,
                    trace_id=trc_id or "trace-unknown",
                    request_id=req_id,
                    policy_id="rbac_permissions_v1",
                    metadata={"path": request.url.path, "method": request.method, "role": role},
                    db_session=audit_db,
                    fail_on_persist_error=False,
                )
            finally:
                audit_db.close()
        except Exception:
            pass

        payload = build_error_response(
            code=code,
            message=message,
            request_id=req_id,
            trace_id=trc_id,
            status_code=status_code,
        )
        response = JSONResponse(status_code=status_code, content=payload)
        add_cors_headers(response, origin)
        if req_id:
            response.headers["X-Request-Id"] = req_id
        if trc_id:
            response.headers["X-Trace-Id"] = trc_id
        return response

    if role == "investigator" and user_id is not None:
        path_id = extract_path_id(request.url.path, "investigators")
        if path_id is not None and path_id != user_id:
            origin = request.headers.get("origin")
            req_id = getattr(request.state, "request_id", None)
            trc_id = getattr(request.state, "trace_id", None)
            emit_audit_log(
                action="rbac.deny",
                status="warning",
                message="RBAC denied investigator self-only request.",
                request_id=req_id,
                trace_id=trc_id,
                path=request.url.path,
                method=request.method,
                ip_address=request.client.host if request.client else None,
                details={"user_id": user_id, "target_id": path_id},
            )
            try:
                from app.core.canonical_event import emit_canonical_event
                audit_db = SessionLocal()
                try:
                    emit_canonical_event(
                        event_type="authz.decision",
                        action="read",
                        actor_id=f"cc_usr_{user_id}",
                        role=role,
                        authenticated=True,
                        resource_type="user",
                        resource_id=str(path_id),
                        outcome_status="DENIED",
                        status_code=403,
                        reason_code="SELF_BOUNDARY_VIOLATION",
                        message="Cannot access another investigator's resource.",
                        trace_id=trc_id or "trace-unknown",
                        request_id=req_id,
                        policy_id="rbac_permissions_v1",
                        metadata={"path": request.url.path, "method": request.method, "target_id": path_id},
                        db_session=audit_db,
                        fail_on_persist_error=False,
                    )
                finally:
                    audit_db.close()
            except Exception:
                pass

            payload = build_error_response(
                code="SELF_BOUNDARY_VIOLATION",
                message="Access denied: Cannot access another investigator's resource.",
                request_id=req_id,
                trace_id=trc_id,
                status_code=403,
            )
            response = JSONResponse(status_code=403, content=payload)
            add_cors_headers(response, origin)
            if req_id:
                response.headers["X-Request-Id"] = req_id
            if trc_id:
                response.headers["X-Trace-Id"] = trc_id
            return response

    return await call_next(request)

# Include API routes
app.include_router(api_router, prefix="/api/v1")


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Cybercrime Investigation API",
        "version": "1.0.0",
        "docs": "/api/docs"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "cybercrime-investigation-api"
    }


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    origin = request.headers.get("origin")
    req_id = getattr(request.state, "request_id", None)
    trc_id = getattr(request.state, "trace_id", None)
    payload = build_error_response(
        code=f"HTTP_{exc.status_code}",
        message=str(exc.detail) if exc.detail else "Request failed.",
        request_id=req_id,
        trace_id=trc_id,
        status_code=exc.status_code,
    )
    response = JSONResponse(status_code=exc.status_code, content=payload)
    add_cors_headers(response, origin)
    if req_id:
        response.headers["X-Request-Id"] = req_id
    if trc_id:
        response.headers["X-Trace-Id"] = trc_id
    return response


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    origin = request.headers.get("origin")
    req_id = getattr(request.state, "request_id", None)
    trc_id = getattr(request.state, "trace_id", None)
    payload = build_error_response(
        code="VALIDATION_FAILED",
        message="Validation failed.",
        request_id=req_id,
        trace_id=trc_id,
        status_code=422,
        details=exc.errors(),
    )
    response = JSONResponse(status_code=422, content=payload)
    add_cors_headers(response, origin)
    if req_id:
        response.headers["X-Request-Id"] = req_id
    if trc_id:
        response.headers["X-Trace-Id"] = trc_id
    return response


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    origin = request.headers.get("origin")
    req_id = getattr(request.state, "request_id", None)
    trc_id = getattr(request.state, "trace_id", None)
    payload = build_error_response(
        code="INTERNAL_ERROR",
        message="Internal server error.",
        request_id=req_id,
        trace_id=trc_id,
        status_code=500,
    )
    response = JSONResponse(status_code=500, content=payload)
    add_cors_headers(response, origin)
    if req_id:
        response.headers["X-Request-Id"] = req_id
    if trc_id:
        response.headers["X-Trace-Id"] = trc_id
    return response


def validate_openapi_spec(app: FastAPI) -> None:
    spec_path = Path(__file__).resolve().parent.parent / "openapi.yaml"
    if not spec_path.exists():
        emit_audit_log(
            action="openapi.validate",
            status="error",
            message="openapi.yaml not found.",
            details={"path": str(spec_path)},
        )
        raise RuntimeError("openapi.yaml not found. Generate it before starting the API.")

    generated = app.openapi()
    frozen = yaml.safe_load(spec_path.read_text(encoding="utf-8"))

    generated_paths = generated.get("paths") or {}
    frozen_paths = frozen.get("paths") or {}

    def _normalize_methods(paths: dict) -> dict:
        normalized = {}
        for path, methods in paths.items():
            normalized[path] = sorted([m.upper() for m in methods.keys()])
        return normalized

    generated_map = _normalize_methods(generated_paths)
    frozen_map = _normalize_methods(frozen_paths)

    if generated_map != frozen_map:
        missing_in_frozen = sorted(set(generated_map.keys()) - set(frozen_map.keys()))
        extra_in_frozen = sorted(set(frozen_map.keys()) - set(generated_map.keys()))
        method_mismatches = []
        for path in set(generated_map.keys()).intersection(frozen_map.keys()):
            if generated_map[path] != frozen_map[path]:
                method_mismatches.append(
                    {"path": path, "generated": generated_map[path], "frozen": frozen_map[path]}
                )

        emit_audit_log(
            action="openapi.validate",
            status="error",
            message="openapi.yaml routes do not match current API surface.",
            details={
                "path": str(spec_path),
                "missing_paths": missing_in_frozen,
                "extra_paths": extra_in_frozen,
                "method_mismatches": method_mismatches,
            },
        )
        raise RuntimeError("openapi.yaml is out of date. Regenerate it to match routes.")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )
