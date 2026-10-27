const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
  address: { type: String, required: true, unique: true },
  status: { type: String, enum: ['Active', 'Frozen'], default: 'Active' },
  reportCount: { type: Number, default: 0 },
});

module.exports = mongoose.model('Wallet', walletSchema);
