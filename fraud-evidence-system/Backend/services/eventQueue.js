const eventQueue = [];

function publishEvent(event) {
  eventQueue.push(event);
}

function getQueue() {
  return eventQueue;
}

module.exports = { publishEvent, getQueue };
