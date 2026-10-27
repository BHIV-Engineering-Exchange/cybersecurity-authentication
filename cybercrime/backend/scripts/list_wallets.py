"""
List all generated wallets from the database
Shows fraud vs normal wallets separately
"""

import sys
import os
import json

# Fix Windows console encoding for emojis
if sys.platform == "win32":
    import codecs
    sys.stdout = codecs.getwriter("utf-8")(sys.stdout.buffer, "strict")
    sys.stderr = codecs.getwriter("utf-8")(sys.stderr.buffer, "strict")

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.database import SessionLocal
from app.db.models import IncidentReport

def list_wallets(show_fraud=True, show_normal=True, limit=None):
    """List wallets from database"""
    db = SessionLocal()
    
    try:
        # Get all reports
        all_reports = db.query(IncidentReport).order_by(IncidentReport.created_at.desc()).all()
        
        fraud_wallets = []
        normal_wallets = []
        other_wallets = []
        
        for report in all_reports:
            try:
                summary = json.loads(report.summary or "{}")
                pattern_type = summary.get("pattern_type", "").lower()
                
                if pattern_type in ["fraud", "money laundering", "ponzi", "ransomware"]:
                    fraud_wallets.append({
                        "id": report.id,
                        "wallet": report.wallet_address,
                        "pattern": pattern_type,
                        "risk_score": report.risk_score,
                        "risk_level": report.risk_level,
                        "status": report.status,
                        "created": report.created_at.strftime("%Y-%m-%d %H:%M:%S") if report.created_at else "N/A"
                    })
                elif pattern_type == "normal":
                    normal_wallets.append({
                        "id": report.id,
                        "wallet": report.wallet_address,
                        "pattern": pattern_type,
                        "risk_score": report.risk_score,
                        "risk_level": report.risk_level,
                        "status": report.status,
                        "created": report.created_at.strftime("%Y-%m-%d %H:%M:%S") if report.created_at else "N/A"
                    })
                else:
                    other_wallets.append({
                        "id": report.id,
                        "wallet": report.wallet_address,
                        "pattern": pattern_type or "unknown",
                        "risk_score": report.risk_score,
                        "risk_level": report.risk_level,
                        "status": report.status,
                        "created": report.created_at.strftime("%Y-%m-%d %H:%M:%S") if report.created_at else "N/A"
                    })
            except Exception as e:
                continue
        
        # Apply limits
        if limit:
            fraud_wallets = fraud_wallets[:limit]
            normal_wallets = normal_wallets[:limit]
            other_wallets = other_wallets[:limit]
        
        # Print results
        print("=" * 100)
        print("WALLET DATABASE LISTING")
        print("=" * 100)
        print(f"📊 Total Wallets in Database: {len(all_reports)}")
        print(f"🔴 Fraud Wallets: {len(fraud_wallets)}")
        print(f"🟢 Normal Wallets: {len(normal_wallets)}")
        print(f"⚪ Other Wallets: {len(other_wallets)}")
        print("=" * 100)
        
        if show_fraud and fraud_wallets:
            print(f"\n🔴 FRAUD WALLETS ({len(fraud_wallets)} total)")
            print("-" * 100)
            print(f"{'ID':<6} {'Wallet Address':<45} {'Pattern':<20} {'Risk':<12} {'Level':<12} {'Status':<15} {'Created'}")
            print("-" * 100)
            for w in fraud_wallets:
                print(f"{w['id']:<6} {w['wallet']:<45} {w['pattern']:<20} {w['risk_score']:<12.2%} {w['risk_level']:<12} {w['status']:<15} {w['created']}")
        
        if show_normal and normal_wallets:
            print(f"\n🟢 NORMAL WALLETS ({len(normal_wallets)} total)")
            print("-" * 100)
            print(f"{'ID':<6} {'Wallet Address':<45} {'Pattern':<20} {'Risk':<12} {'Level':<12} {'Status':<15} {'Created'}")
            print("-" * 100)
            for w in normal_wallets:
                print(f"{w['id']:<6} {w['wallet']:<45} {w['pattern']:<20} {w['risk_score']:<12.2%} {w['risk_level']:<12} {w['status']:<15} {w['created']}")
        
        if other_wallets:
            print(f"\n⚪ OTHER WALLETS ({len(other_wallets)} total)")
            print("-" * 100)
            print(f"{'ID':<6} {'Wallet Address':<45} {'Pattern':<20} {'Risk':<12} {'Level':<12} {'Status':<15} {'Created'}")
            print("-" * 100)
            for w in other_wallets:
                print(f"{w['id']:<6} {w['wallet']:<45} {w['pattern']:<20} {w['risk_score']:<12.2%} {w['risk_level']:<12} {w['status']:<15} {w['created']}")
        
        print("\n" + "=" * 100)
        print("💾 Database Location: SQLite/PostgreSQL - 'incident_reports' table")
        print("🔍 Access via API: GET /api/v1/incidents/reports?pattern_type=fraud")
        print("=" * 100)
        
        # Export to file option
        export_file = "wallets_list.txt"
        with open(export_file, "w", encoding="utf-8") as f:
            f.write("=" * 100 + "\n")
            f.write("WALLET DATABASE LISTING\n")
            f.write("=" * 100 + "\n")
            f.write(f"Total: {len(all_reports)} | Fraud: {len(fraud_wallets)} | Normal: {len(normal_wallets)} | Other: {len(other_wallets)}\n")
            f.write("=" * 100 + "\n\n")
            
            if fraud_wallets:
                f.write(f"FRAUD WALLETS ({len(fraud_wallets)})\n")
                f.write("-" * 100 + "\n")
                for w in fraud_wallets:
                    f.write(f"{w['wallet']} | {w['pattern']} | Risk: {w['risk_score']:.2%} | {w['risk_level']}\n")
                f.write("\n")
            
            if normal_wallets:
                f.write(f"NORMAL WALLETS ({len(normal_wallets)})\n")
                f.write("-" * 100 + "\n")
                for w in normal_wallets:
                    f.write(f"{w['wallet']} | {w['pattern']} | Risk: {w['risk_score']:.2%} | {w['risk_level']}\n")
        
        print(f"📄 Exported to: {export_file}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="List wallets from database")
    parser.add_argument("--fraud-only", action="store_true", help="Show only fraud wallets")
    parser.add_argument("--normal-only", action="store_true", help="Show only normal wallets")
    parser.add_argument("--limit", type=int, help="Limit number of results")
    
    args = parser.parse_args()
    
    show_fraud = not args.normal_only
    show_normal = not args.fraud_only
    
    list_wallets(show_fraud=show_fraud, show_normal=show_normal, limit=args.limit)
