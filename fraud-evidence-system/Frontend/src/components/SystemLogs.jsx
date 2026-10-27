import React, { useState, useEffect } from 'react';
import { 
  Clock,
  User,
  Activity,
  Target,
  CheckCircle,
  XCircle,
  FileText,
  Download,
  Search,
  Filter,
  Eye,
  Copy,
  AlertTriangle,
  Shield,
  Lock,
  Unlock,
  Upload,
  Archive,
  Send,
  Phone,
  UserPlus,
  UserMinus,
  Key,
  Settings,
  Database,
  Server,
  Brain,
  Snowflake,
  Sun,
  FileCheck,
  Link,
  ExternalLink
} from 'lucide-react';

const SystemLogs = () => {
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);
  const [showLogDetails, setShowLogDetails] = useState(false);

  // Mock data for system logs
  useEffect(() => {
    const mockLogs = [
      // User Activity Logs
      {
        id: '1',
        timestamp: '2024-01-20T15:30:00Z',
        user: 'admin123@fraud.com',
        role: 'Admin',
        action: 'Login',
        target: 'System',
        status: 'Success',
        details: 'Successful admin login via dashboard',
        logType: 'User Activity',
        ipAddress: '192.168.1.100',
        userAgent: 'Chrome/120.0.0.0'
      },
      {
        id: '2',
        timestamp: '2024-01-20T15:25:00Z',
        user: 'detective.smith@police.gov',
        role: 'Investigator',
        action: 'Failed Login',
        target: 'System',
        status: 'Failed',
        details: 'Invalid password attempt',
        logType: 'User Activity',
        ipAddress: '192.168.1.150',
        userAgent: 'Firefox/121.0.0.0'
      },
      {
        id: '3',
        timestamp: '2024-01-20T15:20:00Z',
        user: 'admin123@fraud.com',
        role: 'Admin',
        action: '2FA Setup',
        target: 'admin123@fraud.com',
        status: 'Success',
        details: 'Two-factor authentication enabled',
        logType: 'User Activity',
        ipAddress: '192.168.1.100',
        userAgent: 'Chrome/120.0.0.0'
      },

      // Case/Wallet Actions
      {
        id: '4',
        timestamp: '2024-01-20T14:45:00Z',
        user: 'detective.smith@police.gov',
        role: 'Investigator',
        action: 'Case Created',
        target: 'CASE-001',
        status: 'Success',
        details: 'New fraud investigation case created for wallet 0x742d35Cc6634C0532925a3b8D',
        logType: 'Case/Wallet Actions',
        walletId: '0x742d35Cc6634C0532925a3b8D',
        caseId: 'CASE-001'
      },
      {
        id: '5',
        timestamp: '2024-01-20T14:30:00Z',
        user: 'system@fraud-detection.ai',
        role: 'ML System',
        action: 'Wallet Flagged',
        target: '0x742d35Cc6634C0532925a3b8D',
        status: 'Success',
        details: 'ML model flagged wallet with risk score 95 - suspicious surge in transactions',
        logType: 'Case/Wallet Actions',
        walletId: '0x742d35Cc6634C0532925a3b8D',
        riskScore: 95
      },
      {
        id: '6',
        timestamp: '2024-01-20T14:25:00Z',
        user: 'system@fraud-detection.ai',
        role: 'ML System',
        action: 'ML Results Generated',
        target: '0x8ba1f109551bD432803012645H',
        status: 'Success',
        details: 'Machine learning analysis completed with confidence 87%',
        logType: 'Case/Wallet Actions',
        walletId: '0x8ba1f109551bD432803012645H',
        confidence: 87
      },

      // Evidence Actions
      {
        id: '7',
        timestamp: '2024-01-20T13:15:00Z',
        user: 'detective.smith@police.gov',
        role: 'Investigator',
        action: 'Evidence Uploaded',
        target: 'EVID-001',
        status: 'Success',
        details: 'Transaction log PDF uploaded - 2.3 MB',
        logType: 'Evidence Actions',
        evidenceId: 'EVID-001',
        fileName: 'transaction_log.pdf',
        fileSize: '2.3 MB',
        fileHash: 'sha256:a1b2c3d4e5f6...'
      },
      {
        id: '8',
        timestamp: '2024-01-20T13:10:00Z',
        user: 'admin123@fraud.com',
        role: 'Admin',
        action: 'Evidence Verified',
        target: 'EVID-002',
        status: 'Success',
        details: 'Integrity verification completed - hash matches original',
        logType: 'Evidence Actions',
        evidenceId: 'EVID-002',
        fileName: 'wallet_activity.csv',
        verificationStatus: 'Verified'
      },
      {
        id: '9',
        timestamp: '2024-01-20T12:45:00Z',
        user: 'admin123@fraud.com',
        role: 'Admin',
        action: 'Evidence Re-linked',
        target: 'EVID-003',
        status: 'Success',
        details: 'Evidence file re-linked to CASE-002',
        logType: 'Evidence Actions',
        evidenceId: 'EVID-003',
        caseId: 'CASE-002'
      },

      // Escalations
      {
        id: '10',
        timestamp: '2024-01-20T11:30:00Z',
        user: 'admin123@fraud.com',
        role: 'Admin',
        action: 'Wallet Frozen',
        target: '0x742d35Cc6634C0532925a3b8D',
        status: 'Success',
        details: 'Wallet temporarily blocked due to high ML risk score',
        logType: 'Escalations',
        walletId: '0x742d35Cc6634C0532925a3b8D',
        freezeReason: 'High risk ML score (95) - Suspected money mule activity'
      },
      {
        id: '11',
        timestamp: '2024-01-20T11:25:00Z',
        user: 'admin123@fraud.com',
        role: 'Admin',
        action: 'Escalation Sent',
        target: 'Cybercrime Unit - FBI',
        status: 'Success',
        details: 'Case escalation sent to law enforcement with 3 evidence files',
        logType: 'Escalations',
        recipient: 'Cybercrime Unit - FBI',
        evidenceCount: 3
      },

      // Contact Police
      {
        id: '12',
        timestamp: '2024-01-20T10:15:00Z',
        user: 'admin123@fraud.com',
        role: 'Admin',
        action: 'Police Report Submitted',
        target: 'CASE-001',
        status: 'Success',
        details: 'Secure report sent to FBI Cybercrime Unit',
        logType: 'Contact Police',
        caseId: 'CASE-001',
        recipient: 'FBI Cybercrime Unit',
        reportId: 'REPORT-001'
      },
      {
        id: '13',
        timestamp: '2024-01-20T10:10:00Z',
        user: 'admin123@fraud.com',
        role: 'Admin',
        action: 'Evidence Attached',
        target: 'REPORT-001',
        status: 'Success',
        details: '3 evidence files attached to police report',
        logType: 'Contact Police',
        reportId: 'REPORT-001',
        evidenceCount: 3
      },

      // User Management
      {
        id: '14',
        timestamp: '2024-01-20T09:30:00Z',
        user: 'admin123@fraud.com',
        role: 'Admin',
        action: 'Investigator Added',
        target: 'officer.johnson@nypd.org',
        status: 'Success',
        details: 'New investigator account created with view-only permissions',
        logType: 'User Management',
        newUser: 'officer.johnson@nypd.org',
        permissions: 'View-only'
      },
      {
        id: '15',
        timestamp: '2024-01-20T09:25:00Z',
        user: 'admin123@fraud.com',
        role: 'Admin',
        action: 'Permissions Updated',
        target: 'detective.brown@police.gov',
        status: 'Success',
        details: 'Investigator permissions upgraded to upload-only',
        logType: 'User Management',
        targetUser: 'detective.brown@police.gov',
        newPermissions: 'Upload-only'
      },

      // System Events
      {
        id: '16',
        timestamp: '2024-01-20T08:45:00Z',
        user: 'system@fraud-detection.ai',
        role: 'ML System',
        action: 'Model Update',
        target: 'Risk Assessment Model',
        status: 'Success',
        details: 'ML model v2.1.3 deployed with improved accuracy',
        logType: 'System Events',
        modelVersion: 'v2.1.3',
        accuracy: '94.2%'
      },
      {
        id: '17',
        timestamp: '2024-01-20T08:30:00Z',
        user: 'system@api.fraud-system.com',
        role: 'API',
        action: 'API Failure',
        target: '/api/evidence/upload',
        status: 'Failed',
        details: 'Temporary API failure during evidence upload - resolved in 2 minutes',
        logType: 'System Events',
        endpoint: '/api/evidence/upload',
        errorCode: '500',
        duration: '2 minutes'
      },
      {
        id: '18',
        timestamp: '2024-01-20T07:15:00Z',
        user: 'system@database.fraud-system.com',
        role: 'Database',
        action: 'Backup Completed',
        target: 'Evidence Database',
        status: 'Success',
        details: 'Daily backup completed successfully - 15.7 GB',
        logType: 'System Events',
        database: 'Evidence Database',
        backupSize: '15.7 GB'
      }
    ];

    setLogs(mockLogs);
    setFilteredLogs(mockLogs);
  }, []);

  // Filter logs based on search and filters
  useEffect(() => {
    let filtered = logs;

    if (searchTerm) {
      filtered = filtered.filter(log => 
        log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.target.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.walletId && log.walletId.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (log.caseId && log.caseId.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (log.evidenceId && log.evidenceId.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (userFilter) {
      filtered = filtered.filter(log => log.user.toLowerCase().includes(userFilter.toLowerCase()));
    }

    if (actionFilter) {
      filtered = filtered.filter(log => log.action === actionFilter);
    }

    if (statusFilter) {
      filtered = filtered.filter(log => log.status === statusFilter);
    }

    if (dateFilter) {
      const filterDate = new Date(dateFilter);
      filtered = filtered.filter(log => {
        const logDate = new Date(log.timestamp);
        return logDate.toDateString() === filterDate.toDateString();
      });
    }

    setFilteredLogs(filtered);
  }, [logs, searchTerm, userFilter, actionFilter, statusFilter, dateFilter]);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Success': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'Failed': return <XCircle className="w-4 h-4 text-red-600" />;
      default: return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Success': return 'bg-green-100 text-green-800';
      case 'Failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getActionIcon = (action, logType) => {
    switch (action) {
      case 'Login': return <Shield className="w-4 h-4 text-blue-500" />;
      case 'Failed Login': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'Case Created': return <FileText className="w-4 h-4 text-green-500" />;
      case 'Wallet Flagged': return <Brain className="w-4 h-4 text-purple-500" />;
      case 'Evidence Uploaded': return <Upload className="w-4 h-4 text-blue-500" />;
      case 'Evidence Verified': return <FileCheck className="w-4 h-4 text-green-500" />;
      case 'Wallet Frozen': return <Snowflake className="w-4 h-4 text-blue-500" />;
      case 'Wallet Unfrozen': return <Sun className="w-4 h-4 text-yellow-500" />;
      case 'Police Report Submitted': return <Send className="w-4 h-4 text-red-500" />;
      case 'Investigator Added': return <UserPlus className="w-4 h-4 text-green-500" />;
      case 'Permissions Updated': return <Settings className="w-4 h-4 text-purple-500" />;
      default: return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const getLogTypeColor = (logType) => {
    switch (logType) {
      case 'User Activity': return 'bg-blue-100 text-blue-800';
      case 'Case/Wallet Actions': return 'bg-green-100 text-green-800';
      case 'Evidence Actions': return 'bg-purple-100 text-purple-800';
      case 'Escalations': return 'bg-red-100 text-red-800';
      case 'Contact Police': return 'bg-orange-100 text-orange-800';
      case 'User Management': return 'bg-indigo-100 text-indigo-800';
      case 'System Events': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleViewLogDetails = (log) => {
    setSelectedLog(log);
    setShowLogDetails(true);
  };

  const handleExportLogs = (format) => {
    const data = filteredLogs.map(log => ({
      timestamp: log.timestamp,
      user: log.user,
      role: log.role,
      action: log.action,
      target: log.target,
      status: log.status,
      details: log.details,
      logType: log.logType,
      ...(log.walletId && { walletId: log.walletId }),
      ...(log.caseId && { caseId: log.caseId }),
      ...(log.evidenceId && { evidenceId: log.evidenceId }),
      ...(log.ipAddress && { ipAddress: log.ipAddress })
    }));

    if (format === 'json') {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `system-logs-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else if (format === 'csv') {
      const headers = ['Timestamp', 'User', 'Role', 'Action', 'Target', 'Status', 'Details', 'Log Type'];
      const csvContent = [
        headers.join(','),
        ...data.map(log => [
          log.timestamp,
          log.user,
          log.role,
          log.action,
          log.target,
          log.status,
          `"${log.details}"`,
          log.logType
        ].join(','))
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `system-logs-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const uniqueActions = [...new Set(logs.map(log => log.action))];
  const uniqueUsers = [...new Set(logs.map(log => log.user))];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-r from-gray-600 to-gray-800 rounded-2xl flex items-center justify-center shadow-lg">
                  <Database className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">System Logs</h1>
                  <p className="mt-2 text-gray-600">Complete audit trail of all system activities and user actions</p>
                </div>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => handleExportLogs('json')}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Download className="w-4 h-4" />
                  <span>Export JSON</span>
                </button>
                <button
                  onClick={() => handleExportLogs('csv')}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  <Download className="w-4 h-4" />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow mb-6 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search logs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">User</label>
              <select
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Users</option>
                {uniqueUsers.map(user => (
                  <option key={user} value={user}>{user}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Action</label>
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Actions</option>
                {uniqueActions.map(action => (
                  <option key={action} value={action}>{action}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Status</option>
                <option value="Success">Success</option>
                <option value="Failed">Failed</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Logs Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">System Activity Logs</h2>
              <span className="text-sm text-gray-500">
                Showing {filteredLogs.length} of {logs.length} logs
              </span>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User / Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Target</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Log Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span>{new Date(log.timestamp).toLocaleString()}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{log.user}</div>
                          <div className="text-sm text-gray-500">{log.role}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {getActionIcon(log.action, log.logType)}
                        <span className="text-sm text-gray-900">{log.action}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center space-x-2">
                        <Target className="w-4 h-4 text-gray-400" />
                        <span>{log.target}</span>
                        {(log.walletId || log.caseId || log.evidenceId) && (
                          <button
                            onClick={() => copyToClipboard(log.walletId || log.caseId || log.evidenceId)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(log.status)}
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(log.status)}`}>
                          {log.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getLogTypeColor(log.logType)}`}>
                        {log.logType}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleViewLogDetails(log)}
                        className="text-blue-600 hover:text-blue-900 flex items-center space-x-1"
                      >
                        <Eye className="w-4 h-4" />
                        <span>View Details</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Log Details Modal */}
        {showLogDetails && selectedLog && (
          <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 relative">
              <button
                onClick={() => setShowLogDetails(false)}
                className="absolute top-4 right-4 text-gray-500 hover:text-gray-800"
              >
                ×
              </button>
              
              <h3 className="text-xl font-bold text-gray-900 mb-4">Log Details</h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Timestamp</label>
                    <p className="text-sm text-gray-900">{new Date(selectedLog.timestamp).toLocaleString()}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Status</label>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedLog.status)}`}>
                      {selectedLog.status}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">User</label>
                    <p className="text-sm text-gray-900">{selectedLog.user}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Role</label>
                    <p className="text-sm text-gray-900">{selectedLog.role}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Action</label>
                    <p className="text-sm text-gray-900">{selectedLog.action}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Log Type</label>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getLogTypeColor(selectedLog.logType)}`}>
                      {selectedLog.logType}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Target</label>
                  <p className="text-sm text-gray-900">{selectedLog.target}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Details</label>
                  <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded">{selectedLog.details}</p>
                </div>

                {/* Additional fields based on log type */}
                {selectedLog.walletId && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Wallet ID</label>
                    <div className="flex items-center space-x-2">
                      <p className="text-sm text-gray-900 font-mono">{selectedLog.walletId}</p>
                      <button onClick={() => copyToClipboard(selectedLog.walletId)}>
                        <Copy className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                      </button>
                    </div>
                  </div>
                )}

                {selectedLog.caseId && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Case ID</label>
                    <p className="text-sm text-gray-900">{selectedLog.caseId}</p>
                  </div>
                )}

                {selectedLog.evidenceId && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Evidence ID</label>
                    <p className="text-sm text-gray-900">{selectedLog.evidenceId}</p>
                  </div>
                )}

                {selectedLog.ipAddress && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">IP Address</label>
                    <p className="text-sm text-gray-900">{selectedLog.ipAddress}</p>
                  </div>
                )}

                {selectedLog.userAgent && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">User Agent</label>
                    <p className="text-sm text-gray-900">{selectedLog.userAgent}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SystemLogs;
