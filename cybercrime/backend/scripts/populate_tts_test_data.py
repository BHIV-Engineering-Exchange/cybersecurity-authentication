import os
import sys
import json
from datetime import datetime, timedelta

# Add backend to path to import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.database import SessionLocal, engine
from app.db import models

def populate_data():
    db = SessionLocal()
    try:
        # 1. Ensure we have a default investigator
        investigator = db.query(models.User).filter(models.User.role == "investigator").first()
        if not investigator:
            print("Creating dummy investigator...")
            investigator = models.User(
                email="investigator_test@cybercrime.gov",
                full_name="Agent Sarah Jenkins",
                hashed_password="dummy_hash",
                role="investigator",
                is_active=True,
                availability_status="available"
            )
            db.add(investigator)
            db.commit()
            db.refresh(investigator)

        # 2. Add an Incident Report with rich text
        print("Creating Incident Report...")
        report = models.IncidentReport(
            wallet_address="0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
            investigator_id=investigator.id,
            user_description="The suspect wallet was identified after three victims reported losing funds through a fake decentralized finance portal. Large volumes of ether were moved within minutes of the initial theft.",
            risk_score=92.5,
            risk_level="CRITICAL",
            detected_patterns=json.dumps([
                "Rapid Fund Dispersal",
                "Layering through Mixers",
                "High Velocity Transfers",
                "Sanctioned Entity Interaction"
            ]),
            summary=json.dumps({
                "overview": "The target wallet serves as a primary aggregation point for stolen assets. We have detected 14 inbound transfers from known phishing addresses in the last 24 hours.",
                "total_volume": "145.2 ETH",
                "last_active": "2 minutes ago"
            }),
            system_conclusion="Based on our AI risk engine, this wallet is 92% likely to be part of an organized cybercrime syndicate. Immediate freezing of associated exchange accounts is strongly recommended to prevent final asset liquidation.",
            status="investigating",
            created_at=datetime.utcnow()
        )
        db.add(report)

        # 3. Add a descriptive Complaint
        print("Creating Complaint...")
        complaint = models.Complaint(
            wallet_address="0x892a11b...d4c9b7",
            investigator_id=investigator.id,
            officer_designation="Senior Field Agent",
            officer_address="Cybercrime Division Headquarters, Sector 4, New Delhi",
            incident_description="Victim reported a targeted phishing attack where they were tricked into signing a malicious smart contract. The contract granted 'infinite approval' to the attacker's wallet, resulting in the total loss of 50,000 USDT and several high-value NFTs. The attacker then used a bridge to move the assets to another chain.",
            internal_notes="The victim is a high-profile corporate executive. High priority investigation requested. We are currently tracking the bridged assets on the destination chain.",
            status="under_review",
            investigator_location_city="New Delhi",
            investigator_location_country="India",
            investigator_location_latitude=28.6139,
            investigator_location_longitude=77.2090,
            created_at=datetime.utcnow()
        )
        db.add(complaint)

        # 4. Add persistent Notifications (Audit Logs)
        print("Creating Notifications...")
        notif1 = models.AuditLog(
            action="high_risk_wallet.detected",
            message="Critical Risk Detected: A wallet with over $1 million in stolen assets has just been activated. The system has flagged this as a high-priority enforcement event.",
            entity_type="wallet",
            entity_id="0x742d35Cc6",
            status="warning",
            timestamp=datetime.utcnow()
        )
        db.add(notif1)

        notif2 = models.AuditLog(
            action="investigator.assigned",
            message="New Case Assignment: Agent Sarah Jenkins has been assigned to the USDT Phishing incident involving the exec-victim. Detailed forensic analysis is required within 48 hours.",
            entity_type="case",
            status="success",
            timestamp=datetime.utcnow() - timedelta(hours=1)
        )
        db.add(notif2)

        # 5. Add a Message
        print("Creating Message...")
        admin = db.query(models.User).filter(models.User.role == "superadmin").first()
        message = models.Message(
            sender_id=admin.id if admin else None,
            recipient_id=investigator.id,
            subject="URGENT: Asset Recovery Action Required",
            content="Agent Jenkins, we have a lead on the phishing syndicate. The target wallet has just moved 20 ETH to a centralized exchange. Please coordinate with the exchange's legal team immediately to freeze the assets. Time is of the essence.",
            priority="urgent",
            created_at=datetime.utcnow()
        )
        db.add(message)

        db.commit()
        print("Successfully populated TTS test data!")

    except Exception as e:
        db.rollback()
        print(f"Error populating data: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    populate_data()
