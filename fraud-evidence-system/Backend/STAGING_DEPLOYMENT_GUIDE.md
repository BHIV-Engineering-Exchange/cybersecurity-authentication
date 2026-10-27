# Staging Deployment Guide

## 🎯 Goal

Deploy and verify the complete Fraud Evidence System to staging environment.

## 📋 Pre-Deployment Checklist

- [ ] MongoDB staging instance ready
- [ ] Environment variables configured
- [ ] Docker installed on staging server
- [ ] Domain/subdomain configured (staging.fraud-evidence.com)
- [ ] SSL certificates ready
- [ ] Backup strategy in place

## 🚀 Deployment Steps

### Step 1: Prepare Environment

```bash
# On staging server
ssh user@staging-server

# Create application directory
mkdir -p /opt/fraud-evidence
cd /opt/fraud-evidence

# Clone repository
git clone <your-repo-url> .
git checkout main

# Create environment file
nano .env
```

**Required Environment Variables:**

```env
# Server Configuration
NODE_ENV=staging
PORT=5050
HOST=0.0.0.0

# Database
MONGODB_URI=mongodb://staging-mongo:27017/fraud_evidence_staging

# Storage
AWS_ACCESS_KEY_ID=<staging-access-key>
AWS_SECRET_ACCESS_KEY=<staging-secret-key>
AWS_S3_BUCKET=fraud-evidence-staging
AWS_REGION=us-east-1

# IPFS
IPFS_HOST=staging-ipfs
IPFS_PORT=5001

# Blockchain
ETHEREUM_RPC_URL=https://sepolia.infura.io/v3/<your-key>
PRIVATE_KEY=<staging-private-key>
CONTRACT_ADDRESS=<testnet-contract-address>

# BHIV Core Services
CORE_EVENTS_API_URL=http://localhost:8004
WEBHOOKS_API_URL=http://localhost:8005

# Kafka (optional)
KAFKA_ENABLED=true
KAFKA_BROKER=staging-kafka:9092

# Security
JWT_SECRET=<staging-jwt-secret-min-32-chars>
CORS_ORIGIN=https://staging-frontend.fraud-evidence.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
```

### Step 2: Deploy with Docker Compose

Create `docker-compose.staging.yml`:

```yaml
version: '3.8'

services:
  # MongoDB
  mongodb:
    image: mongo:7
    container_name: fraud-mongodb-staging
    ports:
      - "27017:27017"
    volumes:
      - mongodb-data:/data/db
    environment:
      - MONGO_INITDB_DATABASE=fraud_evidence_staging
    restart: unless-stopped
    networks:
      - fraud-network

  # Backend API
  backend:
    build:
      context: ./Backend
      dockerfile: Dockerfile
    container_name: fraud-backend-staging
    ports:
      - "5050:5050"
    environment:
      - NODE_ENV=staging
    env_file:
      - .env
    volumes:
      - ./Backend/storage:/app/storage
      - ./Backend/logs:/app/logs
    depends_on:
      - mongodb
    restart: unless-stopped
    networks:
      - fraud-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5050/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  # IPFS Node
  ipfs:
    image: ipfs/kubo:latest
    container_name: fraud-ipfs-staging
    ports:
      - "4001:4001"
      - "5001:5001"
      - "8080:8080"
    volumes:
      - ipfs-data:/data/ipfs
    restart: unless-stopped
    networks:
      - fraud-network

  # Kafka (optional)
  kafka:
    image: confluentinc/cp-kafka:latest
    container_name: fraud-kafka-staging
    ports:
      - "9092:9092"
    environment:
      - KAFKA_ADVERTISED_LISTENERS=PLAINTEXT://kafka:9092
      - KAFKA_ZOOKEEPER_CONNECT=zookeeper:2181
    depends_on:
      - zookeeper
    restart: unless-stopped
    networks:
      - fraud-network

  zookeeper:
    image: confluentinc/cp-zookeeper:latest
    container_name: fraud-zookeeper-staging
    ports:
      - "2181:2181"
    environment:
      - ZOOKEEPER_CLIENT_PORT=2181
    restart: unless-stopped
    networks:
      - fraud-network

  # Nginx Reverse Proxy
  nginx:
    image: nginx:alpine
    container_name: fraud-nginx-staging
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/nginx/ssl
    depends_on:
      - backend
    restart: unless-stopped
    networks:
      - fraud-network

volumes:
  mongodb-data:
  ipfs-data:

networks:
  fraud-network:
    driver: bridge
```

