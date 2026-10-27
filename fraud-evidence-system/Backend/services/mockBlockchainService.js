// Mock Blockchain Service
// Simulates blockchain anchoring with deterministic responses
// Will be replaced with real smart contract integration later

const crypto = require('crypto');

/**
 * Generate deterministic transaction hash from evidence data
 * Same input always produces same output for testing consistency
 * 
 * @param {string} evidenceId - Evidence ID
 * @param {string} fileHash - File SHA-256 hash
 * @returns {string} - Deterministic transaction hash
 */
function generateDeterministicTxHash(evidenceId, fileHash) {
  // Combine evidenceId and fileHash to create deterministic input
  const input = `${evidenceId}:${fileHash}:anchor`;
  
  // Generate SHA-256 hash and format as Ethereum transaction hash
  const hash = crypto.createHash('sha256').update(input).digest('hex');
  
  // Ethereum tx hashes are 0x followed by 64 hex characters
  return `0x${hash}`;
}

/**
 * Generate deterministic block number from transaction hash
 * Ensures same evidence always gets same block number
 * 
 * @param {string} txHash - Transaction hash
 * @returns {number} - Deterministic block number
 */
function generateDeterministicBlockNumber(txHash) {
  // Use first 8 characters of tx hash to generate block number
  // Block numbers should be realistic (current Ethereum mainnet is ~18M+)
  const hashFragment = txHash.substring(2, 10); // Remove '0x' and take 8 chars
  const baseBlock = 18000000; // Realistic base block number
  const offset = parseInt(hashFragment, 16) % 1000000; // Max offset of 1M blocks
  
  return baseBlock + offset;
}

/**
 * Generate deterministic contract address
 * @returns {string} - Mock contract address
 */
function getMockContractAddress() {
  // Deterministic contract address for all evidence
  return '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';
}

/**
 * Mock blockchain anchoring
 * Simulates storing evidence hash on blockchain
 * 
 * @param {Object} evidenceData - Evidence data to anchor
 * @returns {Promise<Object>} - Anchor result with transaction details
 */
async function anchorEvidence(evidenceData) {
  const { evidenceId, fileHash, caseId, wallet, reporter } = evidenceData;
  
  // Validate input
  if (!evidenceId || !fileHash) {
    return {
      success: false,
      error: 'Evidence ID and file hash are required for anchoring'
    };
  }
  
  // Simulate network delay (blockchain transaction time)
  await new Promise(resolve => setTimeout(resolve, 150));
  
  // Generate deterministic transaction hash
  const txHash = generateDeterministicTxHash(evidenceId, fileHash);
  
  // Generate deterministic block number
  const blockNumber = generateDeterministicBlockNumber(txHash);
  
  // Get contract address
  const contractAddress = getMockContractAddress();
  
  // Generate timestamp (block timestamp)
  const blockTimestamp = new Date().toISOString();
  
  // Calculate gas used (mock)
  const gasUsed = 21000 + Math.floor(fileHash.length * 50); // Base + data
  
  console.log('⛓️  Mock Blockchain Anchor:', {
    evidenceId,
    txHash,
    blockNumber,
    contractAddress
  });
  
  return {
    success: true,
    transaction: {
      txHash,
      blockNumber,
      contractAddress,
      blockTimestamp,
      gasUsed,
      status: 'confirmed',
      confirmations: 12 // Mock confirmations
    },
    evidence: {
      evidenceId,
      fileHash,
      caseId,
      wallet,
      anchoredAt: blockTimestamp
    },
    blockchain: {
      network: 'mock-ethereum',
      chainId: 1337, // Mock chain ID
      explorerUrl: `https://mock-etherscan.io/tx/${txHash}`
    },
    message: 'Evidence hash anchored on mock blockchain'
  };
}

/**
 * Mock blockchain verification
 * Verifies that evidence hash exists on blockchain
 * 
 * @param {Object} verificationData - Data to verify
 * @returns {Promise<Object>} - Verification result
 */
