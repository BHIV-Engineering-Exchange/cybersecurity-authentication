const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const mongoose = require('mongoose');
const User = require('./models/User');

(async () => {
  try {
    console.log('MONGO_URI:', process.env.MONGO_URI);
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const adminEmail = process.env.ADMIN_EMAIL || 'aryangupta3103@gmail.com';
    
    const adminUser = await User.findOne({ email: adminEmail });
    if (adminUser) {
      console.log(`✅ Admin user found: ${adminUser.email}`);
      console.log(`Role: ${adminUser.role}`);
      console.log(`Active: ${adminUser.isActive}`);
    } else {
      console.log('❌ Admin user not found');
    }

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
})();