Deploy:

```bash
# Build and start services
docker-compose -f docker-compose.staging.yml up -d

# Check services are running
docker-compose -f docker-compose.staging.yml ps

# View logs
docker-compose -f docker-compose.staging.yml logs -f backend
```

### Step 3: Verify Deployment

Create `Backend/scripts/verify-staging.sh`:

```bash
#!/bin/bash

# Staging Deployment Verification Script

STAGING_URL="https://staging.fraud-evidence.com"
API_URL="${STAGING_URL}/api"

echo "🔍 Verifying Staging Deployment..."
echo "=================================="

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Function to test endpoint
test_endpoint() {
  local name=$1
  local url=$2
  local expected_status=$3
  local method=${4:-GET}
  
  echo -n "Testing $name... "
  
  response=$(curl -s -w "\n%{http_code}" -X $method "$url")
  status=$(echo "$response" | tail -n1)
  
  if [ "$status" == "$expected_status" ]; then
    echo -e "${GREEN}✓ PASS${NC} (HTTP $status)"
    ((TESTS_PASSED++))
  else
    echo -e "${RED}✗ FAIL${NC} (Expected $expected_status, got $status)"
    ((TESTS_FAILED++))
  fi
}

# Test 1: Health Check
test_endpoint "Health Check" "$STAGING_URL/health" "200"

# Test 2: BHIV Core Health
test_endpoint "BHIV Core Health" "$API_URL/core/health" "200"

# Test 3: BHIV Webhooks Health
test_endpoint "BHIV Webhooks Health" "$API_URL/core-webhooks/health" "200"

# Test 4: Evidence Stats (with auth)
test_endpoint "Evidence Stats" "$API_URL/evidence/stats" "200"

# Test 5: RL Stats (with auth)
test_endpoint "RL Stats" "$API_URL/rl/stats" "200"

# Test 6: Queue Stats (with auth)
test_endpoint "Queue Stats" "$API_URL/queue/stats" "200"

# Test 7: Unauthorized Access (should fail)
test_endpoint "Unauthorized Access Check" "$API_URL/admin/audit" "401"

# Test 8: Database Connection
echo -n "Testing Database Connection... "
if docker exec fraud-mongodb-staging mongo --eval "db.adminCommand('ping')" > /dev/null 2>&1; then
  echo -e "${GREEN}✓ PASS${NC}"
  ((TESTS_PASSED++))
else
  echo -e "${RED}✗ FAIL${NC}"
  ((TESTS_FAILED++))
fi

# Test 9: IPFS Connection
echo -n "Testing IPFS Connection... "
if curl -s http://localhost:5001/api/v0/version > /dev/null; then
  echo -e "${GREEN}✓ PASS${NC}"
  ((TESTS_PASSED++))
else
  echo -e "${RED}✗ FAIL${NC}"
  ((TESTS_FAILED++))
fi

# Test 10: Docker Containers
echo -n "Testing Docker Containers... "
if docker-compose -f docker-compose.staging.yml ps | grep -q "Up"; then
  echo -e "${GREEN}✓ PASS${NC}"
  ((TESTS_PASSED++))
else
  echo -e "${RED}✗ FAIL${NC}"
  ((TESTS_FAILED++))
fi

echo ""
echo "=================================="
echo "Verification Results:"
echo -e "Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Failed: ${RED}$TESTS_FAILED${NC}"
echo "Total: $((TESTS_PASSED + TESTS_FAILED))"
echo "=================================="

if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "${GREEN}✓ All tests passed! Staging deployment successful.${NC}"
  exit 0
else
  echo -e "${RED}✗ Some tests failed. Please review the deployment.${NC}"
  exit 1
fi
```

Run verification:

```bash
chmod +x Backend/scripts/verify-staging.sh
./Backend/scripts/verify-staging.sh
```

