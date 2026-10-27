/**
 * Test Login Functionality
 * Quick test to verify login is working
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5050';

async function testLogin() {
  console.log('🧪 Testing Login Functionality...\n');
  
  try {
    // Test 1: Login with admin
    console.log('[Test 1] Testing login endpoint...');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'admin@fraud.com',
      password: 'admin123'
    });
    
    if (loginResponse.data.token) {
      console.log('✅ Login successful!');
      console.log(`   Token: ${loginResponse.data.token.substring(0, 50)}...`);
      
      // Test 2: Verify token
      console.log('\n[Test 2] Testing token verification...');
      const verifyResponse = await axios.get(`${BASE_URL}/api/auth/verify`, {
        headers: {
          'Authorization': `Bearer ${loginResponse.data.token}`
        }
      });
      
      console.log('✅ Token verification successful!');
      console.log(`   User: ${verifyResponse.data.email}`);
      console.log(`   Role: ${verifyResponse.data.role}`);
      console.log(`   Permissions: ${verifyResponse.data.permissions?.length || 0} permissions`);
      
      console.log('\n========================================');
      console.log('✅ ALL LOGIN TESTS PASSED!');
      console.log('========================================\n');
      console.log('You can now login at http://localhost:3000');
      console.log('Credentials: admin@fraud.com / admin123\n');
      
    } else {
      console.log('❌ Login failed - no token received');
    }
    
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ Cannot connect to backend');
      console.log('💡 Make sure backend is running: cd Backend && npm start\n');
    } else if (error.response) {
      console.log('❌ Login failed:');
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Error: ${error.response.data.error}`);
      
      if (error.response.status === 401) {
        console.log('\n💡 This might mean:');
        console.log('   1. Test users not created - Run: node Backend/scripts/create-test-users.js');
        console.log('   2. MongoDB not running - Start MongoDB first');
        console.log('   3. Wrong credentials - Use: admin@fraud.com / admin123\n');
      }
    } else {
      console.log('❌ Error:', error.message);
    }
    process.exit(1);
  }
}

testLogin();

