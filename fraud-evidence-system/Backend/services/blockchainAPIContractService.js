// Blockchain Team API Contract Alignment Service
// Integration service for evidence metadata schemas and audit log sync

const axios = require('axios');
const APILogger = require('./apiLogger');

class BlockchainAPIContractService {
  constructor() {
    this.blockchainEndpoint = process.env.BLOCKCHAIN_API_ENDPOINT || 'http://localhost:8080/api/blockchain';
    this.apiLogger = new APILogger();
    this.eventListenerEndpoints = {
      evidenceUpload: '/evidence/uploaded',
      evidenceVerification: '/evidence/verified', 
      accessLog: '/access/logged',
      auditTrail: '/audit/created'
    };
    
    // Evidence metadata schema alignment
    this.evidenceMetadataSchema = {
      caseId: { type: 'string', required: true },
      evidenceId: { type: 'string', required: true },
      fileHash: { type: 'string', required: true },
      ipfsHash: { type: 'string', required: false },
      uploadedBy: { type: 'string', required: true },
      uploadedAt: { type: 'timestamp', required: true },
      verificationStatus: { type: 'enum', values: ['pending', 'verified', 'failed'] },
      riskLevel: { type: 'enum', values: ['low', 'medium', 'high', 'critical'] },
      entity: { type: 'string', required: true },
      blockchainTxHash: { type: 'string', required: false }
    };

    // Audit log schema alignment  
    this.auditLogSchema = {
      action: { type: 'string', required: true },
      user: { type: 'string', required: true },
      role: { type: 'string', required: true },
      timestamp: { type: 'timestamp', required: true },
      resourceId: { type: 'string', required: true },
      resourceType: { type: 'enum', values: ['evidence', 'case', 'user', 'export'] },
      ip: { type: 'string', required: true },
      userAgent: { type: 'string', required: false },
      success: { type: 'boolean', required: true },
      errorMessage: { type: 'string', required: false }
    };
  }

