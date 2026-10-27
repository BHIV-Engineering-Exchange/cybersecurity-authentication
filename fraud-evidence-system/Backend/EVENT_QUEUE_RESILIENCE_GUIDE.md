# Event Queue & Kafka Resilience - Implementation Guide

## Overview

This guide covers the event-driven architecture with Kafka integration and local queue fallback. The system ensures no events are lost even during Kafka outages by implementing a resilient local queue with automatic retry mechanism.

---

## 🎯 Features

✅ **Kafka Integration**: Publish events to Kafka topic `fraud.events`  
✅ **Local Queue Fallback**: Store events when Kafka is unavailable  
✅ **Disk Persistence**: Queue survives server restarts  
✅ **Automatic Retry**: Background process retries failed events  
✅ **Non-Blocking**: Main endpoints remain functional during Kafka downtime  
✅ **Event Ordering**: FIFO queue preserves event order  
✅ **Priority Levels**: Critical, high, medium, low priorities  
✅ **Admin Monitoring**: Queue statistics and management endpoints  

---

## 📡 Event Types

### Evidence Events
- `evidence.uploaded` - Evidence file uploaded
- `evidence.verified` - Evidence integrity verified
- `evidence.anchored` - Evidence hash anchored on blockchain
- `evidence.downloaded` - Evidence file downloaded
- `evidence.deleted` - Evidence deleted

### Case Events
- `case.created` - New case created
- `case.updated` - Case updated
- `case.assigned` - Case assigned to investigator
- `case.escalated` - Case escalated to authorities
- `case.closed` - Case closed

### RL Events
- `rl.prediction.made` - RL prediction generated
- `rl.feedback.received` - Admin feedback submitted
- `rl.model.updated` - Model retrained/updated

### System Events
- `user.login` - User logged in
- `user.unauthorized_access` - Unauthorized access attempt
- `system.alert` - System alert
- `system.error` - System error

---

## 🔄 Event Flow

### Normal Operation (Kafka Available)

```
Endpoint Called
    ↓
Business Logic Executes
    ↓
Event Created
    ↓
Publish to Kafka ✅
    ↓
Response Returned to Client
```

### Kafka Unavailable

```
Endpoint Called
    ↓
Business Logic Executes
    ↓
Event Created
    ↓
Kafka Publish Fails ❌
    ↓
Add to Local Queue 📝
    ↓
Persist Queue to Disk 💾
    ↓
Response Returned to Client ✅
    ↓
(Background)
Retry Timer Triggers ⏰
    ↓
Attempt to Reconnect to Kafka
    ↓
Publish Queued Events ✅
```

---

## 📊 Event Schema

### Standard Event Structure

```json
{
  "eventId": "evt_1704672000000_a3b5c7",
  "eventType": "evidence.uploaded",
  "timestamp": "2024-01-07T12:00:00.000Z",
  "priority": "medium",
  "data": {
    "evidenceId": "66d4a2b8c9e1234567890abc",
    "caseId": "CASE-2024-001",
    "wallet": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "reporter": "investigator@fraud.com",
    "filename": "transaction.png",
    "fileSize": 245760,
    "storageHash": "a665a45920422f9d...",
    "riskLevel": "high"
  },
  "metadata": {
    "source": "fraud-evidence-backend",
    "version": "1.0.0",
    "environment": "production",
    "userId": "investigator@fraud.com",
    "ipAddress": "192.168.1.100"
  }
}
```

### Event Priority Levels

| Priority | Use Case | Retry Frequency |
|----------|----------|-----------------|
| **critical** | Evidence deleted, unauthorized access | Immediate |
| **high** | Evidence anchored, case escalated | Every 5s |
| **medium** | Evidence uploaded, RL prediction | Every 10s |
| **low** | User login, system info | Every 30s |

---

## 🔧 Configuration

### Environment Variables

