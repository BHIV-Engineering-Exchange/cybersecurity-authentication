// Swagger/OpenAPI configuration for production
const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Fraud Evidence System API',
      version: '1.0.0',
      description: 'Production-ready fraud detection and evidence management system with RBAC, blockchain integration, and ML-powered analysis',
      contact: {
        name: 'API Support',
        email: 'support@fraudevidence.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: process.env.API_BASE_URL || 'http://localhost:5050',
        description: 'Development server'
      },
      {
        url: 'https://api.fraudevidence.com',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token for authentication'
        },
        apiKey: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'API key for service-to-service communication'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'boolean',
              example: true
            },
            code: {
              type: 'integer',
              example: 400
            },
            message: {
              type: 'string',
              example: 'Validation Error'
            },
            details: {
              type: 'object',
              description: 'Additional error details'
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T10:30:00.000Z'
            },
            path: {
              type: 'string',
              example: '/api/evidence'
            },
            method: {
              type: 'string',
              example: 'POST'
            },
            requestId: {
              type: 'string',
              example: 'req_1705312200000_abc123def'
            }
          },
          required: ['error', 'code', 'message', 'timestamp']
        },
        User: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              example: '507f1f77bcf86cd799439011'
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'investigator@example.com'
            },
            role: {
              type: 'string',
              enum: ['superadmin', 'admin', 'investigator', 'user'],
              example: 'investigator'
            },
            permissions: {
              type: 'object',
              properties: {
                evidenceView: { type: 'boolean' },
                evidenceUpload: { type: 'boolean' },
                evidenceDownload: { type: 'boolean' },
                evidenceExport: { type: 'boolean' },
                caseManagement: { type: 'boolean' },
                adminAccess: { type: 'boolean' }
              }
            },
            accessLevel: {
              type: 'string',
              enum: ['restricted', 'standard', 'elevated', 'full'],
              example: 'standard'
            },
            isActive: {
              type: 'boolean',
              example: true
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        Evidence: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              example: '507f1f77bcf86cd799439011'
            },
            caseId: {
              type: 'string',
              example: 'CASE-2024-001'
            },
            entity: {
              type: 'string',
              example: '0x742d35Cc6634C0532925a3b8D'
            },
            filename: {
              type: 'string',
              example: 'evidence_document.pdf'
            },
            originalFilename: {
              type: 'string',
              example: 'suspicious_transaction.pdf'
            },
            fileSize: {
              type: 'integer',
              example: 1024000
            },
            fileType: {
              type: 'string',
              example: 'application/pdf'
            },
            fileHash: {
              type: 'string',
              example: 'sha256:abc123def456...'
            },
            riskLevel: {
              type: 'string',
              enum: ['low', 'medium', 'high', 'critical'],
              example: 'high'
            },
            verificationStatus: {
              type: 'string',
              enum: ['pending', 'verified', 'failed'],
              example: 'verified'
            },
            uploadedBy: {
              type: 'string',
              example: 'investigator@example.com'
            },
            blockchainTxHash: {
              type: 'string',
              example: '0x1234567890abcdef...'
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              example: ['phishing', 'suspicious']
            },
            uploadedAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        Case: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              example: '507f1f77bcf86cd799439011'
            },
            caseId: {
              type: 'string',
              example: 'CASE-2024-001'
            },
            title: {
              type: 'string',
              example: 'Suspicious Wallet Activity'
            },
            description: {
              type: 'string',
              example: 'Investigation into rapid token dumping patterns'
            },
            status: {
              type: 'string',
              enum: ['open', 'investigating', 'escalated', 'closed'],
              example: 'investigating'
            },
            priority: {
              type: 'string',
              enum: ['low', 'medium', 'high', 'critical'],
              example: 'high'
            },
            assignedTo: {
              type: 'string',
              example: 'investigator@example.com'
            },
            evidenceCount: {
              type: 'integer',
              example: 5
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        AuditLog: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              example: '507f1f77bcf86cd799439011'
            },
            userId: {
              type: 'string',
              example: '507f1f77bcf86cd799439011'
            },
            userEmail: {
              type: 'string',
              example: 'investigator@example.com'
            },
            userRole: {
              type: 'string',
              enum: ['superadmin', 'admin', 'investigator', 'user'],
              example: 'investigator'
            },
            action: {
              type: 'string',
              example: 'evidence_download'
            },
            resource: {
              type: 'string',
              example: '/api/evidence/507f1f77bcf86cd799439011'
            },
            resourceType: {
              type: 'string',
              enum: ['evidence', 'case', 'user', 'system', 'report', 'rl', 'blockchain'],
              example: 'evidence'
            },
            method: {
              type: 'string',
              enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
              example: 'GET'
            },
            ip: {
              type: 'string',
              example: '192.168.1.100'
            },
            success: {
              type: 'boolean',
              example: true
            },
            statusCode: {
              type: 'integer',
              example: 200
            },
            auditLevel: {
              type: 'string',
              enum: ['standard', 'high', 'critical'],
              example: 'standard'
            },
            blockchainSynced: {
              type: 'boolean',
              example: true
            },
            timestamp: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        RLPrediction: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            action: {
              type: 'integer',
              example: 2
            },
            actionName: {
              type: 'string',
              example: 'investigate'
            },
            confidence: {
              type: 'number',
              example: 0.85
            },
            exploration: {
              type: 'boolean',
              example: false
            },
            state: {
              type: 'array',
              items: { type: 'number' },
              example: [0.75, 0.3, 0.1, 0.8]
            },
            modelInfo: {
              type: 'object',
              properties: {
                episodes: { type: 'integer' },
                totalReward: { type: 'number' },
                epsilon: { type: 'number' }
              }
            }
          }
        }
      },
      responses: {
        UnauthorizedError: {
          description: 'Authentication required',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                error: true,
                code: 401,
                message: 'Authentication required',
                timestamp: '2024-01-15T10:30:00.000Z'
              }
            }
          }
        },
        ForbiddenError: {
          description: 'Insufficient permissions',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                error: true,
                code: 403,
                message: 'Insufficient permissions',
                details: {
                  requiredPermissions: ['evidence.download'],
                  userRole: 'user',
                  allowedRoles: ['investigator', 'admin', 'superadmin']
                },
                timestamp: '2024-01-15T10:30:00.000Z'
              }
            }
          }
        },
        NotFoundError: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                error: true,
                code: 404,
                message: 'Resource not found',
                timestamp: '2024-01-15T10:30:00.000Z'
              }
            }
          }
        },
        ValidationError: {
          description: 'Validation error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                error: true,
                code: 400,
                message: 'Validation Error',
                details: {
                  email: {
                    message: 'Email is required',
                    value: '',
                    type: 'required'
                  }
                },
                timestamp: '2024-01-15T10:30:00.000Z'
              }
            }
          }
        },
        RateLimitError: {
          description: 'Too many requests',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                error: true,
                code: 429,
                message: 'Too many requests',
                details: {
                  limit: 100,
                  remaining: 0,
                  resetTime: '2024-01-15T11:00:00.000Z'
                },
                timestamp: '2024-01-15T10:30:00.000Z'
              }
            }
          }
        },
        InternalServerError: {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                error: true,
                code: 500,
                message: 'Internal server error',
                timestamp: '2024-01-15T10:30:00.000Z'
              }
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ],
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and authorization'
      },
      {
        name: 'Evidence',
        description: 'Evidence management and operations'
      },
      {
        name: 'Cases',
        description: 'Case management and investigation'
      },
      {
        name: 'Users',
        description: 'User management and RBAC'
      },
      {
        name: 'Reports',
        description: 'Report generation and analytics'
      },
      {
        name: 'RL Engine',
        description: 'Reinforcement Learning engine operations'
      },
      {
        name: 'Blockchain',
        description: 'Blockchain integration and verification'
      },
      {
        name: 'Audit',
        description: 'Audit logs and compliance'
      },
      {
        name: 'System',
        description: 'System monitoring and health'
      }
    ]
  },
  apis: [
    './routes/*.js',
    './controllers/*.js',
    './models/*.js'
  ]
};

const specs = swaggerJSDoc(options);

module.exports = {
  specs,
  swaggerUi,
  swaggerOptions: {
    explorer: true,
    swaggerOptions: {
      docExpansion: 'none',
      filter: true,
      showRequestHeaders: true,
      showCommonExtensions: true,
      tryItOutEnabled: true
    }
  }
};
