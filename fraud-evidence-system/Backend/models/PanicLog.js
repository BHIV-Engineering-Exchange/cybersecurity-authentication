// models/PanicLog.js
const mongoose = require('mongoose');

const PanicLogSchema = new mongoose.Schema({
  entity: { type: String, required: true },
  action: { type: String, default: 'freeze' },
  status: { type: String, default: 'frozen' },
  triggeredBy: { type: String, default: 'panic-endpoint' },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('PanicLog', PanicLogSchema);
