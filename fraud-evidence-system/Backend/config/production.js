// Production configuration with environment-based secrets
require('dotenv').config();

const productionConfig = {
  // Database configuration
  database: {
    uri: process.env.MONGO_URI || 'mongodb://localhost:27017/fraudDB',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      bufferMaxEntries: 0,
      bufferCommands: false
    }
  },

  // JWT configuration
  jwt: {
    secret: process.env.JWT_SECRET || (() => {
      throw new Error('JWT_SECRET environment variable is required');
    })(),
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
  },

  // Admin user configuration (environment-based)
  admin: {
    email: process.env.ADMIN_EMAIL || (() => {
      throw new Error('ADMIN_EMAIL environment variable is required');
    })(),
    password: process.env.ADMIN_PASSWORD || (() => {
      throw new Error('ADMIN_PASSWORD environment variable is required');
    })(),
    role: 'superadmin'
  },

  // Server configuration
  server: {
    port: process.env.PORT || 5050,
    host: process.env.HOST || '0.0.0.0',
    env: process.env.NODE_ENV || 'development'
  },

  // Kafka configuration with fallback
  kafka: {
    clientId: process.env.KAFKA_CLIENT_ID || 'fraud-evidence-system',
    brokers: process.env.KAFKA_BROKERS ? process.env.KAFKA_BROKERS.split(',') : ['localhost:9092'],
    topics: {
      fraudReports: process.env.KAFKA_TOPIC_FRAUD_REPORTS || 'fraud-reports',
      evidenceUploads: process.env.KAFKA_TOPIC_EVIDENCE_UPLOADS || 'evidence-uploads',
      auditLogs: process.env.KAFKA_TOPIC_AUDIT_LOGS || 'audit-logs'
    },
    fallback: {
      enabled: process.env.KAFKA_FALLBACK_ENABLED === 'true',
      queueSize: parseInt(process.env.KAFKA_FALLBACK_QUEUE_SIZE) || 1000,
      retryInterval: parseInt(process.env.KAFKA_FALLBACK_RETRY_INTERVAL) || 30000
    }
  },

  // Blockchain configuration
  blockchain: {
    rpcUrl: process.env.BLOCKCHAIN_RPC_URL || 'http://localhost:8080',
    wsUrl: process.env.BLOCKCHAIN_WS_URL || 'ws://localhost:8080',
    contractAddress: process.env.CONTRACT_ADDRESS || '0x742d35Cc6634C0532925a3b8D',
    apiKey: process.env.BLOCKCHAIN_API_KEY,
    syncEnabled: process.env.BLOCKCHAIN_SYNC_ENABLED === 'true',
    retryAttempts: parseInt(process.env.BLOCKCHAIN_RETRY_ATTEMPTS) || 3,
    timeout: parseInt(process.env.BLOCKCHAIN_TIMEOUT) || 30000
  },

  // File storage configuration
  storage: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 50 * 1024 * 1024, // 50MB
    allowedTypes: process.env.ALLOWED_FILE_TYPES ? 
      process.env.ALLOWED_FILE_TYPES.split(',') : 
      ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx', 'txt'],
    s3: {
      bucket: process.env.S3_BUCKET,
      region: process.env.S3_REGION || 'us-east-1',
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY
    },
    ipfs: {
      host: process.env.IPFS_HOST || 'localhost',
      port: parseInt(process.env.IPFS_PORT) || 5001,
      protocol: process.env.IPFS_PROTOCOL || 'http'
    }
  },

  // Rate limiting configuration
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
    skipSuccessfulRequests: process.env.RATE_LIMIT_SKIP_SUCCESS === 'true'
  },

  // Security configuration
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS) || 12,
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    helmet: {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"]
        }
      }
    }
  },

  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'combined',
    file: {
      enabled: process.env.LOG_FILE_ENABLED === 'true',
      path: process.env.LOG_FILE_PATH || './logs/app.log',
      maxSize: process.env.LOG_FILE_MAX_SIZE || '10m',
      maxFiles: parseInt(process.env.LOG_FILE_MAX_FILES) || 5
    }
  },

  // Monitoring configuration
  monitoring: {
    healthCheck: {
      enabled: process.env.HEALTH_CHECK_ENABLED === 'true',
      interval: parseInt(process.env.HEALTH_CHECK_INTERVAL) || 30000
    },
    metrics: {
      enabled: process.env.METRICS_ENABLED === 'true',
      port: parseInt(process.env.METRICS_PORT) || 9090
    }
  },

  // Email configuration
  email: {
    enabled: process.env.EMAIL_ENABLED === 'true',
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    from: process.env.EMAIL_FROM || 'noreply@fraudevidence.com'
  },

  // RL Engine configuration
  rl: {
    modelPath: process.env.RL_MODEL_PATH || './storage/rl_models',
    logPath: process.env.RL_LOG_PATH || './storage/rl_logs',
    learningRate: parseFloat(process.env.RL_LEARNING_RATE) || 0.1,
    epsilon: parseFloat(process.env.RL_EPSILON) || 0.3,
    epsilonDecay: parseFloat(process.env.RL_EPSILON_DECAY) || 0.995,
    minEpsilon: parseFloat(process.env.RL_MIN_EPSILON) || 0.1
  },

  // Feature flags
  features: {
    rlEngine: process.env.FEATURE_RL_ENGINE === 'true',
    blockchainSync: process.env.FEATURE_BLOCKCHAIN_SYNC === 'true',
    emailAlerts: process.env.FEATURE_EMAIL_ALERTS === 'true',
    advancedAnalytics: process.env.FEATURE_ADVANCED_ANALYTICS === 'true'
  }
};

// Validation function
const validateConfig = () => {
  const required = [
    'JWT_SECRET',
    'ADMIN_EMAIL',
    'ADMIN_PASSWORD'
  ];

  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(productionConfig.admin.email)) {
    throw new Error('ADMIN_EMAIL must be a valid email address');
  }

  // Validate password strength
  if (productionConfig.admin.password.length < 8) {
    throw new Error('ADMIN_PASSWORD must be at least 8 characters long');
  }

  console.log('✅ Configuration validation passed');
};

// Initialize configuration
validateConfig();

module.exports = productionConfig;
