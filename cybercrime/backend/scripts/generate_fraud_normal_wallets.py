"""
Generate Fraud and Normal wallets separately
Creates wallets with clear labels for testing and analysis
"""

import sys
import os
from datetime import datetime
import json
import random

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.database import SessionLocal
from app.db.models import IncidentReport
from synthetic_data_generator.generator import generate_wallet_transactions, random_wallet
from synthetic_data_generator.suspicious_patterns import (
    calculate_risk_score,
    detect_rapid_consolidation,
    detect_layering,
    detect_circular_pattern
)
from app.core.ai_service import generate_ai_conclusion

def get_risk_level(score: float) -> str:
    """Convert risk score to human-readable level"""
    if score >= 0.8:
        return "VERY HIGH"
    elif score >= 0.6:
        return "HIGH"
    elif score >= 0.4:
        return "MEDIUM"
    elif score >= 0.2:
        return "LOW"
    return "VERY LOW"

def generate_graph_data(txns, wallet):
    """Generate graph data for visualization"""
    graph = []
    seen_edges = {}
    
    for txn in txns:
        from_addr = txn.get("from", "")
        to_addr = txn.get("to", "")
        amount = txn.get("amount", 0)
        
        edge_key = f"{from_addr}->{to_addr}"
        if edge_key in seen_edges:
            seen_edges[edge_key] += amount
        else:
            seen_edges[edge_key] = amount
    
    for edge, total_amount in seen_edges.items():
        from_addr, to_addr = edge.split("->")
        graph.append({
            "from": from_addr,
            "to": to_addr,
            "amount": total_amount
        })
    
    return graph

def generate_timeline(txns):
    """Generate timeline data"""
    timeline = []
    for txn in sorted(txns, key=lambda x: x.get("timestamp", "")):
        timestamp = txn.get("timestamp", "")
        try:
            dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
            time_str = dt.strftime("%H:%M")
        except:
            time_str = timestamp[:5] if len(timestamp) > 5 else timestamp
        
        timeline.append({
            "time": time_str,
            "amount": txn.get("amount", 0),
            "timestamp": timestamp
        })
    return timeline

def get_detected_patterns_list(txns):
    """Get list of detected suspicious patterns"""
    patterns = []
    
    if detect_rapid_consolidation(txns):
        patterns.append("Rapid Consolidation")
    
    if detect_layering(txns):
        patterns.append("Money Laundering (Layering)")
        patterns.append("Multiple Hop Transfers")
    
    if detect_circular_pattern(txns):
        patterns.append("Circular Movement")
    
    amounts = [t.get("amount", 0) for t in txns]
    if len([a for a in amounts if 9000 < a < 10000]) >= 3:
        patterns.append("Structuring Detected")
    
    if len(txns) > 15:
        patterns.append("High Transaction Frequency")
    
    return patterns if patterns else ["No obvious patterns detected"]

def generate_system_conclusion(risk_score, risk_level, pattern_type, detected_patterns):
    """Fallback template conclusion"""
    conclusions = {
        "fraud": "This wallet exhibits behavior consistent with fraudulent activity, involving rapid fund aggregation from multiple sources followed by immediate consolidation.",
        "money_laundering": "This wallet exhibits behavior consistent with money laundering via layering, involving rapid fund aggregation followed by multi-hop transfers.",
        "ponzi": "This wallet exhibits behavior consistent with a Ponzi scheme, showing multiple investors over time with early investors receiving returns funded by later investors.",
        "ransomware": "This wallet exhibits behavior consistent with ransomware payment collection, showing multiple round-number payments from different sources followed by periodic consolidation.",
        "normal": "This wallet shows normal transaction patterns consistent with regular user activity. No suspicious patterns detected.",
    }
    
    base_conclusion = conclusions.get(pattern_type, "This wallet shows unusual transaction patterns that warrant further investigation.")
    
    if risk_score >= 0.8:
        severity = f"The risk score of {risk_score:.0%} indicates a very high likelihood of financial crime."
    elif risk_score >= 0.6:
        severity = f"The risk score of {risk_score:.0%} indicates a high likelihood of suspicious activity."
    elif risk_score >= 0.2:
        severity = f"The risk score of {risk_score:.0%} indicates moderate risk requiring monitoring."
    else:
        severity = f"The risk score of {risk_score:.0%} indicates low risk with normal activity patterns."
    
    return f"{base_conclusion} {severity}"

