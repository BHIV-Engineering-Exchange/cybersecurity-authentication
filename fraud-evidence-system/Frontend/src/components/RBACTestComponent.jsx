// Frontend/src/components/RBACTestComponent.jsx
// Component for testing RBAC frontend functionality

import React, { useState, useEffect } from 'react';
import { 
  RoleBasedButton, 
  RoleBasedContent, 
  RoleBadge, 
  AccessDeniedMessage,
  RoleBasedNavItem,
  useUserPermissions,
  hasUserPermission,
  RoleBasedInput,
  RoleBasedSelect
} from './RoleBasedUI';
import { toast } from 'react-toastify';

const RBACTestComponent = () => {
  const { user, permissions, loading } = useUserPermissions();
  const [testResults, setTestResults] = useState([]);
  const [isTesting, setIsTesting] = useState(false);

  // Test functions
  const runFrontendRBACTests = () => {
    setIsTesting(true);
    const results = [];
    
    // Test 1: Check if user object is available
    results.push({
      name: 'User Object Available',
      passed: !!user,
      message: user ? 'User object present' : 'User object missing'
    });
    
    // Test 2: Check if permissions object is available
    results.push({
      name: 'Permissions Object Available',
      passed: !!permissions,
      message: permissions ? 'Permissions object present' : 'Permissions object missing'
    });
    
    // Test 3: Check specific permissions
    const viewEvidencePerm = hasUserPermission('viewEvidence');
    results.push({
      name: 'View Evidence Permission Check',
      passed: typeof viewEvidencePerm === 'boolean',
      message: `Permission check returned: ${viewEvidencePerm}`
    });
    
    // Test 4: Check role-specific functionality
    const isAdmin = user?.role === 'admin';
    results.push({
      name: 'Admin Role Detection',
      passed: typeof isAdmin === 'boolean',
      message: `Admin detection returned: ${isAdmin}`
    });
    
    // Test 5: Check loading state handling
    results.push({
      name: 'Loading State Handling',
      passed: typeof loading === 'boolean',
      message: `Loading state: ${loading}`
    });
    
    setTestResults(results);
    setIsTesting(false);
    
    // Show toast summary
    const passedTests = results.filter(test => test.passed).length;
    toast.info(`RBAC Frontend Tests: ${passedTests}/${results.length} passed`);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
          <span>Loading RBAC test component...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">RBAC Frontend Testing</h2>
        <RoleBadge user={user} showPermissions={true} />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Test Controls */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Test Controls</h3>
          
          <RoleBasedButton
            onClick={runFrontendRBACTests}
            disabled={isTesting}
            variant="primary"
            className="w-full mb-4"
          >
            {isTesting ? '🧪 Running Tests...' : '🚀 Run RBAC Tests'}
          </RoleBasedButton>
          
          <div className="space-y-3">
            <RoleBasedInput
              label="Test Input Field"
              placeholder="This should be role-restricted"
              requiredPermission="manageRoles"
            />
            
            <RoleBasedSelect
              label="Test Select Field"
              requiredPermission="manageRoles"
            >
              <option value="">Select an option</option>
              <option value="option1">Option 1</option>
              <option value="option2">Option 2</option>
            </RoleBasedSelect>
          </div>
          
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Current User Info</h4>
            <p className="text-sm text-blue-800">Email: {user?.email || 'Not authenticated'}</p>
            <p className="text-sm text-blue-800">Role: {user?.role || 'Unknown'}</p>
            <p className="text-sm text-blue-800">Loading: {loading.toString()}</p>
          </div>
        </div>
        
        {/* Test Results */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Test Results</h3>
          
          {testResults.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-400 mb-2">📋</div>
              <p className="text-gray-500">No tests run yet. Click "Run RBAC Tests" to begin.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {testResults.map((test, index) => (
                <div 
                  key={index} 
                  className={`p-4 rounded-lg border ${
                    test.passed 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-start">
                    <div className="flex-shrink-0 mt-1">
                      {test.passed ? (
                        <span className="text-green-600">✅</span>
                      ) : (
                        <span className="text-red-600">❌</span>
                      )}
                    </div>
                    <div className="ml-3">
                      <h4 className={`text-sm font-medium ${
                        test.passed ? 'text-green-800' : 'text-red-800'
                      }`}>
                        {test.name}
                      </h4>
                      <p className={`text-sm ${
                        test.passed ? 'text-green-700' : 'text-red-700'
                      }`}>
                        {test.message}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">
                    Passed: {testResults.filter(t => t.passed).length}/{testResults.length}
                  </span>
                  <span className="text-sm font-medium text-gray-700">
                    Success Rate: {Math.round((testResults.filter(t => t.passed).length / testResults.length) * 100)}%
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Role-Based Navigation Test */}
      <div className="mt-6 bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Role-Based Navigation Test</h3>
        <div className="flex flex-wrap gap-2">
          <RoleBasedNavItem
            requiredPermission="viewEvidence"
            href="#"
            className="bg-blue-100 text-blue-800 hover:bg-blue-200"
          >
            📁 Evidence Library
          </RoleBasedNavItem>
          
          <RoleBasedNavItem
            requiredPermission="manageRoles"
            href="#"
            className="bg-red-100 text-red-800 hover:bg-red-200"
          >
            👥 Admin Panel
          </RoleBasedNavItem>
          
          <RoleBasedNavItem
            requiredPermission="userManagement"
            href="#"
            className="bg-green-100 text-green-800 hover:bg-green-200"
          >
            ⚙️ Settings
          </RoleBasedNavItem>
          
          <RoleBasedNavItem
            requiredRole="admin"
            href="#"
            className="bg-purple-100 text-purple-800 hover:bg-purple-200"
          >
            🛡️ System Admin
          </RoleBasedNavItem>
        </div>
      </div>
      
      {/* Access Denied Test */}
      <div className="mt-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Access Denied Test</h3>
        <RoleBasedContent
          requiredPermission="nonExistentPermission"
          fallback={
            <AccessDeniedMessage
              requiredPermission="nonExistentPermission"
              customMessage="This is a test of the access denied message component."
            />
          }
        >
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800">✅ This content should NOT be visible if RBAC is working correctly</p>
          </div>
        </RoleBasedContent>
      </div>
    </div>
  );
};

export default RBACTestComponent;