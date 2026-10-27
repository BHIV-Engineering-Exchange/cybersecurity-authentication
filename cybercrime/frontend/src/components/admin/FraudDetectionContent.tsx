import { useState, useEffect } from "react";
import { Brain, Search, Filter, TrendingUp, AlertTriangle, CheckCircle, XCircle, Loader2, RefreshCw, Eye, Download, BarChart3 } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

import { apiUrl, getAuthHeaders } from "@/lib/api";
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

interface Prediction {
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

interface ModelStatus {
  available: boolean;
  model_type?: string;
  metadata?: any;
  message?: string;
}

export function FraudDetectionContent() {
  const [transactions, setTransactions] = useState<FraudTransaction[]>([]);
  const [predictions, setPredictions] = useState<Map<number, Prediction>>(new Map());
  const [modelStatus, setModelStatus] = useState<ModelStatus | null>(null);
  const [loading, setLoading] = useState(false);
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

  useEffect(() => {
    fetchModelStatus();
    fetchTransactions();
    fetchStats();
  }, []);

  const fetchModelStatus = async () => {
    try {
      const response = await fetch(apiUrl("fraud-predictions/model/status"), { headers: getAuthHeaders() });
      const data = await response.json();
      setModelStatus(data);
    } catch (error) {
      console.error("Error fetching model status:", error);
    }
  };

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const response = await fetch(apiUrl("fraud-transactions/?limit=100"), { headers: getAuthHeaders() });
      const data = await response.json();
      setTransactions(data);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(apiUrl("fraud-transactions/stats"), { headers: getAuthHeaders() });
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const predictTransaction = async (transactionId: number) => {
    try {
      const response = await fetch(apiUrl(`fraud-predictions/predict/${transactionId}`), { headers: getAuthHeaders() });
      const data = await response.json();
      setPredictions(prev => new Map(prev).set(transactionId, data));
    } catch (error) {
      console.error("Error predicting transaction:", error);
      alert("Error predicting transaction. Make sure the model is trained.");
    }
  };

  const predictAllVisible = async () => {
    setLoading(true);
    const visibleIds = filteredTransactions.map(tx => tx.id);
    const predictionsMap = new Map<number, Prediction>();
    
    for (const id of visibleIds) {
      try {
        const response = await fetch(apiUrl(`fraud-predictions/predict/${id}`), { headers: getAuthHeaders() });
        const data = await response.json();
        predictionsMap.set(id, data);
      } catch (error) {
        console.error(`Error predicting transaction ${id}:`, error);
      }
    }
    
    setPredictions(predictionsMap);
    setLoading(false);
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
            <div className="p-3 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-lg border border-purple-500/30">
              <Brain className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h2 className="text-2xl font-mono text-purple-400">Fraud Detection AI</h2>
              <p className="text-sm text-gray-400 font-mono">ML-powered transaction fraud analysis</p>
            </div>
          </div>
          <Button
            onClick={fetchTransactions}
            className="bg-purple-500/20 border border-purple-500/40 text-purple-400 hover:bg-purple-500/30"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Model Status */}
        {modelStatus && (
          <div className={`p-4 rounded-lg border ${modelStatus.available ? "bg-green-500/10 border-green-500/30" : "bg-red-500/10 border-red-500/30"}`}>
            <div className="flex items-center gap-2">
              {modelStatus.available ? (
                <CheckCircle className="w-5 h-5 text-green-400" />
              ) : (
                <XCircle className="w-5 h-5 text-red-400" />
              )}
              <span className={`font-mono text-sm ${modelStatus.available ? "text-green-400" : "text-red-400"}`}>
                {modelStatus.available 
                  ? `Model Ready (${modelStatus.model_type || "Random Forest"})`
                  : modelStatus.message || "Model not available"
                }
              </span>
            </div>
            {modelStatus.available && modelStatus.metadata && (
              <div className="mt-2 text-xs text-gray-400 font-mono">
                Accuracy: {(modelStatus.metadata.metrics?.accuracy * 100).toFixed(2)}% | 
                ROC-AUC: {modelStatus.metadata.metrics?.roc_auc?.toFixed(4)}
              </div>
            )}
          </div>
        )}
      </div>

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
              <p className="text-xs text-gray-400 font-mono mb-1">Fraud Transactions</p>
              <p className="text-2xl font-mono text-red-400">{stats.fraud.toLocaleString()}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-400/50" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-green-500/20 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 font-mono mb-1">Normal Transactions</p>
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

      {/* Filters and Search */}
      <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-purple-500/20 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search transactions..."
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
            <option value="all">All Transactions</option>
            <option value="fraud">Fraud Only</option>
            <option value="normal">Normal Only</option>
          </select>
          <Button
            onClick={predictAllVisible}
            disabled={loading || !modelStatus?.available}
            className="bg-purple-500/20 border border-purple-500/40 text-purple-400 hover:bg-purple-500/30"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Brain className="w-4 h-4 mr-2" />
            )}
            Predict All Visible
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
                <th className="px-4 py-3 text-left text-xs font-mono text-purple-400">Step</th>
                <th className="px-4 py-3 text-left text-xs font-mono text-purple-400">Type</th>
                <th className="px-4 py-3 text-left text-xs font-mono text-purple-400">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-mono text-purple-400">Origin</th>
                <th className="px-4 py-3 text-left text-xs font-mono text-purple-400">Destination</th>
                <th className="px-4 py-3 text-left text-xs font-mono text-purple-400">Actual</th>
                <th className="px-4 py-3 text-left text-xs font-mono text-purple-400">Prediction</th>
                <th className="px-4 py-3 text-left text-xs font-mono text-purple-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-500/10">
              {filteredTransactions.map((tx) => {
                const prediction = predictions.get(tx.id);
                return (
                  <tr
                    key={tx.id}
                    className="hover:bg-purple-500/5 transition-colors cursor-pointer"
                    onClick={() => setSelectedTransaction(tx)}
                  >
                    <td className="px-4 py-3 text-sm font-mono text-gray-300">{tx.id}</td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-400">{tx.step}</td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-300">{tx.type}</td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-300">${tx.amount.toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-400">{tx.nameOrig}</td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-400">{tx.nameDest}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-mono ${getRiskBg(tx.isFraud)} ${getRiskColor(tx.isFraud)}`}>
                        {tx.isFraud === 1 ? "FRAUD" : "NORMAL"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {prediction ? (
                        <div className="flex flex-col gap-1">
                          <span className={`px-2 py-1 rounded text-xs font-mono ${getRiskBg(prediction.prediction.is_fraud)} ${getRiskColor(prediction.prediction.is_fraud)}`}>
                            {prediction.prediction.prediction}
                          </span>
                          <span className="text-xs text-gray-500 font-mono">
                            {(prediction.prediction.fraud_probability * 100).toFixed(1)}%
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
                            predictTransaction(tx.id);
                          }}
                          disabled={!modelStatus?.available}
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-400 font-mono mb-1">Transaction ID</p>
                  <p className="text-sm font-mono text-gray-300">{selectedTransaction.id}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-mono mb-1">Step (Time)</p>
                  <p className="text-sm font-mono text-gray-300">{selectedTransaction.step}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-mono mb-1">Type</p>
                  <p className="text-sm font-mono text-gray-300">{selectedTransaction.type}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-mono mb-1">Amount</p>
                  <p className="text-sm font-mono text-gray-300">${selectedTransaction.amount.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-mono mb-1">Origin</p>
                  <p className="text-sm font-mono text-gray-300">{selectedTransaction.nameOrig}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-mono mb-1">Destination</p>
                  <p className="text-sm font-mono text-gray-300">{selectedTransaction.nameDest}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-mono mb-1">Old Balance (Origin)</p>
                  <p className="text-sm font-mono text-gray-300">${selectedTransaction.oldbalanceOrg.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-mono mb-1">New Balance (Origin)</p>
                  <p className="text-sm font-mono text-gray-300">${selectedTransaction.newbalanceOrig.toFixed(2)}</p>
                </div>
                {selectedTransaction.oldbalanceDest !== null && (
                  <>
                    <div>
                      <p className="text-xs text-gray-400 font-mono mb-1">Old Balance (Dest)</p>
                      <p className="text-sm font-mono text-gray-300">${selectedTransaction.oldbalanceDest.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 font-mono mb-1">New Balance (Dest)</p>
                      <p className="text-sm font-mono text-gray-300">${selectedTransaction.newbalanceDest?.toFixed(2)}</p>
                    </div>
                  </>
                )}
                <div>
                  <p className="text-xs text-gray-400 font-mono mb-1">Actual Label</p>
                  <span className={`px-2 py-1 rounded text-xs font-mono ${getRiskBg(selectedTransaction.isFraud)} ${getRiskColor(selectedTransaction.isFraud)}`}>
                    {selectedTransaction.isFraud === 1 ? "FRAUD" : "NORMAL"}
                  </span>
                </div>
              </div>
              
              {predictions.has(selectedTransaction.id) && (
                <div className="mt-4 p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                  <h4 className="text-sm font-mono text-purple-400 mb-2">AI Prediction</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-xs text-gray-400 font-mono">Prediction:</span>
                      <span className={`text-xs font-mono ${getRiskColor(predictions.get(selectedTransaction.id)!.prediction.is_fraud)}`}>
                        {predictions.get(selectedTransaction.id)!.prediction.prediction}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-gray-400 font-mono">Fraud Probability:</span>
                      <span className="text-xs font-mono text-purple-400">
                        {(predictions.get(selectedTransaction.id)!.prediction.fraud_probability * 100).toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-gray-400 font-mono">Normal Probability:</span>
                      <span className="text-xs font-mono text-green-400">
                        {(predictions.get(selectedTransaction.id)!.prediction.normal_probability * 100).toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-gray-400 font-mono">Confidence:</span>
                      <span className="text-xs font-mono text-cyan-400">
                        {(predictions.get(selectedTransaction.id)!.prediction.confidence * 100).toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-gray-400 font-mono">Match:</span>
                      {predictions.get(selectedTransaction.id)!.match ? (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-400" />
                      )}
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
