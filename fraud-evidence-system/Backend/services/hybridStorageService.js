// services/hybridStorageService.js
const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Handle IPFS import compatibility
let ipfsClient;
try {
  // Try new import style first
  const { create } = require('ipfs-http-client');
  ipfsClient = create;
} catch (error) {
  try {
    // Fallback to older import style
    ipfsClient = require('ipfs-http-client');
  } catch (fallbackError) {
    console.warn('IPFS client not available, using simulation mode');
    ipfsClient = null;
  }
}

class HybridStorageService {
  constructor() {
    // Initialize S3
    this.s3 = new AWS.S3({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION || 'us-east-1'
    });
    
    // Initialize IPFS client (connecting to local or remote IPFS node)
    try {
      if (ipfsClient) {
        this.ipfs = ipfsClient({
          url: process.env.IPFS_API_URL || 'http://localhost:5001'
        });
      } else {
        this.ipfs = null;
        console.warn('IPFS client initialization skipped - using simulation mode');
      }
    } catch (error) {
      console.warn('IPFS client initialization failed, using simulation mode:', error.message);
      this.ipfs = null;
    }
    
    // Local cache configuration - using the specified path
    this.localCacheDir = process.env.LOCAL_CACHE_DIR || path.join(__dirname, '..', 'storage', 'cache');
    this.ensureCacheDir();
    
    // S3 bucket name
    this.s3Bucket = process.env.S3_BUCKET_NAME || 'fraud-evidence-system';
    
    // Storage strategy: local cache + distributed storage
    this.strategy = {
      cache: true,      // Always cache locally for fast access
      ipfs: process.env.ENABLE_IPFS === 'true' && this.ipfs !== null,
      s3: process.env.ENABLE_S3 === 'true'
    };
  }

  ensureCacheDir() {
    if (!fs.existsSync(this.localCacheDir)) {
      fs.mkdirSync(this.localCacheDir, { recursive: true });
    }
  }

  // Generate content-based hash
  generateFileHash(fileBuffer) {
    return crypto.createHash('sha256').update(fileBuffer).digest('hex');
  }

  // Generate unique IPFS-like hash
  generateStorageHash(fileBuffer) {
    const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    return `Qm${hash.substring(0, 44)}`;
  }

  // 1. Set up local cache - Save to local cache (fastest access for investigators)
  saveToLocalCache(fileBuffer, filename) {
    try {
      const localPath = path.join(this.localCacheDir, filename);
      fs.writeFileSync(localPath, fileBuffer);
      return localPath;
    } catch (error) {
      console.error('Local cache storage error:', error);
      throw error;
    }
  }

  // 2. Write to IPFS (decentralized store)
  async saveToIPFS(filepath) {
    if (!this.strategy.ipfs || !this.ipfs) {
      // Return simulated hash if IPFS is disabled
      const fileBuffer = fs.readFileSync(filepath);
      const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
      const ipfsHash = `Qm${hash.substring(0, 44)}`;
      return ipfsHash;
    }

    try {
      const fileBuffer = fs.readFileSync(filepath);
      const result = await this.ipfs.add({
        content: fileBuffer
      });
      return result.cid.toString();
    } catch (error) {
      console.error('IPFS storage error:', error);
      throw error;
    }
  }

  // 3. Write to Amazon S3 (cloud store)
  async saveToS3(filepath, filename) {
    if (!this.strategy.s3) {
      return `s3://${this.s3Bucket}/${filename}`;
    }

    try {
      const fileBuffer = fs.readFileSync(filepath);
      const params = {
        Bucket: this.s3Bucket,
        Key: filename,
        Body: fileBuffer,
        ContentType: 'application/octet-stream'
      };

      const result = await this.s3.upload(params).promise();
      return result.Location;
    } catch (error) {
      console.error('S3 storage error:', error);
      throw error;
    }
  }

