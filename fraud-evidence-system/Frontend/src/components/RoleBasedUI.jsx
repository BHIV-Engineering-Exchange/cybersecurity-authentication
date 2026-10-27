// Frontend Role-Aware UI Components for RBAC
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';

/**
 * Hook to get current user permissions and role
 */
export const useUserPermissions = () => {
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getCurrentUser = () => {
      try {
        const token = localStorage.getItem('authToken');
        const userInfo = localStorage.getItem('userInfo');

        if (token && userInfo) {
          const userData = JSON.parse(userInfo);
          setUser({
            id: userData.id,
            email: userData.email,
            role: userData.role
          });
          
          // Set permissions based on role from stored userInfo
          const rolePermissions = getRolePermissions(userData.role);
          setPermissions(rolePermissions);
        }
      } catch (error) {
        console.error('Error getting user permissions:', error);
      } finally {
        setLoading(false);
      }
    };

    getCurrentUser();
  }, []);

  return { user, permissions, loading };
};

/**
 * Get permissions based on user role
 */
const getRolePermissions = (role) => {
  const permissionMatrix = {
    admin: {
      viewEvidence: true,
      shareEvidence: true,
      exportEvidence: true,
      deleteEvidence: true,
      manageRoles: true,
      escalateCase: true,
      userManagement: true,
      viewCases: true,
      createCases: true,
      editCases: true
    },
    investigator: {
      viewEvidence: true,
      shareEvidence: true,
      exportEvidence: true,
      deleteEvidence: false,
      manageRoles: false,
      escalateCase: false,
      userManagement: false,
      viewCases: true,
      createCases: true,
      editCases: true
    },
    public: {
      viewEvidence: false,
      shareEvidence: false,
      exportEvidence: false,
      deleteEvidence: false,
      manageRoles: false,
      escalateCase: false,
      userManagement: false,
      viewCases: false,
      createCases: false,
      editCases: false
    }
  };

  return permissionMatrix[role] || permissionMatrix.public;
};

/**
 * Role-Based Button Component
 */
