# Blockchain Anchoring Workflow - Complete Guide

## Overview

This guide explains the blockchain anchoring system for evidence integrity. The system anchors file hashes on-chain to create immutable proof of existence, enabling tamper-proof audit trails.

---

## 🎯 Features

✅ **Deterministic Responses**: Same evidence always produces same transaction hash  
✅ **Mock Blockchain**: Simulates Ethereum smart contract behavior  
✅ **Idempotent Anchoring**: Re-anchoring returns existing transaction  
✅ **Integrity Verification**: Verify evidence hasn't been tampered with  
✅ **MongoDB Integration**: Blockchain data persisted in database  
✅ **RBAC Protected**: Permission-based access control  

---

## 📡 API Endpoints

### 1. Anchor Evidence on Blockchain

**POST** `/api/evidence/:id/anchor`

Anchors the evidence file hash on blockchain for immutable proof.

**Required Permission**: `verify-evidence`  
**Allowed Roles**: investigator, admin, superadmin

#### Request

```bash
curl -X POST http://localhost:5050/api/evidence/{evidenceId}/anchor \
  -H "x-user-role: investigator"
```

#### Response (200)

```json
{
  "success": true,
  "message": "Evidence hash anchored on blockchain successfully",
  "evidenceId": "66d4a2b8c9e1234567890abc",
  "fileHash": "a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3",
  "blockchain": {
    "txHash": "0x5d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e",
    "blockNumber": 18542301,
    "contractAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "blockTimestamp": "2024-01-07T12:00:00.000Z",
    "gasUsed": 21150,
    "confirmations": 12,
    "status": "confirmed"
  },
  "evidence": {
    "caseId": "CASE-2024-001",
    "wallet": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "anchoredAt": "2024-01-07T12:00:00.000Z",
    "anchorStatus": "anchored"
  },
  "explorerUrl": "https://mock-etherscan.io/tx/0x5d7e8f9a...",
  "timestamp": "2024-01-07T12:00:00.000Z"
}
```

#### Response (Already Anchored - 200)

```json
{
  "success": true,
  "message": "Evidence already anchored on blockchain",
  "evidenceId": "66d4a2b8c9e1234567890abc",
  "blockchain": {
    "txHash": "0x5d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e",
    "blockNumber": 18542301,
    "contractAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "anchoredAt": "2024-01-07T12:00:00.000Z",
    "status": "anchored"
  },
  "explorerUrl": "https://mock-etherscan.io/tx/0x5d7e8f9a..."
}
```

### 2. Verify Evidence on Blockchain

**GET** `/api/evidence/:id/blockchain-verify`

Verifies that the evidence hash exists on-chain and hasn't been tampered with.

**Required Permission**: `verify-evidence`  
**Allowed Roles**: investigator, admin, superadmin

#### Request

```bash
curl -H "x-user-role: investigator" \
  http://localhost:5050/api/evidence/{evidenceId}/blockchain-verify
```

#### Response (200 - Verified)

```json
{
  "success": true,
  "message": "Evidence successfully verified on blockchain",
  "evidenceId": "66d4a2b8c9e1234567890abc",
  "verification": {
    "isValid": true,
    "fileHash": "a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3",
    "onChainData": {
      "txHash": "0x5d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e",
      "blockNumber": 18542301,
      "contractAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
      "timestamp": "2024-01-07T12:00:00.000Z",
      "status": "confirmed"
    },
    "comparison": {
      "expectedTxHash": "0x5d7e8f9a...",
      "providedTxHash": "0x5d7e8f9a...",
      "hashMatches": true
    },
    "confirmations": 12
  },
  "blockchain": {
    "network": "mock-ethereum",
    "chainId": 1337,
    "explorerUrl": "https://mock-etherscan.io/tx/0x5d7e8f9a..."
  },
  "evidence": {
    "caseId": "CASE-2024-001",
    "wallet": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "verificationStatus": "verified",
    "lastVerified": "2024-01-07T12:05:00.000Z"
  },
  "timestamp": "2024-01-07T12:05:00.000Z"
}
```

#### Response (400 - Not Anchored)

```json
{
  "error": true,
  "code": 400,
  "message": "Evidence has not been anchored on blockchain yet",
  "suggestion": "Use POST /api/evidence/:id/anchor to anchor the evidence first",
  "timestamp": "2024-01-07T12:00:00.000Z"
}
```

---

## 🔄 Complete Workflow

### Step-by-Step Process

