// services/evidenceContractService.js
const crypto = require('crypto');
const chainOfCustodyService = require('./chainOfCustodyService');

class EvidenceContractService {
  constructor() {
    this.contractAddress = "0x742d35Cc6761C65532534444";
    this.blockchainLedger = new Map(); // Simulate blockchain storage
    this.currentBlockNumber = 1000; // Starting block number
  }

  // Simulate storing evidence hash on blockchain
  async storeEvidenceHash(evidenceData) {
    try {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));

      const { fileHash, ipfsHash, caseId, entity, uploadedBy } = evidenceData;

      // Generate transaction hash
      const txData = `${fileHash}${ipfsHash}${caseId}${Date.now()}`;
      const txHash = "0x" + crypto.createHash('sha256').update(txData).digest('hex');

      // Increment block number
      this.currentBlockNumber++;

      // Create block entry
      const blockEntry = {
        txHash,
        blockNumber: this.currentBlockNumber,
        contractAddress: this.contractAddress,
        evidenceHash: fileHash,
        ipfsHash,
        caseId,
        entity,
        uploadedBy,
        timestamp: new Date().toISOString(),
        gasUsed: Math.floor(Math.random() * 50000) + 21000,
        status: 'confirmed'
      };

      // Store in simulated blockchain
      this.blockchainLedger.set(txHash, blockEntry);

      return {
        success: true,
        txHash,
        blockNumber: this.currentBlockNumber,
        contractAddress: this.contractAddress,
        confirmationMessage: "Evidence hash stored on blockchain successfully",
        gasUsed: blockEntry.gasUsed
      };
    } catch (error) {
      console.error('Error storing evidence hash on blockchain:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Retrieve evidence from blockchain by transaction hash
  async getEvidenceByTxHash(txHash) {
    try {
      await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));

      const blockEntry = this.blockchainLedger.get(txHash);
      if (!blockEntry) {
        return {
          success: false,
          error: 'Transaction not found'
        };
      }

      return {
        success: true,
        evidence: blockEntry
      };
    } catch (error) {
      console.error('Error retrieving evidence from blockchain:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get evidence by case ID
  async getEvidenceByCaseId(caseId) {
    try {
      await new Promise(resolve => setTimeout(resolve, 150));

      const evidenceList = [];
      for (const [txHash, blockEntry] of this.blockchainLedger.entries()) {
        if (blockEntry.caseId === caseId) {
          evidenceList.push({ txHash, ...blockEntry });
        }
      }

      return {
        success: true,
        evidenceList,
        count: evidenceList.length
      };
    } catch (error) {
      console.error('Error retrieving evidence by case ID:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Verify evidence integrity on blockchain
  async verifyEvidenceIntegrity(fileHash, txHash) {
    try {
      await new Promise(resolve => setTimeout(resolve, 100));

      const blockEntry = this.blockchainLedger.get(txHash);
      if (!blockEntry) {
        return {
          success: false,
          error: 'Transaction not found'
        };
      }

      const isValid = blockEntry.evidenceHash === fileHash;
      
      return {
        success: true,
        isValid,
        storedHash: blockEntry.evidenceHash,
        providedHash: fileHash,
        blockNumber: blockEntry.blockNumber,
        timestamp: blockEntry.timestamp
      };
    } catch (error) {
      console.error('Error verifying evidence integrity:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get blockchain statistics
  async getBlockchainStats() {
    try {
      const totalTransactions = this.blockchainLedger.size;
      const latestBlock = this.currentBlockNumber;
      
      // Calculate evidence by case
      const caseStats = new Map();
      for (const blockEntry of this.blockchainLedger.values()) {
        const count = caseStats.get(blockEntry.caseId) || 0;
        caseStats.set(blockEntry.caseId, count + 1);
      }

      return {
        success: true,
        stats: {
          totalTransactions,
          latestBlock,
          contractAddress: this.contractAddress,
          caseCount: caseStats.size,
          casesWithEvidence: Array.from(caseStats.entries()).map(([caseId, count]) => ({
            caseId,
            evidenceCount: count
          }))
        }
      };
    } catch (error) {
      console.error('Error getting blockchain stats:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Create comprehensive evidence trail for visualization using chain of custody service
  async getEvidenceTrail(caseId, entity = null) {
    try {
      // Get comprehensive timeline from chain of custody service
      const timelineResult = await chainOfCustodyService.generateTimeline(caseId, entity);
      
      if (!timelineResult.success) {
        return {
          success: false,
          error: timelineResult.error
        };
      }

      // Convert timeline to trail format for backward compatibility
      const trail = timelineResult.timeline.map((event, index) => ({
        step: index + 1,
        type: this.formatEventType(event.type),
        description: event.description,
        icon: event.icon,
        priority: event.priority,
        timestamp: event.timestamp,
        entity: event.entity,
        caseId: event.caseId,
        data: event.data,
        status: this.getEventStatus(event),
        timeGap: event.timeGap
      }));

      return {
        success: true,
        trail,
        caseId,
        entity,
        summary: timelineResult.summary,
        comprehensiveData: timelineResult
      };
    } catch (error) {
      console.error('Error creating comprehensive evidence trail:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get linked evidence trail for multiple entities
  async getLinkedEvidenceTrail(entities, investigationId = null) {
    try {
      const linkedResult = await chainOfCustodyService.generateLinkedTimeline(entities, investigationId);
      
      if (!linkedResult.success) {
        return {
          success: false,
          error: linkedResult.error
        };
      }

      // Convert to trail format
      const trail = linkedResult.timeline.map((event, index) => ({
        step: index + 1,
        type: this.formatEventType(event.type),
        description: event.description,
        icon: event.icon,
        priority: event.priority,
        timestamp: event.timestamp,
        entity: event.entity,
        sourceEntity: event.sourceEntity,
        caseId: event.caseId,
        investigationId: event.investigationId,
        data: event.data,
        status: this.getEventStatus(event)
      }));

      return {
        success: true,
        trail,
        entities,
        investigationId,
        summary: linkedResult.summary,
        comprehensiveData: linkedResult
      };
    } catch (error) {
      console.error('Error creating linked evidence trail:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Helper methods for formatting
  formatEventType(eventType) {
    const typeMap = {
      'report_submitted': 'Report Submitted',
      'evidence_uploaded': 'Evidence Upload',
      'risk_assessment': 'Risk Assessment',
      'ip_traced': 'IP Geolocation',
      'escalation': 'Escalation',
      'verification': 'Verification',
      'action_taken': 'Action Taken'
    };
    return typeMap[eventType] || eventType;
  }

  getEventStatus(event) {
    switch (event.type) {
      case 'evidence_uploaded':
        return event.data?.verificationStatus || 'confirmed';
      case 'escalation':
        return event.data?.success ? 'confirmed' : 'failed';
      case 'verification':
        return event.data?.integrityStatus === 'intact' ? 'confirmed' : 'failed';
      default:
        return 'confirmed';
    }
  }
}

module.exports = new EvidenceContractService();