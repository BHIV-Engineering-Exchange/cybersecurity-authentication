// Authentication helper utilities
export const authHelper = {
  // Check if user is authenticated
  isAuthenticated: () => {
    const token = localStorage.getItem('authToken');
    return token && token !== 'null' && token !== 'undefined' && token.length > 10;
  },

  // Get the current token
  getToken: () => {
    return localStorage.getItem('authToken');
  },

  // Clear authentication
  clearAuth: () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
  },

  // Set authentication token
  setToken: (token) => {
    localStorage.setItem('authToken', token);
  },

  // Check if token is valid (basic check)
  isTokenValid: (token) => {
    if (!token || token === 'null' || token === 'undefined') {
      return false;
    }
    
    try {
      // Basic JWT structure check (header.payload.signature)
      const parts = token.split('.');
      return parts.length === 3;
    } catch (error) {
      return false;
    }
  },

  // Login function
  login: async (email, password) => {
    try {
      const response = await fetch('http://localhost:5050/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.token) {
          authHelper.setToken(data.token);
          return { success: true, token: data.token };
        }
      }
      
      return { success: false, error: 'Login failed' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};

export default authHelper;
