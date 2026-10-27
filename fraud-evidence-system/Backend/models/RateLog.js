const mongoose = require('mongoose');

const rateLogSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
    index: true // adds an index for faster queries per token
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true // allows efficient range queries (e.g. logs from last 24h)
  },
  success: {
    type: Boolean,
    required: true
  }
}, {
  versionKey: false,
  timestamps: false
});

module.exports = mongoose.model('RateLog', rateLogSchema);
