"""
Additional suspicious pattern detection helpers
"""

from typing import List, Dict
from datetime import datetime


def detect_rapid_consolidation(txns: List[Dict], threshold_minutes: int = 30) -> bool:
    """
    Detect if multiple incoming transactions are quickly consolidated
    
    Args:
        txns: List of transactions
        threshold_minutes: Time threshold in minutes
    
    Returns:
        True if rapid consolidation detected
    """
    incoming = [t for t in txns if t.get("to") and "from" in t]
    if len(incoming) < 3:
        return False
    
    # Check if multiple incoming followed by single outgoing
    timestamps = [datetime.fromisoformat(t["timestamp"]) for t in incoming]
    time_span = (max(timestamps) - min(timestamps)).total_seconds() / 60
    
    return time_span < threshold_minutes and len(incoming) >= 3


def detect_layering(txns: List[Dict], min_hops: int = 3) -> bool:
    """
    Detect money laundering layering pattern
    
    Args:
        txns: List of transactions
        min_hops: Minimum number of transaction hops
    
    Returns:
        True if layering pattern detected
    """
    # Check for multiple intermediate wallets
    unique_wallets = set()
    for txn in txns:
        unique_wallets.add(txn.get("from"))
        unique_wallets.add(txn.get("to"))
    
    return len(unique_wallets) >= min_hops + 2


def detect_circular_pattern(txns: List[Dict]) -> bool:
    """
    Detect circular transaction pattern
    
    Args:
        txns: List of transactions
    
    Returns:
        True if circular pattern detected
    """
    if len(txns) < 3:
        return False
    
    # Check if wallet appears multiple times as both sender and receiver
    wallet_counts = {}
    for txn in txns:
        from_wallet = txn.get("from")
        to_wallet = txn.get("to")
        
        wallet_counts[from_wallet] = wallet_counts.get(from_wallet, 0) + 1
        wallet_counts[to_wallet] = wallet_counts.get(to_wallet, 0) + 1
    
    # If a wallet appears 3+ times, likely circular
    return any(count >= 3 for count in wallet_counts.values())


def calculate_risk_score(txns: List[Dict]) -> float:
    """
    Calculate risk score based on transaction patterns
    
    Args:
        txns: List of transactions
    
    Returns:
        Risk score from 0.0 to 1.0
    """
    score = 0.0
    
    # Rapid consolidation (40% weight)
    if detect_rapid_consolidation(txns):
        score += 0.4
    
    # Layering (30% weight)
    if detect_layering(txns):
        score += 0.3
    
    # Circular patterns (20% weight)
    if detect_circular_pattern(txns):
        score += 0.2
    
    # Large amounts (10% weight)
    large_txns = [t for t in txns if t.get("amount", 0) > 10000]
    if len(large_txns) > len(txns) * 0.3:  # More than 30% are large
        score += 0.1
    
    return min(score, 1.0)
