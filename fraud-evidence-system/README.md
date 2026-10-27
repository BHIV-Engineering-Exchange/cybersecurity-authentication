# 🚀 Fraud Evidence System - Production Ready

[![Production Ready](https://img.shields.io/badge/Status-Production%20Ready-brightgreen.svg)](https://github.com/yourusername/fraud-evidence-system)
[![Security](https://img.shields.io/badge/Security-Enterprise%20Grade-blue.svg)](https://github.com/yourusername/fraud-evidence-system)
[![Blockchain](https://img.shields.io/badge/Blockchain-Integrated-purple.svg)](https://github.com/yourusername/fraud-evidence-system)
[![ML/AI](https://img.shields.io/badge/ML%2FAI-Powered-orange.svg)](https://github.com/yourusername/fraud-evidence-system)

> **Enterprise-grade fraud detection and evidence management system with RBAC, blockchain integration, and ML-powered analysis**

## 🎯 Overview

The Fraud Evidence System is a comprehensive, production-ready platform designed for law enforcement agencies, financial institutions, and cybersecurity teams to detect, investigate, and manage fraud cases with blockchain-immutable evidence storage and AI-powered analysis.

### ✨ Key Features

- 🔒 **Enterprise Security**: Role-based access control (RBAC) with granular permissions
- 🔗 **Blockchain Integration**: Immutable evidence storage with real-time event processing
- 🤖 **ML/AI Powered**: Reinforcement Learning engine for intelligent fraud detection
- 📊 **Comprehensive Analytics**: Real-time dashboards and threat visualization
- 🛡️ **Audit Compliance**: Complete audit trail with 7-year retention
- 🚀 **Production Ready**: Docker deployment with health checks and monitoring

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API   │    │   Blockchain    │
│   (React)       │◄──►│   (Node.js)     │◄──►│   (Web3)        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │   MongoDB       │
                    │   + Audit Logs  │
                    └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │   Kafka         │
                    │   + Fallback    │
                    └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ 
- **MongoDB** 7.0+
- **Docker** & **Docker Compose**
- **Git**

### 1. Clone Repository

```bash
git clone https://github.com/yourusername/fraud-evidence-system.git
cd fraud-evidence-system
```

### 2. Environment Setup

```bash
# Copy environment template
cp Backend/.env.example Backend/.env

# Edit with your configuration
nano Backend/.env
```

**Required Environment Variables:**
```env
# Database
MONGO_URI=mongodb://localhost:27017/fraudDB
MONGO_ROOT_USERNAME=admin
MONGO_ROOT_PASSWORD=your-secure-password

# Authentication
JWT_SECRET=your-super-secure-jwt-secret-key
ADMIN_EMAIL=admin@fraudevidence.com
ADMIN_PASSWORD=your-secure-admin-password

# Blockchain
BLOCKCHAIN_RPC_URL=http://localhost:8080
BLOCKCHAIN_WS_URL=ws://localhost:8080
CONTRACT_ADDRESS=0x742d35Cc6634C0532925a3b8D
```

### 3. Docker Deployment (Recommended)

```bash
# Start all services
docker-compose -f docker-compose.production.yml up -d

# Check health
docker-compose -f docker-compose.production.yml ps
```

### 4. Manual Development Setup

```bash
# Backend
cd Backend
npm install
npm run dev

# Frontend (new terminal)
cd Frontend
npm install
npm start
```

### 5. Access the System

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5050
- **API Documentation**: http://localhost:5050/api-docs
- **Health Check**: http://localhost:5050/health

## 🔐 User Roles & Permissions

| Role | Evidence View | Evidence Upload | Evidence Download | Evidence Export | Case Management | Admin Access |
|------|---------------|-----------------|-------------------|-----------------|-----------------|--------------|
| **Superadmin** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Admin** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Investigator** | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **User** | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |

## 📡 API Documentation

### Authentication Endpoints

```http
POST /api/auth/login
POST /api/auth/register
GET  /api/auth/profile
```

### Evidence Management

```http
GET    /api/evidence                    # List evidence (RBAC protected)
POST   /api/evidence/upload            # Upload evidence (RBAC protected)
GET    /api/evidence/:id               # Get evidence details
GET    /api/evidence/download/:id      # Download evidence (RBAC protected)
POST   /api/evidence/verify/:id        # Verify evidence integrity
```

### Case Management

```http
GET    /api/cases                      # List cases
POST   /api/cases                      # Create case
GET    /api/cases/:id                  # Get case details
PUT    /api/cases/:id                  # Update case
POST   /api/cases/:id/report           # Generate case report
```

### RL Engine

```http
GET    /api/rl/status                  # Get RL model status
POST   /api/rl/predict                 # Make prediction
POST   /api/rl/train                   # Train model
POST   /api/rl/simulate                # Run simulation
```

### System Health

```http
GET    /health                         # Health check
GET    /api/stats                      # System statistics
GET    /api/audit/logs                 # Audit logs
```

## 🧪 Testing

### Run Tests

```bash
# All tests
npm test

# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# RBAC tests
npm run test:rbac

# Coverage report
npm run test:coverage
```

### Postman Collection

Import the provided Postman collection for comprehensive API testing:

```bash
Backend/postman/Fraud_Evidence_System_API.postman_collection.json
```

## 🔒 Security Features

### Authentication & Authorization
- **JWT-based authentication** with refresh tokens
- **Role-based access control (RBAC)** with granular permissions
- **Resource-level access control** based on sensitivity levels
- **Session management** with automatic timeout

### Data Protection
- **Password hashing** with bcrypt (12 rounds)
- **File upload validation** and size limits
- **SQL injection prevention** with parameterized queries
- **XSS protection** headers and input sanitization

### Audit & Compliance
- **Complete audit trail** for all actions
- **Blockchain-immutable logging** for critical events
- **Data retention policies** (7-year for critical, 1-year for high, 3-months for standard)
- **GDPR compliance** features

## 🛡️ Production Features

### Infrastructure Resilience
- **Kafka fallback** with local queue when Kafka is down
- **Docker health checks** for all services
- **Auto-restart** on failure with exponential backoff
- **Environment-based configuration** with no hardcoded secrets
- **Graceful error handling** with consistent API responses

### Monitoring & Observability
- **Comprehensive logging** (MongoDB + Blockchain)
- **Prometheus metrics** for performance monitoring
- **Grafana dashboards** for visualization
- **ELK stack** for log aggregation and analysis
- **Real-time alerts** for suspicious activity

### Blockchain Integration
- **Real-time WebSocket** integration with blockchain events
- **Evidence hash storage** on blockchain for immutability
- **Smart contract integration** for automated enforcement
- **Cross-chain compatibility** for multi-blockchain support

## 🚀 Deployment

### Docker Production Deployment

```bash
# Production deployment
docker-compose -f docker-compose.production.yml up -d

# Scale services
docker-compose -f docker-compose.production.yml up -d --scale backend=3

# View logs
docker-compose -f docker-compose.production.yml logs -f backend
```

### Kubernetes Deployment

```bash
# Apply configurations
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/ingress.yaml
```

### Environment Configuration

Create a `.env` file with the following variables:

```env
# Server Configuration
NODE_ENV=production
PORT=5050
HOST=0.0.0.0

# Database
MONGO_URI=mongodb://admin:password@mongodb:27017/fraudDB?authSource=admin

# Authentication
JWT_SECRET=your-super-secure-jwt-secret-key
JWT_EXPIRES_IN=24h
ADMIN_EMAIL=admin@fraudevidence.com
ADMIN_PASSWORD=your-secure-admin-password

# Kafka
KAFKA_BROKERS=kafka:9092
KAFKA_CLIENT_ID=fraud-evidence-backend
KAFKA_FALLBACK_ENABLED=true

# Blockchain
BLOCKCHAIN_RPC_URL=http://localhost:8080
BLOCKCHAIN_WS_URL=ws://localhost:8080
CONTRACT_ADDRESS=0x742d35Cc6634C0532925a3b8D
BLOCKCHAIN_API_KEY=your-blockchain-api-key

# File Storage
MAX_FILE_SIZE=52428800
S3_BUCKET=your-s3-bucket
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=your-s3-access-key
S3_SECRET_ACCESS_KEY=your-s3-secret-key

# Email
EMAIL_ENABLED=true
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Logging
LOG_LEVEL=info
LOG_FILE_ENABLED=true
```

## 📊 Monitoring

### Health Checks

- **Backend**: `GET /health`
- **Database**: MongoDB connection status
- **Kafka**: Connection and queue status
- **Blockchain**: WebSocket connection status

### Metrics & Dashboards

- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3001
- **Logs**: ELK stack at http://localhost:5601

### Alerts

- **Suspicious Activity**: Failed login attempts, repeated flagging
- **System Health**: Service down, high error rates
- **Performance**: Slow requests, high memory usage

## 🤖 ML/AI Features

### Reinforcement Learning Engine
- **Q-learning algorithm** for intelligent decision making
- **Epsilon-greedy exploration** for balanced learning
- **Real-time prediction** for fraud detection
- **Continuous learning** from user feedback

### Behavioral Analysis
- **Rapid dumping detection** for suspicious token movements
- **Large transfer analysis** for unusual transaction patterns
- **Flash loan detection** for DeFi manipulation
- **Phishing pattern recognition** for social engineering

### Risk Scoring
- **Composite risk score** (0-100) based on multiple factors
- **Geographic risk assessment** using IP geolocation
- **Historical pattern analysis** for trend detection
- **Real-time threat intelligence** integration

## 🔗 Blockchain Integration

### Smart Contract Features
- **Evidence hash storage** for immutable record keeping
- **Wallet flagging** with real-time event emission
- **Cross-chain compatibility** for multi-blockchain support
- **Automated enforcement** based on ML predictions

### Event Processing
- **Real-time WebSocket** connection to blockchain
- **Event filtering** and processing
- **Frontend notifications** for immediate updates
- **Audit trail synchronization** with blockchain

## 📚 Documentation

- **[Production Ready Guide](Backend/PRODUCTION_READY_GUIDE.md)** - Complete deployment guide
- **[API Endpoints Contract](Backend/API_ENDPOINTS_CONTRACT.md)** - Frontend integration guide
- **[RL Engine Documentation](Backend/RL_ENGINE_README.md)** - ML/AI system documentation
- **[System Architecture](Documentation/COMPLETE_SYSTEM_GUIDE.md)** - Technical architecture
- **[Evidence Library Access Control](Documentation/EVIDENCE_LIBRARY_ACCESS_CONTROL.md)** - RBAC documentation
- **[Hybrid Storage Implementation](Documentation/HYBRID_STORAGE_IMPLEMENTATION.md)** - Storage architecture

## 🛠️ Development

### Project Structure

```
fraud-evidence-system/
├── .github/workflows/          # CI/CD pipeline
├── Backend/                    # Node.js backend
│   ├── config/                 # Configuration files
│   ├── middleware/             # Express middleware
│   ├── models/                 # MongoDB schemas
│   ├── routes/                 # API routes
│   ├── services/               # Business logic
│   ├── tests/                  # Test files
│   └── utils/                  # Utility functions
├── Frontend/                   # React frontend
│   ├── src/components/         # React components
│   ├── src/pages/              # Page components
│   └── src/utils/              # Frontend utilities
├── Documentation/              # System documentation
└── docker-compose.production.yml
```

### Contributing

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit changes**: `git commit -m 'Add amazing feature'`
4. **Push to branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

### Code Standards

- **ESLint** for code quality
- **Prettier** for code formatting
- **Jest** for testing
- **Conventional Commits** for commit messages

## 🔧 Troubleshooting

### Common Issues

1. **MongoDB Connection Failed**
   ```bash
   # Check MongoDB service
   docker-compose logs mongodb
   
   # Verify connection string
   echo $MONGO_URI
   ```

2. **Kafka Connection Issues**
   ```bash
   # Check Kafka service
   docker-compose logs kafka
   
   # Verify brokers configuration
   echo $KAFKA_BROKERS
   ```

3. **Blockchain Sync Failed**
   ```bash
   # Check blockchain service
   docker-compose logs blockchain
   
   # Verify WebSocket connection
   curl -f $BLOCKCHAIN_WS_URL
   ```

4. **RBAC Permission Denied**
   ```bash
   # Check user permissions
   curl -H "Authorization: Bearer $TOKEN" /api/auth/profile
   
   # Review audit logs
   curl -H "Authorization: Bearer $TOKEN" /api/audit/logs
   ```

### Support

- **Documentation**: Check the guides in the `Documentation/` folder
- **Issues**: Create an issue on GitHub
- **Discussions**: Use GitHub Discussions for questions
- **Security**: Report security issues privately

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Blockchain Team**: Smart contract development and integration
- **ML/AI Team**: Reinforcement learning engine and fraud detection
- **DevOps Team**: Infrastructure and deployment automation
- **Security Team**: RBAC implementation and audit compliance

---

**🚀 The Fraud Evidence System is production-ready with enterprise-grade security, resilience, and monitoring capabilities. Ready for deployment!**
