const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  entityId: { type: String, required: true },   // Wallet address
  txHash: { type: String, required: true },     // Mock hash
  status: { type: String, enum: ['Success', 'Failed'], required: true },
  flaggedBy: { type: String, required: true },  // Supabase user ID (UUID)
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Transaction', transactionSchema);