export const RoleBasedButton = ({ 
  children, 
  requiredPermission, 
  requiredRole, 
  fallbackComponent = null,
  showTooltip = true,
  onClick,
  className = '',
  variant = 'primary',
  ...props 
}) => {
  const { user, permissions } = useUserPermissions();
  
  // Check if user has required permission
  const hasPermission = requiredPermission ? permissions[requiredPermission] : true;
  
  // Check if user has required role
  const hasRole = requiredRole ? user?.role === requiredRole : true;
  
  // Check if user has access
  const hasAccess = hasPermission && hasRole;

  if (!hasAccess) {
    if (fallbackComponent) {
      return fallbackComponent;
    }
    
    if (showTooltip) {
      return (
        <div className="relative group">
          <button
            disabled
            className={`opacity-50 cursor-not-allowed ${className}`}
            title={`Access denied: ${requiredPermission ? `Requires ${requiredPermission} permission` : ''} ${requiredRole ? `Requires ${requiredRole} role` : ''}`}
            {...props}
          >
            {children}
          </button>
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 text-sm text-white bg-gray-800 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
            🚫 Access denied: {requiredPermission && `Requires ${requiredPermission}`} {requiredRole && `(${requiredRole} role)`}
          </div>
        </div>
      );
    }
    
    return null;
  }

  const baseStyles = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    secondary: 'bg-gray-600 hover:bg-gray-700 text-white',
    success: 'bg-green-600 hover:bg-green-700 text-white',
    warning: 'bg-yellow-600 hover:bg-yellow-700 text-white',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    info: 'bg-indigo-600 hover:bg-indigo-700 text-white',
    custom: className
  };

  const buttonClass = variant === 'custom' ? className : `${baseStyles[variant]} ${className}`;

  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 active:scale-95 ${buttonClass}`}
      {...props}
    >
      {children}
    </button>
  );
};

/**
 * Role-Based Content Wrapper
 */
export const RoleBasedContent = ({ 
  children, 
  requiredPermission, 
  requiredRole, 
  allowedRoles = [],
  fallback = null,
  showAccessDenied = true 
}) => {
  const { user, permissions, loading } = useUserPermissions();

  if (loading) {
    return (
      <div className="animate-pulse bg-gray-200 rounded-lg h-24 flex items-center justify-center">
        <span className="text-gray-500">Loading permissions...</span>
      </div>
    );
  }

  // Check permissions
  const hasPermission = requiredPermission ? permissions[requiredPermission] : true;
  
  // Check role
  let hasRole = true;
  if (requiredRole) {
    hasRole = user?.role === requiredRole;
  } else if (allowedRoles.length > 0) {
    hasRole = allowedRoles.includes(user?.role);
  }

  const hasAccess = hasPermission && hasRole;

  if (!hasAccess) {
    if (fallback) {
      return fallback;
    }
    
    if (showAccessDenied) {
      return (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
          <div className="text-yellow-600 mb-2">🔒 Access Restricted</div>
          <p className="text-sm text-yellow-700">
            {requiredPermission && `Requires ${requiredPermission} permission`}
            {requiredRole && ` (${requiredRole} role)`}
            {allowedRoles.length > 0 && ` (Allowed roles: ${allowedRoles.join(', ')})`}
          </p>
          <p className="text-xs text-yellow-600 mt-1">
            Your role: {user?.role || 'Not authenticated'}
          </p>
        </div>
      );
    }
    
    return null;
  }

  return children;
};

/**
 * Role-Based Form Input Component
 */
export const RoleBasedInput = ({ 
  label,
  requiredPermission, 
  requiredRole, 
  allowedRoles = [],
  fallback = null,
  showAccessDenied = true,
  className = '',
  ...props 
}) => {
  const { user, permissions, loading } = useUserPermissions();

  if (loading) {
    return (
      <div className="animate-pulse bg-gray-200 rounded-lg h-12 flex items-center justify-center">
        <span className="text-gray-500">Loading permissions...</span>
      </div>
    );
  }

  // Check permissions
  const hasPermission = requiredPermission ? permissions[requiredPermission] : true;
  
  // Check role
  let hasRole = true;
  if (requiredRole) {
    hasRole = user?.role === requiredRole;
  } else if (allowedRoles.length > 0) {
    hasRole = allowedRoles.includes(user?.role);
  }

  const hasAccess = hasPermission && hasRole;

  if (!hasAccess) {
    if (fallback) {
      return fallback;
    }
    
    if (showAccessDenied) {
      return (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
          <div className="text-yellow-600 mb-2">🔒 Access Restricted</div>
          <p className="text-sm text-yellow-700">
            {requiredPermission && `Requires ${requiredPermission} permission`}
            {requiredRole && ` (${requiredRole} role)`}
            {allowedRoles.length > 0 && ` (Allowed roles: ${allowedRoles.join(', ')})`}
          </p>
          <p className="text-xs text-yellow-600 mt-1">
            Your role: {user?.role || 'Not authenticated'}
          </p>
        </div>
      );
    }
    
    return null;
  }

  return (
    <div className="mb-4">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <input
        className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${className}`}
        {...props}
      />
    </div>
  );
};

/**
 * Role-Based Form Select Component
 */
