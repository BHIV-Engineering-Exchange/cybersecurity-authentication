"""
Wallet endpoints
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import inspect, or_
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel
import json

from app.db.database import engine, get_db
from app.db.models import Wallet, Complaint, IncidentReport, Evidence, User, FraudTransaction
from app.api.v1.schemas import WalletResponse, WalletCreate

router = APIRouter()


def _freeze_fields_available() -> bool:
    """Check whether wallet freeze/unfreeze fields exist on both model and DB schema."""
    required_fields = (
        "is_frozen",
        "frozen_by",
        "freeze_reason",
        "frozen_at",
        "unfrozen_by",
        "unfreeze_reason",
        "unfrozen_at",
    )
    model_ok = all(hasattr(Wallet, field) for field in required_fields)
    if not model_ok:
        return False

    try:
        existing_columns = {col["name"] for col in inspect(engine).get_columns("wallets")}
    except Exception:
        return False
    return all(field in existing_columns for field in required_fields)


def _ensure_freeze_fields_or_503() -> None:
    if not _freeze_fields_available():
        raise HTTPException(
            status_code=503,
            detail=(
                "Wallet freeze/unfreeze fields are not available in this deployment. "
                "Please run the latest database/model migration for wallet freeze support."
            ),
        )


class FreezeWalletRequest(BaseModel):
    freeze_reason: str
    frozen_by: str  # Admin email


class UnfreezeWalletRequest(BaseModel):
    unfreeze_reason: str
    unfrozen_by: str  # Admin email


@router.get("/", response_model=List[WalletResponse])
async def get_wallets(
    case_id: int = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Get all wallets under investigation"""
    query = db.query(Wallet)
    if case_id:
        query = query.filter(Wallet.case_id == case_id)
    
    wallets = query.offset(skip).limit(limit).all()
    return wallets


@router.get("/{wallet_id}", response_model=WalletResponse)
async def get_wallet(wallet_id: int, db: Session = Depends(get_db)):
    """Get a specific wallet by ID"""
    wallet = db.query(Wallet).filter(Wallet.id == wallet_id).first()
    if not wallet:
        raise HTTPException(status_code=404, detail="Wallet not found")
    return wallet


@router.post("/", response_model=WalletResponse)
async def create_wallet(wallet: WalletCreate, db: Session = Depends(get_db)):
    """Create a new wallet entry"""
    db_wallet = Wallet(**wallet.dict())
    db.add(db_wallet)
    db.commit()
    db.refresh(db_wallet)
    return db_wallet


