# 🚀 Quick Reference Card

## Start Servers

```bash
# Mock Server (Port 5000)
docker-compose up

# Real Server (Port 5050)
cd backend && npm start
```

## Test Complete Workflow

```bash
# 1. Upload
curl -X POST http://localhost:5050/api/evidence/upload \
  -H "x-user-role: user" \
  -F "evidenceFile=@test.txt" \
  -F "caseId=CASE-001" \
  -F "wallet=0x742d..." \
  -F "reporter=test@fraud.com"
→ Returns: evidenceId, storageHash

# 2. Anchor
curl -X POST http://localhost:5050/api/evidence/{id}/anchor \
  -H "x-user-role: investigator"
→ Returns: txHash, blockNumber (deterministic!)

# 3. Verify
curl -H "x-user-role: investigator" \
  http://localhost:5050/api/evidence/{id}/blockchain-verify
→ Returns: isValid, onChainData
```

## Roles & Permissions

| Role | Upload | Verify | Anchor | Delete |
|------|--------|--------|--------|--------|
| guest | ❌ | ❌ | ❌ | ❌ |
| user | ✅ | ❌ | ❌ | ❌ |
| analyst | ✅ | ❌ | ❌ | ❌ |
| investigator | ✅ | ✅ | ✅ | ❌ |
| admin | ✅ | ✅ | ✅ | ✅ |

## Test with Different Roles

```bash
curl -H "x-user-role: user" http://localhost:5050/api/cases
curl -H "x-user-role: investigator" http://localhost:5050/api/cases
curl -H "x-user-role: admin" http://localhost:5050/api/cases
```

## Check Results

```bash
# Local files
ls uploads/CASE-001/

# MongoDB
mongo fraud_evidence --eval "db.evidences.find().pretty()"

# Server logs
# Check terminal for ✅ and ⛓️ indicators
```

## Postman Collections

1. `postman/postman_collection.json` - Main API
2. `postman/rbac_test_collection.json` - RBAC tests
3. `postman/evidence_upload_collection.json` - Upload tests
4. `postman/blockchain_workflow_collection.json` - Blockchain tests

## Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| 403 | Wrong role | Add `-H "x-user-role: investigator"` |
| 400 | Missing fields | Check required: file, caseId, wallet, reporter |
| 404 | Invalid ID | Use correct evidenceId |
| 500 | Server error | Check MongoDB connection |

## Documentation

- **Setup**: QUICKSTART.md
- **RBAC**: RBAC_QUICK_REFERENCE.md
- **Evidence**: EVIDENCE_UPLOAD_GUIDE.md
- **Blockchain**: BLOCKCHAIN_ANCHORING_GUIDE.md
- **Complete**: FINAL_DELIVERY_SUMMARY.md

## Ports

- **5000**: Mock Server
- **5050**: Real Server  
- **27017**: MongoDB

## Key Endpoints

```
POST   /api/evidence/upload              # Upload file
POST   /api/evidence/:id/anchor          # Anchor on blockchain
GET    /api/evidence/:id/blockchain-verify  # Verify blockchain
GET    /api/evidence/:id/download        # Download file
```

---

**Need Help?** See `FINAL_DELIVERY_SUMMARY.md` for complete overview.

