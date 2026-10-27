const RequestLog = require('../models/RequestLog');

module.exports = async function auditLogger(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress;
  const method = req.method;
  const path = req.originalUrl;
  const user = req.user?.email || 'anonymous';

  console.log(`[AUDIT] ${new Date().toISOString()} - ${ip} - ${method} ${path}`);

  // Save to MongoDB
  try {
    await RequestLog.create({
      ip,
      method,
      path,
      user
    });
  } catch (err) {
    console.error('❌ Failed to save request log:', err);
  }

  next();
};