```
1. Upload Evidence
   POST /api/evidence/upload
   → File saved locally
   → SHA-256 hash computed
   → Mock BHIV storage
   → MongoDB record created
   ↓
2. Anchor on Blockchain
   POST /api/evidence/:id/anchor
   → Retrieve evidence from MongoDB
   → Generate deterministic tx hash
   → Update MongoDB with blockchain data
   ↓
3. Verify on Blockchain
   GET /api/evidence/:id/blockchain-verify
   → Check on-chain data
   → Compare hashes
   → Update verification status
   ↓
4. Download Evidence (Optional)
   GET /api/evidence/:id/download
   → Retrieve file
   → Verify hash matches
   → Send file to client
```

### Example cURL Workflow

```bash
# Step 1: Upload
EVIDENCE_ID=$(curl -X POST http://localhost:5050/api/evidence/upload \
  -H "x-user-role: user" \
  -F "evidenceFile=@test.txt" \
  -F "caseId=CASE-2024-001" \
  -F "wallet=0x742d..." \
  -F "reporter=test@fraud.com" \
  | jq -r '.evidenceId')

echo "Evidence ID: $EVIDENCE_ID"

# Step 2: Anchor
TX_HASH=$(curl -X POST \
  http://localhost:5050/api/evidence/$EVIDENCE_ID/anchor \
  -H "x-user-role: investigator" \
  | jq -r '.blockchain.txHash')

echo "TX Hash: $TX_HASH"

# Step 3: Verify
curl -H "x-user-role: investigator" \
  http://localhost:5050/api/evidence/$EVIDENCE_ID/blockchain-verify \
  | jq '.'
```

---

## 🔐 Deterministic Behavior

### What is Deterministic?

**Deterministic** means the same input always produces the same output.

For the same evidence:
- ✅ Same transaction hash every time
- ✅ Same block number every time
- ✅ Consistent verification results

This is crucial for:
- Testing and development
- Reproducible results
- Integration testing
- Frontend development

### How It Works

```javascript
// Input
evidenceId = "66d4a2b8c9e1234567890abc"
fileHash = "a665a45920422f9d..."

// Deterministic generation
txHash = SHA256(evidenceId + ":" + fileHash + ":anchor")
       = "0x5d7e8f9a0b1c2d3e..." (always the same!)

blockNumber = baseBlock + (txHash % 1000000)
            = 18542301 (always the same!)
```

### Testing Determinism

```bash
# Anchor evidence
curl -X POST http://localhost:5050/api/evidence/{id}/anchor \
  -H "x-user-role: investigator"
# Returns: txHash = 0x5d7e8f9a...

# Anchor same evidence again
curl -X POST http://localhost:5050/api/evidence/{id}/anchor \
  -H "x-user-role: investigator"
# Returns: SAME txHash = 0x5d7e8f9a...
```

---

## 📊 MongoDB Updates

### Before Anchoring

```json
{
  "_id": "66d4a2b8c9e1234567890abc",
  "caseId": "CASE-2024-001",
  "storageHash": "a665a45920422f9d...",
  "anchorStatus": "not_anchored",
  "blockchainTxHash": null,
  "blockNumber": null
}
```

### After Anchoring

```json
{
  "_id": "66d4a2b8c9e1234567890abc",
  "caseId": "CASE-2024-001",
  "storageHash": "a665a45920422f9d...",
  "anchorStatus": "anchored",
  "blockchainTxHash": "0x5d7e8f9a0b1c2d3e...",
  "blockNumber": 18542301,
  "contractAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "blockTimestamp": "2024-01-07T12:00:00.000Z",
  "anchoredAt": "2024-01-07T12:00:00.000Z"
}
```

---

## 🧪 Testing with Postman

### Import Collection

```
backend/postman/blockchain_workflow_collection.json
```

### Collection Structure

1. **Complete Workflow** (4 tests)
   - Upload evidence
   - Anchor on blockchain
   - Verify on blockchain
   - Re-anchor (idempotent check)

2. **Deterministic Testing** (2 tests)
   - Anchor evidence A
   - Anchor evidence A again (verify same hash)

3. **Error Scenarios** (3 tests)
   - Evidence not found
   - Verify before anchoring
   - Permission denied

4. **Integration Tests** (2 tests)
   - Get evidence with blockchain data
   - Complete verification

**Total**: 11 automated tests

### Run Tests

1. Import collection
2. Set `{{baseUrl}}` to `http://localhost:5050`
3. For Step 1, attach a test file
4. Run collection
5. All tests should pass ✅

---

## 💡 Key Concepts

### SHA-256 Hash

**Purpose**: Cryptographic fingerprint of the file

**Properties**:
- 64 hexadecimal characters
- Unique to file contents
- Changes if file is modified
- Cannot be reversed

**Example**:
```
File: "Hello World"
SHA-256: a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e
```

### Transaction Hash

