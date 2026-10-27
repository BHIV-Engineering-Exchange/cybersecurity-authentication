# Fraud Evidence System - Mock Server

## Overview

This is a lightweight mock server for the Fraud Evidence System API. It simulates real backend behavior with static JSON responses for development and testing purposes.

## Features

- ✅ **Complete API Coverage**: All endpoints from the OpenAPI specification
- ✅ **Realistic Responses**: JSON responses matching production schema
- ✅ **Docker Support**: Easy deployment with Docker and Docker Compose
- ✅ **Postman Collection**: Ready-to-use API testing collection
- ✅ **Validation**: Input validation and error handling
- ✅ **Logging**: Request logging for debugging
- ✅ **RBAC System**: Role-Based Access Control with 6 roles and 24 permissions
- ✅ **Mock Authentication**: Easy role testing for development

## Directory Structure

```
backend/
├── openapi/
│   └── openapi.yaml              # OpenAPI 3.0 specification
├── mocks/
│   ├── mockData/                 # Mock JSON responses
│   │   ├── evidence.json
│   │   ├── evidence_verify.json
│   │   ├── case.json
│   │   ├── case_single.json
│   │   ├── rl_predict.json
│   │   ├── rl_feedback.json
│   │   └── escalate.json
│   ├── mockServer.js             # Express mock server
│   ├── package.json              # Node.js dependencies
│   └── Dockerfile                # Docker configuration
├── postman/
│   └── postman_collection.json   # Postman API collection
├── docker-compose.yml            # Docker Compose configuration
└── README.md                     # This file
```

## Quick Start

### Option 1: Using Docker Compose (Recommended)

1. **Start the mock server**:
   ```bash
   docker-compose up
   ```

2. **Access the API**:
   ```
   http://localhost:5000
   ```

3. **Stop the server**:
   ```bash
   docker-compose down
   ```

### Option 2: Using Node.js Directly

1. **Navigate to mocks directory**:
   ```bash
   cd mocks
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the server**:
   ```bash
   npm start
   ```

4. **For development with auto-reload**:
   ```bash
   npm run dev
   ```

## API Endpoints

### Evidence Management

- **POST** `/api/evidence/upload` - Upload evidence files *(requires: upload-evidence)*
- **GET** `/api/evidence/{id}/verify` - Verify evidence integrity *(requires: verify-evidence)*

### Case Management

- **GET** `/api/cases` - List all cases *(requires: view-cases)*
- **POST** `/api/cases` - Create a new case *(requires: create-case)*
- **GET** `/api/cases/{id}` - Get case by ID *(requires: view-cases)*
- **PUT** `/api/cases/{id}` - Update case *(requires: update-case)*
- **DELETE** `/api/cases/{id}` - Delete case *(requires: delete-case)*

### RL Engine

- **POST** `/api/rl/predict` - Get fraud prediction *(requires: rl-predict)*
- **POST** `/api/rl/feedback` - Submit prediction feedback *(requires: rl-feedback)*

### Escalation

- **POST** `/api/escalate` - Escalate high-risk case *(requires: escalate-case)*

### Health & Status

- **GET** `/health` - Health check *(public)*
- **GET** `/` - API information *(public)*

## Role-Based Access Control (RBAC)

The API implements RBAC with 6 roles: **guest**, **user**, **analyst**, **investigator**, **admin**, **superadmin**.

### Testing with Different Roles

Add the `x-user-role` header to test as different roles:

```bash
# Test as user
curl -H "x-user-role: user" http://localhost:5000/api/cases

# Test as admin
curl -H "x-user-role: admin" http://localhost:5000/api/cases

# Test as guest (limited access)
curl -H "x-user-role: guest" http://localhost:5000/api/cases
```

For complete RBAC documentation, see:
- `RBAC_QUICK_REFERENCE.md` - Quick reference guide
- `RBAC_DOCUMENTATION.md` - Complete documentation
- `postman/rbac_test_collection.json` - Test collection

## Testing with Postman

1. **Import the collection**:
   - Open Postman
   - Click "Import"
   - Select `postman/postman_collection.json`

2. **Set the base URL**:
   - The collection uses `{{baseUrl}}` variable
   - Default: `http://localhost:5000`

3. **Run requests**:
   - Each request is pre-configured with example data
   - Modify request bodies as needed

4. **Run all tests**:
   - Click "Run collection" to test all endpoints

## Example Requests

### Upload Evidence

