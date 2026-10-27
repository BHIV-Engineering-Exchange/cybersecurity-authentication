// Event Publisher Service
// Publishes events to Kafka with local queue fallback for resilience

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { EVENT_TYPES, createEvent, validateEvent, getEventPriority } = require('../config/eventTypes');

// Kafka client (optional dependency - gracefully handles if not installed)
let kafka = null;
let producer = null;
let kafkaAvailable = false;

try {
  const { Kafka } = require('kafkajs');
  kafka = new Kafka({
    clientId: 'fraud-evidence-backend',
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    retry: {
      initialRetryTime: 100,
      retries: 3
    }
  });
  producer = kafka.producer();
  console.log('📡 Kafka client initialized');
} catch (error) {
  console.warn('⚠️  Kafka not available - using local queue only');
  console.warn('   Install kafkajs: npm install kafkajs');
}

// Configuration
const KAFKA_TOPIC = process.env.KAFKA_TOPIC || 'fraud.events';
const QUEUE_FILE_PATH = path.join(__dirname, '../queue/pending_events.json');
const RETRY_INTERVAL = parseInt(process.env.RETRY_INTERVAL) || 10000; // 10 seconds
const MAX_RETRIES = parseInt(process.env.MAX_RETRIES) || 10;

// In-memory queue
let localQueue = [];
let retryTimer = null;
let kafkaConnected = false;

/**
 * Initialize Kafka connection
 */
async function initializeKafka() {
  if (!producer) {
    console.log('⚠️  Kafka producer not available - events will be queued locally');
    return false;
  }
  
  try {
    await producer.connect();
    kafkaConnected = true;
    kafkaAvailable = true;
    console.log('✅ Kafka producer connected successfully');
    console.log(`📤 Publishing to topic: ${KAFKA_TOPIC}`);
    
    // Start retry mechanism for queued events
    startRetryMechanism();
    
    // Load queued events from disk
    await loadQueuedEvents();
    
    return true;
  } catch (error) {
    console.error('❌ Kafka connection failed:', error.message);
    console.log('📝 Events will be queued locally until Kafka is available');
    kafkaConnected = false;
    
    // Start retry mechanism anyway
    startRetryMechanism();
    
    return false;
  }
}

/**
 * Publish event to Kafka
 * @param {string} eventType - Event type
 * @param {Object} data - Event data
 * @param {Object} metadata - Additional metadata
 * @returns {Promise<Object>} - Publication result
 */
async function publishEvent(eventType, data, metadata = {}) {
  try {
    // Create standardized event
    const event = createEvent(eventType, data, {
      ...metadata,
      priority: metadata.priority || getEventPriority(eventType)
    });
    
    // Validate event
    if (!validateEvent(event)) {
      console.error('❌ Invalid event structure:', event);
      return {
        success: false,
        error: 'Invalid event structure',
        queued: false
      };
    }
    
    console.log(`📨 Publishing event: ${event.eventType} (ID: ${event.eventId})`);
    
    // Try to publish to Kafka
    if (kafkaConnected && producer) {
      try {
        await producer.send({
          topic: KAFKA_TOPIC,
          messages: [
            {
              key: event.eventId,
              value: JSON.stringify(event),
              headers: {
                eventType: event.eventType,
                priority: event.priority,
                timestamp: event.timestamp
              }
            }
          ]
        });
        
        console.log(`✅ Event published to Kafka: ${event.eventId}`);
        
        return {
          success: true,
          eventId: event.eventId,
          published: 'kafka',
          topic: KAFKA_TOPIC
        };
        
      } catch (kafkaError) {
        console.warn(`⚠️  Kafka publish failed: ${kafkaError.message}`);
        console.log('📝 Queueing event for retry...');
        
        // Mark Kafka as disconnected
        kafkaConnected = false;
        
        // Fall through to local queue
      }
    }
    
    // Kafka not available - add to local queue
    await addToLocalQueue(event);
    
    return {
      success: true,
      eventId: event.eventId,
      published: 'queued',
      queueSize: localQueue.length,
      willRetry: true
    };
    
  } catch (error) {
    console.error('❌ Error publishing event:', error);
    return {
      success: false,
      error: error.message,
      queued: false
    };
  }
}

/**
 * Add event to local queue
 * @param {Object} event - Event to queue
 */
async function addToLocalQueue(event) {
  // Add to in-memory queue
  localQueue.push({
    event,
    addedAt: new Date().toISOString(),
    retryCount: 0,
    maxRetries: MAX_RETRIES
  });
  
  console.log(`📝 Event queued locally: ${event.eventId} (Queue size: ${localQueue.length})`);
  
  // Persist queue to disk
  await persistQueue();
}

/**
 * Persist queue to disk
 */
async function persistQueue() {
  try {
    // Ensure queue directory exists
    const queueDir = path.dirname(QUEUE_FILE_PATH);
    await fs.mkdir(queueDir, { recursive: true });
    
    // Write queue to file
    await fs.writeFile(
      QUEUE_FILE_PATH,
      JSON.stringify(localQueue, null, 2),
      'utf8'
    );
    
    console.log(`💾 Queue persisted to disk: ${localQueue.length} events`);
  } catch (error) {
    console.error('❌ Failed to persist queue:', error.message);
  }
}

/**
 * Load queued events from disk
 */
