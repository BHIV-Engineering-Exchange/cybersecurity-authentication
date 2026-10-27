"""
Admin endpoints for managing investigators
"""

import secrets
import string
from typing import Optional, List
from email.utils import parseaddr

import httpx
from fastapi import APIRouter, HTTPException, Depends, Query, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr

from app.db.database import get_db, engine
from app.db.models import User
from app.core.config import settings
from app.core.audit_logging import emit_audit_log
from app.core.security import get_password_hash

router = APIRouter()


def _get_superadmin_email() -> Optional[str]:
    if settings.SUPERADMIN_EMAIL:
        return settings.SUPERADMIN_EMAIL.lower().strip()
    return None


class SendWelcomeEmailRequest(BaseModel):
    email: EmailStr
    name: Optional[str] = "Investigator"
    location_city: Optional[str] = None
    location_country: Optional[str] = None
    location_latitude: Optional[float] = None
    location_longitude: Optional[float] = None
    location_ip: Optional[str] = None


class DatabaseStatusResponse(BaseModel):
    connected: bool
    database_type: str
    message: str


class PasswordResetRequest(BaseModel):
    email: EmailStr
    old_password: str
    new_password: str
    reset_token: Optional[str] = None


def generate_password(length: int = 12) -> str:
    """Generate a secure random password"""
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    password = ''.join(secrets.choice(alphabet) for i in range(length))
    return password


def _resolve_brevo_sender() -> tuple[Optional[str], Optional[str], Optional[str]]:
    """
    Resolve sender email/name for Brevo payload.
    Accepts MAIL_FROM as either:
      - plain email: sender@example.com
      - RFC style:   Sender Name <sender@example.com>
    """
    raw_mail_from = (settings.MAIL_FROM or "").strip()
    if not raw_mail_from:
        return None, None, "MAIL_FROM is not configured. Set MAIL_FROM to a verified sender email in Brevo."

    parsed_name, parsed_email = parseaddr(raw_mail_from)
    sender_email = (parsed_email or "").strip()
    if not sender_email or "@" not in sender_email:
        return (
            None,
            None,
            f"MAIL_FROM must be a valid sender email. Current value: '{raw_mail_from}'. "
            "Example: noreply@yourdomain.com or 'Cybercrime Team <noreply@yourdomain.com>'.",
        )

    sender_name = (settings.MAIL_FROM_NAME or "").strip() or (parsed_name or "").strip() or "Cybercrime Investigation System"
    return sender_email, sender_name, None


def send_email_via_brevo(to_email: str, subject: str, html_content: str, text_content: str) -> tuple[bool, str]:
    """
    Send email using Brevo HTTPS API (NOT SMTP).
    
    This uses Brevo's REST API over HTTPS (https://api.brevo.com/v3/smtp/email),
    which works on Render's free tier since it doesn't require SMTP ports (587/465).
    No SMTP protocol or ports are used - only standard HTTPS requests.

    Returns:
        tuple: (success: bool, error_message: str)
    """
    if not settings.EMAIL_ENABLED:
        return False, "Email delivery is disabled. Please set EMAIL_ENABLED=true in your environment variables."

    if not settings.BREVO_API_KEY:
        return False, "BREVO_API_KEY is not configured. Please set BREVO_API_KEY in your environment variables."

    sender_email, sender_name, sender_error = _resolve_brevo_sender()
    if sender_error:
        return False, sender_error

    try:
        payload = {
            "sender": {
                "name": sender_name,
                "email": sender_email,
            },
            "to": [{"email": to_email}],
            "subject": subject,
            "htmlContent": html_content,
            "textContent": text_content,
        }

        headers = {
            "accept": "application/json",
            "content-type": "application/json",
            "api-key": settings.BREVO_API_KEY,
        }

        emit_audit_log(
            action="email.send",
            status="info",
            message="Sending email via Brevo HTTPS API (not SMTP).",
            entity_type="email",
            entity_id=to_email,
        )
        
        # IMPORTANT: This is Brevo's HTTPS REST API, NOT SMTP protocol
        # The URL path contains "smtp" but this is just Brevo's naming - it's actually HTTPS
        # Uses standard HTTPS port 443 (not SMTP ports 587/465) - works on Render free tier
        with httpx.Client(timeout=15.0, verify=settings.VALIDATE_CERTS) as client:
            response = client.post(
                "https://api.brevo.com/v3/smtp/email",  # HTTPS REST API endpoint (NOT SMTP protocol)
                headers=headers,
                json=payload,
            )

        if 200 <= response.status_code < 300:
            emit_audit_log(
                action="email.send",
                status="success",
                message="Email sent via Brevo API.",
                entity_type="email",
                entity_id=to_email,
            )
            return True, ""

        response_text = response.text or ""
        if response.status_code == 400 and "valid sender email required" in response_text.lower():
            error_msg = (
                "Brevo rejected MAIL_FROM. Use a real verified sender email in Brevo. "
                f"Current MAIL_FROM='{settings.MAIL_FROM}'."
            )
        else:
            error_msg = f"Brevo API error {response.status_code}: {response_text}"
        emit_audit_log(
            action="email.send",
            status="error",
            message="Brevo API error.",
            entity_type="email",
            entity_id=to_email,
            details={"error": error_msg, "status_code": response.status_code},
        )
        return False, error_msg

    except Exception as e:
        error_msg = f"Unexpected error calling Brevo API: {type(e).__name__}: {str(e)}"
        emit_audit_log(
            action="email.send",
            status="error",
            message="Brevo API exception.",
            entity_type="email",
            entity_id=to_email,
            details={"error": error_msg},
        )
        import traceback
        traceback.print_exc()
        return False, error_msg


