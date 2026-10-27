//routes/enforce.js
const express = require('express');
const router = express.Router();

const requireAuth = require('../middleware/auth'); // ✅ fixed

const {
  freezeWallet,
  unfreezeWallet,
} = require('../controllers/enforceController');

router.post('/freeze/:wallet', requireAuth, freezeWallet);
router.post('/unfreeze/:wallet', requireAuth, unfreezeWallet);

module.exports = router;
