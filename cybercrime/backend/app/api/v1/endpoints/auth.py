"""
Authentication endpoints
"""

import hashlib
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
from app.db.database import get_db
from app.db.models import User
from app.core.security import verify_password, get_password_hash, create_access_token
from app.core.config import settings
from app.core.audit_logging import emit_audit_log
from app.core.canonical_event import emit_canonical_event
from app.core.threat_detection import detect_and_correlate_failed_logins
from app.api.v1.schemas import Token, UserResponse, UserCreate

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

# One message for an unknown email and for a wrong password, so a login reply never reveals which accounts exist (CYB-05).
INVALID_LOGIN_MESSAGE = "Invalid email or password."
_dummy_hash: Optional[str] = None


def _timing_dummy_hash() -> str:
    """A bcrypt hash checked for unknown emails, so they take as long to reject as a wrong password."""
    global _dummy_hash
    if _dummy_hash is None:
        _dummy_hash = get_password_hash(uuid.uuid4().hex)
    return _dummy_hash


def _account_ref(email: str, user: Optional[User]) -> str:
    """The attacked account: its user id, or a hash of the attempted email (the email itself is not stored)."""
    if user is not None:
        return f"cc_usr_{user.id}"
    return "unknown:" + hashlib.sha256(email.encode("utf-8")).hexdigest()[:16]


def _record_failed_login(db: Session, request: Request, *, email: str, user: Optional[User], reason_code: str) -> None:
    """One canonical security event per failed login (CYB-04), then the detection rule for that account.

    The attempt is unauthenticated, so the actor is anonymous and the account is the resource. Neither recording
    nor detection can turn the denial into a success: their errors are logged and the 401 stands.
    """
    trace_id = getattr(request.state, "trace_id", None) or str(uuid.uuid4())
    request_id = getattr(request.state, "request_id", None)
    account_ref = _account_ref(email, user)
    try:
        emit_canonical_event(
            event_type="auth.login", action="login",
            actor_id="anonymous", actor_type="anonymous", role="public", authenticated=False, auth_method="password",
            resource_type="user", resource_id=account_ref,
            outcome_status="DENIED", status_code=401, reason_code=reason_code, message="Login failed.",
            trace_id=trace_id, request_id=request_id,
            metadata={"client_ip": request.client.host if request.client else None, "account_known": user is not None},
            db_session=db, fail_on_persist_error=True,
        )
    except Exception as exc:
        emit_audit_log(action="auth.login.record_failed", status="error",
                       message="Could not store the failed-login security event; the login is still refused.",
                       trace_id=trace_id, request_id=request_id, details={"error": type(exc).__name__})
        return
    try:
        detect_and_correlate_failed_logins(db, account_ref=account_ref, trace_id=trace_id, request_id=request_id)
    except Exception as exc:
        db.rollback()
        emit_audit_log(action="threat_detection.error", status="error",
                       message="Threat detection failed; the login is still refused.",
                       trace_id=trace_id, request_id=request_id, details={"error": type(exc).__name__})


@router.post("/register", response_model=UserResponse)
async def register(user: UserCreate, request: Request, db: Session = Depends(get_db)):
    """Create an investigator account directly (superadmin only).

    Public sign-up is POST /api/v1/access-requests/request, which a superadmin reviews. This route used to be public
    and gave any stranger an active investigator account at once (CYB-01).
    """
    current_user = getattr(request.state, "current_user", None)
    if current_user is None or current_user.role != "superadmin":  # the RBAC middleware already enforces this
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED if current_user is None else status.HTTP_403_FORBIDDEN,
            detail="Only a superadmin can create accounts directly. Request access at /api/v1/access-requests/request.",
        )
    # Check if user exists
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user
    hashed_password = get_password_hash(user.password)
    db_user = User(
        email=user.email,
        hashed_password=hashed_password,
        full_name=user.full_name,
        role="investigator"
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


@router.post("/login", response_model=Token)
async def login(request: Request, form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Login and get access token"""
    # Normalize email (lowercase, strip whitespace)
    email = form_data.username.lower().strip()

    user = db.query(User).filter(User.email == email).first()
    password_ok = verify_password(form_data.password, user.hashed_password if user else _timing_dummy_hash())

    if user is None or not password_ok:
        _record_failed_login(db, request, email=email, user=user, reason_code="INVALID_CREDENTIALS")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=INVALID_LOGIN_MESSAGE,
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Only someone who knows the password learns that the account is deactivated.
    if not user.is_active:
        _record_failed_login(db, request, email=email, user=user, reason_code="ACCOUNT_INACTIVE")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account is deactivated. Please contact administrator.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Update last login time and create audit log
    from datetime import datetime
    from app.db.models import AuditLog
    
    user.last_login_at = datetime.utcnow()
    user.last_activity_at = datetime.utcnow()
    
    # Create audit log entry for login
    audit_log = AuditLog(
        action="auth.login",
        message="User logged in successfully.",
        entity_type="user",
        entity_id=str(user.id),
        status="success",
        details=f"User {user.email} logged in successfully",
        user_id=user.id,
        timestamp=datetime.utcnow()
    )
    db.add(audit_log)
    db.commit()
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email, "user_id": user.id, "role": user.role},
        expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=UserResponse)
async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    """Get current authenticated user"""
    from app.core.security import decode_access_token
    
    payload = decode_access_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials"
        )
    
    email = payload.get("sub")
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    return user
