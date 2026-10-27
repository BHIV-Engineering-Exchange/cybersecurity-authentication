// Kafka fallback service for production resilience
const { EventEmitter } = require('events');
const fs = require('fs');
const path = require('path');

class KafkaFallbackService extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.localQueue = [];
    this.isConnected = false;
    this.retryInterval = null;
    this.queueFile = path.join(__dirname, '..', 'storage', 'kafka_fallback_queue.json');
    this.maxQueueSize = config.fallback.queueSize || 1000;
    this.retryIntervalMs = config.fallback.retryInterval || 30000;
    
    this.ensureStorageDir();
    this.loadLocalQueue();
    this.startRetryProcess();
  }

  /**
   * Ensure storage directory exists
   */
  ensureStorageDir() {
    const storageDir = path.dirname(this.queueFile);
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }
  }

  /**
   * Load local queue from disk
   */
  loadLocalQueue() {
    try {
      if (fs.existsSync(this.queueFile)) {
        const data = fs.readFileSync(this.queueFile, 'utf8');
        this.localQueue = JSON.parse(data);
        console.log(`📦 Loaded ${this.localQueue.length} messages from local queue`);
      }
    } catch (error) {
      console.error('Failed to load local queue:', error);
      this.localQueue = [];
    }
  }

  /**
   * Save local queue to disk
   */
  saveLocalQueue() {
    try {
      fs.writeFileSync(this.queueFile, JSON.stringify(this.localQueue, null, 2));
    } catch (error) {
      console.error('Failed to save local queue:', error);
    }
  }

  /**
   * Set Kafka connection status
   */
  setConnectionStatus(connected) {
    const wasConnected = this.isConnected;
    this.isConnected = connected;
    
    if (!wasConnected && connected) {
      console.log('✅ Kafka connection restored');
      this.emit('kafkaConnected');
      this.processLocalQueue();
    } else if (wasConnected && !connected) {
      console.log('⚠️ Kafka connection lost, using local fallback');
      this.emit('kafkaDisconnected');
    }
  }

  /**
   * Send message with fallback
   */
  async sendMessage(topic, message, options = {}) {
    try {
      if (this.isConnected) {
        // Try to send via Kafka
        await this.sendViaKafka(topic, message, options);
        return { success: true, method: 'kafka' };
      } else {
        // Fallback to local queue
        return await this.queueLocally(topic, message, options);
      }
    } catch (error) {
      console.error('Failed to send message via Kafka:', error);
      // Fallback to local queue
      return await this.queueLocally(topic, message, options);
    }
  }

  /**
   * Send message via Kafka (to be implemented with actual Kafka client)
   */
  async sendViaKafka(topic, message, options) {
    // This would be implemented with the actual Kafka client
    // For now, we'll simulate it
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (Math.random() > 0.1) { // 90% success rate
          resolve();
        } else {
          reject(new Error('Kafka send failed'));
        }
      }, 100);
    });
  }

  /**
   * Queue message locally
   */
  async queueLocally(topic, message, options) {
    const queueMessage = {
      id: this.generateMessageId(),
      topic,
      message,
      options,
      timestamp: new Date().toISOString(),
      retryCount: 0
    };

    // Check queue size limit
    if (this.localQueue.length >= this.maxQueueSize) {
      // Remove oldest messages
      const removed = this.localQueue.splice(0, this.localQueue.length - this.maxQueueSize + 1);
      console.warn(`⚠️ Local queue full, removed ${removed.length} oldest messages`);
    }

    this.localQueue.push(queueMessage);
    this.saveLocalQueue();

    console.log(`📦 Queued message locally: ${topic} (${this.localQueue.length} in queue)`);
    
    return { 
      success: true, 
      method: 'local', 
      messageId: queueMessage.id,
      queueSize: this.localQueue.length
    };
  }

  /**
   * Process local queue when Kafka is back online
   */
  async processLocalQueue() {
    if (!this.isConnected || this.localQueue.length === 0) {
      return;
    }

    console.log(`🔄 Processing ${this.localQueue.length} queued messages...`);

    const messagesToProcess = [...this.localQueue];
    this.localQueue = [];

    for (const queueMessage of messagesToProcess) {
      try {
        await this.sendViaKafka(queueMessage.topic, queueMessage.message, queueMessage.options);
        console.log(`✅ Processed queued message: ${queueMessage.id}`);
      } catch (error) {
        console.error(`❌ Failed to process queued message ${queueMessage.id}:`, error);
        
        // Re-queue with retry count
        queueMessage.retryCount++;
        if (queueMessage.retryCount < 3) {
          this.localQueue.push(queueMessage);
        } else {
          console.error(`💀 Message ${queueMessage.id} exceeded retry limit, discarding`);
        }
      }
    }

    this.saveLocalQueue();
    console.log(`✅ Finished processing local queue (${this.localQueue.length} remaining)`);
  }

  /**
   * Start retry process for failed messages
   */
  startRetryProcess() {
    this.retryInterval = setInterval(() => {
      if (this.isConnected && this.localQueue.length > 0) {
        this.processLocalQueue();
      }
    }, this.retryIntervalMs);
  }

  /**
   * Generate unique message ID
   */
  generateMessageId() {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get queue statistics
   */
  getQueueStats() {
    return {
      isConnected: this.isConnected,
      queueSize: this.localQueue.length,
      maxQueueSize: this.maxQueueSize,
      oldestMessage: this.localQueue.length > 0 ? this.localQueue[0].timestamp : null,
      newestMessage: this.localQueue.length > 0 ? this.localQueue[this.localQueue.length - 1].timestamp : null
    };
  }

  /**
   * Clear local queue (for testing)
   */
  clearQueue() {
    this.localQueue = [];
    this.saveLocalQueue();
    console.log('🧹 Local queue cleared');
  }

  /**
   * Stop the fallback service
   */
  stop() {
    if (this.retryInterval) {
      clearInterval(this.retryInterval);
      this.retryInterval = null;
    }
    this.saveLocalQueue();
    console.log('🛑 Kafka fallback service stopped');
  }
}

module.exports = KafkaFallbackService;
