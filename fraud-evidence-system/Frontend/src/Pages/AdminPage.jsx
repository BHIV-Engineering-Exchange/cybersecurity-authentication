//src/Pages/AdminPage.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { config } from '../utils/config';
import ThreatMap from "../components/ThreatMap";
import RiskDial from "../components/RiskDial";
import EscalateButton from "../components/EscalateButton";
import DownloadButton from "../components/DownloadButton";
import EnforcementPanel from "../components/EnforcementPanel";
import RLFeedbackPanel from "../components/RLFeedbackPanel";
import CaseExportButton from "../components/CaseExportButton";
import EvidenceLibrary from "../components/EvidenceLibrary";
import Investigations from "../components/Investigations";
import SidebarNavigation from "../components/SidebarNavigation";
import CaseManager from "../components/CaseManager";
import Escalations from "../components/Escalations";
import ContactPolice from "../components/ContactPolice";
import SystemLogs from "../components/SystemLogs";
import UserManagement from "../components/UserManagement";
import RLDashboard from "../components/RLDashboard";

const AdminPage = () => {
  const [reports, setReports] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [riskFilter, setRiskFilter] = useState("");
  const [searchWallet, setSearchWallet] = useState("");
  const [activeSection, setActiveSection] = useState('dashboard');
  
  // User information for EvidenceLibrary
  const [user, setUser] = useState(null);
  const [evidenceLibraryRefreshTrigger, setEvidenceLibraryRefreshTrigger] = useState(0);
  
  // Get user information
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      // Decode JWT token to get user info
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUser({
          email: payload.email || 'admin@example.com',
          role: 'admin'
        });
      } catch (error) {
        console.error('Error decoding token:', error);
        setUser({
          email: 'admin@example.com',
          role: 'admin'
        });
      }
    } else {
      setUser({
        email: 'admin@example.com',
        role: 'admin'
      });
    }
  }, []);
  
  // ML Analysis state
  const [mlResults, setMlResults] = useState([]);
  const [mlLoading, setMlLoading] = useState(false);
  const [mlRiskFilter, setMlRiskFilter] = useState("");
  const [mlViolationFilter, setMlViolationFilter] = useState("");
  const [showMlSection, setShowMlSection] = useState(true);

  // Fetch ML Analysis Results
  const fetchMLResults = async () => {
    setMlLoading(true);
    try {
      const url = config.backendUrl;

      const token = localStorage.getItem('authToken');
      const params = new URLSearchParams({
        limit: '50',
        offset: '0'
      });
      
      if (mlRiskFilter) params.append('risk_level', mlRiskFilter);
      if (mlViolationFilter) params.append('violation_type', mlViolationFilter);

      const res = await axios.get(`${url}/api/ml/results?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      setMlResults(res.data.results || []);
    } catch (error) {
      console.error("Error fetching ML results:", error.message || error);
    } finally {
      setMlLoading(false);
    }
  };

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const url = config.backendUrl;

        const res = await axios.get(`${url}/api/reports`);
        setReports(res.data);
      } catch (error) {
        console.error("Error fetching reports:", error.message || error);
      }
    };

    fetchReports();
    fetchMLResults(); // Fetch ML results on component mount
  }, []);

  useEffect(() => {
    const handleNavigation = (event) => {
      setActiveSection(event.detail.section);
    };

    window.addEventListener('navigateToSection', handleNavigation);
    return () => {
      window.removeEventListener('navigateToSection', handleNavigation);
    };
  }, []);

  // Refetch ML results when filters change
  useEffect(() => {
    if (showMlSection) {
      fetchMLResults();
    }
  }, [mlRiskFilter, mlViolationFilter, showMlSection]);

  const filteredReports = reports.filter((report) => {
    const matchesStatus = statusFilter ? report.status === statusFilter : true;
    const matchesRisk = riskFilter ? report.risk === riskFilter : true;
    const matchesWallet = searchWallet ? report.wallet.includes(searchWallet) : true;
    return matchesStatus && matchesRisk && matchesWallet;
  });

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar Navigation */}
      <SidebarNavigation />
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Enhanced Header */}
        <header className="backdrop-blur-md bg-white/80 shadow-xl border-b border-white/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-green-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-2xl">🛡️</span>
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full animate-pulse"></div>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-800 to-green-700 bg-clip-text text-transparent">
                  Admin Dashboard
                </h1>
                <p className="text-sm text-emerald-600 font-medium">Advanced fraud detection management</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="bg-white/60 backdrop-blur-sm rounded-2xl px-6 py-3 shadow-lg border border-white/30">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-sm font-semibold text-gray-700">System Online</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        {activeSection === 'case-manager' ? (
          <CaseManager />
        ) : activeSection === 'escalations' ? (
          <Escalations />
        ) : activeSection === 'evidence-library' ? (
          <EvidenceLibrary userRole="admin" userEmail={user?.email} refreshTrigger={evidenceLibraryRefreshTrigger} />
        ) : activeSection === 'contact-police' ? (
          <ContactPolice />
        ) : activeSection === 'system-logs' ? (
          <SystemLogs />
        ) : activeSection === 'add-remove-investigators' ? (
          <UserManagement />
        ) : activeSection === 'reset-passwords' ? (
          <UserManagement />
        ) : activeSection === 'setup-2fa' ? (
          <UserManagement />
        ) : activeSection === 'rl-dashboard' ? (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <RLDashboard />
          </div>
        ) : (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/30 overflow-hidden p-8">

      {/* Threat Map with Geo-IP */}
      <div className="my-6">
        <h2 className="text-lg font-semibold mb-2">📍 Suspicious Wallets Threat Map</h2>
        <ThreatMap />
      </div>

      {/* Enhanced ML Analysis Results Section */}
      <div className="my-12 bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 border-2 border-purple-200/50 rounded-3xl p-8 shadow-xl backdrop-blur-sm">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <div className="w-14 h-14 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-white text-2xl">🤖</span>
              </div>
              <div className="absolute -top-2 -right-2 w-5 h-5 bg-purple-400 rounded-full animate-pulse"></div>
            </div>
            <div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-800 to-indigo-700 bg-clip-text text-transparent">
                AI/ML Analysis Results
              </h2>
              <p className="text-sm text-purple-600 font-semibold">Advanced behavioral pattern detection & risk assessment</p>
            </div>
          </div>
          <button
            onClick={() => setShowMlSection(!showMlSection)}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold rounded-2xl transition-all duration-300 transform hover:scale-105 shadow-lg"
          >
            {showMlSection ? 'Hide' : 'Show'} ML Results
          </button>
        </div>

        {showMlSection && (
          <>
            {/* Enhanced ML Filters */}
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/30 mb-8">
              <div className="flex flex-col lg:flex-row gap-6">
                <div className="flex-1">
                  <label className="block text-sm font-bold text-purple-700 mb-3">🎯 Risk Severity Filter</label>
                  <select
                    onChange={(e) => setMlRiskFilter(e.target.value)}
                    className="w-full border-2 border-purple-200 p-4 rounded-2xl focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 transition-all duration-300 bg-white/80 backdrop-blur-sm font-medium shadow-lg"
                    value={mlRiskFilter}
                  >
                    <option value="">All Risk Levels</option>
                    <option value="low">🟢 Low Risk (0.0 - 0.39)</option>
                    <option value="medium">🟡 Medium Risk (0.4 - 0.59)</option>
                    <option value="high">🟠 High Risk (0.6 - 0.79)</option>
                    <option value="critical">🔴 Critical Risk (0.8 - 1.0)</option>
                  </select>
                </div>
                
                <div className="flex-1">
                  <label className="block text-sm font-bold text-purple-700 mb-3">⚖️ Violation Type Filter</label>
                  <select
                    onChange={(e) => setMlViolationFilter(e.target.value)}
                    className="w-full border-2 border-purple-200 p-4 rounded-2xl focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 transition-all duration-300 bg-white/80 backdrop-blur-sm font-medium shadow-lg"
                    value={mlViolationFilter}
                  >
                    <option value="">All Violation Types</option>
                    <option value="rapid">Rapid Token Dump</option>
                    <option value="large">Large Transfers</option>
                    <option value="flash">Flash Loan Manipulation</option>
                    <option value="phishing">Phishing Activity</option>
                    <option value="low risk">Low Risk Activity</option>
                  </select>
                </div>
                
                <div className="flex items-end">
                  <button
                    onClick={() => {
                      setMlRiskFilter('');
                      setMlViolationFilter('');
                    }}
                    className="px-6 py-4 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white font-semibold rounded-2xl transition-all duration-300 transform hover:scale-105 shadow-lg"
                  >
                    <span className="flex items-center space-x-2">
                      <span>🗑️</span>
                      <span>Clear Filters</span>
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Enhanced ML Results Table */}
            {mlLoading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="relative">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-200"></div>
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent absolute top-0 left-0"></div>
                </div>
                <p className="mt-4 text-lg font-semibold text-purple-700">Loading ML analysis results...</p>
                <p className="text-sm text-purple-500 mt-1">Processing behavioral patterns and risk assessments</p>
              </div>
            ) : (
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl border-2 border-purple-200/50 overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gradient-to-r from-purple-100 to-indigo-100">
                      <tr>
                        <th className="px-8 py-4 text-left text-sm font-bold text-purple-800 uppercase tracking-wider">🔗 Wallet Address</th>
                        <th className="px-8 py-4 text-left text-sm font-bold text-purple-800 uppercase tracking-wider">📊 Risk Score</th>
                        <th className="px-8 py-4 text-left text-sm font-bold text-purple-800 uppercase tracking-wider">⚖️ Violation Type</th>
                        <th className="px-8 py-4 text-left text-sm font-bold text-purple-800 uppercase tracking-wider">🎯 Recommended Action</th>
                        <th className="px-8 py-4 text-left text-sm font-bold text-purple-800 uppercase tracking-wider">🔍 Analysis Details</th>
                        <th className="px-8 py-4 text-left text-sm font-bold text-purple-800 uppercase tracking-wider">⏰ Analyzed</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-purple-100">
                      {mlResults.map((result, index) => (
                        <tr key={result.id || index} className="hover:bg-purple-50/50 transition-colors duration-200">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-mono text-gray-900">
                              {result.address?.substring(0, 10)}...{result.address?.substring(result.address.length - 8)}
                            </div>
                            <div className="text-xs text-gray-500">
                              {result.transaction_count} transactions
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center space-x-2">
                              <span className={`text-lg font-bold ${
                                result.score >= 0.8 ? 'text-red-600' :
                                result.score >= 0.6 ? 'text-orange-600' :
                                result.score >= 0.4 ? 'text-yellow-600' : 'text-green-600'
                              }`}>
                                {result.score}
                              </span>
                              <div className="w-16 bg-gray-200 rounded-full h-2">
                                <div 
                                  className={`h-2 rounded-full ${
                                    result.score >= 0.8 ? 'bg-red-500' :
                                    result.score >= 0.6 ? 'bg-orange-500' :
                                    result.score >= 0.4 ? 'bg-yellow-500' : 'bg-green-500'
                                  }`}
                                  style={{ width: `${result.score * 100}%` }}
                                ></div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">
                              {result.violation}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              result.recommended_action === 'freeze' ? 'bg-red-100 text-red-800' :
                              result.recommended_action === 'investigate' ? 'bg-orange-100 text-orange-800' :
                              result.recommended_action === 'monitor' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {result.recommended_action?.replace('_', ' ')?.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-xs space-y-1">
                              <div className="flex justify-between">
                                <span>Rapid Dump:</span>
                                <span className={result.analysis_details?.rapid_dumping?.detected ? 'text-red-600' : 'text-green-600'}>
                                  {result.analysis_details?.rapid_dumping?.detected ? '⚠️' : '✅'}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>Large Transfers:</span>
                                <span className={result.analysis_details?.large_transfers?.detected ? 'text-red-600' : 'text-green-600'}>
                                  {result.analysis_details?.large_transfers?.detected ? '⚠️' : '✅'}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>Flash Loans:</span>
                                <span className={result.analysis_details?.flash_loans?.detected ? 'text-red-600' : 'text-green-600'}>
                                  {result.analysis_details?.flash_loans?.detected ? '⚠️' : '✅'}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>Phishing:</span>
                                <span className={result.analysis_details?.phishing_indicators?.detected ? 'text-red-600' : 'text-green-600'}>
                                  {result.analysis_details?.phishing_indicators?.detected ? '⚠️' : '✅'}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                            <div>{new Date(result.analyzed_at).toLocaleDateString()}</div>
                            <div>{new Date(result.analyzed_at).toLocaleTimeString()}</div>
                            <div className="text-xs text-gray-400">by {result.analyzed_by}</div>
                          </td>
                        </tr>
                      ))}
                      {mlResults.length === 0 && (
                        <tr>
                          <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                            <div className="text-4xl mb-2">🤖</div>
                            <div>No ML analysis results found matching the filters</div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      </div>

      {/* Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 mb-4">
        <select
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border p-2 rounded"
          value={statusFilter}
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="reviewed">Reviewed</option>
          <option value="escalated">Escalated</option>
        </select>

        <select
          onChange={(e) => setRiskFilter(e.target.value)}
          className="border p-2 rounded"
          value={riskFilter}
        >
          <option value="">All Risk Levels</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>

        <input
          type="text"
          placeholder="Search by Wallet"
          className="border p-2 rounded flex-1"
          value={searchWallet}
          onChange={(e) => setSearchWallet(e.target.value)}
        />
      </div>

      {/* Reports Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-300 text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="py-2 px-4 border-b">Wallet</th>
              <th className="py-2 px-4 border-b">Risk</th>
              <th className="py-2 px-4 border-b">Status</th>
              <th className="py-2 px-4 border-b">Timestamp</th>
              <th className="py-2 px-4 border-b">Details</th>
              <th className="py-2 px-4 border-b">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredReports.map((report, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="py-2 px-4 border-b">{report.wallet}</td>
                <td className="py-2 px-4 border-b capitalize">{report.risk}</td>
                <td className="py-2 px-4 border-b capitalize">{report.status}</td>
                <td className="py-2 px-4 border-b">
                  {new Date(report.timestamp).toLocaleString()}
                </td>
                <td className="py-2 px-4 border-b">
                  <RiskDial score={report.riskScore || 0} tags={report.tags || []} />
                </td>
                <td className="py-2 px-4 border-b text-center space-y-1">
                  {report.status !== "escalated" && (
                    <EscalateButton entityId={report.wallet} />
                  )}

                  {/* Show source labels */}
                  {report.source === "contract" && (
                    <span className="inline-block text-xs font-medium bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                      Flagged via Contract
                    </span>
                  )}
                  {report.source === "admin" && (
                    <span className="inline-block text-xs font-medium bg-red-100 text-red-700 px-2 py-1 rounded-full">
                      Escalated by Admin
                    </span>
                  )}

                  {/* Case Export Button */}
                  {report.caseId && (
                    <div className="mt-2">
                      <CaseExportButton caseId={report.caseId} />
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {filteredReports.length === 0 && (
              <tr>
                <td colSpan="6" className="text-center py-4 text-gray-500">
                  No reports found matching the filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Global Report Export */}
      <div className="mt-4 text-right">
        <DownloadButton
          filters={{
            wallet: searchWallet,
            status: statusFilter,
            riskLevel: riskFilter,
          }}
        />
      </div>

      <div className="mt-10">
        <RLFeedbackPanel />
      </div>

      {/* Enforcement Smart Contract Panel */}
      <div className="mt-10">
        <h2 className="text-lg font-semibold mb-2">🔐 Smart Contract Enforcement</h2>
        <EnforcementPanel />
      </div>

      {/* Evidence Library */}
      <div className="mt-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-800">📁 Evidence Library</h2>
          <div className="text-sm text-gray-600">
            Secure evidence management with blockchain verification
          </div>
        </div>
        <EvidenceLibrary userRole="admin" userEmail={user?.email} refreshTrigger={evidenceLibraryRefreshTrigger} />
      </div>

      {/* Investigations */}
      <div className="mt-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-800">🔍 Investigations</h2>
          <div className="text-sm text-gray-600">
            Link multiple wallets/IPs under one investigation ID
          </div>
        </div>
        <Investigations />
        </div>
      </div>
        )}
      </main>
      </div>
    </div>
  );
};

export default AdminPage;
