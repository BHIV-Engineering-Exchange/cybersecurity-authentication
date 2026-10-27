import React, { useState, useEffect } from 'react';
import {
  Shield,
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock,
  Link,
  Eye,
  Download,
  ExternalLink,
  Zap
} from 'lucide-react';

const ChainVisualizer = ({ caseId, walletAddress, evidence = [] }) => {
  const [chainData, setChainData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Generate chain data based on case and evidence
    const generateChainData = () => {
      const chain = [
        {
          id: 'flag',
          type: 'flag',
          title: 'Wallet Flagged',
          description: 'Suspicious activity detected',
          timestamp: new Date(Date.now() - 86400000), // 1 day ago
          status: 'completed',
          icon: Shield,
          color: 'red',
          details: {
            walletAddress,
            riskScore: 85,
            reason: 'High-risk transaction patterns'
          }
        },
        {
          id: 'evidence-1',
          type: 'evidence',
          title: 'Evidence Uploaded',
          description: 'Transaction logs and analysis files',
          timestamp: new Date(Date.now() - 82800000), // 23 hours ago
          status: 'completed',
          icon: FileText,
          color: 'blue',
          details: {
            fileCount: evidence.length || 3,
            fileTypes: ['JSON', 'CSV', 'PDF'],
            hash: '0x1234567890abcdef...'
          }
        },
        {
          id: 'analysis',
          type: 'analysis',
          title: 'ML Analysis',
          description: 'AI-powered fraud detection completed',
          timestamp: new Date(Date.now() - 79200000), // 22 hours ago
          status: 'completed',
          icon: AlertTriangle,
          color: 'orange',
          details: {
            riskLevel: 'HIGH',
            fraudProbability: 0.85,
            modelUsed: 'IsolationForest'
          }
        },
        {
          id: 'case-created',
          type: 'case',
          title: 'Case Created',
          description: 'Investigation case opened',
          timestamp: new Date(Date.now() - 75600000), // 21 hours ago
          status: 'completed',
          icon: CheckCircle,
          color: 'green',
          details: {
            caseId: caseId || 'CASE-001',
            investigator: 'Detective Smith',
            priority: 'High'
          }
        },
        {
          id: 'escalation',
          type: 'escalation',
          title: 'Escalated',
          description: 'Case escalated to higher authorities',
          timestamp: new Date(Date.now() - 72000000), // 20 hours ago
          status: 'completed',
          icon: Zap,
          color: 'purple',
          details: {
            escalatedTo: 'RBI & CERT',
            escalationLevel: 2,
            notificationsSent: 4
          }
        },
        {
          id: 'action-pending',
          type: 'action',
          title: 'Action Pending',
          description: 'Awaiting regulatory response',
          timestamp: new Date(Date.now() - 3600000), // 1 hour ago
          status: 'pending',
          icon: Clock,
          color: 'yellow',
          details: {
            expectedResponse: '24-48 hours',
            status: 'Under Review'
          }
        }
      ];

      setChainData(chain);
      setLoading(false);
    };

    generateChainData();
  }, [caseId, walletAddress, evidence]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 border-green-300 text-green-800';
      case 'pending': return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      case 'failed': return 'bg-red-100 border-red-300 text-red-800';
      default: return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };

  const getIconColor = (color) => {
    switch (color) {
      case 'red': return 'text-red-600 bg-red-100';
      case 'blue': return 'text-blue-600 bg-blue-100';
      case 'orange': return 'text-orange-600 bg-orange-100';
      case 'green': return 'text-green-600 bg-green-100';
      case 'purple': return 'text-purple-600 bg-purple-100';
      case 'yellow': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <Link className="w-5 h-5 mr-2" />
          Chain of Custody & Investigation Flow
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Complete timeline of investigation actions and evidence handling
        </p>
      </div>

      <div className="p-6">
        <div className="space-y-6">
          {chainData.map((item, index) => {
            const IconComponent = item.icon;
            const isLast = index === chainData.length - 1;
            
            return (
              <div key={item.id} className="relative">
                {/* Connection line */}
                {!isLast && (
                  <div className="absolute left-5 top-12 w-0.5 h-12 bg-gray-200"></div>
                )}
                
                <div className="flex items-start space-x-4">
                  {/* Icon */}
                  <div className={`relative z-10 flex-shrink-0 w-10 h-10 rounded-full ${getIconColor(item.color)} flex items-center justify-center`}>
                    <IconComponent className="w-5 h-5" />
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">{item.title}</h4>
                        <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(item.status)}`}>
                          {item.status}
                        </span>
                        <span className="text-xs text-gray-500">
                          {item.timestamp.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    
                    {/* Details */}
                    <div className="mt-3 bg-gray-50 rounded-lg p-3">
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        {Object.entries(item.details).map(([key, value]) => (
                          <div key={key}>
                            <span className="font-medium text-gray-700 capitalize">
                              {key.replace(/([A-Z])/g, ' $1').trim()}:
                            </span>
                            <span className="ml-1 text-gray-600">
                              {typeof value === 'object' ? JSON.stringify(value) : value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="mt-3 flex space-x-2">
                      <button className="flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-800">
                        <Eye className="w-3 h-3" />
                        <span>View Details</span>
                      </button>
                      <button className="flex items-center space-x-1 text-xs text-green-600 hover:text-green-800">
                        <Download className="w-3 h-3" />
                        <span>Download</span>
                      </button>
                      {item.type === 'escalation' && (
                        <button className="flex items-center space-x-1 text-xs text-purple-600 hover:text-purple-800">
                          <ExternalLink className="w-3 h-3" />
                          <span>Track Response</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Summary */}
        <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="text-sm font-medium text-blue-900 mb-2">Investigation Summary</h4>
          <div className="grid grid-cols-2 gap-4 text-xs text-blue-800">
            <div>
              <span className="font-medium">Total Steps:</span> {chainData.length}
            </div>
            <div>
              <span className="font-medium">Completed:</span> {chainData.filter(item => item.status === 'completed').length}
            </div>
            <div>
              <span className="font-medium">Pending:</span> {chainData.filter(item => item.status === 'pending').length}
            </div>
            <div>
              <span className="font-medium">Last Updated:</span> {chainData[chainData.length - 1]?.timestamp.toLocaleString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChainVisualizer;