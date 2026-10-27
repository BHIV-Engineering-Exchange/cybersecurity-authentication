const express = require("express");
const router = express.Router();
const Report = require("../models/Report");
const { publishHighRiskWalletFlaggedEvent } = require("../utils/eventPublisher");
const { logAlert } = require("../utils/logger");
const { sendEmailAlert, sendWebhookAlert } = require("../utils/alertService");

/**
 * PANIC REPORT: Escalates on severe or repeated reports
 */
router.post("/panic/:wallet", async (req, res) => {
  const wallet = req.params.wallet.toLowerCase();
  const { reporterId, reason, severity } = req.body;

  try {
    // 1. Create the report (include entityId)
    const report = await Report.create({
      wallet,
      reporterId,
      reason,
      severity,
      entityId: wallet, // ✅ Fix: Required field
      timestamp: new Date()
    });

    // 2. Count recent reports within last 24 hours
    const recentReports = await Report.countDocuments({
      wallet,
      timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });

    let escalated = false;

    // 3. Escalate if severity high or repeated reports
    if (severity >= 4 || recentReports >= 3) {
      const alert = {
        entityId: wallet,
        reason,
        reporterId,
        severity,
        reportCount24h: recentReports,
        escalatedAt: new Date().toISOString()
      };

      publishHighRiskWalletFlaggedEvent(alert);
      await sendEmailAlert(alert);
      await sendWebhookAlert(alert);
      logAlert("🚨 PANIC REPORT ESCALATED", alert);

      escalated = true;
    }

    res.status(201).json({
      success: true,
      message: "Report logged successfully",
      escalated
    });
  } catch (err) {
    console.error("PANIC route failed:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

module.exports = router;
