// Script to verify and fix the default admin user role
const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const User = require('./models/User');

async function fixAdminRole() {
  try {
    console.log('🔍 Checking default admin user...');
    
    const email = process.env.ADMIN_EMAIL || 'aryangupta3103@gmail.com';
    const user = await User.findOne({ email });
    
    if (!user) {
      console.log('❌ Admin user not found');
      return;
    }
    
    console.log(`✅ Found user: ${user.email}`);
    console.log(`📋 Current role: ${user.role}`);
    console.log(`📋 Current permissions:`, user.permissions);
    console.log(`📋 Is active: ${user.isActive}`);
    
    // Check if user has admin role
    if (user.role !== 'admin') {
      console.log('🔧 Fixing user role to admin...');
      user.role = 'admin';
      user.setRolePermissions(); // This will set the correct permissions
      await user.save();
      console.log('✅ User role fixed');
    } else {
      console.log('✅ User already has admin role');
    }
    
    // Verify permissions
    if (!user.hasPermission('evidenceView')) {
      console.log('🔧 Fixing permissions...');
      user.setRolePermissions();
      await user.save();
      console.log('✅ Permissions fixed');
    } else {
      console.log('✅ User already has correct permissions');
    }
    
    console.log('✅ Admin user verification complete');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    mongoose.connection.close();
  }
}

fixAdminRole();