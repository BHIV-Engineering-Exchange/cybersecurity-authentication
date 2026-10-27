// Backend/test-users.js
// Test user management for RBAC testing

const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcryptjs');

// Test users with different roles
const testUsers = [
  {
    email: 'admin@test.com',
    password: 'AdminPass123!',
    role: 'admin',
    firstName: 'Admin',
    lastName: 'Tester'
  },
  {
    email: 'investigator@test.com',
    password: 'InvestPass123!',
    role: 'investigator',
    firstName: 'Investigator',
    lastName: 'Tester'
  },
  {
    email: 'public@test.com',
    password: 'PublicPass123!',
    role: 'public',
    firstName: 'Public',
    lastName: 'Tester'
  }
];

async function createTestUsers() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/fraud-evidence-system');
    
    console.log('Creating test users...');
    
    for (const userData of testUsers) {
      // Check if user already exists
      const existingUser = await User.findOne({ email: userData.email });
      if (existingUser) {
        console.log(`User ${userData.email} already exists, updating role...`);
        existingUser.role = userData.role;
        existingUser.setRolePermissions();
        await existingUser.save();
        continue;
      }
      
      // Create new user
      const hashedPassword = await bcrypt.hash(userData.password, 12);
      const user = new User({
        email: userData.email,
        password: hashedPassword,
        role: userData.role,
        firstName: userData.firstName,
        lastName: userData.lastName
      });
      
      user.setRolePermissions();
      await user.save();
      console.log(`Created user: ${userData.email} with role: ${userData.role}`);
    }
    
    console.log('Test users created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error creating test users:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  createTestUsers();
}

module.exports = { testUsers, createTestUsers };