```env
# Kafka Configuration
KAFKA_BROKERS=localhost:9092,broker2:9092,broker3:9092
KAFKA_TOPIC=fraud.events
KAFKA_CLIENT_ID=fraud-evidence-backend

# Queue Configuration
RETRY_INTERVAL=10000    # 10 seconds
MAX_RETRIES=10          # Maximum retry attempts
QUEUE_PERSIST=true      # Persist queue to disk
```

### Kafka Setup (Optional)

```bash
# Using Docker
docker run -d \
  --name kafka \
  -p 9092:9092 \
  -e KAFKA_ADVERTISED_LISTENERS=PLAINTEXT://localhost:9092 \
  confluentinc/cp-kafka:latest

# Or use docker-compose (see docker-compose.kafka.yml)
```

---

## 📡 API Endpoints

### 1. Get Queue Statistics

**GET** `/api/queue/stats`

Get event queue statistics and status.

**Required Permission**: `view-logs`  
**Allowed Roles**: admin, superadmin

#### Request

```bash
curl -H "x-user-role: admin" \
  http://localhost:5050/api/queue/stats
```

#### Response

```json
{
  "success": true,
  "queue": {
    "queueSize": 5,
    "oldestEvent": "2024-01-07T12:00:00.000Z",
    "kafkaConnected": false,
    "kafkaAvailable": true,
    "retryInterval": 10000,
    "events": [
      {
        "eventId": "evt_1704672000000_a3b5c7",
        "eventType": "evidence.uploaded",
        "retryCount": 2,
        "addedAt": "2024-01-07T12:00:00.000Z"
      }
    ]
  },
  "timestamp": "2024-01-07T12:05:00.000Z"
}
```

### 2. Clear Queue

**POST** `/api/queue/clear`

Clear all queued events (admin only, use with caution).

**Required Permission**: `system-config`  
**Allowed Roles**: superadmin

#### Request

```bash
curl -X POST -H "x-user-role: superadmin" \
  http://localhost:5050/api/queue/clear
```

#### Response

```json
{
  "success": true,
  "message": "Queue cleared successfully",
  "clearedCount": 5,
  "timestamp": "2024-01-07T12:10:00.000Z"
}
```

### 3. Test Event Publishing

**POST** `/api/queue/test-event`

Publish a test event to verify Kafka integration.

**Required Permission**: `system-config`  
**Allowed Roles**: superadmin

#### Request

```bash
curl -X POST http://localhost:5050/api/queue/test-event \
  -H "x-user-role: superadmin" \
  -H "Content-Type: application/json" \
  -d '{
    "eventType": "system.alert",
    "data": {
      "test": true,
      "message": "Test event from API"
    }
  }'
```

---

## 🧪 Testing Resilience

### Scenario 1: Kafka Available

```bash
# 1. Ensure Kafka is running
docker ps | grep kafka

# 2. Upload evidence
curl -X POST http://localhost:5050/api/evidence/upload \
  -H "x-user-role: user" \
  -F "evidenceFile=@test.txt" \
  -F "caseId=CASE-2024-001" \
  -F "wallet=0x742d..." \
  -F "reporter=test@fraud.com"

# 3. Check server logs
# Should see: "✅ Event published to Kafka: evt_..."
```

### Scenario 2: Kafka Unavailable

```bash
# 1. Stop Kafka
docker stop kafka

# 2. Upload evidence (should still succeed!)
curl -X POST http://localhost:5050/api/evidence/upload \
  -H "x-user-role: user" \
  -F "evidenceFile=@test.txt" \
  -F "caseId=CASE-2024-001" \
  -F "wallet=0x742d..." \
  -F "reporter=test@fraud.com"

# Should return 201 Created ✅

# 3. Check server logs
# Should see: "📝 Event queued locally..."

# 4. Check queue
curl -H "x-user-role: admin" \
  http://localhost:5050/api/queue/stats

# Should show queued events
```

### Scenario 3: Kafka Recovery

```bash
# 1. Start Kafka
docker start kafka

# 2. Wait for retry (10 seconds)
# Watch server logs

# Should see:
# "✅ Kafka reconnected successfully"
# "✅ Queued event published: evt_..."
# "🎉 Successfully published N queued events"

# 3. Check queue again
curl -H "x-user-role: admin" \
  http://localhost:5050/api/queue/stats

# Queue should be empty or reduced
```

