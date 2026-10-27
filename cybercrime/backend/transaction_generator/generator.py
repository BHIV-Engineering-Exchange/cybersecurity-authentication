"""
Transaction Generator for Fraud Detection Dataset
Generates transaction data similar to financial fraud detection datasets
"""

import random
from typing import List, Dict
from datetime import datetime, timedelta

TRANSACTION_TYPES = ["CASH_IN", "CASH_OUT", "DEBIT", "PAYMENT", "TRANSFER"]


def generate_customer_id(prefix: str = "C", index: int = None) -> str:
    """Generate customer ID (C for customers, M for merchants)"""
    if index is None:
        index = random.randint(1000000000, 9999999999)
    return f"{prefix}{index}"


def generate_normal_transaction(
    step: int,
    customer_id: str,
    current_balance: float,
    transaction_id: int = None
) -> Dict:
    """Generate a single normal transaction"""
    tx_type = random.choice(TRANSACTION_TYPES)
    amount = 0.0
    new_balance_orig = current_balance
    name_dest = None
    old_balance_dest = None
    new_balance_dest = None
    
    if tx_type == "CASH_IN":
        # Customer receives money
        amount = random.uniform(100, 10000)
        new_balance_orig = current_balance + amount
        name_dest = generate_customer_id("C")
        old_balance_dest = random.uniform(0, 50000)
        new_balance_dest = old_balance_dest - amount
    
    elif tx_type == "CASH_OUT":
        # Customer withdraws money
        max_withdraw = min(current_balance * 0.9, 5000)
        amount = random.uniform(50, max_withdraw) if max_withdraw > 50 else random.uniform(10, current_balance)
        new_balance_orig = current_balance - amount
        name_dest = generate_customer_id("M")  # Merchant/ATM
        old_balance_dest = None  # Merchants don't have balance info
        new_balance_dest = None
    
    elif tx_type == "PAYMENT":
        # Payment to merchant
        max_payment = min(current_balance * 0.8, 3000)
        amount = random.uniform(10, max_payment) if max_payment > 10 else random.uniform(1, current_balance)
        new_balance_orig = current_balance - amount
        name_dest = generate_customer_id("M")  # Merchant
        old_balance_dest = None
        new_balance_dest = None
    
    elif tx_type == "TRANSFER":
        # Transfer to another customer
        max_transfer = min(current_balance * 0.7, 2000)
        amount = random.uniform(50, max_transfer) if max_transfer > 50 else random.uniform(10, current_balance)
        new_balance_orig = current_balance - amount
        name_dest = generate_customer_id("C")
        old_balance_dest = random.uniform(0, 30000)
        new_balance_dest = old_balance_dest + amount
    
    elif tx_type == "DEBIT":
        # Debit transaction
        max_debit = min(current_balance * 0.6, 1500)
        amount = random.uniform(20, max_debit) if max_debit > 20 else random.uniform(5, current_balance)
        new_balance_orig = current_balance - amount
        name_dest = generate_customer_id("M")
        old_balance_dest = None
        new_balance_dest = None
    
    return {
        "step": step,
        "type": tx_type,
        "amount": round(amount, 2),
        "nameOrig": customer_id,
        "oldbalanceOrg": round(current_balance, 2),
        "newbalanceOrig": round(new_balance_orig, 2),
        "nameDest": name_dest,
        "oldbalanceDest": round(old_balance_dest, 2) if old_balance_dest is not None else None,
        "newbalanceDest": round(new_balance_dest, 2) if new_balance_dest is not None else None,
        "isFraud": 0
    }


def generate_fraud_transaction(
    step: int,
    customer_id: str,
    current_balance: float,
    victim_balance: float = None
) -> Dict:
    """Generate a fraudulent transaction (account takeover pattern)"""
    # Fraud pattern: Transfer all/most funds to another account, then cash out
    if victim_balance is None:
        victim_balance = random.uniform(1000, 50000)
    
    # Step 1: Transfer almost all funds to destination
    transfer_amount = current_balance * 0.95  # Transfer 95% of balance
    
    name_dest = generate_customer_id("C")
    old_balance_dest = random.uniform(100, 1000)
    
    return {
        "step": step,
        "type": "TRANSFER",
        "amount": round(transfer_amount, 2),
        "nameOrig": customer_id,
        "oldbalanceOrg": round(current_balance, 2),
        "newbalanceOrig": round(current_balance - transfer_amount, 2),
        "nameDest": name_dest,
        "oldbalanceDest": round(old_balance_dest, 2),
        "newbalanceDest": round(old_balance_dest + transfer_amount, 2),
        "isFraud": 1
    }


