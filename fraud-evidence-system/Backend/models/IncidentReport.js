const mongoose = require('mongoose');

const incidentReportSchema = new mongoose.Schema({
  // Basic incident information
  walletAddress: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  reason: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  
  // Reporter information
  reporterName: {
    type: String,
    trim: true
  },
  reporterEmail: {
    type: String,
    trim: true,
    lowercase: true
  },
  reporterPhone: {
    type: String,
    trim: true
  },
  
  // Fraud detection results
  fraudAnalysis: {
    isSuspicious: {
      type: Boolean,
      default: false
    },
    anomalyScore: {
      type: Number,
      default: 0
    },
    fraudProbability: {
      type: Number,
      default: 0
    },
    riskLevel: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH'],
      default: 'LOW'
    },
    suspiciousTransactions: [{
      txHash: String,
      fromAddress: String,
      toAddress: String,
      amount: Number,
      timestamp: Number,
      anomalyScore: Number,
      isSuspicious: Boolean
    }],
    suspiciousAddresses: [String],
    analysisTimestamp: Date
  },
  
  // Status and tracking
  status: {
    type: String,
    enum: ['PENDING', 'UNDER_REVIEW', 'INVESTIGATING', 'RESOLVED', 'CLOSED'],
    default: 'PENDING'
  },
  priority: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    default: 'LOW'
  },
  
  // Assignment
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  assignedAt: Date,
  
  // Resolution
  resolution: {
    type: String,
    trim: true
  },
  resolvedAt: Date,
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Additional data
  evidence: [{
    type: {
      type: String,
      enum: ['SCREENSHOT', 'TRANSACTION_HASH', 'DOCUMENT', 'OTHER']
    },
    url: String,
    description: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Audit trail
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for better query performance
incidentReportSchema.index({ walletAddress: 1 });
incidentReportSchema.index({ status: 1 });
incidentReportSchema.index({ priority: 1 });
incidentReportSchema.index({ createdAt: -1 });
incidentReportSchema.index({ 'fraudAnalysis.riskLevel': 1 });

// Virtual for formatted wallet address
incidentReportSchema.virtual('formattedWalletAddress').get(function() {
  if (this.walletAddress && this.walletAddress.length > 10) {
    return `${this.walletAddress.slice(0, 6)}...${this.walletAddress.slice(-4)}`;
  }
  return this.walletAddress;
});

// Method to update fraud analysis
incidentReportSchema.methods.updateFraudAnalysis = function(analysisData) {
  this.fraudAnalysis = {
    ...this.fraudAnalysis,
    ...analysisData,
    analysisTimestamp: new Date()
  };
  
  // Update priority based on risk level
  if (analysisData.riskLevel === 'HIGH') {
    this.priority = 'HIGH';
  } else if (analysisData.riskLevel === 'MEDIUM') {
    this.priority = 'MEDIUM';
  }
  
  return this.save();
};

// Method to assign to investigator
incidentReportSchema.methods.assignToInvestigator = function(investigatorId) {
  this.assignedTo = investigatorId;
  this.assignedAt = new Date();
  this.status = 'UNDER_REVIEW';
  return this.save();
};

// Method to resolve incident
incidentReportSchema.methods.resolve = function(resolution, resolvedBy) {
  this.resolution = resolution;
  this.resolvedBy = resolvedBy;
  this.resolvedAt = new Date();
  this.status = 'RESOLVED';
  return this.save();
};

// Static method to get statistics
incidentReportSchema.statics.getStatistics = function() {
  return this.aggregate([
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        pending: { $sum: { $cond: [{ $eq: ['$status', 'PENDING'] }, 1, 0] } },
        underReview: { $sum: { $cond: [{ $eq: ['$status', 'UNDER_REVIEW'] }, 1, 0] } },
        investigating: { $sum: { $cond: [{ $eq: ['$status', 'INVESTIGATING'] }, 1, 0] } },
        resolved: { $sum: { $cond: [{ $eq: ['$status', 'RESOLVED'] }, 1, 0] } },
        highRisk: { $sum: { $cond: [{ $eq: ['$fraudAnalysis.riskLevel', 'HIGH'] }, 1, 0] } },
        mediumRisk: { $sum: { $cond: [{ $eq: ['$fraudAnalysis.riskLevel', 'MEDIUM'] }, 1, 0] } },
        lowRisk: { $sum: { $cond: [{ $eq: ['$fraudAnalysis.riskLevel', 'LOW'] }, 1, 0] } }
      }
    }
  ]);
};

module.exports = mongoose.model('IncidentReport', incidentReportSchema);