---

## 📝 Event Examples

### Evidence Upload Event

```json
{
  "eventId": "evt_1704672000000_a3b5c7",
  "eventType": "evidence.uploaded",
  "timestamp": "2024-01-07T12:00:00.000Z",
  "priority": "medium",
  "data": {
    "evidenceId": "66d4a2b8c9e1234567890abc",
    "caseId": "CASE-2024-001",
    "wallet": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "reporter": "investigator@fraud.com",
    "filename": "transaction.png",
    "fileSize": 245760,
    "storageHash": "a665a45920422f9d...",
    "riskLevel": "high"
  },
  "metadata": {
    "source": "fraud-evidence-backend",
    "version": "1.0.0",
    "environment": "production",
    "userId": "investigator@fraud.com",
    "ipAddress": "192.168.1.100"
  }
}
```

### Evidence Anchored Event

```json
{
  "eventId": "evt_1704672100000_b4c6d8",
  "eventType": "evidence.anchored",
  "timestamp": "2024-01-07T12:01:00.000Z",
  "priority": "high",
  "data": {
    "evidenceId": "66d4a2b8c9e1234567890abc",
    "caseId": "CASE-2024-001",
    "wallet": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "fileHash": "a665a45920422f9d...",
    "txHash": "0x5d7e8f9a0b1c2d3e...",
    "blockNumber": 18542301,
    "contractAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
  },
  "metadata": {
    "userId": "investigator@fraud.com",
    "priority": "high"
  }
}
```

### RL Prediction Event

```json
{
  "eventId": "evt_1704672200000_c5d7e9",
  "eventType": "rl.prediction.made",
  "timestamp": "2024-01-07T12:03:00.000Z",
  "priority": "high",
  "data": {
    "predictionId": "66d4a2b8c9e1234567890xyz",
    "wallet": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "action": "freeze",
    "score": 0.95,
    "state": "known_fraudster",
    "evidenceId": "66d4a2b8c9e1234567890abc",
    "caseId": "CASE-2024-001"
  },
  "metadata": {
    "userId": "analyst@fraud.com",
    "priority": "high"
  }
}
```

### RL Feedback Event

```json
{
  "eventId": "evt_1704672300000_d6e8f0",
  "eventType": "rl.feedback.received",
  "timestamp": "2024-01-07T14:00:00.000Z",
  "priority": "high",
  "data": {
    "feedbackId": "66d4a2b8c9e1234567890xyz",
    "wallet": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "predictedAction": "investigate",
    "actualAction": "investigate",
    "outcome": "correct",
    "reward": 1.0,
    "evidenceId": "66d4a2b8c9e1234567890abc"
  },
  "metadata": {
    "userId": "investigator@fraud.com",
    "priority": "high"
  }
}
```

---

## 💾 Local Queue Persistence

### Queue File Structure

**Location**: `backend/queue/pending_events.json`

```json
[
  {
    "event": {
      "eventId": "evt_1704672000000_a3b5c7",
      "eventType": "evidence.uploaded",
      "timestamp": "2024-01-07T12:00:00.000Z",
      "data": { ... }
    },
    "addedAt": "2024-01-07T12:00:05.000Z",
    "retryCount": 2,
    "maxRetries": 10
  }
]
```

### Persistence Behavior

- **Auto-save**: Queue persisted to disk after every change
- **Auto-load**: Queue loaded from disk on server start
- **Atomic Operations**: File writes are atomic
- **Error Handling**: Graceful handling of disk errors

---

## ⚙️ Retry Mechanism

### How It Works

```
Timer Triggers (every 10 seconds)
    ↓
Check if queue has events
    ↓
Try to reconnect to Kafka
    ↓
For each queued event:
  ├─→ Publish to Kafka
  ├─→ Success? Remove from queue
  └─→ Fail? Increment retry count
    ↓
Persist updated queue to disk
```

### Retry Configuration

