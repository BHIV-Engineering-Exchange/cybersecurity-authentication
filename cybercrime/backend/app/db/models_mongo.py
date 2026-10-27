"""
MongoDB models/schemas for incident reports
"""

from datetime import datetime
from typing import Optional, List, Dict, Any, Annotated
from pydantic import BaseModel, Field, BeforeValidator
from bson import ObjectId


def validate_object_id(v: Any) -> ObjectId:
    """Validate and convert to ObjectId"""
    if isinstance(v, ObjectId):
        return v
    if isinstance(v, str):
        if ObjectId.is_valid(v):
            return ObjectId(v)
        raise ValueError("Invalid ObjectId string")
    raise ValueError("Invalid ObjectId type")


# Pydantic v2 compatible ObjectId type
PyObjectId = Annotated[ObjectId, BeforeValidator(validate_object_id)]


class IncidentReportMongo(BaseModel):
    """MongoDB model for incident reports"""
    
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    wallet_address: str
    user_description: str
    risk_score: float
    risk_level: str
    detected_patterns: List[str]
    summary: Dict[str, Any]
    graph_data: List[Dict[str, Any]]
    timeline: List[Dict[str, Any]]
    system_conclusion: str
    investigator_id: Optional[str] = None
    case_id: Optional[str] = None
    status: str = "investigating"  # investigating, resolved, closed, escalated
    notes: List[Dict[str, str]] = []  # [{note: str, author: str, timestamp: str}]
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    model_config = {
        "populate_by_name": True,
        "arbitrary_types_allowed": True,
        "json_encoders": {ObjectId: str},
        "json_schema_extra": {
            "example": {
                "wallet_address": "WALLET_XYZ",
                "user_description": "Suspicious activity reported",
                "risk_score": 0.94,
                "risk_level": "VERY HIGH",
                "detected_patterns": ["Money Laundering", "Rapid Consolidation"],
                "summary": {
                    "total_in": 120000,
                    "total_out": 118500,
                    "tx_count": 18,
                    "unique_senders": 6,
                    "unique_receivers": 4,
                    "pattern_type": "Money Laundering"
                },
                "graph_data": [],
                "timeline": [],
                "system_conclusion": "AI-generated conclusion..."
            }
        }
    }