@router.post("/init-superadmin")
async def init_superadmin(request: Request, db: Session = Depends(get_db)):
    """Initialize or reset superadmin account (ensures account exists with correct password)"""
    if not settings.SUPERADMIN_BOOTSTRAP_ENABLED:
        raise HTTPException(status_code=403, detail="Superadmin bootstrap is disabled.")
    if not settings.SUPERADMIN_EMAIL or not settings.SUPERADMIN_PASSWORD:
        raise HTTPException(status_code=400, detail="Superadmin credentials are not configured.")
    if not settings.SUPERADMIN_BOOTSTRAP_TOKEN:
        raise HTTPException(status_code=400, detail="Bootstrap token is not configured.")

    superadmin_email = _get_superadmin_email()
    if not superadmin_email:
        raise HTTPException(status_code=400, detail="Superadmin email is not configured.")

    # Require bootstrap token for explicit initialization
    token_header = request.headers.get("X-Bootstrap-Token")
    if token_header != settings.SUPERADMIN_BOOTSTRAP_TOKEN:
        raise HTTPException(status_code=401, detail="Invalid bootstrap token.")
    
    # Check if superadmin already exists
    existing_user = db.query(User).filter(User.email == superadmin_email).first()
    
    if existing_user:
        # Update existing account to ensure it's correct
        existing_user.role = "superadmin"
        existing_user.is_active = True
        if settings.SUPERADMIN_BOOTSTRAP_FORCE_RESET:
            existing_user.hashed_password = get_password_hash(settings.SUPERADMIN_PASSWORD)
        existing_user.full_name = "Super Admin"
        db.commit()
        db.refresh(existing_user)
        
        return {
            "success": True,
            "message": "Superadmin account verified",
            "email": existing_user.email,
            "role": existing_user.role,
            "action": "updated"
        }
    else:
        # Create new superadmin account
        hashed_password = get_password_hash(settings.SUPERADMIN_PASSWORD)
        superadmin = User(
            email=superadmin_email,
            full_name="Super Admin",
            hashed_password=hashed_password,
            role="superadmin",
            is_active=True
        )
        db.add(superadmin)
        db.commit()
        db.refresh(superadmin)
        
        return {
            "success": True,
            "message": "Superadmin account created successfully",
            "email": superadmin.email,
            "role": superadmin.role,
            "action": "created"
        }


@router.post("/reset-password")
async def reset_password(request: PasswordResetRequest, db: Session = Depends(get_db)):
    """Reset password for an investigator - requires old password verification"""
    from app.core.security import verify_password
    
    # Find user by email
    user = db.query(User).filter(User.email == request.email.lower().strip()).first()
    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )
    
    # Verify old password
    if not verify_password(request.old_password, user.hashed_password):
        raise HTTPException(
            status_code=400,
            detail="Old password is incorrect"
        )
    
    # Check if new password is different from old password
    if verify_password(request.new_password, user.hashed_password):
        raise HTTPException(
            status_code=400,
            detail="New password must be different from the old password"
        )
    
    # Hash the new password
    from datetime import datetime
    hashed_password = get_password_hash(request.new_password)
    user.hashed_password = hashed_password
    user.password_changed_at = datetime.utcnow()  # Track password change
    db.commit()
    db.refresh(user)
    
    return {
        "success": True,
        "message": "Password reset successfully",
        "email": user.email
    }


@router.get("/check-superadmin")
async def check_superadmin(db: Session = Depends(get_db)):
    """Check if superadmin account exists"""
    superadmin_email = _get_superadmin_email()
    if not superadmin_email:
        return {"exists": False, "message": "Superadmin email is not configured."}
    user = db.query(User).filter(User.email == superadmin_email).first()
    
    if user:
        return {
            "exists": True,
            "email": user.email,
            "role": user.role,
            "is_active": user.is_active
        }
    else:
        return {
            "exists": False,
            "message": "Superadmin account not found. Please initialize it first."
        }


@router.delete("/delete-all-investigators")
async def delete_all_investigators(db: Session = Depends(get_db)):
    """Delete all investigator accounts (except superadmin)"""
    superadmin_email = _get_superadmin_email()
    
    # Get all investigators (excluding superadmin)
    investigators = db.query(User).filter(
        User.role == "investigator"
    ).all()
    
    count = len(investigators)
    
    if count == 0:
        return {
            "success": True,
            "message": "No investigator accounts found to delete",
            "deleted_count": 0
        }
    
    # Delete all investigators
    for investigator in investigators:
        db.delete(investigator)
    
    db.commit()
    
    return {
        "success": True,
        "message": f"Successfully deleted {count} investigator account(s)",
        "deleted_count": count
    }


@router.get("/investigators")
async def list_investigators(db: Session = Depends(get_db)):
    """Get list of all investigators (excludes superadmin)"""
    superadmin_email = _get_superadmin_email()
    
    # Get all investigators, explicitly excluding superadmin
    query = db.query(User).filter(User.role == "investigator")
    if superadmin_email:
        query = query.filter(User.email != superadmin_email)
    investigators = query.all()
    
    return {
        "count": len(investigators),
        "investigators": [
            {
                "id": inv.id,
                "email": inv.email,
                "full_name": inv.full_name,
                "is_active": inv.is_active,
                "location_city": inv.location_city,
                "location_country": inv.location_country,
                "location_latitude": inv.location_latitude,
                "location_longitude": inv.location_longitude,
                "location_ip": inv.location_ip,
                "created_at": inv.created_at.isoformat() if inv.created_at else None
            }
            for inv in investigators
        ]
    }


