// routes/escalate.js
const express = require("express");
const router = express.Router();
const axios = require("axios");

// POST /api/escalate
router.post("/", async (req, res) => {
  const { entityId, riskScore } = req.body;

  if (!entityId || typeof riskScore !== "number") {
    return res.status(400).json({ error: "Missing entityId or riskScore" });
  }

  console.log(`🚨 Escalation triggered: ${entityId} with risk ${riskScore}`);

  try {
    const rbiResponse = await axios.post(
      process.env.RBI_WEBHOOK_URL || "http://localhost:5050/api/fake-rbi",
      {
        entityId,
        riskScore,
        escalatedAt: new Date().toISOString(),
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer demo-token", // ✅ Mock token
        },
      }
    );

    return res.status(200).json({
      message: "Escalation forwarded to RBI webhook",
      rbiStatus: rbiResponse.data.status,
    });
  } catch (err) {
    console.error("❌ Failed to forward to RBI:", err.message);
    return res.status(500).json({ error: "Failed to escalate to RBI" });
  }
});

module.exports = router;


