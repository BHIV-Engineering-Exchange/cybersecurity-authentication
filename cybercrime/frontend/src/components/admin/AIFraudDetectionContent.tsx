import { useState, useEffect } from "react";
import { Brain, Search, Filter, TrendingUp, AlertTriangle, CheckCircle, XCircle, Loader2, RefreshCw, Eye, BarChart3, Cpu, Zap, Target, Award, Play } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

import { apiUrl, getAuthHeaders } from "@/lib/api";
// ML Model Interfaces
interface FraudTransaction {
  id: number;
  step: number;
  type: string;
  amount: number;
  nameOrig: string;
  oldbalanceOrg: number;
  newbalanceOrig: number;
  nameDest: string;
  oldbalanceDest: number | null;
  newbalanceDest: number | null;
  isFraud: number;
  created_at: string;
}

interface MLPrediction {
  transaction_id: number;
  actual_is_fraud: number;
  prediction: {
    is_fraud: number;
    fraud_probability: number;
    normal_probability: number;
    prediction: string;
    confidence: number;
  };
  match: boolean;
}

interface MLModelStatus {
  available: boolean;
  model_type?: string;
  metadata?: any;
  message?: string;
}

// RL Model Interfaces
interface RLStats {
  status: string;
  model_loaded: boolean;
  total_predictions: number;
  correct_predictions: number;
  accuracy: number;
  average_reward: number;
  total_states: number;
  exploration_rate: number;
  learning_rate: number;
  discount_factor: number;
  total_rewards: number;
}

interface RLPerformance {
  overall: RLStats;
  recent_performance: {
    avg_reward_last_100: number;
    total_recent_predictions: number;
  };
  learning_parameters: {
    learning_rate: number;
    discount_factor: number;
    exploration_rate: number;
  };
}

interface CompareMetrics {
  sample_size: number;
  ml_evaluated: number;
  rl_evaluated: number;
  ml_accuracy: number;
  rl_accuracy: number;
}

