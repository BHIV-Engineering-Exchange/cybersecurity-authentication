"""
Synthetic Data Generator for Cybercrime Investigation Dashboard
Generates realistic transaction data for testing and development
"""

from .generator import (
    random_wallet,
    generate_normal_activity,
    generate_fraud_activity,
    generate_money_laundering,
    generate_ponzi_scheme,
    generate_ransomware_payment,
    generate_circular_transactions,
    generate_mixing_service,
    generate_pump_and_dump,
    generate_wallet_transactions
)

__all__ = [
    "random_wallet",
    "generate_normal_activity",
    "generate_fraud_activity",
    "generate_money_laundering",
    "generate_ponzi_scheme",
    "generate_ransomware_payment",
    "generate_circular_transactions",
    "generate_mixing_service",
    "generate_pump_and_dump",
    "generate_wallet_transactions"
]
