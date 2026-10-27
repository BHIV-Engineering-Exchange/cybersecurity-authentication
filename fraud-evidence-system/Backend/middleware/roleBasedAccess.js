// middleware/roleBasedAccess.js
const User = require('../models/User');

// Check if user has specific permission
const requirePermission = (permission) => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }

      if (!user.isActive) {
        return res.status(403).json({ error: 'Account is deactivated' });
      }

      if (!user.hasPermission(permission)) {
        return res.status(403).json({ 
          error: `Insufficient permissions. Required: ${permission}`,
          userRole: user.role,
          userPermissions: user.permissions
        });
      }

      req.userPermissions = user.permissions;
      req.userRole = user.role;
      req.userAccessLevel = user.accessLevel;
      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({ error: 'Permission verification failed' });
    }
  };
};

// Check if user can access evidence library
const requireEvidenceLibraryAccess = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    if (!user.canAccessEvidenceLibrary()) {
      return res.status(403).json({ 
        error: 'Evidence library access denied',
        reason: 'Insufficient permissions or inactive account',
        requiredRole: 'investigator or higher'
      });
    }

    req.currentUser = user;
    next();
  } catch (error) {
    console.error('Evidence library access check error:', error);
    res.status(500).json({ error: 'Access verification failed' });
  }
};

// Check if user can access specific evidence
const requireEvidenceAccess = async (req, res, next) => {
  try {
    if (!req.currentUser) {
      // If user hasn't been loaded yet, load them
      if (!req.user || !req.user.id) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }
      req.currentUser = user;
    }

    // Evidence will be loaded in the route handler
    // We'll add the access check there
    next();
  } catch (error) {
    console.error('Evidence access check error:', error);
    res.status(500).json({ error: 'Evidence access verification failed' });
  }
};

// Role-based middleware factory
const requireRole = (allowedRoles) => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }

      if (!user.isActive) {
        return res.status(403).json({ error: 'Account is deactivated' });
      }

      const userRoles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
      if (!userRoles.includes(user.role)) {
        return res.status(403).json({ 
          error: 'Insufficient role privileges',
          requiredRoles: userRoles,
          userRole: user.role
        });
      }

      req.currentUser = user;
      next();
    } catch (error) {
      console.error('Role check error:', error);
      res.status(500).json({ error: 'Role verification failed' });
    }
  };
};

// Access level-based middleware
const requireAccessLevel = (minimumLevel) => {
  const accessLevels = {
    'restricted': 0,
    'standard': 1,
    'elevated': 2,
    'full': 3
  };

  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }

      if (!user.isActive) {
        return res.status(403).json({ error: 'Account is deactivated' });
      }

      const userLevel = accessLevels[user.accessLevel] || 0;
      const requiredLevel = accessLevels[minimumLevel] || 0;

      if (userLevel < requiredLevel) {
        return res.status(403).json({ 
          error: 'Insufficient access level',
          requiredLevel: minimumLevel,
          userLevel: user.accessLevel
        });
      }

      req.currentUser = user;
      next();
    } catch (error) {
      console.error('Access level check error:', error);
      res.status(500).json({ error: 'Access level verification failed' });
    }
  };
};

// Check if user can perform bulk operations
const requireBulkOperationAccess = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Only admin and above can perform bulk operations
    if (!['admin', 'superadmin'].includes(user.role)) {
      return res.status(403).json({ 
        error: 'Bulk operations require admin privileges',
        userRole: user.role
      });
    }

    req.currentUser = user;
    next();
  } catch (error) {
    console.error('Bulk operation access check error:', error);
    res.status(500).json({ error: 'Bulk operation access verification failed' });
  }
};

// Log access attempts for audit purposes
const logAccess = (action) => {
  return (req, res, next) => {
    const logData = {
      action,
      user: req.user?.email || 'anonymous',
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      timestamp: new Date(),
      path: req.originalUrl,
      method: req.method
    };

    console.log(`[ACCESS_LOG] ${JSON.stringify(logData)}`);
    
    // Store in database if needed
    // You could save this to an AccessLog model for detailed audit trails
    
    next();
  };
};

// Filter evidence based on user access level
const filterEvidenceByAccess = (user, evidenceList) => {
  if (!user || !evidenceList) return [];

  return evidenceList.filter(evidence => {
    return user.canAccessEvidence(evidence);
  });
};

// Get user permissions summary
const getUserPermissionsSummary = (user) => {
  return {
    role: user.role,
    accessLevel: user.accessLevel,
    permissions: user.permissions,
    canAccessEvidenceLibrary: user.canAccessEvidenceLibrary(),
    department: user.department,
    isActive: user.isActive
  };
};

// Middleware to add user info to response
const addUserContext = async (req, res, next) => {
  try {
    if (req.user && req.user.id) {
      const user = await User.findById(req.user.id);
      if (user) {
        req.currentUser = user;
        res.locals.userContext = getUserPermissionsSummary(user);
      }
    }
    next();
  } catch (error) {
    console.error('Error adding user context:', error);
    next(); // Continue without user context
  }
};

module.exports = {
  requirePermission,
  requireEvidenceLibraryAccess,
  requireEvidenceAccess,
  requireRole,
  requireAccessLevel,
  requireBulkOperationAccess,
  logAccess,
  filterEvidenceByAccess,
  getUserPermissionsSummary,
  addUserContext
};