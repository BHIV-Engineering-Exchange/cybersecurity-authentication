// controllers/flagController.js

const Report = require('../models/Report');
const Risk = require('../models/Risk');

exports.flagWallet = async (req, res) => {
  try {
    const { wallet, reason, severity } = req.body;
    const { email, sub } = req.user; // From Supabase JWT

    if (!wallet || !reason || !severity) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Save flag report
    const newReport = new Report({
      wallet,
      reporterId: sub,
      reporterEmail: email,
      reason,
      severity,
      timestamp: Date.now()
    });

    await newReport.save();

    // Update risk model
    const riskLevel = severity >= 4 ? 'High' : severity >= 2 ? 'Medium' : 'Low';

    const existingRisk = await Risk.findOne({ wallet });

    if (existingRisk) {
      existingRisk.reportCount += 1;
      existingRisk.level = riskLevel;
      existingRisk.updatedAt = Date.now();
      existingRisk.lastFlaggedBy = email;
      await existingRisk.save();
    } else {
      await Risk.create({
        wallet,
        level: riskLevel,
        reportCount: 1,
        lastFlaggedBy: email
      });
    }

    return res.status(200).json({ message: "Wallet flagged successfully" });

  } catch (err) {
    console.error("❌ Error flagging wallet:", err.message);
    return res.status(500).json({ message: "Internal server error" });
  }
};
// controllers/flagController.js
const Report = require('../models/Report');
const Risk = require('../models/Risk');
const { sendEmailAlert } = require('../utils/emailAlert');

exports.flagWallet = async (req, res) => {
  try {
    const { address, reason, severity } = req.body;
    const reporterId = req.user.sub; // Supabase UID from auth middleware

    if (!address || !reason || !severity) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Save to Report collection
    const report = await Report.create({
      address,
      reporterId,
      reason,
      severity,
      timestamp: new Date()
    });

    // Update risk model
    const risk = await Risk.findOneAndUpdate(
      { wallet: address },
      {
        $inc: { reportCount: 1 },
        $set: { updatedAt: new Date() }
      },
      { new: true, upsert: true }
    );

    // Trigger email alert if severity high
    if (severity >= 4) {
      await sendEmailAlert({ address, severity, reporterId });
    }

    res.status(201).json({
      message: 'Wallet flagged successfully',
      report,
      updatedRisk: risk
    });
  } catch (err) {
    console.error('❌ Error in flagWallet:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
