const mongoose = require('mongoose');

const caseManagerSchema = new mongoose.Schema({
  caseId: {
    type: String,
    required: true,
    unique: true,
    default: () => 'CASE-' + Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  },
  walletAddress: {
    type: String,
    required: true,
    index: true
  },
  riskScore: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  status: {
    type: String,
    enum: ['New', 'Under Investigation', 'Escalated', 'Resolved', 'Closed'],
    default: 'New'
  },
  investigatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  investigatorName: {
    type: String,
    required: true
  },
  investigatorEmail: {
    type: String,
    required: true
  },
  mlAnalysisId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MLAnalysis',
    required: true
  },
  incidentReportId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'IncidentReport'
  },
  analysisResults: {
    riskLevel: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      required: true
    },
    fraudProbability: {
      type: Number,
      required: true,
      min: 0,
      max: 1
    },
    isSuspicious: {
      type: Boolean,
      default: false
    },
    anomalyScore: {
      type: Number,
      required: true
    },
    suspiciousTransactions: [{
      txHash: String,
      fromAddress: String,
      toAddress: String,
      anomalyScore: Number,
      isSuspicious: Boolean
    }],
    suspiciousAddresses: [String]
  },
  modelInfo: {
    modelType: {
      type: String,
      default: 'IsolationForest'
    },
    modelVersion: {
      type: String,
      default: '1.0'
    },
    confidence: {
      type: Number,
      default: 0.85
    }
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Critical'],
    default: 'Medium'
  },
  tags: [String],
  notes: String,
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
});

// Index for efficient queries
caseManagerSchema.index({ walletAddress: 1, investigatorId: 1 });
caseManagerSchema.index({ status: 1, priority: 1 });
caseManagerSchema.index({ createdAt: -1 });

// Update timestamp on save
caseManagerSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Static method to get cases by investigator
caseManagerSchema.statics.getCasesByInvestigator = function(investigatorId) {
  return this.find({ investigatorId }).sort({ createdAt: -1 });
};

// Static method to get all cases for admin
caseManagerSchema.statics.getAllCases = function(filters = {}) {
  const query = {};
  if (filters.status) query.status = filters.status;
  if (filters.priority) query.priority = filters.priority;
  if (filters.investigatorId) query.investigatorId = filters.investigatorId;
  if (filters.riskLevel) query['analysisResults.riskLevel'] = filters.riskLevel;
  
  return this.find(query)
    .populate('investigatorId', 'name email role')
    .populate('assignedTo', 'name email')
    .sort({ createdAt: -1 });
};

// Static method to get case statistics
caseManagerSchema.statics.getCaseStatistics = function() {
  return this.aggregate([
    {
      $group: {
        _id: null,
        totalCases: { $sum: 1 },
        newCases: { $sum: { $cond: [{ $eq: ['$status', 'New'] }, 1, 0] } },
        underInvestigation: { $sum: { $cond: [{ $eq: ['$status', 'Under Investigation'] }, 1, 0] } },
        escalated: { $sum: { $cond: [{ $eq: ['$status', 'Escalated'] }, 1, 0] } },
        resolved: { $sum: { $cond: [{ $eq: ['$status', 'Resolved'] }, 1, 0] } },
        closed: { $sum: { $cond: [{ $eq: ['$status', 'Closed'] }, 1, 0] } },
        avgRiskScore: { $avg: '$riskScore' },
        highRiskCases: { $sum: { $cond: [{ $gte: ['$riskScore', 80] }, 1, 0] } },
        criticalCases: { $sum: { $cond: [{ $eq: ['$priority', 'Critical'] }, 1, 0] } }
      }
    }
  ]);
};

module.exports = mongoose.model('CaseManager', caseManagerSchema);