```bash
curl -X POST http://localhost:5000/api/evidence/upload \
  -F "evidenceFile=@/path/to/file.png" \
  -F "caseId=CASE-2024-001" \
  -F "entity=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb" \
  -F "description=Transaction screenshot" \
  -F "tags=transaction,fraud" \
  -F "riskLevel=high"
```

### Get Fraud Prediction

```bash
curl -X POST http://localhost:5000/api/rl/predict \
  -H "Content-Type: application/json" \
  -d '{
    "wallet": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "features": {
      "transactionCount": 150,
      "totalVolume": 50000,
      "avgTransactionValue": 333.33
    }
  }'
```

### Create Case

```bash
curl -X POST http://localhost:5000/api/cases \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Suspicious cryptocurrency transactions",
    "description": "Multiple high-value transactions from flagged wallet",
    "priority": "high",
    "category": "financial_fraud"
  }'
```

### Escalate Case

```bash
curl -X POST http://localhost:5000/api/escalate \
  -H "Content-Type: application/json" \
  -d '{
    "entityId": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "caseId": "CASE-2024-001",
    "riskScore": 0.92,
    "reason": "Critical fraud risk - immediate action required",
    "urgency": "urgent",
    "escalateTo": "RBI"
  }'
```

## Response Format

### Success Response

```json
{
  "success": true,
  "data": {
    // Response data
  },
  "timestamp": "2024-01-07T12:00:00.000Z"
}
```

### Error Response

```json
{
  "error": true,
  "code": 400,
  "message": "Error description",
  "details": {
    // Additional error details
  },
  "timestamp": "2024-01-07T12:00:00.000Z"
}
```

## Validation

The mock server includes input validation for:

- ✅ Required fields (caseId, entity, wallet, etc.)
- ✅ File upload presence
- ✅ Request body structure
- ✅ Resource existence (returns 404 for invalid IDs)

## Mock Data Customization

To customize mock responses:

1. Navigate to `mocks/mockData/`
2. Edit the JSON files
3. Restart the server

Example: Modify `rl_predict.json` to change default risk scores.

## Environment Variables

- `PORT`: Server port (default: 5000)
- `NODE_ENV`: Environment mode (production/development)

## Health Check

The server includes a health check endpoint:

```bash
curl http://localhost:5000/health
```

Response:
```json
{
  "status": "healthy",
  "service": "Fraud Evidence Mock Server",
  "version": "1.0.0",
  "timestamp": "2024-01-07T12:00:00.000Z"
}
```

## Docker Commands

### Build the image

```bash
docker build -t fraud-evidence-mock ./mocks
```

### Run the container

```bash
docker run -p 5000:5000 fraud-evidence-mock
```

### View logs

```bash
docker-compose logs -f mock-server
```

### Check health

```bash
docker-compose exec mock-server sh
# Inside container:
wget -q -O - http://localhost:5000/health
```

## Troubleshooting

### Port already in use

```bash
# Change port in docker-compose.yml
ports:
  - "5001:5000"  # Use 5001 instead
```

### Mock data not loading

```bash
# Check file permissions
ls -la mocks/mockData/

# Verify JSON syntax
cat mocks/mockData/evidence.json | jq .
```

### Container not starting

```bash
# Check logs
docker-compose logs mock-server

# Rebuild
docker-compose build --no-cache
```

## Development

### Adding New Endpoints

1. Add endpoint to `openapi/openapi.yaml`
2. Create mock data file in `mocks/mockData/`
3. Add route handler in `mockServer.js`
4. Add request to Postman collection
5. Test the endpoint

### Testing Changes

```bash
# Restart with fresh build
docker-compose down
docker-compose build --no-cache
docker-compose up
```

## Acceptance Criteria

✅ **All Complete**:

1. ✅ Running `docker-compose up` starts the mock server on port 5000
2. ✅ Each endpoint returns the correct mock response with 200 status code
3. ✅ `openapi.yaml` passes OpenAPI validation
4. ✅ Postman collection executes successfully against the mock server

## Next Steps

1. Integrate with frontend application
2. Replace mock endpoints with real backend as developed
3. Use for integration testing
4. Generate client SDKs from OpenAPI spec

## Support

For issues or questions:
- Check logs: `docker-compose logs -f`
- Verify OpenAPI spec: Use Swagger Editor
- Test with Postman collection
- Review mock data files for response structure

## License

MIT License - See LICENSE file for details

---

**Version**: 1.0.0  
**Last Updated**: January 7, 2024  
**Maintained by**: Yashika (Backend Lead)

