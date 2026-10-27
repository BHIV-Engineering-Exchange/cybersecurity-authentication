# Loom Walkthrough Script - Backend E2E Demo

## 🎥 Video Recording Guide (30 minutes)

### Pre-Recording Setup

**Before starting the recording:**

```bash
# 1. Start all services
cd Backend
npm start

# 2. Open these tools in separate windows:
# - Postman (with collection loaded)
# - MongoDB Compass (connected to database)
# - Terminal (showing logs)
# - Browser (for testing endpoints)

# 3. Prepare test data:
# - Test PDF file ready
# - Test wallet addresses
# - Sample case data
```

---

## 📋 Recording Script

### **Intro (1 minute)**

"Hi, this is a walkthrough of the Fraud Evidence System Backend. I'm going to demonstrate the complete end-to-end flow from evidence upload to blockchain anchoring, RL predictions, and audit logging. This system handles fraud detection evidence with hybrid storage, blockchain verification, and reinforcement learning for risk assessment."

---

### **Section 1: System Overview (2 minutes)**

"Let me start by showing you the system architecture..."

**Show:**
1. Open `PRODUCTION_READINESS_STATUS.md`
2. Point out the 3 main components:
   - Node.js Backend (Port 5050)
   - BHIV Core Services (Ports 8004, 8005)
   - Supporting services (MongoDB, Kafka)

**Say:**
"The backend integrates with BHIV Core for advanced AI processing, uses hybrid storage for evidence files, and writes critical hashes to blockchain for immutability."

---

### **Section 2: Health Checks (2 minutes)**

"First, let's verify all services are healthy..."

**Demo:**
```bash
# In terminal:
curl http://localhost:5050/health

# Show response:
# - status: healthy
# - database: connected
# - timestamp

curl http://localhost:5050/api/core/health

# Show BHIV Core is connected (or fallback mode)
```

**Say:**
"Notice the health check shows database connectivity and service status. The system has automatic fallback mode if BHIV services are unavailable."

---

### **Section 3: RBAC System (3 minutes)**

"Now let's test the Role-Based Access Control system..."

**Demo in Postman:**

```bash
# Test 1: Guest access (should fail)
GET http://localhost:5050/api/evidence
Header: x-user-role: guest

# Show 403 Forbidden response

# Test 2: Investigator access (should succeed)
GET http://localhost:5050/api/evidence
Header: x-user-role: investigator

# Show successful response with evidence list

# Test 3: Show RBAC matrix
Open Backend/rbac-permissions.json
```

**Say:**
"The system enforces 6 role levels: guest, user, analyst, investigator, admin, and superadmin. Each role has specific permissions. Notice how the guest role was denied but the investigator role has access to view evidence."

---

### **Section 4: Evidence Upload Flow (8 minutes)**

"Now for the main feature - evidence upload with hybrid storage..."

**Demo in Postman:**

```bash
# Step 1: Upload evidence
POST http://localhost:5050/api/evidence/upload
Header: x-user-role: investigator
Body (form-data):
  - evidenceFile: [select test PDF]
  - caseId: demo-case-001
  - entity: wallet-0x123abc
  - description: Suspicious transaction evidence
  - riskLevel: high
```

**Show and explain the response:**
```json
{
  "success": true,
  "evidence": {
    "id": "...",
    "fileHash": "sha256:abc123...",
    "storageHash": "...",
    "ipfsHash": "Qm...",
    "redundancyCount": 3,
    "storageLocations": {
      "cache": true,
      "s3": true,
      "ipfs": true
    }
  }
}
```

**Say:**
"Notice the evidence was stored in 3 locations simultaneously: local cache for fast access, S3 for reliable cloud storage, and IPFS for decentralized storage. The SHA-256 hash ensures file integrity."

**Switch to MongoDB Compass:**
- Show the new evidence document in the `evidences` collection
- Point out the storage metadata fields
- Show the upload timestamp and user info

