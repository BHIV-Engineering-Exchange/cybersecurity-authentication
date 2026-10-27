"""
Synthetic transaction data generator
Generates realistic wallet transaction patterns for testing
"""

import random
from datetime import datetime, timedelta
from typing import List, Dict, Literal


def random_wallet(prefix: str = "W") -> str:
    """
    Generate a random wallet address
    
    Args:
        prefix: Prefix for the wallet (e.g., "W", "USER", "SHOP")
    
    Returns:
        Random wallet address string
    """
    return f"{prefix}_{random.randint(1000, 9999)}"


def generate_normal_activity(wallet: str, days: int = 5) -> List[Dict]:
    """
    Generate normal transaction activity for a wallet
    
    Args:
        wallet: Wallet address to generate activity for
        days: Number of days of activity to generate
    
    Returns:
        List of transaction dictionaries
    """
    txns = []
    now = datetime.now()

    for d in range(days):
        daily_txns = random.randint(1, 3)

        for _ in range(daily_txns):
            sender = random_wallet("USER")
            amount = random.randint(200, 4000)

            txns.append({
                "from": sender,
                "to": wallet,
                "amount": amount,
                "timestamp": (now - timedelta(days=d, hours=random.randint(1, 8))).isoformat()
            })

            # Occasional spending
            if random.random() < 0.4:
                receiver = random_wallet("SHOP")
                txns.append({
                    "from": wallet,
                    "to": receiver,
                    "amount": random.randint(100, 3000),
                    "timestamp": (now - timedelta(days=d, hours=random.randint(1, 8))).isoformat()
                })

    return txns


def generate_fraud_activity(wallet: str) -> List[Dict]:
    """
    Generate fraudulent transaction activity pattern with multiple accounts
    Shows classic scam: multiple victims -> fraud wallet -> multiple mule accounts
    
    Args:
        wallet: Wallet address involved in fraud
    
    Returns:
        List of transaction dictionaries showing fraud pattern
    """
    txns = []
    now = datetime.now()

    # Phase 1: Multiple victims send money to fraud wallet (3-8 victims)
    num_victims = random.randint(5, 10)
    senders = [random_wallet("VICTIM") for _ in range(num_victims)]
    total_collected = 0

    for i, s in enumerate(senders):
        amount = random.randint(3000, 25000)
        total_collected += amount

        txns.append({
            "from": s,
            "to": wallet,
            "amount": amount,
            "timestamp": (now - timedelta(hours=2, minutes=30 - i*3)).isoformat(),
            "type": "TRANSFER"
        })

    # Phase 2: Fraud wallet splits funds to multiple mule accounts (obfuscation)
    num_mules = random.randint(3, 6)
    mule_accounts = [random_wallet("MULE") for _ in range(num_mules)]
    split_amount = total_collected // num_mules
    
    for i, mule in enumerate(mule_accounts):
        # Vary amounts slightly to avoid detection
        amount = split_amount + random.randint(-500, 500)
        txns.append({
            "from": wallet,
            "to": mule,
            "amount": amount,
            "timestamp": (now - timedelta(hours=1, minutes=45 - i*5)).isoformat(),
            "type": "TRANSFER"
        })
        
        # Mule accounts send to intermediate accounts (layering)
        if random.random() < 0.6:  # 60% go through another layer
            intermediate = random_wallet("INTERMEDIATE")
            txns.append({
                "from": mule,
                "to": intermediate,
                "amount": amount - random.randint(50, 200),
                "timestamp": (now - timedelta(hours=1, minutes=40 - i*5)).isoformat(),
                "type": "TRANSFER"
            })
            
            # Final exit to clean wallet
            txns.append({
                "from": intermediate,
                "to": random_wallet("EXIT"),
                "amount": amount - random.randint(100, 300),
                "timestamp": (now - timedelta(hours=1, minutes=35 - i*5)).isoformat(),
                "type": "TRANSFER"
            })
        else:
            # Direct exit from mule
            txns.append({
                "from": mule,
                "to": random_wallet("EXIT"),
                "amount": amount - random.randint(50, 200),
                "timestamp": (now - timedelta(hours=1, minutes=30 - i*5)).isoformat(),
                "type": "TRANSFER"
            })

    # Phase 3: Remaining funds consolidated to main exit wallet
    remaining = total_collected - (split_amount * num_mules)
    if remaining > 100:
        txns.append({
            "from": wallet,
            "to": random_wallet("MASTER_EXIT"),
            "amount": remaining - random.randint(100, 500),
            "timestamp": now.isoformat(),
            "type": "TRANSFER"
        })

    return txns


