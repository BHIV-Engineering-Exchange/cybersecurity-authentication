"""
Pydantic schemas for request/response validation
"""

from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime


# User Schemas
class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    role: Optional[str] = "investigator"


class UserCreate(UserBase):
    password: str


class UserResponse(UserBase):
    id: int
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


# Token Schema
class Token(BaseModel):
    access_token: str
    token_type: str


# Case Schemas
class CaseBase(BaseModel):
    case_id: str
    title: str
    description: Optional[str] = None
    status: Optional[str] = "active"


class CaseCreate(CaseBase):
    investigator_id: Optional[int] = None


class CaseResponse(CaseBase):
    id: int
    investigator_id: Optional[int]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# Wallet Schemas
class WalletBase(BaseModel):
    address: str
    label: Optional[str] = None
    balance: Optional[str] = None
    risk_level: Optional[str] = "low"
    anchor_status: Optional[str] = "pending"


class WalletCreate(WalletBase):
    case_id: Optional[int] = None


class WalletResponse(WalletBase):
    id: int
    case_id: Optional[int]
    last_activity: Optional[datetime]
    created_at: datetime
    
    class Config:
        from_attributes = True


# Transaction Schemas
class TransactionBase(BaseModel):
    hash: str
    from_address: str
    to_address: str
    amount: Optional[str] = None
    transaction_type: Optional[str] = None
    flagged: Optional[bool] = False


class TransactionCreate(TransactionBase):
    case_id: Optional[int] = None
    wallet_id: Optional[int] = None
    timestamp: Optional[datetime] = None


class TransactionResponse(TransactionBase):
    id: int
    case_id: Optional[int]
    wallet_id: Optional[int]
    timestamp: Optional[datetime]
    created_at: datetime
    
    class Config:
        from_attributes = True


# Evidence Schemas
class EvidenceBase(BaseModel):
    evidence_id: str
    title: str
    description: Optional[str] = None
    hash: str
    file_path: Optional[str] = None
    file_size: Optional[int] = None
    file_type: Optional[str] = None
    anchor_status: Optional[str] = "pending"
    immutable: Optional[bool] = True


class EvidenceCreate(EvidenceBase):
    investigator_id: Optional[int] = None
    case_id: Optional[int] = None


class EvidenceResponse(EvidenceBase):
    id: int
    investigator_id: Optional[int]
    case_id: Optional[int]
    created_at: datetime
    
    class Config:
        from_attributes = True


# Risk Score Schemas
class RiskScoreBase(BaseModel):
    category: str
    score: int
    level: str
    description: Optional[str] = None


class RiskScoreCreate(RiskScoreBase):
    case_id: Optional[int] = None


class RiskScoreResponse(RiskScoreBase):
    id: int
    case_id: Optional[int]
    created_at: datetime
    
    class Config:
        from_attributes = True


# Audit Log Schemas
class AuditLogResponse(BaseModel):
    id: int
    action: str
    message: Optional[str] = None
    entity_type: Optional[str]
    entity_id: Optional[str]
    status: str
    details: Optional[str]
    user_id: Optional[int]
    ip_address: Optional[str] = None
    request_id: Optional[str] = None
    path: Optional[str] = None
    method: Optional[str] = None
    timestamp: datetime
    
    class Config:
        from_attributes = True


# Incident Report Schemas
class IncidentReportRequest(BaseModel):
    wallet_address: str
    description: str
    investigator_id: Optional[int] = None


class TransactionSummary(BaseModel):
    total_in: float
    total_out: float
    tx_count: int
    unique_senders: int
    unique_receivers: int
    pattern_type: str


class GraphEdge(BaseModel):
    from_address: str = Field(alias="from")
    to_address: str = Field(alias="to")
    amount: float
    
    class Config:
        populate_by_name = True


class TimelineEntry(BaseModel):
    time: str
    amount: float
    timestamp: str


class TransactionDetail(BaseModel):
    id: int
    from_address: str
    to_address: str
    amount: float
    direction: str
    timestamp: Optional[str] = None
    type: Optional[str] = None
    suspicious: bool = False


class IncidentReportResponse(BaseModel):
    wallet: str
    risk_score: float
    risk_level: str
    detected_patterns: List[str]
    summary: TransactionSummary
    graph_data: List[GraphEdge]
    timeline: List[TimelineEntry]
    transactions: Optional[List[TransactionDetail]] = None
    system_conclusion: str
    report_id: Optional[str] = None  # MongoDB document ID


# Complaint Schemas
class ComplaintCreate(BaseModel):
    wallet_address: str
    investigator_id: Optional[int] = None  # Track which investigator filed it
    officer_designation: str
    officer_address: Optional[str] = None
    officer_email: Optional[List[str]] = None
    officer_mobile: Optional[List[str]] = None
    officer_telephone: Optional[List[str]] = None
    incident_description: str
    internal_notes: Optional[str] = None
    evidence_ids: Optional[List[int]] = None
    investigator_location_city: Optional[str] = None
    investigator_location_country: Optional[str] = None
    investigator_location_latitude: Optional[float] = None
    investigator_location_longitude: Optional[float] = None
    investigator_location_ip: Optional[str] = None


class ComplaintResponse(BaseModel):
    id: int
    wallet_address: str
    investigator_id: Optional[int] = None
    investigator_name: Optional[str] = None
    investigator_email: Optional[str] = None
    officer_designation: str
    officer_address: Optional[str] = None
    officer_email: Optional[List[str]] = None
    officer_mobile: Optional[List[str]] = None
    officer_telephone: Optional[List[str]] = None
    incident_description: str
    internal_notes: Optional[str] = None
    evidence_ids: Optional[List[int]] = None
    investigator_location_city: Optional[str] = None
    investigator_location_country: Optional[str] = None
    investigator_location_latitude: Optional[float] = None
    investigator_location_longitude: Optional[float] = None
    investigator_location_ip: Optional[str] = None
    status: str
    created_at: Optional[str] = None
    updated_at: Optional[str] = None