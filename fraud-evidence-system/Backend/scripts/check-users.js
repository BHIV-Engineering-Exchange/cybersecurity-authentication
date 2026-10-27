/**
 * Check User Accounts in Database
 * Run: node scripts/check-users.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/User');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fraud_evidence';

async function checkUsers() {
  try {
    console.log('📡 Connecting to MongoDB...');
    console.log('   URI:', MONGODB_URI);
    
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('✅ Connected to MongoDB\n');
    console.log('========================================');
    console.log('   USER ACCOUNTS STATUS');
    console.log('========================================\n');
    
    // Get all users
    const users = await User.find({}).select('-password');
    
    if (users.length === 0) {
      console.log('⚠️  NO USERS FOUND IN DATABASE');
      console.log('\n💡 To create test users, run:');
      console.log('   node scripts/create-test-users.js\n');
      return;
    }
    
    console.log(`Total Users: ${users.length}\n`);
    
    // Group by role
    const byRole = {};
    const active = users.filter(u => u.isActive !== false);
    const inactive = users.filter(u => u.isActive === false);
    
    users.forEach(user => {
      const role = user.role || 'unknown';
      if (!byRole[role]) byRole[role] = [];
      byRole[role].push(user);
    });
    
    // Display users by role
    Object.entries(byRole).forEach(([role, roleUsers]) => {
      console.log(`📋 ${role.toUpperCase()} (${roleUsers.length} user${roleUsers.length > 1 ? 's' : ''}):`);
      
      roleUsers.forEach((user, index) => {
        const status = user.isActive !== false ? '✅ Active' : '❌ Inactive';
        const permissions = user.permissions?.length || 0;
        
        console.log(`\n  ${index + 1}. Email: ${user.email}`);
        console.log(`     Name: ${user.name || user.firstName + ' ' + user.lastName || 'N/A'}`);
        console.log(`     Status: ${status}`);
        console.log(`     Permissions: ${permissions}`);
        console.log(`     Created: ${user.createdAt ? user.createdAt.toISOString().split('T')[0] : 'N/A'}`);
        if (user._id) console.log(`     ID: ${user._id}`);
      });
      
      console.log('');
    });
    
    // Summary
    console.log('========================================');
    console.log('   SUMMARY');
    console.log('========================================');
    console.log(`Total Users: ${users.length}`);
    console.log(`Active Users: ${active.length}`);
    console.log(`Inactive Users: ${inactive.length}`);
    console.log('');
    console.log('By Role:');
    Object.entries(byRole).forEach(([role, roleUsers]) => {
      console.log(`  - ${role}: ${roleUsers.length}`);
    });
    console.log('========================================\n');
    
    // Login test info
    console.log('💡 Test Login Credentials:\n');
    
    const testAccounts = {
      'admin@fraud.com': 'admin123',
      'investigator@fraud.com': 'invest123',
      'analyst@fraud.com': 'analyst123',
      'user@fraud.com': 'user123'
    };
    
    Object.entries(testAccounts).forEach(([email, password]) => {
      const user = users.find(u => u.email === email);
      if (user) {
        console.log(`✅ ${email} / ${password} (${user.role})`);
      } else {
        console.log(`❌ ${email} - NOT FOUND (run create-test-users.js)`);
      }
    });
    
    console.log('\n========================================');
    console.log('To create/update test users:');
    console.log('  node scripts/create-test-users.js');
    console.log('========================================\n');
    
  } catch (error) {
    if (error.message.includes('ECONNREFUSED')) {
      console.error('❌ Cannot connect to MongoDB');
      console.log('\n💡 MongoDB is not running. Start it with:');
      console.log('   docker run -d -p 27017:27017 --name mongodb mongo:latest');
      console.log('   OR');
      console.log('   net start MongoDB (if installed as Windows service)\n');
    } else {
      console.error('❌ Error:', error.message);
      console.log('\nStack:', error.stack);
    }
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('📡 MongoDB connection closed');
    }
    process.exit(0);
  }
}

checkUsers();

