# Evidence Upload API - Complete Guide

## Overview

This guide covers the Evidence Upload API implementation with local storage mock, SHA-256 hashing, mock BHIV integration, and MongoDB persistence.

---

## 🎯 Features Implemented

✅ **Local File Storage**
- Files stored in `uploads/` directory
- Organized by case ID
- Automatic directory creation

✅ **SHA-256 Hash Computation**
- Cryptographic hash for integrity verification
- Used as unique identifier
- Prevents duplicate uploads

✅ **Mock BHIV Storage**
- Simulates BHIV Bucket API
- Generates mock S3 keys and IPFS hashes
- Returns realistic storage metadata

✅ **MongoDB Integration**
- Evidence records stored in MongoDB
- Complete metadata tracking
- Indexed for performance

✅ **RBAC Integration**
- Permission-based access control
- Different roles have different capabilities
- Consistent 403 error responses

---

## 📡 API Endpoint

### POST /api/evidence/upload

Upload evidence file with metadata.

**Required Permissions**: `upload-evidence`  
**Allowed Roles**: user, analyst, investigator, admin, superadmin

#### Request

**Content-Type**: `multipart/form-data`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `evidenceFile` | file | ✅ Yes | Evidence file to upload |
| `caseId` | string | ✅ Yes | Associated case ID |
| `wallet` | string | ✅ Yes | Wallet address |
| `reporter` | string | ✅ Yes | Reporter email |
| `description` | string | No | Evidence description |
| `tags` | string | No | Comma-separated tags |
| `riskLevel` | string | No | low, medium, high, critical |

#### Response (Success - 201)

```json
{
  "success": true,
  "message": "Evidence uploaded successfully",
  "evidenceId": "66d4a2b8c9e1234567890abc",
  "storageHash": "5d7e8f9a0b1c2d3e4f5g6h7i8j9k0l1m2n3o4p5q6r7s8t9u0v1w2x3y4z5a6b7c",
  "storageMetadata": {
    "s3Key": "evidence/CASE-2024-001/1704672000000_transaction.png",
    "s3Url": "https://s3.mock-bhiv.com/evidence/CASE-2024-001/...",
    "ipfsHash": "QmT4k8J9aB3d5F7g1H2i6K0l3M5n7O9p2Q4r6S8t1U3v",
    "ipfsUrl": "https://ipfs.io/ipfs/QmT4k8...",
    "bhivPointer": "bhiv://local/CASE-2024-001/5d7e8f9a0b1c2d3e",
    "redundancy": 3,
    "locations": {
      "local": true,
      "s3": true,
      "ipfs": true
    },
    "uploadedAt": "2024-01-07T12:00:00.000Z",
    "provider": "BHIV-Mock",
    "version": "1.0.0"
  },
  "evidence": {
    "id": "66d4a2b8c9e1234567890abc",
    "caseId": "CASE-2024-001",
    "wallet": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "filename": "transaction.png",
    "fileSize": 245760,
    "fileType": "image/png",
    "uploadedAt": "2024-01-07T12:00:00.000Z",
    "verificationStatus": "pending"
  },
  "storage": {
    "local": {
      "path": "CASE-2024-001/CASE-2024-001_1704672000000_transaction.png",
      "hash": "5d7e8f9a0b1c2d3e4f5g6h7i8j9k0l1m2n3o4p5q6r7s8t9u0v1w2x3y4z5a6b7c"
    },
    "bhiv": {
      "s3Key": "evidence/CASE-2024-001/1704672000000_transaction.png",
      "ipfsHash": "QmT4k8J9aB3d5F7g1H2i6K0l3M5n7O9p2Q4r6S8t1U3v",
      "bhivPointer": "bhiv://local/CASE-2024-001/5d7e8f9a0b1c2d3e"
    }
  },
  "timestamp": "2024-01-07T12:00:00.000Z"
}
```

#### Response (Error - 400)

```json
{
  "error": true,
  "code": 400,
  "message": "No file uploaded",
  "timestamp": "2024-01-07T12:00:00.000Z"
}
```