@router.get("/location-from-ip")
async def get_location_from_ip(ip_address: Optional[str] = None):
    """Get location information from IP address using ip-api.com (free tier)"""
    import httpx
    
    # If no IP provided, try to get from request (would need Request dependency)
    if not ip_address:
        raise HTTPException(status_code=400, detail="IP address is required")
    
    try:
        # Using ip-api.com free tier (no API key needed, 45 requests/minute limit)
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"http://ip-api.com/json/{ip_address}")
            
            if response.status_code == 200:
                data = response.json()
                if data.get("status") == "success":
                    return {
                        "success": True,
                        "city": data.get("city"),
                        "country": data.get("country"),
                        "countryCode": data.get("countryCode"),
                        "region": data.get("regionName"),
                        "latitude": data.get("lat"),
                        "longitude": data.get("lon"),
                        "timezone": data.get("timezone"),
                        "isp": data.get("isp"),
                        "ip": data.get("query")
                    }
                else:
                    raise HTTPException(status_code=502, detail=data.get("message", "Failed to get location"))
            else:
                raise HTTPException(status_code=502, detail=f"API returned status {response.status_code}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching location: {str(e)}")


@router.delete("/investigators/{investigator_id}")
async def delete_investigator(investigator_id: int, db: Session = Depends(get_db)):
    """Delete a single investigator by ID"""
    superadmin_email = _get_superadmin_email()
    
    # Find the investigator
    investigator = db.query(User).filter(User.id == investigator_id).first()
    
    if not investigator:
        raise HTTPException(
            status_code=404,
            detail="Investigator not found"
        )
    
    # Prevent deletion of superadmin
    if superadmin_email and investigator.email.lower().strip() == superadmin_email:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete superadmin account"
        )
    
    # Only allow deletion of investigators
    if investigator.role != "investigator":
        raise HTTPException(
            status_code=400,
            detail="Can only delete investigator accounts"
        )
    
    # Delete the investigator
    db.delete(investigator)
    db.commit()
    
    return {
        "success": True,
        "message": f"Investigator {investigator.email} deleted successfully",
        "deleted_id": investigator_id
    }


@router.get("/email-config")
async def check_email_config():
    """Check email configuration status"""
    sender_email, _, sender_error = _resolve_brevo_sender()
    config_status = {
        "EMAIL_ENABLED": settings.EMAIL_ENABLED,
        "BREVO_API_KEY_PRESENT": bool(settings.BREVO_API_KEY),
        "BREVO_API_KEY_LENGTH": len(settings.BREVO_API_KEY) if settings.BREVO_API_KEY else 0,
        "MAIL_FROM": settings.MAIL_FROM,
        "MAIL_FROM_PARSED_EMAIL": sender_email,
        "MAIL_FROM_VALID": sender_error is None,
        "MAIL_FROM_ERROR": sender_error,
        "MAIL_FROM_NAME": settings.MAIL_FROM_NAME,
        "FRONTEND_BASE_URL": settings.FRONTEND_BASE_URL,
    }
    return config_status


@router.get("/database/status")
async def check_database_status():
    """Check database connection status"""
    try:
        # Try to connect to the database
        with engine.connect() as conn:
            # Execute a simple query to verify connection
            from sqlalchemy import text
            conn.execute(text("SELECT 1"))
            
        database_type = "SQLite" if "sqlite" in settings.DATABASE_URL else "PostgreSQL"
        return DatabaseStatusResponse(
            connected=True,
            database_type=database_type,
            message=f"Successfully connected to {database_type} database"
        )
    except Exception as e:
        return DatabaseStatusResponse(
            connected=False,
            database_type="Unknown",
            message=f"Database connection failed: {str(e)}"
        )