  /**
   * Validate evidence metadata against blockchain schema
   */
  validateEvidenceMetadata(evidenceData) {
    const errors = [];
    const warnings = [];

    for (const [field, rules] of Object.entries(this.evidenceMetadataSchema)) {
      const value = evidenceData[field];

      // Check required fields
      if (rules.required && (value === undefined || value === null || value === '')) {
        errors.push(`Required field '${field}' is missing or empty`);
        continue;
      }

      // Skip validation if field is not present and not required
      if (value === undefined || value === null) {
        continue;
      }

      // Type validation
      switch (rules.type) {
        case 'string':
          if (typeof value !== 'string') {
            errors.push(`Field '${field}' must be a string, got ${typeof value}`);
          }
          break;
        case 'timestamp':
          if (!(value instanceof Date) && isNaN(new Date(value).getTime())) {
            errors.push(`Field '${field}' must be a valid timestamp`);
          }
          break;
        case 'enum':
          if (!rules.values.includes(value)) {
            errors.push(`Field '${field}' must be one of: ${rules.values.join(', ')}`);
          }
          break;
        case 'boolean':
          if (typeof value !== 'boolean') {
            errors.push(`Field '${field}' must be a boolean`);
          }
          break;
      }
    }

    // Additional validation rules
    if (evidenceData.fileHash && evidenceData.fileHash.length !== 64) {
      warnings.push('fileHash should be 64 characters (SHA-256)');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Sync evidence metadata to blockchain
   */
  async syncEvidenceToBlockchain(evidenceData) {
    try {
      console.log('🔗 Syncing evidence to blockchain...');
      this.apiLogger.writeLog(`[BLOCKCHAIN_SYNC] Evidence sync started for ${evidenceData.evidenceId}\n`);

      // Validate metadata before sync
      const validation = this.validateEvidenceMetadata(evidenceData);
      if (!validation.isValid) {
        throw new Error(`Metadata validation failed: ${validation.errors.join(', ')}`);
      }

      if (validation.warnings.length > 0) {
        console.warn('⚠️ Metadata warnings:', validation.warnings);
      }

      // Prepare blockchain payload
      const blockchainPayload = {
        evidenceId: evidenceData.evidenceId,
        caseId: evidenceData.caseId,
        fileHash: evidenceData.fileHash,
        ipfsHash: evidenceData.ipfsHash,
        metadata: {
          uploadedBy: evidenceData.uploadedBy,
          uploadedAt: evidenceData.uploadedAt,
          verificationStatus: evidenceData.verificationStatus,
          riskLevel: evidenceData.riskLevel,
          entity: evidenceData.entity
        },
        timestamp: new Date().toISOString()
      };

      // Send to blockchain API
      const response = await axios.post(
        `${this.blockchainEndpoint}${this.eventListenerEndpoints.evidenceUpload}`,
        blockchainPayload,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.BLOCKCHAIN_API_KEY}`,
            'X-Service': 'fraud-evidence-system'
          },
          timeout: 30000
        }
      );

      const result = {
        success: true,
        blockchainTxHash: response.data.transactionHash,
        blockNumber: response.data.blockNumber,
        gasUsed: response.data.gasUsed,
        timestamp: new Date().toISOString()
      };

      this.apiLogger.writeLog(`[BLOCKCHAIN_SYNC] Evidence sync successful: ${JSON.stringify(result)}\n`);
      console.log('✅ Evidence synced to blockchain:', result.blockchainTxHash);

      return result;

    } catch (error) {
      const errorResult = {
        success: false,
        error: error.message,
        code: error.code || 'BLOCKCHAIN_SYNC_ERROR',
        timestamp: new Date().toISOString()
      };

      this.apiLogger.writeLog(`[BLOCKCHAIN_SYNC] Evidence sync failed: ${JSON.stringify(errorResult)}\n`);
      console.error('❌ Blockchain sync failed:', error.message);

      return errorResult;
    }
  }

  /**
   * Sync audit log to blockchain
   */
  async syncAuditLogToBlockchain(auditData) {
    try {
      console.log('📋 Syncing audit log to blockchain...');
      this.apiLogger.writeLog(`[BLOCKCHAIN_AUDIT] Audit sync started for ${auditData.action}\n`);

      // Validate audit data
      const validation = this.validateAuditLog(auditData);
      if (!validation.isValid) {
        throw new Error(`Audit validation failed: ${validation.errors.join(', ')}`);
      }

      // Prepare blockchain audit payload
      const auditPayload = {
        action: auditData.action,
        user: auditData.user,
        role: auditData.role,
        resourceId: auditData.resourceId,
        resourceType: auditData.resourceType,
        timestamp: auditData.timestamp,
        ip: auditData.ip,
        userAgent: auditData.userAgent,
        success: auditData.success,
        errorMessage: auditData.errorMessage,
        hash: this.generateAuditHash(auditData)
      };

      // Send to blockchain audit endpoint
      const response = await axios.post(
        `${this.blockchainEndpoint}${this.eventListenerEndpoints.auditTrail}`,
        auditPayload,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.BLOCKCHAIN_API_KEY}`,
            'X-Service': 'fraud-evidence-system'
          },
          timeout: 15000
        }
      );

      const result = {
        success: true,
        auditTxHash: response.data.transactionHash,
        blockNumber: response.data.blockNumber,
        timestamp: new Date().toISOString()
      };

      this.apiLogger.writeLog(`[BLOCKCHAIN_AUDIT] Audit sync successful: ${JSON.stringify(result)}\n`);
      console.log('✅ Audit log synced to blockchain:', result.auditTxHash);

      return result;

    } catch (error) {
      const errorResult = {
        success: false,
        error: error.message,
        code: error.code || 'BLOCKCHAIN_AUDIT_ERROR',
        timestamp: new Date().toISOString()
      };

      this.apiLogger.writeLog(`[BLOCKCHAIN_AUDIT] Audit sync failed: ${JSON.stringify(errorResult)}\n`);
      console.error('❌ Blockchain audit sync failed:', error.message);

      return errorResult;
    }
  }

  /**
   * Validate audit log data
   */
  validateAuditLog(auditData) {
    const errors = [];

    for (const [field, rules] of Object.entries(this.auditLogSchema)) {
      const value = auditData[field];

      if (rules.required && (value === undefined || value === null || value === '')) {
        errors.push(`Required audit field '${field}' is missing`);
        continue;
      }

      if (value === undefined || value === null) {
        continue;
      }

      // Type and enum validation
      switch (rules.type) {
        case 'string':
          if (typeof value !== 'string') {
            errors.push(`Audit field '${field}' must be a string`);
          }
          break;
        case 'boolean':
          if (typeof value !== 'boolean') {
            errors.push(`Audit field '${field}' must be a boolean`);
          }
          break;
        case 'enum':
          if (!rules.values.includes(value)) {
            errors.push(`Audit field '${field}' must be one of: ${rules.values.join(', ')}`);
          }
          break;
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Generate audit hash for integrity
   */
  generateAuditHash(auditData) {
    const crypto = require('crypto');
    const hashString = `${auditData.action}|${auditData.user}|${auditData.timestamp}|${auditData.resourceId}`;
    return crypto.createHash('sha256').update(hashString).digest('hex');
  }

  /**
   * Check blockchain API health
   */
  async checkBlockchainAPIHealth() {
    try {
      const response = await axios.get(
        `${this.blockchainEndpoint}/health`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.BLOCKCHAIN_API_KEY}`
          },
          timeout: 10000
        }
      );

      return {
        healthy: response.status === 200,
        responseTime: response.headers['x-response-time'] || 'unknown',
        version: response.data.version || 'unknown',
        network: response.data.network || 'unknown',
        lastBlock: response.data.lastBlock || 'unknown'
      };

    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        code: error.code || 'HEALTH_CHECK_ERROR'
      };
    }
  }

  /**
   * Get event listener status
   */
  async getEventListenerStatus() {
    try {
      const response = await axios.get(
        `${this.blockchainEndpoint}/listeners/status`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.BLOCKCHAIN_API_KEY}`
          },
          timeout: 10000
        }
      );

      return {
        success: true,
        listeners: response.data.listeners || {},
        activeCount: response.data.activeCount || 0,
        totalCount: response.data.totalCount || 0
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        code: error.code || 'LISTENER_STATUS_ERROR'
      };
    }
  }

  /**
   * Contract alignment summary
   */
  getContractAlignmentSummary() {
    return {
      service: 'BlockchainAPIContractService',
      version: '1.0.0',
      evidenceMetadataSchema: this.evidenceMetadataSchema,
      auditLogSchema: this.auditLogSchema,
      eventListenerEndpoints: this.eventListenerEndpoints,
      blockchainEndpoint: this.blockchainEndpoint,
      features: [
        'Evidence metadata validation',
        'Blockchain evidence sync',
        'Audit log synchronization', 
        'Schema alignment verification',
        'Error handling and retry logic',
        'API health monitoring',
        'Event listener status checking'
      ],
      lastUpdated: new Date().toISOString()
    };
  }
}

module.exports = BlockchainAPIContractService;