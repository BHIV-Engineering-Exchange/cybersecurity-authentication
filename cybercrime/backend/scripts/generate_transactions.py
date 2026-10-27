"""
Generate transaction dataset and save to database
"""

import sys
import os

# Fix Windows console encoding for emojis
if sys.platform == "win32":
    import codecs
    sys.stdout = codecs.getwriter("utf-8")(sys.stdout.buffer, "strict")
    sys.stderr = codecs.getwriter("utf-8")(sys.stderr.buffer, "strict")

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.database import SessionLocal, engine, Base
from app.db.models import FraudTransaction
from transaction_generator.generator import generate_transaction_dataset
from sqlalchemy import inspect

def create_table_if_not_exists():
    """Create fraud_transactions table if it doesn't exist"""
    inspector = inspect(engine)
    
    if "fraud_transactions" not in inspector.get_table_names():
        print("📋 Creating fraud_transactions table...")
        try:
            FraudTransaction.__table__.create(bind=engine, checkfirst=True)
            print("✅ Table created successfully")
        except Exception as e:
            print(f"⚠️  Error creating table: {e}")
            raise
    else:
        print("✅ fraud_transactions table already exists")

def save_transactions_to_db(num_normal=10000, num_fraud=1000, steps=744):
    """Generate and save transactions to database"""
    db = SessionLocal()
    
    try:
        print("=" * 70)
        print("Generating Transaction Dataset")
        print("=" * 70)
        print(f"Normal Transactions: {num_normal}")
        print(f"Fraud Transactions: {num_fraud}")
        print(f"Time Steps: {steps} (30 days)")
        print("=" * 70)
        
        # Create table if it doesn't exist
        create_table_if_not_exists()
        
        # Generate transactions
        transactions = generate_transaction_dataset(
            num_normal=num_normal,
            num_fraud=num_fraud,
            steps=steps
        )
        
        # Save to database
        print(f"\n💾 Saving {len(transactions)} transactions to database...")
        saved = 0
        
        for i, tx_data in enumerate(transactions):
            try:
                transaction = FraudTransaction(
                    step=tx_data["step"],
                    type=tx_data["type"],
                    amount=tx_data["amount"],
                    name_orig=tx_data["nameOrig"],
                    old_balance_orig=tx_data["oldbalanceOrg"],
                    new_balance_orig=tx_data["newbalanceOrig"],
                    name_dest=tx_data["nameDest"],
                    old_balance_dest=tx_data.get("oldbalanceDest"),
                    new_balance_dest=tx_data.get("newbalanceDest"),
                    is_fraud=tx_data["isFraud"]
                )
                db.add(transaction)
                saved += 1
                
                # Commit in batches
                if (i + 1) % 1000 == 0:
                    db.commit()
                    print(f"  ✓ Saved {i + 1}/{len(transactions)} transactions...")
                    
            except Exception as e:
                print(f"  ⚠️  Error saving transaction {i+1}: {e}")
                db.rollback()
                continue
        
        # Final commit
        db.commit()
        
        print("\n" + "=" * 70)
        print("✅ DATASET GENERATION COMPLETE")
        print("=" * 70)
        print(f"📊 Total Transactions: {saved}")
        print(f"✅ Normal: {sum(1 for tx in transactions if tx['isFraud'] == 0)}")
        print(f"🔴 Fraud: {sum(1 for tx in transactions if tx['isFraud'] == 1)}")
        print(f"💾 Database Table: fraud_transactions")
        print("=" * 70)
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Generate transaction dataset")
    parser.add_argument("--normal", type=int, default=10000, help="Number of normal transactions (default: 10000)")
    parser.add_argument("--fraud", type=int, default=1000, help="Number of fraud transactions (default: 1000)")
    parser.add_argument("--steps", type=int, default=744, help="Number of time steps (default: 744 = 30 days)")
    
    args = parser.parse_args()
    
    save_transactions_to_db(
        num_normal=args.normal,
        num_fraud=args.fraud,
        steps=args.steps
    )