@router.post("/send-welcome-email")
async def send_welcome_email(request: SendWelcomeEmailRequest, db: Session = Depends(get_db)):
    """Create investigator account and send welcome email with auto-generated password and reset link"""
    
    try:
        # Check if user already exists
        existing_user = db.query(User).filter(User.email == request.email).first()
        if existing_user:
            raise HTTPException(
                status_code=400,
                detail=f"User with email {request.email} already exists"
            )
        
        # Generate unique password
        password = generate_password(16)
        
        # Hash the password
        hashed_password = get_password_hash(password)
        
        # Create user account in database
        new_user = User(
            email=request.email,
            full_name=request.name or "Investigator",
            hashed_password=hashed_password,
            role="investigator",
            is_active=True,
            location_city=request.location_city,
            location_country=request.location_country,
            location_latitude=request.location_latitude,
            location_longitude=request.location_longitude,
            location_ip=request.location_ip
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        # Generate password reset token (in production, store this in DB with expiration)
        reset_token = secrets.token_urlsafe(32)
        # Use FRONTEND_BASE_URL from settings, or default to Render frontend URL
        base_url = settings.FRONTEND_BASE_URL or "https://cybercrime-frontend.onrender.com"
        reset_link = f"{base_url.rstrip('/')}/reset-password?token={reset_token}&email={request.email}"
        
        # Email content
        subject = "Welcome to Cybercrime Investigation System"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #10b981 0%, #06b6d4 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }}
                .content {{ background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }}
                .credentials {{ background: #1f2937; color: #10b981; padding: 15px; border-radius: 5px; margin: 20px 0; font-family: monospace; }}
                .button {{ display: inline-block; padding: 12px 24px; background: #10b981; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
                .footer {{ text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🔒 Cybercrime Investigation System</h1>
                </div>
                <div class="content">
                    <h2>Welcome, {request.name or 'Investigator'}!</h2>
                    <p>Your account has been created in the Cybercrime Investigation System. Below are your login credentials:</p>
                    
                    <div class="credentials">
                        <strong>Email:</strong> {request.email}<br>
                        <strong>Password:</strong> {password}
                    </div>
                    
                    <p><strong>Important Security Notice:</strong></p>
                    <ul>
                        <li>Please change your password immediately after first login</li>
                        <li>Do not share your password with anyone</li>
                        <li>If you did not request this account, please contact the administrator</li>
                    </ul>
                    
                    <p>To reset your password, click the button below:</p>
                    <a href="{reset_link}" class="button">Reset Password</a>
                    
                    <p>Or copy and paste this link into your browser:</p>
                    <p style="word-break: break-all; color: #6b7280; font-size: 12px;">{reset_link}</p>
                </div>
                <div class="footer">
                    <p>This is an automated message. Please do not reply to this email.</p>
                    <p>&copy; 2024 Cybercrime Investigation System. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        text_content = f"""
        Welcome to Cybercrime Investigation System
        
        Hello {request.name or 'Investigator'},
        
        Your account has been created. Here are your login credentials:
        
        Email: {request.email}
        Password: {password}
        
        Important Security Notice:
        - Please change your password immediately after first login
        - Do not share your password with anyone
        - If you did not request this account, please contact the administrator
        
        To reset your password, visit:
        {reset_link}
        
        This is an automated message. Please do not reply to this email.
        
        © 2024 Cybercrime Investigation System. All rights reserved.
        """
        
        # Send email using Brevo HTTPS API (NOT SMTP) - only return success if email was actually sent
        success, error_message = send_email_via_brevo(request.email, subject, html_content, text_content)
        
        if not success:
            # Rollback user creation if email fails
            db.rollback()
            emit_audit_log(
                action="investigator.create",
                status="error",
                message=f"Investigator account creation failed: Brevo HTTPS API email sending failed: {error_message}",
                entity_type="user",
                details={"email": request.email, "error": error_message, "method": "Brevo HTTPS API (not SMTP)"}
            )
            raise HTTPException(
                status_code=500,
                detail=f"Failed to send welcome email via Brevo HTTPS API: {error_message}. Note: We use Brevo's HTTPS REST API (not SMTP protocol)."
            )
        
        # Email sent successfully - return success with reset link
        return {
            "success": True,
            "message": f"Investigator account created and welcome email sent successfully to {request.email}",
            "user_id": new_user.id,
            "email": new_user.email,
            "reset_link": reset_link,
        }
    
    except HTTPException:
        # Re-raise HTTP exceptions (like 400 for existing user)
        raise
    except Exception as e:
        # Rollback database transaction on any unexpected error
        db.rollback()
        error_msg = f"Unexpected error creating investigator account: {type(e).__name__}: {str(e)}"
        emit_audit_log(
            action="investigator.create",
            status="error",
            message=error_msg,
            entity_type="user",
            details={"email": request.email, "error": str(e)}
        )
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=error_msg
        )


@router.get("/{investigator_id}/activity")
async def get_investigator_activity(investigator_id: int, db: Session = Depends(get_db)):
    """Get comprehensive activity data for a specific investigator"""
    from datetime import datetime, timedelta
    from sqlalchemy import func, and_
    from app.db.models import Evidence, Complaint, IncidentReport, WatchlistWallet, User
    
    # Get the investigator
    investigator = db.query(User).filter(User.id == investigator_id).first()
    if not investigator:
        raise HTTPException(status_code=404, detail="Investigator not found")
    
    if investigator.role != "investigator":
        raise HTTPException(status_code=400, detail="User is not an investigator")
    
    # Calculate date ranges
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=7)
    month_start = today_start - timedelta(days=30)
    
    # Evidence uploads
    evidence_today = db.query(func.count(Evidence.id)).filter(
        and_(
            Evidence.investigator_id == investigator_id,
            Evidence.created_at >= today_start
        )
    ).scalar() or 0
    
    evidence_week = db.query(func.count(Evidence.id)).filter(
        and_(
            Evidence.investigator_id == investigator_id,
            Evidence.created_at >= week_start
        )
    ).scalar() or 0
    
    evidence_month = db.query(func.count(Evidence.id)).filter(
        and_(
            Evidence.investigator_id == investigator_id,
            Evidence.created_at >= month_start
        )
    ).scalar() or 0
    
    evidence_total = db.query(func.count(Evidence.id)).filter(
        Evidence.investigator_id == investigator_id
    ).scalar() or 0
    
    # Complaints filed
    complaints_today = db.query(func.count(Complaint.id)).filter(
        and_(
            Complaint.created_at >= today_start
        )
    ).scalar() or 0  # Note: Complaint doesn't have investigator_id, using created_at as proxy
    
    complaints_week = db.query(func.count(Complaint.id)).filter(
        and_(
            Complaint.created_at >= week_start
        )
    ).scalar() or 0
    
    complaints_month = db.query(func.count(Complaint.id)).filter(
        and_(
            Complaint.created_at >= month_start
        )
    ).scalar() or 0
    
    complaints_total = db.query(func.count(Complaint.id)).scalar() or 0
    
    # Incident reports (AI analysis)
    # Note: IncidentReport doesn't have investigator_id, we'll need to estimate based on created_at
    # For now, we'll get all reports and let frontend filter if needed
    reports_today = db.query(func.count(IncidentReport.id)).filter(
        and_(
            IncidentReport.created_at >= today_start
        )
    ).scalar() or 0
    
    reports_week = db.query(func.count(IncidentReport.id)).filter(
        and_(
            IncidentReport.created_at >= week_start
        )
    ).scalar() or 0
    
    reports_month = db.query(func.count(IncidentReport.id)).filter(
        and_(
            IncidentReport.created_at >= month_start
        )
    ).scalar() or 0
    
    reports_total = db.query(func.count(IncidentReport.id)).scalar() or 0
    
    # Watchlist entries
    watchlist_today = db.query(func.count(WatchlistWallet.id)).filter(
        and_(
            WatchlistWallet.created_by == investigator_id,
            WatchlistWallet.created_at >= today_start
        )
    ).scalar() or 0
    
    watchlist_week = db.query(func.count(WatchlistWallet.id)).filter(
        and_(
            WatchlistWallet.created_by == investigator_id,
            WatchlistWallet.created_at >= week_start
        )
    ).scalar() or 0
    
    watchlist_month = db.query(func.count(WatchlistWallet.id)).filter(
        and_(
            WatchlistWallet.created_by == investigator_id,
            WatchlistWallet.created_at >= month_start
        )
    ).scalar() or 0
    
    watchlist_total = db.query(func.count(WatchlistWallet.id)).filter(
        WatchlistWallet.created_by == investigator_id
    ).scalar() or 0
    
    # Get recent activity timeline (last 50 activities)
    activities = []
    
    # Recent evidence uploads
    recent_evidence = db.query(Evidence).filter(
        Evidence.investigator_id == investigator_id
    ).order_by(Evidence.created_at.desc()).limit(20).all()
    
    for ev in recent_evidence:
        activities.append({
            "type": "evidence_upload",
            "action": "Uploaded evidence",
            "description": ev.title or ev.evidence_id,
            "timestamp": ev.created_at.isoformat() if ev.created_at else None,
            "entity_id": ev.id
        })
    
    # Recent watchlist additions
    recent_watchlist = db.query(WatchlistWallet).filter(
        WatchlistWallet.created_by == investigator_id
    ).order_by(WatchlistWallet.created_at.desc()).limit(10).all()
    
    for wl in recent_watchlist:
        activities.append({
            "type": "watchlist_add",
            "action": "Added to watchlist",
            "description": wl.wallet_address,
            "timestamp": wl.created_at.isoformat() if wl.created_at else None,
            "entity_id": wl.id
        })
    
    # Sort activities by timestamp (most recent first)
    activities.sort(key=lambda x: x["timestamp"] or "", reverse=True)
    activities = activities[:50]  # Limit to 50 most recent
    
    return {
        "investigator": {
            "id": investigator.id,
            "email": investigator.email,
            "full_name": investigator.full_name,
            "is_active": investigator.is_active,
            "last_login_at": investigator.last_login_at.isoformat() if investigator.last_login_at else None,
            "last_activity_at": investigator.last_activity_at.isoformat() if investigator.last_activity_at else None,
            "created_at": investigator.created_at.isoformat() if investigator.created_at else None
        },
        "statistics": {
            "evidence": {
                "today": evidence_today,
                "week": evidence_week,
                "month": evidence_month,
                "total": evidence_total
            },
            "complaints": {
                "today": complaints_today,
                "week": complaints_week,
                "month": complaints_month,
                "total": complaints_total
            },
            "incident_reports": {
                "today": reports_today,
                "week": reports_week,
                "month": reports_month,
                "total": reports_total
            },
            "watchlist": {
                "today": watchlist_today,
                "week": watchlist_week,
                "month": watchlist_month,
                "total": watchlist_total
            }
        },
        "activity_timeline": activities
    }


@router.get("/activity/all")
async def get_all_investigators_activity(db: Session = Depends(get_db)):
    """Get activity summary for all investigators"""
    from datetime import datetime, timedelta
    from sqlalchemy import func, and_
    from app.db.models import Evidence, Complaint, IncidentReport, WatchlistWallet, User
    
    superadmin_email = _get_superadmin_email()
    
    # Get all investigators
    query = db.query(User).filter(User.role == "investigator")
    if superadmin_email:
        query = query.filter(User.email != superadmin_email)
    investigators = query.all()
    
    # Calculate date ranges
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=7)
    month_start = today_start - timedelta(days=30)
    
    result = []
    
    for inv in investigators:
        # Quick stats for each investigator
        evidence_count = db.query(func.count(Evidence.id)).filter(
            Evidence.investigator_id == inv.id
        ).scalar() or 0
        
        watchlist_count = db.query(func.count(WatchlistWallet.id)).filter(
            WatchlistWallet.created_by == inv.id
        ).scalar() or 0
        
        # Get last activity (most recent evidence or watchlist entry)
        last_evidence = db.query(Evidence).filter(
            Evidence.investigator_id == inv.id
        ).order_by(Evidence.created_at.desc()).first()
        
        last_watchlist = db.query(WatchlistWallet).filter(
            WatchlistWallet.created_by == inv.id
        ).order_by(WatchlistWallet.created_at.desc()).first()
        
        last_activity = None
        if last_evidence and last_watchlist:
            last_activity = max(last_evidence.created_at, last_watchlist.created_at) if last_evidence.created_at and last_watchlist.created_at else (last_evidence.created_at or last_watchlist.created_at)
        elif last_evidence:
            last_activity = last_evidence.created_at
        elif last_watchlist:
            last_activity = last_watchlist.created_at
        
        result.append({
            "id": inv.id,
            "email": inv.email,
            "full_name": inv.full_name,
            "is_active": inv.is_active,
            "last_login_at": inv.last_login_at.isoformat() if inv.last_login_at else None,
            "last_activity_at": inv.last_activity_at.isoformat() if inv.last_activity_at else None,
            "evidence_count": evidence_count,
            "watchlist_count": watchlist_count,
            "last_activity": last_activity.isoformat() if last_activity else None
        })
    
    return {
        "count": len(result),
        "investigators": result
    }


@router.get("/{investigator_id}/activity-logs")
async def get_investigator_activity_logs(
    investigator_id: int,
    skip: int = 0,
    limit: int = 100,
    action_type: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get detailed activity logs for a specific investigator"""
    from datetime import datetime
    from sqlalchemy import and_
    from app.db.models import AuditLog, Evidence, Complaint, IncidentReport, WatchlistWallet, User
    
    # Verify investigator exists
    investigator = db.query(User).filter(User.id == investigator_id).first()
    if not investigator:
        raise HTTPException(status_code=404, detail="Investigator not found")
    
    if investigator.role != "investigator":
        raise HTTPException(status_code=400, detail="User is not an investigator")
    
    # Build query for audit logs
    query = db.query(AuditLog).filter(AuditLog.user_id == investigator_id)
    
    # Apply filters
    if action_type:
        query = query.filter(AuditLog.action.ilike(f"%{action_type}%"))
    
    if start_date:
        try:
            start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            query = query.filter(AuditLog.timestamp >= start_dt)
        except:
            pass
    
    if end_date:
        try:
            end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
            query = query.filter(AuditLog.timestamp <= end_dt)
        except:
            pass
    
    # Get audit logs
    audit_logs = query.order_by(AuditLog.timestamp.desc()).offset(skip).limit(limit).all()
    
    # Also get activity from other tables
    activities = []
    
    # Evidence uploads
    evidence_list = db.query(Evidence).filter(
        Evidence.investigator_id == investigator_id
    ).order_by(Evidence.created_at.desc()).limit(50).all()
    
    for ev in evidence_list:
        activities.append({
            "type": "evidence_upload",
            "action": "Evidence Uploaded",
            "entity_type": "evidence",
            "entity_id": str(ev.id),
            "details": f"Uploaded: {ev.title or ev.evidence_id}",
            "timestamp": ev.created_at.isoformat() if ev.created_at else None,
            "ip_address": None
        })
    
    # Complaints filed
    complaints_list = db.query(Complaint).filter(
        Complaint.investigator_id == investigator_id
    ).order_by(Complaint.created_at.desc()).limit(50).all()
    
    for comp in complaints_list:
        activities.append({
            "type": "complaint_filed",
            "action": "Complaint Filed",
            "entity_type": "complaint",
            "entity_id": str(comp.id),
            "details": f"Filed complaint for wallet: {comp.wallet_address}",
            "timestamp": comp.created_at.isoformat() if comp.created_at else None,
            "ip_address": comp.investigator_location_ip
        })
    
    # Incident reports
    reports_list = db.query(IncidentReport).filter(
        IncidentReport.investigator_id == investigator_id
    ).order_by(IncidentReport.created_at.desc()).limit(50).all()
    
    for rep in reports_list:
        activities.append({
            "type": "incident_report",
            "action": "AI Report Generated",
            "entity_type": "incident_report",
            "entity_id": str(rep.id),
            "details": f"Generated report for wallet: {rep.wallet_address} (Risk: {rep.risk_level})",
            "timestamp": rep.created_at.isoformat() if rep.created_at else None,
            "ip_address": None
        })
    
    # Watchlist entries
    watchlist_list = db.query(WatchlistWallet).filter(
        WatchlistWallet.created_by == investigator_id
    ).order_by(WatchlistWallet.created_at.desc()).limit(50).all()
    
    for wl in watchlist_list:
        activities.append({
            "type": "watchlist_add",
            "action": "Added to Watchlist",
            "entity_type": "watchlist",
            "entity_id": str(wl.id),
            "details": f"Added wallet to watchlist: {wl.wallet_address}",
            "timestamp": wl.created_at.isoformat() if wl.created_at else None,
            "ip_address": None
        })
    
    # Convert audit logs to activity format
    for log in audit_logs:
        activities.append({
            "type": "audit_log",
            "action": log.action,
            "entity_type": log.entity_type,
            "entity_id": log.entity_id,
            "details": log.details or "",
            "timestamp": log.timestamp.isoformat() if log.timestamp else None,
            "ip_address": log.ip_address
        })
    
    # Sort by timestamp (most recent first)
    activities.sort(key=lambda x: x["timestamp"] or "", reverse=True)
    
    # Apply pagination
    total_count = len(activities)
    paginated_activities = activities[skip:skip + limit]
    
    return {
        "investigator": {
            "id": investigator.id,
            "email": investigator.email,
            "full_name": investigator.full_name
        },
        "total_count": total_count,
        "activities": paginated_activities
    }


@router.post("/bulk-action")
async def bulk_investigator_action(
    action: str,
    investigator_ids: List[int],
    db: Session = Depends(get_db)
):
    """Perform bulk actions on investigators"""
    from app.db.models import User
    
    superadmin_email = _get_superadmin_email()
    
    results = []
    
    for inv_id in investigator_ids:
        investigator = db.query(User).filter(User.id == inv_id).first()
        
        if not investigator:
            results.append({"id": inv_id, "success": False, "message": "Investigator not found"})
            continue
        
        if superadmin_email and investigator.email.lower().strip() == superadmin_email:
            results.append({"id": inv_id, "success": False, "message": "Cannot modify superadmin"})
            continue
        
        try:
            if action == "activate":
                investigator.is_active = True
                results.append({"id": inv_id, "success": True, "message": "Activated"})
            elif action == "deactivate":
                investigator.is_active = False
                results.append({"id": inv_id, "success": True, "message": "Deactivated"})
            else:
                results.append({"id": inv_id, "success": False, "message": f"Unknown action: {action}"})
        except Exception as e:
            results.append({"id": inv_id, "success": False, "message": str(e)})
    
    db.commit()
    
    return {
        "action": action,
        "total": len(investigator_ids),
        "results": results
    }


@router.get("/{investigator_id}/status")
async def get_investigator_status(investigator_id: int, db: Session = Depends(get_db)):
    """Get comprehensive status and health metrics for an investigator"""
    from datetime import datetime, timedelta
    from sqlalchemy import func, and_
    from app.db.models import User, AuditLog
    
    # Get the investigator
    investigator = db.query(User).filter(User.id == investigator_id).first()
    if not investigator:
        raise HTTPException(status_code=404, detail="Investigator not found")
    
    if investigator.role != "investigator":
        raise HTTPException(status_code=400, detail="User is not an investigator")
    
    now = datetime.utcnow()
    
    # Determine online/offline status (online if activity within last 15 minutes)
    is_online = False
    session_duration = None
    if investigator.last_activity_at:
        time_since_activity = now - investigator.last_activity_at
        is_online = time_since_activity.total_seconds() < 900  # 15 minutes
        
        # Calculate session duration (time since last login)
        if investigator.last_login_at:
            session_duration = (now - investigator.last_login_at).total_seconds()
    
    # Calculate login frequency (logins in last 7 and 30 days)
    seven_days_ago = now - timedelta(days=7)
    thirty_days_ago = now - timedelta(days=30)
    
    # Count login events from audit logs
    login_count_7d = db.query(func.count(AuditLog.id)).filter(
        and_(
            AuditLog.user_id == investigator_id,
            AuditLog.action.ilike("%login%"),
            AuditLog.timestamp >= seven_days_ago
        )
    ).scalar() or 0
    
    login_count_30d = db.query(func.count(AuditLog.id)).filter(
        and_(
            AuditLog.user_id == investigator_id,
            AuditLog.action.ilike("%login%"),
            AuditLog.timestamp >= thirty_days_ago
        )
    ).scalar() or 0
    
    # Calculate password age
    password_age_days = None
    if investigator.password_changed_at:
        password_age = now - investigator.password_changed_at
        password_age_days = password_age.days
    elif investigator.created_at:
        # If password_changed_at is not set, use created_at as fallback
        password_age = now - investigator.created_at
        password_age_days = password_age.days
    
    # Determine password health status
    password_status = "good"
    if password_age_days is not None:
        if password_age_days > 90:
            password_status = "expired"
        elif password_age_days > 60:
            password_status = "warning"
    
    # Calculate activity score (based on recent activity)
    activity_score = 0
    if investigator.last_activity_at:
        hours_since_activity = (now - investigator.last_activity_at).total_seconds() / 3600
        if hours_since_activity < 24:
            activity_score = 100
        elif hours_since_activity < 72:
            activity_score = 75
        elif hours_since_activity < 168:  # 7 days
            activity_score = 50
        elif hours_since_activity < 720:  # 30 days
            activity_score = 25
        else:
            activity_score = 0
    
    return {
        "investigator": {
            "id": investigator.id,
            "email": investigator.email,
            "full_name": investigator.full_name,
            "is_active": investigator.is_active,
            "created_at": investigator.created_at.isoformat() if investigator.created_at else None
        },
        "status": {
            "is_online": is_online,
            "last_login_at": investigator.last_login_at.isoformat() if investigator.last_login_at else None,
            "last_activity_at": investigator.last_activity_at.isoformat() if investigator.last_activity_at else None,
            "session_duration_seconds": int(session_duration) if session_duration else None,
            "session_duration_formatted": format_duration(session_duration) if session_duration else None
        },
        "health_metrics": {
            "account_status": "active" if investigator.is_active else "inactive",
            "password_age_days": password_age_days,
            "password_status": password_status,
            "two_factor_enabled": investigator.two_factor_enabled or False,
            "activity_score": activity_score
        },
        "login_frequency": {
            "last_7_days": login_count_7d,
            "last_30_days": login_count_30d
        },
        "location": {
            "city": investigator.location_city,
            "country": investigator.location_country,
            "latitude": investigator.location_latitude,
            "longitude": investigator.location_longitude,
            "ip_address": investigator.location_ip,
            "last_updated": investigator.last_activity_at.isoformat() if investigator.last_activity_at else None
        }
    }


@router.get("/{investigator_id}/dashboard")
async def get_investigator_dashboard(
    investigator_id: int,
    db: Session = Depends(get_db)
):
    """Get investigator self-service dashboard stats"""
    from datetime import datetime, timedelta
    from sqlalchemy import func, and_
    from app.db.models import Complaint, IncidentReport, Evidence, Message
    
    # Verify investigator exists
    investigator = db.query(User).filter(User.id == investigator_id).first()
    if not investigator:
        raise HTTPException(status_code=404, detail="Investigator not found")
    
    # Get stats
    total_complaints = db.query(Complaint).filter(Complaint.investigator_id == investigator_id).count()
    active_complaints = db.query(Complaint).filter(
        and_(
            Complaint.investigator_id == investigator_id,
            Complaint.status.in_(["submitted", "under_review"])
        )
    ).count()
    
    total_reports = db.query(IncidentReport).filter(IncidentReport.investigator_id == investigator_id).count()
    active_reports = db.query(IncidentReport).filter(
        and_(
            IncidentReport.investigator_id == investigator_id,
            IncidentReport.status.in_(["investigating", "under_review"])
        )
    ).count()
    
    total_evidence = db.query(Evidence).filter(Evidence.investigator_id == investigator_id).count()
    
    unread_messages = db.query(Message).filter(
        and_(
            Message.recipient_id == investigator_id,
            Message.is_read == False
        )
    ).count()
    
    # Recent activity (last 7 days)
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    recent_complaints = db.query(Complaint).filter(
        and_(
            Complaint.investigator_id == investigator_id,
            Complaint.created_at >= seven_days_ago
        )
    ).count()
    
    recent_reports = db.query(IncidentReport).filter(
        and_(
            IncidentReport.investigator_id == investigator_id,
            IncidentReport.created_at >= seven_days_ago
        )
    ).count()
    
    recent_evidence = db.query(Evidence).filter(
        and_(
            Evidence.investigator_id == investigator_id,
            Evidence.created_at >= seven_days_ago
        )
    ).count()
    
    # Activity timeline (last 10 actions)
    recent_activities = []
    
    # Get recent complaints
    recent_complaints_list = db.query(Complaint).filter(
        Complaint.investigator_id == investigator_id
    ).order_by(Complaint.created_at.desc()).limit(5).all()
    for c in recent_complaints_list:
        recent_activities.append({
            "type": "complaint",
            "id": c.id,
            "title": f"Filed complaint for {c.wallet_address[:10]}...",
            "timestamp": c.created_at.isoformat() if c.created_at else None,
            "status": c.status
        })
    
    # Get recent reports
    recent_reports_list = db.query(IncidentReport).filter(
        IncidentReport.investigator_id == investigator_id
    ).order_by(IncidentReport.created_at.desc()).limit(5).all()
    for r in recent_reports_list:
        recent_activities.append({
            "type": "report",
            "id": r.id,
            "title": f"AI analysis for {r.wallet_address[:10]}...",
            "timestamp": r.created_at.isoformat() if r.created_at else None,
            "status": r.status,
            "risk_level": r.risk_level
        })
    
    # Get recent evidence
    recent_evidence_list = db.query(Evidence).filter(
        Evidence.investigator_id == investigator_id
    ).order_by(Evidence.created_at.desc()).limit(5).all()
    for e in recent_evidence_list:
        recent_activities.append({
            "type": "evidence",
            "id": e.id,
            "title": e.title or "Evidence uploaded",
            "timestamp": e.created_at.isoformat() if e.created_at else None,
            "status": e.anchor_status
        })
    
    # Sort by timestamp and limit to 10
    recent_activities.sort(key=lambda x: x["timestamp"] or "", reverse=True)
    recent_activities = recent_activities[:10]
    
    # Chart data: Activity trend (last 30 days)
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    activity_trend = []
    for i in range(30):
        day_start = thirty_days_ago + timedelta(days=i)
        day_end = day_start + timedelta(days=1)
        
        day_complaints = db.query(Complaint).filter(
            and_(
                Complaint.investigator_id == investigator_id,
                Complaint.created_at >= day_start,
                Complaint.created_at < day_end
            )
        ).count()
        
        day_reports = db.query(IncidentReport).filter(
            and_(
                IncidentReport.investigator_id == investigator_id,
                IncidentReport.created_at >= day_start,
                IncidentReport.created_at < day_end
            )
        ).count()
        
        day_evidence = db.query(Evidence).filter(
            and_(
                Evidence.investigator_id == investigator_id,
                Evidence.created_at >= day_start,
                Evidence.created_at < day_end
            )
        ).count()
        
        activity_trend.append({
            "date": day_start.strftime("%Y-%m-%d"),
            "day": day_start.strftime("%m/%d"),
            "complaints": day_complaints,
            "reports": day_reports,
            "evidence": day_evidence,
            "total": day_complaints + day_reports + day_evidence
        })
    
    # Status distribution for complaints
    complaint_status_dist = {}
    all_complaints = db.query(Complaint).filter(Complaint.investigator_id == investigator_id).all()
    for c in all_complaints:
        status = c.status or "unknown"
        complaint_status_dist[status] = complaint_status_dist.get(status, 0) + 1
    
    # Status distribution for reports
    report_status_dist = {}
    all_reports = db.query(IncidentReport).filter(IncidentReport.investigator_id == investigator_id).all()
    for r in all_reports:
        status = r.status or "unknown"
        report_status_dist[status] = report_status_dist.get(status, 0) + 1
    
    # Risk level distribution for reports
    risk_level_dist = {}
    for r in all_reports:
        risk = r.risk_level or "unknown"
        risk_level_dist[risk] = risk_level_dist.get(risk, 0) + 1
    
    # Activity type breakdown
    activity_breakdown = {
        "complaints": total_complaints,
        "reports": total_reports,
        "evidence": total_evidence
    }
    
    return {
        "investigator": {
            "id": investigator.id,
            "email": investigator.email,
            "full_name": investigator.full_name or investigator.email,
            "availability_status": investigator.availability_status or "available",
            "status_updated_at": investigator.status_updated_at.isoformat() if investigator.status_updated_at else None
        },
        "stats": {
            "total_complaints": total_complaints,
            "active_complaints": active_complaints,
            "total_reports": total_reports,
            "active_reports": active_reports,
            "total_evidence": total_evidence,
            "unread_messages": unread_messages,
            "recent_complaints": recent_complaints,
            "recent_reports": recent_reports,
            "recent_evidence": recent_evidence
        },
        "recent_activity": recent_activities,
        "charts": {
            "activity_trend": activity_trend,
            "complaint_status_distribution": [{"status": k, "count": v} for k, v in complaint_status_dist.items()],
            "report_status_distribution": [{"status": k, "count": v} for k, v in report_status_dist.items()],
            "risk_level_distribution": [{"risk_level": k, "count": v} for k, v in risk_level_dist.items()],
            "activity_breakdown": activity_breakdown
        }
    }


@router.patch("/{investigator_id}/status")
async def update_investigator_status(
    investigator_id: int,
    status: str = Query(..., description="Availability status: available, busy, away, offline"),
    db: Session = Depends(get_db)
):
    """Update investigator availability status"""
    from datetime import datetime
    
    if status not in ["available", "busy", "away", "offline"]:
        raise HTTPException(status_code=400, detail="Invalid status. Must be: available, busy, away, offline")
    
    investigator = db.query(User).filter(User.id == investigator_id).first()
    if not investigator:
        raise HTTPException(status_code=404, detail="Investigator not found")
    
    investigator.availability_status = status
    investigator.status_updated_at = datetime.utcnow()
    db.commit()
    db.refresh(investigator)
    
    return {
        "success": True,
        "investigator_id": investigator_id,
        "availability_status": status,
        "status_updated_at": investigator.status_updated_at.isoformat() if investigator.status_updated_at else None
    }


def format_duration(seconds: float) -> str:
    """Format duration in seconds to human-readable string"""
    if seconds is None:
        return "N/A"
    
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    
    if hours > 0:
        return f"{hours}h {minutes}m"
    else:
        return f"{minutes}m"