### Step 4: Run E2E Tests

```bash
# Install Newman (Postman CLI)
npm install -g newman

# Run Postman collection against staging
newman run Backend/postman/postman_collection.json \
  --environment Backend/postman/staging_environment.json \
  --reporters cli,html \
  --reporter-html-export Backend/test-reports/staging-report.html

# Check results
cat Backend/test-reports/staging-report.html
```

### Step 5: Performance Testing

```bash
# Install Apache Bench
# Ubuntu: sudo apt-get install apache2-utils
# Mac: (already installed)

# Test health endpoint
ab -n 1000 -c 10 https://staging.fraud-evidence.com/health

# Expected:
# - 100% success rate
# - < 100ms average response time
# - No failed requests
```

## 🔒 Security Configuration

### SSL/TLS Setup

Create `nginx/nginx.conf`:

```nginx
upstream backend {
    server backend:5050;
}

server {
    listen 80;
    server_name staging.fraud-evidence.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name staging.fraud-evidence.com;

    # SSL Configuration
    ssl_certificate /etc/nginx/ssl/staging.crt;
    ssl_certificate_key /etc/nginx/ssl/staging.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    limit_req zone=api_limit burst=20 nodelay;

    # Proxy to backend
    location / {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health check endpoint (no rate limit)
    location /health {
        proxy_pass http://backend;
        limit_req off;
    }
}
```

## 📊 Monitoring Setup

```bash
# Start monitoring stack
cd Backend/monitoring
docker-compose -f docker-compose.monitoring.yml up -d

# Access Grafana
# URL: https://staging.fraud-evidence.com:3000
# User: admin
# Pass: admin123
```

## 🗄️ Database Migration

```bash
# Backup production data (if migrating)
mongodump --uri="mongodb://localhost:27017/fraud_evidence" --out=/backup

# Restore to staging
mongorestore --uri="mongodb://staging-mongo:27017/fraud_evidence_staging" /backup/fraud_evidence

# Verify data
docker exec fraud-mongodb-staging mongo fraud_evidence_staging --eval "db.evidences.count()"
```

## 🔍 Troubleshooting

### Backend won't start

```bash
# Check logs
docker logs fraud-backend-staging

# Common issues:
# 1. MongoDB connection - verify MONGODB_URI
# 2. Port conflict - check if 5050 is available
# 3. Environment variables - verify .env file
```

### Can't connect to database

```bash
# Test MongoDB connection
docker exec fraud-mongodb-staging mongo --eval "db.adminCommand('ping')"

# Check network
docker network ls
docker network inspect fraud-network
```

### IPFS not responding

```bash
# Restart IPFS
docker-compose -f docker-compose.staging.yml restart ipfs

# Check IPFS logs
docker logs fraud-ipfs-staging

# Test IPFS API
curl http://localhost:5001/api/v0/version
```

## 📝 Post-Deployment Checklist

- [ ] All health checks passing
- [ ] E2E tests passing
- [ ] Performance tests acceptable
- [ ] SSL/TLS configured and working
- [ ] Monitoring dashboards accessible
- [ ] Backup strategy tested
- [ ] Log rotation configured
- [ ] Team access configured
- [ ] Documentation updated with staging URLs
- [ ] Rollback procedure documented

## 🔄 Rollback Procedure

If deployment fails:

```bash
# Stop new services
docker-compose -f docker-compose.staging.yml down

# Restore from backup
mongorestore --uri="mongodb://staging-mongo:27017/fraud_evidence_staging" /backup/previous

# Checkout previous version
git checkout <previous-commit>

# Redeploy
docker-compose -f docker-compose.staging.yml up -d

# Verify
./Backend/scripts/verify-staging.sh
```

## 📞 Support Contacts

- **Infrastructure Issues:** DevOps Team
- **Application Issues:** Yashika (Backend Lead)
- **BHIV Core Issues:** Nisarg
- **Database Issues:** DBA Team

---

**Deployment Time:** 2 hours  
**Verification Time:** 30 minutes  
**Total:** 2.5 hours  
**Status:** Ready for staging deployment