  // 4. Hybrid workflow - When a file comes in → Save to local cache → Upload to IPFS → Upload to S3
  async saveFile(fileBuffer, filename) {
    try {
      // First save to local cache for fast access
      const localPath = this.saveToLocalCache(fileBuffer, filename);
      
      // Upload to IPFS (decentralized store)
      const ipfsHash = await this.saveToIPFS(localPath);
      
      // Upload to S3 (cloud store)
      const s3Url = await this.saveToS3(localPath, filename);

      // Store references (local path, IPFS hash, S3 URL)
      return {
        local_path: localPath,
        ipfs_hash: ipfsHash,
        s3_url: s3Url
      };
    } catch (error) {
      console.error('Hybrid storage error:', error);
      throw error;
    }
  }

  // 5. Access logic - First check local cache (fastest). If not available → fallback to S3 or IPFS
  async retrieveFile(filename, ipfsHash = null) {
    try {
      // First check local cache (fastest)
      const localPath = path.join(this.localCacheDir, filename);
      if (fs.existsSync(localPath)) {
        const fileBuffer = fs.readFileSync(localPath);
        return {
          success: true,
          fileBuffer,
          source: 'local_cache'
        };
      }

      // If not available in local cache, try S3
      if (this.strategy.s3) {
        try {
          const params = {
            Bucket: this.s3Bucket,
            Key: filename
          };

          const result = await this.s3.getObject(params).promise();
          // Cache the file locally for future access
          fs.writeFileSync(localPath, result.Body);
          
          return {
            success: true,
            fileBuffer: result.Body,
            source: 's3'
          };
        } catch (s3Error) {
          console.warn('S3 retrieval failed:', s3Error.message);
        }
      }

      // If not available in S3, try IPFS
      if (this.strategy.ipfs && ipfsHash) {
        try {
          const chunks = [];
          for await (const chunk of this.ipfs.cat(ipfsHash)) {
            chunks.push(chunk);
          }
          
          const fileBuffer = Buffer.concat(chunks);
          // Cache the file locally for future access
          fs.writeFileSync(localPath, fileBuffer);
          
          return {
            success: true,
            fileBuffer,
            source: 'ipfs'
          };
        } catch (ipfsError) {
          console.warn('IPFS retrieval failed:', ipfsError.message);
        }
      }

      return { success: false, error: 'File not found in any storage layer' };
    } catch (error) {
      console.error('File retrieval error:', error);
      return { success: false, error: error.message };
    }
  }

  // Store file in local cache
  async storeInCache(fileBuffer, storageHash) {
    try {
      const cachePath = path.join(this.localCacheDir, storageHash);
      fs.writeFileSync(cachePath, fileBuffer);
      
      // Create metadata
      const metadataPath = path.join(this.localCacheDir, `${storageHash}.meta`);
      const metadata = {
        storageHash,
        fileSize: fileBuffer.length,
        cachedAt: new Date().toISOString(),
        accessed: 0
      };
      fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
      
      return { success: true };
    } catch (error) {
      console.error('Cache storage error:', error);
      return { success: false, error: error.message };
    }
  }

  // Store file in S3
  async storeInS3(fileBuffer, storageHash, originalFilename) {
    if (!this.strategy.s3) {
      return { success: false, skipped: true, reason: 'S3 disabled' };
    }

    try {
      const params = {
        Bucket: this.s3Bucket,
        Key: `evidence/${storageHash}`,
        Body: fileBuffer,
        ContentType: 'application/octet-stream',
        Metadata: {
          'original-filename': originalFilename,
          'upload-timestamp': new Date().toISOString(),
          'content-hash': this.generateFileHash(fileBuffer)
        }
      };

      const result = await this.s3.upload(params).promise();
      return {
        success: true,
        s3Key: result.Key,
        s3Url: result.Location,
        etag: result.ETag
      };
    } catch (error) {
      console.error('S3 storage error:', error);
      return { success: false, error: error.message };
    }
  }

  // Store file in IPFS
  async storeInIPFS(fileBuffer, originalFilename) {
    if (!this.strategy.ipfs || !this.ipfs) {
      return { success: false, skipped: true, reason: 'IPFS disabled or unavailable' };
    }

    try {
      // Add file to IPFS
      const result = await this.ipfs.add({
        path: originalFilename,
        content: fileBuffer
      });

      return {
        success: true,
        ipfsHash: result.cid.toString(),
        path: result.path,
        size: result.size
      };
    } catch (error) {
      console.error('IPFS storage error:', error);
      // Fall back to simulated IPFS if real IPFS fails
      return this.simulateIPFS(fileBuffer, originalFilename);
    }
  }

