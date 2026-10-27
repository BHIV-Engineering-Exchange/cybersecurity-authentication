const mongoose = require('mongoose');

const flagReportSchema = new mongoose.Schema({
  reportId: { type: String, required: true },
  wallet: { type: String, required: true },
  reason: String,
  flaggedBy: String,
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('FlagReport', flagReportSchema);
