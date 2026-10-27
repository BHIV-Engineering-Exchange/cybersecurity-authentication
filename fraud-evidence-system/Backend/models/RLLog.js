// RLLog Model for MongoDB
// Stores reinforcement learning feedback and predictions

const mongoose = require('mongoose');

const rlLogSchema = new mongoose.Schema({
  // Evidence Reference
  evidenceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Evidence',
    index: true
  },
  
  // Input Features
  wallet: {
    type: String,
    required: true,
    index: true
  },
  features: {
    transactionCount: Number,
    totalVolume: Number,
    avgTransactionValue: Number,
    uniqueAddresses: Number,
    suspiciousPatterns: Number,
    accountAge: Number,
    riskLevel: String,
    fileType: String,
    caseId: String
  },
  
  // Prediction
  prediction: {
    action: {
      type: String,
      enum: ['monitor', 'investigate', 'freeze'],
      required: true
    },
    score: {
      type: Number,
      min: 0,
      max: 1,
      required: true
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1
    },
    reasoning: [String],
    explainableFeatures: {
      type: Map,
      of: Number
    }
  },
  
  // Feedback (optional - filled when admin provides feedback)
  feedback: {
    outcome: {
      type: String,
      enum: ['correct', 'incorrect', 'partially_correct', 'false_positive', 'false_negative'],
      index: true
    },
    actualAction: {
      type: String,
      enum: ['monitor', 'investigate', 'freeze', 'dismiss']
    },
    adminNotes: String,
    submittedBy: String,
    submittedAt: Date,
    reward: Number // RL reward signal: 1 for correct, -1 for incorrect, 0 for neutral
  },
  
  // Metadata
  requestType: {
    type: String,
    enum: ['prediction', 'feedback'],
    default: 'prediction'
  },
  modelVersion: {
    type: String,
    default: '1.0.0'
  },
  
  // Timestamps
  predictedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  // Audit
  requestedBy: String,
  ipAddress: String,
  userAgent: String
}, {
  timestamps: true
});

// Indexes for performance
rlLogSchema.index({ wallet: 1, predictedAt: -1 });
rlLogSchema.index({ 'prediction.action': 1 });
rlLogSchema.index({ 'feedback.outcome': 1 });
rlLogSchema.index({ predictedAt: -1 });
rlLogSchema.index({ evidenceId: 1, predictedAt: -1 });

// Virtual for accuracy calculation
rlLogSchema.virtual('isAccurate').get(function() {
  if (!this.feedback || !this.feedback.outcome) {
    return null; // No feedback yet
  }
  return this.feedback.outcome === 'correct' || this.feedback.outcome === 'partially_correct';
});

// Static method to calculate model accuracy
rlLogSchema.statics.calculateAccuracy = async function() {
  const logs = await this.find({ 'feedback.outcome': { $exists: true } });
  
  if (logs.length === 0) {
    return { accuracy: 0, totalFeedback: 0 };
  }
  
  const correct = logs.filter(log => 
    log.feedback.outcome === 'correct' || 
    log.feedback.outcome === 'partially_correct'
  ).length;
  
  return {
    accuracy: correct / logs.length,
    totalFeedback: logs.length,
    correct,
    incorrect: logs.length - correct
  };
};

const RLLog = mongoose.model('RLLog', rlLogSchema);

module.exports = RLLog;
