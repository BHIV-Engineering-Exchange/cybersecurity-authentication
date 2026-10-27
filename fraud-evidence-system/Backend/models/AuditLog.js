// Standardized audit log schema for production
const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  // User identification
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  userEmail: {
    type: String,
    required: true,
    index: true
  },
  userRole: {
    type: String,
    required: true,
    enum: ['superadmin', 'admin', 'investigator', 'user'],
    index: true
  },
  
  // Action details
  action: {
    type: String,
    required: true,
    index: true
  },
  resource: {
    type: String,
    required: true,
    index: true
  },
  resourceType: {
    type: String,
    required: true,
    enum: ['evidence', 'case', 'user', 'system', 'report', 'rl', 'blockchain'],
    index: true
  },
  resourceId: {
    type: String,
    index: true
  },
  
  // Request details
  method: {
    type: String,
    required: true,
    enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    index: true
  },
  endpoint: {
    type: String,
    required: true,
    index: true
  },
  
  // Network details
  ip: {
    type: String,
    required: true,
    index: true
  },
  userAgent: {
    type: String,
    required: true
  },
  
  // Result details
  success: {
    type: Boolean,
    required: true,
    index: true
  },
  statusCode: {
    type: Number,
    required: true,
    index: true
  },
  
  // Additional context
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // Security context
  auditLevel: {
    type: String,
    enum: ['standard', 'high', 'critical'],
    default: 'standard',
    index: true
  },
  
  // Blockchain integration
  blockchainTxHash: {
    type: String,
    index: true
  },
  blockchainBlockNumber: {
    type: Number,
    index: true
  },
  blockchainSynced: {
    type: Boolean,
    default: false,
    index: true
  },
  
  // Timestamps
  timestamp: {
    type: Date,
    default: Date.now,
    required: true,
    index: true
  },
  
  // Retention
  retentionDate: {
    type: Date,
    index: true
  }
}, {
  timestamps: true,
  versionKey: false
});

// Indexes for performance
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ userRole: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ resourceType: 1, timestamp: -1 });
auditLogSchema.index({ success: 1, timestamp: -1 });
auditLogSchema.index({ auditLevel: 1, timestamp: -1 });
auditLogSchema.index({ ip: 1, timestamp: -1 });

// Compound indexes for common queries
auditLogSchema.index({ userId: 1, action: 1, timestamp: -1 });
auditLogSchema.index({ userRole: 1, success: 1, timestamp: -1 });
auditLogSchema.index({ resourceType: 1, auditLevel: 1, timestamp: -1 });

// Pre-save middleware to set retention date
auditLogSchema.pre('save', function(next) {
  if (!this.retentionDate) {
    // Set retention based on audit level
    const retentionDays = {
      standard: 90,  // 3 months
      high: 365,     // 1 year
      critical: 2555 // 7 years
    };
    
    const days = retentionDays[this.auditLevel] || 90;
    this.retentionDate = new Date(Date.now() + (days * 24 * 60 * 60 * 1000));
  }
  next();
});

// Static methods for common queries
auditLogSchema.statics.findByUser = function(userId, options = {}) {
  const query = { userId };
  if (options.startDate) query.timestamp = { $gte: options.startDate };
  if (options.endDate) query.timestamp = { ...query.timestamp, $lte: options.endDate };
  if (options.action) query.action = options.action;
  if (options.success !== undefined) query.success = options.success;
  
  return this.find(query)
    .sort({ timestamp: -1 })
    .limit(options.limit || 100);
};

auditLogSchema.statics.findSuspiciousActivity = function(options = {}) {
  const timeWindow = options.timeWindow || 15; // minutes
  const threshold = options.threshold || 5; // failed attempts
  
  const startTime = new Date(Date.now() - (timeWindow * 60 * 1000));
  
  return this.aggregate([
    {
      $match: {
        timestamp: { $gte: startTime },
        success: false
      }
    },
    {
      $group: {
        _id: '$userId',
        userEmail: { $first: '$userEmail' },
        userRole: { $first: '$userRole' },
        failedAttempts: { $sum: 1 },
        lastAttempt: { $max: '$timestamp' },
        actions: { $push: '$action' },
        ips: { $addToSet: '$ip' }
      }
    },
    {
      $match: {
        failedAttempts: { $gte: threshold }
      }
    },
    {
      $sort: { failedAttempts: -1 }
    }
  ]);
};

auditLogSchema.statics.getAuditStats = function(options = {}) {
  const startDate = options.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Last 30 days
  const endDate = options.endDate || new Date();
  
  return this.aggregate([
    {
      $match: {
        timestamp: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: null,
        totalActions: { $sum: 1 },
        successfulActions: {
          $sum: { $cond: ['$success', 1, 0] }
        },
        failedActions: {
          $sum: { $cond: ['$success', 0, 1] }
        },
        uniqueUsers: { $addToSet: '$userId' },
        uniqueIPs: { $addToSet: '$ip' },
        actionsByRole: {
          $push: {
            role: '$userRole',
            success: '$success'
          }
        },
        actionsByType: {
          $push: {
            type: '$resourceType',
            success: '$success'
          }
        }
      }
    },
    {
      $project: {
        totalActions: 1,
        successfulActions: 1,
        failedActions: 1,
        uniqueUserCount: { $size: '$uniqueUsers' },
        uniqueIPCount: { $size: '$uniqueIPs' },
        successRate: {
          $multiply: [
            { $divide: ['$successfulActions', '$totalActions'] },
            100
          ]
        }
      }
    }
  ]);
};

// Instance methods
auditLogSchema.methods.toBlockchainPayload = function() {
  return {
    auditId: this._id.toString(),
    userId: this.userId.toString(),
    userEmail: this.userEmail,
    userRole: this.userRole,
    action: this.action,
    resource: this.resource,
    resourceType: this.resourceType,
    method: this.method,
    success: this.success,
    statusCode: this.statusCode,
    auditLevel: this.auditLevel,
    timestamp: this.timestamp.toISOString(),
    details: this.details
  };
};

auditLogSchema.methods.markBlockchainSynced = function(txHash, blockNumber) {
  this.blockchainTxHash = txHash;
  this.blockchainBlockNumber = blockNumber;
  this.blockchainSynced = true;
  return this.save();
};

module.exports = mongoose.model('AuditLog', auditLogSchema);