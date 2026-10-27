import axios from "axios";

const BASE_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:5050";

/**
 * ✅ Create a shared axios instance
 */
const walletApi = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * ✅ Attach auth token if available
 */
walletApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("authToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Sample API function
 */
export const fetchOnChainReportCount = async () => {
  try {
    const response = await walletApi.get("/api/reports/onchain-count");
    return response.data.count;
  } catch (error) {
    console.error("❌ Failed to fetch on-chain count:", error);
    throw new Error("Smart contract unavailable.");
  }
};

// ✅ Export the axios instance
export { walletApi };
