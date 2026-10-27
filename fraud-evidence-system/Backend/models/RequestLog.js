// models/RequestLog.js
const mongoose = require('mongoose');

const requestLogSchema = new mongoose.Schema({
  ip: String,
  method: String,
  path: String,
  user: String,
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('RequestLog', requestLogSchema);
