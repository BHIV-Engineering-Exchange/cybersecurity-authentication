// src/Pages/PublicDashboard.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const PublicDashboard = () => {
  const [riskData, setRiskData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('risk');
  const [searchWallet, setSearchWallet] = useState('');
  const [walletRisk, setWalletRisk] = useState(null);

  const backendUrl = import.meta.env.VITE_BACKEND_URL || process.env.REACT_APP_BACKEND_URL || 'http://localhost:5050';

  useEffect(() => {
    fetchPublicRiskData();
  }, []);

  const fetchPublicRiskData = async () => {
    try {
      // Fetch public risk dashboard data
      const response = await axios.get(`${backendUrl}/api/public/risk-dashboard`);
      setRiskData(response.data.risks || []);
    } catch (error) {
      console.error('Error fetching public risk data:', error);
      // Simulate some data for demo purposes
      setRiskData([
        { wallet: '0x1234...abcd', riskLevel: 'High', flagged: '2024-01-15' },
        { wallet: '0x5678...efgh', riskLevel: 'Medium', flagged: '2024-01-14' },
        { wallet: '0x9abc...ijkl', riskLevel: 'Low', flagged: '2024-01-13' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const searchWalletRisk = async () => {
    if (!searchWallet.trim()) {
      toast.error('❌ Please enter a wallet address');
      return;
    }

    try {
      // This would be a public endpoint for basic wallet risk lookup
      const response = await axios.get(`${backendUrl}/api/public/wallet-risk/${searchWallet}`);
      setWalletRisk(response.data);
      toast.success('✅ Wallet risk data retrieved');
    } catch (error) {
      console.error('Error fetching wallet risk:', error);
      // Simulate risk data for demo
      setWalletRisk({
        wallet: searchWallet,
        riskScore: Math.random() * 100,
        riskLevel: ['Low', 'Medium', 'High'][Math.floor(Math.random() * 3)],
        lastUpdated: new Date().toISOString()
      });
      toast.info('📊 Showing simulated risk data');
    }
  };

  const getRiskColor = (level) => {
    switch (level?.toLowerCase()) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className=\"flex justify-center items-center min-h-screen\">
        <div className=\"text-xl\">🔄 Loading public dashboard...</div>
      </div>
    );
  }

  return (
    <div className=\"min-h-screen bg-gray-50\">
      {/* Header */}
      <div className=\"bg-white shadow-sm border-b\">
        <div className=\"max-w-7xl mx-auto px-4 sm:px-6 lg:px-8\">
          <div className=\"flex justify-between items-center py-4\">
            <div>
              <h1 className=\"text-2xl font-bold text-gray-900\">🌐 Public Risk Dashboard</h1>
              <p className=\"text-sm text-gray-600\">Public access to fraud risk information</p>
            </div>
            <div className=\"flex space-x-4\">
              <a href=\"/\" className=\"text-blue-600 hover:text-blue-800\">← Home</a>
              <a href=\"/login\" className=\"bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700\">
                Login for More Access
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className=\"bg-white border-b\">
        <div className=\"max-w-7xl mx-auto px-4 sm:px-6 lg:px-8\">
          <nav className=\"flex space-x-8\">
            <button
              onClick={() => setActiveTab('risk')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'risk' 
                  ? 'border-blue-500 text-blue-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              📊 Risk Dashboard
            </button>
            <button
              onClick={() => setActiveTab('search')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'search' 
                  ? 'border-blue-500 text-blue-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              🔍 Wallet Lookup
            </button>
            <button
              onClick={() => setActiveTab('about')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'about' 
                  ? 'border-blue-500 text-blue-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              ℹ️ About
            </button>
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className=\"max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8\">
        {activeTab === 'risk' && (
          <div className=\"space-y-6\">
            <div className=\"bg-white shadow rounded-lg p-6\">
              <h2 className=\"text-lg font-medium text-gray-900 mb-4\">Recent Risk Alerts</h2>
              
              {riskData.length > 0 ? (
                <div className=\"overflow-x-auto\">
                  <table className=\"min-w-full divide-y divide-gray-200\">
                    <thead className=\"bg-gray-50\">
                      <tr>
                        <th className=\"px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider\">Wallet</th>
                        <th className=\"px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider\">Risk Level</th>
                        <th className=\"px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider\">Flagged Date</th>
                      </tr>
                    </thead>
                    <tbody className=\"bg-white divide-y divide-gray-200\">
                      {riskData.map((risk, index) => (
                        <tr key={index}>
                          <td className=\"px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900\">
                            {risk.wallet}
                          </td>
                          <td className=\"px-6 py-4 whitespace-nowrap\">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRiskColor(risk.riskLevel)}`}>
                              {risk.riskLevel}
                            </span>
                          </td>
                          <td className=\"px-6 py-4 whitespace-nowrap text-sm text-gray-500\">
                            {new Date(risk.flagged).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className=\"text-gray-500\">No recent risk alerts available.</p>
              )}
            </div>

            <div className=\"bg-blue-50 border border-blue-200 rounded-lg p-4\">
              <div className=\"flex\">
                <div className=\"ml-3\">
                  <h3 className=\"text-sm font-medium text-blue-800\">
                    ℹ️ Public Access Notice
                  </h3>
                  <div className=\"mt-2 text-sm text-blue-700\">
                    <p>You are viewing public risk information. For detailed evidence and investigation capabilities:</p>
                    <ul className=\"list-disc list-inside mt-1\">
                      <li>Contact an administrator for investigator access</li>
                      <li>Login with proper credentials for full system access</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'search' && (
          <div className=\"bg-white shadow rounded-lg p-6\">
            <h2 className=\"text-lg font-medium text-gray-900 mb-4\">Wallet Risk Lookup</h2>
            
            <div className=\"space-y-4\">
              <div className=\"flex space-x-4\">
                <input
                  type=\"text\"
                  placeholder=\"Enter wallet address (0x...)\"
                  value={searchWallet}
                  onChange={(e) => setSearchWallet(e.target.value)}
                  className=\"flex-1 border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500\"
                />
                <button
                  onClick={searchWalletRisk}
                  className=\"bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700\"
                >
                  🔍 Check Risk
                </button>
              </div>

              {walletRisk && (
                <div className=\"mt-6 bg-gray-50 rounded-lg p-4\">
                  <h3 className=\"font-medium text-gray-900 mb-3\">Risk Assessment Results</h3>
                  <div className=\"grid grid-cols-1 md:grid-cols-3 gap-4\">
                    <div>
                      <label className=\"block text-sm font-medium text-gray-700\">Wallet Address</label>
                      <p className=\"mt-1 text-sm font-mono text-gray-900\">{walletRisk.wallet}</p>
                    </div>
                    <div>
                      <label className=\"block text-sm font-medium text-gray-700\">Risk Score</label>
                      <p className=\"mt-1 text-sm text-gray-900\">{walletRisk.riskScore?.toFixed(2)}%</p>
                    </div>
                    <div>
                      <label className=\"block text-sm font-medium text-gray-700\">Risk Level</label>
                      <span className={`mt-1 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRiskColor(walletRisk.riskLevel)}`}>
                        {walletRisk.riskLevel}
                      </span>
                    </div>
                  </div>
                  <p className=\"mt-3 text-xs text-gray-500\">
                    Last updated: {new Date(walletRisk.lastUpdated).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'about' && (
          <div className=\"bg-white shadow rounded-lg p-6\">
            <h2 className=\"text-lg font-medium text-gray-900 mb-4\">About This System</h2>
            
            <div className=\"space-y-4\">
              <div>
                <h3 className=\"font-medium text-gray-900\">🛡️ Fraud Evidence System</h3>
                <p className=\"mt-2 text-gray-600\">
                  This is a blockchain-integrated fraud detection and evidence management system 
                  with ML-powered behavioral analysis.
                </p>
              </div>

              <div>
                <h3 className=\"font-medium text-gray-900\">🌐 Public Access</h3>
                <p className=\"mt-2 text-gray-600\">
                  As a public user, you can:
                </p>
                <ul className=\"list-disc list-inside mt-2 space-y-1 text-gray-600\">
                  <li>View general risk dashboard information</li>
                  <li>Perform basic wallet risk lookups</li>
                  <li>Access public fraud awareness resources</li>
                </ul>
              </div>

              <div>
                <h3 className=\"font-medium text-gray-900\">🔐 Enhanced Access</h3>
                <p className=\"mt-2 text-gray-600\">
                  For investigators and administrators:
                </p>
                <ul className=\"list-disc list-inside mt-2 space-y-1 text-gray-600\">
                  <li><strong>Investigators:</strong> Access evidence library, case management, report generation</li>
                  <li><strong>Admins:</strong> Full system access including user management and system administration</li>
                </ul>
              </div>

              <div className=\"bg-yellow-50 border border-yellow-200 rounded-lg p-4\">
                <h4 className=\"font-medium text-yellow-800\">⚠️ Access Limitations</h4>
                <p className=\"mt-1 text-sm text-yellow-700\">
                  Public users cannot access the evidence library or detailed investigation tools. 
                  These features require investigator or administrator credentials.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicDashboard;