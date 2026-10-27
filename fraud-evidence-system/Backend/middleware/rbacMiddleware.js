/**
 * Role-Based Access Control (RBAC) Middleware
 * 
 * This middleware enforces permissions based on user roles.
 * It reads from rbac-permissions.json and validates user access to endpoints.
 */

const fs = require('fs');
const path = require('path');

// Load RBAC permissions configuration
let rbacConfig = null;
try {
  const rbacPath = path.join(__dirname, '../config/rbac-permissions.json');
  rbacConfig = JSON.parse(fs.readFileSync(rbacPath, 'utf8'));
  console.log('✅ RBAC permissions loaded successfully');
} catch (error) {
  console.error('❌ Failed to load RBAC permissions:', error.message);
  throw new Error('RBAC configuration not found');
}

/**
 * Check if a role has a specific permission
 * @param {string} role - User role
 * @param {string} action - Required action/permission
 * @returns {boolean} - True if role has permission
 */
function hasPermission(role, action) {
  if (!rbacConfig || !rbacConfig.roles[role]) {
    return false;
  }
  
  const rolePermissions = rbacConfig.roles[role].permissions;
  return rolePermissions.includes(action);
}

/**
 * Check if a role has any of the specified permissions
 * @param {string} role - User role
 * @param {Array<string>} actions - Array of required actions
 * @returns {boolean} - True if role has at least one permission
 */
function hasAnyPermission(role, actions) {
  return actions.some(action => hasPermission(role, action));
}

/**
 * Check if a role has all specified permissions
 * @param {string} role - User role
 * @param {Array<string>} actions - Array of required actions
 * @returns {boolean} - True if role has all permissions
 */
function hasAllPermissions(role, actions) {
  return actions.every(action => hasPermission(role, action));
}

/**
 * Get all roles that have a specific permission
 * @param {string} action - Action/permission
 * @returns {Array<string>} - Array of roles with permission
 */
function getRolesWithPermission(action) {
  const rolesWithPermission = [];
  
  for (const [roleName, roleData] of Object.entries(rbacConfig.roles)) {
    if (roleData.permissions.includes(action)) {
      rolesWithPermission.push(roleName);
    }
  }
  
  return rolesWithPermission;
}

/**
 * Get user role from request (mock implementation)
 * In production, this would extract from JWT token or session
 * @param {Object} req - Express request object
 * @returns {string} - User role
 */
function getUserRole(req) {
  // Check for role in various places (priority order)
  
  // 1. From authenticated user object
  if (req.user && req.user.role) {
    return req.user.role;
  }
  
  // 2. From headers (for testing)
  if (req.headers['x-user-role']) {
    return req.headers['x-user-role'];
  }
  
  // 3. From query parameters (for testing)
  if (req.query.role) {
    return req.query.role;
  }
  
  // 4. Default to guest for unauthenticated users
  return 'guest';
}

/**
 * Main RBAC authorization middleware
 * Usage: requirePermission('upload-evidence')
 * 
 * @param {string|Array<string>} requiredActions - Single action or array of actions
 * @param {Object} options - Additional options
 * @returns {Function} - Express middleware function
 */
function requirePermission(requiredActions, options = {}) {
  const {
    requireAll = false,  // If true, requires all actions; if false, requires any
    onUnauthorized = null // Custom handler for unauthorized access
  } = options;
  
  return (req, res, next) => {
    try {
      // Get user role
      const userRole = getUserRole(req);
      
      // Normalize actions to array
      const actions = Array.isArray(requiredActions) ? requiredActions : [requiredActions];
      
      // Check permissions
      const hasAccess = requireAll 
        ? hasAllPermissions(userRole, actions)
        : hasAnyPermission(userRole, actions);
      
      if (!hasAccess) {
        // Get which roles have the required permissions
        const allowedRoles = actions.flatMap(action => getRolesWithPermission(action));
        const uniqueRoles = [...new Set(allowedRoles)];
        
        // Log unauthorized attempt
        console.warn(`🚫 Unauthorized access attempt:`, {
          role: userRole,
          requiredActions: actions,
          path: req.path,
          method: req.method,
          ip: req.ip
        });
        
        // Custom unauthorized handler
        if (onUnauthorized) {
          return onUnauthorized(req, res, next);
        }
        
        // Standard unauthorized response
        return res.status(403).json({
          error: true,
          code: 403,
          message: 'Forbidden: insufficient permissions',
          details: {
            requiredPermissions: actions,
            userRole: userRole,
            allowedRoles: uniqueRoles
          },
          timestamp: new Date().toISOString()
        });
      }
      
      // Log successful authorization (for audit)
      console.log(`✅ Authorized access:`, {
        role: userRole,
        actions: actions,
        path: req.path,
        method: req.method
      });
      
      // Add role info to request for later use
      req.userRole = userRole;
      req.authorizedActions = actions;
      
      next();
    } catch (error) {
      console.error('❌ RBAC middleware error:', error);
      return res.status(500).json({
        error: true,
        code: 500,
        message: 'Authorization check failed',
        timestamp: new Date().toISOString()
      });
    }
  };
}

