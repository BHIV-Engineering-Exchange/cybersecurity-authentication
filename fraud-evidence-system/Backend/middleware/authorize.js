// Enhanced RBAC Authorization Middleware
const fs = require('fs');
const path = require('path');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

// Load RBAC permissions configuration
let rbacConfig = null;
try {
  const rbacPath = path.join(__dirname, '..', 'rbac-permissions.json');
  rbacConfig = JSON.parse(fs.readFileSync(rbacPath, 'utf8'));
} catch (error) {
  console.error('Failed to load RBAC permissions:', error);
  throw new Error('RBAC configuration not found');
}

/**
 * Enhanced authorization middleware that checks permissions against rbac-permissions.json
 * @param {string|Array} requiredActions - Single action or array of actions
 * @param {Object} options - Additional authorization options
 * @returns {Function} Express middleware function
 */
const authorize = (requiredActions, options = {}) => {
  return async (req, res, next) => {
    try {
      // Extract user information
      const userId = req.user?.id || req.user?._id;
      const userRole = req.user?.role;
      
      if (!userId || !userRole) {
        return res.status(401).json({
          error: true,
          code: 401,
          message: 'Authentication required',
          timestamp: new Date().toISOString()
        });
      }

      // Get full user details from database
      const user = await User.findById(userId);
      if (!user) {
        return res.status(401).json({
          error: true,
          code: 401,
          message: 'User not found',
          timestamp: new Date().toISOString()
        });
      }

      // Check if user account is active
      if (!user.isActive) {
        await logAccessAttempt(req, user, 'account_deactivated', false);
        return res.status(403).json({
          error: true,
          code: 403,
          message: 'Account is deactivated',
          timestamp: new Date().toISOString()
        });
      }

      // Normalize actions to array
      const actions = Array.isArray(requiredActions) ? requiredActions : [requiredActions];

      // Check each required action
      const actionChecks = actions.map(action => {
        const permission = rbacConfig.permissions[action];
        if (!permission) {
          return {
            action,
            hasAccess: false,
            error: 'Unknown action'
          };
        }

        const hasAccess = permission.roles[userRole] === true;
        return {
          action,
          hasAccess,
          requiresApproval: permission.requiresApproval,
          auditLevel: permission.auditLevel,
          description: permission.description
        };
      });

      // Check if user has all required permissions
      const hasAllPermissions = actionChecks.every(check => check.hasAccess);
      
      if (!hasAllPermissions) {
        const failedActions = actionChecks
          .filter(check => !check.hasAccess)
          .map(check => check.action);
        
        const allowedRoles = getRolesForActions(failedActions);
        
        await logAccessAttempt(req, user, 'insufficient_permissions', false, {
          requiredActions: failedActions,
          userRole,
          allowedRoles
        });
        
        return res.status(403).json({
          error: true,
          code: 403,
          message: 'Insufficient permissions',
          details: {
            requiredActions: failedActions,
            userRole,
            allowedRoles
          },
          timestamp: new Date().toISOString()
        });
      }

      // Check if action requires approval
      const requiresApproval = actionChecks.some(check => check.requiresApproval);
      if (requiresApproval && !options.skipApprovalCheck) {
        await logAccessAttempt(req, user, 'approval_required', true, {
          actions: actions,
          requiresApproval: true
        });
      }

      // Log successful access
      await logAccessAttempt(req, user, 'access_granted', true, {
        actions: actions,
        auditLevel: actionChecks[0]?.auditLevel || 'standard'
      });

      // Add user context to request
      req.currentUser = user;
      req.userPermissions = user.permissions;
      req.userRole = user.role;
      req.userAccessLevel = user.accessLevel;
      req.auditLevel = actionChecks[0]?.auditLevel || 'standard';

      next();
    } catch (error) {
      console.error('Authorization error:', error);
      return res.status(500).json({
        error: true,
        code: 500,
        message: 'Authorization verification failed',
        timestamp: new Date().toISOString()
      });
    }
  };
};

/**
 * Role-based authorization middleware
 * @param {string|Array} allowedRoles - Single role or array of roles
 * @returns {Function} Express middleware function
 */
const authorizeRole = (allowedRoles) => {
  return async (req, res, next) => {
    try {
      const userRole = req.user?.role;
      const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
      
      if (!userRole || !roles.includes(userRole)) {
        return res.status(403).json({
          error: true,
          code: 403,
          message: 'Insufficient role privileges',
          details: {
            requiredRoles: roles,
            userRole
          },
          timestamp: new Date().toISOString()
        });
      }
      
      next();
    } catch (error) {
      console.error('Role authorization error:', error);
      return res.status(500).json({
        error: true,
        code: 500,
        message: 'Role verification failed',
        timestamp: new Date().toISOString()
      });
    }
  };
};

/**
 * Resource-level authorization middleware
 * @param {string} resourceType - Type of resource (evidence, case, user, system)
 * @param {string} resourceLevel - Level of resource (low, medium, high, critical)
 * @returns {Function} Express middleware function
 */
const authorizeResource = (resourceType, resourceLevel) => {
  return async (req, res, next) => {
    try {
      const userRole = req.user?.role;
      
      if (!userRole) {
        return res.status(401).json({
          error: true,
          code: 401,
          message: 'Authentication required',
          timestamp: new Date().toISOString()
        });
      }

      const resourceAccess = rbacConfig.resourceAccess[resourceType];
      if (!resourceAccess || !resourceAccess[resourceLevel]) {
        return res.status(403).json({
          error: true,
          code: 403,
          message: 'Resource access configuration not found',
          timestamp: new Date().toISOString()
        });
      }

      const allowedRoles = resourceAccess[resourceLevel];
      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({
          error: true,
          code: 403,
          message: 'Resource access denied',
          details: {
            resourceType,
            resourceLevel,
            userRole,
            allowedRoles
          },
          timestamp: new Date().toISOString()
        });
      }

      next();
    } catch (error) {
      console.error('Resource authorization error:', error);
      return res.status(500).json({
        error: true,
        code: 500,
        message: 'Resource authorization verification failed',
        timestamp: new Date().toISOString()
      });
    }
  };
};

