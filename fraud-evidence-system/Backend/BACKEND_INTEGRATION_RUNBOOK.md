# Backend Integration Runbook

## Quick Reference - curl Examples & Health Checks

### Prerequisites
- Node.js 18+ installed
- MongoDB running
- `.env` file configured

### Health Checks

```bash
# 1. Backend Health
curl http://localhost:5050/health

# Expected Response:
# {
#   "status": "healthy",
#   "service": "Fraud Evidence System",
#   "version": "1.0.0",
#   "database": "connected",
#   "timestamp": "2025-10-11T..."
# }

# 2. BHIV Core Health
curl http://localhost:5050/api/core/health

# 3. Database Health
curl http://localhost:5050/api/evidence/stats
```

### E2E Test Flow

#### 1. Upload Evidence
```bash
curl -X POST http://localhost:5050/api/evidence/upload \
  -H "x-user-role: investigator" \
  -F "evidenceFile=@test-file.pdf" \
  -F "caseId=test-case-001" \
  -F "entity=wallet-123" \
  -F "description=Test evidence upload" \
  -F "riskLevel=high"

# Expected Response:
# {
#   "success": true,
#   "message": "Evidence uploaded successfully",
#   "evidence": {
#     "id": "...",
#     "fileHash": "sha256:...",
#     "storageHash": "...",
#     "ipfsHash": "Qm...",
#     "redundancyCount": 3,
#     "storageLocations": {
#       "cache": true,
#       "s3": true,
#       "ipfs": true
#     }
#   }
# }
```

#### 2. Verify Evidence
```bash
curl http://localhost:5050/api/evidence/{evidenceId}/verify \
  -H "x-user-role: analyst"

# Expected Response:
# {
#   "verified": true,
#   "fileHash": "sha256:...",
#   "onChain": true,
#   "txHash": "0x...",
#   "blockNumber": 12345
# }
```

#### 3. Anchor on Blockchain
```bash
curl -X POST http://localhost:5050/api/evidence/{evidenceId}/anchor \
  -H "x-user-role: admin" \
  -H "Content-Type: application/json"

# Expected Response:
# {
#   "success": true,
#   "txHash": "0x...",
#   "blockNumber": 12346,
#   "evidenceId": "..."
# }
```

#### 4. RL Prediction
```bash
curl -X POST http://localhost:5050/api/rl/predict \
  -H "x-user-role: analyst" \
  -H "Content-Type: application/json" \
  -d '{
    "wallet": "wallet-123",
    "features": {
      "transactionCount": 150,
      "totalVolume": 50000,
      "avgTransactionValue": 333.33,
      "uniqueAddresses": 45,
      "suspiciousPatterns": 3,
      "accountAge": 365,
      "riskLevel": "high"
    }
  }'

# Expected Response:
# {
#   "success": true,
#   "prediction": {
#     "action": "investigate",
#     "confidence": 0.85,
#     "riskScore": 78.5,
#     "explanation": "High transaction count with suspicious patterns"
#   },
#   "rlLogId": "..."
# }
```

#### 5. RL Feedback
```bash
curl -X POST http://localhost:5050/api/rl/feedback \
  -H "x-user-role: admin" \
  -H "Content-Type: application/json" \
  -d '{
    "rlLogId": "...",
    "feedback": "correct",
    "actualOutcome": "fraud_confirmed",
    "comments": "Investigation confirmed fraud"
  }'

# Expected Response:
# {
#   "success": true,
#   "message": "Feedback recorded successfully"
# }
```

#### 6. Create Case
```bash
curl -X POST http://localhost:5050/api/cases \
  -H "x-user-role: investigator" \
  -H "Content-Type: application/json" \
  -d '{
    "caseId": "test-case-001",
    "title": "Suspicious Wallet Activity",
    "entity": "wallet-123",
    "priority": "high",
    "description": "Multiple suspicious transactions detected"
  }'
```

#### 7. BHIV Core Event
```bash
curl -X POST http://localhost:5050/api/core/events \
  -H "Content-Type: application/json" \
  -d '{
    "caseId": "test-case-001",
    "evidenceId": "evidence-123",
    "riskScore": 85.5,
    "actionSuggested": "escalate",
    "txHash": "0xabc123...",
    "metadata": {
      "source": "backend",
      "automated": true
    }
  }'

# Expected Response:
# {
#   "coreEventId": "...",
#   "status": "accepted",
#   "timestamp": "2025-10-11T..."
# }
```

#### 8. Query Audit Logs
```bash
curl "http://localhost:5050/api/admin/audit?caseId=test-case-001" \
  -H "x-user-role: admin"

# Expected Response:
# {
#   "success": true,
#   "count": 5,
#   "auditLogs": [
#     {
#       "userId": "user@example.com",
#       "action": "evidence_upload",
#       "resourceType": "evidence",
#       "resourceId": "...",
#       "timestamp": "...",
#       "status": "success"
#     }
#   ]
# }
```

### RBAC Testing

```bash
# Test unauthorized access (should return 403)
curl http://localhost:5050/api/evidence \
  -H "x-user-role: guest"

# Test authorized access
curl http://localhost:5050/api/evidence \
  -H "x-user-role: investigator"

# Test admin-only endpoint
curl http://localhost:5050/api/admin/audit \
  -H "x-user-role: admin"
```

### Role Permissions Matrix

| Action | guest | user | analyst | investigator | admin | superadmin |
|--------|-------|------|---------|--------------|-------|------------|
| View evidence | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Upload evidence | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Anchor blockchain | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| RL predict | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| RL feedback | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| View audit logs | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Escalate case | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |

