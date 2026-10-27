const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, unique: true, required: true },
  password: String,
  role: { 
    type: String, 
    enum: ['user', 'investigator', 'admin', 'superadmin'], 
    default: 'user' 
  },
  permissions: {
    evidenceView: { type: Boolean, default: false },
    evidenceDownload: { type: Boolean, default: false },
    evidenceUpload: { type: Boolean, default: true },
    evidenceDelete: { type: Boolean, default: false },
    evidenceExport: { type: Boolean, default: false },
    reportGeneration: { type: Boolean, default: false },
    caseManagement: { type: Boolean, default: false },
    adminAccess: { type: Boolean, default: false }
  },
  department: { type: String }, // e.g., 'fraud_investigation', 'compliance', 'security'
  accessLevel: { 
    type: String,
    enum: ['restricted', 'standard', 'elevated', 'full'],
    default: 'restricted'
  },
  createdAt: { type: Date, default: Date.now },
  lastLogin: { type: Date },
  isActive: { type: Boolean, default: true },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: { type: Date }
});

// Define role-based permissions
userSchema.methods.setRolePermissions = function() {
  switch (this.role) {
    case 'superadmin':
      this.permissions = {
        evidenceView: true,
        evidenceDownload: true,
        evidenceUpload: true,
        evidenceDelete: true,
        evidenceExport: true,
        reportGeneration: true,
        caseManagement: true,
        adminAccess: true
      };
      this.accessLevel = 'full';
      break;
    case 'admin':
      this.permissions = {
        evidenceView: true,
        evidenceDownload: true,
        evidenceUpload: true,
        evidenceDelete: false,
        evidenceExport: true,
        reportGeneration: true,
        caseManagement: true,
        adminAccess: true
      };
      this.accessLevel = 'elevated';
      break;
    case 'investigator':
      this.permissions = {
        evidenceView: true,
        evidenceDownload: true,
        evidenceUpload: true,
        evidenceDelete: false,
        evidenceExport: true,
        reportGeneration: true,
        caseManagement: false,
        adminAccess: false
      };
      this.accessLevel = 'standard';
      break;
    case 'user':
    default:
      this.permissions = {
        evidenceView: false,
        evidenceDownload: false,
        evidenceUpload: true,
        evidenceDelete: false,
        evidenceExport: false,
        reportGeneration: false,
        caseManagement: false,
        adminAccess: false
      };
      this.accessLevel = 'restricted';
      break;
  }
};

// Check if user has specific permission
userSchema.methods.hasPermission = function(permission) {
  return this.permissions[permission] === true;
};

// Check if user can access evidence library
userSchema.methods.canAccessEvidenceLibrary = function() {
  return this.hasPermission('evidenceView') && this.isActive;
};

// Check if user can access specific evidence based on case sensitivity
userSchema.methods.canAccessEvidence = function(evidence) {
  if (!this.canAccessEvidenceLibrary()) {
    return false;
  }
  
  // Superadmin can access everything
  if (this.role === 'superadmin') {
    return true;
  }
  
  // High-security evidence requires elevated access
  if (evidence.riskLevel === 'high' && this.accessLevel !== 'elevated' && this.accessLevel !== 'full') {
    return false;
  }
  
  return true;
};

// Auto-set permissions before saving
userSchema.pre('save', function(next) {
  if (this.isModified('role')) {
    this.setRolePermissions();
  }
  next();
});

// Index for performance
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });

module.exports = mongoose.model('User', userSchema);
