import React, { useState, useEffect } from 'react';
import { 
  Database,
  Search, 
  Filter, 
  Download, 
  Eye, 
  Edit,
  Trash2,
  AlertTriangle, 
  CheckCircle,
  Clock,
  User,
  Calendar,
  TrendingUp,
  BarChart3,
  RefreshCw,
  Plus,
  FileText,
  Shield
} from 'lucide-react';

const CaseManager = ({ userRole = 'admin', userEmail }) => {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    investigatorId: '',
    riskLevel: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });
  const [investigators, setInvestigators] = useState([]);
  const [selectedCase, setSelectedCase] = useState(null);
  const [showCaseDetails, setShowCaseDetails] = useState(false);

  // Fetch cases data
  const fetchCases = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const headers = token ? {
        'Authorization': `Bearer ${token}`
      } : {};

      const queryParams = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        ...filters
      });

      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/case-manager?${queryParams}`, {
        headers
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setCases(result.data);
          setPagination(result.pagination);
        }
      } else {
        // Use mock data if API fails
        setCases(getMockCases());
        setPagination({
          page: 1,
          limit: 20,
          total: 3,
          pages: 1
        });
      }
    } catch (error) {
      console.error('Error fetching cases:', error);
      // Use mock data as fallback
      setCases(getMockCases());
      setPagination({
        page: 1,
        limit: 20,
        total: 3,
        pages: 1
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch case statistics
  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const headers = token ? {
        'Authorization': `Bearer ${token}`
      } : {};

      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/case-manager/stats`, {
        headers
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setStats(result.data);
        }
      } else {
        // Use mock stats
        setStats(getMockStats());
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
      setStats(getMockStats());
    }
  };

  // Fetch investigators list (admin only)
  const fetchInvestigators = async () => {
    if (userRole !== 'admin') return;

    try {
      const token = localStorage.getItem('authToken');
      const headers = token ? {
        'Authorization': `Bearer ${token}`
      } : {};

      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/case-manager/investigators/list`, {
        headers
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setInvestigators(result.data);
        }
      }
    } catch (error) {
      console.error('Error fetching investigators:', error);
    }
  };

  useEffect(() => {
    fetchCases();
    fetchStats();
    fetchInvestigators();
  }, [pagination.page, filters]);

  // Mock data functions
  const getMockCases = () => [
    {
      _id: '1',
      caseId: 'CASE-001',
      walletAddress: '0x742d35Cc6634C0532925a3b8D',
      riskScore: 85,
      status: 'Escalated',
      priority: 'High',
      investigatorId: { name: 'Detective Smith', email: 'detective.smith@example.com' },
      investigatorName: 'Detective Smith',
      investigatorEmail: 'detective.smith@example.com',
      analysisResults: {
        riskLevel: 'HIGH',
        fraudProbability: 0.85,
        isSuspicious: true,
        anomalyScore: -0.75
      },
      lastUpdated: '2024-01-20T14:30:00Z',
      createdAt: '2024-01-20T10:00:00Z',
      tags: ['ML Analysis', 'HIGH', 'Suspicious']
    },
    {
      _id: '2',
      caseId: 'CASE-002',
      walletAddress: 'b71643...11a2',
      riskScore: 45,
      status: 'Under Investigation',
      priority: 'Medium',
      investigatorId: { name: 'Officer Johnson', email: 'officer.johnson@example.com' },
      investigatorName: 'Officer Johnson',
      investigatorEmail: 'officer.johnson@example.com',
      analysisResults: {
        riskLevel: 'MEDIUM',
        fraudProbability: 0.45,
        isSuspicious: false,
        anomalyScore: -0.25
      },
      lastUpdated: '2024-01-19T16:45:00Z',
      createdAt: '2024-01-19T14:00:00Z',
      tags: ['ML Analysis', 'MEDIUM']
    },
    {
      _id: '3',
      caseId: 'CASE-003',
      walletAddress: '030c12...f0de',
      riskScore: 25,
      status: 'New',
      priority: 'Low',
      investigatorId: { name: 'Detective Brown', email: 'detective.brown@example.com' },
      investigatorName: 'Detective Brown',
      investigatorEmail: 'detective.brown@example.com',
      analysisResults: {
        riskLevel: 'LOW',
        fraudProbability: 0.25,
        isSuspicious: false,
        anomalyScore: 0.15
      },
      lastUpdated: '2024-01-18T09:15:00Z',
      createdAt: '2024-01-18T09:15:00Z',
      tags: ['ML Analysis', 'LOW']
    }
  ];

  const getMockStats = () => ({
    totalCases: 3,
    newCases: 1,
    underInvestigation: 1,
    escalated: 1,
    resolved: 0,
    closed: 0,
    avgRiskScore: 52,
    highRiskCases: 1,
    criticalCases: 0
  });

  // Helper functions
  const getStatusColor = (status) => {
    switch (status) {
      case 'New': return 'bg-blue-100 text-blue-800';
      case 'Under Investigation': return 'bg-yellow-100 text-yellow-800';
      case 'Escalated': return 'bg-red-100 text-red-800';
      case 'Resolved': return 'bg-green-100 text-green-800';
      case 'Closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'Critical': return 'bg-red-100 text-red-800';
      case 'High': return 'bg-orange-100 text-orange-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'Low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRiskColor = (score) => {
    if (score >= 80) return 'bg-red-100 text-red-800';
    if (score >= 60) return 'bg-orange-100 text-orange-800';
    if (score >= 40) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleViewCase = (caseData) => {
    setSelectedCase(caseData);
    setShowCaseDetails(true);
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <Database className="w-6 h-6 mr-3 text-blue-600" />
              Case Manager
            </h1>
            <p className="text-gray-600 mt-1">
              {userRole === 'admin' ? 'Manage all ML analysis cases from investigators' : 'View your ML analysis cases'}
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={fetchCases}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Cases</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalCases || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">High Risk</p>
              <p className="text-2xl font-bold text-gray-900">{stats.highRiskCases || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Under Investigation</p>
              <p className="text-2xl font-bold text-gray-900">{stats.underInvestigation || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg Risk Score</p>
              <p className="text-2xl font-bold text-gray-900">{Math.round(stats.avgRiskScore || 0)}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center space-x-4 mb-4">
          <Filter className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Status</option>
              <option value="New">New</option>
              <option value="Under Investigation">Under Investigation</option>
              <option value="Escalated">Escalated</option>
              <option value="Resolved">Resolved</option>
              <option value="Closed">Closed</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
            <select
              value={filters.priority}
              onChange={(e) => handleFilterChange('priority', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Priority</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
                  </div>

          {userRole === 'admin' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Investigator</label>
              <select
                value={filters.investigatorId}
                onChange={(e) => handleFilterChange('investigatorId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Investigators</option>
                {investigators.map(inv => (
                  <option key={inv._id} value={inv._id}>{inv.name || inv.email}</option>
                ))}
              </select>
                </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Risk Level</label>
                  <select
                    value={filters.riskLevel}
              onChange={(e) => handleFilterChange('riskLevel', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">All Risk Levels</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Cases Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Cases ({pagination.total})
          </h3>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading cases...</p>
          </div>
        ) : cases.length === 0 ? (
          <div className="p-8 text-center">
            <Database className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No cases found</p>
          </div>
        ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Case ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Wallet Address
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Risk Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Investigator
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Updated
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                {cases.map((caseData) => (
                  <tr key={caseData._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-mono text-sm font-medium text-gray-900">
                        {caseData.caseId}
                      </span>
                        </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-mono text-sm text-gray-900">
                        {caseData.walletAddress}
                      </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getRiskColor(caseData.riskScore)}`}>
                        {caseData.riskScore}%
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(caseData.status)}`}>
                        {caseData.status}
                          </span>
                        </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <User className="w-4 h-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-900">
                          {caseData.investigatorName || caseData.investigatorEmail}
                        </span>
                      </div>
                        </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-900">
                          {formatDate(caseData.lastUpdated)}
                        </span>
                      </div>
                        </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                          <button
                          onClick={() => handleViewCase(caseData)}
                          className="text-blue-600 hover:text-blue-900 flex items-center space-x-1"
                          >
                            <Eye className="w-4 h-4" />
                          <span>View</span>
                          </button>
                        {userRole === 'admin' && (
                          <button className="text-gray-600 hover:text-gray-900 flex items-center space-x-1">
                            <Edit className="w-4 h-4" />
                            <span>Edit</span>
                          </button>
                        )}
                      </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} cases
            </div>
            <div className="flex space-x-2">
                <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="px-3 py-1 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                Previous
                </button>
              <span className="px-3 py-1 bg-blue-600 text-white rounded-lg">
                {pagination.page}
              </span>
                <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.pages}
                className="px-3 py-1 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
                </button>
            </div>
          </div>
        )}
      </div>

      {/* Case Details Modal */}
      {showCaseDetails && selectedCase && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Case Details: {selectedCase.caseId}
              </h3>
                <button
                onClick={() => setShowCaseDetails(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                <span className="sr-only">Close</span>
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                </button>
              </div>
            <div className="p-6 space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Basic Information</h4>
                  <div className="space-y-2 text-sm">
                    <div><span className="font-medium">Case ID:</span> {selectedCase.caseId}</div>
                    <div><span className="font-medium">Wallet Address:</span> <span className="font-mono">{selectedCase.walletAddress}</span></div>
                    <div><span className="font-medium">Investigator:</span> {selectedCase.investigatorName}</div>
                    <div><span className="font-medium">Status:</span> 
                      <span className={`ml-2 px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedCase.status)}`}>
                        {selectedCase.status}
                      </span>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Risk Assessment</h4>
                  <div className="space-y-2 text-sm">
                    <div><span className="font-medium">Risk Score:</span> 
                      <span className={`ml-2 px-2 py-1 text-xs font-semibold rounded-full ${getRiskColor(selectedCase.riskScore)}`}>
                        {selectedCase.riskScore}%
                      </span>
                    </div>
                    <div><span className="font-medium">Risk Level:</span> 
                      <span className={`ml-2 px-2 py-1 text-xs font-semibold rounded-full ${
                        selectedCase.analysisResults?.riskLevel === 'HIGH' ? 'bg-red-100 text-red-800' :
                        selectedCase.analysisResults?.riskLevel === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {selectedCase.analysisResults?.riskLevel}
                      </span>
                    </div>
                    <div><span className="font-medium">Suspicious:</span> 
                      <span className={`ml-2 px-2 py-1 text-xs font-semibold rounded-full ${
                        selectedCase.analysisResults?.isSuspicious ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {selectedCase.analysisResults?.isSuspicious ? 'YES' : 'NO'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* ML Analysis Results */}
              {selectedCase.analysisResults && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">ML Analysis Results</h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div><span className="font-medium">Fraud Probability:</span> {Math.round((selectedCase.analysisResults.fraudProbability || 0) * 100)}%</div>
                      <div><span className="font-medium">Anomaly Score:</span> {selectedCase.analysisResults.anomalyScore?.toFixed(3)}</div>
                      <div><span className="font-medium">Model Type:</span> {selectedCase.modelInfo?.modelType || 'IsolationForest'}</div>
                      <div><span className="font-medium">Model Version:</span> {selectedCase.modelInfo?.modelVersion || '1.0'}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tags */}
              {selectedCase.tags && selectedCase.tags.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Tags</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedCase.tags.map((tag, index) => (
                      <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              )}

              {/* Timestamps */}
                        <div>
                <h4 className="font-semibold text-gray-900 mb-3">Timestamps</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="font-medium">Created:</span> {formatDate(selectedCase.createdAt)}</div>
                  <div><span className="font-medium">Last Updated:</span> {formatDate(selectedCase.lastUpdated)}</div>
              </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CaseManager;