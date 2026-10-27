"""
Train fraud detection model on transaction data
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
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score, roc_auc_score, roc_curve
import joblib
import json
from datetime import datetime

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.database import SessionLocal
from app.db.models import FraudTransaction

def load_transaction_data():
    """Load transactions from database"""
    db = SessionLocal()
    try:
        transactions = db.query(FraudTransaction).all()
        
        data = []
        for tx in transactions:
            data.append({
                "step": tx.step,
                "type": tx.type,
                "amount": tx.amount,
                "nameOrig": tx.name_orig,
                "oldbalanceOrg": tx.old_balance_orig,
                "newbalanceOrig": tx.new_balance_orig,
                "nameDest": tx.name_dest,
                "oldbalanceDest": tx.old_balance_dest or 0,
                "newbalanceDest": tx.new_balance_dest or 0,
                "isFraud": tx.is_fraud
            })
        
        df = pd.DataFrame(data)
        print(f"✅ Loaded {len(df)} transactions from database")
        print(f"   Normal: {len(df[df['isFraud'] == 0])}")
        print(f"   Fraud: {len(df[df['isFraud'] == 1])}")
        
        return df
    finally:
        db.close()


def feature_engineering(df):
    """Create features for machine learning"""
    df = df.copy()
    
    # Encode transaction type
    type_mapping = {
        "CASH_IN": 0,
        "CASH_OUT": 1,
        "DEBIT": 2,
        "PAYMENT": 3,
        "TRANSFER": 4
    }
    df["type_encoded"] = df["type"].map(type_mapping)
    
    # Balance change features
    df["balance_change_orig"] = df["newbalanceOrig"] - df["oldbalanceOrg"]
    df["balance_change_dest"] = df["newbalanceDest"] - df["oldbalanceDest"]
    
    # Balance ratio features
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
    
    # Amount relative to balance
    df["amount_ratio_orig"] = np.where(
        df["oldbalanceOrg"] > 0,
        df["amount"] / df["oldbalanceOrg"],
        df["amount"]
    )
    
    # Transaction size category
    df["amount_log"] = np.log1p(df["amount"])
    
    # Customer type (C or M)
    df["orig_is_customer"] = df["nameOrig"].str.startswith("C").astype(int)
    df["dest_is_customer"] = df["nameDest"].str.startswith("C").astype(int)
    df["dest_is_merchant"] = df["nameDest"].str.startswith("M").astype(int)
    
    # Zero balance after transaction (common in fraud)
    df["zero_balance_after"] = (df["newbalanceOrig"] == 0).astype(int)
    
    # Large transaction relative to balance
    df["large_transaction"] = (df["amount"] > df["oldbalanceOrg"] * 0.9).astype(int)
    
    # Select features for training
    feature_columns = [
        "step",
        "type_encoded",
        "amount",
        "amount_log",
        "oldbalanceOrg",
        "newbalanceOrig",
        "oldbalanceDest",
        "newbalanceDest",
        "balance_change_orig",
        "balance_change_dest",
        "balance_ratio_orig",
        "balance_ratio_dest",
        "amount_ratio_orig",
        "orig_is_customer",
        "dest_is_customer",
        "dest_is_merchant",
        "zero_balance_after",
        "large_transaction"
    ]
    
    X = df[feature_columns].fillna(0)
    y = df["isFraud"]
    
    return X, y, feature_columns


def train_model(X, y, model_type="random_forest"):
    """Train fraud detection model"""
    print(f"\n🔧 Training {model_type} model...")
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    
    print(f"   Training set: {len(X_train)} samples")
    print(f"   Test set: {len(X_test)} samples")
    
    # Train model
    if model_type == "random_forest":
        model = RandomForestClassifier(
            n_estimators=100,
            max_depth=20,
            min_samples_split=10,
            min_samples_leaf=5,
            random_state=42,
            n_jobs=-1,
            class_weight="balanced"  # Handle imbalanced data
        )
    elif model_type == "gradient_boosting":
        model = GradientBoostingClassifier(
            n_estimators=100,
            max_depth=10,
            learning_rate=0.1,
            random_state=42
        )
    else:
        raise ValueError(f"Unknown model type: {model_type}")
    
    model.fit(X_train, y_train)
    
    # Evaluate
    y_pred = model.predict(X_test)
    y_pred_proba = model.predict_proba(X_test)[:, 1]
    
    accuracy = accuracy_score(y_test, y_pred)
    auc = roc_auc_score(y_test, y_pred_proba)
    
    print(f"\n📊 Model Performance:")
    print(f"   Accuracy: {accuracy:.4f}")
    print(f"   ROC-AUC: {auc:.4f}")
    
    print(f"\n📋 Classification Report:")
    print(classification_report(y_test, y_pred, target_names=["Normal", "Fraud"]))
    
    print(f"\n📊 Confusion Matrix:")
    cm = confusion_matrix(y_test, y_pred)
    print(f"   True Negatives (Normal): {cm[0][0]}")
    print(f"   False Positives: {cm[0][1]}")
    print(f"   False Negatives: {cm[1][0]}")
    print(f"   True Positives (Fraud): {cm[1][1]}")
    
    # Feature importance
    if hasattr(model, "feature_importances_"):
        feature_importance = pd.DataFrame({
            "feature": X.columns,
            "importance": model.feature_importances_
        }).sort_values("importance", ascending=False)
        
        print(f"\n🔍 Top 10 Most Important Features:")
        for idx, row in feature_importance.head(10).iterrows():
            print(f"   {row['feature']}: {row['importance']:.4f}")
    
    return model, {
        "accuracy": float(accuracy),
        "roc_auc": float(auc),
        "confusion_matrix": cm.tolist(),
        "classification_report": classification_report(y_test, y_pred, output_dict=True)
    }


def save_model(model, metrics, feature_columns, model_dir="backend/ml_models"):
    """Save trained model and metadata"""
    os.makedirs(model_dir, exist_ok=True)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    model_path = os.path.join(model_dir, f"fraud_model_{timestamp}.pkl")
    metadata_path = os.path.join(model_dir, f"fraud_model_{timestamp}_metadata.json")
    
    # Save model
    joblib.dump(model, model_path)
    print(f"\n💾 Model saved to: {model_path}")
    
    # Save metadata
    metadata = {
        "timestamp": timestamp,
        "model_type": type(model).__name__,
        "metrics": metrics,
        "feature_columns": feature_columns,
        "model_path": model_path
    }
    
    with open(metadata_path, "w") as f:
        json.dump(metadata, f, indent=2)
    
    print(f"💾 Metadata saved to: {metadata_path}")
    
    # Save latest model reference
    latest_path = os.path.join(model_dir, "fraud_model_latest.pkl")
    latest_metadata_path = os.path.join(model_dir, "fraud_model_latest_metadata.json")
    
    import shutil
    shutil.copy(model_path, latest_path)
    shutil.copy(metadata_path, latest_metadata_path)
    
    print(f"💾 Latest model reference updated")
    
    return model_path, metadata_path


def main():
    """Main training function"""
    print("=" * 70)
    print("FRAUD DETECTION MODEL TRAINING")
    print("=" * 70)
    
    # Load data
    df = load_transaction_data()
    
    if len(df) == 0:
        print("❌ No transactions found in database!")
        print("   Please run: python scripts/generate_transactions.py")
        return
    
    if len(df[df["isFraud"] == 1]) == 0:
        print("❌ No fraud transactions found in database!")
        print("   Please generate transactions with fraud data")
        return
    
    # Feature engineering
    print("\n🔧 Engineering features...")
    X, y, feature_columns = feature_engineering(df)
    
    # Train model
    model, metrics = train_model(X, y, model_type="random_forest")
    
    # Save model
    model_path, metadata_path = save_model(model, metrics, feature_columns)
    
    print("\n" + "=" * 70)
    print("✅ TRAINING COMPLETE")
    print("=" * 70)
    print(f"📊 Model Accuracy: {metrics['accuracy']:.2%}")
    print(f"📊 ROC-AUC Score: {metrics['roc_auc']:.4f}")
    print(f"💾 Model saved and ready for predictions")
    print("=" * 70)


if __name__ == "__main__":
    main()
