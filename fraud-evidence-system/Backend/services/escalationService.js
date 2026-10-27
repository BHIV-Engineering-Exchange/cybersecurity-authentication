// services/escalationService.js
const axios = require('axios');
const EscalationLog = require('../models/EscalationLog');
const { RISK_THRESHOLD, RBI_WEBHOOK_URL } = require('../config/constants');

async function escalateIfNeeded(entity, riskScore, caseId, trigger = 'auto') {
  if (riskScore >= RISK_THRESHOLD || trigger === 'manual') {
    try {
      const payload = {
        entity,
        riskScore,
        caseId,
        trigger,
        timestamp: new Date().toISOString(),
      };

      const response = await axios.post(RBI_WEBHOOK_URL, payload);

      // Log to MongoDB
      await EscalationLog.create({
        entity,
        riskScore,
        caseId,
        trigger,
        webhookResponse: response.data,
        createdAt: new Date(),
      });

      return { success: true, sent: true, data: response.data };
    } catch (err) {
      console.error('Webhook failed:', err.message);
      await EscalationLog.create({
        entity,
        riskScore,
        caseId,
        trigger,
        webhookResponse: { error: err.message },
        createdAt: new Date(),
      });

      return { success: false, error: err.message };
    }
  }

  return { success: true, sent: false, reason: 'Risk below threshold' };
}

module.exports = { escalateIfNeeded };