async function verifyEvidence(verificationData) {
  const { evidenceId, fileHash, txHash } = verificationData;
  
  // Validate input
  if (!evidenceId || !fileHash) {
    return {
      success: false,
      error: 'Evidence ID and file hash are required for verification'
    };
  }
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Generate expected transaction hash (should match stored one)
  const expectedTxHash = generateDeterministicTxHash(evidenceId, fileHash);
  const expectedBlockNumber = generateDeterministicBlockNumber(expectedTxHash);
  
  // Check if provided txHash matches expected (if provided)
  const hashMatches = !txHash || txHash === expectedTxHash;
  
  console.log('🔍 Mock Blockchain Verify:', {
    evidenceId,
    expectedTxHash,
    providedTxHash: txHash,
    hashMatches
  });
  
  return {
    success: true,
    verification: {
      isValid: hashMatches,
      evidenceId,
      fileHash,
      onChainData: {
        txHash: expectedTxHash,
        blockNumber: expectedBlockNumber,
        contractAddress: getMockContractAddress(),
        timestamp: new Date().toISOString(),
        status: 'confirmed'
      },
      comparison: {
        expectedTxHash,
        providedTxHash: txHash || null,
        hashMatches
      },
      confirmations: 12
    },
    blockchain: {
      network: 'mock-ethereum',
      chainId: 1337,
      explorerUrl: `https://mock-etherscan.io/tx/${expectedTxHash}`
    },
    message: hashMatches ? 
      'Evidence hash verified on mock blockchain' : 
      'Transaction hash mismatch - possible tampering'
  };
}

/**
 * Get transaction receipt (mock)
 * @param {string} txHash - Transaction hash
 * @returns {Promise<Object>} - Transaction receipt
 */
async function getTransactionReceipt(txHash) {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 80));
  
  const blockNumber = generateDeterministicBlockNumber(txHash);
  
  return {
    success: true,
    receipt: {
      transactionHash: txHash,
      blockNumber,
      blockHash: crypto.createHash('sha256').update(`block:${blockNumber}`).digest('hex'),
      from: '0x' + crypto.randomBytes(20).toString('hex'),
      to: getMockContractAddress(),
      gasUsed: 21000,
      cumulativeGasUsed: 150000,
      status: 1, // 1 = success
      logs: [
        {
          event: 'EvidenceAnchored',
          args: {
            evidenceId: 'mock-id',
            fileHash: txHash.substring(0, 66),
            timestamp: Math.floor(Date.now() / 1000)
          }
        }
      ]
    }
  };
}

/**
 * Get mock blockchain statistics
 * @returns {Promise<Object>} - Blockchain stats
 */
async function getBlockchainStats() {
  return {
    success: true,
    stats: {
      network: 'mock-ethereum',
      chainId: 1337,
      latestBlock: 18542301,
      contractAddress: getMockContractAddress(),
      totalAnchored: 0, // Updated when evidence is anchored
      gasPrice: '20 gwei',
      averageConfirmationTime: '15 seconds',
      status: 'connected'
    },
    timestamp: new Date().toISOString()
  };
}

/**
 * Batch anchor multiple evidence hashes (future enhancement)
 * @param {Array} evidenceList - List of evidence to anchor
 * @returns {Promise<Object>} - Batch anchor result
 */
async function batchAnchorEvidence(evidenceList) {
  const results = [];
  
  for (const evidence of evidenceList) {
    const result = await anchorEvidence(evidence);
    results.push(result);
  }
  
  return {
    success: true,
    batchSize: evidenceList.length,
    results,
    totalGasUsed: results.reduce((sum, r) => sum + (r.transaction?.gasUsed || 0), 0)
  };
}

/**
 * Check if evidence is already anchored
 * @param {string} evidenceId - Evidence ID
 * @param {string} fileHash - File hash
 * @returns {boolean} - Whether evidence can be re-anchored
 */
function canReAnchor(evidenceId, fileHash) {
  // In mock mode, always allow re-anchoring
  // In production, this would check if hash already exists on-chain
  return true;
}

module.exports = {
  anchorEvidence,
  verifyEvidence,
  getTransactionReceipt,
  getBlockchainStats,
  batchAnchorEvidence,
  generateDeterministicTxHash,
  generateDeterministicBlockNumber,
  getMockContractAddress,
  canReAnchor
};

