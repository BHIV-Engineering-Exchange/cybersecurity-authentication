"""
Predict fraud for transactions using trained model
"""

import sys
import os

# Fix Windows console encoding for emojis
if sys.platform == "win32":
    import codecs
    sys.stdout = codecs.getwriter("utf-8")(sys.stdout.buffer, "strict")
    sys.stderr = codecs.getwriter("utf-8")(sys.stderr.buffer, "strict")

import pandas as pd
import numpy as np
import joblib
import json

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.database import SessionLocal
from app.db.models import FraudTransaction


def load_model(model_path=None):
    """Load the latest trained model"""
    if model_path is None:
        model_path = "backend/ml_models/fraud_model_latest.pkl"
    
    if not os.path.exists(model_path):
        raise FileNotFoundError(f"Model not found: {model_path}. Please train the model first.")
    
    model = joblib.load(model_path)
    
    # Load metadata
    metadata_path = model_path.replace(".pkl", "_metadata.json")
    if os.path.exists(metadata_path):
        with open(metadata_path, "r") as f:
            metadata = json.load(f)
    else:
        metadata = None
    
    return model, metadata


def prepare_features(tx_data, feature_columns):
    """Prepare features for a single transaction"""
    df = pd.DataFrame([tx_data])
    
    # Feature engineering (same as training)
    type_mapping = {
        "CASH_IN": 0,
        "CASH_OUT": 1,
        "DEBIT": 2,
        "PAYMENT": 3,
        "TRANSFER": 4
    }
    df["type_encoded"] = df["type"].map(type_mapping)
    
    df["balance_change_orig"] = df["newbalanceOrig"] - df["oldbalanceOrg"]
    df["balance_change_dest"] = df["newbalanceDest"] - df["oldbalanceDest"]
    
    df["balance_ratio_orig"] = np.where(
        df["oldbalanceOrg"] > 0,
        df["newbalanceOrig"] / df["oldbalanceOrg"],
        0
    )
    df["balance_ratio_dest"] = np.where(
        df["oldbalanceDest"] > 0,
        df["newbalanceDest"] / df["oldbalanceDest"],
        0
    )
    
    df["amount_ratio_orig"] = np.where(
        df["oldbalanceOrg"] > 0,
        df["amount"] / df["oldbalanceOrg"],
        df["amount"]
    )
    
    df["amount_log"] = np.log1p(df["amount"])
    df["orig_is_customer"] = df["nameOrig"].str.startswith("C").astype(int)
    df["dest_is_customer"] = df["nameDest"].str.startswith("C").astype(int)
    df["dest_is_merchant"] = df["nameDest"].str.startswith("M").astype(int)
    df["zero_balance_after"] = (df["newbalanceOrig"] == 0).astype(int)
    df["large_transaction"] = (df["amount"] > df["oldbalanceOrg"] * 0.9).astype(int)
    
    # Select features
    X = df[feature_columns].fillna(0)
    
    return X


