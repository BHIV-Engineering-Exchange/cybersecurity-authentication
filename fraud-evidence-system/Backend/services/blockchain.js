// services/blockchain.js
const Report = require('../models/Report'); // Mongoose model

/**
 * Flags a wallet by creating a report entry.
 * @param {string} wallet - Wallet address or custom ID
 * @param {string} reporterId - (Optional) Reporter identifier
 * @param {string} reason - (Optional) Reason for flag
 * @param {number} severity - (Optional) Severity level
 */
async function flagWallet(wallet, reporterId = 'system', reason = 'Suspicious activity', severity = 3) {
  // Save report to MongoDB
  const report = await Report.create({
    wallet,
    reporterId,
    reason,
    severity,
    timestamp: Date.now(),
  });

  const count = await Report.countDocuments({ wallet });

  return {
    status: 'success',
    flaggedWallet: wallet,
    reportCount: count,
    txId: `db-log-${report._id}`,
    timestamp: report.timestamp,
  };
}

/**
 * Gets the number of reports for a wallet.
 * @param {string} wallet - Wallet address or custom ID
 */
async function getReportCount(wallet) {
  const count = await Report.countDocuments({ wallet });
  return count;
}

module.exports = {
  flagWallet,
  getReportCount,
};