def generate_money_laundering(wallet: str) -> List[Dict]:
    """
    Generate money laundering pattern (layering technique)
    Multiple hops through intermediate wallets to obfuscate origin
    
    Args:
        wallet: Wallet address involved in money laundering
    
    Returns:
        List of transaction dictionaries showing layering pattern
    """
    txns = []
    now = datetime.now()
    
    # Initial large deposit
    initial_amount = random.randint(50000, 200000)
    txns.append({
        "from": random_wallet("SOURCE"),
        "to": wallet,
        "amount": initial_amount,
        "timestamp": (now - timedelta(hours=24)).isoformat()
    })
    
    # Layering: Split into multiple smaller transactions
    num_layers = random.randint(3, 7)
    split_amount = initial_amount // num_layers
    
    for i in range(num_layers):
        # Send to intermediate wallet
        intermediate = random_wallet("LAYER")
        amount = split_amount + random.randint(-1000, 1000)
        
        txns.append({
            "from": wallet,
            "to": intermediate,
            "amount": amount,
            "timestamp": (now - timedelta(hours=23, minutes=random.randint(0, 30))).isoformat()
        })
        
        # Intermediate wallet sends to another layer or final destination
        if i < num_layers - 1:
            next_layer = random_wallet("LAYER")
            txns.append({
                "from": intermediate,
                "to": next_layer,
                "amount": amount - random.randint(50, 200),  # Small fees
                "timestamp": (now - timedelta(hours=22, minutes=random.randint(0, 30))).isoformat()
            })
        else:
            # Final destination (clean wallet)
            txns.append({
                "from": intermediate,
                "to": random_wallet("CLEAN"),
                "amount": amount - random.randint(50, 200),
                "timestamp": (now - timedelta(hours=21)).isoformat()
            })
    
    return txns


def generate_ponzi_scheme(wallet: str) -> List[Dict]:
    """
    Generate Ponzi scheme pattern
    Early investors paid with later investors' money
    
    Args:
        wallet: Wallet address running the Ponzi scheme
    
    Returns:
        List of transaction dictionaries showing Ponzi pattern
    """
    txns = []
    now = datetime.now()
    
    # Phase 1: Collect investments (increasing amounts)
    investors = []
    total_collected = 0
    
    for i in range(random.randint(10, 20)):
        investor = random_wallet("INVESTOR")
        # Early investors invest less, later investors invest more (greed)
        amount = random.randint(1000, 5000) + (i * 200)
        investors.append((investor, amount))
        total_collected += amount
        
        txns.append({
            "from": investor,
            "to": wallet,
            "amount": amount,
            "timestamp": (now - timedelta(days=30-i)).isoformat()
        })
    
    # Phase 2: Pay "returns" to early investors (using new money)
    num_paid = random.randint(3, 6)  # Only early investors get paid
    for i in range(num_paid):
        investor, original = investors[i]
        # Fake "profit" payment
        profit = int(original * random.uniform(0.1, 0.3))
        
        txns.append({
            "from": wallet,
            "to": investor,
            "amount": original + profit,  # Return + "profit"
            "timestamp": (now - timedelta(days=15-i)).isoformat()
        })
    
    # Phase 3: Scheme collapses - remaining funds moved to exit wallet
    remaining = total_collected - sum(original + int(original * 0.2) for _, original in investors[:num_paid])
    txns.append({
        "from": wallet,
        "to": random_wallet("EXIT"),
        "amount": remaining - random.randint(1000, 5000),
        "timestamp": now.isoformat()
    })
    
    return txns


