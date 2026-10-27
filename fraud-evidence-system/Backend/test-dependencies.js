// Quick dependency check
console.log('Testing dependencies...');
try {
  require('express');
  require('mongoose');
  require('aws-sdk');
  require('axios');
  require('cors');
  require('multer');
  console.log('✅ All dependencies OK!');
  process.exit(0);
} catch (err) {
  console.error('❌ Missing dependency:', err.message);
  process.exit(1);
}

