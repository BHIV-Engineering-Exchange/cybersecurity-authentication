# 🚀 Quick Start Guide - Fraud Evidence Mock Server

## Prerequisites

- Docker and Docker Compose installed
- OR Node.js 18+ installed

## 30-Second Setup

```bash
# Clone/Navigate to backend folder
cd backend

# Start the mock server
docker-compose up

# Server is now running at http://localhost:5000
```

## Verify It's Working

```bash
# Health check
curl http://localhost:5000/health

# Should return:
# {"status":"healthy","service":"Fraud Evidence Mock Server","version":"1.0.0"}
```

## Test All Endpoints

### 1. Get API Information
```bash
curl http://localhost:5000/
```

### 2. List Cases
```bash
curl http://localhost:5000/api/cases
```

### 3. Create a Case
```bash
curl -X POST http://localhost:5000/api/cases \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Case","priority":"high"}'
```

### 4. Get RL Prediction
```bash
curl -X POST http://localhost:5000/api/rl/predict \
  -H "Content-Type: application/json" \
  -d '{"wallet":"0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"}'
```

### 5. Escalate a Case
```bash
curl -X POST http://localhost:5000/api/escalate \
  -H "Content-Type: application/json" \
  -d '{"entityId":"0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb","riskScore":0.92}'
```

## Use with Postman

1. **Import Collection**
   - Open Postman
   - File > Import
   - Select `postman/postman_collection.json`

2. **Run Tests**
   - Click "Run collection"
   - All tests should pass ✅

## Run Automated Tests

```bash
# Make script executable (Linux/Mac)
chmod +x test-mock-server.sh

# Run tests
./test-mock-server.sh
```

## Stop the Server

```bash
# Press Ctrl+C in the terminal
# Or run:
docker-compose down
```

## Common Issues

### Port 5000 Already in Use?
```bash
# Use a different port
PORT=5001 docker-compose up
```

### Can't Connect?
```bash
# Check if server is running
docker ps

# Check logs
docker-compose logs -f
```

### Want to Modify Responses?
```bash
# Edit mock data files
nano mocks/mockData/evidence.json

# Restart server
docker-compose restart
```

## File Upload Example

```bash
# Create a test file
echo "Test evidence" > test.txt

# Upload it
curl -X POST http://localhost:5000/api/evidence/upload \
  -F "evidenceFile=@test.txt" \
  -F "caseId=CASE-2024-001" \
  -F "entity=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
```

## Next Steps

1. ✅ Server running? Great!
2. 📝 Import Postman collection
3. 🧪 Run automated tests
4. 🔗 Connect your frontend
5. 📚 Read full README.md for details

## All Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/` | API info |
| POST | `/api/evidence/upload` | Upload evidence |
| GET | `/api/evidence/{id}/verify` | Verify evidence |
| GET | `/api/cases` | List cases |
| POST | `/api/cases` | Create case |
| GET | `/api/cases/{id}` | Get case |
| PUT | `/api/cases/{id}` | Update case |
| DELETE | `/api/cases/{id}` | Delete case |
| POST | `/api/rl/predict` | Get prediction |
| POST | `/api/rl/feedback` | Submit feedback |
| POST | `/api/escalate` | Escalate case |

## Support

- 📖 Full documentation: `README.md`
- 📝 API spec: `openapi/openapi.yaml`
- 🧪 Tests: `test-mock-server.sh`
- 📦 Collection: `postman/postman_collection.json`

---

**Need Help?** Check `README.md` or `DELIVERY_SUMMARY.md` for detailed documentation.