def generate_ransomware_payment(wallet: str) -> List[Dict]:
    """
    Generate ransomware payment pattern
    Multiple victims paying to same wallet, then consolidation
    
    Args:
        wallet: Wallet address receiving ransomware payments
    
    Returns:
        List of transaction dictionaries showing ransomware pattern
    """
    txns = []
    now = datetime.now()
    
    # Multiple victims paying ransom (usually exact amounts)
    ransom_amounts = [500, 1000, 2000, 5000, 10000]  # Common ransom amounts
    num_victims = random.randint(5, 12)
    
    for i in range(num_victims):
        victim = random_wallet("VICTIM")
        # Ransom amounts are often round numbers
        amount = random.choice(ransom_amounts)
        
        txns.append({
            "from": victim,
            "to": wallet,
            "amount": amount,
            "timestamp": (now - timedelta(hours=random.randint(1, 48))).isoformat()
        })
    
    # Consolidation to main wallet (happens periodically)
    total = sum(random.choice(ransom_amounts) for _ in range(num_victims))
    txns.append({
        "from": wallet,
        "to": random_wallet("MASTER"),
        "amount": total - random.randint(100, 500),
        "timestamp": now.isoformat()
    })
    
    return txns


def generate_circular_transactions(wallet: str) -> List[Dict]:
    """
    Generate circular transaction pattern (obfuscation technique)
    Money moves in circles to create fake transaction history
    
    Args:
        wallet: Wallet address involved in circular transactions
    
    Returns:
        List of transaction dictionaries showing circular pattern
    """
    txns = []
    now = datetime.now()
    
    # Create a ring of wallets
    ring_wallets = [wallet] + [random_wallet("RING") for _ in range(random.randint(3, 6))]
    initial_amount = random.randint(10000, 50000)
    
    # Initial deposit
    txns.append({
        "from": random_wallet("SOURCE"),
        "to": wallet,
        "amount": initial_amount,
        "timestamp": (now - timedelta(hours=12)).isoformat()
    })
    
    # Circular movement (money goes around the ring)
    current_amount = initial_amount
    for i in range(len(ring_wallets)):
        sender = ring_wallets[i]
        receiver = ring_wallets[(i + 1) % len(ring_wallets)]
        
        # Small fee deducted each hop
        fee = random.randint(10, 50)
        current_amount -= fee
        
        txns.append({
            "from": sender,
            "to": receiver,
            "amount": current_amount,
            "timestamp": (now - timedelta(hours=11-i)).isoformat()
        })
    
    # Final exit after obfuscation
    txns.append({
        "from": wallet,
        "to": random_wallet("EXIT"),
        "amount": current_amount - random.randint(100, 500),
        "timestamp": now.isoformat()
    })
    
    return txns


def generate_mixing_service(wallet: str) -> List[Dict]:
    """
    Generate mixing service pattern (tumbler)
    Multiple small transactions mixed with others to obfuscate
    
    Args:
        wallet: Wallet address using mixing service
    
    Returns:
        List of transaction dictionaries showing mixing pattern
    """
    txns = []
    now = datetime.now()
    
    # Deposit to mixer
    deposit = random.randint(20000, 100000)
    txns.append({
        "from": wallet,
        "to": random_wallet("MIXER"),
        "amount": deposit,
        "timestamp": (now - timedelta(hours=6)).isoformat()
    })
    
    # Mixer splits and sends to multiple intermediate wallets
    num_splits = random.randint(5, 10)
    split_amount = deposit // num_splits
    
    for i in range(num_splits):
        intermediate = random_wallet("MIXED")
        # Slightly varied amounts
        amount = split_amount + random.randint(-200, 200)
        
        txns.append({
            "from": random_wallet("MIXER"),
            "to": intermediate,
            "amount": amount,
            "timestamp": (now - timedelta(hours=5, minutes=random.randint(0, 30))).isoformat()
        })
        
        # Intermediate wallets send to final destination (or back to mixer)
        if random.random() < 0.7:  # 70% go to clean wallet
            txns.append({
                "from": intermediate,
                "to": random_wallet("CLEAN"),
                "amount": amount - random.randint(10, 50),
                "timestamp": (now - timedelta(hours=4, minutes=random.randint(0, 30))).isoformat()
            })
        else:  # 30% go through another round
            txns.append({
                "from": intermediate,
                "to": random_wallet("MIXER"),
                "amount": amount - random.randint(10, 50),
                "timestamp": (now - timedelta(hours=4, minutes=random.randint(0, 30))).isoformat()
            })
    
    return txns


