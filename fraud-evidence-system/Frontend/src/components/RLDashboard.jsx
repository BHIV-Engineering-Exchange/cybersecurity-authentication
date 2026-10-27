import React, { useState, useEffect } from 'react';
import { 
  Brain, 
  Play, 
  Pause, 
  RotateCcw, 
  TrendingUp, 
  TrendingDown, 
  Activity,
  Target,
  Zap,
  BarChart3,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import axios from 'axios';
import { config } from '../utils/config';
import { authHelper } from '../utils/authHelper';

const RLDashboard = () => {
  const [status, setStatus] = useState(null);
  const [performance, setPerformance] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [selectedTab, setSelectedTab] = useState('overview');
  const [episodes, setEpisodes] = useState(100);
  const [authError, setAuthError] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [loginLoading, setLoginLoading] = useState(false);

  const backendUrl = config.backendUrl;

  // Check if user is authenticated
  const isAuthenticated = () => {
    return authHelper.isAuthenticated();
  };

  useEffect(() => {
    if (isAuthenticated()) {
      fetchStatus();
      fetchPerformance();
      fetchLogs();
    } else {
      setAuthError(true);
      console.warn('User not authenticated - RL dashboard requires login');
    }
  }, []);

  const fetchStatus = async () => {
    try {
      const token = authHelper.getToken();
      if (!authHelper.isTokenValid(token)) {
        console.warn('No valid auth token found for RL status fetch');
        setAuthError(true);
        return;
      }
      const response = await axios.get(`${backendUrl}/api/rl/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStatus(response.data.status);
      setAuthError(false);
    } catch (error) {
      console.error('Failed to fetch RL status:', error);
      if (error.response?.status === 403) {
        console.warn('Authentication failed - token may be expired');
        setAuthError(true);
      }
    }
  };

  const fetchPerformance = async () => {
    try {
      const token = authHelper.getToken();
      if (!authHelper.isTokenValid(token)) {
        console.warn('No valid auth token found for RL performance fetch');
        setAuthError(true);
        return;
      }
      const response = await axios.get(`${backendUrl}/api/rl/performance`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPerformance(response.data.performance);
      setAuthError(false);
    } catch (error) {
      console.error('Failed to fetch RL performance:', error);
      if (error.response?.status === 403) {
        console.warn('Authentication failed - token may be expired');
        setAuthError(true);
      }
    }
  };

  const fetchLogs = async () => {
    try {
      const token = authHelper.getToken();
      if (!authHelper.isTokenValid(token)) {
        console.warn('No valid auth token found for RL logs fetch');
        setAuthError(true);
        return;
      }
      const response = await axios.get(`${backendUrl}/api/rl/logs?type=training`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLogs(response.data.logs.slice(-20)); // Last 20 entries
      setAuthError(false);
    } catch (error) {
      console.error('Failed to fetch RL logs:', error);
      if (error.response?.status === 403) {
        console.warn('Authentication failed - token may be expired');
        setAuthError(true);
      }
    }
  };

  const runSimulation = async () => {
    setSimulating(true);
    try {
      const token = localStorage.getItem('authToken');
      await axios.post(`${backendUrl}/api/rl/simulate`, 
        { episodes: parseInt(episodes) },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Refresh data after simulation
      await Promise.all([fetchStatus(), fetchPerformance(), fetchLogs()]);
      alert(`✅ Simulation completed with ${episodes} episodes!`);
    } catch (error) {
      console.error('Simulation failed:', error);
      alert('❌ Simulation failed: ' + (error.response?.data?.error || error.message));
    } finally {
      setSimulating(false);
    }
  };

  const resetModel = async () => {
    if (!window.confirm('⚠️ Are you sure you want to reset the RL model? This will delete all learned data.')) {
      return;
    }
    
    if (window.prompt('Type "RESET_MODEL" to confirm:') !== 'RESET_MODEL') {
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      await axios.post(`${backendUrl}/api/rl/reset`, 
        { confirm: 'RESET_MODEL' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      await Promise.all([fetchStatus(), fetchPerformance(), fetchLogs()]);
      alert('✅ Model reset successfully!');
    } catch (error) {
      console.error('Reset failed:', error);
      alert('❌ Reset failed: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const getActionColor = (action) => {
    const colors = {
      'no_action': 'bg-gray-100 text-gray-800',
      'monitor': 'bg-blue-100 text-blue-800',
      'investigate': 'bg-yellow-100 text-yellow-800',
      'escalate': 'bg-orange-100 text-orange-800',
      'freeze': 'bg-red-100 text-red-800'
    };
    return colors[action] || 'bg-gray-100 text-gray-800';
  };

  const getOutcomeIcon = (outcome) => {
    switch (outcome) {
      case 'correct': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'missed_threat': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'overreaction': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'insufficient': return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      default: return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  if (!status || !performance) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Handle login
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginLoading(true);
    
    try {
      const result = await authHelper.login(loginForm.email, loginForm.password);
      if (result.success) {
        setAuthError(false);
        // Refresh the dashboard data
        fetchStatus();
        fetchPerformance();
        fetchLogs();
      } else {
        alert('Login failed: ' + result.error);
      }
    } catch (error) {
      alert('Login error: ' + error.message);
    } finally {
      setLoginLoading(false);
    }
  };

  // Show authentication error if user is not logged in
  if (authError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center max-w-md mx-auto">
          <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Authentication Required</h3>
          <p className="text-gray-600 mb-4">Please log in to access the RL Dashboard</p>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="email"
                placeholder="Email"
                value={loginForm.email}
                onChange={(e) => setLoginForm({...loginForm, email: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>
            <div>
              <input
                type="password"
                placeholder="Password"
                value={loginForm.password}
                onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>
            <button 
              type="submit"
              disabled={loginLoading}
              className="w-full bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              {loginLoading ? 'Logging in...' : 'Login'}
            </button>
          </form>
          
          <div className="mt-4 text-sm text-gray-500">
            <p>Default admin credentials:</p>
            <p>Email: admin123@fraud.com</p>
            <p>Password: admin123</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Brain className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">RL Engine Dashboard</h2>
            <p className="text-gray-600">Reinforcement Learning for Fraud Detection</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            status.isTraining ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
          }`}>
            {status.isTraining ? 'Training' : 'Ready'}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { key: 'overview', label: 'Overview', icon: BarChart3 },
            { key: 'performance', label: 'Performance', icon: TrendingUp },
            { key: 'logs', label: 'Training Logs', icon: Activity },
            { key: 'controls', label: 'Controls', icon: Target }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setSelectedTab(tab.key)}
              className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                selectedTab === tab.key
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {selectedTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Episodes</p>
                <p className="text-2xl font-bold text-gray-900">{status.episodes.toLocaleString()}</p>
              </div>
              <div className="p-2 bg-blue-100 rounded-lg">
                <Activity className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Reward</p>
                <p className="text-2xl font-bold text-gray-900">{status.totalReward.toFixed(2)}</p>
              </div>
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Exploration Rate</p>
                <p className="text-2xl font-bold text-gray-900">{(status.epsilon * 100).toFixed(1)}%</p>
              </div>
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Zap className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Model Confidence</p>
                <p className="text-2xl font-bold text-gray-900">{(status.confidence * 100).toFixed(1)}%</p>
              </div>
              <div className="p-2 bg-purple-100 rounded-lg">
                <Target className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Performance Tab */}
      {selectedTab === 'performance' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Average Reward</h3>
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{performance.averageReward.toFixed(3)}</p>
              <p className="text-sm text-gray-600 mt-1">
                Recent: {performance.recentAverageReward.toFixed(3)}
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Model Health</h3>
                <div className={`w-3 h-3 rounded-full ${
                  performance.modelHealth === 'trained' ? 'bg-green-500' : 'bg-yellow-500'
                }`}></div>
              </div>
              <p className="text-2xl font-bold text-gray-900 capitalize">{performance.modelHealth}</p>
              <p className="text-sm text-gray-600 mt-1">
                Status: {performance.improvement}
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Q-Table Size</h3>
                <BarChart3 className="w-5 h-5 text-blue-500" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{performance.qTableSize.toLocaleString()}</p>
              <p className="text-sm text-gray-600 mt-1">State-action pairs</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Learning Progress</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{(performance.explorationRate * 100).toFixed(1)}%</p>
                <p className="text-sm text-gray-600">Exploration</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{(performance.exploitationRate * 100).toFixed(1)}%</p>
                <p className="text-sm text-gray-600">Exploitation</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600">{performance.totalEpisodes}</p>
                <p className="text-sm text-gray-600">Episodes</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-orange-600">{performance.totalReward.toFixed(2)}</p>
                <p className="text-sm text-gray-600">Total Reward</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Logs Tab */}
      {selectedTab === 'logs' && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Recent Training Logs</h3>
            <p className="text-sm text-gray-600">Last 20 training episodes</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Episode
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reward
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Outcome
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Epsilon
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {logs.map((log, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {log.episode}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getActionColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className={`font-medium ${log.reward >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {log.reward > 0 ? '+' : ''}{log.reward.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {getOutcomeIcon(log.outcome)}
                        <span className="text-sm text-gray-900 capitalize">{log.outcome.replace('_', ' ')}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {log.epsilon.toFixed(3)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Controls Tab */}
      {selectedTab === 'controls' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Model Training</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Simulation Episodes
                </label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={episodes}
                  onChange={(e) => setEpisodes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <p className="text-xs text-gray-500 mt-1">Number of training episodes (1-1000)</p>
              </div>
              
              <div className="flex items-center space-x-4">
                <button
                  onClick={runSimulation}
                  disabled={simulating}
                  className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {simulating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Training...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      <span>Run Simulation</span>
                    </>
                  )}
                </button>
                
                <button
                  onClick={resetModel}
                  disabled={loading}
                  className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Reset Model</span>
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Model Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-600">Learning Rate</p>
                <p className="text-lg font-semibold text-gray-900">{status.learningRate}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Last Action</p>
                <p className="text-lg font-semibold text-gray-900">
                  {status.lastAction !== null ? status.lastAction : 'None'}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Model Path</p>
                <p className="text-sm text-gray-900 font-mono">{status.modelPath}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Log Path</p>
                <p className="text-sm text-gray-900 font-mono">{status.logPath}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RLDashboard;