async function loadQueuedEvents() {
  try {
    if (fsSync.existsSync(QUEUE_FILE_PATH)) {
      const data = await fs.readFile(QUEUE_FILE_PATH, 'utf8');
      const loadedQueue = JSON.parse(data);
      
      if (Array.isArray(loadedQueue) && loadedQueue.length > 0) {
        localQueue = loadedQueue;
        console.log(`📂 Loaded ${localQueue.length} queued events from disk`);
        
        // Try to process immediately
        await processQueuedEvents();
      }
    }
  } catch (error) {
    console.warn('⚠️  Failed to load queued events:', error.message);
    localQueue = [];
  }
}

/**
 * Process queued events and retry publishing to Kafka
 */
async function processQueuedEvents() {
  if (localQueue.length === 0) {
    return;
  }
  
  console.log(`🔄 Processing ${localQueue.length} queued events...`);
  
  // Try to reconnect to Kafka if not connected
  if (!kafkaConnected && producer) {
    try {
      await producer.connect();
      kafkaConnected = true;
      console.log('✅ Kafka reconnected successfully');
    } catch (error) {
      console.log('❌ Kafka still unavailable, will retry later');
      return;
    }
  }
  
  if (!kafkaConnected) {
    console.log('⏸️  Kafka not connected, skipping queue processing');
    return;
  }
  
  const successfulEvents = [];
  const failedEvents = [];
  
  for (const queuedItem of localQueue) {
    try {
      const { event, retryCount } = queuedItem;
      
      // Check if max retries exceeded
      if (retryCount >= queuedItem.maxRetries) {
        console.error(`❌ Max retries exceeded for event: ${event.eventId}`);
        failedEvents.push(queuedItem);
        continue;
      }
      
      // Try to publish to Kafka
      await producer.send({
        topic: KAFKA_TOPIC,
        messages: [
          {
            key: event.eventId,
            value: JSON.stringify(event),
            headers: {
              eventType: event.eventType,
              priority: event.priority,
              timestamp: event.timestamp,
              retryCount: retryCount.toString()
            }
          }
        ]
      });
      
      console.log(`✅ Queued event published: ${event.eventId} (retry ${retryCount})`);
      successfulEvents.push(event.eventId);
      
    } catch (error) {
      console.warn(`⚠️  Failed to publish queued event: ${error.message}`);
      
      // Increment retry count
      queuedItem.retryCount += 1;
      failedEvents.push(queuedItem);
    }
  }
  
  // Update queue - keep only failed events
  localQueue = failedEvents;
  
  // Persist updated queue
  await persistQueue();
  
  if (successfulEvents.length > 0) {
    console.log(`🎉 Successfully published ${successfulEvents.length} queued events`);
  }
  
  if (failedEvents.length > 0) {
    console.log(`⏳ ${failedEvents.length} events still in queue`);
  }
}

/**
 * Start background retry mechanism
 */
function startRetryMechanism() {
  if (retryTimer) {
    return; // Already running
  }
  
  console.log(`⏰ Starting retry mechanism (interval: ${RETRY_INTERVAL}ms)`);
  
  retryTimer = setInterval(async () => {
    if (localQueue.length > 0) {
      console.log(`🔄 Retry timer triggered (${localQueue.length} events in queue)`);
      await processQueuedEvents();
    }
  }, RETRY_INTERVAL);
}

/**
 * Stop retry mechanism
 */
function stopRetryMechanism() {
  if (retryTimer) {
    clearInterval(retryTimer);
    retryTimer = null;
    console.log('⏸️  Retry mechanism stopped');
  }
}

/**
 * Get queue statistics
 * @returns {Object} - Queue stats
 */
function getQueueStats() {
  return {
    queueSize: localQueue.length,
    oldestEvent: localQueue.length > 0 ? localQueue[0].addedAt : null,
    kafkaConnected,
    kafkaAvailable,
    retryInterval: RETRY_INTERVAL,
    events: localQueue.map(item => ({
      eventId: item.event.eventId,
      eventType: item.event.eventType,
      retryCount: item.retryCount,
      addedAt: item.addedAt
    }))
  };
}

/**
 * Clear queue (admin only)
 */
async function clearQueue() {
  const clearedCount = localQueue.length;
  localQueue = [];
  await persistQueue();
  console.log(`🧹 Queue cleared: ${clearedCount} events removed`);
  return { success: true, clearedCount };
}

/**
 * Graceful shutdown
 */
async function shutdown() {
  console.log('🛑 Shutting down event publisher...');
  
  // Stop retry mechanism
  stopRetryMechanism();
  
  // Persist queue
  await persistQueue();
  
  // Disconnect from Kafka
  if (producer && kafkaConnected) {
    try {
      await producer.disconnect();
      console.log('✅ Kafka producer disconnected');
    } catch (error) {
      console.error('❌ Error disconnecting from Kafka:', error.message);
    }
  }
  
  console.log('✅ Event publisher shut down gracefully');
}

// Initialize on module load
if (producer) {
  initializeKafka().catch(error => {
    console.warn('⚠️  Initial Kafka connection failed, will retry in background');
  });
}

// Graceful shutdown handlers
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

module.exports = {
  publishEvent,
  initializeKafka,
  getQueueStats,
  clearQueue,
  shutdown,
  EVENT_TYPES
};