export function AIFraudDetectionContent() {
  const [activeTab, setActiveTab] = useState<"ml" | "rl" | "compare">("ml");
  
  // ML State
  const [transactions, setTransactions] = useState<FraudTransaction[]>([]);
  const [mlPredictions, setMlPredictions] = useState<Map<number, MLPrediction>>(new Map());
  const [mlModelStatus, setMlModelStatus] = useState<MLModelStatus | null>(null);
  const [mlLoading, setMlLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterFraud, setFilterFraud] = useState<string>("all");
  const [selectedTransaction, setSelectedTransaction] = useState<FraudTransaction | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    fraud: 0,
    normal: 0,
    fraud_percentage: 0,
    by_type: {} as Record<string, number>
  });

  // RL State
  const [rlStats, setRlStats] = useState<RLStats | null>(null);
  const [rlPerformance, setRlPerformance] = useState<RLPerformance | null>(null);
  const [rlTraining, setRlTraining] = useState(false);
  const [trainLimit, setTrainLimit] = useState(1000);
  const [trainEpochs, setTrainEpochs] = useState(1);
  const [compareMetrics, setCompareMetrics] = useState<CompareMetrics | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareError, setCompareError] = useState<string | null>(null);

  // Fetch ML Data
  useEffect(() => {
    if (activeTab === "ml" || activeTab === "compare") {
      fetchMLModelStatus();
      fetchTransactions();
      fetchStats();
    }
  }, [activeTab]);

  // Fetch RL Data
  useEffect(() => {
    if (activeTab === "rl" || activeTab === "compare") {
      fetchRLStats();
      fetchRLPerformance();
      const interval = setInterval(() => {
        fetchRLStats();
        fetchRLPerformance();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === "compare") {
      runLiveComparison();
    }
  }, [activeTab]);

  const extractApiError = (payload: any): string => {
    if (!payload || typeof payload !== "object") return "Unknown error";
    return payload.error?.message || payload.detail || payload.message || "Unknown error";
  };

  const fetchMLModelStatus = async () => {
    try {
      const response = await fetch(apiUrl("fraud-predictions/model/status"), { headers: getAuthHeaders() });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMlModelStatus({
          available: false,
          message: extractApiError(data),
        });
        return;
      }
      setMlModelStatus(data);
    } catch (error) {
      console.error("Error fetching ML model status:", error);
      setMlModelStatus({
        available: false,
        message: "Unable to fetch ML model status",
      });
    }
  };

  const fetchTransactions = async () => {
    setMlLoading(true);
    try {
      const response = await fetch(apiUrl("fraud-transactions/?limit=100"), { headers: getAuthHeaders() });
      const data = await response.json().catch(() => []);
      if (!response.ok) {
        setTransactions([]);
        return;
      }
      setTransactions(data);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      setTransactions([]);
    } finally {
      setMlLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(apiUrl("fraud-transactions/stats"), { headers: getAuthHeaders() });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data) return;
      setStats({
        total: Number(data.total || 0),
        fraud: Number(data.fraud || 0),
        normal: Number(data.normal || 0),
        fraud_percentage: Number(data.fraud_percentage || 0),
        by_type: (data.by_type || {}) as Record<string, number>,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const fetchRLStats = async () => {
    try {
      const response = await fetch(apiUrl("rl-engine/status"), { headers: getAuthHeaders() });
      if (response.ok) {
        const data = await response.json();
        setRlStats(data);
      }
    } catch (err) {
      console.error("Error fetching RL stats:", err);
    }
  };

  const fetchRLPerformance = async () => {
    try {
      const response = await fetch(apiUrl("rl-engine/performance"), { headers: getAuthHeaders() });
      if (response.ok) {
        const data = await response.json();
        setRlPerformance(data);
      }
    } catch (err) {
      console.error("Error fetching RL performance:", err);
    }
  };

  const runLiveComparison = async () => {
    setCompareLoading(true);
    setCompareError(null);
    try {
      const txRes = await fetch(apiUrl("fraud-transactions/?limit=30"), { headers: getAuthHeaders() });
      const txData = await txRes.json().catch(() => []);
      if (!txRes.ok || !Array.isArray(txData) || txData.length === 0) {
        setCompareMetrics(null);
        setCompareError("No transactions available for comparison");
        return;
      }

      const sample = txData.slice(0, 20) as FraudTransaction[];
      let mlCorrect = 0;
      let rlCorrect = 0;
      let mlEvaluated = 0;
      let rlEvaluated = 0;

      for (const tx of sample) {
        try {
          const mlRes = await fetch(apiUrl(`fraud-predictions/predict/${tx.id}`), { headers: getAuthHeaders() });
          if (mlRes.ok) {
            const mlData = await mlRes.json();
            mlEvaluated += 1;
            if (mlData?.match) mlCorrect += 1;
          }
        } catch {
          // ignore one-off compare failures
        }

        try {
          const rlRes = await fetch(apiUrl(`rl-engine/predict/${tx.id}`), { headers: getAuthHeaders() });
          if (rlRes.ok) {
            const rlData = await rlRes.json();
            rlEvaluated += 1;
            if (rlData?.match) rlCorrect += 1;
          }
        } catch {
          // ignore one-off compare failures
        }
      }

      setCompareMetrics({
        sample_size: sample.length,
        ml_evaluated: mlEvaluated,
        rl_evaluated: rlEvaluated,
        ml_accuracy: mlEvaluated > 0 ? (mlCorrect / mlEvaluated) * 100 : 0,
        rl_accuracy: rlEvaluated > 0 ? (rlCorrect / rlEvaluated) * 100 : 0,
      });
    } catch (error) {
      console.error("Error running live model comparison:", error);
      setCompareMetrics(null);
      setCompareError("Unable to run live model comparison");
    } finally {
      setCompareLoading(false);
    }
  };

  const predictML = async (transactionId: number) => {
    try {
      const response = await fetch(apiUrl(`fraud-predictions/predict/${transactionId}`), { headers: getAuthHeaders() });
      const data = await response.json();
      setMlPredictions(prev => new Map(prev).set(transactionId, data));
    } catch (error) {
      console.error("Error predicting transaction:", error);
      alert("Error predicting transaction. Make sure the model is trained.");
    }
  };

  const predictRL = async (transactionId: number) => {
    try {
      const response = await fetch(apiUrl(`rl-engine/predict/${transactionId}`), { headers: getAuthHeaders() });
      if (response.ok) {
        const data = await response.json();
        // Store RL prediction (we'll use a different map or combine)
        console.log("RL Prediction:", data);
      }
    } catch (error) {
      console.error("Error predicting with RL:", error);
    }
  };

  const handleRLTrain = async () => {
    setRlTraining(true);
    try {
      const response = await fetch(apiUrl("rl-engine/train"), {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          limit: trainLimit,
          epochs: trainEpochs,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Training completed! Trained on ${data.transactions_trained} transactions. Accuracy: ${data.statistics.accuracy}%`);
        fetchRLStats();
        fetchRLPerformance();
      } else {
        const error = await response.json();
        alert(`Training failed: ${error.detail || "Unknown error"}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setRlTraining(false);
    }
  };

  const filteredTransactions = transactions.filter(tx => {
    const matchesSearch = !searchQuery || 
      tx.nameOrig.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.nameDest.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.id.toString().includes(searchQuery);
    
    const matchesType = filterType === "all" || tx.type === filterType;
    const matchesFraud = filterFraud === "all" || 
      (filterFraud === "fraud" && tx.isFraud === 1) ||
      (filterFraud === "normal" && tx.isFraud === 0);
    
    return matchesSearch && matchesType && matchesFraud;
  });

  const getRiskColor = (isFraud: number) => {
    return isFraud === 1 ? "text-red-400" : "text-green-400";
  };

  const getRiskBg = (isFraud: number) => {
    return isFraud === 1 ? "bg-red-500/20 border-red-500/40" : "bg-green-500/20 border-green-500/40";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-purple-500/20 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-purple-500/20 to-cyan-500/20 rounded-lg border border-purple-500/30">
              <Brain className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h2 className="text-2xl font-mono text-purple-400">AI Fraud Detection</h2>
              <p className="text-sm text-gray-400 font-mono">ML & Reinforcement Learning Fraud Analysis</p>
            </div>
          </div>
          <Button
            onClick={() => {
              if (activeTab === "ml" || activeTab === "compare") {
                fetchMLModelStatus();
                fetchStats();
                fetchTransactions();
              }
              if (activeTab === "rl" || activeTab === "compare") {
                fetchRLStats();
                fetchRLPerformance();
              }
            }}
            className="bg-purple-500/20 border border-purple-500/40 text-purple-400 hover:bg-purple-500/30"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-purple-500/20">
          <button
            onClick={() => setActiveTab("ml")}
            className={`px-4 py-2 font-mono text-sm transition-all ${
              activeTab === "ml"
                ? "text-purple-400 border-b-2 border-purple-400"
                : "text-gray-400 hover:text-gray-300"
            }`}
          >
            <Brain className="w-4 h-4 inline mr-2" />
            ML Model
          </button>
          <button
            onClick={() => setActiveTab("rl")}
            className={`px-4 py-2 font-mono text-sm transition-all ${
              activeTab === "rl"
                ? "text-cyan-400 border-b-2 border-cyan-400"
                : "text-gray-400 hover:text-gray-300"
            }`}
          >
            <Cpu className="w-4 h-4 inline mr-2" />
            RL Engine
          </button>
          <button
            onClick={() => setActiveTab("compare")}
            className={`px-4 py-2 font-mono text-sm transition-all ${
              activeTab === "compare"
                ? "text-emerald-400 border-b-2 border-emerald-400"
                : "text-gray-400 hover:text-gray-300"
            }`}
          >
            <BarChart3 className="w-4 h-4 inline mr-2" />
            Compare
          </button>
        </div>
      </div>

      {/* ML Model Tab */}
      {activeTab === "ml" && (
        <>
          {/* Model Status */}
          {mlModelStatus && (
            <div className={`p-4 rounded-lg border ${mlModelStatus.available ? "bg-green-500/10 border-green-500/30" : "bg-red-500/10 border-red-500/30"}`}>
              <div className="flex items-center gap-2">
                {mlModelStatus.available ? (
                  <CheckCircle className="w-5 h-5 text-green-400" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-400" />
                )}
                <span className={`font-mono text-sm ${mlModelStatus.available ? "text-green-400" : "text-red-400"}`}>
                  {mlModelStatus.available 
                    ? `ML Model Ready (${mlModelStatus.model_type || "Unknown"})`
                    : mlModelStatus.message || "Model not available"
                  }
                </span>
                {mlModelStatus.available && mlModelStatus.metadata && (
                  <span className="text-xs text-gray-400 font-mono ml-4">
                    Accuracy: {(mlModelStatus.metadata.metrics?.accuracy * 100).toFixed(2)}% | 
                    ROC-AUC: {mlModelStatus.metadata.metrics?.roc_auc?.toFixed(4)}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-emerald-500/20 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400 font-mono mb-1">Total Transactions</p>
                  <p className="text-2xl font-mono text-emerald-400">{stats.total.toLocaleString()}</p>
                </div>
                <BarChart3 className="w-8 h-8 text-emerald-400/50" />
              </div>
            </div>
            <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-red-500/20 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400 font-mono mb-1">Fraud</p>
                  <p className="text-2xl font-mono text-red-400">{stats.fraud.toLocaleString()}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-400/50" />
              </div>
            </div>
            <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-green-500/20 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400 font-mono mb-1">Normal</p>
                  <p className="text-2xl font-mono text-green-400">{stats.normal.toLocaleString()}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-400/50" />
              </div>
            </div>
            <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-purple-500/20 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400 font-mono mb-1">Fraud Rate</p>
                  <p className="text-2xl font-mono text-purple-400">{stats.fraud_percentage.toFixed(2)}%</p>
                </div>
                <TrendingUp className="w-8 h-8 text-purple-400/50" />
              </div>
            </div>
          </div>

          {stats.total === 0 ? (
            <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-amber-500/30 rounded-lg p-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5" />
                <div>
                  <p className="text-amber-300 font-mono text-sm">No fraud transaction dataset connected.</p>
                  <p className="text-gray-500 font-mono text-xs mt-1">
                    Model artifact is loaded, but `fraud_transactions` currently has 0 rows. Import/seed transaction data to enable predictions.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Filters */}
              <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-purple-500/20 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 bg-gray-900/50 border-gray-700/30 text-gray-300"
                    />
                  </div>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="px-4 py-2 bg-gray-900/50 border border-gray-700/30 rounded-lg text-gray-300 font-mono text-sm"
                  >
                    <option value="all">All Types</option>
                    <option value="CASH_IN">CASH_IN</option>
                    <option value="CASH_OUT">CASH_OUT</option>
                    <option value="DEBIT">DEBIT</option>
                    <option value="PAYMENT">PAYMENT</option>
                    <option value="TRANSFER">TRANSFER</option>
                  </select>
                  <select
                    value={filterFraud}
                    onChange={(e) => setFilterFraud(e.target.value)}
                    className="px-4 py-2 bg-gray-900/50 border border-gray-700/30 rounded-lg text-gray-300 font-mono text-sm"
                  >
                    <option value="all">All</option>
                    <option value="fraud">Fraud Only</option>
                    <option value="normal">Normal Only</option>
                  </select>
                  <Button
                    onClick={() => {
                      filteredTransactions.forEach(tx => predictML(tx.id));
                    }}
                    disabled={mlLoading || !mlModelStatus?.available || filteredTransactions.length === 0}
                    className="bg-purple-500/20 border border-purple-500/40 text-purple-400 hover:bg-purple-500/30"
                  >
                    <Brain className="w-4 h-4 mr-2" />
                    Predict All
                  </Button>
                </div>
              </div>

              {/* Transactions Table */}
              <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-purple-500/20 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-purple-950/30 to-pink-950/30 border-b border-purple-500/20">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-mono text-purple-400">ID</th>
                        <th className="px-4 py-3 text-left text-xs font-mono text-purple-400">Type</th>
                        <th className="px-4 py-3 text-left text-xs font-mono text-purple-400">Amount</th>
                        <th className="px-4 py-3 text-left text-xs font-mono text-purple-400">Actual</th>
                        <th className="px-4 py-3 text-left text-xs font-mono text-purple-400">ML Prediction</th>
                        <th className="px-4 py-3 text-left text-xs font-mono text-purple-400">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-purple-500/10">
                      {filteredTransactions.slice(0, 50).map((tx) => {
                        const prediction = mlPredictions.get(tx.id);
                        return (
                          <tr
                            key={tx.id}
                            className="hover:bg-purple-500/5 transition-colors cursor-pointer"
                            onClick={() => setSelectedTransaction(tx)}
                          >
                            <td className="px-4 py-3 text-sm font-mono text-gray-300">{tx.id}</td>
                            <td className="px-4 py-3 text-sm font-mono text-gray-300">{tx.type}</td>
                            <td className="px-4 py-3 text-sm font-mono text-gray-300">${tx.amount.toFixed(2)}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded text-xs font-mono ${getRiskBg(tx.isFraud)} ${getRiskColor(tx.isFraud)}`}>
                                {tx.isFraud === 1 ? "FRAUD" : "NORMAL"}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              {prediction ? (
                                <div className="flex items-center gap-2">
                                  <span className={`px-2 py-1 rounded text-xs font-mono ${getRiskBg(prediction.prediction.is_fraud)} ${getRiskColor(prediction.prediction.is_fraud)}`}>
                                    {prediction.prediction.prediction}
                                  </span>
                                  {prediction.match ? (
                                    <CheckCircle className="w-3 h-3 text-green-400" />
                                  ) : (
                                    <XCircle className="w-3 h-3 text-red-400" />
                                  )}
                                </div>
                              ) : (
                                <Button
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    predictML(tx.id);
                                  }}
                                  disabled={!mlModelStatus?.available}
                                  className="bg-purple-500/20 border border-purple-500/40 text-purple-400 hover:bg-purple-500/30 text-xs"
                                >
                                  Predict
                                </Button>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <Button
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedTransaction(tx);
                                }}
                                className="bg-gray-800/50 border border-gray-700/30 text-gray-300 hover:bg-gray-700/50"
                              >
                                <Eye className="w-3 h-3" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* RL Engine Tab */}
      {activeTab === "rl" && (
        <>
          {/* RL Status */}
          <div className={`p-4 rounded-lg border ${rlStats?.status === "ready" ? "bg-green-500/10 border-green-500/30" : "bg-yellow-500/10 border-yellow-500/30"}`}>
            <div className="flex items-center gap-2">
              <Cpu className={`w-5 h-5 ${rlStats?.status === "ready" ? "text-green-400" : "text-yellow-400"}`} />
              <span className={`font-mono text-sm ${rlStats?.status === "ready" ? "text-green-400" : "text-yellow-400"}`}>
                {rlStats?.status === "ready" ? "RL Engine Ready" : "RL Engine Loading..."}
              </span>
            </div>
          </div>

          {/* RL Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {rlStats && [
              { label: "Predictions", value: rlStats.total_predictions.toLocaleString(), color: "emerald", icon: Brain },
              { label: "Accuracy", value: `${rlStats.accuracy.toFixed(2)}%`, color: "cyan", icon: Target },
              { label: "Avg Reward", value: rlStats.average_reward.toFixed(4), color: "purple", icon: Award },
              { label: "States", value: rlStats.total_states.toLocaleString(), color: "orange", icon: Cpu },
            ].map((metric, idx) => {
              const Icon = metric.icon;
              return (
                <div key={idx} className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-emerald-500/20 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Icon className={`w-6 h-6 text-${metric.color}-400`} />
                  </div>
                  <div className="text-2xl font-mono text-gray-100 mb-1">{metric.value}</div>
                  <div className="text-xs text-gray-500 font-mono">{metric.label}</div>
                </div>
              );
            })}
          </div>

          {/* RL Performance & Training */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-emerald-500/20 rounded-lg p-6">
              <h3 className="text-emerald-400 font-mono mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Performance
              </h3>
              {rlPerformance ? (
                <div className="space-y-4">
                  <div className="p-4 bg-black/40 border border-emerald-500/10 rounded-lg">
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-300">Accuracy</span>
                      <span className="text-emerald-400 font-mono">{rlPerformance.overall.accuracy.toFixed(2)}%</span>
                    </div>
                    <div className="w-full h-2 bg-black/50 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-400 to-cyan-400"
                        style={{ width: `${Math.min(rlPerformance.overall.accuracy, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="p-4 bg-black/40 border border-emerald-500/10 rounded-lg">
                    <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                      <div>
                        <div className="text-gray-500 mb-1">Learning Rate</div>
                        <div className="text-purple-400">{rlPerformance.learning_parameters.learning_rate}</div>
                      </div>
                      <div>
                        <div className="text-gray-500 mb-1">Discount Factor</div>
                        <div className="text-cyan-400">{rlPerformance.learning_parameters.discount_factor}</div>
                      </div>
                      <div>
                        <div className="text-gray-500 mb-1">Exploration</div>
                        <div className="text-orange-400">{(rlPerformance.learning_parameters.exploration_rate * 100).toFixed(1)}%</div>
                      </div>
                      <div>
                        <div className="text-gray-500 mb-1">Avg Reward</div>
                        <div className={`${rlPerformance.recent_performance.avg_reward_last_100 > 0 ? "text-green-400" : "text-red-400"}`}>
                          {rlPerformance.recent_performance.avg_reward_last_100.toFixed(4)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
                </div>
              )}
            </div>

            <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-emerald-500/20 rounded-lg p-6">
              <h3 className="text-emerald-400 font-mono mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Train RL Agent
              </h3>
              <div className="space-y-4">
                <div className="p-4 bg-gradient-to-r from-purple-950/40 to-cyan-950/40 border border-purple-500/30 rounded-lg">
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-gray-400 font-mono mb-1 block">Transaction Limit</label>
                      <Input
                        type="number"
                        value={trainLimit}
                        onChange={(e) => setTrainLimit(parseInt(e.target.value) || 1000)}
                        className="bg-black/40 border-gray-700/30 text-gray-300"
                        min={1}
                        max={10000}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 font-mono mb-1 block">Epochs</label>
                      <Input
                        type="number"
                        value={trainEpochs}
                        onChange={(e) => setTrainEpochs(parseInt(e.target.value) || 1)}
                        className="bg-black/40 border-gray-700/30 text-gray-300"
                        min={1}
                        max={10}
                      />
                    </div>
                    <Button
                      onClick={handleRLTrain}
                      disabled={rlTraining}
                      className="w-full bg-purple-500/20 border border-purple-500/40 text-purple-400 hover:bg-purple-500/30"
                    >
                      {rlTraining ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Training...
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 mr-2" />
                          Start Training
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Compare Tab */}
      {activeTab === "compare" && (
        <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-emerald-500/20 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-emerald-400 font-mono">Live Model Comparison</h3>
            <Button
              onClick={runLiveComparison}
              disabled={compareLoading}
              className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/30"
            >
              {compareLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              Re-run
            </Button>
          </div>
          {compareError && (
            <div className="mb-4 p-3 rounded border border-red-500/30 bg-red-500/10 text-red-300 font-mono text-xs">
              {compareError}
            </div>
          )}
          {compareMetrics && (
            <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="p-3 bg-black/40 border border-emerald-500/20 rounded">
                <p className="text-gray-500 font-mono text-xs">Sample Size</p>
                <p className="text-emerald-400 font-mono text-lg">{compareMetrics.sample_size}</p>
              </div>
              <div className="p-3 bg-black/40 border border-purple-500/20 rounded">
                <p className="text-gray-500 font-mono text-xs">ML Accuracy</p>
                <p className="text-purple-400 font-mono text-lg">{compareMetrics.ml_accuracy.toFixed(2)}%</p>
              </div>
              <div className="p-3 bg-black/40 border border-cyan-500/20 rounded">
                <p className="text-gray-500 font-mono text-xs">RL Accuracy</p>
                <p className="text-cyan-400 font-mono text-lg">{compareMetrics.rl_accuracy.toFixed(2)}%</p>
              </div>
              <div className="p-3 bg-black/40 border border-amber-500/20 rounded">
                <p className="text-gray-500 font-mono text-xs">Winner</p>
                <p className="text-amber-300 font-mono text-lg">
                  {compareMetrics.ml_accuracy === compareMetrics.rl_accuracy
                    ? "Tie"
                    : compareMetrics.ml_accuracy > compareMetrics.rl_accuracy
                      ? "ML"
                      : "RL"}
                </p>
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
              <h4 className="text-purple-400 font-mono mb-3">ML Model ({mlModelStatus?.model_type || "Unknown"})</h4>
              {mlModelStatus?.available ? (
                <div className="space-y-2 text-sm font-mono">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Status:</span>
                    <span className="text-green-400">Ready</span>
                  </div>
                  {mlModelStatus.metadata && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Accuracy:</span>
                        <span className="text-purple-400">{(mlModelStatus.metadata.metrics?.accuracy * 100).toFixed(2)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">ROC-AUC:</span>
                        <span className="text-purple-400">{mlModelStatus.metadata.metrics?.roc_auc?.toFixed(4)}</span>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <p className="text-red-400 font-mono text-sm">Not Available</p>
              )}
            </div>
            <div className="p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
              <h4 className="text-cyan-400 font-mono mb-3">RL Engine (Q-Learning)</h4>
              {rlStats?.status === "ready" ? (
                <div className="space-y-2 text-sm font-mono">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Status:</span>
                    <span className="text-green-400">Ready</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Accuracy:</span>
                    <span className="text-cyan-400">{rlStats.accuracy.toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Avg Reward:</span>
                    <span className="text-cyan-400">{rlStats.average_reward.toFixed(4)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">States Learned:</span>
                    <span className="text-cyan-400">{rlStats.total_states.toLocaleString()}</span>
                  </div>
                </div>
              ) : (
                <p className="text-yellow-400 font-mono text-sm">Not Trained</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Transaction Detail Modal */}
      {selectedTransaction && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-gray-900/95 to-black/95 backdrop-blur-xl border border-purple-500/30 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-mono text-purple-400">Transaction Details</h3>
              <Button
                onClick={() => setSelectedTransaction(null)}
                className="bg-gray-800/50 border border-gray-700/30 text-gray-300"
              >
                Close
              </Button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm font-mono">
                <div>
                  <p className="text-gray-400 mb-1">ID</p>
                  <p className="text-gray-300">{selectedTransaction.id}</p>
                </div>
                <div>
                  <p className="text-gray-400 mb-1">Type</p>
                  <p className="text-gray-300">{selectedTransaction.type}</p>
                </div>
                <div>
                  <p className="text-gray-400 mb-1">Amount</p>
                  <p className="text-gray-300">${selectedTransaction.amount.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-gray-400 mb-1">Actual</p>
                  <span className={`px-2 py-1 rounded text-xs ${getRiskBg(selectedTransaction.isFraud)} ${getRiskColor(selectedTransaction.isFraud)}`}>
                    {selectedTransaction.isFraud === 1 ? "FRAUD" : "NORMAL"}
                  </span>
                </div>
              </div>
              {mlPredictions.has(selectedTransaction.id) && (
                <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                  <h4 className="text-purple-400 font-mono mb-2">ML Prediction</h4>
                  <div className="space-y-1 text-xs font-mono">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Prediction:</span>
                      <span className={getRiskColor(mlPredictions.get(selectedTransaction.id)!.prediction.is_fraud)}>
                        {mlPredictions.get(selectedTransaction.id)!.prediction.prediction}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Confidence:</span>
                      <span className="text-purple-400">
                        {(mlPredictions.get(selectedTransaction.id)!.prediction.confidence * 100).toFixed(2)}%
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