- **Interval**: 10 seconds (configurable)
- **Max Retries**: 10 attempts per event
- **Backoff**: Fixed interval (can be made exponential)
- **Order**: FIFO (First In, First Out)

### Retry Count Tracking

Each queued event tracks:
- `retryCount`: Current retry attempt (0-10)
- `maxRetries`: Maximum allowed retries (10)
- `addedAt`: When event was first queued

---

## 🚨 Failure Handling

### What Happens When...

#### Kafka is Down at Server Start
✅ Server starts normally  
✅ Events queue locally  
✅ Background retry starts immediately  
✅ No impact on API functionality  

#### Kafka Goes Down During Operation
✅ Active requests complete successfully  
✅ Events automatically queue  
✅ Client receives normal response  
✅ Retry mechanism kicks in  

#### Disk Write Fails
⚠️ Event lost only if both Kafka AND disk fail  
✅ Error logged  
✅ Server continues operating  

#### Max Retries Exceeded
❌ Event marked as failed  
📝 Event logged to console  
✅ Queue cleaned up  
✅ Other events continue processing  

---

## 🧪 Testing

### Test 1: Normal Operation

```bash
# Start Kafka (if available)
docker-compose up kafka

# Upload evidence
curl -X POST http://localhost:5050/api/evidence/upload \
  -H "x-user-role: user" \
  -F "evidenceFile=@test.txt" \
  -F "caseId=CASE-2024-001" \
  -F "wallet=0x742d..." \
  -F "reporter=test@fraud.com"

# Check Kafka topic
kafka-console-consumer --bootstrap-server localhost:9092 \
  --topic fraud.events --from-beginning
```

### Test 2: Kafka Downtime

```bash
# Stop Kafka
docker stop kafka

# Upload evidence (should still work!)
curl -X POST http://localhost:5050/api/evidence/upload \
  -H "x-user-role: user" \
  -F "evidenceFile=@test.txt" \
  -F "caseId=CASE-2024-001" \
  -F "wallet=0x742d..." \
  -F "reporter=test@fraud.com"

# Should return 201 ✅

# Check queue
curl -H "x-user-role: admin" \
  http://localhost:5050/api/queue/stats

# Should show events in queue
```

### Test 3: Kafka Recovery

```bash
# Start Kafka
docker start kafka

# Wait 10-30 seconds (retry interval)

# Check queue again
curl -H "x-user-role: admin" \
  http://localhost:5050/api/queue/stats

# Queue should be empty (events published)

# Verify in Kafka
kafka-console-consumer --bootstrap-server localhost:9092 \
  --topic fraud.events --from-beginning
```

### Test 4: Server Restart with Queued Events

```bash
# 1. Stop Kafka
docker stop kafka

# 2. Upload evidence (events queue)
curl -X POST http://localhost:5050/api/evidence/upload ...

# 3. Check queue file exists
cat backend/queue/pending_events.json

# 4. Restart server
# Stop: Ctrl+C
# Start: npm start

# 5. Server should load queued events
# Check logs: "📂 Loaded N queued events from disk"

# 6. Start Kafka
docker start kafka

# 7. Watch events publish
# Check logs: "✅ Queued event published..."
```

---

## 📊 Integration Points

### Evidence Upload

```javascript
// After evidence is saved to MongoDB
publishEvent(EVENT_TYPES.EVIDENCE_UPLOADED, {
  evidenceId, caseId, wallet, filename, storageHash
});

// Client receives response immediately
// Event publishing happens in background
```

### Evidence Anchoring

```javascript
// After blockchain anchoring
publishEvent(EVENT_TYPES.EVIDENCE_ANCHORED, {
  evidenceId, fileHash, txHash, blockNumber
}, {
  priority: 'high' // Higher priority for blockchain events
});
```

### RL Prediction

```javascript
// After prediction is made
publishEvent(EVENT_TYPES.RL_PREDICTION_MADE, {
  predictionId, wallet, action, score
}, {
  priority: action === 'freeze' ? 'high' : 'medium'
});
```

### RL Feedback