#### Response (Error - 403)

```json
{
  "error": true,
  "code": 403,
  "message": "Forbidden: insufficient permissions",
  "details": {
    "requiredPermissions": ["upload-evidence"],
    "userRole": "guest",
    "allowedRoles": ["user", "analyst", "investigator", "admin", "superadmin"]
  },
  "timestamp": "2024-01-07T12:00:00.000Z"
}
```

---

## 🧪 Testing with Postman

### Setup

1. **Import Collection**
   ```
   backend/postman/evidence_upload_collection.json
   ```

2. **Set Base URL**
   - Variable: `{{baseUrl}}`
   - Value: `http://localhost:5050`

3. **Prepare Test File**
   - Create a small test file (e.g., `test.txt` or `screenshot.png`)
   - You'll upload this in the requests

### Test Cases

#### Test 1: Upload Evidence as User (SUCCESS) ✅

**Setup**:
- Header: `x-user-role: user`
- File: Select any test file
- Fields: caseId, wallet, reporter

**Expected**:
- Status: 201
- Response includes evidenceId, storageHash, storageMetadata

#### Test 2: Upload Evidence as Guest (FAIL) ❌

**Setup**:
- Header: `x-user-role: guest`
- No file needed (will fail on permission check)

**Expected**:
- Status: 403
- Error message: "Forbidden: insufficient permissions"

#### Test 3: Upload Without File (FAIL) ❌

**Setup**:
- Header: `x-user-role: user`
- No file attached

**Expected**:
- Status: 400
- Error message: "No file uploaded"

#### Test 4: Upload Without Required Fields (FAIL) ❌

**Setup**:
- Header: `x-user-role: user`
- File attached but missing wallet or reporter

**Expected**:
- Status: 400
- Error message: "Missing required fields"

---

## 🔧 Testing with cURL

### Successful Upload

```bash
# Create a test file
echo "This is test evidence" > test.txt

# Upload as user
curl -X POST http://localhost:5050/api/evidence/upload \
  -H "x-user-role: user" \
  -F "evidenceFile=@test.txt" \
  -F "caseId=CASE-2024-001" \
  -F "wallet=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb" \
  -F "reporter=user@fraud.com" \
  -F "description=Test evidence upload" \
  -F "tags=test,demo,upload" \
  -F "riskLevel=medium"
```

### Expected Response

```json
{
  "success": true,
  "message": "Evidence uploaded successfully",
  "evidenceId": "66d4a2b8c9e1234567890abc",
  "storageHash": "a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3",
  "storageMetadata": {
    "s3Key": "evidence/CASE-2024-001/1704672000000_test.txt",
    "ipfsHash": "QmT4k8J9aB3d5F7g1H2i6K0l3M5n7O9p2Q4r6S8t1U3v",
    "bhivPointer": "bhiv://local/CASE-2024-001/a665a45920422f9d",
    "redundancy": 3
  }
}
```

### Failed Upload (Permission Denied)

```bash
# Try to upload as guest
curl -X POST http://localhost:5050/api/evidence/upload \
  -H "x-user-role: guest" \
  -F "evidenceFile=@test.txt" \
  -F "caseId=CASE-2024-001" \
  -F "wallet=0x742d..." \
  -F "reporter=guest@fraud.com"
```

### Expected Error Response

```json
{
  "error": true,
  "code": 403,
  "message": "Forbidden: insufficient permissions",
  "details": {
    "requiredPermissions": ["upload-evidence"],
    "userRole": "guest",
    "allowedRoles": ["user", "analyst", "investigator", "admin", "superadmin"]
  },
  "timestamp": "2024-01-07T12:00:00.000Z"
}
```

---

## 📁 File Storage

### Directory Structure

```
backend/
└── uploads/
    ├── CASE-2024-001/
    │   ├── CASE-2024-001_1704672000000_transaction.png
    │   └── CASE-2024-001_1704672100000_evidence.pdf
    ├── CASE-2024-002/
    │   └── CASE-2024-002_1704672200000_screenshot.jpg
    └── ... (organized by case ID)
```