/**
 * Require specific role(s)
 * Usage: requireRole(['admin', 'superadmin'])
 * 
 * @param {string|Array<string>} allowedRoles - Single role or array of roles
 * @returns {Function} - Express middleware function
 */
function requireRole(allowedRoles) {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  
  return (req, res, next) => {
    const userRole = getUserRole(req);
    
    if (!roles.includes(userRole)) {
      console.warn(`🚫 Role check failed:`, {
        userRole,
        requiredRoles: roles,
        path: req.path
      });
      
      return res.status(403).json({
        error: true,
        code: 403,
        message: 'Forbidden: insufficient role privileges',
        details: {
          userRole,
          requiredRoles: roles
        },
        timestamp: new Date().toISOString()
      });
    }
    
    req.userRole = userRole;
    next();
  };
}

/**
 * Require minimum role level
 * Usage: requireMinimumRole('investigator')
 * 
 * @param {string} minimumRole - Minimum required role
 * @returns {Function} - Express middleware function
 */
function requireMinimumRole(minimumRole) {
  return (req, res, next) => {
    const userRole = getUserRole(req);
    const userLevel = rbacConfig.roleHierarchy[userRole] || 0;
    const minimumLevel = rbacConfig.roleHierarchy[minimumRole] || 999;
    
    if (userLevel < minimumLevel) {
      return res.status(403).json({
        error: true,
        code: 403,
        message: 'Forbidden: insufficient role level',
        details: {
          userRole,
          userLevel,
          minimumRole,
          minimumLevel
        },
        timestamp: new Date().toISOString()
      });
    }
    
    req.userRole = userRole;
    next();
  };
}

/**
 * Mock authentication middleware (for development)
 * Simulates user authentication by reading from headers
 * 
 * In production, replace this with real JWT validation
 */
function mockAuth(req, res, next) {
  // Check if user role is provided in headers or query
  const role = req.headers['x-user-role'] || req.query.role;
  
  if (role) {
    // Simulate authenticated user
    req.user = {
      id: 'mock-user-id',
      email: `${role}@fraud-evidence.com`,
      role: role,
      authenticated: true
    };
  } else {
    // Unauthenticated user (guest)
    req.user = {
      id: null,
      email: null,
      role: 'guest',
      authenticated: false
    };
  }
  
  next();
}

/**
 * Get user permissions for current role
 * @param {string} role - User role
 * @returns {Array<string>} - Array of permissions
 */
function getRolePermissions(role) {
  if (!rbacConfig || !rbacConfig.roles[role]) {
    return [];
  }
  return rbacConfig.roles[role].permissions || [];
}

/**
 * Get all available roles
 * @returns {Array<string>} - Array of role names
 */
function getAllRoles() {
  return Object.keys(rbacConfig.roles);
}

/**
 * Get role metadata
 * @param {string} role - Role name
 * @returns {Object} - Role metadata
 */
function getRoleMetadata(role) {
  return rbacConfig.roles[role] || null;
}

/**
 * Middleware to add RBAC info to response (for debugging)
 */
function addRBACInfo(req, res, next) {
  const userRole = getUserRole(req);
  const permissions = getRolePermissions(userRole);
  
  res.locals.rbac = {
    role: userRole,
    permissions,
    level: rbacConfig.roleHierarchy[userRole] || 0
  };
  
  next();
}

// Export middleware functions
module.exports = {
  requirePermission,
  requireRole,
  requireMinimumRole,
  mockAuth,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  getRolesWithPermission,
  getRolePermissions,
  getAllRoles,
  getRoleMetadata,
  getUserRole,
  addRBACInfo,
  rbacConfig
};