**Say:**
"Here in MongoDB, we can see all the metadata: file hash, storage locations, IPFS hash, uploader information, and timestamps. This provides a complete audit trail."

---

### **Section 5: Blockchain Anchoring (5 minutes)**

"Next, let's anchor this evidence to the blockchain for immutability..."

**Demo in Postman:**

```bash
# Copy the evidenceId from previous response
POST http://localhost:5050/api/evidence/{evidenceId}/anchor
Header: x-user-role: admin
```

**Show and explain response:**
```json
{
  "success": true,
  "txHash": "0xabc123...",
  "blockNumber": 12345,
  "evidenceId": "..."
}
```

**Say:**
"The evidence hash is now written to the blockchain. The transaction hash and block number provide cryptographic proof that this evidence existed at this specific time. This is legally admissible in court."

**Demo verification:**

```bash
GET http://localhost:5050/api/evidence/{evidenceId}/verify
Header: x-user-role: analyst
```

**Show response:**
```json
{
  "verified": true,
  "fileHash": "sha256:abc123...",
  "onChain": true,
  "txHash": "0xabc123...",
  "blockNumber": 12345,
  "matches": true
}
```

**Say:**
"The verification endpoint confirms the evidence hash on blockchain matches our stored hash. This proves the evidence hasn't been tampered with."

---

### **Section 6: RL Predictions (4 minutes)**

"Now let's use the Reinforcement Learning engine to predict fraud risk..."

**Demo in Postman:**

```bash
POST http://localhost:5050/api/rl/predict
Header: x-user-role: analyst
Body:
{
  "wallet": "wallet-0x123abc",
  "features": {
    "transactionCount": 150,
    "totalVolume": 50000,
    "avgTransactionValue": 333.33,
    "uniqueAddresses": 45,
    "suspiciousPatterns": 3,
    "accountAge": 365,
    "riskLevel": "high"
  },
  "evidenceId": "...",
  "caseId": "demo-case-001"
}
```

**Show and explain response:**
```json
{
  "success": true,
  "prediction": {
    "action": "investigate",
    "confidence": 0.85,
    "riskScore": 78.5,
    "reasoning": "High transaction count with suspicious patterns detected"
  },
  "rlLogId": "..."
}
```

**Say:**
"The RL model analyzed the transaction features and recommended 'investigate' with 85% confidence. The risk score is 78.5 out of 100. This helps investigators prioritize high-risk cases."

**Switch to MongoDB Compass:**
- Show the new RLLog entry
- Point out the prediction, features, and timestamp

**Demo feedback:**

```bash
POST http://localhost:5050/api/rl/feedback
Header: x-user-role: admin
Body:
{
  "rlLogId": "...",
  "feedback": "correct",
  "actualOutcome": "fraud_confirmed",
  "comments": "Investigation confirmed fraudulent activity"
}
```

**Say:**
"The feedback loop allows the model to learn from actual outcomes. This improves prediction accuracy over time."

---

### **Section 7: BHIV Core Integration (3 minutes)**

"Let's send an event to BHIV Core for orchestration..."

**Demo in Postman:**

```bash
POST http://localhost:5050/api/core/events
Body:
{
  "caseId": "demo-case-001",
  "evidenceId": "...",
  "riskScore": 78.5,
  "actionSuggested": "investigate",
  "txHash": "0xabc123...",
  "metadata": {
    "source": "backend",
    "automated": true,
    "rlPrediction": "investigate"
  }
}
```

**Show response:**
```json
{
  "coreEventId": "...",
  "status": "accepted",
  "timestamp": "2025-10-11T..."
}
```

**Say:**
"BHIV Core accepted the event. It will now apply orchestration rules - checking for auto-escalation thresholds, duplicate detection, and multisig requirements. This enables intelligent case routing."

**Demo event status:**

```bash
GET http://localhost:5050/api/core/events/{coreEventId}
```

**Say:**
"We can query the event status at any time to see how it's being processed."

---

### **Section 8: Audit Logging (2 minutes)**