def create_wallet_report(wallet, pattern_mode, description, db, use_ai=True):
    """Create a single wallet report"""
    try:
        # Generate transactions
        txns = generate_wallet_transactions(wallet, mode=pattern_mode)
        
        # Calculate metrics
        total_in = sum(t.get("amount", 0) for t in txns if t.get("to") == wallet)
        total_out = sum(t.get("amount", 0) for t in txns if t.get("from") == wallet)
        unique_senders = len(set(t.get("from") for t in txns if t.get("from") != wallet))
        unique_receivers = len(set(t.get("to") for t in txns if t.get("to") != wallet))
        
        # Calculate risk score
        risk_score = calculate_risk_score(txns)
        risk_level = get_risk_level(risk_score)
        
        # Get detected patterns
        detected_patterns = get_detected_patterns_list(txns)
        
        # Generate graph and timeline
        graph_data = generate_graph_data(txns, wallet)
        timeline = generate_timeline(txns)
        
        # Build transaction details
        tx_details = []
        for idx, t in enumerate(txns):
            amount = float(t.get("amount", 0))
            direction = "related"
            if t.get("from") == wallet and t.get("to") != wallet:
                direction = "outgoing"
            elif t.get("to") == wallet and t.get("from") != wallet:
                direction = "incoming"
            
            suspicious = amount >= max(total_in, total_out) * 0.4 or amount > 10000
            tx_details.append({
                "id": idx + 1,
                "from_address": t.get("from", ""),
                "to_address": t.get("to", ""),
                "amount": amount,
                "direction": direction,
                "timestamp": t.get("timestamp"),
                "type": t.get("type", None),
                "suspicious": suspicious,
            })
        
        # Generate summary
        summary_obj = {
            "total_in": total_in,
            "total_out": total_out,
            "tx_count": len(txns),
            "unique_senders": unique_senders,
            "unique_receivers": unique_receivers,
            "pattern_type": pattern_mode.replace("_", " ").title(),
            "transactions": tx_details,
        }
        
        # Generate conclusion using AI or template
        if use_ai:
            try:
                system_conclusion = generate_ai_conclusion(
                    wallet=wallet,
                    risk_score=risk_score,
                    risk_level=risk_level,
                    pattern_type=pattern_mode,
                    detected_patterns=detected_patterns,
                    summary={
                        "total_in": total_in,
                        "total_out": total_out,
                        "tx_count": len(txns),
                        "unique_senders": unique_senders,
                        "unique_receivers": unique_receivers,
                    },
                    user_description=description,
                    fallback_to_template=True
                )
                ai_used = True
            except Exception as e:
                system_conclusion = generate_system_conclusion(
                    risk_score, risk_level, pattern_mode, detected_patterns
                )
                ai_used = False
        else:
            system_conclusion = generate_system_conclusion(
                risk_score, risk_level, pattern_mode, detected_patterns
            )
            ai_used = False
        
        # Create report
        report = IncidentReport(
            wallet_address=wallet,
            user_description=description,
            risk_score=risk_score,
            risk_level=risk_level,
            detected_patterns=json.dumps(detected_patterns),
            summary=json.dumps(summary_obj),
            graph_data=json.dumps(graph_data),
            timeline=json.dumps(timeline),
            system_conclusion=system_conclusion,
            status="investigating",
            notes=json.dumps([]),
            investigator_id=None,
        )
        
        db.add(report)
        return True, len(txns), ai_used
        
    except Exception as e:
        return False, 0, False

