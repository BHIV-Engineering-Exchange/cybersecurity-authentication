import React, { useState, useEffect } from 'react';
import { 
  UserPlus,
  Edit,
  RotateCcw,
  Trash2,
  Shield,
  Eye,
  Upload,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Mail,
  Key,
  Lock,
  Unlock,
  User,
  Search,
  Filter,
  Save,
  X,
  AlertCircle,
  Copy,
  Calendar,
  Phone,
  Building
} from 'lucide-react';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [permissionFilter, setPermissionFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  
  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'Investigator',
    permissions: 'view-only',
    twoFactorEnabled: false
  });

  // Mock data for users
  useEffect(() => {
    const mockUsers = [
      {
        id: '1',
        name: 'Admin User',
        email: 'admin123@fraud.com',
        role: 'Admin',
        permissions: 'escalate',
        twoFactorEnabled: true,
        lastLogin: '2024-01-20T15:30:00Z',
        createdAt: '2024-01-15T10:00:00Z',
        status: 'active',
        phone: '+1-555-0101',
        department: 'Cybercrime Unit'
      },
      {
        id: '2',
        name: 'Detective John Smith',
        email: 'detective.smith@police.gov',
        role: 'Investigator',
        permissions: 'upload-only',
        twoFactorEnabled: true,
        lastLogin: '2024-01-20T14:45:00Z',
        createdAt: '2024-01-18T09:30:00Z',
        status: 'active',
        phone: '+1-555-0102',
        department: 'Financial Crimes Division'
      },
      {
        id: '3',
        name: 'Officer Jane Johnson',
        email: 'officer.johnson@nypd.org',
        role: 'Investigator',
        permissions: 'view-only',
        twoFactorEnabled: false,
        lastLogin: '2024-01-19T16:20:00Z',
        createdAt: '2024-01-19T11:15:00Z',
        status: 'active',
        phone: '+1-555-0103',
        department: 'NYPD Cyber Crimes'
      },
      {
        id: '4',
        name: 'Detective Mike Brown',
        email: 'detective.brown@police.gov',
        role: 'Investigator',
        permissions: 'escalate',
        twoFactorEnabled: true,
        lastLogin: '2024-01-18T13:10:00Z',
        createdAt: '2024-01-17T14:45:00Z',
        status: 'active',
        phone: '+1-555-0104',
        department: 'Cybercrime Investigation Unit'
      },
      {
        id: '5',
        name: 'Agent Sarah Wilson',
        email: 'agent.wilson@fbi.gov',
        role: 'Investigator',
        permissions: 'upload-only',
        twoFactorEnabled: false,
        lastLogin: '2024-01-17T11:30:00Z',
        createdAt: '2024-01-16T16:20:00Z',
        status: 'inactive',
        phone: '+1-555-0105',
        department: 'FBI Cyber Division'
      }
    ];

    setUsers(mockUsers);
    setFilteredUsers(mockUsers);
  }, []);

  // Filter users based on search and filters
  useEffect(() => {
    let filtered = users;

    if (searchTerm) {
      filtered = filtered.filter(user => 
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.department.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (roleFilter) {
      filtered = filtered.filter(user => user.role === roleFilter);
    }

    if (permissionFilter) {
      filtered = filtered.filter(user => user.permissions === permissionFilter);
    }

    if (statusFilter) {
      filtered = filtered.filter(user => user.status === statusFilter);
    }

    setFilteredUsers(filtered);
  }, [users, searchTerm, roleFilter, permissionFilter, statusFilter]);

  const getRoleColor = (role) => {
    switch (role) {
      case 'Admin': return 'bg-red-100 text-red-800';
      case 'Investigator': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPermissionColor = (permission) => {
    switch (permission) {
      case 'view-only': return 'bg-blue-100 text-blue-800';
      case 'upload-only': return 'bg-yellow-100 text-yellow-800';
      case 'escalate': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPermissionIcon = (permission) => {
    switch (permission) {
      case 'view-only': return <Eye className="w-4 h-4" />;
      case 'upload-only': return <Upload className="w-4 h-4" />;
      case 'escalate': return <AlertTriangle className="w-4 h-4" />;
      default: return <Shield className="w-4 h-4" />;
    }
  };

  const handleAddUser = () => {
    setFormData({
      name: '',
      email: '',
      role: 'Investigator',
      permissions: 'view-only',
      twoFactorEnabled: false
    });
    setShowAddModal(true);
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
      twoFactorEnabled: user.twoFactorEnabled
    });
    setShowEditModal(true);
  };

  const handleDeleteUser = (user) => {
    setSelectedUser(user);
    setShowDeleteModal(true);
  };

  const handleResetPassword = (user) => {
    setSelectedUser(user);
    setShowResetModal(true);
  };

  const handleSaveUser = async (isEdit = false) => {
    if (!formData.name || !formData.email) {
      alert('Please fill in all required fields.');
      return;
    }

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    if (isEdit) {
      // Update existing user
      const updatedUsers = users.map(user => 
        user.id === selectedUser.id 
          ? { ...user, ...formData, lastLogin: user.lastLogin }
          : user
      );
      setUsers(updatedUsers);
      
      // Log the action
      console.log('System Log:', {
        action: 'User Updated',
        target: selectedUser.email,
        details: `User permissions changed to ${formData.permissions}`,
        timestamp: new Date().toISOString(),
        logType: 'User Management'
      });
    } else {
      // Add new user
      const newUser = {
        id: Date.now().toString(),
        ...formData,
        lastLogin: null,
        createdAt: new Date().toISOString(),
        status: 'active',
        phone: '',
        department: ''
      };
      setUsers(prev => [...prev, newUser]);
      
      // Log the action
      console.log('System Log:', {
        action: 'Investigator Added',
        target: formData.email,
        details: `New investigator account created with ${formData.permissions} permissions`,
        timestamp: new Date().toISOString(),
        logType: 'User Management'
      });
    }

    setShowAddModal(false);
    setShowEditModal(false);
    setFormData({
      name: '',
      email: '',
      role: 'Investigator',
      permissions: 'view-only',
      twoFactorEnabled: false
    });
  };

  const handleConfirmDelete = async () => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    setUsers(prev => prev.filter(user => user.id !== selectedUser.id));
    
    // Log the action
    console.log('System Log:', {
      action: 'Investigator Removed',
      target: selectedUser.email,
      details: `User account deleted permanently`,
      timestamp: new Date().toISOString(),
      logType: 'User Management'
    });

    setShowDeleteModal(false);
    setSelectedUser(null);
  };

  const handleConfirmReset = async () => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Log the action
    console.log('System Log:', {
      action: 'Password Reset',
      target: selectedUser.email,
      details: `Password reset initiated for user account`,
      timestamp: new Date().toISOString(),
      logType: 'User Management'
    });

    setShowResetModal(false);
    setSelectedUser(null);
    alert('Password reset email sent successfully!');
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-r from-indigo-600 to-indigo-800 rounded-2xl flex items-center justify-center shadow-lg">
                  <User className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
                  <p className="mt-2 text-gray-600">Manage investigators and system access permissions</p>
                </div>
              </div>
              <button
                onClick={handleAddUser}
                className="flex items-center space-x-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                <UserPlus className="w-4 h-4" />
                <span>Add Investigator</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow mb-6 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">All Roles</option>
                <option value="Admin">Admin</option>
                <option value="Investigator">Investigator</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Permissions</label>
              <select
                value={permissionFilter}
                onChange={(e) => setPermissionFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">All Permissions</option>
                <option value="view-only">View-only</option>
                <option value="upload-only">Upload-only</option>
                <option value="escalate">Escalate</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Investigators & Users</h2>
              <span className="text-sm text-gray-500">
                Showing {filteredUsers.length} of {users.length} users
              </span>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email / ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Permissions</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">2FA Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Login</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-indigo-600" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{user.name}</div>
                          {user.department && (
                            <div className="text-sm text-gray-500">{user.department}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <div>
                          <div className="text-sm text-gray-900">{user.email}</div>
                          <div className="text-sm text-gray-500">ID: {user.id}</div>
                        </div>
                        <button onClick={() => copyToClipboard(user.email)}>
                          <Copy className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(user.role)}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {getPermissionIcon(user.permissions)}
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPermissionColor(user.permissions)}`}>
                          {user.permissions}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {user.twoFactorEnabled ? (
                          <>
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span className="text-sm text-green-600">Enabled</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-4 h-4 text-red-600" />
                            <span className="text-sm text-red-600">Disabled</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.lastLogin ? (
                        <div className="flex items-center space-x-2">
                          <Clock className="w-4 h-4 text-gray-400" />
                          <span>{new Date(user.lastLogin).toLocaleString()}</span>
                        </div>
                      ) : (
                        <span className="text-gray-500">Never</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(user.status)}`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEditUser(user)}
                          className="text-indigo-600 hover:text-indigo-900 flex items-center space-x-1"
                        >
                          <Edit className="w-4 h-4" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => handleResetPassword(user)}
                          className="text-yellow-600 hover:text-yellow-900 flex items-center space-x-1"
                        >
                          <RotateCcw className="w-4 h-4" />
                          <span>Reset</span>
                        </button>
                        {user.role !== 'Admin' && (
                          <button
                            onClick={() => handleDeleteUser(user)}
                            className="text-red-600 hover:text-red-900 flex items-center space-x-1"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span>Remove</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Add New Investigator</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-500 hover:text-gray-800">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Enter full name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email Address *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Enter email address"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="Investigator">Investigator</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Permissions</label>
                <select
                  value={formData.permissions}
                  onChange={(e) => setFormData({...formData, permissions: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="view-only">View-only</option>
                  <option value="upload-only">Upload-only</option>
                  <option value="escalate">Escalate</option>
                </select>
              </div>
              
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="twoFactor"
                  checked={formData.twoFactorEnabled}
                  onChange={(e) => setFormData({...formData, twoFactorEnabled: e.target.checked})}
                  className="w-4 h-4 text-indigo-600 bg-gray-100 border-gray-300 rounded focus:ring-indigo-500"
                />
                <label htmlFor="twoFactor" className="text-sm font-medium text-gray-700">
                  Enable 2FA for this user
                </label>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSaveUser(false)}
                className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                <Save className="w-4 h-4" />
                <span>Add User</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Edit User</h3>
              <button onClick={() => setShowEditModal(false)} className="text-gray-500 hover:text-gray-800">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="Investigator">Investigator</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Permissions</label>
                <select
                  value={formData.permissions}
                  onChange={(e) => setFormData({...formData, permissions: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="view-only">View-only</option>
                  <option value="upload-only">Upload-only</option>
                  <option value="escalate">Escalate</option>
                </select>
              </div>
              
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="twoFactorEdit"
                  checked={formData.twoFactorEnabled}
                  onChange={(e) => setFormData({...formData, twoFactorEnabled: e.target.checked})}
                  className="w-4 h-4 text-indigo-600 bg-gray-100 border-gray-300 rounded focus:ring-indigo-500"
                />
                <label htmlFor="twoFactorEdit" className="text-sm font-medium text-gray-700">
                  Enable 2FA for this user
                </label>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSaveUser(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                <Save className="w-4 h-4" />
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center space-x-3 mb-4">
              <AlertCircle className="w-6 h-6 text-red-600" />
              <h3 className="text-lg font-semibold text-gray-900">Remove Investigator</h3>
            </div>
            
            <p className="text-gray-700 mb-4">
              Are you sure you want to permanently remove <strong>{selectedUser?.name}</strong> ({selectedUser?.email}) from the system?
            </p>
            
            <p className="text-sm text-red-600 mb-6">
              This action cannot be undone and will revoke all access immediately.
            </p>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                <Trash2 className="w-4 h-4" />
                <span>Remove User</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center space-x-3 mb-4">
              <Key className="w-6 h-6 text-yellow-600" />
              <h3 className="text-lg font-semibold text-gray-900">Reset Password</h3>
            </div>
            
            <p className="text-gray-700 mb-6">
              Reset password for <strong>{selectedUser?.name}</strong> ({selectedUser?.email})?
            </p>
            
            <p className="text-sm text-gray-600 mb-6">
              A password reset email will be sent to the user's email address.
            </p>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowResetModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReset}
                className="flex items-center space-x-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Send Reset Email</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;

