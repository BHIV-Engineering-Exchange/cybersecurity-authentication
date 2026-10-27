// src/Pages/InvestigatorDashboard.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import EvidenceLibrary from '../components/EvidenceLibrary';
import DarkModeToggle from '../components/DarkModeToggle';

const InvestigatorDashboard = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('incident-report');

  const backendUrl = import.meta.env.VITE_BACKEND_URL || process.env.REACT_APP_BACKEND_URL || 'http://localhost:5050';

  useEffect(() => {
    checkInvestigatorAccess();
  }, []);

  const checkInvestigatorAccess = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        toast.error('❌ Please login to access investigator dashboard');
        window.location.href = '/';
        return;
      }

      const response = await axios.get(`${backendUrl}/api/auth/verify`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.data && (response.data.role === 'investigator' || response.data.role === 'admin')) {
        setUser(response.data);
        toast.success(`✅ Welcome Investigator: ${response.data.email}`);
      } else {
        toast.error('❌ Investigator access required');
        window.location.href = '/';
      }
    } catch (error) {
      console.error('Investigator access check failed:', error);
      toast.error('❌ Investigator access verification failed');
      window.location.href = '/';
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <div className="text-xl text-white font-medium">🔄 Verifying investigator access...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <div className="w-64 bg-gray-800 shadow-2xl border-r-4 border-gray-700 flex flex-col">
        {/* Sidebar Header */}
        <div className="p-6 border-b border-gray-700">
          <h1 className="text-2xl font-bold text-white drop-shadow-lg">
            🔍 INVESTIGATOR
          </h1>
          <p className="text-sm mt-1 text-gray-300">Welcome, {user?.email}</p>
          <p className="text-xs text-gray-400">Role: {user?.role}</p>
        </div>

        {/* Sidebar Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          <button
            onClick={() => setActiveSection('incident-report')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-300 text-left ${
              activeSection === 'incident-report'
                ? 'bg-gray-600 text-white shadow-lg'
                : 'text-gray-300 hover:bg-gray-700 hover:text-white'
            }`}
          >
            <span className="text-xl">📑</span>
            <div>
              <div className="font-medium">Incident Report</div>
              <div className="text-xs opacity-75">Submit wallet reports & ML analysis</div>
            </div>
          </button>

          <button
            onClick={() => setActiveSection('evidence-upload')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-300 text-left ${
              activeSection === 'evidence-upload'
                ? 'bg-gray-600 text-white shadow-lg'
                : 'text-gray-300 hover:bg-gray-700 hover:text-white'
            }`}
          >
            <span className="text-xl">📎</span>
            <div>
              <div className="font-medium">Evidence Upload</div>
              <div className="text-xs opacity-75">Upload files with notes & hash</div>
            </div>
          </button>

          <button
            onClick={() => setActiveSection('evidence-library')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-300 text-left ${
              activeSection === 'evidence-library'
                ? 'bg-gray-600 text-white shadow-lg'
                : 'text-gray-300 hover:bg-gray-700 hover:text-white'
            }`}
          >
            <span className="text-xl">📁</span>
            <div>
              <div className="font-medium">Evidence Library</div>
              <div className="text-xs opacity-75">View your uploaded files</div>
            </div>
          </button>

          <button
            onClick={() => setActiveSection('contact-police')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-300 text-left ${
              activeSection === 'contact-police'
                ? 'bg-gray-600 text-white shadow-lg'
                : 'text-gray-300 hover:bg-gray-700 hover:text-white'
            }`}
          >
            <span className="text-xl">👮</span>
            <div>
              <div className="font-medium">Contact Police</div>
              <div className="text-xs opacity-75">Send cases to police station</div>
            </div>
          </button>
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-gray-700 space-y-2">
          <DarkModeToggle />
          <a href="/" className="w-full block px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 hover:text-gray-900 rounded-xl transition-all duration-300 shadow-sm hover:shadow-md font-medium text-center">
            ← Home
          </a>
          <button 
            onClick={() => {
              localStorage.removeItem('authToken');
              window.location.href = '/';
            }}
            className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-xl transition-all duration-300 shadow-sm hover:shadow-md font-medium">
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Header */}
        <div className="bg-white shadow-sm border-b border-gray-200 p-4">
          <h2 className="text-2xl font-bold text-gray-800">
            {activeSection === 'incident-report' && '📑 Incident Report'}
            {activeSection === 'evidence-upload' && '📎 Evidence Upload'}
            {activeSection === 'evidence-library' && '📁 Evidence Library'}
            {activeSection === 'contact-police' && '👮 Contact Police'}
          </h2>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-y-auto">
          {activeSection === 'incident-report' && (
            <div className="bg-white/80 backdrop-blur-sm shadow-xl rounded-2xl border border-slate-200/50 p-8">
              <div className="flex items-center space-x-4 mb-8">
                <div className="w-16 h-16 bg-gray-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <span className="text-3xl">📑</span>
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-slate-800">Incident Report</h2>
                  <p className="text-slate-600 text-lg">Report and analyze suspicious activities with AI assistance</p>
                </div>
              </div>

              {/* Incident Report Form */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Form Section */}
                <div className="space-y-6">
                  <div className="bg-gradient-to-br from-white to-slate-50 rounded-2xl p-8 border border-slate-200/50 shadow-lg">
                    <h3 className="text-2xl font-bold mb-6 text-slate-800">📝 Report Form</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-bold mb-3 text-slate-700">
                          Wallet Address *
                        </label>
                        <input
                          type="text"
                          placeholder="Enter wallet address (e.g., 0x1234...)"
                          className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl transition-all duration-300 focus:border-gray-500 focus:ring-4 focus:ring-gray-100 bg-white shadow-sm hover:shadow-md"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-bold mb-3 text-slate-700">
                          Reason for Reporting * (Max 500 characters)
                        </label>
                        <textarea
                          rows={4}
                          maxLength={500}
                          placeholder="Describe the suspicious activity or incident..."
                          className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl transition-all duration-300 focus:border-gray-500 focus:ring-4 focus:ring-gray-100 bg-white shadow-sm hover:shadow-md resize-none"
                        />
                        <div className="text-xs mt-2 text-slate-500 font-medium">
                          <span>0</span>/500 characters
                        </div>
                      </div>
                      
                      <button className="w-full px-8 py-4 bg-gray-600 hover:bg-gray-700 text-white rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl font-bold text-lg transform hover:-translate-y-1">
                        🚨 Submit Report & Analyze with AI
                      </button>
                    </div>
                  </div>

                  {/* ML Output Section */}
                  <div className="bg-gradient-to-br from-white to-slate-50 rounded-2xl p-8 border border-slate-200/50 shadow-lg">
                    <h3 className="text-2xl font-bold mb-6 text-slate-800">🤖 ML Analysis Results</h3>
                    
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white rounded-2xl p-6 border border-slate-200/50 shadow-lg hover:shadow-xl transition-all duration-300">
                          <div className="text-sm font-bold mb-3 text-slate-700">Risk Score</div>
                          <div className="text-3xl font-bold text-slate-400 mb-2">-</div>
                          <div className="text-xs text-slate-500 font-medium">Low/Medium/High</div>
                        </div>
                        
                        <div className="bg-white rounded-2xl p-6 border border-slate-200/50 shadow-lg hover:shadow-xl transition-all duration-300">
                          <div className="text-sm font-bold mb-3 text-slate-700">Category</div>
                          <div className="text-2xl font-bold text-slate-400 mb-2">-</div>
                          <div className="text-xs text-slate-500 font-medium">Scam/Fraud/Suspicious</div>
                        </div>
                        
                        <div className="bg-white rounded-2xl p-6 border border-slate-200/50 shadow-lg hover:shadow-xl transition-all duration-300">
                          <div className="text-sm font-bold mb-3 text-slate-700">Suggested Action</div>
                          <div className="text-2xl font-bold text-slate-400 mb-2">-</div>
                          <div className="text-xs text-slate-500 font-medium">Freeze/Monitor/Ignore</div>
                        </div>
                      </div>
                      
                      <div className="text-center py-8 text-slate-500 font-medium">
                        Submit a report above to see AI analysis results
                      </div>
                    </div>
                  </div>
                </div>

                {/* History Section */}
                <div className="space-y-6">
                  <div style={{ backgroundColor: '#f8f9fa', borderColor: '#dee2e6' }} className="rounded-lg p-6 border">
                    <h3 className="text-lg font-bold mb-4" style={{ color: '#212529' }}>🕒 Previous ML Analysis</h3>
                    
                    {/* Filters */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <select 
                        className="px-3 py-2 border rounded-lg"
                        style={{ 
                          borderColor: '#dee2e6',
                          backgroundColor: '#ffffff',
                          color: '#212529'
                        }}
                      >
                        <option>All Risk Levels</option>
                        <option>Low Risk</option>
                        <option>Medium Risk</option>
                        <option>High Risk</option>
                      </select>
                      
                      <input
                        type="date"
                        className="px-3 py-2 border rounded-lg"
                        style={{ 
                          borderColor: '#dee2e6',
                          backgroundColor: '#ffffff',
                          color: '#212529'
                        }}
                      />
                      
                      <input
                        type="text"
                        placeholder="Filter by wallet..."
                        className="px-3 py-2 border rounded-lg"
                        style={{ 
                          borderColor: '#dee2e6',
                          backgroundColor: '#ffffff',
                          color: '#212529'
                        }}
                      />
                    </div>
                    
                    {/* History Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr style={{ borderBottom: '1px solid #dee2e6' }}>
                            <th className="text-left py-2 text-sm font-semibold" style={{ color: '#212529' }}>Report ID</th>
                            <th className="text-left py-2 text-sm font-semibold" style={{ color: '#212529' }}>Wallet</th>
                            <th className="text-left py-2 text-sm font-semibold" style={{ color: '#212529' }}>Reason Preview</th>
                            <th className="text-left py-2 text-sm font-semibold" style={{ color: '#212529' }}>ML Score</th>
                            <th className="text-left py-2 text-sm font-semibold" style={{ color: '#212529' }}>Timestamp</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr style={{ borderBottom: '1px solid #dee2e6' }}>
                            <td className="py-3 text-sm" style={{ color: '#6c757d' }}>No reports yet</td>
                            <td className="py-3 text-sm" style={{ color: '#6c757d' }}>-</td>
                            <td className="py-3 text-sm" style={{ color: '#6c757d' }}>-</td>
                            <td className="py-3 text-sm" style={{ color: '#6c757d' }}>-</td>
                            <td className="py-3 text-sm" style={{ color: '#6c757d' }}>-</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'evidence-upload' && (
            <div className="bg-white/80 backdrop-blur-sm shadow-xl rounded-2xl border border-slate-200/50 p-8">
              <div className="flex items-center space-x-4 mb-8">
                <div className="w-16 h-16 bg-gray-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <span className="text-3xl">📎</span>
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-slate-800">Evidence Upload</h2>
                  <p className="text-slate-600 text-lg">Upload files linked to wallets with notes and blockchain hash</p>
                </div>
              </div>

              <div className="space-y-6">
                <div style={{ backgroundColor: '#f8f9fa', borderColor: '#dee2e6' }} className="rounded-lg p-6 border">
                  <h3 className="text-lg font-bold mb-4" style={{ color: '#212529' }}>📎 Evidence Upload</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold mb-2" style={{ color: '#212529' }}>
                        Wallet ID
                      </label>
                      <input
                        type="text"
                        placeholder="Enter wallet address"
                        className="w-full px-4 py-3 border rounded-lg transition-all duration-200"
                        style={{ 
                          borderColor: '#dee2e6',
                          backgroundColor: '#ffffff',
                          color: '#212529'
                        }}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-semibold mb-2" style={{ color: '#212529' }}>
                        Description / Notes
                      </label>
                      <textarea
                        rows={3}
                        placeholder="Describe the evidence..."
                        className="w-full px-4 py-3 border rounded-lg transition-all duration-200 resize-none"
                        style={{ 
                          borderColor: '#dee2e6',
                          backgroundColor: '#ffffff',
                          color: '#212529'
                        }}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-semibold mb-2" style={{ color: '#212529' }}>
                        File Upload
                      </label>
                      <div 
                        className="w-full px-4 py-8 border-2 border-dashed rounded-lg text-center transition-all duration-200"
                        style={{ 
                          borderColor: '#dee2e6',
                          backgroundColor: '#ffffff',
                          color: '#6c757d'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.borderColor = '#adb5bd';
                          e.target.style.backgroundColor = '#f8f9fa';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.borderColor = '#dee2e6';
                          e.target.style.backgroundColor = '#ffffff';
                        }}
                      >
                        <div className="text-lg mb-2">📁</div>
                        <div>Drop files here or click to upload</div>
                        <div className="text-xs mt-1">PDF, CSV, JSON, Images supported</div>
                      </div>
                    </div>
                    
                    <div style={{ backgroundColor: '#ffffff', borderColor: '#dee2e6' }} className="rounded-lg p-4 border">
                      <div className="text-sm font-semibold mb-2" style={{ color: '#212529' }}>🔗 Blockchain Verification</div>
                      <div className="text-xs font-mono" style={{ color: '#6c757d' }}>Hash: -</div>
                      <div className="text-xs" style={{ color: '#6c757d' }}>Timestamp: -</div>
                    </div>
                    
                    <button 
                      className="w-full px-6 py-3 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md border"
                      style={{ 
                        backgroundColor: '#ffffff', 
                        color: '#212529',
                        borderColor: '#dee2e6'
                      }}
                    >
                      📤 Upload Evidence
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'evidence-library' && (
            <div className="bg-white/80 backdrop-blur-sm shadow-xl rounded-2xl border border-slate-200/50 p-8">
              <div className="flex items-center space-x-4 mb-8">
                <div className="w-16 h-16 bg-gray-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <span className="text-3xl">📁</span>
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-slate-800">Evidence Library</h2>
                  <p className="text-slate-600 text-lg">View your uploaded evidence files</p>
                </div>
              </div>

              <div>
                <EvidenceLibrary userRole={user?.role} />
              </div>
            </div>
          )}

          {activeSection === 'contact-police' && (
            <div className="bg-white/80 backdrop-blur-sm shadow-xl rounded-2xl border border-slate-200/50 p-8">
              <div className="flex items-center space-x-4 mb-8">
                <div className="w-16 h-16 bg-gray-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <span className="text-3xl">👮</span>
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-slate-800">Contact Police</h2>
                  <p className="text-slate-600 text-lg">Send cases with wallet ID, notes, and linked evidence to nearest police station</p>
                </div>
              </div>

              <div style={{ backgroundColor: '#f8f9fa', borderColor: '#dee2e6' }} className="rounded-lg p-6 border">
                <h3 className="text-lg font-bold mb-4" style={{ color: '#212529' }}>👮 Contact Police</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2" style={{ color: '#212529' }}>
                      Wallet ID
                    </label>
                    <input
                      type="text"
                      placeholder="Enter wallet address"
                      className="w-full px-4 py-3 border rounded-lg transition-all duration-200"
                      style={{ 
                        borderColor: '#dee2e6',
                        backgroundColor: '#ffffff',
                        color: '#212529'
                      }}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold mb-2" style={{ color: '#212529' }}>
                      Linked Evidence
                    </label>
                    <select 
                      className="w-full px-4 py-3 border rounded-lg"
                      style={{ 
                        borderColor: '#dee2e6',
                        backgroundColor: '#ffffff',
                        color: '#212529'
                      }}
                    >
                      <option>Select evidence to link...</option>
                      <option>No evidence available</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold mb-2" style={{ color: '#212529' }}>
                      Description / Notes
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Describe the case for police..."
                      className="w-full px-4 py-3 border rounded-lg transition-all duration-200 resize-none"
                      style={{ 
                        borderColor: '#dee2e6',
                        backgroundColor: '#ffffff',
                        color: '#212529'
                      }}
                    />
                  </div>
                  
                  <div style={{ backgroundColor: '#ffffff', borderColor: '#dee2e6' }} className="rounded-lg p-4 border">
                    <div className="text-sm font-semibold mb-2" style={{ color: '#212529' }}>🏢 Nearby Police Station</div>
                    <div className="text-sm" style={{ color: '#6c757d' }}>Loading station information...</div>
                  </div>
                  
                  <button 
                    className="w-full px-6 py-3 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md border"
                    style={{ 
                      backgroundColor: '#ffffff', 
                      color: '#212529',
                      borderColor: '#dee2e6'
                    }}
                  >
                    📋 Submit Case to Police
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InvestigatorDashboard;