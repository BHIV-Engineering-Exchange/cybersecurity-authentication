"""
Example usage of the synthetic data generator
Shows all suspicious patterns
"""

from generator import generate_wallet_transactions, random_wallet
from suspicious_patterns import calculate_risk_score, detect_rapid_consolidation

if __name__ == "__main__":
    wallet = "WALLET_XYZ"

    print("=" * 70)
    print("Synthetic Data Generator - All Suspicious Patterns")
    print("=" * 70)

    patterns = [
        ("normal", "Normal Activity"),
        ("fraud", "Classic Fraud"),
        ("money_laundering", "Money Laundering (Layering)"),
        ("ponzi", "Ponzi Scheme"),
        ("ransomware", "Ransomware Payments"),
        ("circular", "Circular Transactions"),
        ("mixing", "Mixing Service"),
        ("pump_dump", "Pump & Dump Scheme"),
    ]

    for mode, name in patterns:
        print(f"\n{'='*70}")
        print(f"{name.upper()} ({mode})")
        print("="*70)
        
        txns = generate_wallet_transactions(wallet, mode=mode)
        print(f"Generated {len(txns)} transactions")
        
        # Calculate risk score
        risk = calculate_risk_score(txns)
        print(f"Risk Score: {risk:.2%}")
        
        # Show sample transactions
        if txns:
            print("\nSample transactions:")
            for i, txn in enumerate(txns[:5], 1):
                print(f"  {i}. {txn['from']} → {txn['to']}: ${txn['amount']:,}")
                print(f"     Time: {txn['timestamp']}")
        
        # Show totals
        total_in = sum(t['amount'] for t in txns if t.get('to') == wallet)
        total_out = sum(t['amount'] for t in txns if t.get('from') == wallet)
        if total_in > 0 or total_out > 0:
            print(f"\nTotal Incoming: ${total_in:,}")
            print(f"Total Outgoing: ${total_out:,}")
            if total_in > total_out:
                print(f"Net Gain: ${total_in - total_out:,}")
            elif total_out > total_in:
                print(f"Net Loss: ${total_out - total_in:,}")
