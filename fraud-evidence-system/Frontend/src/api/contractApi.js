// src/contract.js
import { walletApi } from "./api";

/**
 * ✅ Flag a wallet using backend API
 * POST /api/report
 */
export const flagWallet = async (wallet) => {
  try {
    const response = await walletApi.post("/api/report", {
      entityId: wallet,
      reason: "Suspicious activity flagged by user.",
      severity: 3,
    });
    return response.data;
  } catch (error) {
    console.error("❌ Failed to flag wallet:", error.response?.data || error.message);
    throw new Error("Failed to flag wallet");
  }
};

/**
 * ✅ Get report count for a wallet
 * GET /api/public/wallet/:wallet
 */
export const getReportCount = async (wallet) => {
  try {
    const response = await walletApi.get(`/api/public/wallet/${wallet}`);
    return response.data?.reportCount || 0;
  } catch (error) {
    console.error("❌ Failed to fetch report count:", error.response?.data || error.message);
    return 0;
  }
};
