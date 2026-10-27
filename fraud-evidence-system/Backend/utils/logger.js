// utils/logger.js
const log = (level, message, data = {}) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${level.toUpperCase()}: ${message}`, data);
};

// Log alert specifically for high-risk events
const logAlert = (alertType, eventData) => {
  const timestamp = new Date().toISOString();
  console.log(`🚨 [${timestamp}] ALERT: ${alertType}`, JSON.stringify(eventData, null, 2));
};

module.exports = {
  info: (msg, data) => log('info', msg, data),
  warn: (msg, data) => log('warn', msg, data),
  error: (msg, data) => log('error', msg, data),
  logAlert
};
