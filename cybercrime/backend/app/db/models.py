"""
Database models
"""

from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, ForeignKey, Float
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.database import Base


class User(Base):
    """User model"""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String)
    role = Column(String, default="investigator")  # investigator, admin
    is_active = Column(Boolean, default=True)
    availability_status = Column(String, default="available")  # available, busy, away, offline
    status_updated_at = Column(DateTime, nullable=True)
    location_city = Column(String, nullable=True)
    location_country = Column(String, nullable=True)
    location_latitude = Column(Float, nullable=True)
    location_longitude = Column(Float, nullable=True)
    location_ip = Column(String, nullable=True)
    last_login_at = Column(DateTime, nullable=True)
    last_activity_at = Column(DateTime, nullable=True)
    password_changed_at = Column(DateTime, nullable=True)
    last_notification_read_at = Column(DateTime, nullable=True)  # Track when user last cleared notifications
    two_factor_enabled = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    cases = relationship("Case", back_populates="investigator")
    audit_logs = relationship("AuditLog", back_populates="user")


class Case(Base):
    """Investigation case model"""
    __tablename__ = "cases"
    
    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(String, unique=True, index=True, nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text)
    status = Column(String, default="active")  # active, closed, pending
    investigator_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    investigator = relationship("User", back_populates="cases")
    wallets = relationship("Wallet", back_populates="case")
    transactions = relationship("Transaction", back_populates="case")
    evidence = relationship("Evidence", back_populates="case")


