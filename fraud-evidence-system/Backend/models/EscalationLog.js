// models/EscalationLog.js
const mongoose = require('mongoose');

const EscalationLogSchema = new mongoose.Schema({
  entity: String,
  riskScore: Number,
  caseId: String,
  trigger: { type: String, enum: ['auto', 'manual'] },
  webhookResponse: mongoose.Schema.Types.Mixed,
  createdAt: Date,
});

module.exports = mongoose.model('EscalationLog', EscalationLogSchema);
