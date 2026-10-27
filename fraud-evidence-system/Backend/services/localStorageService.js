// Local Storage Service
// Handles file storage to local filesystem and computes SHA-256 hashes

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const crypto = require('crypto');

// Base uploads directory
const UPLOADS_DIR = path.join(__dirname, '../uploads');

/**
 * Ensure uploads directory exists
 */
async function ensureUploadsDirectory() {
  try {
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
    console.log('✅ Uploads directory ready:', UPLOADS_DIR);
  } catch (error) {
    console.error('❌ Failed to create uploads directory:', error);
    throw error;
  }
}

/**
 * Compute SHA-256 hash of file buffer
 * @param {Buffer} fileBuffer - File buffer
 * @returns {string} - SHA-256 hash in hex format
 */
function computeFileHash(fileBuffer) {
  return crypto.createHash('sha256').update(fileBuffer).digest('hex');
}

/**
 * Generate unique filename with timestamp
 * @param {string} originalFilename - Original filename
 * @param {string} caseId - Case ID
 * @returns {string} - Unique filename
 */
function generateUniqueFilename(originalFilename, caseId) {
  const timestamp = Date.now();
  const ext = path.extname(originalFilename);
  const basename = path.basename(originalFilename, ext);
  const sanitized = basename.replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${caseId}_${timestamp}_${sanitized}${ext}`;
}

/**
 * Get case directory path
 * @param {string} caseId - Case ID
 * @returns {string} - Directory path
 */
function getCaseDirectory(caseId) {
  return path.join(UPLOADS_DIR, caseId);
}

/**
 * Store file locally
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} originalFilename - Original filename
 * @param {string} caseId - Case ID
 * @returns {Promise<Object>} - Storage result
 */
async function storeFile(fileBuffer, originalFilename, caseId) {
  try {
    // Ensure uploads directory exists
    await ensureUploadsDirectory();
    
    // Create case-specific directory
    const caseDir = getCaseDirectory(caseId);
    await fs.mkdir(caseDir, { recursive: true });
    
    // Generate unique filename
    const filename = generateUniqueFilename(originalFilename, caseId);
    const filePath = path.join(caseDir, filename);
    
    // Compute SHA-256 hash
    const fileHash = computeFileHash(fileBuffer);
    
    // Save file to disk
    await fs.writeFile(filePath, fileBuffer);
    
    console.log('✅ File stored locally:', {
      filename,
      path: filePath,
      size: fileBuffer.length,
      hash: fileHash
    });
    
    return {
      success: true,
      filename,
      filePath: filePath,
      relativePath: path.relative(UPLOADS_DIR, filePath),
      fileHash,
      fileSize: fileBuffer.length,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('❌ Error storing file:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Retrieve file from local storage
 * @param {string} filePath - File path
 * @returns {Promise<Object>} - File buffer and metadata
 */
async function retrieveFile(filePath) {
  try {
    const fileBuffer = await fs.readFile(filePath);
    const stats = await fs.stat(filePath);
    
    return {
      success: true,
      fileBuffer,
      fileSize: stats.size,
      modifiedAt: stats.mtime
    };
  } catch (error) {
    console.error('❌ Error retrieving file:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Verify file integrity by recomputing hash
 * @param {string} filePath - File path
 * @param {string} expectedHash - Expected SHA-256 hash
 * @returns {Promise<Object>} - Verification result
 */
async function verifyFileIntegrity(filePath, expectedHash) {
  try {
    const fileBuffer = await fs.readFile(filePath);
    const actualHash = computeFileHash(fileBuffer);
    const isValid = actualHash === expectedHash;
    
    return {
      success: true,
      isValid,
      expectedHash,
      actualHash,
      message: isValid ? 'File integrity verified' : 'File integrity check failed'
    };
  } catch (error) {
    console.error('❌ Error verifying file:', error);
    return {
      success: false,
      error: error.message,
      isValid: false
    };
  }
}

/**
 * Delete file from local storage
 * @param {string} filePath - File path
 * @returns {Promise<Object>} - Deletion result
 */
async function deleteFile(filePath) {
  try {
    await fs.unlink(filePath);
    console.log('✅ File deleted:', filePath);
    
    return {
      success: true,
      message: 'File deleted successfully'
    };
  } catch (error) {
    console.error('❌ Error deleting file:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get storage statistics
 * @returns {Promise<Object>} - Storage stats
 */
async function getStorageStats() {
  try {
    await ensureUploadsDirectory();
    
    let totalFiles = 0;
    let totalSize = 0;
    const caseStats = {};
    
    // Read all case directories
    const caseDirs = await fs.readdir(UPLOADS_DIR);
    
    for (const caseDir of caseDirs) {
      const casePath = path.join(UPLOADS_DIR, caseDir);
      const stats = await fs.stat(casePath);
      
      if (stats.isDirectory()) {
        const files = await fs.readdir(casePath);
        caseStats[caseDir] = files.length;
        totalFiles += files.length;
        
        // Calculate total size
        for (const file of files) {
          const filePath = path.join(casePath, file);
          const fileStats = await fs.stat(filePath);
          totalSize += fileStats.size;
        }
      }
    }
    
    return {
      success: true,
      stats: {
        totalFiles,
        totalSize,
        totalSizeFormatted: formatBytes(totalSize),
        caseCount: Object.keys(caseStats).length,
        caseStats,
        uploadsDirectory: UPLOADS_DIR
      }
    };
  } catch (error) {
    console.error('❌ Error getting storage stats:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Format bytes to human-readable format
 * @param {number} bytes - Bytes
 * @returns {string} - Formatted size
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Initialize uploads directory on module load
ensureUploadsDirectory().catch(console.error);

module.exports = {
  storeFile,
  retrieveFile,
  verifyFileIntegrity,
  deleteFile,
  getStorageStats,
  computeFileHash,
  generateUniqueFilename,
  getCaseDirectory,
  UPLOADS_DIR
};

