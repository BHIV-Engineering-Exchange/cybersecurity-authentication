import React, { useState, useEffect } from 'react';
import { healthCheck, testConnection, reportsApi, riskApi, walletApi } from '../api/fraudApi';

const IntegrationTest = () => {
  const [testResults, setTestResults] = useState({});
  const [loading, setLoading] = useState(false);

  const runTest = async (testName, testFunction) => {
    try {
      setTestResults(prev => ({ ...prev, [testName]: { status: 'running' } }));
      const result = await testFunction();
      setTestResults(prev => ({ 
        ...prev, 
        [testName]: { status: 'success', data: result } 
      }));
    } catch (error) {
      setTestResults(prev => ({ 
        ...prev, 
        [testName]: { status: 'error', error: error.message } 
      }));
    }
  };

  const runAllTests = async () => {
    setLoading(true);
    setTestResults({});

    // Test 1: Health Check
    await runTest('health', healthCheck);

    // Test 2: Test Connection
    await runTest('connection', testConnection);

    // Test 3: Get Reports
    await runTest('reports', () => reportsApi.getReports({ limit: 5 }));

    // Test 4: Submit Test Report
    await runTest('submitReport', () => reportsApi.submitReport({
      wallet: '0x1234567890123456789012345678901234567890',
      reason: 'Integration test report',
      severity: 2,
      riskLevel: 'low'
    }));

    // Test 5: Get Wallet Risk
    await runTest('walletRisk', () => riskApi.getWalletRisk('0x1234567890123456789012345678901234567890'));

    // Test 6: Get Events
    await runTest('events', walletApi.getEvents);

    setLoading(false);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success': return 'text-green-600';
      case 'error': return 'text-red-600';
      case 'running': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'running': return '⏳';
      default: return '⚪';
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">
          Frontend-Backend Integration Test
        </h2>
        
        <button
          onClick={runAllTests}
          disabled={loading}
          className="mb-6 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Running Tests...' : 'Run All Tests'}
        </button>

        <div className="space-y-4">
          {Object.entries(testResults).map(([testName, result]) => (
            <div key={testName} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-lg capitalize">
                  {getStatusIcon(result.status)} {testName.replace(/([A-Z])/g, ' $1')}
                </h3>
                <span className={`font-medium ${getStatusColor(result.status)}`}>
                  {result.status.toUpperCase()}
                </span>
              </div>
              
              {result.status === 'success' && result.data && (
                <div className="bg-green-50 p-3 rounded">
                  <pre className="text-sm text-green-800 overflow-auto">
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                </div>
              )}
              
              {result.status === 'error' && (
                <div className="bg-red-50 p-3 rounded">
                  <p className="text-red-800 text-sm">{result.error}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {Object.keys(testResults).length === 0 && !loading && (
          <div className="text-center text-gray-500 py-8">
            Click "Run All Tests" to test the integration between frontend and backend
          </div>
        )}
      </div>
    </div>
  );
};

export default IntegrationTest;
