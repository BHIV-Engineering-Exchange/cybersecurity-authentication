// controllers/enforceController.js
const Wallet = require('../models/Wallet');

exports.freezeWallet = async (req, res) => {
  const { wallet } = req.params;

  try {
    const updated = await Wallet.findOneAndUpdate(
      { address: wallet },
      { status: 'Frozen' },
      { new: true, upsert: true }
    );

    res.json({
      message: `Wallet ${wallet} frozen successfully.`,
      wallet: updated,
    });
  } catch (err) {
    console.error('Freeze failed:', err);
    res.status(500).json({ error: 'Freeze failed' });
  }
};

exports.unfreezeWallet = async (req, res) => {
  const { wallet } = req.params;

  try {
    const updated = await Wallet.findOneAndUpdate(
      { address: wallet },
      { status: 'Active' },
      { new: true }
    );

    res.json({
      message: `Wallet ${wallet} unfrozen successfully.`,
      wallet: updated,
    });
  } catch (err) {
    console.error('Unfreeze failed:', err);
    res.status(500).json({ error: 'Unfreeze failed' });
  }
};
