const mongoose = require('mongoose');

const FlagSchema = new mongoose.Schema({
  wallet: String,
  risk: Number,
  triggeredBy: String,
  timestamp: String,
  frozen: { type: Boolean, default: false }
});

module.exports = mongoose.model('Flag', FlagSchema);