def generate_fraud_sequence(
    step_start: int,
    customer_id: str,
    initial_balance: float,
    num_transactions: int = 3
) -> List[Dict]:
    """Generate a sequence of fraudulent transactions"""
    transactions = []
    current_balance = initial_balance
    
    for i in range(num_transactions):
        step = step_start + i
        
        if i == 0:
            # First: Transfer funds to destination
            tx = generate_fraud_transaction(step, customer_id, current_balance)
            transactions.append(tx)
            current_balance = tx["newbalanceOrig"]
        elif i == 1:
            # Second: Cash out from destination (fraudulent account)
            dest_id = transactions[0]["nameDest"]
            dest_balance = transactions[0]["newbalanceDest"]
            cashout_amount = dest_balance * 0.9
            
            transactions.append({
                "step": step,
                "type": "CASH_OUT",
                "amount": round(cashout_amount, 2),
                "nameOrig": dest_id,
                "oldbalanceOrg": round(dest_balance, 2),
                "newbalanceOrig": round(dest_balance - cashout_amount, 2),
                "nameDest": generate_customer_id("M"),
                "oldbalanceDest": None,
                "newbalanceDest": None,
                "isFraud": 1
            })
        else:
            # Additional fraudulent activity
            tx = generate_fraud_transaction(step, customer_id, current_balance)
            transactions.append(tx)
            current_balance = tx["newbalanceOrig"]
    
    return transactions


def generate_transaction_dataset(
    num_normal: int = 10000,
    num_fraud: int = 1000,
    steps: int = 744  # 30 days * 24 hours
) -> List[Dict]:
    """
    Generate a complete transaction dataset
    
    Args:
        num_normal: Number of normal transactions
        num_fraud: Number of fraud transactions (will create fraud sequences)
        steps: Total time steps (default 744 = 30 days)
    
    Returns:
        List of transaction dictionaries
    """
    transactions = []
    customer_balances = {}  # Track balances per customer
    
    # Generate normal transactions
    print(f"Generating {num_normal} normal transactions...")
    for i in range(num_normal):
        step = random.randint(1, steps)
        customer_id = generate_customer_id("C")
        
        # Get or initialize customer balance
        if customer_id not in customer_balances:
            customer_balances[customer_id] = random.uniform(100, 50000)
        
        current_balance = customer_balances[customer_id]
        tx = generate_normal_transaction(step, customer_id, current_balance)
        transactions.append(tx)
        
        # Update balance
        customer_balances[customer_id] = tx["newbalanceOrig"]
        
        if (i + 1) % 1000 == 0:
            print(f"  Generated {i + 1}/{num_normal} normal transactions...")
    
    # Generate fraud transactions (as sequences)
    print(f"Generating {num_fraud} fraud transactions...")
    fraud_customers = set()
    
    for i in range(num_fraud):
        step = random.randint(1, steps - 5)  # Leave room for sequence
        customer_id = generate_customer_id("C")
        fraud_customers.add(customer_id)
        
        # Initialize victim balance
        if customer_id not in customer_balances:
            customer_balances[customer_id] = random.uniform(5000, 50000)
        
        initial_balance = customer_balances[customer_id]
        
        # Generate fraud sequence (3-5 transactions)
        num_fraud_tx = random.randint(3, 5)
        fraud_sequence = generate_fraud_sequence(step, customer_id, initial_balance, num_fraud_tx)
        transactions.extend(fraud_sequence)
        
        # Update balance after fraud
        if fraud_sequence:
            customer_balances[customer_id] = fraud_sequence[-1]["newbalanceOrig"]
        
        if (i + 1) % 100 == 0:
            print(f"  Generated {i + 1}/{num_fraud} fraud sequences...")
    
    # Sort by step
    transactions.sort(key=lambda x: (x["step"], x.get("nameOrig", "")))
    
    print(f"\n✅ Generated {len(transactions)} total transactions")
    print(f"   Normal: {sum(1 for tx in transactions if tx['isFraud'] == 0)}")
    print(f"   Fraud: {sum(1 for tx in transactions if tx['isFraud'] == 1)}")
    print(f"   Unique customers: {len(customer_balances)}")
    print(f"   Fraudulent customers: {len(fraud_customers)}")
    
    return transactions


if __name__ == "__main__":
    # Example usage
    dataset = generate_transaction_dataset(num_normal=1000, num_fraud=100)
    
    # Show sample
    print("\n=== Sample Normal Transaction ===")
    normal_tx = [tx for tx in dataset if tx["isFraud"] == 0][0]
    for key, value in normal_tx.items():
        print(f"{key}: {value}")
    
    print("\n=== Sample Fraud Transaction ===")
    fraud_tx = [tx for tx in dataset if tx["isFraud"] == 1][0]
    for key, value in fraud_tx.items():
        print(f"{key}: {value}")