export const RoleBasedSelect = ({ 
  label,
  requiredPermission, 
  requiredRole, 
  allowedRoles = [],
  fallback = null,
  showAccessDenied = true,
  className = '',
  children,
  ...props 
}) => {
  const { user, permissions, loading } = useUserPermissions();

  if (loading) {
    return (
      <div className="animate-pulse bg-gray-200 rounded-lg h-12 flex items-center justify-center">
        <span className="text-gray-500">Loading permissions...</span>
      </div>
    );
  }

  // Check permissions
  const hasPermission = requiredPermission ? permissions[requiredPermission] : true;
  
  // Check role
  let hasRole = true;
  if (requiredRole) {
    hasRole = user?.role === requiredRole;
  } else if (allowedRoles.length > 0) {
    hasRole = allowedRoles.includes(user?.role);
  }

  const hasAccess = hasPermission && hasRole;

  if (!hasAccess) {
    if (fallback) {
      return fallback;
    }
    
    if (showAccessDenied) {
      return (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
          <div className="text-yellow-600 mb-2">🔒 Access Restricted</div>
          <p className="text-sm text-yellow-700">
            {requiredPermission && `Requires ${requiredPermission} permission`}
            {requiredRole && ` (${requiredRole} role)`}
            {allowedRoles.length > 0 && ` (Allowed roles: ${allowedRoles.join(', ')})`}
          </p>
          <p className="text-xs text-yellow-600 mt-1">
            Your role: {user?.role || 'Not authenticated'}
          </p>
        </div>
      );
    }
    
    return null;
  }

  return (
    <div className="mb-4">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <select
        className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${className}`}
        {...props}
      >
        {children}
      </select>
    </div>
  );
};

/**
 * Role Badge Component
 */
export const RoleBadge = ({ user, showPermissions = false, className = '' }) => {
  const roleStyles = {
    admin: 'bg-red-100 text-red-800 border-red-200',
    investigator: 'bg-blue-100 text-blue-800 border-blue-200',
    public: 'bg-gray-100 text-gray-800 border-gray-200'
  };

  const roleIcons = {
    admin: '👑',
    investigator: '🔍',
    public: '👤'
  };

  const { permissions } = useUserPermissions();

  if (!user?.role) return null;

  return (
    <div className={`inline-flex items-center space-x-2 ${className}`}>
      <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${roleStyles[user.role] || roleStyles.public}`}>
        <span className="mr-1">{roleIcons[user.role] || roleIcons.public}</span>
        {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
      </div>
      
      {showPermissions && (
        <div className="flex space-x-1">
          {Object.entries(permissions).map(([permission, hasPermission]) => 
            hasPermission && (
              <span 
                key={permission}
                className="inline-flex items-center px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full"
                title={permission}
              >
                ✓
              </span>
            )
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Permission Check Function (for conditional rendering)
 */
export const hasUserPermission = (permission, role = null) => {
  try {
    const userInfo = localStorage.getItem('userInfo');
    if (!userInfo) return false;
    
    const userData = JSON.parse(userInfo);
    const userRole = userData.role;
    
    // Check role if specified
    if (role && userRole !== role) return false;
    
    // Get permissions for user's role
    const rolePermissions = getRolePermissions(userRole);
    
    return rolePermissions[permission] || false;
  } catch (error) {
    console.error('Error checking permission:', error);
    return false;
  }
};

/**
 * Access Denied Message Component
 */
export const AccessDeniedMessage = ({ 
  requiredPermission, 
  requiredRole, 
  allowedRoles = [],
  showLoginButton = true,
  customMessage = null 
}) => {
  const { user } = useUserPermissions();

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center max-w-md mx-auto">
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <span className="text-2xl text-red-600">🚫</span>
      </div>
      
      <h3 className="text-lg font-semibold text-red-900 mb-2">Access Denied</h3>
      
      {customMessage ? (
        <p className="text-red-700 mb-4">{customMessage}</p>
      ) : (
        <>
          <p className="text-red-700 mb-2">You don't have permission to access this feature.</p>
          <div className="text-sm text-red-600 mb-4">
            {requiredPermission && <p>Required permission: <code>{requiredPermission}</code></p>}
            {requiredRole && <p>Required role: <code>{requiredRole}</code></p>}
            {allowedRoles.length > 0 && <p>Allowed roles: <code>{allowedRoles.join(', ')}</code></p>}
            {user && <p className="mt-2">Your current role: <code>{user.role}</code></p>}
          </div>
        </>
      )}
      
      {showLoginButton && (
        <div className="space-y-2">
          <button
            onClick={() => window.location.href = '/'}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
          >
            🏠 Go to Dashboard
          </button>
          
          {!user && (
            <button
              onClick={() => {
                localStorage.removeItem('authToken');
                localStorage.removeItem('userInfo');
                window.location.href = '/';
              }}
              className="block w-full text-red-600 hover:text-red-800 text-sm"
            >
              🔑 Login with Different Account
            </button>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Role-Based Navigation Item
 */
export const RoleBasedNavItem = ({ 
  children, 
  requiredPermission, 
  requiredRole, 
  allowedRoles = [],
  href,
  onClick,
  className = '',
  activeClassName = 'bg-blue-100 text-blue-800',
  inactiveClassName = 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
}) => {
  const { user, permissions } = useUserPermissions();
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    setIsActive(window.location.pathname === href);
  }, [href]);

  // Check access
  const hasPermission = requiredPermission ? permissions[requiredPermission] : true;
  
  let hasRole = true;
  if (requiredRole) {
    hasRole = user?.role === requiredRole;
  } else if (allowedRoles.length > 0) {
    hasRole = allowedRoles.includes(user?.role);
  }

  const hasAccess = hasPermission && hasRole;

  if (!hasAccess) {
    return null;
  }

  const handleClick = (e) => {
    if (onClick) {
      e.preventDefault();
      onClick();
    } else if (href) {
      window.location.href = href;
    }
  };

  return (
    <a
      href={href}
      onClick={handleClick}
      className={`block px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${isActive ? activeClassName : inactiveClassName} ${className}`}
    >
      {children}
    </a>
  );
};

/**
 * Role-Based Dropdown Menu
 */
export const RoleBasedDropdown = ({ 
  label,
  requiredPermission, 
  requiredRole, 
  allowedRoles = [],
  fallback = null,
  showAccessDenied = true,
  children,
  className = '',
  menuClassName = ''
}) => {
  const { user, permissions, loading } = useUserPermissions();
  const [isOpen, setIsOpen] = useState(false);

  if (loading) {
    return (
      <div className="animate-pulse bg-gray-200 rounded-lg h-10 flex items-center justify-center">
        <span className="text-gray-500">Loading permissions...</span>
      </div>
    );
  }

  // Check permissions
  const hasPermission = requiredPermission ? permissions[requiredPermission] : true;
  
  // Check role
  let hasRole = true;
  if (requiredRole) {
    hasRole = user?.role === requiredRole;
  } else if (allowedRoles.length > 0) {
    hasRole = allowedRoles.includes(user?.role);
  }

  const hasAccess = hasPermission && hasRole;

  if (!hasAccess) {
    if (fallback) {
      return fallback;
    }
    
    if (showAccessDenied) {
      return (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
          <div className="text-yellow-600 mb-2">🔒 Access Restricted</div>
          <p className="text-sm text-yellow-700">
            {requiredPermission && `Requires ${requiredPermission} permission`}
            {requiredRole && ` (${requiredRole} role)`}
            {allowedRoles.length > 0 && ` (Allowed roles: ${allowedRoles.join(', ')})`}
          </p>
          <p className="text-xs text-yellow-600 mt-1">
            Your role: {user?.role || 'Not authenticated'}
          </p>
        </div>
      );
    }
    
    return null;
  }

  return (
    <div className={`relative inline-block text-left ${className}`}>
      <div>
        <button
          type="button"
          className="inline-flex justify-center w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none"
          onClick={() => setIsOpen(!isOpen)}
        >
          {label}
          <svg className="-mr-1 ml-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {isOpen && (
        <div className={`origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none ${menuClassName}`}>
          <div className="py-1" role="none">
            {children}
          </div>
        </div>
      )}
    </div>
  );
};

export default {
  RoleBasedButton,
  RoleBasedContent,
  RoleBasedInput,
  RoleBasedSelect,
  RoleBadge,
  AccessDeniedMessage,
  RoleBasedNavItem,
  RoleBasedDropdown,
  useUserPermissions,
  hasUserPermission
};