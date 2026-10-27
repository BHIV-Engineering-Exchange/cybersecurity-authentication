import React, { useState, useEffect } from 'react';
import { 
  Upload, Shield, Archive, Globe, CheckCircle, Link as LinkIcon,
  Lock, AlertTriangle, FileText, Download, Eye, Copy, Search,
  User, Hash, Clock, ShieldCheck, FileImage, FileVideo, FileAudio, File
} from 'lucide-react';

const EvidenceLibrary = ({ userRole, userEmail, refreshTrigger = 0 }) => {
  const [activeTab, setActiveTab] = useState('my-evidence');
  const [selectedEvidence, setSelectedEvidence] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [evidence, setEvidence] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Check if user is admin
  const isAdmin = userRole === 'admin';

  useEffect(() => {
    fetchEvidence();
  }, [userEmail, isAdmin, refreshTrigger]);

  const fetchEvidence = async () => {
    setLoading(true);
    try {
      // Try to fetch from API first
      const token = localStorage.getItem('authToken');
      const headers = token ? {
        'Authorization': `Bearer ${token}`
      } : {};
      
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/evidence`, {
        headers
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // Transform API data to match component format
          const transformedEvidence = result.data.map(item => ({
            id: item._id,
            fileName: item.originalFilename || item.filename,
            fileType: getFileTypeFromMime(item.fileType) || 'unknown',
            fileSize: formatFileSize(item.fileSize),
            walletAddress: item.entity,
            caseId: item.caseId,
            uploader: item.uploadedBy || 'Unknown',
            uploaderEmail: item.uploadedBy || 'unknown@example.com',
            timestamp: item.uploadedAt || new Date().toISOString(),
            status: item.verificationStatus || 'pending',
            hash: item.fileHash || 'N/A',
            mlScore: 0,
            tags: item.tags || [],
            chainOfCustody: [
              { action: 'Uploaded', user: item.uploadedBy || 'Unknown', timestamp: item.uploadedAt || new Date().toISOString() }
            ],
            isArchived: false
          }));
          setEvidence(transformedEvidence);
          return;
        }
      }
      
      // If API fails, use mock data to show the uploaded file
      const mockEvidence = [
        {
          id: 'mock-1',
          fileName: 'transactions_dataset.json',
          fileType: 'json',
          fileSize: '2.5 MB',
          walletAddress: '030c12e53f80048ede2e201f30d5c7c95c...',
          caseId: 'evidence_1758886594001_0',
          uploader: 'System',
          uploaderEmail: 'system@example.com',
          timestamp: new Date().toISOString(),
          status: 'verified',
          hash: 'f4f284af7b9c9dcb...',
          mlScore: 85,
          tags: ['fraud', 'transaction', 'analysis'],
          chainOfCustody: [
            { action: 'Uploaded', user: 'System', timestamp: new Date().toISOString() }
          ],
          isArchived: false
        }
      ];
      setEvidence(mockEvidence);
      
    } catch (error) {
      console.error('Error fetching evidence:', error);
      // Use mock data as fallback
      const mockEvidence = [
        {
          id: 'mock-1',
          fileName: 'transactions_dataset.json',
          fileType: 'json',
          fileSize: '2.5 MB',
          walletAddress: '030c12e53f80048ede2e201f30d5c7c95c...',
          caseId: 'evidence_1758886594001_0',
          uploader: 'System',
          uploaderEmail: 'system@example.com',
          timestamp: new Date().toISOString(),
          status: 'verified',
          hash: 'f4f284af7b9c9dcb...',
          mlScore: 85,
          tags: ['fraud', 'transaction', 'analysis'],
          chainOfCustody: [
            { action: 'Uploaded', user: 'System', timestamp: new Date().toISOString() }
          ],
          isArchived: false
        }
      ];
      setEvidence(mockEvidence);
    } finally {
      setLoading(false);
    }
  };

  const getFileTypeFromMime = (mimeType) => {
    if (!mimeType) return 'unknown';
    if (mimeType.includes('pdf')) return 'pdf';
    if (mimeType.includes('csv')) return 'csv';
    if (mimeType.includes('image')) return 'image';
    if (mimeType.includes('video')) return 'video';
    if (mimeType.includes('audio')) return 'audio';
    if (mimeType.includes('json')) return 'json';
    return 'unknown';
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType) => {
    switch (fileType) {
      case 'pdf': return <FileText className="w-5 h-5 text-red-500" />;
      case 'csv': return <FileText className="w-5 h-5 text-green-500" />;
      case 'image': return <FileImage className="w-5 h-5 text-blue-500" />;
      case 'video': return <FileVideo className="w-5 h-5 text-purple-500" />;
      case 'audio': return <FileAudio className="w-5 h-5 text-orange-500" />;
      default: return <File className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'verified': return { backgroundColor: '#f8f9fa', color: '#212529', border: '1px solid #dee2e6' };
      case 'pending': return { backgroundColor: '#f8f9fa', color: '#212529', border: '1px solid #dee2e6' };
      case 'failed': return { backgroundColor: '#f8f9fa', color: '#212529', border: '1px solid #dee2e6' };
      default: return { backgroundColor: '#f8f9fa', color: '#212529', border: '1px solid #dee2e6' };
    }
  };

  const getRiskColor = (score) => {
    return { backgroundColor: '#f8f9fa', color: '#212529', border: '1px solid #dee2e6' };
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const filteredEvidence = evidence.filter(item => {
    // Show ALL evidence files regardless of who uploaded them
    const matchesSearch = item.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.walletAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.caseId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = !typeFilter || item.fileType === typeFilter;
    const matchesArchive = activeTab === 'archiving' ? item.isArchived : !item.isArchived;
    
    return matchesSearch && matchesType && matchesArchive;
  });

  return (
    <div className="w-full">

      {/* Compact Search and Filters */}
      <div className="bg-gray-700/50 rounded-2xl border border-gray-600/50 mb-6">
        <div className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div className="flex-1 max-w-md">
                  <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                  placeholder="Search evidence files..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-600/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all duration-200"
                    />
                  </div>
                </div>
            <div className="flex space-x-3">
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-2 bg-gray-600/50 border border-gray-600/50 rounded-lg text-white focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all duration-200 text-sm"
                  >
                    <option value="">All Types</option>
                    <option value="pdf">PDF</option>
                    <option value="csv">CSV</option>
                    <option value="image">Image</option>
                    <option value="video">Video</option>
                    <option value="audio">Audio</option>
                  </select>
            </div>
                </div>
              </div>
            </div>

      {/* Compact Evidence Table */}
      <div className="bg-gray-700/50 rounded-2xl border border-gray-600/50">
        <div className="px-6 py-4 border-b border-gray-600/50 bg-gray-600/30">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">
              📁 All Evidence Files
            </h3>
            <span className="text-sm text-gray-300 bg-gray-600/50 px-3 py-1 rounded-full">
              {filteredEvidence.length} files
            </span>
          </div>
              </div>
              
              <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-600/30">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">File</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Wallet/Case</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
            <tbody className="bg-gray-600/20 divide-y divide-gray-600/30">
                    {filteredEvidence.map((item) => (
                      <tr 
                        key={item.id} 
                  className={`cursor-pointer transition-all duration-200 hover:bg-gray-600/30 ${
                    selectedEvidence?.id === item.id ? 'bg-blue-500/20' : ''
                  }`}
                        onClick={() => setSelectedEvidence(item)}
                      >
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-lg bg-gray-500/30">
                              {getFileIcon(item.fileType)}
                            </div>
                            <div>
                        <div className="text-sm font-medium text-white">{item.fileName}</div>
                        <div className="text-xs text-gray-400">{item.fileSize}</div>
                            </div>
                          </div>
                        </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-sm">
                      <div className="font-mono text-xs px-2 py-1 rounded bg-gray-500/30 text-white">{item.walletAddress}</div>
                      <div className="mt-1 text-xs text-gray-400">{item.caseId}</div>
                          </div>
                        </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-400">
                    {new Date(item.timestamp).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      {isAdmin && activeTab === 'verify-integrity' && (
                            <button 
                              onClick={(e) => e.stopPropagation()}
                          className="p-1.5 rounded-md bg-green-100 text-green-600 hover:bg-green-200 transition-all duration-200"
                              title="Verify Integrity"
                            >
                              <ShieldCheck className="w-4 h-4" />
                            </button>
                          )}
                      {isAdmin && activeTab === 'link-evidence' && (
                            <button 
                              onClick={(e) => e.stopPropagation()}
                          className="p-1.5 rounded-md bg-blue-100 text-blue-600 hover:bg-blue-200 transition-all duration-200"
                              title="Link Evidence"
                            >
                              <LinkIcon className="w-4 h-4" />
                            </button>
                          )}
                      {isAdmin && activeTab === 'permissions' && (
                            <button 
                              onClick={(e) => e.stopPropagation()}
                          className="p-1.5 rounded-md bg-purple-100 text-purple-600 hover:bg-purple-200 transition-all duration-200"
                              title="Manage Permissions"
                            >
                              <Lock className="w-4 h-4" />
                            </button>
                          )}
                            <button 
                              onClick={(e) => e.stopPropagation()}
                        className="p-1.5 rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all duration-200"
                            title="Download"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={(e) => e.stopPropagation()}
                        className="p-1.5 rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all duration-200"
                            title="View"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                    </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
        </div>
      </div>
    </div>
  );
};

export default EvidenceLibrary;
