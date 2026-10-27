// src/contract.js
import { walletApi } from "./api"; // Assuming this is your api.js

// ✅ Backend-driven flagWallet
export const flagWallet = async (wallet) => {
  const response = await walletApi.flagWallet(wallet); // POST /api/flag
  return response;
};

// ✅ Backend-driven getReportCount
export const getReportCount = async (wallet) => {
  const count = await walletApi.getReportCount(wallet); // GET /api/report-count/:wallet
  return count;
};