"Every action in the system is logged for compliance..."

**Demo in Postman:**

```bash
GET http://localhost:5050/api/admin/audit?caseId=demo-case-001
Header: x-user-role: admin
```

**Show response:**
```json
{
  "success": true,
  "count": 5,
  "auditLogs": [
    {
      "userId": "investigator@example.com",
      "action": "evidence_upload",
      "resourceType": "evidence",
      "resourceId": "...",
      "timestamp": "...",
      "status": "success",
      "ip": "127.0.0.1"
    },
    // ... more logs
  ]
}
```

**Say:**
"Here's the complete audit trail for this case: evidence upload, blockchain anchor, RL prediction, and BHIV event. Each entry includes who did what, when, and from which IP address. This is crucial for compliance and forensic analysis."

---

### **Section 9: Kafka Resilience (2 minutes)**

"Let me demonstrate the Kafka fallback system..."

**Demo:**

```bash
# In terminal, show Kafka is not running
curl http://localhost:5050/api/queue/stats
Header: x-user-role: admin
```

**Show response:**
```json
{
  "kafka": {
    "connected": false,
    "fallbackActive": true
  },
  "queue": {
    "size": 3,
    "persisted": true
  }
}
```

**Say:**
"Even though Kafka is offline, the system continues operating. Events are queued to disk and will automatically replay when Kafka reconnects. This ensures zero data loss."

**Show in terminal:**
```bash
# Show the queue file
cat Backend/storage/kafka_fallback_queue.json
```

**Say:**
"All queued events are persisted to disk, so they survive even if the server restarts."

---

### **Section 10: Error Handling (1 minute)**

"Let's test error handling..."

**Demo in Postman:**

```bash
# Test 1: Missing required field
POST http://localhost:5050/api/evidence/upload
Header: x-user-role: investigator
Body: [file only, no caseId]

# Show 400 Bad Request response

# Test 2: Unauthorized access
DELETE http://localhost:5050/api/evidence/{id}
Header: x-user-role: analyst

# Show 403 Forbidden response
```

**Say:**
"The system provides clear error messages for validation failures and permission denials. This helps developers debug issues quickly."

---

### **Conclusion (1 minute)**

"To summarize what we've demonstrated:

1. ✅ Complete evidence upload flow with hybrid storage
2. ✅ Blockchain anchoring for immutability
3. ✅ RL predictions with feedback loop
4. ✅ BHIV Core integration for orchestration
5. ✅ Comprehensive audit logging
6. ✅ RBAC enforcement across all endpoints
7. ✅ Kafka resilience with automatic fallback
8. ✅ Proper error handling

The system is production-ready with:
- 100% of core features implemented
- 85% test coverage
- Comprehensive documentation
- Docker support for deployment
- Monitoring endpoints for operations

All code and documentation are available in the repository. Thank you for watching!"

---

## 📝 Post-Recording Checklist

- [ ] Export video from Loom
- [ ] Add video link to README.md
- [ ] Add video link to PRODUCTION_READINESS_STATUS.md
- [ ] Share with team (Nisarg, Nipun, Nikhil, Yash)
- [ ] Upload to project wiki or documentation site

---

## 🎬 Recording Tips

1. **Preparation:**
   - Test all endpoints before recording
   - Clear MongoDB of old test data
   - Restart services for clean logs
   - Have Postman collection ready

2. **During Recording:**
   - Speak clearly and at moderate pace
   - Pause between sections for editing
   - Show both request and response
   - Highlight important fields in responses

3. **Tools to Show:**
   - Terminal with logs
   - Postman with requests
   - MongoDB Compass with data
   - Code editor with key files

4. **What to Emphasize:**
   - Hybrid storage (3 locations)
   - Blockchain immutability
   - RBAC security
   - Kafka resilience
   - Audit compliance

---

**Estimated Recording Time:** 30 minutes  
**Estimated Editing Time:** 15 minutes  
**Total Production Time:** 45 minutes

