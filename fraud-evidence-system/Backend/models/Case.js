// models/Case.js
const mongoose = require('mongoose');

const CaseSchema = new mongoose.Schema({
  // Case identification
  caseId: { 
    type: String, 
    required: true, 
    unique: true,
    default: function() {
      return `CASE-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    }
  },
  
  // Case basic info
  title: { 
    type: String, 
    required: true,
    maxlength: 200 
  },
  description: { 
    type: String, 
    maxlength: 2000 
  },
  
  // Case status management
  status: { 
    type: String, 
    enum: ['open', 'investigating', 'escalated', 'closed', 'archived'], 
    default: 'open' 
  },
  priority: { 
    type: String, 
    enum: ['low', 'medium', 'high', 'critical'], 
    default: 'medium' 
  },
  
  // Associated entities
  entities: [{
    type: { 
      type: String, 
      enum: ['wallet_address', 'ip_address', 'email', 'domain', 'transaction_hash', 'phone', 'other'], 
      required: true 
    },
    value: { 
      type: String, 
      required: true 
    },
    label: String, // Optional human-readable label
    confidence: { 
      type: Number, 
      min: 0, 
      max: 1, 
      default: 1.0 
    },
    addedAt: { 
      type: Date, 
      default: Date.now 
    },
    addedBy: String, // User who added this entity
    metadata: mongoose.Schema.Types.Mixed // Additional entity-specific data
  }],
  
  // Indicators of compromise
  indicators: [{
    type: { 
      type: String, 
      enum: ['wallet', 'ip', 'email', 'domain', 'hash', 'url', 'file_hash', 'other'], 
      required: true 
    },
    value: { 
      type: String, 
      required: true 
    },
    confidence: { 
      type: Number, 
      min: 0, 
      max: 1, 
      default: 0.8 
    },
    source: String, // How this indicator was identified
    tags: [String], // Tags for categorization
    addedAt: { 
      type: Date, 
      default: Date.now 
    },
    addedBy: String,
    notes: String
  }],
  
  // Case management
  assignedTo: String, // Email/ID of assigned investigator
  createdBy: { 
    type: String, 
    required: true 
  },
  lastUpdatedBy: String,
  
  // Timestamps
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  },
  closedAt: Date,
  
  // Risk and scoring
  riskLevel: { 
    type: String, 
    enum: ['low', 'medium', 'high', 'critical'], 
    default: 'medium' 
  },
  riskScore: { 
    type: Number, 
    min: 0, 
    max: 100, 
    default: 50 
  },
  riskFactors: [String], // List of contributing risk factors
  
  // Case relationships
  linkedCases: [{ 
    caseId: String, 
    relationship: String, // e.g., 'related', 'duplicate', 'parent', 'child'
    addedAt: { type: Date, default: Date.now }
  }],
  investigationId: String, // Link to Investigation model if grouped
  
  // Evidence tracking
  evidenceCount: { 
    type: Number, 
    default: 0 
  },
  lastEvidenceUpload: Date,
  
  // Escalation tracking
  escalationHistory: [{
    level: { 
      type: String, 
      enum: ['L1', 'L2', 'L3', 'supervisor', 'external'] 
    },
    escalatedAt: { 
      type: Date, 
      default: Date.now 
    },
    escalatedBy: String,
    reason: String,
    status: { 
      type: String, 
      enum: ['pending', 'acknowledged', 'resolved', 'rejected'] 
    },
    response: String,
    responseAt: Date,
    responseBy: String
  }],
  
  // Report generation
  reportsGenerated: [{
    reportType: { 
      type: String, 
      enum: ['case_summary', 'evidence_report', 'investigation_report', 'escalation_report'] 
    },
    generatedAt: { 
      type: Date, 
      default: Date.now 
    },
    generatedBy: String,
    filePath: String,
    filename: String,
    format: { 
      type: String, 
      enum: ['pdf', 'html', 'json'] 
    }
  }],
  
  // Additional metadata
  tags: [String], // Case categorization tags
  category: { 
    type: String, 
    enum: ['fraud', 'aml', 'compliance', 'investigation', 'incident', 'other'], 
    default: 'investigation' 
  },
  subcategory: String,
  
  // External references
  externalReferences: [{
    type: { 
      type: String, 
      enum: ['ticket', 'report', 'alert', 'case', 'incident'] 
    },
    id: String,
    source: String, // Source system
    url: String,
    notes: String
  }],
  
  // Custom fields for extensibility
  customFields: mongoose.Schema.Types.Mixed,
  
  // Audit trail
  auditTrail: [{
    action: { 
      type: String, 
      enum: ['created', 'updated', 'status_changed', 'assigned', 'escalated', 'closed', 'reopened', 'evidence_added', 'report_generated'] 
    },
    timestamp: { 
      type: Date, 
      default: Date.now 
    },
    performedBy: String,
    details: mongoose.Schema.Types.Mixed,
    ipAddress: String,
    userAgent: String
  }]
});

// Indexes for performance
CaseSchema.index({ caseId: 1 }, { unique: true });
CaseSchema.index({ status: 1 });
CaseSchema.index({ createdAt: -1 });
CaseSchema.index({ assignedTo: 1 });
CaseSchema.index({ 'entities.type': 1, 'entities.value': 1 });
CaseSchema.index({ 'indicators.type': 1, 'indicators.value': 1 });
CaseSchema.index({ riskLevel: 1 });
CaseSchema.index({ priority: 1 });
CaseSchema.index({ category: 1 });

// Pre-save middleware to update timestamps and audit trail
CaseSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.updatedAt = new Date();
    
    // Add audit trail entry for updates
    if (!this.auditTrail) this.auditTrail = [];
    this.auditTrail.push({
      action: 'updated',
      timestamp: new Date(),
      performedBy: this.lastUpdatedBy || 'system',
      details: {
        modifiedPaths: this.modifiedPaths()
      }
    });
  }
  next();
});

// Virtual for getting total evidence count (could be computed from Evidence collection)
CaseSchema.virtual('totalEvidence').get(function() {
  return this.evidenceCount || 0;
});

// Virtual for case age
CaseSchema.virtual('ageInDays').get(function() {
  return Math.ceil((new Date() - this.createdAt) / (1000 * 60 * 60 * 24));
});

// Method to add entity
CaseSchema.methods.addEntity = function(entityData, addedBy) {
  // Check if entity already exists
  const existingEntity = this.entities.find(
    e => e.type === entityData.type && e.value === entityData.value
  );
  
  if (!existingEntity) {
    this.entities.push({
      ...entityData,
      addedAt: new Date(),
      addedBy: addedBy
    });
    
    // Add audit trail
    this.auditTrail.push({
      action: 'updated',
      timestamp: new Date(),
      performedBy: addedBy,
      details: {
        action: 'entity_added',
        entity: entityData
      }
    });
  }
  
  return !existingEntity;
};

// Method to add indicator
CaseSchema.methods.addIndicator = function(indicatorData, addedBy) {
  this.indicators.push({
    ...indicatorData,
    addedAt: new Date(),
    addedBy: addedBy
  });
  
  // Add audit trail
  this.auditTrail.push({
    action: 'updated',
    timestamp: new Date(),
    performedBy: addedBy,
    details: {
      action: 'indicator_added',
      indicator: indicatorData
    }
  });
};

// Method to update status
CaseSchema.methods.updateStatus = function(newStatus, updatedBy, reason) {
  const oldStatus = this.status;
  this.status = newStatus;
  this.lastUpdatedBy = updatedBy;
  
  if (newStatus === 'closed') {
    this.closedAt = new Date();
  }
  
  // Add audit trail
  this.auditTrail.push({
    action: 'status_changed',
    timestamp: new Date(),
    performedBy: updatedBy,
    details: {
      oldStatus: oldStatus,
      newStatus: newStatus,
      reason: reason
    }
  });
};

// Method to add escalation
CaseSchema.methods.escalate = function(escalationData, escalatedBy) {
  this.escalationHistory.push({
    ...escalationData,
    escalatedAt: new Date(),
    escalatedBy: escalatedBy,
    status: 'pending'
  });
  
  // Update case status if not already escalated
  if (this.status !== 'escalated') {
    this.updateStatus('escalated', escalatedBy, 'Case escalated');
  }
  
  // Add audit trail
  this.auditTrail.push({
    action: 'escalated',
    timestamp: new Date(),
    performedBy: escalatedBy,
    details: escalationData
  });
};

module.exports = mongoose.model('Case', CaseSchema);