def generate_fraud_normal_wallets(num_fraud=500, num_normal=500, use_ai=True):
    """Generate fraud and normal wallets separately"""
    db = SessionLocal()
    
    fraud_patterns = ["fraud", "money_laundering", "ponzi", "ransomware"]
    fraud_descriptions = [
        "Suspicious wallet activity detected - potential fraud",
        "Multiple victim payments followed by rapid consolidation",
        "Money laundering pattern detected with layering",
        "Ponzi scheme suspected - multiple investors",
        "Ransomware payment collection detected",
        "High-risk wallet with suspicious transaction patterns",
    ]
    
    normal_descriptions = [
        "Regular wallet activity - normal user transactions",
        "Standard transaction patterns - no suspicious activity",
        "Normal daily wallet usage",
        "Regular spending and receiving patterns",
        "Typical user wallet behavior",
    ]
    
    print("=" * 70)
    print("Generating Fraud and Normal Wallets")
    print("=" * 70)
    print(f"📊 Fraud Wallets: {num_fraud}")
    print(f"✅ Normal Wallets: {num_normal}")
    print(f"🤖 AI Analysis: {'Enabled' if use_ai else 'Disabled'}")
    print("=" * 70)
    
    created_fraud = 0
    created_normal = 0
    errors_fraud = 0
    errors_normal = 0
    ai_success = 0
    ai_failed = 0
    
    # Generate FRAUD wallets
    print(f"\n🔴 Generating {num_fraud} FRAUD wallets...")
    for i in range(num_fraud):
        try:
            wallet = f"0x{''.join([random.choice('0123456789abcdef') for _ in range(40)])}"
            pattern = random.choice(fraud_patterns)
            description = random.choice(fraud_descriptions)
            
            success, tx_count, ai_used = create_wallet_report(
                wallet, pattern, description, db, use_ai
            )
            
            if success:
                created_fraud += 1
                if ai_used:
                    ai_success += 1
                else:
                    ai_failed += 1
                
                if (i + 1) % 50 == 0:
                    db.commit()
                    print(f"  ✓ Created {i + 1}/{num_fraud} fraud wallets...")
            else:
                errors_fraud += 1
                
        except Exception as e:
            errors_fraud += 1
            db.rollback()
            continue
    
    # Commit fraud batch
    try:
        db.commit()
        print(f"  ✅ Completed {created_fraud} fraud wallets")
    except Exception as e:
        print(f"  ❌ Error committing fraud batch: {e}")
        db.rollback()
    
    # Generate NORMAL wallets
    print(f"\n🟢 Generating {num_normal} NORMAL wallets...")
    for i in range(num_normal):
        try:
            wallet = f"0x{''.join([random.choice('0123456789abcdef') for _ in range(40)])}"
            description = random.choice(normal_descriptions)
            
            success, tx_count, ai_used = create_wallet_report(
                wallet, "normal", description, db, use_ai
            )
            
            if success:
                created_normal += 1
                if ai_used:
                    ai_success += 1
                else:
                    ai_failed += 1
                
                if (i + 1) % 50 == 0:
                    db.commit()
                    print(f"  ✓ Created {i + 1}/{num_normal} normal wallets...")
            else:
                errors_normal += 1
                
        except Exception as e:
            errors_normal += 1
            db.rollback()
            continue
    
    # Final commit
    try:
        db.commit()
        print(f"  ✅ Completed {created_normal} normal wallets")
    except Exception as e:
        print(f"  ❌ Error committing normal batch: {e}")
        db.rollback()
    
    # Summary
    print("\n" + "=" * 70)
    print("📊 GENERATION SUMMARY")
    print("=" * 70)
    print(f"🔴 Fraud Wallets:     {created_fraud}/{num_fraud} created ({errors_fraud} errors)")
    print(f"🟢 Normal Wallets:   {created_normal}/{num_normal} created ({errors_normal} errors)")
    print(f"🤖 AI Analysis:      {ai_success} successful, {ai_failed} used template")
    print(f"📁 Total Saved:      {created_fraud + created_normal} wallets")
    print(f"💾 Database Table:   incident_reports")
    print("=" * 70)
    print("\n✅ You can now filter wallets by:")
    print("   - Risk Level: HIGH/VERY HIGH = Fraud, LOW/VERY LOW = Normal")
    print("   - Pattern Type: fraud/money_laundering/ponzi/ransomware = Fraud")
    print("   - Pattern Type: normal = Normal")
    print("\n🔍 View in Dashboard:")
    print("   - AI Analysis History (Investigator)")
    print("   - Escalations (Superadmin)")
    print("   - Dashboard Priority Queue (Superadmin)")
    
    db.close()

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Generate Fraud and Normal wallets")
    parser.add_argument("--fraud", type=int, default=500, help="Number of fraud wallets (default: 500)")
    parser.add_argument("--normal", type=int, default=500, help="Number of normal wallets (default: 500)")
    parser.add_argument("--no-ai", action="store_true", help="Disable AI analysis (use templates only)")
    
    args = parser.parse_args()
    
    generate_fraud_normal_wallets(
        num_fraud=args.fraud,
        num_normal=args.normal,
        use_ai=not args.no_ai
    )
