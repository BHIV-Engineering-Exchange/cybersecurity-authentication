import { useState, useEffect } from "react";
import { Cpu, Activity, Zap, TrendingUp, BarChart3, Settings, Play, RefreshCw, Loader2, Brain, Target, Award } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

import { apiUrl, getAuthHeaders } from "@/lib/api";
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

export function RLEngineContent() {
  const [stats, setStats] = useState<RLStats | null>(null);
  const [performance, setPerformance] = useState<RLPerformance | null>(null);
  const [loading, setLoading] = useState(false);
  const [training, setTraining] = useState(false);
  const [trainLimit, setTrainLimit] = useState(1000);
  const [trainEpochs, setTrainEpochs] = useState(1);

  const fetchStats = async () => {
    try {
      const response = await fetch(apiUrl("rl-engine/status"), { headers: getAuthHeaders() });
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (err) {
      console.error("Error fetching RL stats:", err);
    }
  };

  const fetchPerformance = async () => {
    try {
      const response = await fetch(apiUrl("rl-engine/performance"), { headers: getAuthHeaders() });
      if (response.ok) {
        const data = await response.json();
        setPerformance(data);
      }
    } catch (err) {
      console.error("Error fetching RL performance:", err);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchPerformance();
    const interval = setInterval(() => {
      fetchStats();
      fetchPerformance();
    }, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const handleTrain = async () => {
    setTraining(true);
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
        fetchStats();
        fetchPerformance();
      } else {
        const error = await response.json();
        alert(`Training failed: ${error.detail || "Unknown error"}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setTraining(false);
    }
  };

  const handleReset = async () => {
    if (!confirm("Are you sure you want to reset the RL model? This will clear all learned Q-values.")) {
      return;
    }

    try {
      const response = await fetch(apiUrl("rl-engine/reset"), {
        method: "POST",
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        alert("RL model reset successfully!");
        fetchStats();
        fetchPerformance();
      } else {
        const error = await response.json();
        alert(`Reset failed: ${error.detail || "Unknown error"}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const metrics = stats ? [
    { 
      label: "Total Predictions", 
      value: stats.total_predictions.toLocaleString(), 
      change: stats.model_loaded ? "Active" : "Not Trained", 
      color: "emerald",
      icon: Brain
    },
    { 
      label: "Accuracy", 
      value: `${stats.accuracy.toFixed(2)}%`, 
      change: stats.correct_predictions > 0 ? `+${stats.correct_predictions} correct` : "No data", 
      color: "cyan",
      icon: Target
    },
    { 
      label: "Average Reward", 
      value: stats.average_reward.toFixed(4), 
      change: stats.total_rewards > 0 ? `${stats.total_rewards} rewards` : "No rewards", 
      color: "purple",
      icon: Award
    },
    { 
      label: "States Learned", 
      value: stats.total_states.toLocaleString(), 
      change: stats.exploration_rate > 0 ? `${(stats.exploration_rate * 100).toFixed(1)}% explore` : "0% explore", 
      color: "orange",
      icon: Cpu
    },
  ] : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent mb-2">
            RL Engine
          </h1>
          <p className="text-gray-500 font-mono text-sm">Q-Learning Fraud Detection System</p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${
            stats?.status === "ready" 
              ? "bg-green-950/30 border-green-500/30" 
              : "bg-purple-950/30 border-purple-500/30"
          }`}>
            <Activity className={`w-4 h-4 ${stats?.status === "ready" ? "text-green-400" : "text-purple-400"} ${stats?.status === "ready" ? "" : "animate-pulse"}`} />
            <span className={`font-mono text-sm ${stats?.status === "ready" ? "text-green-400" : "text-purple-400"}`}>
              {stats?.status === "ready" ? "Ready" : "Loading..."}
            </span>
          </div>
          <Button 
            variant="outline" 
            className="border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 font-mono"
            onClick={handleReset}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Reset Model
          </Button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <div
              key={index}
              className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-emerald-500/20 rounded-lg p-6 hover:border-emerald-500/40 transition-all group"
            >
              <div className="flex items-center justify-between mb-3">
                <Icon className={`w-6 h-6 text-${metric.color}-400`} />
                <span className={`text-xs font-mono px-2 py-1 bg-${metric.color}-950/40 border border-${metric.color}-500/30 rounded text-${metric.color}-400`}>
                  {metric.change}
                </span>
              </div>
              <div className="text-2xl text-gray-100 mb-1">{metric.value}</div>
              <div className="text-sm text-gray-500 font-mono">{metric.label}</div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* RL Performance */}
        <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-emerald-500/20 rounded-lg p-6">
          <h2 className="text-emerald-400 font-mono mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            RL Agent Performance
          </h2>
          {performance ? (
            <div className="space-y-4">
              <div className="p-4 bg-black/40 border border-emerald-500/10 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-300">Overall Accuracy</span>
                  <span className="text-emerald-400 font-mono text-lg">{performance.overall.accuracy.toFixed(2)}%</span>
                </div>
                <div className="w-full h-2 bg-black/50 rounded-full overflow-hidden mt-2">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-400 to-cyan-400 transition-all"
                    style={{ width: `${Math.min(performance.overall.accuracy, 100)}%` }}
                  ></div>
                </div>
              </div>

              <div className="p-4 bg-black/40 border border-emerald-500/10 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-300">Average Reward (Last 100)</span>
                  <span className={`font-mono text-lg ${
                    performance.recent_performance.avg_reward_last_100 > 0 ? "text-green-400" : "text-red-400"
                  }`}>
                    {performance.recent_performance.avg_reward_last_100.toFixed(4)}
                  </span>
                </div>
                <div className="text-xs text-gray-500 font-mono mt-1">
                  {performance.recent_performance.total_recent_predictions} recent predictions
                </div>
              </div>

              <div className="p-4 bg-black/40 border border-emerald-500/10 rounded-lg">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-gray-500 font-mono mb-1">Learning Rate (α)</div>
                    <div className="text-purple-400 font-mono">{performance.learning_parameters.learning_rate}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 font-mono mb-1">Discount Factor (γ)</div>
                    <div className="text-cyan-400 font-mono">{performance.learning_parameters.discount_factor}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 font-mono mb-1">Exploration Rate (ε)</div>
                    <div className="text-orange-400 font-mono">{(performance.learning_parameters.exploration_rate * 100).toFixed(2)}%</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 font-mono mb-1">States in Q-Table</div>
                    <div className="text-emerald-400 font-mono">{performance.overall.total_states.toLocaleString()}</div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
            </div>
          )}
        </div>

        {/* Training Section */}
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-emerald-500/20 rounded-lg p-6">
            <h2 className="text-emerald-400 font-mono mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Train RL Agent
            </h2>
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
                    <label className="text-xs text-gray-400 font-mono mb-1 block">Training Epochs</label>
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
                    onClick={handleTrain}
                    disabled={training}
                    className="w-full bg-purple-500/20 border border-purple-500/40 text-purple-400 hover:bg-purple-500/30"
                  >
                    {training ? (
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

              <div className="p-4 bg-black/40 border border-emerald-500/10 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <span className="text-gray-300 text-sm">Training Info</span>
                </div>
                <div className="text-xs text-gray-500 font-mono space-y-1">
                  <p>• Q-Learning algorithm learns from transaction outcomes</p>
                  <p>• Rewards: +1.0 (correct), -2.0 (missed fraud), -0.5 (false positive)</p>
                  <p>• Exploration rate decays over time (ε-greedy)</p>
                  <p>• Model saves automatically after training</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-emerald-500/20 rounded-lg p-6">
            <h2 className="text-emerald-400 font-mono mb-4">How It Works</h2>
            <div className="space-y-2 text-sm text-gray-400 font-mono">
              <p>1. <span className="text-cyan-400">State</span>: Transaction features (amount, balances, type)</p>
              <p>2. <span className="text-purple-400">Action</span>: Predict normal (0) or fraud (1)</p>
              <p>3. <span className="text-emerald-400">Reward</span>: Based on prediction accuracy</p>
              <p>4. <span className="text-orange-400">Q-Update</span>: Q(s,a) = Q(s,a) + α[r + γ*max(Q(s',a')) - Q(s,a)]</p>
              <p>5. <span className="text-yellow-400">Learning</span>: Agent improves over time</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
