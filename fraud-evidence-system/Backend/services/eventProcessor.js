const { getQueue } = require("./eventQueue");
const { sendAlert } = require("./alertService");
const Report = require("../models/Report"); // ✅ Import Report model

function startProcessor() {
  setInterval(async () => {
    const queue = getQueue();
    if (queue.length === 0) return;

    const event = queue.shift();

    // ✅ Insert report into DB (flagged via smart contract)
    try {
      await Report.create({
        wallet: event.wallet,
        reason: event.reason || "Flagged on-chain",
        severity: parseInt(event.riskLevel) || 3,
        riskLevel:
          parseInt(event.riskLevel) >= 4
            ? "high"
            : parseInt(event.riskLevel) === 3
            ? "medium"
            : "low",
        status: "escalated",
        source: "contract", // ✅ Mark as on-chain triggered
        txnHash: event.txHash || null, // Optional: store txn hash if available
        blockNumber: event.blockNumber || null,
        timestamp: event.timestamp ? new Date(event.timestamp * 1000) : new Date(),
      });
    } catch (err) {
      console.error("❌ Failed to insert contract-triggered report:", err);
    }

    // ✅ Only trigger alert if riskLevel is high
    if (parseInt(event.riskLevel) >= 3) {
      await sendAlert(event);
    }
  }, 2000);
}

module.exports = { startProcessor };
