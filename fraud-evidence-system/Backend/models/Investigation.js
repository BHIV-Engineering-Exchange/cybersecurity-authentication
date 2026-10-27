const mongoose = require('mongoose');

// Entity schema for linking different types of entities
const EntitySchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['wallet_address', 'ip_address', 'domain', 'email', 'phone', 'device_id', 'transaction_hash'],
    required: true
  },
  value: {
    type: String,
    required: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  addedAt: {
    type: Date,
    default: Date.now
  },
  verified: {
    type: Boolean,
    default: false
  }
}, { _id: false });

// Connection schema for entity relationships
const ConnectionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['direct_link', 'temporal_correlation', 'geographic_proximity', 'behavioral_similarity', 'evidence_link'],
    required: true
  },
  entity1: EntitySchema,
  entity2: EntitySchema,
  strength: {
    type: Number,
    min: 0,
    max: 1,
    required: true
  },
  evidence: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Evidence'
  }],
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  description: String
}, { _id: false });

// Timeline event schema
const TimelineEventSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    required: true
  },
  type: {
    type: String,
    enum: ['evidence_upload', 'risk_assessment', 'escalation', 'ip_log', 'connection_detected', 'manual_entry'],
    required: true
  },
  description: {
    type: String,
    required: true
  },
  entities: [String], // Entity values involved in this event
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  evidenceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Evidence'
  },
  reportId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Report'
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { _id: false });

// Risk assessment schema
const RiskAssessmentSchema = new mongoose.Schema({
  overallRisk: {
    type: Number,
    min: 0,
    max: 1,
    default: 0
  },
  riskFactors: [String],
  individualEntityRisks: [{
    entity: String,
    risk: Number,
    factors: [String]
  }],
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  methodology: {
    type: String,
    default: 'automated_analysis'
  }
}, { _id: false });

// Audit trail schema
const AuditTrailSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  details: String,
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, { _id: false });

// Main Investigation schema
const InvestigationSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  investigationId: {
    type: String,
    unique: true,
    sparse: true
  },
  status: {
    type: String,
    enum: ['active', 'under_review', 'completed', 'closed', 'archived'],
    default: 'active'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  
  // Core entities being investigated
  entities: [EntitySchema],
  
  // Detected connections between entities
  connections: [ConnectionSchema],
  
  // Timeline of all related events
  timeline: [TimelineEventSchema],
  
  // Risk assessment
  riskAssessment: RiskAssessmentSchema,
  
  // Assignment and ownership
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Related evidence and reports
  relatedEvidence: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Evidence'
  }],
  relatedReports: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Report'
  }],
  
  // Tags and categorization
  tags: [String],
  category: {
    type: String,
    enum: ['fraud', 'aml', 'compliance', 'security', 'investigation', 'other'],
    default: 'investigation'
  },
  
  // Audit trail
  auditTrail: [AuditTrailSchema],
  
  // Collaboration and notes
  notes: [{
    content: String,
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    type: {
      type: String,
      enum: ['note', 'finding', 'action_item', 'conclusion'],
      default: 'note'
    }
  }],
  
  // External references
  externalReferences: [{
    type: String, // URL or reference ID
    description: String,
    source: String
  }],
  
  // Closure information
  resolution: {
    type: String,
    enum: ['resolved', 'false_positive', 'escalated', 'insufficient_evidence', 'ongoing'],
    sparse: true
  },
  closureReason: String,
  closedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  closedAt: Date,
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  
  // Auto-linking configuration
  autoLinkingEnabled: {
    type: Boolean,
    default: true
  },
  linkingThreshold: {
    type: Number,
    min: 0,
    max: 1,
    default: 0.7
  }
}, {
  timestamps: true
});

// Indexes for better query performance
InvestigationSchema.index({ 'entities.value': 1 });
InvestigationSchema.index({ 'entities.type': 1 });
InvestigationSchema.index({ status: 1, priority: 1 });
InvestigationSchema.index({ createdAt: -1 });
InvestigationSchema.index({ assignedTo: 1 });
InvestigationSchema.index({ investigationId: 1 }, { unique: true, sparse: true });
InvestigationSchema.index({ tags: 1 });
InvestigationSchema.index({ 'riskAssessment.overallRisk': -1 });

// Virtual for entity count
InvestigationSchema.virtual('entityCount').get(function() {
  return this.entities.length;
});

// Virtual for connection count
InvestigationSchema.virtual('connectionCount').get(function() {
  return this.connections.length;
});

// Virtual for timeline event count
InvestigationSchema.virtual('timelineEventCount').get(function() {
  return this.timeline.length;
});

// Generate investigation ID before saving
InvestigationSchema.pre('save', function(next) {
  if (!this.investigationId) {
    const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const random = Math.random().toString(36).substr(2, 6).toUpperCase();
    this.investigationId = `INV-${date}-${random}`;
  }
  
  this.updatedAt = new Date();
  next();
});

// Method to add entity to investigation
InvestigationSchema.methods.addEntity = function(entityType, entityValue, metadata = {}) {
  const existingEntity = this.entities.find(e => e.type === entityType && e.value === entityValue);
  if (!existingEntity) {
    this.entities.push({
      type: entityType,
      value: entityValue,
      metadata: metadata,
      addedAt: new Date()
    });
    
    this.auditTrail.push({
      action: 'entity_added',
      timestamp: new Date(),
      details: `Added ${entityType}: ${entityValue}`
    });
  }
};

// Method to add connection
InvestigationSchema.methods.addConnection = function(connectionData) {
  this.connections.push(connectionData);
  
  this.auditTrail.push({
    action: 'connection_added',
    timestamp: new Date(),
    details: `Added ${connectionData.type} connection between ${connectionData.entity1.value} and ${connectionData.entity2.value}`
  });
};

// Method to add timeline event
InvestigationSchema.methods.addTimelineEvent = function(eventData) {
  this.timeline.push(eventData);
  this.timeline.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  
  this.auditTrail.push({
    action: 'timeline_event_added',
    timestamp: new Date(),
    details: `Added ${eventData.type} event: ${eventData.description}`
  });
};

// Method to update risk assessment
InvestigationSchema.methods.updateRiskAssessment = function(riskData) {
  this.riskAssessment = {
    ...this.riskAssessment,
    ...riskData,
    lastUpdated: new Date()
  };
  
  this.auditTrail.push({
    action: 'risk_assessment_updated',
    timestamp: new Date(),
    details: `Risk assessment updated. Overall risk: ${this.riskAssessment.overallRisk}`
  });
};

// Static method to find investigations by entity
InvestigationSchema.statics.findByEntity = function(entityType, entityValue) {
  return this.find({
    'entities.type': entityType,
    'entities.value': entityValue
  });
};

// Static method to find investigations with high risk
InvestigationSchema.statics.findHighRisk = function(threshold = 0.7) {
  return this.find({
    'riskAssessment.overallRisk': { $gte: threshold }
  }).sort({ 'riskAssessment.overallRisk': -1 });
};

module.exports = mongoose.model('Investigation', InvestigationSchema);