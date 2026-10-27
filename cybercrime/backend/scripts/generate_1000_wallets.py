"""
Script to generate 1000 wallet incident reports with various patterns
Run this to populate the database with test data
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
from app.core.ai_service import generate_ai_conclusion
from synthetic_data_generator.generator import generate_wallet_transactions, random_wallet
from synthetic_data_generator.suspicious_patterns import (
    calculate_risk_score,
    detect_rapid_consolidation,
    detect_layering,
    detect_circular_pattern
)

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
    """Fallback template conclusion (used if AI fails)"""
    conclusions = {
        "fraud": "This wallet exhibits behavior consistent with fraudulent activity, involving rapid fund aggregation from multiple sources followed by immediate consolidation.",
        "money_laundering": "This wallet exhibits behavior consistent with money laundering via layering, involving rapid fund aggregation followed by multi-hop transfers.",
        "ponzi": "This wallet exhibits behavior consistent with a Ponzi scheme, showing multiple investors over time with early investors receiving returns funded by later investors.",
        "ransomware": "This wallet exhibits behavior consistent with ransomware payment collection, showing multiple round-number payments from different sources followed by periodic consolidation.",
    }
    
    base_conclusion = conclusions.get(pattern_type, "This wallet shows unusual transaction patterns that warrant further investigation.")
    
    if risk_score >= 0.8:
        severity = f"The risk score of {risk_score:.0%} indicates a very high likelihood of financial crime."
    elif risk_score >= 0.6:
        severity = f"The risk score of {risk_score:.0%} indicates a high likelihood of suspicious activity."
    else:
        severity = f"The risk score of {risk_score:.0%} indicates moderate risk requiring monitoring."
    
    return f"{base_conclusion} {severity}"

def generate_1000_wallets():
    """Generate 1000 wallet incident reports"""
    db = SessionLocal()
    
    # Pattern distribution (to get variety)
    patterns = ["fraud", "money_laundering", "ponzi", "ransomware"]
    pattern_weights = [0.25, 0.25, 0.25, 0.25]  # Equal distribution
    
    descriptions = [
        "Suspicious wallet activity detected",
        "Potential fraud scheme",
        "Money laundering investigation",
        "Ponzi scheme suspected",
        "Ransomware payment collection",
        "Unusual transaction patterns",
        "High-risk wallet monitoring",
        "Suspicious consolidation activity",
        "Multiple victim payments detected",
        "Layering pattern identified"
    ]
    
    print("Generating 1000 wallet incident reports with AI analysis...")
    print("=" * 60)
    print("ℹ️  Using AI analysis (OpenRouter) if available, otherwise template fallback")
    print("=" * 60)
    
    created = 0
    errors = 0
    ai_success = 0
    ai_failed = 0
    
    for i in range(1000):
        try:
            # Generate random wallet address
            wallet = f"0x{''.join([random.choice('0123456789abcdef') for _ in range(40)])}"
            
            # Pick random pattern
            pattern_mode = random.choices(patterns, weights=pattern_weights)[0]
            
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
            
            # Generate conclusion using AI (same as analyze endpoint) or fallback to template
            user_desc = random.choice(descriptions)
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
                    user_description=user_desc,
                    fallback_to_template=True
                )
                ai_success += 1
            except Exception as e:
                # Fallback to template if AI fails
                system_conclusion = generate_system_conclusion(
                    risk_score, risk_level, pattern_mode, detected_patterns
                )
                ai_failed += 1
            
            # Create report
            report = IncidentReport(
                wallet_address=wallet,
                user_description=user_desc,
                risk_score=risk_score,
                risk_level=risk_level,
                detected_patterns=json.dumps(detected_patterns),
                summary=json.dumps(summary_obj),
                graph_data=json.dumps(graph_data),
                timeline=json.dumps(timeline),
                system_conclusion=system_conclusion,
                status=random.choice(["investigating", "under_review", "resolved", "closed"]),
                notes=json.dumps([]),
                investigator_id=None,  # Can be assigned later
            )
            
            db.add(report)
            
            created += 1
            if (i + 1) % 100 == 0:
                db.commit()  # Commit every 100 records
                print(f"✓ Created {i + 1}/1000 reports... ({len(txns)} transactions per wallet)")
        
        except Exception as e:
            errors += 1
            print(f"✗ Error creating report {i + 1}: {e}")
            db.rollback()
            continue
    
    # Final commit
    try:
        db.commit()
        print("=" * 60)
        print(f"✅ Successfully created {created} wallet incident reports!")
        print(f"⚠️  Errors: {errors}")
        print(f"🤖 AI Analysis: {ai_success} successful, {ai_failed} used template fallback")
        print(f"📊 Average transactions per wallet: ~{len(txns) if created > 0 else 0}")
        print(f"💾 Data saved to: incident_reports table")
        print(f"🔍 All wallets are ready for AI analysis via the dashboard!")
    except Exception as e:
        print(f"❌ Error committing final batch: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    generate_1000_wallets()
