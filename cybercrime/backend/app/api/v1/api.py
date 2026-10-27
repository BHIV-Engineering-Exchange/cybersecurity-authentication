"""
API v1 router
"""

from fastapi import APIRouter
from app.api.v1.endpoints import (
    wallets,
    transactions,
    evidence,
    risk,
    audit,
    cases,
    auth,
    incidents,
    watchlist,
    complaints,
    investigators,
    messages,
    dashboard,
    fraud_transactions,
    fraud_predictions,
    wallet_fraud,
    rl_engine,
    investigator_self_service,
    access_requests,
    system_health,
    tts,
    authz,
    access,
)

api_router = APIRouter()

api_router.include_router(authz.router, prefix="/authz", tags=["authorization"])
api_router.include_router(access.router, prefix="/access", tags=["access-control"])
api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(cases.router, prefix="/cases", tags=["cases"])
api_router.include_router(wallets.router, prefix="/wallets", tags=["wallets"])
api_router.include_router(transactions.router, prefix="/transactions", tags=["transactions"])
api_router.include_router(evidence.router, prefix="/evidence", tags=["evidence"])
api_router.include_router(risk.router, prefix="/risk", tags=["risk"])
api_router.include_router(audit.router, prefix="/audit", tags=["audit"])
api_router.include_router(incidents.router, prefix="/incidents", tags=["incidents"])
api_router.include_router(watchlist.router, prefix="/watchlist", tags=["watchlist"])
api_router.include_router(complaints.router, prefix="/complaints", tags=["complaints"])
api_router.include_router(investigators.router, prefix="/investigators", tags=["investigators"])
api_router.include_router(messages.router, prefix="/messages", tags=["messages"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
api_router.include_router(fraud_transactions.router, prefix="/fraud-transactions", tags=["fraud-transactions"])
api_router.include_router(fraud_predictions.router, prefix="/fraud-predictions", tags=["fraud-predictions"])
api_router.include_router(wallet_fraud.router, prefix="/wallet-fraud", tags=["wallet-fraud"])
api_router.include_router(rl_engine.router, prefix="/rl-engine", tags=["rl-engine"])
api_router.include_router(investigator_self_service.router, prefix="/investigators", tags=["investigator-self-service"])
api_router.include_router(wallet_fraud.router, prefix="/wallets", tags=["wallet-fraud"])
api_router.include_router(access_requests.router, prefix="/access-requests", tags=["access-requests"])
api_router.include_router(system_health.router, prefix="/system", tags=["system-health"])
api_router.include_router(tts.router, prefix="/tts", tags=["text-to-speech"])