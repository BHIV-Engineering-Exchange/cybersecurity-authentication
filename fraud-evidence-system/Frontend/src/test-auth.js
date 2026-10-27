// Simple test to verify authentication flow
import axios from 'axios';

async function testAuth() {
  try {
    // Test login
    const loginResponse = await axios.post('http://localhost:5050/api/auth/login', {
      email: 'aryangupta3103@gmail.com',
      password: 'Aryan&Keval'
    });
    
    console.log('Login response:', loginResponse.data);
    
    // Test token verification
    const token = loginResponse.data.token;
    const verifyResponse = await axios.get('http://localhost:5050/api/auth/verify', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('Verify response:', verifyResponse.data);
  } catch (error) {
    console.error('Authentication test failed:', error.response?.data || error.message);
  }
}

testAuth();