  // Fallback IPFS simulation
  simulateIPFS(fileBuffer, originalFilename) {
    const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    const ipfsHash = `Qm${hash.substring(0, 44)}`;
    
    return {
      success: true,
      ipfsHash,
      path: originalFilename,
      size: fileBuffer.length,
      simulated: true
    };
  }

  // Main storage method with redundancy
  async storeFile(fileBuffer, originalFilename) {
    try {
      const fileHash = this.generateFileHash(fileBuffer);
      const storageHash = this.generateStorageHash(fileBuffer);
      
      const results = {
        fileHash,
        storageHash,
        originalFilename,
        fileSize: fileBuffer.length,
        timestamp: new Date().toISOString(),
        storage: {}
      };

      // 1. Store in local cache (always)
      const cacheResult = await this.storeInCache(fileBuffer, storageHash);
      results.storage.cache = cacheResult;

      // 2. Store in S3 (if enabled)
      const s3Result = await this.storeInS3(fileBuffer, storageHash, originalFilename);
      results.storage.s3 = s3Result;

      // 3. Store in IPFS (if enabled)
      const ipfsResult = await this.storeInIPFS(fileBuffer, originalFilename);
      results.storage.ipfs = ipfsResult;

      // Determine overall success
      const successCount = Object.values(results.storage)
        .filter(r => r.success).length;
      
      results.success = successCount > 0;
      results.redundancy = successCount;
      
      // Extract key hashes for compatibility
      results.ipfsHash = ipfsResult.success ? ipfsResult.ipfsHash : storageHash;
      
      return results;
    } catch (error) {
      console.error('Hybrid storage error:', error);
      return {
        success: false,
        error: error.message,
        fileHash: this.generateFileHash(fileBuffer),
        storageHash: this.generateStorageHash(fileBuffer)
      };
    }
  }

  // Retrieve file with fallback priority: cache -> S3 -> IPFS
  async retrieveFileOld(storageHash, ipfsHash = null) {
    try {
      // 1. Try local cache first (fastest)
      const cacheResult = await this.retrieveFromCache(storageHash);
      if (cacheResult.success) {
        return cacheResult;
      }

      // 2. Try S3 if cache miss
      const s3Result = await this.retrieveFromS3(storageHash);
      if (s3Result.success) {
        // Re-cache for future access
        await this.storeInCache(s3Result.fileBuffer, storageHash);
        return s3Result;
      }

      // 3. Try IPFS as last resort
      if (ipfsHash) {
        const ipfsResult = await this.retrieveFromIPFS(ipfsHash);
        if (ipfsResult.success) {
          // Re-cache for future access
          await this.storeInCache(ipfsResult.fileBuffer, storageHash);
          return ipfsResult;
        }
      }

      return { success: false, error: 'File not found in any storage layer' };
    } catch (error) {
      console.error('File retrieval error:', error);
      return { success: false, error: error.message };
    }
  }

