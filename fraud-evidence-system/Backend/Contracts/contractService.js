// contractService.js
const axios = require("axios");

// RPC base URL
const RPC_URL = "http://localhost:8080";
// Contract address from your deployment info
const CONTRACT_ADDRESS = "tbd"; // replace with the full address

/**
 * Get contract metadata (name, symbol, decimals)
 */
async function getMetadata() {
  const url = `${RPC_URL}/contracts/${CONTRACT_ADDRESS}/metadata`;
  const response = await axios.get(url);
  return response.data;
}

async function getSupply() {
  const url = `${RPC_URL}/contracts/${CONTRACT_ADDRESS}/supply`;
  const response = await axios.get(url);
  return response.data;
}

async function flagWallet(entityId, reasonCode) {
  const url = `${RPC_URL}/contracts/${CONTRACT_ADDRESS}/flag-wallet`;
  const response = await axios.post(url, {
    wallet: entityId,
    reason: reasonCode
  });
  return response.data;
}

async function getReportCount(entityId) {
  const url = `${RPC_URL}/contracts/${CONTRACT_ADDRESS}/report-count`;
  const response = await axios.get(url, {
    params: { wallet: entityId }
  });
  return response.data;
}

module.exports = {
  getMetadata,
  getSupply,
  flagWallet,
  getReportCount
};