def generate_pump_and_dump(wallet: str) -> List[Dict]:
    """
    Generate pump and dump scheme pattern
    Coordinated buying to inflate price, then dump
    
    Args:
        wallet: Wallet address involved in pump and dump
    
    Returns:
        List of transaction dictionaries showing pump and dump pattern
    """
    txns = []
    now = datetime.now()
    
    # Phase 1: Accumulation (buying over time)
    for i in range(random.randint(5, 10)):
        txns.append({
            "from": random_wallet("ACCUMULATOR"),
            "to": wallet,
            "amount": random.randint(1000, 5000),
            "timestamp": (now - timedelta(days=7-i)).isoformat()
        })
    
    # Phase 2: Pump (coordinated buying to create hype)
    pump_wallets = [random_wallet("PUMP") for _ in range(random.randint(8, 15))]
    for i, pump_wallet in enumerate(pump_wallets):
        txns.append({
            "from": pump_wallet,
            "to": wallet,
            "amount": random.randint(2000, 8000),
            "timestamp": (now - timedelta(hours=2-i*5)).isoformat()  # Rapid buying
        })
    
    # Phase 3: Dump (sell everything quickly)
    total_accumulated = sum(random.randint(1000, 5000) for _ in range(8)) + sum(random.randint(2000, 8000) for _ in range(10))
    dump_amounts = [total_accumulated // 3, total_accumulated // 3, total_accumulated // 3 + (total_accumulated % 3)]
    
    for i, amount in enumerate(dump_amounts):
        txns.append({
            "from": wallet,
            "to": random_wallet("DUMP"),
            "amount": amount,
            "timestamp": (now - timedelta(minutes=30-i*10)).isoformat()  # Rapid selling
        })
    
    return txns


def generate_wallet_transactions(
    wallet: str, 
    mode: Literal["normal", "fraud", "money_laundering", "ponzi", "ransomware", "circular", "mixing", "pump_dump"] = "normal"
) -> List[Dict]:
    """
    Generate wallet transactions based on mode
    
    Args:
        wallet: Wallet address
        mode: Transaction pattern mode
            - "normal": Regular activity
            - "fraud": Classic scam pattern
            - "money_laundering": Layering technique
            - "ponzi": Ponzi scheme pattern
            - "ransomware": Ransomware payment pattern
            - "circular": Circular transaction obfuscation
            - "mixing": Mixing service pattern
            - "pump_dump": Pump and dump scheme
    
    Returns:
        List of transaction dictionaries
    """
    mode_map = {
        "normal": generate_normal_activity,
        "fraud": generate_fraud_activity,
        "money_laundering": generate_money_laundering,
        "ponzi": generate_ponzi_scheme,
        "ransomware": generate_ransomware_payment,
        "circular": generate_circular_transactions,
        "mixing": generate_mixing_service,
        "pump_dump": generate_pump_and_dump,
    }
    
    generator = mode_map.get(mode, generate_normal_activity)
    return generator(wallet)


# Example usage
if __name__ == "__main__":
    wallet = "WALLET_XYZ"

    # Normal behavior
    print("=== Normal Activity ===")
    normal_txns = generate_wallet_transactions(wallet, mode="normal")
    print(f"Generated {len(normal_txns)} normal transactions")
    for txn in normal_txns[:3]:  # Show first 3
        print(txn)

    print("\n=== Fraud Activity ===")
    fraud_txns = generate_wallet_transactions(wallet, mode="fraud")
    print(f"Generated {len(fraud_txns)} fraud transactions")
    for txn in fraud_txns[:3]:
        print(txn)
    
    print("\n=== Money Laundering ===")
    ml_txns = generate_wallet_transactions(wallet, mode="money_laundering")
    print(f"Generated {len(ml_txns)} money laundering transactions")
    
    print("\n=== Ponzi Scheme ===")
    ponzi_txns = generate_wallet_transactions(wallet, mode="ponzi")
    print(f"Generated {len(ponzi_txns)} Ponzi scheme transactions")