/**
 * Get roles that have access to specific actions
 * @param {string|Array} actions - Action or array of actions
 * @returns {Array} Array of roles that have access
 */
const getRolesForActions = (actions) => {
  const actionArray = Array.isArray(actions) ? actions : [actions];
  const allRoles = new Set();
  
  actionArray.forEach(action => {
    const permission = rbacConfig.permissions[action];
    if (permission) {
      Object.entries(permission.roles).forEach(([role, hasAccess]) => {
        if (hasAccess) {
          allRoles.add(role);
        }
      });
    }
  });
  
  return Array.from(allRoles);
};

/**
 * Check if user has specific action permission
 * @param {string} userRole - User's role
 * @param {string} action - Action to check
 * @returns {boolean} Whether user has permission
 */
const hasActionPermission = (userRole, action) => {
  const permission = rbacConfig.permissions[action];
  if (!permission) {
    return false;
  }
  return permission.roles[userRole] === true;
};

/**
 * Get user's permissions for a specific role
 * @param {string} role - User role
 * @returns {Array} Array of actions the role can perform
 */
const getRolePermissions = (role) => {
  const permissions = [];
  Object.entries(rbacConfig.permissions).forEach(([action, config]) => {
    if (config.roles[role] === true) {
      permissions.push(action);
    }
  });
  return permissions;
};

/**
 * Log access attempts for audit trail
 */
const logAccessAttempt = async (req, user, action, success, details = {}) => {
  try {
    const auditLog = new AuditLog({
      userId: user._id,
      userEmail: user.email,
      userRole: user.role,
      action,
      resource: req.originalUrl,
      resourceType: req.route?.path || 'unknown',
      method: req.method,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      success,
      details,
      timestamp: new Date()
    });
    
    await auditLog.save();
    
    // Log to console for monitoring
    const logLevel = success ? 'info' : 'warn';
    console[logLevel](`[AUDIT] ${action}: ${user.email} (${user.role}) - ${success ? 'SUCCESS' : 'FAILED'}`, {
      resource: req.originalUrl,
      ip: req.ip,
      details
    });
    
  } catch (error) {
    console.error('Failed to log access attempt:', error);
  }
};

/**
 * Middleware to automatically determine required actions from endpoint
 * @param {Object} options - Options for automatic action detection
 * @returns {Function} Express middleware function
 */
const authorizeEndpoint = (options = {}) => {
  return async (req, res, next) => {
    try {
      const endpoint = req.originalUrl;
      const method = req.method;
      
      // Find matching endpoint in configuration
      const endpointMapping = rbacConfig.endpointMappings[endpoint];
      if (!endpointMapping) {
        // If no specific mapping, use default based on method
        const defaultActions = getDefaultActionsForMethod(method);
        if (defaultActions.length === 0) {
          return res.status(403).json({
            error: true,
            code: 403,
            message: 'No permission mapping found for endpoint',
            details: { endpoint, method },
            timestamp: new Date().toISOString()
          });
        }
        
        // Use the authorize middleware with default actions
        return authorize(defaultActions, options)(req, res, next);
      }
      
      // Use the authorize middleware with mapped actions
      return authorize(endpointMapping, options)(req, res, next);
    } catch (error) {
      console.error('Endpoint authorization error:', error);
      return res.status(500).json({
        error: true,
        code: 500,
        message: 'Endpoint authorization verification failed',
        timestamp: new Date().toISOString()
      });
    }
  };
};

/**
 * Get default actions based on HTTP method
 * @param {string} method - HTTP method
 * @returns {Array} Array of default actions
 */
const getDefaultActionsForMethod = (method) => {
  const methodActions = {
    'GET': ['view'],
    'POST': ['create'],
    'PUT': ['update'],
    'PATCH': ['update'],
    'DELETE': ['delete']
  };
  
  return methodActions[method] || [];
};

/**
 * Middleware to check suspicious activity patterns
 */
const checkSuspiciousActivity = async (req, user) => {
  try {
    const recentAttempts = await AuditLog.find({
      userId: user._id,
      timestamp: { $gte: new Date(Date.now() - 15 * 60 * 1000) }, // Last 15 minutes
      success: false
    }).sort({ timestamp: -1 });
    
    // Alert if more than 5 failed attempts in 15 minutes
    if (recentAttempts.length >= 5) {
      console.warn(`[SECURITY ALERT] Suspicious activity detected for user ${user.email}:`, {
        failedAttempts: recentAttempts.length,
        timeWindow: '15 minutes',
        recentActions: recentAttempts.map(attempt => ({
          action: attempt.action,
          resource: attempt.resource,
          timestamp: attempt.timestamp
        }))
      });
    }
    
  } catch (error) {
    console.error('Failed to check suspicious activity:', error);
  }
};

/**
 * Middleware to monitor suspicious activity
 */
const monitorSuspiciousActivity = (req, res, next) => {
  if (req.user?.id) {
    checkSuspiciousActivity(req, req.user);
  }
  next();
};

module.exports = {
  authorize,
  authorizeRole,
  authorizeResource,
  authorizeEndpoint,
  getRolesForActions,
  hasActionPermission,
  getRolePermissions,
  logAccessAttempt,
  checkSuspiciousActivity,
  monitorSuspiciousActivity,
  rbacConfig
};