def predict_transaction(transaction_id=None, transaction_data=None):
    """Predict fraud for a transaction"""
    model, metadata = load_model()
    
    if metadata:
        feature_columns = metadata["feature_columns"]
    else:
        # Default feature columns (should match training)
        feature_columns = [
            "step", "type_encoded", "amount", "amount_log",
            "oldbalanceOrg", "newbalanceOrig", "oldbalanceDest", "newbalanceDest",
            "balance_change_orig", "balance_change_dest",
            "balance_ratio_orig", "balance_ratio_dest", "amount_ratio_orig",
            "orig_is_customer", "dest_is_customer", "dest_is_merchant",
            "zero_balance_after", "large_transaction"
        ]
    
    # Get transaction data
    if transaction_id:
        db = SessionLocal()
        try:
            tx = db.query(FraudTransaction).filter(FraudTransaction.id == transaction_id).first()
            if not tx:
                raise ValueError(f"Transaction {transaction_id} not found")
            
            tx_data = {
                "step": tx.step,
                "type": tx.type,
                "amount": tx.amount,
                "nameOrig": tx.name_orig,
                "oldbalanceOrg": tx.old_balance_orig,
                "newbalanceOrig": tx.new_balance_orig,
                "nameDest": tx.name_dest,
                "oldbalanceDest": tx.old_balance_dest or 0,
                "newbalanceDest": tx.new_balance_dest or 0,
            }
        finally:
            db.close()
    elif transaction_data:
        tx_data = transaction_data
    else:
        raise ValueError("Either transaction_id or transaction_data must be provided")
    
    # Prepare features
    X = prepare_features(tx_data, feature_columns)
    
    # Predict
    prediction = model.predict(X)[0]
    probability = model.predict_proba(X)[0]
    
    return {
        "is_fraud": int(prediction),
        "fraud_probability": float(probability[1]),
        "normal_probability": float(probability[0]),
        "prediction": "FRAUD" if prediction == 1 else "NORMAL",
        "confidence": float(max(probability))
    }


def predict_all_transactions(limit=None):
    """Predict fraud for all transactions in database"""
    db = SessionLocal()
    try:
        query = db.query(FraudTransaction)
        if limit:
            query = query.limit(limit)
        transactions = query.all()
        
        model, metadata = load_model()
        feature_columns = metadata["feature_columns"] if metadata else None
        
        results = []
        for tx in transactions:
            try:
                prediction = predict_transaction(transaction_data={
                    "step": tx.step,
                    "type": tx.type,
                    "amount": tx.amount,
                    "nameOrig": tx.name_orig,
                    "oldbalanceOrg": tx.old_balance_orig,
                    "newbalanceOrig": tx.new_balance_orig,
                    "nameDest": tx.name_dest,
                    "oldbalanceDest": tx.old_balance_dest or 0,
                    "newbalanceDest": tx.new_balance_dest or 0,
                })
                
                results.append({
                    "transaction_id": tx.id,
                    "actual_is_fraud": tx.is_fraud,
                    "predicted_is_fraud": prediction["is_fraud"],
                    "fraud_probability": prediction["fraud_probability"],
                    "correct": tx.is_fraud == prediction["is_fraud"]
                })
            except Exception as e:
                print(f"Error predicting transaction {tx.id}: {e}")
                continue
        
        return results
    finally:
        db.close()


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Predict fraud for transactions")
    parser.add_argument("--transaction-id", type=int, help="Predict specific transaction by ID")
    parser.add_argument("--all", action="store_true", help="Predict all transactions")
    parser.add_argument("--limit", type=int, help="Limit number of transactions to predict")
    
    args = parser.parse_args()
    
    if args.transaction_id:
        result = predict_transaction(transaction_id=args.transaction_id)
        print(f"\n🔍 Prediction for Transaction {args.transaction_id}:")
        print(f"   Prediction: {result['prediction']}")
        print(f"   Fraud Probability: {result['fraud_probability']:.2%}")
        print(f"   Normal Probability: {result['normal_probability']:.2%}")
        print(f"   Confidence: {result['confidence']:.2%}")
    
    elif args.all:
        print("🔍 Predicting fraud for all transactions...")
        results = predict_all_transactions(limit=args.limit)
        
        correct = sum(1 for r in results if r["correct"])
        total = len(results)
        accuracy = correct / total if total > 0 else 0
        
        print(f"\n📊 Prediction Results:")
        print(f"   Total: {total}")
        print(f"   Correct: {correct}")
        print(f"   Accuracy: {accuracy:.2%}")
        
        # Show some examples
        print(f"\n📋 Sample Predictions:")
        for r in results[:10]:
            status = "✅" if r["correct"] else "❌"
            print(f"   {status} TX {r['transaction_id']}: Actual={r['actual_is_fraud']}, Predicted={r['predicted_is_fraud']}, Prob={r['fraud_probability']:.2%}")
    else:
        print("Please specify --transaction-id or --all")
