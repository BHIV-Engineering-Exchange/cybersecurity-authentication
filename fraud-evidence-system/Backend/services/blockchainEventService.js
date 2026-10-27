// Blockchain event service for real-time integration
const { EventEmitter } = require('events');
const WebSocket = require('ws');
const axios = require('axios');

class BlockchainEventService extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.ws = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectInterval = 5000;
    this.eventQueue = [];
    this.subscriptions = new Map();
    
    this.startWebSocketConnection();
  }

  /**
   * Start WebSocket connection to blockchain
   */
  startWebSocketConnection() {
    try {
      this.ws = new WebSocket(this.config.wsUrl);
      
      this.ws.on('open', () => {
        console.log('🔗 Connected to blockchain WebSocket');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.emit('connected');
        this.processEventQueue();
      });

      this.ws.on('message', (data) => {
        try {
          const event = JSON.parse(data);
          this.handleBlockchainEvent(event);
        } catch (error) {
          console.error('Failed to parse blockchain event:', error);
        }
      });

      this.ws.on('close', () => {
        console.log('🔌 Blockchain WebSocket disconnected');
        this.isConnected = false;
        this.emit('disconnected');
        this.scheduleReconnect();
      });

      this.ws.on('error', (error) => {
        console.error('Blockchain WebSocket error:', error);
        this.emit('error', error);
      });

    } catch (error) {
      console.error('Failed to start blockchain WebSocket:', error);
      this.scheduleReconnect();
    }
  }

  /**
   * Handle incoming blockchain events
   */
  handleBlockchainEvent(event) {
    console.log('📡 Received blockchain event:', event.type);
    
    switch (event.type) {
      case 'EvidenceStored':
        this.handleEvidenceStored(event);
        break;
      case 'EvidenceVerified':
        this.handleEvidenceVerified(event);
        break;
      case 'WalletFlagged':
        this.handleWalletFlagged(event);
        break;
      case 'CaseUpdated':
        this.handleCaseUpdated(event);
        break;
      default:
        console.log('Unknown blockchain event type:', event.type);
    }
  }

  /**
   * Handle evidence stored event
   */
  handleEvidenceStored(event) {
    const evidenceEvent = {
      type: 'evidence_stored',
      data: {
        evidenceId: event.evidenceId,
        caseId: event.caseId,
        fileHash: event.fileHash,
        ipfsHash: event.ipfsHash,
        uploadedBy: event.uploadedBy,
        timestamp: event.timestamp,
        txHash: event.txHash,
        blockNumber: event.blockNumber
      }
    };

    this.emit('evidenceStored', evidenceEvent);
    this.notifyFrontend('evidence_stored', evidenceEvent.data);
  }

  /**
   * Handle evidence verified event
   */
  handleEvidenceVerified(event) {
    const verificationEvent = {
      type: 'evidence_verified',
      data: {
        evidenceId: event.evidenceId,
        verificationStatus: event.status,
        verifiedBy: event.verifiedBy,
        timestamp: event.timestamp,
        txHash: event.txHash
      }
    };

    this.emit('evidenceVerified', verificationEvent);
    this.notifyFrontend('evidence_verified', verificationEvent.data);
  }

  /**
   * Handle wallet flagged event
   */
  handleWalletFlagged(event) {
    const flagEvent = {
      type: 'wallet_flagged',
      data: {
        wallet: event.wallet,
        riskLevel: event.riskLevel,
        reason: event.reason,
        flaggedBy: event.flaggedBy,
        timestamp: event.timestamp,
        txHash: event.txHash
      }
    };

    this.emit('walletFlagged', flagEvent);
    this.notifyFrontend('wallet_flagged', flagEvent.data);
  }

  /**
   * Handle case updated event
   */
  handleCaseUpdated(event) {
    const caseEvent = {
      type: 'case_updated',
      data: {
        caseId: event.caseId,
        status: event.status,
        updatedBy: event.updatedBy,
        timestamp: event.timestamp,
        txHash: event.txHash
      }
    };

    this.emit('caseUpdated', caseEvent);
    this.notifyFrontend('case_updated', caseEvent.data);
  }

  /**
   * Subscribe to specific blockchain events
   */
  subscribe(eventType, callback) {
    if (!this.subscriptions.has(eventType)) {
      this.subscriptions.set(eventType, []);
    }
    this.subscriptions.get(eventType).push(callback);
    
    // Send subscription to blockchain if connected
    if (this.isConnected) {
      this.sendSubscription(eventType);
    }
  }

  /**
   * Unsubscribe from blockchain events
   */
  unsubscribe(eventType, callback) {
    if (this.subscriptions.has(eventType)) {
      const callbacks = this.subscriptions.get(eventType);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * Send subscription request to blockchain
   */
  sendSubscription(eventType) {
    if (this.isConnected && this.ws) {
      const subscription = {
        type: 'subscribe',
        event: eventType,
        contractAddress: this.config.contractAddress
      };
      
      this.ws.send(JSON.stringify(subscription));
    }
  }

  /**
   * Notify frontend of blockchain events
   */
  notifyFrontend(eventType, data) {
    // This would integrate with WebSocket server to notify frontend clients
    this.emit('frontendNotification', {
      type: eventType,
      data,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Process queued events when connection is restored
   */
  processEventQueue() {
    while (this.eventQueue.length > 0) {
      const event = this.eventQueue.shift();
      this.handleBlockchainEvent(event);
    }
  }

  /**
   * Queue event for later processing
   */
  queueEvent(event) {
    this.eventQueue.push(event);
    
    // Limit queue size
    if (this.eventQueue.length > 100) {
      this.eventQueue.shift();
    }
  }

  /**
   * Schedule reconnection attempt
   */
  scheduleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1);
      
      console.log(`🔄 Scheduling blockchain reconnection in ${delay}ms (attempt ${this.reconnectAttempts})`);
      
      setTimeout(() => {
        this.startWebSocketConnection();
      }, delay);
    } else {
      console.error('💀 Max blockchain reconnection attempts reached');
      this.emit('maxReconnectAttemptsReached');
    }
  }

  /**
   * Send transaction to blockchain
   */
  async sendTransaction(transaction) {
    try {
      const response = await axios.post(`${this.config.rpcUrl}/transactions`, transaction, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        timeout: this.config.timeout
      });

      return {
        success: true,
        txHash: response.data.txHash,
        blockNumber: response.data.blockNumber,
        gasUsed: response.data.gasUsed
      };
    } catch (error) {
      console.error('Failed to send blockchain transaction:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get blockchain status
   */
  async getBlockchainStatus() {
    try {
      const response = await axios.get(`${this.config.rpcUrl}/status`, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        timeout: 10000
      });

      return {
        connected: true,
        status: response.data,
        wsConnected: this.isConnected,
        subscriptions: Array.from(this.subscriptions.keys())
      };
    } catch (error) {
      return {
        connected: false,
        error: error.message,
        wsConnected: this.isConnected
      };
    }
  }

  /**
   * Stop the blockchain event service
   */
  stop() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    console.log('🛑 Blockchain event service stopped');
  }
}

module.exports = BlockchainEventService;
