//models/Report.js
const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  entityId: {
    type: String,
    required: true,
  },
  reason: {
    type: String,
    required: true,
  },
  severity: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'escalated'],
    default: 'pending',
  },
  riskLevel: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'low',
  },
  riskScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
  },
  tags: [String], // e.g. ["phishing", "botnet", "exchange fraud"]

  ipGeo: {
    lat: Number,
    lon: Number,
    city: String,
    org: String,
  },
  source: {
    type: String,
    enum: ['admin', 'contract'],
    default: null,
  },
  escalationTrail: [
    {
      type: String,
      default: [],
    },
  ],
}, {
  timestamps: true,
  versionKey: false,
});

module.exports = mongoose.model('Report', reportSchema);