class Wallet(Base):
    """Wallet under investigation"""
    __tablename__ = "wallets"
    
    id = Column(Integer, primary_key=True, index=True)
    address = Column(String, unique=True, index=True, nullable=False)
    label = Column(String)
    balance = Column(String)
    risk_level = Column(String, default="low")  # low, medium, high, critical
    anchor_status = Column(String, default="pending")  # pending, anchored, verified
    # Freeze governance metadata (added for enforcement workflows)
    is_frozen = Column(Boolean, default=False)
    frozen_by = Column(String, nullable=True)
    freeze_reason = Column(Text, nullable=True)
    frozen_at = Column(DateTime, nullable=True)
    unfrozen_by = Column(String, nullable=True)
    unfreeze_reason = Column(Text, nullable=True)
    unfrozen_at = Column(DateTime, nullable=True)
    last_activity = Column(DateTime)
    case_id = Column(Integer, ForeignKey("cases.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    case = relationship("Case", back_populates="wallets")
    transactions = relationship("Transaction", back_populates="wallet")


class Transaction(Base):
    """Financial transaction"""
    __tablename__ = "transactions"
    
    id = Column(Integer, primary_key=True, index=True)
    hash = Column(String, unique=True, index=True, nullable=False)
    from_address = Column(String, nullable=False)
    to_address = Column(String, nullable=False)
    amount = Column(String)
    transaction_type = Column(String)  # transfer, swap, contract
    flagged = Column(Boolean, default=False)
    timestamp = Column(DateTime)
    case_id = Column(Integer, ForeignKey("cases.id"))
    wallet_id = Column(Integer, ForeignKey("wallets.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    case = relationship("Case", back_populates="transactions")
    wallet = relationship("Wallet", back_populates="transactions")


class Evidence(Base):
    """Evidence chain of custody"""
    __tablename__ = "evidence"
    
    id = Column(Integer, primary_key=True, index=True)
    evidence_id = Column(String, unique=True, index=True, nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text)
    hash = Column(String, nullable=False)
    file_path = Column(String, nullable=True)  # Path to stored file
    file_size = Column(Integer, nullable=True)  # File size in bytes
    file_type = Column(String, nullable=True)  # MIME type or file extension
    anchor_status = Column(String, default="pending")  # pending, anchored, verified
    immutable = Column(Boolean, default=True)
    investigator_id = Column(Integer, ForeignKey("users.id"))
    case_id = Column(Integer, ForeignKey("cases.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    case = relationship("Case", back_populates="evidence")


class RiskScore(Base):
    """Risk assessment scores"""
    __tablename__ = "risk_scores"
    
    id = Column(Integer, primary_key=True, index=True)
    category = Column(String, nullable=False)
    score = Column(Integer, nullable=False)  # 0-100
    level = Column(String, nullable=False)  # low, medium, high, critical
    description = Column(Text)
    case_id = Column(Integer, ForeignKey("cases.id"))
    created_at = Column(DateTime, default=datetime.utcnow)


class AuditLog(Base):
    """Audit log entries"""
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    action = Column(String, nullable=False)
    message = Column(String, nullable=True)
    entity_type = Column(String)
    entity_id = Column(String)
    status = Column(String, default="success")  # success, warning, error
    details = Column(Text)
    user_id = Column(Integer, ForeignKey("users.id"))
    ip_address = Column(String, nullable=True)  # Track IP address
    request_id = Column(String, nullable=True)
    path = Column(String, nullable=True)
    method = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="audit_logs")


class FraudTransaction(Base):
    """Transaction records for fraud detection dataset"""
    __tablename__ = "fraud_transactions"
    
    id = Column(Integer, primary_key=True, index=True)
    step = Column(Integer, nullable=False, index=True)  # Time step (1-744 for 30 days)
    type = Column(String, nullable=False, index=True)  # CASH_IN, CASH_OUT, DEBIT, PAYMENT, TRANSFER
    amount = Column(Float, nullable=False, index=True)
    name_orig = Column(String, nullable=False, index=True)  # Origin customer (C prefix)
    old_balance_orig = Column(Float, nullable=False)  # Balance before transaction
    new_balance_orig = Column(Float, nullable=False)  # Balance after transaction
    name_dest = Column(String, nullable=False, index=True)  # Destination customer (C or M prefix)
    old_balance_dest = Column(Float, nullable=True)  # Destination balance before (null for merchants)
    new_balance_dest = Column(Float, nullable=True)  # Destination balance after (null for merchants)
    is_fraud = Column(Integer, default=0, index=True)  # 0 = normal, 1 = fraud
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    def to_dict(self):
        """Convert to dictionary for API response"""
        return {
            "id": self.id,
            "step": self.step,
            "type": self.type,
            "amount": self.amount,
            "nameOrig": self.name_orig,
            "oldbalanceOrg": self.old_balance_orig,
            "newbalanceOrig": self.new_balance_orig,
            "nameDest": self.name_dest,
            "oldbalanceDest": self.old_balance_dest,
            "newbalanceDest": self.new_balance_dest,
            "isFraud": self.is_fraud,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Complaint(Base):
    """Complaint filed by investigators"""
    __tablename__ = "complaints"
    
    id = Column(Integer, primary_key=True, index=True)
    wallet_address = Column(String, nullable=False, index=True)
    investigator_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    officer_designation = Column(String, nullable=False)
    officer_address = Column(Text, nullable=True)
    officer_email = Column(Text, nullable=True)  # JSON array as string
    officer_mobile = Column(Text, nullable=True)  # JSON array as string
    officer_telephone = Column(Text, nullable=True)  # JSON array as string
    incident_description = Column(Text, nullable=False)
    internal_notes = Column(Text, nullable=True)
    evidence_ids = Column(Text, nullable=True)  # JSON array as string
    investigator_location_city = Column(String, nullable=True)
    investigator_location_country = Column(String, nullable=True)
    investigator_location_latitude = Column(Float, nullable=True)
    investigator_location_longitude = Column(Float, nullable=True)
    investigator_location_ip = Column(String, nullable=True)
    status = Column(String, default="pending", index=True)  # pending, under_review, resolved, closed
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    investigator = relationship("User", foreign_keys=[investigator_id])
    
    def to_dict(self):
        """Convert to dictionary for API response"""
        import json
        investigator_name = None
        investigator_email = None
        # Get investigator info from relationship (should be loaded via joinedload in endpoint)
        if self.investigator:
            # Use full_name if available, otherwise fall back to email
            investigator_name = self.investigator.full_name or self.investigator.email
            investigator_email = self.investigator.email
        
        return {
            "id": self.id,
            "wallet_address": self.wallet_address,
            "investigator_id": self.investigator_id,
            "investigator_name": investigator_name,
            "investigator_email": investigator_email,
            "officer_designation": self.officer_designation,
            "officer_address": self.officer_address,
            "officer_email": json.loads(self.officer_email) if self.officer_email else [],
            "officer_mobile": json.loads(self.officer_mobile) if self.officer_mobile else [],
            "officer_telephone": json.loads(self.officer_telephone) if self.officer_telephone else [],
            "incident_description": self.incident_description,
            "internal_notes": self.internal_notes,
            "evidence_ids": json.loads(self.evidence_ids) if self.evidence_ids else [],
            "investigator_location_city": self.investigator_location_city,
            "investigator_location_country": self.investigator_location_country,
            "investigator_location_latitude": self.investigator_location_latitude,
            "investigator_location_longitude": self.investigator_location_longitude,
            "investigator_location_ip": self.investigator_location_ip,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class IncidentReport(Base):
    """Incident report generated by AI analysis (stored in SQL/PostgreSQL)"""
    __tablename__ = "incident_reports"
    
    id = Column(Integer, primary_key=True, index=True)
    wallet_address = Column(String, index=True, nullable=False)
    investigator_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    user_description = Column(Text, nullable=False)
    risk_score = Column(Float, nullable=False)
    risk_level = Column(String, nullable=False)
    detected_patterns = Column(Text, nullable=False, default="[]")  # JSON list of strings
    summary = Column(Text, nullable=False, default="{}")  # JSON object
    graph_data = Column(Text, nullable=False, default="[]")  # JSON list
    timeline = Column(Text, nullable=False, default="[]")  # JSON list
    system_conclusion = Column(Text, nullable=False)
    status = Column(String, default="investigating", index=True)
    notes = Column(Text, nullable=False, default="[]")  # JSON list of note objects
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        """Helper to convert to dict shape expected by frontend."""
        import json
        try:
            detected_patterns = json.loads(self.detected_patterns or "[]")
        except Exception:
            detected_patterns = []
        try:
            summary = json.loads(self.summary or "{}")
        except Exception:
            summary = {}
        try:
            graph_data = json.loads(self.graph_data or "[]")
        except Exception:
            graph_data = []
        try:
            timeline = json.loads(self.timeline or "[]")
        except Exception:
            timeline = []
        try:
            notes = json.loads(self.notes or "[]")
        except Exception:
            notes = []
        
        tx_details = summary.get("transactions", [])
        
        return {
            "_id": str(self.id),
            "wallet_address": self.wallet_address,
            "user_description": self.user_description,
            "risk_score": self.risk_score,
            "risk_level": self.risk_level,
            "detected_patterns": detected_patterns,
            "summary": summary,
            "graph_data": graph_data,
            "timeline": timeline,
            "transactions": tx_details,
            "system_conclusion": self.system_conclusion,
            "status": self.status,
            "notes": notes,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class WatchlistWallet(Base):
    """Wallets saved for ongoing monitoring / quick analysis"""
    __tablename__ = "watchlist_wallets"
    
    id = Column(Integer, primary_key=True, index=True)
    wallet_address = Column(String, nullable=False, index=True)
    label = Column(String, nullable=True)
    active = Column(Boolean, default=True, index=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    # Monitoring status fields - TEMPORARILY COMMENTED OUT
    # These will be added by migration, but commenting out prevents SQLAlchemy errors
    # Uncomment after running migration or when columns exist in database
    # last_risk_score = Column(Float, nullable=True)
    # last_risk_level = Column(String, nullable=True)
    # last_checked_at = Column(DateTime, nullable=True)
    # last_report_id = Column(Integer, ForeignKey("incident_reports.id"), nullable=True)
    
    def to_dict(self):
        """Convert to dictionary for API response"""
        return {
            "id": self.id,
            "wallet_address": self.wallet_address,
            "label": self.label,
            "active": self.active,
            "created_by": self.created_by,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            # Return None for monitoring fields until columns are added
            "last_risk_score": None,
            "last_risk_level": None,
            "last_checked_at": None,
            "last_report_id": None,
        }


class Message(Base):
    """Internal messages between superadmin and investigators"""
    __tablename__ = "messages"
    
    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    recipient_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    message_type = Column(String, default="message")  # message, announcement, notification
    subject = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False, index=True)
    is_broadcast = Column(Boolean, default=False)
    priority = Column(String, default="normal")  # low, normal, high, urgent
    read_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    def to_dict(self):
        """Convert to dictionary for API response"""
        return {
            "id": self.id,
            "sender_id": self.sender_id,
            "recipient_id": self.recipient_id,
            "message_type": self.message_type,
            "subject": self.subject,
            "content": self.content,
            "is_read": self.is_read,
            "is_broadcast": self.is_broadcast,
            "priority": self.priority,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "read_at": self.read_at.isoformat() if self.read_at else None,
        }


class InvestigatorAccessRequest(Base):
    """Investigator access request model"""
    __tablename__ = "investigator_access_requests"
    
    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, nullable=False)
    email = Column(String, nullable=False, index=True)
    reason = Column(Text, nullable=True)
    requested_password_hash = Column(String, nullable=True)
    status = Column(String, default="pending", index=True)  # pending, approved, rejected
    reviewed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    rejection_reason = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        """Convert to dictionary for API response"""
        return {
            "id": self.id,
            "full_name": self.full_name,
            "email": self.email,
            "reason": self.reason,
            "status": self.status,
            "reviewed_by": self.reviewed_by,
            "reviewed_at": self.reviewed_at.isoformat() if self.reviewed_at else None,
            "rejection_reason": self.rejection_reason,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class RevokedToken(Base):
    """Blacklisted/Revoked JWT tokens (Tier 3 Session Invalidation)"""
    __tablename__ = "revoked_tokens"
    
    id = Column(Integer, primary_key=True, index=True)
    jti = Column(String, unique=True, index=True, nullable=False)
    revoked_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    reason = Column(String, nullable=True)
    revoked_by = Column(String, nullable=True)

