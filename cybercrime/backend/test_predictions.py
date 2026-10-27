"""Quick test of fraud predictions"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from ml_training.predict_fraud import predict_transaction
from app.db.database import SessionLocal
from app.db.models import FraudTransaction

db = SessionLocal()

# Test fraud transaction
fraud_tx = db.query(FraudTransaction).filter(FraudTransaction.is_fraud == 1).first()
if fraud_tx:
    print("=" * 60)
    print("FRAUD Transaction Test")
    print("=" * 60)
    result = predict_transaction(transaction_id=fraud_tx.id)
    print(f"Transaction ID: {fraud_tx.id}")
    print(f"Prediction: {result['prediction']}")
    print(f"Fraud Probability: {result['fraud_probability']:.2%}")
    print(f"Actual: FRAUD")
    print(f"Match: {'YES ✓' if result['is_fraud'] == 1 else 'NO ✗'}")
    print()

# Test normal transaction
normal_tx = db.query(FraudTransaction).filter(FraudTransaction.is_fraud == 0).first()
if normal_tx:
    print("=" * 60)
    print("NORMAL Transaction Test")
    print("=" * 60)
    result = predict_transaction(transaction_id=normal_tx.id)
    print(f"Transaction ID: {normal_tx.id}")
    print(f"Prediction: {result['prediction']}")
    print(f"Fraud Probability: {result['fraud_probability']:.2%}")
    print(f"Actual: NORMAL")
    print(f"Match: {'YES ✓' if result['is_fraud'] == 0 else 'NO ✗'}")
    print()

db.close()