### Filename Format

```
{caseId}_{timestamp}_{sanitized_originalname}.{ext}
```

Example:
```
CASE-2024-001_1704672000000_transaction.png
```

---

## 🔐 SHA-256 Hash

### What is it?

SHA-256 (Secure Hash Algorithm 256-bit) creates a unique "fingerprint" of the file:
- **64 hexadecimal characters** (256 bits)
- **Deterministic**: Same file = same hash
- **Collision-resistant**: Different files have different hashes
- **One-way**: Cannot reverse hash to get file

### Example

**File**: "Hello World"  
**SHA-256**: `a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e`

### Uses in System

1. **Integrity Verification**: Detect if file has been tampered with
2. **Deduplication**: Prevent uploading same file twice
3. **Indexing**: Fast lookup by hash
4. **Blockchain Storage**: Hash stored on-chain for immutability

---

## 🗄️ MongoDB Schema

### Evidence Collection

```javascript
{
  _id: ObjectId,
  caseId: String,           // "CASE-2024-001"
  wallet: String,           // "0x742d..."
  reporter: String,         // "investigator@fraud.com"
  filename: String,         // "CASE-2024-001_1704672000000_evidence.png"
  originalFilename: String, // "evidence.png"
  filePath: String,         // "uploads/CASE-2024-001/..."
  fileSize: Number,         // 245760
  fileType: String,         // "image/png"
  storageHash: String,      // SHA-256 hash
  storageMetadata: {
    s3Key: String,
    ipfsHash: String,
    bhivPointer: String,
    redundancy: Number,
    locations: {
      local: Boolean,
      s3: Boolean,
      ipfs: Boolean
    }
  },
  description: String,
  tags: [String],
  riskLevel: String,        // low|medium|high|critical
  verificationStatus: String, // pending|verified|failed
  integrityStatus: String,  // unknown|intact|corrupted
  uploadedAt: Date,
  lastVerified: Date,
  uploadedBy: String,
  ipAddress: String,
  userAgent: String,
  createdAt: Date,
  updatedAt: Date
}
```

### Indexes

- `caseId` + `uploadedAt` (compound)
- `wallet` + `uploadedAt` (compound)
- `storageHash` (unique)
- `uploadedAt` (descending)

---

## 🔄 Upload Flow

```
1. Client uploads file
   ↓
2. RBAC checks permission
   ↓
3. File validated (size, presence)
   ↓
4. File stored locally
   ↓
5. SHA-256 hash computed
   ↓
6. Mock BHIV upload called
   ↓
7. Evidence record saved to MongoDB
   ↓
8. Response returned to client
```

---

## 🧪 Complete Test Scenarios

### Scenario 1: Successful Upload

**Given**: User role, valid file, all required fields  
**When**: POST /api/evidence/upload  
**Then**: 
- Status: 201
- File saved in uploads/
- Hash computed
- MongoDB record created
- Response includes evidenceId and storageHash

### Scenario 2: Permission Denied

**Given**: Guest role  
**When**: POST /api/evidence/upload  
**Then**:
- Status: 403
- Error message with details
- No file saved
- No MongoDB record

### Scenario 3: Missing File

**Given**: User role, no file attached  
**When**: POST /api/evidence/upload  
**Then**:
- Status: 400
- Error: "No file uploaded"

### Scenario 4: Missing Required Fields

**Given**: User role, file but no wallet  
**When**: POST /api/evidence/upload  
**Then**:
- Status: 400
- Error: "Missing required fields"
- Details show which fields are missing

### Scenario 5: Verify Evidence

**Given**: Investigator role, valid evidence ID  
**When**: GET /api/evidence/:id/verify  
**Then**:
- Status: 200
- Local file integrity checked
- BHIV mock verification performed
- Overall status returned

---

## 💻 Code Examples

### Node.js/JavaScript