@router.get("/search/{wallet_address}")
async def search_wallet(wallet_address: str, db: Session = Depends(get_db)):
    """Search wallet by address and get all related data"""
    # Get or create wallet
    wallet = db.query(Wallet).filter(Wallet.address == wallet_address).first()
    if not wallet:
        # Create wallet if it doesn't exist
        wallet = Wallet(address=wallet_address, risk_level="low")
        db.add(wallet)
        db.commit()
        db.refresh(wallet)
    
    # Get all complaints for this wallet
    complaints = db.query(Complaint).filter(Complaint.wallet_address == wallet_address).all()
    complaints_data = [c.to_dict() for c in complaints]
    
    # Get all incident reports for this wallet
    incident_reports = db.query(IncidentReport).filter(IncidentReport.wallet_address == wallet_address).order_by(IncidentReport.created_at.desc()).all()
    incident_reports_data = [ir.to_dict() for ir in incident_reports]
    
    # Get all evidence for this wallet (by searching description for wallet address)
    all_evidence = db.query(Evidence).all()
    evidence_data = []
    for ev in all_evidence:
        if ev.description and wallet_address.lower() in ev.description.lower():
            # Get investigator name
            investigator_name = "Unknown"
            if ev.investigator_id:
                investigator = db.query(User).filter(User.id == ev.investigator_id).first()
                if investigator:
                    investigator_name = investigator.full_name or investigator.email.split("@")[0]
            
            evidence_data.append({
                "id": ev.id,
                "evidence_id": ev.evidence_id,
                "title": ev.title,
                "description": ev.description,
                "hash": ev.hash,
                "uploaded_by": investigator_name,
                "created_at": ev.created_at.isoformat() if ev.created_at else None,
            })
    
    # Calculate average risk score from incident reports
    avg_risk_score = 0
    if incident_reports_data:
        total_score = sum(ir.get("risk_score", 0) for ir in incident_reports_data)
        avg_risk_score = int(total_score / len(incident_reports_data))
    
    # Get ML tags from incident reports
    ml_tags = []
    for ir in incident_reports_data:
        patterns = ir.get("detected_patterns", [])
        if isinstance(patterns, list):
            ml_tags.extend(patterns)
    ml_tags = list(set(ml_tags))  # Remove duplicates
    
    # Get fraud transactions for this wallet (if wallet address matches customer ID)
    fraud_transactions = db.query(FraudTransaction).filter(
        or_(
            FraudTransaction.name_orig == wallet_address,
            FraudTransaction.name_dest == wallet_address
        )
    ).order_by(FraudTransaction.step.desc()).limit(50).all()
    
    fraud_analysis = None
    if fraud_transactions:
        fraud_count = sum(1 for tx in fraud_transactions if tx.is_fraud == 1)
        normal_count = len(fraud_transactions) - fraud_count
        fraud_percentage = (fraud_count / len(fraud_transactions) * 100) if fraud_transactions else 0
        
        # Try to get predictions if model is available
        predictions_available = False
        try:
            from ml_training.predict_fraud import load_model
            load_model()
            predictions_available = True
        except:
            pass
        
        fraud_analysis = {
            "total_transactions": len(fraud_transactions),
            "fraud_count": fraud_count,
            "normal_count": normal_count,
            "fraud_percentage": round(fraud_percentage, 2),
            "risk_level": "VERY HIGH" if fraud_percentage >= 50 else "HIGH" if fraud_percentage >= 30 else "MEDIUM" if fraud_percentage >= 10 else "LOW",
            "predictions_available": predictions_available,
            "recent_transactions": [tx.to_dict() for tx in fraud_transactions[:10]]
        }
    
    return {
        "wallet": {
            "id": wallet.id,
            "address": wallet.address,
            "label": wallet.label,
            "risk_level": wallet.risk_level,
            # Backward-compatible defaults for deployments that don't yet have freeze columns
            "is_frozen": getattr(wallet, "is_frozen", False),
            "frozen_by": getattr(wallet, "frozen_by", None),
            "freeze_reason": getattr(wallet, "freeze_reason", None),
            "frozen_at": (
                getattr(wallet, "frozen_at").isoformat()
                if getattr(wallet, "frozen_at", None)
                else None
            ),
            "unfrozen_by": getattr(wallet, "unfrozen_by", None),
            "unfreeze_reason": getattr(wallet, "unfreeze_reason", None),
            "unfrozen_at": (
                getattr(wallet, "unfrozen_at").isoformat()
                if getattr(wallet, "unfrozen_at", None)
                else None
            ),
            "created_at": wallet.created_at.isoformat() if wallet.created_at else None,
        },
        "risk_score": avg_risk_score if avg_risk_score > 0 else 0,
        "ml_tags": ml_tags[:10],  # Limit to 10 tags
        "complaints": complaints_data,
        "incident_reports": incident_reports_data,
        "evidence": evidence_data,
        "complaints_count": len(complaints_data),
        "incident_reports_count": len(incident_reports_data),
        "evidence_count": len(evidence_data),
        "fraud_analysis": fraud_analysis,  # New: fraud detection analysis
    }


