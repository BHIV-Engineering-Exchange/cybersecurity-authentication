# Fraud Evidence System - Mock Server

This is a mock server for the Fraud Evidence System API that provides sample responses for all endpoints defined in the OpenAPI specification.

## Features

- ✅ Complete OpenAPI 3.0.3 specification
- ✅ Dockerized mock server
- ✅ Sample JSON responses for all endpoints
- ✅ Realistic response times and status codes
- ✅ Health check endpoint
- ✅ CORS enabled
- ✅ Security headers with Helmet

## Quick Start

### Using Docker (Recommended)

```bash
# Build and run the mock server
docker-compose up --build

# Or run in detached mode
docker-compose up -d --build
```

### Using Node.js directly

```bash
# Install dependencies
npm install

# Start the server
npm start

# Or for development with auto-reload
npm run dev
```

## API Endpoints

The mock server provides the following endpoints:

### Evidence Management
- `POST /api/evidence/upload` - Upload evidence file
- `GET /api/evidence/:id/verify` - Verify evidence authenticity

### Case Management
- `GET /api/cases` - List all cases (with pagination and filtering)
- `POST /api/cases` - Create a new case
- `GET /api/cases/:id` - Get case by ID
- `PUT /api/cases/:id` - Update case
- `DELETE /api/cases/:id` - Delete case

### Reinforcement Learning
- `POST /api/rl/predict` - Get RL prediction
- `POST /api/rl/feedback` - Submit RL feedback

### Escalation
- `POST /api/escalate` - Escalate case or entity

### Utility
- `GET /health` - Health check endpoint

## Sample Responses

### Evidence Upload
```json
{
  "success": true,
  "message": "Evidence uploaded successfully",
  "evidence": {
    "id": "evid_67890",
    "filename": "screenshot_20250102.png",
    "caseId": "case_12345",
    "entity": "0x1234567890abcdef",
    "description": "Suspicious transaction screenshot",
    "riskLevel": "high",
    "status": "pending",
    "uploadedAt": "2025-01-02T10:30:00Z"
  }
}
```

### RL Prediction
```json
{
  "success": true,
  "prediction": {
    "riskScore": 0.85,
    "confidence": 0.92,
    "riskLevel": "high",
    "reasoning": [
      "High transaction volume",
      "Multiple unique counterparties",
      "Recent activity spike"
    ],
    "recommendedActions": [
      "Flag for investigation",
      "Monitor closely",
      "Request additional evidence"
    ],
    "modelVersion": "v2.1.0"
  }
}
```

## Configuration

### Environment Variables
- `PORT` - Server port (default: 3001)
- `NODE_ENV` - Environment (development/production)

### Docker Configuration
- Port: 3001
- Health check: `/health`
- Restart policy: unless-stopped
- Network: fraud-evidence-network

## Testing

### Health Check
```bash
curl http://localhost:3001/health
```

### Test Evidence Upload
```bash
curl -X POST http://localhost:3001/api/evidence/upload \
  -H "Content-Type: application/json" \
  -d '{
    "caseId": "case_12345",
    "entity": "0x1234567890abcdef",
    "description": "Test evidence",
    "riskLevel": "high"
  }'
```

### Test RL Prediction
```bash
curl -X POST http://localhost:3001/api/rl/predict \
  -H "Content-Type: application/json" \
  -d '{
    "entity": "0x1234567890abcdef",
    "features": {
      "transactionCount": 150,
      "totalVolume": 125000.50,
      "avgTransactionSize": 833.33
    }
  }'
```

## OpenAPI Specification

The complete OpenAPI specification is available at:
- File: `openapi.yaml`
- URL: `http://localhost:3001/openapi.yaml` (when server is running)

## Development

### Project Structure
```
mock-server/
├── server.js          # Main server file
├── package.json       # Dependencies and scripts
├── Dockerfile         # Docker configuration
├── docker-compose.yml # Docker Compose setup
├── openapi.yaml       # OpenAPI specification
└── README.md          # This file
```

### Adding New Endpoints

1. Add the endpoint to `openapi.yaml`
2. Implement the handler in `server.js`
3. Add sample data to `mockData` object
4. Test the endpoint

### Mock Data

The server uses in-memory mock data that persists during the server session. To add new sample data:

1. Add to the `mockData` object in `server.js`
2. Use realistic sample data
3. Include all required fields from the OpenAPI spec

## Production Considerations

- The mock server is designed for development and testing
- For production, implement proper authentication
- Add rate limiting and request validation
- Use a proper database instead of in-memory storage
- Implement proper logging and monitoring

## License

MIT License - see LICENSE file for details.
