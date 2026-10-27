// controllers/publicController.js
const Wallet = require('../models/Wallet');
const Report = require('../models/Report');

/**
 * @route   GET /api/public/wallet-data/:address
 * @desc    Fetch wallet risk data and report timeline
 */
exports.getPublicWalletInfo = async (req, res) => {
  const { address } = req.params;
  const normalizedAddress = address.toLowerCase();

  console.log("Received address:", normalizedAddress);

  try {
    let wallet = await Wallet.findOne({ address: normalizedAddress });

    // 🆕 If wallet not found, create it with default values
    if (!wallet) {
      wallet = await Wallet.create({
        address: normalizedAddress,
        status: 'Active',
        riskScore: 0,
        reportCount: 0,
      });
    }

    const reports = await Report.find({ entityId: normalizedAddress }).sort({ timestamp: -1 });

    return res.json({
      address: wallet.address,
      status: wallet.status,
      riskScore: wallet.riskScore,
      totalReports: wallet.reportCount,
      lastUpdated: wallet.updatedAt,
      timeline: reports.map(r => ({
        reporter: r.reporterId,
        reason: r.reason,
        severity: r.severity,
        timestamp: r.timestamp,
      }))
    });
  } catch (err) {
    console.error("Error in getPublicWalletInfo:", err);
    res.status(500).json({ error: 'Internal server error' });
  }
};


/**
 * @route   POST /api/public/report
 * @desc    Submit wallet from frontend for risk review
 */
exports.submitPublicWalletReport = async (req, res) => {
  const { wallet } = req.body;
  const normalizedAddress = wallet?.toLowerCase();

  if (!normalizedAddress || !/^0x[a-fA-F0-9]{40}$/.test(normalizedAddress)) {
    return res.status(400).json({ error: 'Valid wallet address is required' });
  }

  try {
    // Prevent duplicate submissions by public
    const existing = await Report.findOne({ entityId: normalizedAddress, source: 'public' });

    if (existing) {
      return res.status(409).json({ error: 'Wallet already submitted for review' });
    }

    // 🆕 Save report
    const newReport = new Report({
      entityId: normalizedAddress,
      reporterId: 'public_user',
      reason: 'Submitted via public risk check',
      severity: 1,
      timestamp: new Date(),
      source: 'public'
    });

    await newReport.save();

    // 🆕 Create or update wallet entry
    const walletDoc = await Wallet.findOneAndUpdate(
      { address: normalizedAddress },
      {
        $setOnInsert: {
          status: 'Active',
          riskScore: 0,
        },
        $inc: {
          reportCount: 1,
        },
        updatedAt: new Date()
      },
      { new: true, upsert: true }
    );

    return res.status(201).json({
      message: 'Wallet submitted successfully',
      reportId: newReport._id,
      wallet: walletDoc
    });

  } catch (err) {
    console.error('Error in submitPublicWalletReport:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
