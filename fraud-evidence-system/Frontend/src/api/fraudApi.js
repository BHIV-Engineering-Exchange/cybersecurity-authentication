import apiClient from './apiClient';

// Reports API
export const reportsApi = {
  // Get all reports with filtering and pagination
  getReports: async (params = {}) => {
    const response = await apiClient.get('/api/reports', { params });
    return response.data;
  },

  // Submit a new report
  submitReport: async (reportData) => {
    try {
      const response = await apiClient.post('/api/reports', reportData);
      return { status: response.status, data: response.data };
    } catch (error) {
      if (error.response) {
        // Backend responded with error status (e.g., 429)
        return { status: error.response.status, data: error.response.data };
      }
      // Network error or other issue
      throw error;
    }
  },

  // Submit multiple reports
  submitBatchReports: async (reportsArray) => {
    const response = await apiClient.post('/api/reports', reportsArray);
    return response.data;
  },

  // Export reports to CSV
  exportReports: async (params = {}) => {
    const response = await apiClient.get('/api/reports/export', { 
      params,
      responseType: 'blob' // For file download
    });
    return response.data;
  }
};

// Risk API
export const riskApi = {
  // Get wallet risk assessment
  getWalletRisk: async (entityId) => {
    const response = await apiClient.get(`/api/risk/${entityId}`);
    return response.data;
  },

  // Get risk statistics
  getRiskStats: async () => {
    const response = await apiClient.get('/api/stats/risk');
    return response.data;
  }
};

// Wallet API (public endpoints)
export const walletApi = {
  // Flag a wallet on blockchain
  flagWallet: async (entityId) => {
    const response = await apiClient.post('/api/flag', { entityId });
    return response.data;
  },

  // Get on-chain report count
  getReportCount: async (entityId) => {
    const response = await apiClient.get(`/api/report-count/${entityId}`);
    return response.data;
  },

  // Get events queue
  getEvents: async () => {
    const response = await apiClient.get('/api/events');
    return response.data;
  }
};

// Stats API
export const statsApi = {
  // Get dashboard statistics
  getDashboardStats: async () => {
    const response = await apiClient.get('/api/stats/dashboard');
    return response.data;
  },

  // Get summary statistics
  getSummaryStats: async () => {
    const response = await apiClient.get('/api/reports/summary');
    return response.data;
  }
};

// Auth API
export const authApi = {
  // Login
  login: async (credentials) => {
    const response = await apiClient.post('/api/auth/login', credentials);
    return response.data;
  },

  // Register
  register: async (userData) => {
    const response = await apiClient.post('/api/auth/register', userData);
    return response.data;
  },

  // Verify token
  verifyToken: async () => {
    const response = await apiClient.get('/api/auth/verify');
    return response.data;
  }
};

// Health check
export const healthCheck = async () => {
  const response = await apiClient.get('/health');
  return response.data;
};

// Test connection
export const testConnection = async () => {
  const response = await apiClient.get('/test');
  return response.data;
};
