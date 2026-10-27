// services/panicService.js
const PanicLog = require('../models/PanicLog');
const eventBus = require('../utils/eventBus');

async function triggerPanic(entity) {
  // Mock logic to "freeze" the wallet
  const result = await PanicLog.create({
    entity,
    action: 'freeze',
    status: 'frozen',
    triggeredBy: 'panic-endpoint',
  });

  // Emit backend event
  eventBus.emit('walletFrozen', {
    entity,
    status: 'frozen',
    timestamp: new Date().toISOString(),
  });

  return result;
}

module.exports = { triggerPanic };