### Error Handling

#### Common Errors

**1. 400 Bad Request**
```bash
# Missing required fields
curl -X POST http://localhost:5050/api/evidence/upload \
  -H "x-user-role: investigator" \
  -F "evidenceFile=@test.pdf"

# Response:
# {
#   "error": "Case ID and entity are required"
# }
```

**2. 403 Forbidden**
```bash
# Insufficient permissions
curl http://localhost:5050/api/admin/audit \
  -H "x-user-role: user"

# Response:
# {
#   "error": true,
#   "code": 403,
#   "message": "Access denied. Required permission: admin"
# }
```

**3. 404 Not Found**
```bash
# Resource not found
curl http://localhost:5050/api/evidence/invalid-id \
  -H "x-user-role: analyst"

# Response:
# {
#   "error": "Evidence not found"
# }
```

**4. 500 Internal Server Error**
```bash
# Server error (check logs)
# Response:
# {
#   "error": true,
#   "code": 500,
#   "message": "Internal server error"
# }
```

### Kafka Resilience Testing

```bash
# 1. Start backend (Kafka not running)
cd Backend
npm start

# 2. Upload evidence (should work with fallback)
curl -X POST http://localhost:5050/api/evidence/upload ...

# 3. Check logs - should see:
# "Kafka not available, using fallback queue"

# 4. Start Kafka
docker-compose -f docker-compose.kafka.yml up -d

# 5. Check logs - should see:
# "Kafka reconnected, replaying queued events"
```

### Performance Benchmarks

```bash
# Simple load test (requires 'ab' - Apache Bench)
ab -n 100 -c 10 -H "x-user-role: analyst" \
   http://localhost:5050/health

# Expected:
# - 100% success rate
# - < 100ms average response time
# - No failed requests
```

### Monitoring Endpoints

```bash
# 1. Evidence Statistics
curl http://localhost:5050/api/evidence/stats \
  -H "x-user-role: admin"

# 2. RL Statistics
curl http://localhost:5050/api/rl/stats \
  -H "x-user-role: admin"

# 3. Event Queue Statistics
curl http://localhost:5050/api/queue/stats \
  -H "x-user-role: admin"

# 4. Audit Statistics
curl http://localhost:5050/api/admin/audit/stats \
  -H "x-user-role: admin"
```

### Docker Deployment

```bash
# 1. Build image
cd Backend
docker build -t fraud-evidence-backend:latest .

# 2. Run container
docker run -d \
  --name fraud-backend \
  -p 5050:5050 \
  -e MONGODB_URI=mongodb://host.docker.internal:27017/fraud_evidence \
  -e NODE_ENV=production \
  fraud-evidence-backend:latest

# 3. Check health
curl http://localhost:5050/health

# 4. View logs
docker logs -f fraud-backend

# 5. Full stack with docker-compose
docker-compose -f docker-compose.fullstack.yml up -d
```

### Troubleshooting

#### Backend won't start

```bash
# Check MongoDB connection
mongo --eval "db.adminCommand('ping')"

# Check port availability
netstat -an | grep 5050

# Check environment variables
cat Backend/.env

# View detailed logs
cd Backend
DEBUG=* npm start
```

#### Evidence upload fails

```bash
# Check storage service
curl http://localhost:5050/api/evidence/stats

# Check file permissions
ls -la Backend/storage/

# Check disk space
df -h

# Test with small file first
echo "test" > test.txt
curl -X POST http://localhost:5050/api/evidence/upload \
  -H "x-user-role: investigator" \
  -F "evidenceFile=@test.txt" \
  -F "caseId=test" \
  -F "entity=test"
```

#### Blockchain anchor fails

```bash
# Check blockchain connection
curl http://localhost:5050/api/contract/health

# Check RPC endpoint (in .env)
curl $ETHEREUM_RPC_URL \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'

# Try testnet first
# Update .env to use testnet RPC
```

#### RL predictions slow

```bash
# Check RL model status
curl http://localhost:5050/api/rl/stats

# Check database performance
mongo fraud_evidence --eval "db.rllogs.count()"
mongo fraud_evidence --eval "db.rllogs.getIndexes()"

# Monitor response times
time curl -X POST http://localhost:5050/api/rl/predict ...
```

### Security Checklist

- [ ] Environment variables not committed to git
- [ ] CORS properly configured for production domain
- [ ] Rate limiting enabled (100 req/min per IP)
- [ ] File upload size limits enforced (50MB)
- [ ] JWT tokens expire after 24 hours
- [ ] RBAC enforced on all protected routes
- [ ] SQL injection prevention (using Mongoose)
- [ ] XSS prevention (input sanitization)
- [ ] HTTPS enabled in production
- [ ] Security headers (helmet.js)

### Production Deployment Checklist

- [ ] `.env` configured with production values
- [ ] MongoDB production instance ready
- [ ] Blockchain RPC endpoint configured (mainnet/testnet)
- [ ] S3 bucket created and credentials configured
- [ ] IPFS node accessible
- [ ] Kafka cluster running (or fallback enabled)
- [ ] Health checks passing
- [ ] Monitoring dashboard set up
- [ ] Backup strategy configured
- [ ] SSL certificates installed
- [ ] Domain DNS configured
- [ ] Load balancer configured (if needed)

---

**Last Updated:** October 11, 2025  
**Maintained by:** Yashika (Backend Lead)  
**Version:** 1.0.0