@router.post("/{wallet_id}/freeze")
async def freeze_wallet(wallet_id: int, request: FreezeWalletRequest, db: Session = Depends(get_db)):
    """Freeze a wallet"""
    _ensure_freeze_fields_or_503()
    wallet = db.query(Wallet).filter(Wallet.id == wallet_id).first()
    if not wallet:
        raise HTTPException(status_code=404, detail="Wallet not found")
    
    if wallet.is_frozen:
        raise HTTPException(status_code=400, detail="Wallet is already frozen")
    
    wallet.is_frozen = True
    wallet.frozen_by = request.frozen_by
    wallet.freeze_reason = request.freeze_reason
    wallet.frozen_at = datetime.now()
    wallet.unfrozen_by = None
    wallet.unfreeze_reason = None
    wallet.unfrozen_at = None
    
    db.add(wallet)
    db.commit()
    db.refresh(wallet)
    
    return {
        "id": wallet.id,
        "address": wallet.address,
        "is_frozen": wallet.is_frozen,
        "frozen_by": wallet.frozen_by,
        "freeze_reason": wallet.freeze_reason,
        "frozen_at": wallet.frozen_at.isoformat() if wallet.frozen_at else None,
    }


@router.post("/{wallet_id}/unfreeze")
async def unfreeze_wallet(wallet_id: int, request: UnfreezeWalletRequest, db: Session = Depends(get_db)):
    """Unfreeze a wallet"""
    _ensure_freeze_fields_or_503()
    wallet = db.query(Wallet).filter(Wallet.id == wallet_id).first()
    if not wallet:
        raise HTTPException(status_code=404, detail="Wallet not found")
    
    if not wallet.is_frozen:
        raise HTTPException(status_code=400, detail="Wallet is not frozen")
    
    wallet.is_frozen = False
    wallet.unfrozen_by = request.unfrozen_by
    wallet.unfreeze_reason = request.unfreeze_reason
    wallet.unfrozen_at = datetime.now()
    
    db.add(wallet)
    db.commit()
    db.refresh(wallet)
    
    return {
        "id": wallet.id,
        "address": wallet.address,
        "is_frozen": wallet.is_frozen,
        "unfrozen_by": wallet.unfrozen_by,
        "unfreeze_reason": wallet.unfreeze_reason,
        "unfrozen_at": wallet.unfrozen_at.isoformat() if wallet.unfrozen_at else None,
    }


@router.get("/frozen/list")
async def get_frozen_wallets(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Get all frozen wallets"""
    _ensure_freeze_fields_or_503()
    wallets = (
        db.query(Wallet)
        .filter(Wallet.is_frozen == True)
        .order_by(Wallet.frozen_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    
    result = []
    for wallet in wallets:
        # Get latest incident report for risk score
        latest_report = (
            db.query(IncidentReport)
            .filter(IncidentReport.wallet_address == wallet.address)
            .order_by(IncidentReport.created_at.desc())
            .first()
        )
        risk_score = latest_report.risk_score if latest_report else 0
        
        result.append({
            "id": wallet.id,
            "address": wallet.address,
            "risk_score": risk_score,
            "frozen_by": wallet.frozen_by,
            "freeze_reason": wallet.freeze_reason,
            "frozen_at": wallet.frozen_at.isoformat() if wallet.frozen_at else None,
        })
    
    return result


@router.get("/unfrozen/list")
async def get_unfrozen_wallets(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Get all unfrozen wallets (previously frozen)"""
    _ensure_freeze_fields_or_503()
    wallets = (
        db.query(Wallet)
        .filter(Wallet.is_frozen == False)
        .filter(Wallet.unfrozen_at != None)
        .order_by(Wallet.unfrozen_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    
    result = []
    for wallet in wallets:
        # Get latest incident report for risk score
        latest_report = (
            db.query(IncidentReport)
            .filter(IncidentReport.wallet_address == wallet.address)
            .order_by(IncidentReport.created_at.desc())
            .first()
        )
        risk_score = latest_report.risk_score if latest_report else 0
        
        result.append({
            "id": wallet.id,
            "address": wallet.address,
            "risk_score": risk_score,
            "unfrozen_by": wallet.unfrozen_by,
            "unfreeze_reason": wallet.unfreeze_reason,
            "unfrozen_at": wallet.unfrozen_at.isoformat() if wallet.unfrozen_at else None,
        })
    
    return result
