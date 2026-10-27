// scripts/initializeUsers.js
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../models/User');

async function initializeUsers() {
  try {
    console.log('🔄 Initializing users...');
    
    // Connect to MongoDB if not already connected
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('📦 Connected to MongoDB');
    }

    // Initialize Admin User
    const adminEmail = process.env.ADMIN_EMAIL || 'aryangupta3103@gmail.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Aryan&Keval';
    
    let adminUser = await User.findOne({ email: adminEmail });
    if (!adminUser) {
      const hashedAdminPassword = await bcrypt.hash(adminPassword, 10);
      adminUser = new User({
        email: adminEmail,
        password: hashedAdminPassword,
        role: 'admin',
        firstName: 'Admin',
        lastName: 'User',
        isActive: true
      });
      await adminUser.save();
      console.log('✅ Admin user created:', adminEmail);
    } else {
      // Update existing admin user role if needed
      if (adminUser.role !== 'admin') {
        adminUser.role = 'admin';
        await adminUser.save();
        console.log('✅ Admin user role updated:', adminEmail);
      } else {
        console.log('ℹ️ Admin user already exists:', adminEmail);
      }
    }

    // Initialize Investigator User
    const investigatorEmail = process.env.INVESTIGATOR_EMAIL || 'investigator1@example.com';
    const investigatorPassword = process.env.INVESTIGATOR_PASSWORD || 'SecureInv2024!';
    
    let investigatorUser = await User.findOne({ email: investigatorEmail });
    if (!investigatorUser) {
      const hashedInvPassword = await bcrypt.hash(investigatorPassword, 10);
      investigatorUser = new User({
        email: investigatorEmail,
        password: hashedInvPassword,
        role: 'investigator',
        firstName: 'Investigator',
        lastName: 'User',
        isActive: true
      });
      await investigatorUser.save();
      console.log('✅ Investigator user created:', investigatorEmail);
    } else {
      // Update existing investigator user role if needed
      if (investigatorUser.role !== 'investigator') {
        investigatorUser.role = 'investigator';
        await investigatorUser.save();
        console.log('✅ Investigator user role updated:', investigatorEmail);
      } else {
        console.log('ℹ️ Investigator user already exists:', investigatorEmail);
      }
    }

    console.log('🎉 User initialization completed!');
    console.log('👤 Users created/verified:');
    console.log(`   Admin: ${adminEmail} (role: ${adminUser.role})`);
    console.log(`   Investigator: ${investigatorEmail} (role: ${investigatorUser.role})`);
    
  } catch (error) {
    console.error('❌ Error initializing users:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  initializeUsers()
    .then(() => {
      console.log('✅ Initialization complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Initialization failed:', error);
      process.exit(1);
    });
}

module.exports = { initializeUsers };