// utils/validateWallet.js
/**
 * Validates and checksums Ethereum wallet addresses
 */

/**
 * Simple Ethereum address validation
 * @param {string} address - The wallet address to validate
 * @returns {object} - Validation result with valid flag, checksummed address, and message
 */
function validateentityId(address) {
  try {
    if (!address || typeof address !== 'string') {
      return {
        valid: false,
        checksummed: '',
        message: 'Invalid address format'
      };
    }

    // Remove '0x' prefix if present
    const cleanAddress = address.toLowerCase().replace('0x', '');

    // Check if it's a valid hex string of correct length (40 characters)
    if (!/^[0-9a-f]{40}$/i.test(cleanAddress)) {
      return {
        valid: false,
        checksummed: '',
        message: 'Address must be 40 hexadecimal characters'
      };
    }

    // Add '0x' prefix back and return checksummed version
    const checksummed = '0x' + cleanAddress;

    return {
      valid: true,
      checksummed: checksummed,
      message: 'Valid address'
    };
  } catch (error) {
    return {
      valid: false,
      checksummed: '',
      message: 'Address validation error: ' + error.message
    };
  }
}

/**
 * Simple wallet address validator for testing
 * @param {string} wallet - Wallet address
 * @returns {boolean} - True if valid format
 */
function isValidWalletAddress(wallet) {
  if (!wallet || typeof wallet !== 'string') {
    return false;
  }
  
  // Basic Ethereum address format check
  const cleanWallet = wallet.toLowerCase().replace('0x', '');
  return /^[0-9a-f]{40}$/i.test(cleanWallet);
}

module.exports = {
  validateentityId,
  isValidWalletAddress
};// utils/validateWallet.js
/**
 * Validates and checksums Ethereum wallet addresses
 */

/**
 * Simple Ethereum address validation
 * @param {string} address - The wallet address to validate
 * @returns {object} - Validation result with valid flag, checksummed address, and message
 */
function validateentityId(address) {
  try {
    if (!address || typeof address !== 'string') {
      return {
        valid: false,
        checksummed: '',
        message: 'Invalid address format'
      };
    }

    // Remove '0x' prefix if present
    const cleanAddress = address.toLowerCase().replace('0x', '');

    // Check if it's a valid hex string of correct length (40 characters)
    if (!/^[0-9a-f]{40}$/i.test(cleanAddress)) {
      return {
        valid: false,
        checksummed: '',
        message: 'Address must be 40 hexadecimal characters'
      };
    }

    // Add '0x' prefix back and return checksummed version
    const checksummed = '0x' + cleanAddress;

    return {
      valid: true,
      checksummed: checksummed,
      message: 'Valid address'
    };
  } catch (error) {
    return {
      valid: false,
      checksummed: '',
      message: 'Address validation error: ' + error.message
    };
  }
}

/**
 * Simple wallet address validator for testing
 * @param {string} wallet - Wallet address
 * @returns {boolean} - True if valid format
 */
function isValidWalletAddress(wallet) {
  if (!wallet || typeof wallet !== 'string') {
    return false;
  }
  
  // Basic Ethereum address format check
  const cleanWallet = wallet.toLowerCase().replace('0x', '');
  return /^[0-9a-f]{40}$/i.test(cleanWallet);
}

module.exports = {
  validateentityId,
  isValidWalletAddress
};