```javascript
const FormData = require('form-data');
const fs = require('fs');
const axios = require('axios');

async function uploadEvidence() {
  const form = new FormData();
  form.append('evidenceFile', fs.createReadStream('test.txt'));
  form.append('caseId', 'CASE-2024-001');
  form.append('wallet', '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb');
  form.append('reporter', 'investigator@fraud.com');
  form.append('description', 'Test evidence');
  form.append('tags', 'test,demo');
  form.append('riskLevel', 'medium');

  const response = await axios.post('http://localhost:5050/api/evidence/upload', form, {
    headers: {
      ...form.getHeaders(),
      'x-user-role': 'user'
    }
  });

  console.log('Evidence ID:', response.data.evidenceId);
  console.log('Storage Hash:', response.data.storageHash);
}
```

### Python

```python
import requests

files = {'evidenceFile': open('test.txt', 'rb')}
data = {
    'caseId': 'CASE-2024-001',
    'wallet': '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    'reporter': 'investigator@fraud.com',
    'description': 'Test evidence',
    'tags': 'test,demo',
    'riskLevel': 'medium'
}
headers = {'x-user-role': 'user'}

response = requests.post(
    'http://localhost:5050/api/evidence/upload',
    files=files,
    data=data,
    headers=headers
)

print('Evidence ID:', response.json()['evidenceId'])
print('Storage Hash:', response.json()['storageHash'])
```

### Frontend (React)

```javascript
async function uploadEvidence(file, metadata) {
  const formData = new FormData();
  formData.append('evidenceFile', file);
  formData.append('caseId', metadata.caseId);
  formData.append('wallet', metadata.wallet);
  formData.append('reporter', metadata.reporter);
  formData.append('description', metadata.description);
  formData.append('tags', metadata.tags);
  formData.append('riskLevel', metadata.riskLevel);

  const response = await fetch('http://localhost:5050/api/evidence/upload', {
    method: 'POST',
    headers: {
      'x-user-role': 'user' // Or get from auth context
    },
    body: formData
  });

  const result = await response.json();
  
  if (result.success) {
    console.log('Uploaded:', result.evidenceId);
    console.log('Hash:', result.storageHash);
    return result;
  } else {
    throw new Error(result.message);
  }
}
```

---

## 📊 What Gets Saved

### Local Filesystem

**Location**: `backend/uploads/{caseId}/{filename}`

**Example**:
```
backend/uploads/CASE-2024-001/CASE-2024-001_1704672000000_transaction.png
```

### MongoDB

**Collection**: `evidences`

**Document Example**:
```json
{
  "_id": "66d4a2b8c9e1234567890abc",
  "caseId": "CASE-2024-001",
  "wallet": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "reporter": "investigator@fraud.com",
  "filename": "CASE-2024-001_1704672000000_transaction.png",
  "originalFilename": "transaction.png",
  "filePath": "/path/to/uploads/CASE-2024-001/...",
  "fileSize": 245760,
  "fileType": "image/png",
  "storageHash": "5d7e8f9a0b1c2d3e...",
  "storageMetadata": {
    "s3Key": "evidence/CASE-2024-001/...",
    "ipfsHash": "QmT4k8J9a...",
    "bhivPointer": "bhiv://local/..."
  },
  "description": "Transaction screenshot",
  "tags": ["transaction", "suspicious"],
  "riskLevel": "high",
  "verificationStatus": "pending",
  "uploadedAt": "2024-01-07T12:00:00.000Z"
}
```

---

## 🔍 Verification Process

### How It Works

1. **Read Original File** from local storage
2. **Compute New Hash** from file contents
3. **Compare Hashes**: 
   - If match → File intact ✅
   - If different → File corrupted ❌
4. **Mock BHIV Verify**: Simulates multi-layer verification
5. **Update Status** in MongoDB

### Verify Endpoint

```bash
# Verify evidence
curl -H "x-user-role: investigator" \
  http://localhost:5050/api/evidence/{evidenceId}/verify
```

### Response

