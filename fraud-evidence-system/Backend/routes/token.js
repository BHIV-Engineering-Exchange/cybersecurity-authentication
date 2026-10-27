const express = require("express");
const router = express.Router();
const { shouldFreezeWallet } = require("../utils/freezeLogic");

router.post("/transfer", async (req, res) => {
  const { from, to, amount } = req.body;

  if (!from || !to || !amount) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const shouldFreeze = await shouldFreezeWallet(to); // custom logic
    return res.json({ shouldFreeze });
  } catch (err) {
    console.error("Transfer enforcement error:", err);
    res.status(500).json({ error: "Internal error" });
  }
});

module.exports = router;
