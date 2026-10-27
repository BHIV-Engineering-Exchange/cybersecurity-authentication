import os
import sys
import json

# Add backend to path to import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.database import SessionLocal
from app.db import models

def cleanup_data():
    db = SessionLocal()
    try:
        # 1. Remove dummy investigator
        print("Removing dummy investigator...")
        db.query(models.User).filter(models.User.email == "investigator_test@cybercrime.gov").delete()

        # 2. Remove Incident Report
        print("Removing TTS test Incident Report...")
        db.query(models.IncidentReport).filter(
            models.IncidentReport.wallet_address == "0x742d35Cc6634C0532925a3b844Bc454e4438f44e"
        ).delete()

        # 3. Remove Complaint
        print("Removing TTS test Complaint...")
        db.query(models.Complaint).filter(
            models.Complaint.wallet_address == "0x892a11b...d4c9b7"
        ).delete()

        # 4. Remove Audit Logs
        print("Removing TTS test Audit Logs...")
        db.query(models.AuditLog).filter(
            models.AuditLog.action.in_(["high_risk_wallet.detected", "investigator.assigned"])
        ).delete()

        # 5. Remove test Message
        print("Removing TTS test Message...")
        db.query(models.Message).filter(
            models.Message.subject == "URGENT: Asset Recovery Action Required"
        ).delete()

        db.commit()
        print("Successfully cleaned up TTS test data!")

    except Exception as e:
        db.rollback()
        print(f"Error cleaning up data: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    cleanup_data()
