import React, { useState, useEffect } from 'react';
import { 
  Snowflake,
  Sun,
  AlertTriangle,
  Shield,
  Clock,
  User,
  FileText,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  Eye,
  Copy,
  Bell,
  LogOut,
  Lock,
  Unlock,
  Activity,
  Download,
  FolderOpen,
  Brain,
  Hash,
  Calendar,
  UserCheck
} from 'lucide-react';

const Escalations = () => {
  const [activeTab, setActiveTab] = useState('search');
  const [walletSearchInput, setWalletSearchInput] = useState('');
  const [searchedWallet, setSearchedWallet] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [frozenWallets, setFrozenWallets] = useState([]);
  const [unfrozenWallets, setUnfrozenWallets] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFreezeModal, setShowFreezeModal] = useState(false);
  const [showUnfreezeModal, setShowUnfreezeModal] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState(null);
  const [freezeReason, setFreezeReason] = useState('');
  const [unfreezeReason, setUnfreezeReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Mock data - replace with actual API calls
  useEffect(() => {
    setFrozenWallets([
      {
        id: '1',
        walletAddress: '0x742d35Cc6634C0532925a3b8D',
        riskScore: 95,
        frozenBy: 'Detective Smith',
        frozenAt: '2024-01-20T10:30:00Z',
        freezeReason: 'High risk ML score (95) - Suspected money mule activity',
        evidenceCount: 3,
        status: 'frozen'
      },
      {
        id: '2',
        walletAddress: '0x8ba1f109551bD432803012645H',
        riskScore: 88,
        frozenBy: 'Officer Johnson',
        frozenAt: '2024-01-19T15:45:00Z',
        freezeReason: 'Linked to flagged exchange - Police request',
        evidenceCount: 5,
        status: 'frozen'
      }
    ]);

    setUnfrozenWallets([
      {
        id: '3',
        walletAddress: '0x9cA8e8F8c1C0F8f8F8F8F8F8F',
        riskScore: 45,
        unfrozenBy: 'Detective Brown',
        unfrozenAt: '2024-01-18T09:15:00Z',
        unfreezeReason: 'False positive - Investigation cleared wallet',
        evidenceCount: 2,
        status: 'unfrozen'
      },
      {
        id: '4',
        walletAddress: '0xAbC123DeF4567890123456789',
        riskScore: 32,
        unfrozenBy: 'Officer Wilson',
        unfrozenAt: '2024-01-17T14:30:00Z',
        unfreezeReason: 'Admin approval - Legitimate business activity',
        evidenceCount: 1,
        status: 'unfrozen'
      }
    ]);
  }, []);

  // Mock wallet search function
  const searchWallet = async () => {
    if (!walletSearchInput.trim()) {
      alert('Please enter a wallet address');
      return;
    }

    setIsSearching(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Mock wallet data based on search
    const mockWallet = {
      address: walletSearchInput,
      riskScore: Math.floor(Math.random() * 100),
      status: Math.random() > 0.5 ? 'active' : 'frozen',
      mlTags: ['High Volume', 'Suspicious Pattern', 'Cross-chain Activity'],
      linkedCases: [
        { id: 'CASE-001', title: 'Money Laundering Investigation' },
        { id: 'CASE-002', title: 'Exchange Compliance Check' }
      ],
      evidence: [
        { hash: '0x123abc...', filename: 'transaction_log.pdf' },
        { hash: '0x456def...', filename: 'wallet_analysis.csv' }
      ],
      lastActivity: '2024-01-20T16:45:00Z'
    };
    
    setSearchedWallet(mockWallet);
    setIsSearching(false);
  };

  const getRiskColor = (score) => {
    if (score >= 80) return 'text-red-600 bg-red-100';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-green-600 bg-green-100';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'frozen': return <Lock className="w-5 h-5 text-red-600" />;
      case 'suspicious': return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      default: return <Activity className="w-5 h-5 text-gray-600" />;
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    // Add toast notification here
  };

  const handleFreezeWallet = (wallet) => {
    setSelectedWallet(wallet);
    setShowFreezeModal(true);
  };

  const handleUnfreezeWallet = (wallet) => {
    setSelectedWallet(wallet);
    setShowUnfreezeModal(true);
  };

  const confirmFreezeWallet = async () => {
    if (!freezeReason.trim()) {
      alert('Please provide a reason for freezing this wallet.');
      return;
    }

    setIsLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const walletToFreeze = selectedWallet.walletAddress || selectedWallet.address;
    
    // Add to frozen wallets list
    const newFrozenWallet = {
      id: Date.now().toString(),
      walletAddress: walletToFreeze,
      riskScore: selectedWallet.riskScore || 0,
      frozenBy: 'Current User', // Replace with actual user
      frozenAt: new Date().toISOString(),
      freezeReason,
      evidenceCount: selectedWallet.evidence?.length || 0,
      status: 'frozen'
    };
    
    setFrozenWallets(prev => [...prev, newFrozenWallet]);
    
    // Update searched wallet status if it matches
    if (searchedWallet && (searchedWallet.address === walletToFreeze)) {
      setSearchedWallet(prev => ({ ...prev, status: 'frozen' }));
    }

    // Log audit trail
    console.log('Audit Trail:', {
      action: 'FREEZE_WALLET',
      wallet: walletToFreeze,
      reason: freezeReason,
      timestamp: new Date().toISOString(),
      user: 'Current User'
    });

    // Send notification
    console.log('Notification sent to Admin and linked authorities');

    setIsLoading(false);
    setShowFreezeModal(false);
    setFreezeReason('');
    setSelectedWallet(null);
  };

  const confirmUnfreezeWallet = async () => {
    if (!unfreezeReason.trim()) {
      alert('Please provide a reason for unfreezing this wallet.');
      return;
    }

    setIsLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const walletToUnfreeze = selectedWallet.walletAddress || selectedWallet.address;
    
    // Move from frozen to unfrozen
    const frozenWallet = frozenWallets.find(w => w.walletAddress === walletToUnfreeze);
    if (frozenWallet) {
      const newUnfrozenWallet = {
        ...frozenWallet,
        id: Date.now().toString(),
        unfrozenBy: 'Current User',
        unfrozenAt: new Date().toISOString(),
        unfreezeReason,
        status: 'unfrozen'
      };
      
      setUnfrozenWallets(prev => [...prev, newUnfrozenWallet]);
      setFrozenWallets(prev => prev.filter(w => w.walletAddress !== walletToUnfreeze));
    }
    
    // Update searched wallet status if it matches
    if (searchedWallet && (searchedWallet.address === walletToUnfreeze)) {
      setSearchedWallet(prev => ({ ...prev, status: 'active' }));
    }
    
    // Log audit trail
    console.log('Audit Trail:', {
      action: 'UNFREEZE_WALLET',
      wallet: walletToUnfreeze,
      reason: unfreezeReason,
      timestamp: new Date().toISOString(),
      user: 'Current User'
    });

    setIsLoading(false);
    setShowUnfreezeModal(false);
    setUnfreezeReason('');
    setSelectedWallet(null);
  };

  const filteredFrozenWallets = frozenWallets.filter(wallet => {
    const matchesSearch = wallet.walletAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         wallet.frozenBy.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const filteredUnfrozenWallets = unfrozenWallets.filter(wallet => {
    const matchesSearch = wallet.walletAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         wallet.unfrozenBy.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <h1 className="text-3xl font-bold text-gray-900">🚨 Escalations</h1>
            <p className="mt-2 text-gray-600">Direct action on suspicious and high-risk wallets</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('search')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'search'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                🔍 Search Wallet
              </button>
              <button
                onClick={() => setActiveTab('frozen')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'frozen'
                    ? 'border-red-500 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                🔒 Frozen Wallets ({frozenWallets.length})
              </button>
              <button
                onClick={() => setActiveTab('unfrozen')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'unfrozen'
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                🔓 Unfrozen Wallets ({unfrozenWallets.length})
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'search' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">🔍 Step 1: Search / Add Wallet</h2>
            
            {/* Wallet Search Input */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enter Wallet Address
              </label>
              <div className="flex space-x-3">
                <input
                  type="text"
                  placeholder="0x..."
                  value={walletSearchInput}
                  onChange={(e) => setWalletSearchInput(e.target.value)}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                />
                <button
                  onClick={searchWallet}
                  disabled={isSearching}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
                >
                  {isSearching ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Searching...</span>
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      <span>Check Wallet</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Wallet Details */}
            {searchedWallet && (
              <div className="border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Wallet Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Wallet Address</label>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-sm bg-gray-100 p-2 rounded">{searchedWallet.address}</span>
                        <button onClick={() => copyToClipboard(searchedWallet.address)}>
                          <Copy className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Current Status</label>
                      <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                        searchedWallet.status === 'frozen' ? 'bg-red-100 text-red-800' :
                        searchedWallet.status === 'active' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {searchedWallet.status === 'frozen' ? '🔒 Frozen' : 
                         searchedWallet.status === 'active' ? '✅ Active' : '❓ Unknown'}
                      </span>
                    </div>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Risk Score + ML Tags</label>
                      <div className="flex items-center space-x-2 mb-2">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRiskColor(searchedWallet.riskScore)}`}>
                          {searchedWallet.riskScore}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {searchedWallet.mlTags.map((tag, index) => (
                          <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Linked Cases / Evidence</label>
                      <div className="space-y-2">
                        {searchedWallet.linkedCases.map((case_, index) => (
                          <div key={index} className="flex items-center space-x-2 text-sm">
                            <FolderOpen className="w-4 h-4 text-blue-500" />
                            <span>{case_.title}</span>
                          </div>
                        ))}
                        {searchedWallet.evidence.map((evidence, index) => (
                          <div key={index} className="flex items-center space-x-2 text-sm">
                            <FileText className="w-4 h-4 text-green-500" />
                            <span>{evidence.filename}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Last Activity</label>
                      <span className="text-sm text-gray-600">{new Date(searchedWallet.lastActivity).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Available Actions</h4>
                  <div className="flex space-x-4">
                    {searchedWallet.status === 'active' && (
                      <button
                        onClick={() => handleFreezeWallet(searchedWallet)}
                        className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                      >
                        <Snowflake className="w-4 h-4" />
                        <span>Freeze Wallet</span>
                      </button>
                    )}
                    {searchedWallet.status === 'frozen' && (
                      <button
                        onClick={() => handleUnfreezeWallet(searchedWallet)}
                        className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                      >
                        <Sun className="w-4 h-4" />
                        <span>Unfreeze Wallet</span>
                      </button>
                    )}
                    <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                      <Eye className="w-4 h-4" />
                      <span>View Case</span>
                    </button>
                    <button className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">
                      <Download className="w-4 h-4" />
                      <span>Download Report</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Frozen Wallets Tab */}
        {activeTab === 'frozen' && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Lock className="w-6 h-6 text-red-600" />
                  <h2 className="text-xl font-semibold text-gray-900">🔒 Frozen Wallets</h2>
                  <span className="bg-red-100 text-red-800 text-sm font-medium px-2.5 py-0.5 rounded-full">
                    {frozenWallets.length} Frozen
                  </span>
                </div>
                <div className="flex-1 max-w-lg ml-6">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      placeholder="Search by wallet address or investigator..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
              <p className="mt-1 text-sm text-gray-600">Wallets temporarily blocked from transacting</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Wallet Address</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Risk Score</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Frozen By</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Freeze Reason</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Frozen At</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredFrozenWallets.map((wallet) => (
                    <tr key={wallet.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-3">
                          <span className="font-mono text-sm text-gray-900">{wallet.walletAddress}</span>
                          <button onClick={() => copyToClipboard(wallet.walletAddress)}>
                            <Copy className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRiskColor(wallet.riskScore)}`}>
                          {wallet.riskScore}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center space-x-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <span>{wallet.frozenBy}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                        {wallet.freezeReason}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(wallet.frozenAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button
                          onClick={() => handleUnfreezeWallet(wallet)}
                          className="flex items-center space-x-1 text-green-600 hover:text-green-900"
                        >
                          <Sun className="w-4 h-4" />
                          <span>Unfreeze</span>
                        </button>
                        <button className="flex items-center space-x-1 text-blue-600 hover:text-blue-900">
                          <Eye className="w-4 h-4" />
                          <span>View Case</span>
                        </button>
                        <button className="flex items-center space-x-1 text-gray-600 hover:text-gray-900">
                          <Download className="w-4 h-4" />
                          <span>Download Report</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Unfrozen Wallets Tab */}
        {activeTab === 'unfrozen' && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Sun className="w-6 h-6 text-green-600" />
                  <h2 className="text-xl font-semibold text-gray-900">🔓 Unfrozen Wallets</h2>
                  <span className="bg-green-100 text-green-800 text-sm font-medium px-2.5 py-0.5 rounded-full">
                    {unfrozenWallets.length} Unfrozen
                  </span>
                </div>
                <div className="flex-1 max-w-lg ml-6">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      placeholder="Search by wallet address or investigator..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
              <p className="mt-1 text-sm text-gray-600">Wallets that were previously frozen and have been unfrozen</p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Wallet Address</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Risk Score</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unfrozen By</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unfreeze Reason</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unfrozen At</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUnfrozenWallets.map((wallet) => (
                    <tr key={wallet.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-3">
                          <span className="font-mono text-sm text-gray-900">{wallet.walletAddress}</span>
                          <button onClick={() => copyToClipboard(wallet.walletAddress)}>
                            <Copy className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRiskColor(wallet.riskScore)}`}>
                          {wallet.riskScore}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center space-x-2">
                          <UserCheck className="w-4 h-4 text-gray-400" />
                          <span>{wallet.unfrozenBy}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                        {wallet.unfreezeReason}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(wallet.unfrozenAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button className="flex items-center space-x-1 text-blue-600 hover:text-blue-900">
                          <Eye className="w-4 h-4" />
                          <span>View Case</span>
                        </button>
                        <button className="flex items-center space-x-1 text-gray-600 hover:text-gray-900">
                          <Download className="w-4 h-4" />
                          <span>Download Report</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {/* Freeze Wallet Confirmation Modal */}
      {showFreezeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <Snowflake className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Freeze Wallet</h3>
                  <p className="text-sm text-gray-600">This action will temporarily block the wallet from transacting</p>
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Wallet Address
                </label>
                <div className="font-mono text-sm bg-gray-100 p-3 rounded border">
                  {selectedWallet?.walletAddress}
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Risk Score: <span className={`font-semibold ${getRiskColor(selectedWallet?.riskScore)}`}>
                    {selectedWallet?.riskScore}
                  </span>
                </label>
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for Freeze *
                </label>
                <textarea
                  value={freezeReason}
                  onChange={(e) => setFreezeReason(e.target.value)}
                  placeholder="Provide detailed reason for freezing this wallet..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  rows="3"
                />
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowFreezeModal(false);
                    setFreezeReason('');
                    setSelectedWallet(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmFreezeWallet}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {isLoading ? 'Freezing...' : 'Confirm Freeze'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Unfreeze Wallet Confirmation Modal */}
      {showUnfreezeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <Sun className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Unfreeze Wallet</h3>
                  <p className="text-sm text-gray-600">This action will allow the wallet to resume transactions</p>
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Wallet Address
                </label>
                <div className="font-mono text-sm bg-gray-100 p-3 rounded border">
                  {selectedWallet?.walletAddress}
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Frozen Since: {new Date(selectedWallet?.frozenAt).toLocaleString()}
                </label>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Frozen By: {selectedWallet?.frozenBy}
                </label>
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for Unfreeze *
                </label>
                <textarea
                  value={unfreezeReason}
                  onChange={(e) => setUnfreezeReason(e.target.value)}
                  placeholder="Provide detailed reason for unfreezing this wallet..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  rows="3"
                />
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowUnfreezeModal(false);
                    setUnfreezeReason('');
                    setSelectedWallet(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmUnfreezeWallet}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {isLoading ? 'Unfreezing...' : 'Confirm Unfreeze'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Escalations;