**Purpose**: Blockchain transaction identifier

**Properties**:
- Starts with `0x`
- 64 hexadecimal characters
- Deterministically generated in mock
- Links to block number

**Example**:
```
0x5d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e
```

### Block Number

**Purpose**: Blockchain block where transaction was included

**Properties**:
- Integer (e.g., 18542301)
- Deterministically generated
- Realistic range (18M+)
- Links to timestamp

---

## 🎨 Example Scenarios

### Scenario 1: First-Time Anchoring

```bash
# Upload evidence
curl -X POST http://localhost:5050/api/evidence/upload \
  -H "x-user-role: user" \
  -F "evidenceFile=@fraud_evidence.pdf" \
  -F "caseId=CASE-2024-001" \
  -F "wallet=0x742d..." \
  -F "reporter=investigator@fraud.com"

# Response includes evidenceId
# evidenceId: "66d4a2b8c9e1234567890abc"

# Anchor on blockchain
curl -X POST \
  http://localhost:5050/api/evidence/66d4a2b8c9e1234567890abc/anchor \
  -H "x-user-role: investigator"

# Response includes:
# txHash: "0x5d7e8f9a..."
# blockNumber: 18542301
# status: "anchored"
```

### Scenario 2: Verify Anchored Evidence

```bash
# Verify on blockchain
curl -H "x-user-role: investigator" \
  http://localhost:5050/api/evidence/66d4a2b8c9e1234567890abc/blockchain-verify

# Response includes:
# isValid: true
# hashMatches: true
# verificationStatus: "verified"
```

### Scenario 3: Try to Anchor Twice

```bash
# First anchor
curl -X POST \
  http://localhost:5050/api/evidence/{id}/anchor \
  -H "x-user-role: investigator"
# Returns: txHash = "0x5d7e8f9a..."

# Second anchor (same evidence)
curl -X POST \
  http://localhost:5050/api/evidence/{id}/anchor \
  -H "x-user-role: investigator"
# Returns: SAME txHash = "0x5d7e8f9a..."
# Message: "Evidence already anchored on blockchain"
```

---

## 🔍 Verification Process

### Local File + Blockchain Verification

The complete verification checks two things:

1. **Local File Integrity**
   - Read file from `uploads/`
   - Compute SHA-256
   - Compare with stored hash
   - Result: intact or corrupted

2. **Blockchain Verification**
   - Get on-chain transaction
   - Compare stored tx hash
   - Verify block confirmation
   - Result: valid or invalid

### Combined Endpoint

```bash
# Complete verification (file + blockchain)
curl -H "x-user-role: investigator" \
  http://localhost:5050/api/evidence/{id}/verify
```

This endpoint combines:
- Local file hash check
- BHIV mock verification
- Blockchain verification (if anchored)

---

## 🎯 Use Cases

### 1. Tamper Detection

**Problem**: How do we prove a file hasn't been modified?

**Solution**:
1. Compute SHA-256 hash when uploaded
2. Anchor hash on blockchain (immutable)
3. Later, recompute hash and compare
4. Any change = different hash = tampering detected

### 2. Proof of Existence

**Problem**: How do we prove a file existed at a specific time?

**Solution**:
1. Anchor file hash on blockchain
2. Blockchain timestamp proves "no later than" time
3. Block number provides immutable reference
4. Transaction is permanent and public

### 3. Chain of Custody

**Problem**: How do we track evidence handling?

**Solution**:
1. Upload evidence → hash computed
2. Anchor on blockchain → immutable timestamp
3. Any access → logged with verification
4. Complete audit trail → blockchain + MongoDB

---

## 🔧 Configuration

### Evidence Model Fields

```javascript
{
  // Blockchain fields
  blockchainTxHash: String,      // "0x5d7e8f9a..."
  blockNumber: Number,            // 18542301
  contractAddress: String,        // "0x742d35Cc..."
  blockTimestamp: Date,           // ISOString
  anchoredAt: Date,               // When anchored
  anchorStatus: String            // not_anchored|pending|anchored|failed
}
```

### Mock vs Real

| Aspect | Mock (Current) | Real (Production) |
|--------|----------------|-------------------|
| Transaction | Deterministic hash | Real Ethereum tx |
| Block Number | Calculated from hash | Actual block number |
| Gas Cost | Fixed (21150) | Real gas cost |
| Confirmation Time | Instant | ~15 seconds |
| Network | mock-ethereum | Mainnet/Polygon |

---

## 🚀 Getting Started

### 1. Start Server

```bash
cd backend
npm install
npm start
```

### 2. Upload Evidence

