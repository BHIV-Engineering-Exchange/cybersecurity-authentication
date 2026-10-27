"""Test the analyze_wallet_incident endpoint directly"""
import sys
import asyncio
import traceback
import pytest
from sqlalchemy.orm import Session

from app.db.database import SessionLocal
from app.api.v1.endpoints.incidents import analyze_wallet_incident
from app.api.v1.schemas import IncidentReportRequest

@pytest.mark.asyncio
async def test_endpoint():
    db = SessionLocal()
    try:
        class MockRequest:
            def __init__(self):
                self.state = type('State', (), {})()
                self.headers = {}
        
        request_obj = MockRequest()
        request = IncidentReportRequest(
            wallet_address="TEST123",
            description="test wallet",
            investigator_id=1
        )
        
        print("Calling analyze_wallet_incident...")
        result = await analyze_wallet_incident(request, request_obj, db)
        print(f"[SUCCESS] Result: {result.wallet}")
        assert result.wallet == "TEST123"
        
    except Exception as e:
        print(f"[ERROR] {type(e).__name__}: {e}")
        if hasattr(e, 'detail'):
            print(f"[DETAIL] {e.detail}")
        traceback.print_exc()
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(test_endpoint())
