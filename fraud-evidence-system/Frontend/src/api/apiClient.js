import axios from "axios";

const BASE_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:5050";

console.log("🔗 Base URL:", BASE_URL); // ⬅ debug log

const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add auth token to all requests
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("authToken"); // use only one source
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle auth errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 403) {
      console.error("❌ Authentication failed");
    }
    return Promise.reject(error);
  }
);

export default apiClient;