```bash
echo "Test evidence" > test.txt

curl -X POST http://localhost:5050/api/evidence/upload \
  -H "x-user-role: user" \
  -F "evidenceFile=@test.txt" \
  -F "caseId=CASE-2024-001" \
  -F "wallet=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb" \
  -F "reporter=test@fraud.com"

# Save the evidenceId from response
```

### 3. Anchor on Blockchain

```bash
curl -X POST \
  http://localhost:5050/api/evidence/{evidenceId}/anchor \
  -H "x-user-role: investigator"

# Save the txHash from response
```

### 4. Verify on Blockchain

```bash
curl -H "x-user-role: investigator" \
  http://localhost:5050/api/evidence/{evidenceId}/blockchain-verify
```

### 5. Check MongoDB

```bash
mongo fraud_evidence
> db.evidences.findOne({}, {
    blockchainTxHash: 1,
    blockNumber: 1,
    anchorStatus: 1,
    storageHash: 1
  })
```

---

## ✅ Acceptance Criteria - All Met

| Requirement | Status |
|-------------|--------|
| ✅ Functional POST /api/evidence/:id/anchor | Complete |
| ✅ Functional GET /api/evidence/:id/verify | Complete |
| ✅ Deterministic blockchain response | Complete |
| ✅ Evidence document updated with anchor info | Complete |
| ✅ Integration-tested workflow ready | Complete |
| ✅ Postman collection provided | Complete |

---

## 📊 What's Stored Where

### Local Filesystem

```
uploads/CASE-2024-001/file.pdf
```
- Original evidence file
- Used for integrity checks
- Downloadable by investigators

### MongoDB

```json
{
  "storageHash": "a665a45...",       // SHA-256 of file
  "blockchainTxHash": "0x5d7e...",   // Blockchain tx
  "blockNumber": 18542301,            // Block number
  "anchorStatus": "anchored"          // Status
}
```
- Metadata and hashes
- Blockchain transaction info
- Verification status

### Blockchain (Mock)

```
Transaction Hash: 0x5d7e8f9a...
Block Number: 18542301
Data: fileHash (SHA-256)
```
- Immutable proof
- Tamper-evident
- Publicly verifiable

---

## 🔄 Transition to Real Blockchain

When ready to integrate real smart contract:

### 1. Replace Mock Service

```javascript
// Current (mock)
const mockBlockchainService = require('./services/mockBlockchainService');

// Future (real)
const blockchainService = require('./services/realBlockchainService');
```

### 2. Update Anchor Function

```javascript
// Mock
const result = await mockBlockchainService.anchorEvidence(data);

// Real
const web3 = new Web3(provider);
const contract = new web3.eth.Contract(ABI, contractAddress);
const result = await contract.methods.anchorEvidence(fileHash).send({
  from: account,
  gas: 100000
});
```

### 3. Everything Else Stays the Same!

- Routes: No changes needed ✅
- Database: No changes needed ✅
- API contract: No changes needed ✅
- Frontend: No changes needed ✅

---

## 🎓 Best Practices

### When to Anchor

✅ **Anchor When**:
- Evidence is uploaded and verified locally
- Case is significant or high-risk
- Permanent proof is needed
- Regulatory requirements

❌ **Don't Anchor**:
- Before local verification
- For test/demo evidence
- If blockchain is unavailable
- For low-value evidence (to save costs)

### Verification Frequency

- **Upload**: Always compute hash
- **Anchor**: Once per evidence
- **Verify Local**: Before download
- **Verify Blockchain**: Periodically or on-demand

---

## 🐛 Troubleshooting

### "Evidence not found"

**Cause**: Invalid evidence ID  
**Solution**: Use correct ID from upload response

### "Evidence has not been anchored"

**Cause**: Trying to verify before anchoring  
**Solution**: Call `/anchor` endpoint first

### "Permission denied"

**Cause**: Wrong role (user cannot anchor)  
**Solution**: Use investigator, admin, or superadmin role

### Deterministic hash not matching

**Cause**: Evidence ID or file hash changed  
**Solution**: This is expected! Different evidence = different hash

---

## 📚 Related Documentation

- `EVIDENCE_UPLOAD_GUIDE.md` - File upload documentation
- `RBAC_DOCUMENTATION.md` - Permission system
- `COMPLETE_SETUP_GUIDE.md` - Full system guide

---

## 🎉 Summary

The blockchain anchoring system is **fully implemented** with:

✅ Deterministic mock blockchain  
✅ Anchor and verify endpoints  
✅ MongoDB integration  
✅ RBAC protection  
✅ Complete test suite  
✅ Comprehensive documentation  

**Ready for integration and testing!** 🚀

---

**Version**: 1.0.0  
**Date**: January 7, 2024  
**Status**: Complete & Tested