  // Retrieve from local cache
  async retrieveFromCache(storageHash) {
    try {
      const cachePath = path.join(this.localCacheDir, storageHash);
      const metadataPath = path.join(this.localCacheDir, `${storageHash}.meta`);

      if (!fs.existsSync(cachePath)) {
        return { success: false, error: 'Not found in cache' };
      }

      const fileBuffer = fs.readFileSync(cachePath);
      
      // Update access metadata
      if (fs.existsSync(metadataPath)) {
        const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
        metadata.accessed++;
        metadata.lastAccessed = new Date().toISOString();
        fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
      }

      return {
        success: true,
        fileBuffer,
        source: 'cache'
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Retrieve from S3
  async retrieveFromS3(storageHash) {
    if (!this.strategy.s3) {
      return { success: false, error: 'S3 disabled' };
    }

    try {
      const params = {
        Bucket: this.s3Bucket,
        Key: `evidence/${storageHash}`
      };

      const result = await this.s3.getObject(params).promise();
      
      return {
        success: true,
        fileBuffer: result.Body,
        metadata: result.Metadata,
        source: 's3'
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Retrieve from IPFS
  async retrieveFromIPFS(ipfsHash) {
    if (!this.strategy.ipfs) {
      return { success: false, error: 'IPFS disabled' };
    }

    try {
      const chunks = [];
      for await (const chunk of this.ipfs.cat(ipfsHash)) {
        chunks.push(chunk);
      }
      
      const fileBuffer = Buffer.concat(chunks);
      
      return {
        success: true,
        fileBuffer,
        source: 'ipfs'
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Verify file integrity across all storage layers
  async verifyFileIntegrity(storageHash, expectedFileHash, ipfsHash = null) {
    const results = {
      storageHash,
      expectedFileHash,
      verification: {}
    };

    // Check cache
    const cacheFile = await this.retrieveFromCache(storageHash);
    if (cacheFile.success) {
      const actualHash = this.generateFileHash(cacheFile.fileBuffer);
      results.verification.cache = {
        found: true,
        hashMatch: actualHash === expectedFileHash,
        actualHash
      };
    } else {
      results.verification.cache = { found: false };
    }

    // Check S3
    const s3File = await this.retrieveFromS3(storageHash);
    if (s3File.success) {
      const actualHash = this.generateFileHash(s3File.fileBuffer);
      results.verification.s3 = {
        found: true,
        hashMatch: actualHash === expectedFileHash,
        actualHash
      };
    } else {
      results.verification.s3 = { found: false };
    }

    // Check IPFS
    if (ipfsHash) {
      const ipfsFile = await this.retrieveFromIPFS(ipfsHash);
      if (ipfsFile.success) {
        const actualHash = this.generateFileHash(ipfsFile.fileBuffer);
        results.verification.ipfs = {
          found: true,
          hashMatch: actualHash === expectedFileHash,
          actualHash
        };
      } else {
        results.verification.ipfs = { found: false };
      }
    }

    // Overall integrity
    const verifications = Object.values(results.verification)
      .filter(v => v.found);
    
    results.overallIntegrity = verifications.length > 0 && 
      verifications.every(v => v.hashMatch);
    
    results.redundancyCount = verifications.length;

    return results;
  }

  // Cleanup old cache files (optional maintenance)
  async cleanupCache(maxAgeHours = 24 * 7) { // Default: 1 week
    try {
      const files = fs.readdirSync(this.localCacheDir);
      const cutoffTime = Date.now() - (maxAgeHours * 60 * 60 * 1000);
      
      let cleaned = 0;
      
      for (const file of files) {
        if (file.endsWith('.meta')) continue;
        
        const filePath = path.join(this.localCacheDir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.mtime.getTime() < cutoffTime) {
          fs.unlinkSync(filePath);
          
          // Also remove metadata
          const metaPath = path.join(this.localCacheDir, `${file}.meta`);
          if (fs.existsSync(metaPath)) {
            fs.unlinkSync(metaPath);
          }
          
          cleaned++;
        }
      }
      
      return { success: true, cleanedFiles: cleaned };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Get storage statistics
  async getStorageStats() {
    try {
      const cacheFiles = fs.readdirSync(this.localCacheDir)
        .filter(f => !f.endsWith('.meta'));
      
      let totalCacheSize = 0;
      for (const file of cacheFiles) {
        const filePath = path.join(this.localCacheDir, file);
        const stats = fs.statSync(filePath);
        totalCacheSize += stats.size;
      }

      return {
        cache: {
          fileCount: cacheFiles.length,
          totalSize: totalCacheSize,
          directory: this.localCacheDir
        },
        strategy: this.strategy,
        config: {
          s3Bucket: this.s3Bucket,
          ipfsUrl: process.env.IPFS_API_URL || 'http://localhost:5001'
        }
      };
    } catch (error) {
      return { error: error.message };
    }
  }
}

module.exports = new HybridStorageService();