```json
{
  "success": true,
  "verification": {
    "evidenceId": "66d4a2b8c9e1234567890abc",
    "localVerification": {
      "success": true,
      "isValid": true,
      "expectedHash": "5d7e8f9a...",
      "actualHash": "5d7e8f9a...",
      "message": "File integrity verified"
    },
    "bhivVerification": {
      "local": { "verified": true, "hashMatch": true },
      "s3": { "verified": true, "hashMatch": true },
      "ipfs": { "verified": true, "hashMatch": true },
      "overallStatus": "verified"
    },
    "overallStatus": "verified",
    "verifiedAt": "2024-01-07T13:00:00.000Z"
  }
}
```

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Start MongoDB

```bash
# Using Docker
docker run -d -p 27017:27017 --name mongo mongo:latest

# Or use local MongoDB installation
mongod
```

### 3. Start Server

```bash
npm start
# or for development with auto-reload
npm run dev
```

### 4. Test Upload

```bash
# Create test file
echo "Test evidence" > test.txt

# Upload
curl -X POST http://localhost:5050/api/evidence/upload \
  -H "x-user-role: user" \
  -F "evidenceFile=@test.txt" \
  -F "caseId=CASE-2024-001" \
  -F "wallet=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb" \
  -F "reporter=test@fraud.com"
```

### 5. Verify Upload

```bash
# Check uploads directory
ls -la uploads/CASE-2024-001/

# Check MongoDB
mongo fraud_evidence
> db.evidences.find().pretty()

# Check server logs for SHA-256 hash
```

---

## 🎯 Acceptance Criteria - All Met

| Requirement | Status |
|-------------|--------|
| ✅ Functional local API endpoint /api/evidence/upload | Complete |
| ✅ File stored locally in /uploads | Complete |
| ✅ SHA-256 computed and returned | Complete |
| ✅ Mock storage metadata used | Complete |
| ✅ Evidence record saved in MongoDB | Complete |
| ✅ Postman test showing successful upload | Complete |
| ✅ RBAC integration | Complete |
| ✅ Error handling | Complete |
| ✅ Validation | Complete |

---

## 🔒 Security Features

✅ **File Size Limit**: 50MB maximum  
✅ **Permission Check**: RBAC before upload  
✅ **Input Validation**: All required fields checked  
✅ **Hash Verification**: SHA-256 for integrity  
✅ **Audit Trail**: IP address and user agent logged  
✅ **Unique Filenames**: Timestamp-based naming prevents collisions

---

## 🐛 Troubleshooting

### Upload Directory Not Created

**Solution**: Server creates it automatically. Check permissions:
```bash
ls -la backend/
chmod 755 backend/uploads
```

### MongoDB Connection Failed

**Solution**:
```bash
# Check if MongoDB is running
mongosh --eval "db.adminCommand('ping')"

# Or use Docker
docker run -d -p 27017:27017 mongo
```

### File Upload Fails

**Checklist**:
- [ ] File size under 50MB?
- [ ] All required fields provided?
- [ ] Correct role header set?
- [ ] Server running?
- [ ] MongoDB connected?

### 403 Forbidden

**Solution**: Set role header
```bash
curl -H "x-user-role: user" ...
```

---

## 📈 Next Steps

### Immediate
1. ✅ Test with Postman collection
2. ✅ Upload test files
3. ✅ Verify MongoDB records
4. ✅ Check local storage

### Integration
1. Connect with frontend upload form
2. Add progress indicators
3. Implement file preview
4. Add drag-and-drop

### Production
1. Replace mock BHIV with real integration
2. Add real JWT authentication
3. Implement S3/IPFS storage
4. Add file type restrictions
5. Virus scanning before storage
6. Compression for large files

---

## 📞 Support

**Documentation**:
- This guide (EVIDENCE_UPLOAD_GUIDE.md)
- RBAC_DOCUMENTATION.md
- README.md

**Test Collections**:
- evidence_upload_collection.json
- rbac_test_collection.json

**Need Help?**
- Check server logs
- Verify MongoDB connection
- Test with Postman collection
- Review error response details

---

**Version**: 1.0.0  
**Last Updated**: January 7, 2024  
**Author**: Yashika (Backend Lead)

