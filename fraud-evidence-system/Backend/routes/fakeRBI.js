// routes/fakeRBI.js
const express = require("express");
const router = express.Router();

// Fake RBI webhook receiver
router.post("/", (req, res) => {
  console.log("✅ RBI Webhook received alert:", req.body);
  res.status(200).json({ status: "received", message: "RBI webhook accepted the alert" });
});

module.exports = router;