```javascript
// After feedback is submitted
publishEvent(EVENT_TYPES.RL_FEEDBACK_RECEIVED, {
  feedbackId, wallet, outcome, reward
}, {
  priority: 'high' // Feedback is valuable for model improvement
});
```

---

## 🔍 Monitoring

### Server Logs

```bash
# Watch for event activity
npm start | grep -E "(📨|✅|📝|🔄|⚠️ )"

# Key log indicators:
# 📨 Publishing event
# ✅ Event published to Kafka
# 📝 Event queued locally
# 🔄 Processing queued events
# ⚠️  Kafka publish failed
```

### Queue Statistics

```bash
# Get current queue status
curl -H "x-user-role: admin" \
  http://localhost:5050/api/queue/stats | jq '.'

# Monitor queue size
watch -n 5 'curl -s -H "x-user-role: admin" \
  http://localhost:5050/api/queue/stats | jq .queue.queueSize'
```

---

## ✅ Acceptance Criteria - All Met

| Requirement | Status |
|-------------|--------|
| ✅ Events published to Kafka topic fraud.events | Complete |
| ✅ Local queue captures events when Kafka unavailable | Complete |
| ✅ Queued events retried and eventually published | Complete |
| ✅ Endpoints remain functional regardless of Kafka | Complete |
| ✅ Integration-tested resilient event pipeline | Complete |
| ✅ Event types defined for all key actions | Complete |
| ✅ Non-blocking event publishing | Complete |
| ✅ Queue persistence across restarts | Complete |

---

## 🎯 Event Publishing Points

| Endpoint | Event Type | Priority |
|----------|------------|----------|
| POST /api/evidence/upload | evidence.uploaded | medium |
| POST /api/evidence/:id/anchor | evidence.anchored | high |
| GET /api/evidence/:id/download | evidence.downloaded | medium |
| DELETE /api/evidence/:id | evidence.deleted | critical |
| POST /api/rl/predict | rl.prediction.made | medium-high |
| POST /api/rl/feedback | rl.feedback.received | high |
| POST /api/cases/escalate | case.escalated | critical |

---

## 🔧 Troubleshooting

### Events Not Publishing

**Check**:
1. Is Kafka running? `docker ps | grep kafka`
2. Check queue stats: `curl .../api/queue/stats`
3. Review server logs for errors

### Queue Growing Indefinitely

**Causes**:
- Kafka permanently down
- Network issues
- Configuration error

**Solutions**:
1. Fix Kafka connection
2. Check KAFKA_BROKERS environment variable
3. Clear queue if needed (admin action)

### Events Lost After Restart

**Check**:
1. Queue file exists: `ls backend/queue/`
2. File permissions: `chmod 644 backend/queue/pending_events.json`
3. Server logs on startup

---

## 🚀 Production Recommendations

### 1. Kafka Cluster Setup
- Use 3+ brokers for redundancy
- Enable replication (factor 3)
- Configure proper retention

### 2. Monitoring
- Track queue size over time
- Alert on sustained queue growth
- Monitor Kafka lag

### 3. Persistence
- Use external queue (Redis) for scaling
- Consider message persistence duration
- Backup queued events regularly

### 4. Security
- Encrypt Kafka messages
- Use SASL authentication
- Restrict topic access

---

## 📚 Related Documentation

- `EVIDENCE_UPLOAD_GUIDE.md` - Evidence workflow
- `RL_IMPLEMENTATION_GUIDE.md` - RL system
- `BLOCKCHAIN_ANCHORING_GUIDE.md` - Blockchain workflow

---

## 🎉 Summary

The Event Queue & Kafka Resilience system is **fully implemented** with:

✅ Kafka publisher with graceful degradation  
✅ Local queue fallback with disk persistence  
✅ Automatic retry mechanism  
✅ Non-blocking event publishing  
✅ Integration with all major endpoints  
✅ Admin monitoring and management  
✅ Comprehensive testing scenarios  

**The system remains operational even during complete Kafka outages!** 🚀

---

**Version**: 1.0.0  
**Date**: January 7, 2024  
**Status**: Complete & Resilient

