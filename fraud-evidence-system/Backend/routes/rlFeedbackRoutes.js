const express = require("express");
const router = express.Router();
const RLLog = require("../models/RLLog"); // You must create this model

// GET last 10 model decisions
router.get("/", async (req, res) => {
  try {
    const recent = await RLLog.find().sort({ timestamp: -1 }).limit(10);
    res.json(recent);
  } catch (err) {
    console.error("Fetch RL logs failed:", err);
    res.status(500).json({ error: "Failed to load feedback" });
  }
});

// POST feedback (correct/wrong)
router.post("/", async (req, res) => {
  const { decisionId, feedback } = req.body;
  try {
    await RLLog.findByIdAndUpdate(decisionId, {
      $push: { feedbackTrail: { feedback, at: new Date() } },
    });
    res.json({ success: true });
  } catch (err) {
    console.error("RL feedback error:", err);
    res.status(500).json({ error: "Feedback failed" });
  }
});

module.exports = router;
