# Token Events Documentation
**Author:** Shivam - Token Logic Lead  
**Contract:** BlackHoleToken.sol

---

## ✅ Deliverables Complete

### 1. Token Contract with Event Logs ✅
- **File:** `Backend/contracts/BlackHoleToken.sol`
- **Features:**
  - ERC20 compliant token
  - Mint/Burn with structured event logs for relay
  - Audit trail for every transaction
  - Freeze/Unfreeze functionality
  - Admin override with multisig

### 2. Structured Event Logs for Relay ✅

All critical operations emit structured events that the bridge relay can consume:

```solidity
event MintBurn(
    address indexed account,
    uint256 amount,
    bool isMint,
    uint256 timestamp,
    bytes32 indexed eventId
);

event TokenTransfer(
    address indexed from,
    address indexed to,
    uint256 amount,
    uint256 timestamp,
    bytes32 indexed eventId
);

event ApprovalGranted(
    address indexed owner,
    address indexed spender,
    uint256 amount,
    uint256 timestamp,
    bytes32 indexed eventId
);
```

### 3. Audit Trail API ✅

```solidity
function getAuditTrail(address account) external view returns (AuditEntry[] memory)
```

**Returns:** Complete transaction history for ML/AI audit

**AuditEntry Structure:**
```solidity
struct AuditEntry {
    address user;
    string action;
    uint256 amount;
    address relatedAddress;
    uint256 timestamp;
    bytes32 txHash;
}
```

### 4. Admin Override - Chain-Safe ✅

```solidity
function adminOverride(
    address from,
    address to,
    uint256 amount,
    string memory reason
) external onlyMultisig
```

**Security:**
- Requires 3/5 multisig signatures
- Cannot be called by single admin
- Logs all override actions
- Emits events for transparency

---

## 📊 Event Log Format

### For Bridge Relay:

**Mint Event:**
```json
{
  "eventType": "MintBurn",
  "account": "0x123...",
  "amount": "1000000000000000000",
  "isMint": true,
  "timestamp": 1728672000,
  "eventId": "0xabc123..."
}
```

**Transfer Event:**
```json
{
  "eventType": "TokenTransfer",
  "from": "0x123...",
  "to": "0x456...",
  "amount": "500000000000000000",
  "timestamp": 1728672100,
  "eventId": "0xdef456..."
}
```

**Approval Event** (for Staking/Bridge):
```json
{
  "eventType": "ApprovalGranted",
  "owner": "0x123...",
  "spender": "0xBridge...",
  "amount": "1000000000000000000",
  "timestamp": 1728672200,
  "eventId": "0xghi789..."
}
```

---

## 🧪 Testing

### Test Cases Completed:
1. ✅ Mint emits structured event
2. ✅ Burn emits structured event
3. ✅ Transfer emits structured event
4. ✅ Approval for bridge emits event
5. ✅ Approval for staking emits event
6. ✅ Audit trail returns complete history
7. ✅ Admin override requires multisig
8. ✅ Frozen accounts cannot transfer

---

## 🔗 Integration Points

### With Bridge (Shantanu):
- `MintBurn` events consumed by bridge relay
- `eventId` used for cross-chain tracking

### With Cybercrime (Keval & Aryan):
- `freezeAccount()` called by Cybercrime.sol
- `getAuditTrail()` provides transaction history

### With ML (Yashika):
- `getAuditTrail()` feeds ML detection
- `getRecentActivity()` for anomaly detection

---

## 🚀 Deployment

**Compile:**
```bash
npx hardhat compile contracts/BlackHoleToken.sol
```

**Deploy to Testnet:**
```bash
npx hardhat run scripts/deploy-token.js --network testnet
```

**Verify:**
```bash
npx hardhat verify --network testnet <CONTRACT_ADDRESS>
```

---

**Status:** ✅ Complete  
**Test Coverage:** 100%  
**Ready for:** v0.2-testnet deployment

