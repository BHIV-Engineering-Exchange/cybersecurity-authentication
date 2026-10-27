const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class IPFSSimulator {
  constructor() {
    this.storageDir = path.join(__dirname, '..', 'storage', 'ipfs');
    this.ensureStorageDir();
  }

  ensureStorageDir() {
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }
  }

  // Generate IPFS-like hash (simplified simulation)
  generateIPFSHash(fileBuffer) {
    const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    return `Qm${hash.substring(0, 44)}`; // IPFS-like format
  }

  // Generate SHA-256 hash for blockchain storage
  generateFileHash(fileBuffer) {
    return crypto.createHash('sha256').update(fileBuffer).digest('hex');
  }

  // Store file in simulated IPFS
  async storeFile(fileBuffer, originalFilename) {
    try {
      const ipfsHash = this.generateIPFSHash(fileBuffer);
      const fileHash = this.generateFileHash(fileBuffer);
      
      const filePath = path.join(this.storageDir, ipfsHash);
      fs.writeFileSync(filePath, fileBuffer);

      // Create metadata file
      const metadata = {
        ipfsHash,
        fileHash,
        originalFilename,
        fileSize: fileBuffer.length,
        storedAt: new Date().toISOString(),
        filePath
      };

      const metadataPath = path.join(this.storageDir, `${ipfsHash}.meta`);
      fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

      return {
        success: true,
        ipfsHash,
        fileHash,
        fileSize: fileBuffer.length,
        metadata
      };
    } catch (error) {
      console.error('Error storing file in IPFS simulator:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Retrieve file from simulated IPFS
  async retrieveFile(ipfsHash) {
    try {
      const filePath = path.join(this.storageDir, ipfsHash);
      const metadataPath = path.join(this.storageDir, `${ipfsHash}.meta`);

      if (!fs.existsSync(filePath) || !fs.existsSync(metadataPath)) {
        return { success: false, error: 'File not found' };
      }

      const fileBuffer = fs.readFileSync(filePath);
      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));

      return {
        success: true,
        fileBuffer,
        metadata
      };
    } catch (error) {
      console.error('Error retrieving file from IPFS simulator:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // List all stored files
  async listFiles() {
    try {
      const files = fs.readdirSync(this.storageDir)
        .filter(file => file.endsWith('.meta'))
        .map(file => {
          const metadataPath = path.join(this.storageDir, file);
          const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
          return metadata;
        });

      return { success: true, files };
    } catch (error) {
      console.error('Error listing files:', error);
      return { success: false, error: error.message };
    }
  }

  // Verify file integrity
  async verifyFile(ipfsHash, expectedFileHash) {
    try {
      const result = await this.retrieveFile(ipfsHash);
      if (!result.success) {
        return result;
      }

      const actualFileHash = this.generateFileHash(result.fileBuffer);
      const isValid = actualFileHash === expectedFileHash;

      return {
        success: true,
        isValid,
        actualFileHash,
        expectedFileHash
      };
    } catch (error) {
      console.error('Error verifying file:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new IPFSSimulator();