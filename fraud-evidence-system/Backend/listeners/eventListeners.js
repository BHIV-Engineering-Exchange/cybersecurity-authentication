// listeners/eventListeners.js
const eventBus = require('../utils/eventBus');

function registerListeners() {
  eventBus.on('walletFrozen', (data) => {
    console.log(`[📣 EVENT] walletFrozen →`, data);
    // TODO: send to Kafka, WebSocket, or alerting system
  });
}

module.exports = { registerListeners };
