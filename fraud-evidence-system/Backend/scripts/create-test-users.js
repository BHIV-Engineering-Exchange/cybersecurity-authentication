/**
 * Create Test Users for Login
 * Run: node scripts/create-test-users.js
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fraud_evidence';

const User = require('../models/User');

const testUsers = [
  {
    email: 'admin@fraud.com',
    password: 'admin123',
    name: 'Admin User',
    role: 'admin',
    firstName: 'Admin',
    lastName: 'User'
  },
  {
    email: 'investigator@fraud.com',
    password: 'invest123',
    name: 'Investigator User',
    role: 'investigator',
    firstName: 'Investigator',
    lastName: 'User'
  },
  {
    email: 'analyst@fraud.com',
    password: 'analyst123',
    name: 'Analyst User',
    role: 'analyst',
    firstName: 'Analyst',
    lastName: 'User'
  },
  {
    email: 'user@fraud.com',
    password: 'user123',
    name: 'Basic User',
    role: 'user',
    firstName: 'Basic',
    lastName: 'User'
  }
];

async function createTestUsers() {
  try {
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');
    
    console.log('\n👤 Creating test users...\n');
    
    for (const userData of testUsers) {
      try {
        // Check if user already exists
        const existingUser = await User.findOne({ email: userData.email });
        
        if (existingUser) {
          console.log(`⚠️  User already exists: ${userData.email} (${userData.role})`);
          console.log(`   Updating password to: ${userData.password}`);
          
          // Update password
          const hashedPassword = await bcrypt.hash(userData.password, 10);
          existingUser.password = hashedPassword;
          existingUser.name = userData.name;
          existingUser.role = userData.role;
          existingUser.firstName = userData.firstName;
          existingUser.lastName = userData.lastName;
          existingUser.isActive = true;
          await existingUser.save();
          
          console.log(`   ✅ Updated successfully\n`);
        } else {
          // Hash password
          const hashedPassword = await bcrypt.hash(userData.password, 10);
          
          // Create user
          const user = await User.create({
            email: userData.email,
            password: hashedPassword,
            name: userData.name,
            role: userData.role,
            firstName: userData.firstName,
            lastName: userData.lastName,
            isActive: true,
            permissions: []
          });
          
          console.log(`✅ Created: ${userData.email} (${userData.role})`);
          console.log(`   Password: ${userData.password}`);
          console.log(`   ID: ${user._id}\n`);
        }
      } catch (error) {
        console.error(`❌ Error creating user ${userData.email}:`, error.message);
      }
    }
    
    console.log('========================================');
    console.log('✅ Test users created/updated!');
    console.log('========================================\n');
    console.log('Login Credentials:\n');
    testUsers.forEach(u => {
      console.log(`${u.role.toUpperCase()}:`);
      console.log(`  Email: ${u.email}`);
      console.log(`  Password: ${u.password}\n`);
    });
    console.log('========================================');
    console.log('💡 You can now login at http://localhost:3000');
    console.log('========================================\n');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('📡 MongoDB connection closed');
    process.exit(0);
  }
}

createTestUsers();

