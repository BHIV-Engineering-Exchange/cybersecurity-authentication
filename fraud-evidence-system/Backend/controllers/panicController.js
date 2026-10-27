const { sendCombinedAlerts } = require("../utils/alertService"); // 🔔 Add this

exports.panicWallet = async (req, res) => {
  const entityId = req.params.wallet;

  if (!entityId || entityId.length < 10) {
    return res.status(400).json({ error: "Invalid wallet address" });
  }

  try {
    console.log(`[⚠️ PANIC] Wallet ${entityId} marked for shutdown.`);

    const panicLog = await PanicLog.create({
      entity: entityId,
      action: "freeze",
      status: "frozen",
      triggeredBy: req.user?.email || "unknown",
      createdAt: new Date(),
    });

    eventBus.emit("walletFrozen", {
      entity: entityId,
      status: "frozen",
      timestamp: new Date().toISOString(),
    });

    // 🚨 Trigger alert
    await sendCombinedAlerts(entityId, "frozen"); // You can customize this further with actual risk score

    return res.status(200).json({
      status: "success",
      message: `Wallet ${entityId} has been frozen (panic).`,
      log: panicLog,
    });
  } catch (err) {
  console.error("❌ Panic Report Error:", err);  // ADD THIS
  res.status(500).json({ success: false, error: 'Internal server error' });
}

};
