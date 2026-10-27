# 📋 API Endpoints Contract for Frontend Integration

## Overview

This document provides the complete API contract for Rishabh's frontend integration. All endpoints are production-ready with proper RBAC, error handling, and documentation.

## 🔐 Authentication

### Base URL
- **Development**: `http://localhost:5050`
- **Production**: `https://api.fraudevidence.com`

### Headers
```javascript
{
  "Authorization": "Bearer <jwt_token>",
  "Content-Type": "application/json",
  "X-Request-ID": "req_<timestamp>_<random>"
}
```

## 📡 API Endpoints

### 1. Authentication Endpoints

#### Login
```http
POST /api/auth/login
```

**Request Body:**
```json
{
  "email": "investigator@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "investigator@example.com",
    "role": "investigator",
    "permissions": {
      "evidenceView": true,
      "evidenceUpload": true,
      "evidenceDownload": true,
      "evidenceExport": true,
      "caseManagement": false,
      "adminAccess": false
    },
    "accessLevel": "standard"
  }
}
```

#### Register
```http
POST /api/auth/register
```

**Request Body:**
```json
{
  "email": "newuser@example.com",
  "password": "password123",
  "role": "investigator"
}
```

#### Get Profile
```http
GET /api/auth/profile
```

**Response (200):**
```json
{
  "success": true,
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "investigator@example.com",
    "role": "investigator",
    "permissions": {
      "evidenceView": true,
      "evidenceUpload": true,
      "evidenceDownload": true,
      "evidenceExport": true,
      "caseManagement": false,
      "adminAccess": false
    },
    "accessLevel": "standard",
    "isActive": true,
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### 2. Evidence Management Endpoints

#### List Evidence
```http
GET /api/evidence?page=1&limit=10&caseId=CASE-001&riskLevel=high
```

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10)
- `caseId` (string): Filter by case ID
- `entity` (string): Filter by entity address
- `riskLevel` (string): Filter by risk level (low, medium, high, critical)
- `status` (string): Filter by verification status (pending, verified, failed)

**Response (200):**
```json
{
  "success": true,
  "evidence": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "caseId": "CASE-2024-001",
      "entity": "0x742d35Cc6634C0532925a3b8D",
      "filename": "evidence_document.pdf",
      "originalFilename": "suspicious_transaction.pdf",
      "fileSize": 1024000,
      "fileType": "application/pdf",
      "fileHash": "sha256:abc123def456...",
      "riskLevel": "high",
      "verificationStatus": "verified",
      "uploadedBy": "investigator@example.com",
      "blockchainTxHash": "0x1234567890abcdef...",
      "tags": ["phishing", "suspicious"],
      "uploadedAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "pages": 3
  },
  "count": 10,
  "userRole": "investigator",
  "permissions": ["evidenceView", "evidenceUpload", "evidenceDownload"]
}
```

#### Upload Evidence
```http
POST /api/evidence/upload
```

**Request (multipart/form-data):**
```
evidenceFile: <file>
caseId: "CASE-2024-001"
entity: "0x742d35Cc6634C0532925a3b8D"
description: "Suspicious transaction evidence"
tags: "phishing,suspicious"
riskLevel: "high"
```

**Response (201):**
```json
{
  "success": true,
  "evidence": {
    "_id": "507f1f77bcf86cd799439011",
    "caseId": "CASE-2024-001",
    "entity": "0x742d35Cc6634C0532925a3b8D",
    "filename": "evidence_document.pdf",
    "originalFilename": "suspicious_transaction.pdf",
    "fileSize": 1024000,
    "fileType": "application/pdf",
    "fileHash": "sha256:abc123def456...",
    "riskLevel": "high",
    "verificationStatus": "pending",
    "uploadedBy": "investigator@example.com",
    "blockchainTxHash": "0x1234567890abcdef...",
    "tags": ["phishing", "suspicious"],
    "uploadedAt": "2024-01-15T10:30:00.000Z"
  },
  "storage": {
    "local": true,
    "s3": true,
    "ipfs": true
  },
  "blockchain": {
    "synced": true,
    "txHash": "0x1234567890abcdef...",
    "blockNumber": 12345
  }
}
```

#### Get Evidence by ID
```http
GET /api/evidence/:evidenceId
```

**Response (200):**
```json
{
  "success": true,
  "evidence": {
    "_id": "507f1f77bcf86cd799439011",
    "caseId": "CASE-2024-001",
    "entity": "0x742d35Cc6634C0532925a3b8D",
    "filename": "evidence_document.pdf",
    "originalFilename": "suspicious_transaction.pdf",
    "fileSize": 1024000,
    "fileType": "application/pdf",
    "fileHash": "sha256:abc123def456...",
    "riskLevel": "high",
    "verificationStatus": "verified",
    "uploadedBy": "investigator@example.com",
    "blockchainTxHash": "0x1234567890abcdef...",
    "tags": ["phishing", "suspicious"],
    "uploadedAt": "2024-01-15T10:30:00.000Z",
    "verificationHistory": [
      {
        "status": "verified",
        "verifiedBy": "admin@example.com",
        "verifiedAt": "2024-01-15T11:00:00.000Z",
        "notes": "File integrity verified"
      }
    ]
  }
}
```

#### Download Evidence
```http
GET /api/evidence/download/:evidenceId
```

**Response (200):**
- **Content-Type**: `application/pdf` (or appropriate file type)
- **Content-Disposition**: `attachment; filename="evidence_document.pdf"`
- **Body**: File binary data

#### Verify Evidence
```http
POST /api/evidence/verify/:evidenceId
```

**Response (200):**
```json
{
  "success": true,
  "verification": {
    "overallIntegrity": true,
    "fileHashMatch": true,
    "blockchainHashMatch": true,
    "storageIntegrity": {
      "local": true,
      "s3": true,
      "ipfs": true
    },
    "verificationTime": "2024-01-15T10:30:00.000Z"
  }
}
```

### 3. Case Management Endpoints

#### List Cases
```http
GET /api/cases?page=1&limit=10&status=open&priority=high
```

**Response (200):**
```json
{
  "success": true,
  "cases": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "caseId": "CASE-2024-001",
      "title": "Suspicious Wallet Activity",
      "description": "Investigation into rapid token dumping patterns",
      "status": "investigating",
      "priority": "high",
      "assignedTo": "investigator@example.com",
      "evidenceCount": 5,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T11:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 15,
    "pages": 2
  }
}
```

#### Create Case
```http
POST /api/cases
```

**Request Body:**
```json
{
  "title": "Suspicious Wallet Activity",
  "description": "Investigation into rapid token dumping patterns",
  "priority": "high",
  "assignedTo": "investigator@example.com"
}
```

**Response (201):**
```json
{
  "success": true,
  "case": {
    "_id": "507f1f77bcf86cd799439011",
    "caseId": "CASE-2024-001",
    "title": "Suspicious Wallet Activity",
    "description": "Investigation into rapid token dumping patterns",
    "status": "open",
    "priority": "high",
    "assignedTo": "investigator@example.com",
    "evidenceCount": 0,
    "createdBy": "investigator@example.com",
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### 4. RL Engine Endpoints

#### Get RL Status
```http
GET /api/rl/status
```

**Response (200):**
```json
{
  "success": true,
  "status": {
    "modelLoaded": true,
    "episodes": 150,
    "totalReward": 1250.5,
    "epsilon": 0.15,
    "learningRate": 0.1,
    "lastTraining": "2024-01-15T10:30:00.000Z",
    "performance": {
      "accuracy": 0.85,
      "precision": 0.82,
      "recall": 0.88,
      "f1Score": 0.85
    }
  }
}
```

#### Make RL Prediction
```http
POST /api/rl/predict
```

**Request Body:**
```json
{
  "walletData": {
    "riskScore": 75,
    "rapidDumping": 0.8,
    "largeTransfers": 0.6,
    "flashLoans": 0.3,
    "phishingScore": 0.7
  },
  "geoData": {
    "country": "CN",
    "org": "VPN Service",
    "city": "Beijing"
  },
  "escalationData": {
    "history": [
      { "outcome": "correct" },
      { "outcome": "missed_threat" }
    ]
  }
}
```

**Response (200):**
```json
{
  "success": true,
  "action": 2,
  "actionName": "investigate",
  "confidence": 0.85,
  "exploration": false,
  "state": [0.75, 0.3, 0.1, 0.8],
  "modelInfo": {
    "episodes": 150,
    "totalReward": 1250.5,
    "epsilon": 0.15
  }
}
```

#### Train RL Model
```http
POST /api/rl/train
```

**Request Body:**
```json
{
  "walletData": {
    "riskScore": 75,
    "rapidDumping": 0.8,
    "largeTransfers": 0.6,
    "flashLoans": 0.3,
    "phishingScore": 0.7
  },
  "geoData": {
    "country": "CN",
    "org": "VPN Service",
    "city": "Beijing"
  },
  "escalationData": {
    "history": [
      { "outcome": "correct" },
      { "outcome": "missed_threat" }
    ]
  },
  "action": 2,
  "outcome": "correct"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Model trained successfully",
  "updatedQValue": 0.75,
  "newEpsilon": 0.14,
  "totalReward": 1251.2
}
```

### 5. Reports & Analytics Endpoints

#### Generate Case Report
```http
POST /api/cases/:caseId/report
```

**Request Body:**
```json
{
  "format": "pdf",
  "includeEvidence": true,
  "includeTimeline": true,
  "includeRiskEvolution": true,
  "includeEscalations": true
}
```

**Response (200):**
```json
{
  "success": true,
  "report": {
    "reportId": "RPT-2024-001",
    "format": "pdf",
    "size": 2048000,
    "downloadUrl": "/api/reports/download/RPT-2024-001",
    "generatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

#### Export Evidence Data
```http
GET /api/reports/export?format=csv&caseId=CASE-001&startDate=2024-01-01&endDate=2024-01-31
```

**Response (200):**
- **Content-Type**: `text/csv` or `application/json`
- **Content-Disposition**: `attachment; filename="evidence_export.csv"`
- **Body**: CSV or JSON data

### 6. System Health Endpoints

#### Health Check
```http
GET /health
```

**Response (200):**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "services": {
    "database": "healthy",
    "kafka": "healthy",
    "blockchain": "healthy",
    "storage": "healthy"
  },
  "version": "1.0.0",
  "uptime": 3600
}
```

#### Get System Stats
```http
GET /api/stats
```

**Response (200):**
```json
{
  "success": true,
  "stats": {
    "totalUsers": 25,
    "totalCases": 150,
    "totalEvidence": 500,
    "activeInvestigations": 12,
    "systemUptime": 3600,
    "lastBackup": "2024-01-15T09:00:00.000Z"
  }
}
```

## 🚨 Error Responses

All endpoints return consistent error responses:

```json
{
  "error": true,
  "code": 403,
  "message": "Insufficient permissions",
  "details": {
    "requiredPermissions": ["evidence.download"],
    "userRole": "user",
    "allowedRoles": ["investigator", "admin", "superadmin"]
  },
  "timestamp": "2024-01-15T10:30:00.000Z",
  "path": "/api/evidence/download/507f1f77bcf86cd799439011",
  "method": "GET",
  "requestId": "req_1705312200000_abc123def"
}
```

### Common Error Codes

- **400**: Bad Request - Invalid input data
- **401**: Unauthorized - Authentication required
- **403**: Forbidden - Insufficient permissions
- **404**: Not Found - Resource not found
- **409**: Conflict - Duplicate resource
- **413**: Payload Too Large - File too large
- **429**: Too Many Requests - Rate limit exceeded
- **500**: Internal Server Error - Server error

## 🔒 RBAC Integration

### Role-Based Access Control

| Role | Evidence View | Evidence Upload | Evidence Download | Evidence Export | Case Management | Admin Access |
|------|---------------|-----------------|-------------------|-----------------|-----------------|--------------|
| **superadmin** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **admin** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **investigator** | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **user** | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |

### Frontend Integration

```javascript
// Check user permissions
const hasPermission = (permission) => {
  return user.permissions[permission] === true;
};

// Conditional rendering
{hasPermission('evidenceView') && (
  <EvidenceList />
)}

// API calls with error handling
try {
  const response = await fetch('/api/evidence', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    const error = await response.json();
    if (error.code === 403) {
      // Handle permission denied
      showAccessDeniedMessage();
    }
  }
} catch (error) {
  // Handle network errors
}
```

## 📡 Real-time Updates

### WebSocket Integration

```javascript
// Connect to WebSocket for real-time updates
const ws = new WebSocket('ws://localhost:5050/ws');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  switch (data.type) {
    case 'evidence_stored':
      // Update evidence list
      updateEvidenceList(data.data);
      break;
    case 'evidence_verified':
      // Update evidence status
      updateEvidenceStatus(data.data);
      break;
    case 'wallet_flagged':
      // Show new flag alert
      showFlagAlert(data.data);
      break;
  }
};
```

## 🧪 Testing

### Postman Collection

Import the provided Postman collection for comprehensive API testing:

```bash
# Import collection
Backend/postman/Fraud_Evidence_System_API.postman_collection.json
```

### Test Environment

```javascript
// Test configuration
const testConfig = {
  baseUrl: 'http://localhost:5050',
  testUser: {
    email: 'test@example.com',
    password: 'testpassword123',
    role: 'investigator'
  }
};
```

## 📚 Additional Resources

- **Swagger Documentation**: `http://localhost:5050/api-docs`
- **Production Guide**: `Backend/PRODUCTION_READY_GUIDE.md`
- **RBAC Configuration**: `Backend/config/permissions.js`
- **Error Handling**: `Backend/middleware/errorHandler.js`

---

**This API contract provides everything needed for seamless frontend integration with the production-ready fraud evidence system backend.**
