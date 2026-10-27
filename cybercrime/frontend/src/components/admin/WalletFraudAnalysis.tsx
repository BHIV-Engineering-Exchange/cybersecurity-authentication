import { useState, useEffect } from "react";
import { Brain, Search, AlertTriangle, CheckCircle, TrendingUp, Loader2, Eye, BarChart3 } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

import { apiUrl, getAuthHeaders } from "@/lib/api";
interface FraudAnalysis {
  total_transactions: number;
  fraud_count: number;
  normal_count: number;
  fraud_percentage: number;
  risk_level: string;
  predictions_available: boolean;
  recent_transactions: any[];
}

interface WalletData {
  wallet: {
    id: number;
    address: string;
    label: string | null;
    risk_level: string;
    is_frozen: boolean;
  };
  fraud_analysis: FraudAnalysis | null;
}

export function WalletFraudAnalysis() {
  const [walletAddress, setWalletAddress] = useState("");
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzeWallet = async () => {
    if (!walletAddress.trim()) {
      setError("Please enter a wallet address");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // First try to get wallet data with fraud analysis
      const response = await fetch(apiUrl(`wallets/search/${walletAddress}`), { headers: getAuthHeaders() });
      
      if (!response.ok) {
        // If wallet not found, try fraud transaction analysis directly
        const fraudResponse = await fetch(apiUrl(`wallet-fraud/${walletAddress}/analyze`), { headers: getAuthHeaders() });
        if (fraudResponse.ok) {
          const fraudData = await fraudResponse.json();
          setWalletData({
            wallet: {
              id: 0,
              address: walletAddress,
              label: null,
              risk_level: fraudData.fraud_summary?.risk_level || "UNKNOWN",
              is_frozen: false,
            },
            fraud_analysis: fraudData.found ? {
              total_transactions: fraudData.fraud_summary.total_transactions,
              fraud_count: fraudData.fraud_summary.fraud_count,
              normal_count: fraudData.fraud_summary.normal_count,
              fraud_percentage: fraudData.fraud_summary.fraud_percentage,
              risk_level: fraudData.fraud_summary.risk_level,
              predictions_available: fraudData.model_available,
              recent_transactions: fraudData.transactions || [],
            } : null,
          });
        } else {
          setError("Wallet address not found in transactions");
        }
      } else {
        const data = await response.json();
        setWalletData(data);
      }
    } catch (err: any) {
      setError(err.message || "Error analyzing wallet");
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (riskLevel: string) => {
    const level = riskLevel.toUpperCase();
    if (level.includes("VERY HIGH") || level.includes("CRITICAL")) return "text-red-400";
    if (level.includes("HIGH")) return "text-orange-400";
    if (level.includes("MEDIUM")) return "text-yellow-400";
    return "text-green-400";
  };

  const getRiskBg = (riskLevel: string) => {
    const level = riskLevel.toUpperCase();
    if (level.includes("VERY HIGH") || level.includes("CRITICAL")) return "bg-red-500/20 border-red-500/40";
    if (level.includes("HIGH")) return "bg-orange-500/20 border-orange-500/40";
    if (level.includes("MEDIUM")) return "bg-yellow-500/20 border-yellow-500/40";
    return "bg-green-500/20 border-green-500/40";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-purple-500/20 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-lg border border-purple-500/30">
            <Brain className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h2 className="text-2xl font-mono text-purple-400">Wallet Fraud Analysis</h2>
            <p className="text-sm text-gray-400 font-mono">Analyze wallet addresses using fraud detection AI</p>
          </div>
        </div>

        {/* Search */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Enter wallet address (e.g., 0x742d35... or C1234567890)"
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && analyzeWallet()}
              className="pl-10 bg-gray-900/50 border-gray-700/30 text-gray-300"
            />
          </div>
          <Button
            onClick={analyzeWallet}
            disabled={loading}
            className="bg-purple-500/20 border border-purple-500/40 text-purple-400 hover:bg-purple-500/30"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Brain className="w-4 h-4 mr-2" />
            )}
            Analyze
          </Button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-sm text-red-400 font-mono">{error}</p>
          </div>
        )}
      </div>

      {/* Results */}
      {walletData && (
        <>
          {/* Wallet Info */}
          <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-emerald-500/20 rounded-lg p-6">
            <h3 className="text-lg font-mono text-emerald-400 mb-4">Wallet Information</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-gray-400 font-mono mb-1">Address</p>
                <p className="text-sm font-mono text-gray-300 break-all">{walletData.wallet.address}</p>
              </div>
              {walletData.wallet.label && (
                <div>
                  <p className="text-xs text-gray-400 font-mono mb-1">Label</p>
                  <p className="text-sm font-mono text-gray-300">{walletData.wallet.label}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-400 font-mono mb-1">Risk Level</p>
                <span className={`px-2 py-1 rounded text-xs font-mono ${getRiskBg(walletData.wallet.risk_level)} ${getRiskColor(walletData.wallet.risk_level)}`}>
                  {walletData.wallet.risk_level}
                </span>
              </div>
              <div>
                <p className="text-xs text-gray-400 font-mono mb-1">Status</p>
                <span className={`px-2 py-1 rounded text-xs font-mono ${walletData.wallet.is_frozen ? "bg-red-500/20 border-red-500/40 text-red-400" : "bg-green-500/20 border-green-500/40 text-green-400"}`}>
                  {walletData.wallet.is_frozen ? "FROZEN" : "ACTIVE"}
                </span>
              </div>
            </div>
          </div>

          {/* Fraud Analysis */}
          {walletData.fraud_analysis && (
            <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-purple-500/20 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-mono text-purple-400">Fraud Detection Analysis</h3>
                {walletData.fraud_analysis.predictions_available && (
                  <span className="px-2 py-1 bg-green-500/20 border border-green-500/40 rounded text-xs font-mono text-green-400">
                    AI Model Ready
                  </span>
                )}
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-gradient-to-br from-gray-900/50 to-black/50 border border-purple-500/20 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-400 font-mono mb-1">Total Transactions</p>
                      <p className="text-2xl font-mono text-purple-400">{walletData.fraud_analysis.total_transactions}</p>
                    </div>
                    <BarChart3 className="w-8 h-8 text-purple-400/50" />
                  </div>
                </div>
                <div className="bg-gradient-to-br from-gray-900/50 to-black/50 border border-red-500/20 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-400 font-mono mb-1">Fraud Transactions</p>
                      <p className="text-2xl font-mono text-red-400">{walletData.fraud_analysis.fraud_count}</p>
                    </div>
                    <AlertTriangle className="w-8 h-8 text-red-400/50" />
                  </div>
                </div>
                <div className="bg-gradient-to-br from-gray-900/50 to-black/50 border border-green-500/20 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-400 font-mono mb-1">Normal Transactions</p>
                      <p className="text-2xl font-mono text-green-400">{walletData.fraud_analysis.normal_count}</p>
                    </div>
                    <CheckCircle className="w-8 h-8 text-green-400/50" />
                  </div>
                </div>
                <div className="bg-gradient-to-br from-gray-900/50 to-black/50 border border-orange-500/20 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-400 font-mono mb-1">Fraud Rate</p>
                      <p className="text-2xl font-mono text-orange-400">{walletData.fraud_analysis.fraud_percentage.toFixed(2)}%</p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-orange-400/50" />
                  </div>
                </div>
              </div>

              {/* Risk Level */}
              <div className={`p-4 rounded-lg border ${getRiskBg(walletData.fraud_analysis.risk_level)}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-400 font-mono mb-1">Overall Risk Level</p>
                    <p className={`text-xl font-mono ${getRiskColor(walletData.fraud_analysis.risk_level)}`}>
                      {walletData.fraud_analysis.risk_level}
                    </p>
                  </div>
                  <Brain className={`w-8 h-8 ${getRiskColor(walletData.fraud_analysis.risk_level)}`} />
                </div>
              </div>

              {/* Recent Transactions */}
              {walletData.fraud_analysis.recent_transactions.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-sm font-mono text-purple-400 mb-3">Recent Transactions</h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {walletData.fraud_analysis.recent_transactions.map((tx: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-3 bg-gray-900/50 border border-gray-700/30 rounded-lg"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-mono text-gray-400">Step {tx.step}</span>
                            <span className="text-xs font-mono text-gray-300">{tx.type}</span>
                            <span className="text-xs font-mono text-gray-300">${tx.amount?.toFixed(2)}</span>
                          </div>
                          <span className={`px-2 py-1 rounded text-xs font-mono ${tx.isFraud === 1 ? "bg-red-500/20 border-red-500/40 text-red-400" : "bg-green-500/20 border-green-500/40 text-green-400"}`}>
                            {tx.isFraud === 1 ? "FRAUD" : "NORMAL"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {!walletData.fraud_analysis && (
            <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-yellow-500/20 rounded-lg p-6">
              <p className="text-sm text-yellow-400 font-mono">
                No fraud transaction data found for this wallet address. 
                The wallet may not have any transactions in the fraud detection dataset.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
