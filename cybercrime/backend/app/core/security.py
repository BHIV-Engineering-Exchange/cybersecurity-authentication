"""
Security utilities for authentication and authorization
"""

from datetime import datetime, timedelta
from typing import Optional, Any
from jose import JWTError, jwt
from passlib.context import CryptContext
from app.core.config import settings
from app.core.audit_logging import emit_audit_log
import bcrypt

# Use bcrypt directly to avoid passlib compatibility issues
def get_password_hash(password: str) -> str:
    """Hash a password using bcrypt"""
    # Ensure password is a string and encode it
    if not isinstance(password, str):
        password = str(password)
    
    # Bcrypt has a 72-byte limit, so truncate if necessary
    password_bytes = password.encode('utf-8')
    if len(password_bytes) > 72:
        password_bytes = password_bytes[:72]
    
    # Generate salt and hash
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against a hash"""
    try:
        if not isinstance(plain_password, str):
            plain_password = str(plain_password)
        
        # Ensure hashed_password is a string
        if not isinstance(hashed_password, str):
            hashed_password = str(hashed_password)
        
        # Try bcrypt first (direct)
        password_bytes = plain_password.encode('utf-8')
        if len(password_bytes) > 72:
            password_bytes = password_bytes[:72]
        
        hashed_bytes = hashed_password.encode('utf-8')
        return bcrypt.checkpw(password_bytes, hashed_bytes)
    except Exception as e:
        # Fallback to passlib if bcrypt fails
        try:
            pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
            return pwd_context.verify(plain_password, hashed_password)
        except:
            emit_audit_log(
                action="auth.verify_password",
                status="error",
                message="Password verification error.",
                details={"error": str(e)},
            )
            return False


def revoke_jti(
    jti: str,
    reason: Optional[str] = None,
    revoked_by: Optional[str] = None,
    db: Optional[Any] = None,
) -> bool:
    """
    Persistently add a JWT ID (jti) to the revoked tokens database table.
    Survives application restarts and synchronizes across processes.
    """
    if not jti:
        return False
    clean_jti = str(jti).strip()
    close_db = False
    if db is None:
        from app.db.database import SessionLocal
        db = SessionLocal()
        close_db = True
    try:
        from app.db.models import RevokedToken
        existing = db.query(RevokedToken).filter(RevokedToken.jti == clean_jti).first()
        if not existing:
            rev_entry = RevokedToken(
                jti=clean_jti,
                reason=reason,
                revoked_by=revoked_by,
                revoked_at=datetime.utcnow(),
            )
            db.add(rev_entry)
            db.commit()
        return True
    except Exception as e:
        db.rollback()
        emit_audit_log(
            action="auth.revoke_jti_error",
            status="error",
            message="Failed to persist JTI revocation into database.",
            details={"jti": clean_jti, "error": str(e)},
        )
        raise e
    finally:
        if close_db:
            db.close()


def is_jti_revoked(jti: str, db: Optional[Any] = None) -> bool:
    """
    Check if a JWT ID (jti) has been persistently revoked.
    Enforces FAIL-CLOSED: if database check errors, treats token as revoked/untrusted.
    """
    if not jti:
        return False
    clean_jti = str(jti).strip()
    close_db = False
    if db is None:
        from app.db.database import SessionLocal
        db = SessionLocal()
        close_db = True
    try:
        from app.db.models import RevokedToken
        record = db.query(RevokedToken).filter(RevokedToken.jti == clean_jti).first()
        return record is not None
    except Exception as e:
        emit_audit_log(
            action="auth.revocation_check_error",
            status="error",
            message="Database error during revocation check; failing closed.",
            details={"jti": clean_jti, "error": str(e)},
        )
        # FAIL-CLOSED: Cannot establish revocation status, so token must not be accepted
        return True
    finally:
        if close_db:
            db.close()


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token with JTI for deterministic revocation tracking."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    # Ensure every issued token has a unique JTI for Tier 3 invalidation
    if "jti" not in to_encode:
        import uuid
        to_encode["jti"] = str(uuid.uuid4())

    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str, db: Optional[Any] = None) -> Optional[dict]:
    """Decode and verify a JWT token, enforcing persistent JTI blacklist revocation."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        jti = payload.get("jti")
        if jti and is_jti_revoked(jti, db=db):
            emit_audit_log(
                action="auth.revoked_token_attempt",
                status="warning",
                message="Attempted to use revoked token.",
                details={"jti": jti},
            )
            return None
        return payload
    except JWTError:
        return None

