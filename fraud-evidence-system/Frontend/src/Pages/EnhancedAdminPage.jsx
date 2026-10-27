// Enhanced Admin Dashboard with Role-Based UI Components
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { 
  RoleBasedButton, 
  RoleBasedContent, 
  RoleBadge, 
  AccessDeniedMessage,
  RoleBasedNavItem,
  useUserPermissions,
  RoleBasedInput,
  RoleBasedSelect,
  RoleBasedDropdown
} from '../components/RoleBasedUI';
import EvidenceLibrary from '../components/EvidenceLibrary';

const EnhancedAdminPage = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboardStats, setDashboardStats] = useState({});
  const [reports, setReports] = useState([]);
  const [mlResults, setMLResults] = useState([]);
  const [users, setUsers] = useState([]);
  const [systemHealth, setSystemHealth] = useState({});
  const [newUser, setNewUser] = useState({ email: '', role: 'public' });
  const [showUserForm, setShowUserForm] = useState(false);

  // Use role-based permissions hook
  const { user, permissions, loading } = useUserPermissions();
  const userRole = user?.role;

  useEffect(() => {
    if (!loading && user) {
      if (userRole !== 'admin') {
        toast.error('❌ Access denied: Admin privileges required');
        window.location.href = '/';
        return;
      }
      
      toast.success(`✅ Welcome Admin: ${user.email}`);
      loadDashboardData();
    }
  }, [user, loading]);

  const loadDashboardData = async () => {
    // Mock data for demonstration
    setDashboardStats({
      totalReports: 156,
      highRiskCases: 23,
      pendingInvestigations: 8,
      resolvedCases: 145,
      mlAnalysisCount: 89,
      activeThreats: 12
    });

    setReports([
      {
        _id: '1',
        caseId: 'CASE_2024_0891',
        wallet: '0x742d35...e3b8',
        risk: 'high',
        status: 'pending',
        date: '2024-09-01',
        reason: 'Suspicious transaction patterns'
      }
    ]);

    setMLResults([
      {
        _id: '1',
        address: '0x742d35...e3b8',
        score: 0.85,
        violation: 'Rapid token dump',
        recommended_action: 'investigate'
      }
    ]);

    setUsers([
      {
        _id: '1',
        email: 'investigator@fraud.gov',
        role: 'investigator',
        isActive: true,
        lastLogin: '2024-09-01T10:30:00Z'
      },
      {
        _id: '2', 
        email: 'public@citizen.com',
        role: 'public',
        isActive: true,
        lastLogin: '2024-09-01T15:45:00Z'
      }
    ]);

    setSystemHealth({
      apiStatus: 'healthy',
      dbStatus: 'healthy',
      blockchainStatus: 'healthy',
      mlServiceStatus: 'degraded'
    });
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      // In a real implementation, this would call the backend API
      toast.success(`✅ User ${newUser.email} created with ${newUser.role} role!`);
      setUsers(prev => [...prev, {
        _id: Date.now().toString(),
        email: newUser.email,
        role: newUser.role,
        isActive: true,
        lastLogin: null
      }]);
      setNewUser({ email: '', role: 'public' });
      setShowUserForm(false);
    } catch (error) {
      toast.error('❌ Failed to create user');
    }
  };

  const handleUserRoleChange = async (userId, newRole) => {
    try {
      // In a real implementation, this would call the backend API
      setUsers(prev => prev.map(user => 
        user._id === userId ? { ...user, role: newRole } : user
      ));
      toast.success('✅ User role updated successfully!');
    } catch (error) {
      toast.error('❌ Failed to update user role');
    }
  };

  const handleUserStatusChange = async (userId) => {
    try {
      // In a real implementation, this would call the backend API
      setUsers(prev => prev.map(user => 
        user._id === userId ? { ...user, isActive: !user.isActive } : user
      ));
      toast.success('✅ User status updated successfully!');
    } catch (error) {
      toast.error('❌ Failed to update user status');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <RoleBasedContent
      requiredRole="admin"
      fallback={
        <AccessDeniedMessage
          requiredRole="admin"
          customMessage="Admin Dashboard access is restricted to administrators only."
          showLoginButton={true}
        />
      }
    >
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
        <div className="flex">
          {/* Enhanced Sidebar with Role-Based Navigation */}
          <div className="w-72 bg-white shadow-xl border-r border-gray-200 fixed h-full overflow-y-auto">
            {/* Admin Profile Header */}
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-red-600 to-pink-600">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <span className="text-white text-lg font-bold">👑</span>
                </div>
                <div>
                  <h3 className="text-white font-semibold text-lg">Admin Dashboard</h3>
                  <p className="text-red-100 text-sm truncate">{user?.email}</p>
                  <RoleBadge user={user} className="mt-1" />
                </div>
              </div>
            </div>

            {/* Navigation Menu with Role Checks */}
            <nav className="p-4 space-y-2">
              <RoleBasedNavItem
                requiredPermission="manageRoles"
                onClick={() => setActiveTab('dashboard')}
                className={activeTab === 'dashboard' ? 'bg-blue-100 text-blue-800' : 'text-gray-600 hover:bg-gray-50'}
              >
                📊 Dashboard Overview
              </RoleBasedNavItem>

              <RoleBasedNavItem
                requiredPermission="viewCases"
                onClick={() => setActiveTab('reports')}
                className={activeTab === 'reports' ? 'bg-blue-100 text-blue-800' : 'text-gray-600 hover:bg-gray-50'}
              >
                📋 Fraud Reports
              </RoleBasedNavItem>

              <RoleBasedNavItem
                requiredPermission="viewEvidence"
                onClick={() => setActiveTab('evidence')}
                className={activeTab === 'evidence' ? 'bg-blue-100 text-blue-800' : 'text-gray-600 hover:bg-gray-50'}
              >
                🗂️ Evidence Library
              </RoleBasedNavItem>

              <RoleBasedNavItem
                requiredPermission="userManagement"
                onClick={() => setActiveTab('users')}
                className={activeTab === 'users' ? 'bg-blue-100 text-blue-800' : 'text-gray-600 hover:bg-gray-50'}
              >
                👥 User Management
              </RoleBasedNavItem>

              <RoleBasedNavItem
                requiredPermission="manageRoles"
                onClick={() => setActiveTab('ml')}
                className={activeTab === 'ml' ? 'bg-blue-100 text-blue-800' : 'text-gray-600 hover:bg-gray-50'}
              >
                🤖 ML Analysis
              </RoleBasedNavItem>

              <RoleBasedNavItem
                requiredPermission="manageRoles"
                onClick={() => setActiveTab('system')}
                className={activeTab === 'system' ? 'bg-blue-100 text-blue-800' : 'text-gray-600 hover:bg-gray-50'}
              >
                ⚙️ System Health
              </RoleBasedNavItem>
            </nav>

            {/* Quick Actions */}
            <div className="p-4 border-t border-gray-200">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Quick Actions</h4>
              <div className="space-y-2">
                <RoleBasedButton
                  requiredPermission="escalateCase"
                  onClick={() => toast.info('🚨 Emergency escalation initiated')}
                  variant="danger"
                  className="w-full text-sm"
                >
                  🚨 Emergency Escalation
                </RoleBasedButton>

                <RoleBasedButton
                  requiredPermission="userManagement"
                  onClick={() => setShowUserForm(true)}
                  variant="success"
                  className="w-full text-sm"
                >
                  ➕ Create New User
                </RoleBasedButton>

                <RoleBasedButton
                  requiredPermission="manageRoles"
                  onClick={() => {
                    toast.info('🔄 System health check initiated');
                    loadDashboardData();
                  }}
                  variant="info"
                  className="w-full text-sm"
                >
                  🔄 Refresh Dashboard
                </RoleBasedButton>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="ml-72 flex-1 p-8">
            {/* Page Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">
                    {activeTab === 'dashboard' && '📊 Admin Dashboard'}
                    {activeTab === 'reports' && '📋 Fraud Reports Management'}
                    {activeTab === 'evidence' && '🗂️ Evidence Library Management'}
                    {activeTab === 'users' && '👥 User Management'}
                    {activeTab === 'ml' && '🤖 ML Analysis Console'}
                    {activeTab === 'system' && '⚙️ System Health Monitor'}
                  </h1>
                  <p className="text-gray-600 mt-1">Administrative control panel with role-based access</p>
                </div>
                
                <div className="flex items-center space-x-4">
                  <RoleBadge user={user} showPermissions={true} />
                  <RoleBasedButton
                    requiredPermission="manageRoles"
                    onClick={() => {
                      localStorage.removeItem('authToken');
                      localStorage.removeItem('userInfo');
                      window.location.href = '/';
                    }}
                    variant="secondary"
                    className="text-sm"
                  >
                    🔐 Logout
                  </RoleBasedButton>
                </div>
              </div>
            </div>

            {/* Dashboard Content */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-500 text-sm">Total Reports</p>
                        <p className="text-3xl font-bold text-gray-900">{dashboardStats.totalReports}</p>
                      </div>
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <span className="text-blue-600 text-xl">📋</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-500 text-sm">High Risk Cases</p>
                        <p className="text-3xl font-bold text-red-600">{dashboardStats.highRiskCases}</p>
                      </div>
                      <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                        <span className="text-red-600 text-xl">⚠️</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-500 text-sm">Pending Investigations</p>
                        <p className="text-3xl font-bold text-yellow-600">{dashboardStats.pendingInvestigations}</p>
                      </div>
                      <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                        <span className="text-yellow-600 text-xl">⏳</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-500 text-sm">Active Threats</p>
                        <p className="text-3xl font-bold text-purple-600">{dashboardStats.activeThreats}</p>
                      </div>
                      <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                        <span className="text-purple-600 text-xl">🛡️</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Activity</h2>
                  <div className="space-y-4">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-green-600 text-sm">✅</span>
                      </div>
                      <div>
                        <p className="text-gray-900 font-medium">Evidence uploaded for CASE_2024_0891</p>
                        <p className="text-gray-500 text-sm">2 hours ago by Agent Smith</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-blue-600 text-sm">📊</span>
                      </div>
                      <div>
                        <p className="text-gray-900 font-medium">ML analysis completed for 0x742d35...e3b8</p>
                        <p className="text-gray-500 text-sm">4 hours ago</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-yellow-600 text-sm">⚠️</span>
                      </div>
                      <div>
                        <p className="text-gray-900 font-medium">High-risk case flagged: CASE_2024_0890</p>
                        <p className="text-gray-500 text-sm">1 day ago</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Reports Management */}
            {activeTab === 'reports' && (
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Fraud Reports</h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Case ID</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Wallet</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Risk</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {reports.map((report) => (
                        <tr key={report._id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{report.caseId}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{report.wallet}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              report.risk === 'high' ? 'bg-red-100 text-red-800' : 
                              report.risk === 'medium' ? 'bg-yellow-100 text-yellow-800' : 
                              'bg-green-100 text-green-800'
                            }`}>
                              {report.risk}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{report.status}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{report.date}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <RoleBasedButton
                              requiredPermission="viewCases"
                              onClick={() => toast.info(`Viewing details for ${report.caseId}`)}
                              variant="secondary"
                              className="text-xs mr-2"
                            >
                              View
                            </RoleBasedButton>
                            <RoleBasedButton
                              requiredPermission="escalateCase"
                              onClick={() => toast.info(`Escalating ${report.caseId}`)}
                              variant="danger"
                              className="text-xs"
                            >
                              Escalate
                            </RoleBasedButton>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Evidence Library Management */}
            {activeTab === 'evidence' && (
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Evidence Library</h2>
                <EvidenceLibrary />
              </div>
            )}

            {/* User Management */}
            {activeTab === 'users' && (
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">User Management</h2>
                  <RoleBasedButton
                    requiredPermission="userManagement"
                    onClick={() => setShowUserForm(true)}
                    variant="success"
                  >
                    ➕ Create New User
                  </RoleBasedButton>
                </div>

                {/* Create User Form */}
                {showUserForm && (
                  <div className="mb-8 p-6 bg-gray-50 rounded-lg border border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Create New User</h3>
                    <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <RoleBasedInput
                        label="Email"
                        type="email"
                        value={newUser.email}
                        onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                        required
                        requiredPermission="userManagement"
                      />
                      
                      <RoleBasedSelect
                        label="Role"
                        value={newUser.role}
                        onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                        required
                        requiredPermission="userManagement"
                      >
                        <option value="public">Public</option>
                        <option value="investigator">Investigator</option>
                        <option value="admin">Admin</option>
                      </RoleBasedSelect>
                      
                      <div className="flex items-end space-x-2">
                        <RoleBasedButton
                          type="submit"
                          requiredPermission="userManagement"
                          variant="success"
                        >
                          Create User
                        </RoleBasedButton>
                        <button
                          type="button"
                          onClick={() => {
                            setShowUserForm(false);
                            setNewUser({ email: '', role: 'public' });
                          }}
                          className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Users Table */}
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Login</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {users.map((userItem) => (
                        <tr key={userItem._id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10">
                                <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                                  <span className="text-gray-600">👤</span>
                                </div>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">{userItem.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <RoleBasedSelect
                              value={userItem.role}
                              onChange={(e) => handleUserRoleChange(userItem._id, e.target.value)}
                              requiredPermission="manageRoles"
                              className="text-sm"
                            >
                              <option value="public">Public</option>
                              <option value="investigator">Investigator</option>
                              <option value="admin">Admin</option>
                            </RoleBasedSelect>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              userItem.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {userItem.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {userItem.lastLogin ? new Date(userItem.lastLogin).toLocaleDateString() : 'Never'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <RoleBasedButton
                              requiredPermission="manageRoles"
                              onClick={() => handleUserStatusChange(userItem._id)}
                              variant={userItem.isActive ? "danger" : "success"}
                              className="text-xs mr-2"
                            >
                              {userItem.isActive ? 'Deactivate' : 'Activate'}
                            </RoleBasedButton>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ML Analysis Console */}
            {activeTab === 'ml' && (
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">ML Analysis Console</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Analysis Results</h3>
                    <div className="space-y-4">
                      {mlResults.map((result) => (
                        <div key={result._id} className="bg-white rounded-lg p-4 border border-gray-200">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-gray-900">{result.address}</p>
                              <p className="text-sm text-gray-500">Risk Score: {result.score}</p>
                              <p className="text-sm text-gray-500">Violation: {result.violation}</p>
                            </div>
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                              result.score > 0.8 ? 'bg-red-100 text-red-800' : 
                              result.score > 0.6 ? 'bg-yellow-100 text-yellow-800' : 
                              'bg-green-100 text-green-800'
                            }`}>
                              {Math.round(result.score * 100)}%
                            </span>
                          </div>
                          <div className="mt-3">
                            <p className="text-sm">
                              <span className="font-medium">Recommended:</span> {result.recommended_action}
                            </p>
                          </div>
                          <div className="mt-3 flex space-x-2">
                            <RoleBasedButton
                              requiredPermission="viewCases"
                              onClick={() => toast.info(`Investigating ${result.address}`)}
                              variant="primary"
                              className="text-xs"
                            >
                              Investigate
                            </RoleBasedButton>
                            <RoleBasedButton
                              requiredPermission="escalateCase"
                              onClick={() => toast.info(`Escalating ${result.address}`)}
                              variant="danger"
                              className="text-xs"
                            >
                              Escalate
                            </RoleBasedButton>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Run New Analysis</h3>
                    <form className="space-y-4">
                      <RoleBasedInput
                        label="Wallet Address"
                        placeholder="0x..."
                        requiredPermission="viewCases"
                      />
                      
                      <RoleBasedInput
                        label="Analysis Reason"
                        placeholder="Why are you analyzing this address?"
                        requiredPermission="viewCases"
                      />
                      
                      <RoleBasedButton
                        requiredPermission="viewCases"
                        onClick={() => toast.info('Starting ML analysis...')}
                        variant="primary"
                        className="w-full"
                      >
                        🚀 Run Analysis
                      </RoleBasedButton>
                    </form>
                  </div>
                </div>
              </div>
            )}

            {/* System Health Monitor */}
            {activeTab === 'system' && (
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">System Health Monitor</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Service Status</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-700">API Gateway</span>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          systemHealth.apiStatus === 'healthy' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {systemHealth.apiStatus}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-gray-700">Database</span>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          systemHealth.dbStatus === 'healthy' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {systemHealth.dbStatus}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-gray-700">Blockchain Integration</span>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          systemHealth.blockchainStatus === 'healthy' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {systemHealth.blockchainStatus}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-gray-700">ML Service</span>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          systemHealth.mlServiceStatus === 'healthy' ? 'bg-green-100 text-green-800' : 
                          systemHealth.mlServiceStatus === 'degraded' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {systemHealth.mlServiceStatus}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">System Actions</h3>
                    <div className="space-y-3">
                      <RoleBasedButton
                        requiredPermission="manageRoles"
                        onClick={() => toast.info('Running system diagnostics...')}
                        variant="info"
                        className="w-full"
                      >
                        🧪 Run Diagnostics
                      </RoleBasedButton>
                      
                      <RoleBasedButton
                        requiredPermission="manageRoles"
                        onClick={() => toast.info('Checking for updates...')}
                        variant="secondary"
                        className="w-full"
                      >
                        🔍 Check for Updates
                      </RoleBasedButton>
                      
                      <RoleBasedButton
                        requiredPermission="manageRoles"
                        onClick={() => toast.info('Restarting services...')}
                        variant="warning"
                        className="w-full"
                      >
                        🔄 Restart Services
                      </RoleBasedButton>
                      
                      <RoleBasedButton
                        requiredPermission="manageRoles"
                        onClick={() => toast.info('Backing up system...')}
                        variant="primary"
                        className="w-full"
                      >
                        ☁️ Backup System
                      </RoleBasedButton>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </RoleBasedContent>
  );
};

export default EnhancedAdminPage;