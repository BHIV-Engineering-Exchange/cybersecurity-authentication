const mongoose = require('mongoose');

const mlAnalysisSchema = new mongoose.Schema({
  // Incident report reference
  incidentReportId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'IncidentReport',
    required: true
  },
  
  // Wallet information
  walletAddress: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  
  // Analysis results
  analysisResults: {
    riskLevel: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      required: true
    },
    fraudProbability: {
      type: Number,
      min: 0,
      max: 1,
      required: true
    },
    anomalyScore: {
      type: Number,
      required: true
    },
    isSuspicious: {
      type: Boolean,
      required: true
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
    analysisTimestamp: {
      type: Date,
      default: Date.now
    }
  },
  
  // ML Model information
  modelInfo: {
    modelType: {
      type: String,
      enum: ['IsolationForest', 'OneClassSVM', 'LocalOutlierFactor', 'Combined'],
      default: 'IsolationForest'
    },
    modelVersion: {
      type: String,
      default: '1.0'
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1
    }
  },
  
  // User information
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userEmail: {
    type: String,
    required: true
  },
  userRole: {
    type: String,
    enum: ['admin', 'investigator', 'user'],
    required: true
  },
  
  // Analysis metadata
  analysisMetadata: {
    totalTransactionsAnalyzed: Number,
    dataSource: {
      type: String,
      default: 'bhx_transactions.json'
    },
    processingTime: Number, // in milliseconds
    featuresUsed: [String]
  },
  
  // Status and visibility
  status: {
    type: String,
    enum: ['PENDING', 'COMPLETED', 'FAILED'],
    default: 'COMPLETED'
  },
  isPublic: {
    type: Boolean,
    default: false
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
mlAnalysisSchema.index({ walletAddress: 1 });
mlAnalysisSchema.index({ createdBy: 1 });
mlAnalysisSchema.index({ userRole: 1 });
mlAnalysisSchema.index({ 'analysisResults.riskLevel': 1 });
mlAnalysisSchema.index({ createdAt: -1 });
mlAnalysisSchema.index({ incidentReportId: 1 });

// Virtual for formatted wallet address
mlAnalysisSchema.virtual('formattedWalletAddress').get(function() {
  if (this.walletAddress && this.walletAddress.length > 10) {
    return `${this.walletAddress.slice(0, 6)}...${this.walletAddress.slice(-4)}`;
  }
  return this.walletAddress;
});

// Method to get analysis summary
mlAnalysisSchema.methods.getSummary = function() {
  return {
    id: this._id,
    walletAddress: this.formattedWalletAddress,
    riskLevel: this.analysisResults.riskLevel,
    fraudProbability: this.analysisResults.fraudProbability,
    isSuspicious: this.analysisResults.isSuspicious,
    suspiciousTransactionsCount: this.analysisResults.suspiciousTransactions.length,
    suspiciousAddressesCount: this.analysisResults.suspiciousAddresses.length,
    createdAt: this.createdAt,
    createdBy: this.userEmail
  };
};

// Static method to get statistics
mlAnalysisSchema.statics.getStatistics = function() {
  return this.aggregate([
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        lowRisk: { $sum: { $cond: [{ $eq: ['$analysisResults.riskLevel', 'LOW'] }, 1, 0] } },
        mediumRisk: { $sum: { $cond: [{ $eq: ['$analysisResults.riskLevel', 'MEDIUM'] }, 1, 0] } },
        highRisk: { $sum: { $cond: [{ $eq: ['$analysisResults.riskLevel', 'HIGH'] }, 1, 0] } },
        criticalRisk: { $sum: { $cond: [{ $eq: ['$analysisResults.riskLevel', 'CRITICAL'] }, 1, 0] } },
        suspicious: { $sum: { $cond: ['$analysisResults.isSuspicious', 1, 0] } },
        avgFraudProbability: { $avg: '$analysisResults.fraudProbability' }
      }
    }
  ]);
};

// Static method to get user's analyses
mlAnalysisSchema.statics.getUserAnalyses = function(userId, userRole, limit = 10) {
  const query = userRole === 'admin' ? {} : { createdBy: userId };
  
  return this.find(query)
    .populate('incidentReportId', 'reason status priority')
    .sort({ createdAt: -1 })
    .limit(limit);
};

module.exports = mongoose.model('MLAnalysis', mlAnalysisSchema);
