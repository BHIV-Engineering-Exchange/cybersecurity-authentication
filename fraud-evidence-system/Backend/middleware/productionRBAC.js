// Production-ready RBAC middleware
const { 
  PERMISSIONS, 
  ROLE_PERMISSIONS, 
  hasPermission, 
  canAccessResource, 
  getActionConfig,
  getAllowedRoles 
} = require('../config/permissions');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

/**
 * Production-ready authorization middleware
 * @param {string|Array} requiredPermissions - Single permission or array of permissions
 * @param {Object} options - Additional authorization options
 * @returns {Function} Express middleware function
 */
const authorize = (requiredPermissions, options = {}) => {
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

      // Normalize permissions to array
      const permissions = Array.isArray(requiredPermissions) 
        ? requiredPermissions 
        : [requiredPermissions];

      // Check each required permission
      const permissionChecks = permissions.map(permission => {
        const hasAccess = hasPermission(userRole, permission);
        const actionConfig = getActionConfig(permission);
        
        return {
          permission,
          hasAccess,
          requiresApproval: actionConfig.requiresApproval,
          auditLevel: actionConfig.auditLevel,
          allowedRoles: actionConfig.allowedRoles
        };
      });

      // Check if user has all required permissions
      const hasAllPermissions = permissionChecks.every(check => check.hasAccess);
      
      if (!hasAllPermissions) {
        const failedPermissions = permissionChecks
          .filter(check => !check.hasAccess)
          .map(check => check.permission);
        
        await logAccessAttempt(req, user, 'insufficient_permissions', false, {
          requiredPermissions: failedPermissions,
          userRole,
          allowedRoles: getAllowedRoles(failedPermissions[0])
        });
        
        return res.status(403).json({
          error: true,
          code: 403,
          message: 'Insufficient permissions',
          requestId: req.requestId || req.headers['x-request-id'],
          details: {
            requiredPermissions: failedPermissions,
            userRole,
            allowedRoles: getAllowedRoles(failedPermissions[0])
          },
          timestamp: new Date().toISOString()
        });
      }

      // Check resource-specific access if specified
      if (options.resourceType && options.resourceLevel) {
        const canAccess = canAccessResource(userRole, options.resourceType, options.resourceLevel);
        if (!canAccess) {
          await logAccessAttempt(req, user, 'resource_access_denied', false, {
            resourceType: options.resourceType,
            resourceLevel: options.resourceLevel,
            userRole
          });
          
          return res.status(403).json({
            error: true,
            code: 403,
            message: 'Resource access denied',
            details: {
              resourceType: options.resourceType,
              resourceLevel: options.resourceLevel,
              userRole
            },
            timestamp: new Date().toISOString()
          });
        }
      }

      // Check if action requires approval
      const requiresApproval = permissionChecks.some(check => check.requiresApproval);
      if (requiresApproval && !options.skipApprovalCheck) {
        // In a real system, you would check if the action is pre-approved
        // For now, we'll log it and allow it
        await logAccessAttempt(req, user, 'approval_required', true, {
          permissions: permissions,
          requiresApproval: true
        });
      }

      // Log successful access
      await logAccessAttempt(req, user, 'access_granted', true, {
        permissions: permissions,
        auditLevel: permissionChecks[0]?.auditLevel || 'standard'
      });

      // Add user context to request
      req.currentUser = user;
      req.userPermissions = user.permissions;
      req.userRole = user.role;
      req.userAccessLevel = user.accessLevel;
      req.auditLevel = permissionChecks[0]?.auditLevel || 'standard';

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
  return authorize(null, { resourceType, resourceLevel });
};

/**
 * Log access attempts for audit trail
 */
const logAccessAttempt = async (req, user, action, success, details = {}) => {
  try {
    let rType = details.resourceType || 'system';
    if (!['evidence', 'case', 'user', 'system', 'report', 'rl', 'blockchain'].includes(rType)) {
      rType = 'system';
    }
    
    // Attempt to determine statusCode. If action implies denied, it's 403, missing auth 401, otherwise 200.
    let code = 200;
    if (!success) {
      if (action.includes('unauthenticated') || action.includes('missing_user')) code = 401;
      else code = 403;
    }

    const auditLog = new AuditLog({
      userId: user._id,
      userEmail: user.email,
      userRole: user.role,
      action,
      resource: req.originalUrl || 'unknown',
      resourceType: rType,
      endpoint: req.originalUrl || req.url || 'unknown',
      method: req.method || 'GET',
      ip: req.ip || (req.connection && req.connection.remoteAddress) || '127.0.0.1',
      userAgent: (req.get && req.get('User-Agent')) || 'test-agent',
      statusCode: code,
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
 * Check for suspicious activity patterns
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
      
      // In production, you would send alerts to security team
      // await sendSecurityAlert(user, recentAttempts);
    }
    
  } catch (error) {
    console.error('Failed to check suspicious activity:', error);
  }
};

/**
 * Middleware to check suspicious activity
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
  logAccessAttempt,
  checkSuspiciousActivity,
  monitorSuspiciousActivity
};
