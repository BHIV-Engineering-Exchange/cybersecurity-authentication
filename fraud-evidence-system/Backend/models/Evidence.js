// Evidence Model for MongoDB
const mongoose = require('mongoose');

const evidenceSchema = new mongoose.Schema({
  // Case and Entity Information
  caseId: {
    type: String,
    required: true,
    index: true
  },
  wallet: {
    type: String,
    required: true,
    index: true
  },
  reporter: {
    type: String,
    required: true
  },
  
  // File Information
  filename: {
    type: String,
    required: true
  },
  originalFilename: {
    type: String,
    required: true
  },
  filePath: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  fileType: {
    type: String,
    required: true
  },
  
  // Storage Hash (SHA-256)
  storageHash: {
    type: String,
    required: true,
    index: true,
    unique: true
  },
  
  // Mock BHIV Storage Metadata
  storageMetadata: {
    s3Key: String,
    ipfsHash: String,
    bhivPointer: String,
    redundancy: Number,
    locations: {
      local: Boolean,
      s3: Boolean,
      ipfs: Boolean
    }
  },
  
  // Metadata
  description: String,
  tags: [String],
  riskLevel: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  
  // Blockchain Anchoring
  blockchainTxHash: {
    type: String,
    index: true
  },
  blockNumber: Number,
  contractAddress: String,
  blockTimestamp: Date,
  anchoredAt: Date,
  anchorStatus: {
    type: String,
    enum: ['not_anchored', 'pending', 'anchored', 'failed'],
    default: 'not_anchored'
  },
  
  // Status
  verificationStatus: {
    type: String,
    enum: ['pending', 'verified', 'failed'],
    default: 'pending'
  },
  integrityStatus: {
    type: String,
    enum: ['unknown', 'intact', 'corrupted'],
    default: 'unknown'
  },
  
  // Timestamps
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  lastVerified: Date,
  
  // Audit
  uploadedBy: String,
  ipAddress: String,
  userAgent: String
}, {
  timestamps: true
});

// Indexes for performance
evidenceSchema.index({ caseId: 1, uploadedAt: -1 });
evidenceSchema.index({ wallet: 1, uploadedAt: -1 });
evidenceSchema.index({ storageHash: 1 });
evidenceSchema.index({ blockchainTxHash: 1 });
evidenceSchema.index({ uploadedAt: -1 });
evidenceSchema.index({ anchorStatus: 1 });

// Virtual for formatted file size
evidenceSchema.virtual('fileSizeFormatted').get(function() {
  const bytes = this.fileSize;
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
});

const Evidence = mongoose.model('Evidence', evidenceSchema);

module.exports = Evidence;
