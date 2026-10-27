// Production-ready permissions configuration
// Centralized permissions matrix for all roles

const PERMISSIONS = {
  // Evidence-related permissions
  EVIDENCE: {
    VIEW: 'evidence.view',
    UPLOAD: 'evidence.upload',
    DOWNLOAD: 'evidence.download',
    DELETE: 'evidence.delete',
    EXPORT: 'evidence.export',
    SHARE: 'evidence.share',
    VERIFY: 'evidence.verify',
    MODIFY: 'evidence.modify'
  },
  
  // Case management permissions
  CASE: {
    VIEW: 'case.view',
    CREATE: 'case.create',
    UPDATE: 'case.update',
    DELETE: 'case.delete',
    ASSIGN: 'case.assign',
    CLOSE: 'case.close'
  },
  
  // User management permissions
  USER: {
    VIEW: 'user.view',
    CREATE: 'user.create',
    UPDATE: 'user.update',
    DELETE: 'user.delete',
    MANAGE_ROLES: 'user.manage_roles',
    RESET_PASSWORD: 'user.reset_password'
  },
  
  // Report and analytics permissions
  REPORT: {
    VIEW: 'report.view',
    GENERATE: 'report.generate',
    EXPORT: 'report.export',
    ANALYTICS: 'report.analytics'
  },
  
  // System administration permissions
  SYSTEM: {
    CONFIG: 'system.config',
    LOGS: 'system.logs',
    BACKUP: 'system.backup',
    MONITOR: 'system.monitor',
    MAINTENANCE: 'system.maintenance'
  },
  
  // RL Engine permissions
  RL: {
    VIEW: 'rl.view',
    TRAIN: 'rl.train',
    PREDICT: 'rl.predict',
    RESET: 'rl.reset',
    CONFIG: 'rl.config'
  },
  
  // Blockchain permissions
  BLOCKCHAIN: {
    VIEW: 'blockchain.view',
    SYNC: 'blockchain.sync',
    VERIFY: 'blockchain.verify',
    CONFIG: 'blockchain.config'
  }
};

// Role-based permission matrix
const ROLE_PERMISSIONS = {
  superadmin: {
    // Super admin has all permissions
    permissions: Object.values(PERMISSIONS).flatMap(category => Object.values(category)),
    accessLevel: 'full',
    description: 'Full system access with all permissions',
    restrictions: []
  },
  
  admin: {
    permissions: [
      // Evidence permissions
      PERMISSIONS.EVIDENCE.VIEW,
      PERMISSIONS.EVIDENCE.UPLOAD,
      PERMISSIONS.EVIDENCE.DOWNLOAD,
      PERMISSIONS.EVIDENCE.EXPORT,
      PERMISSIONS.EVIDENCE.SHARE,
      PERMISSIONS.EVIDENCE.VERIFY,
      PERMISSIONS.EVIDENCE.MODIFY,
      
      // Case permissions
      PERMISSIONS.CASE.VIEW,
      PERMISSIONS.CASE.CREATE,
      PERMISSIONS.CASE.UPDATE,
      PERMISSIONS.CASE.ASSIGN,
      PERMISSIONS.CASE.CLOSE,
      
      // User permissions (limited)
      PERMISSIONS.USER.VIEW,
      PERMISSIONS.USER.CREATE,
      PERMISSIONS.USER.UPDATE,
      
      // Report permissions
      PERMISSIONS.REPORT.VIEW,
      PERMISSIONS.REPORT.GENERATE,
      PERMISSIONS.REPORT.EXPORT,
      PERMISSIONS.REPORT.ANALYTICS,
      
      // System permissions (limited)
      PERMISSIONS.SYSTEM.LOGS,
      PERMISSIONS.SYSTEM.MONITOR,
      
      // RL permissions
      PERMISSIONS.RL.VIEW,
      PERMISSIONS.RL.TRAIN,
      PERMISSIONS.RL.PREDICT,
      
      // Blockchain permissions
      PERMISSIONS.BLOCKCHAIN.VIEW,
      PERMISSIONS.BLOCKCHAIN.SYNC,
      PERMISSIONS.BLOCKCHAIN.VERIFY
    ],
    accessLevel: 'elevated',
    description: 'Administrative access with most permissions except system management',
    restrictions: [
      'Cannot delete users',
      'Cannot manage system configuration',
      'Cannot perform system maintenance',
      'Cannot reset RL models'
    ]
  },
  
  investigator: {
    permissions: [
      // Evidence permissions (limited)
      PERMISSIONS.EVIDENCE.VIEW,
      PERMISSIONS.EVIDENCE.UPLOAD,
      PERMISSIONS.EVIDENCE.DOWNLOAD,
      PERMISSIONS.EVIDENCE.EXPORT,
      PERMISSIONS.EVIDENCE.SHARE,
      PERMISSIONS.EVIDENCE.VERIFY,
      
      // Case permissions (limited)
      PERMISSIONS.CASE.VIEW,
      PERMISSIONS.CASE.CREATE,
      PERMISSIONS.CASE.UPDATE,
      
      // Report permissions (limited)
      PERMISSIONS.REPORT.VIEW,
      PERMISSIONS.REPORT.GENERATE,
      PERMISSIONS.REPORT.EXPORT,
      
      // RL permissions (read-only)
      PERMISSIONS.RL.VIEW,
      PERMISSIONS.RL.PREDICT,
      
      // Blockchain permissions (read-only)
      PERMISSIONS.BLOCKCHAIN.VIEW,
      PERMISSIONS.BLOCKCHAIN.VERIFY
    ],
    accessLevel: 'standard',
    description: 'Investigator access with evidence and case management permissions',
    restrictions: [
      'Cannot delete evidence',
      'Cannot modify evidence metadata',
      'Cannot manage users',
      'Cannot access system logs',
      'Cannot train RL models',
      'Cannot sync blockchain data'
    ]
  },
  
  user: {
    permissions: [
      // Basic evidence permissions
      PERMISSIONS.EVIDENCE.UPLOAD,
      
      // Basic case permissions
      PERMISSIONS.CASE.VIEW,
      PERMISSIONS.CASE.CREATE
    ],
    accessLevel: 'restricted',
    description: 'Basic user access with minimal permissions',
    restrictions: [
      'Cannot view evidence library',
      'Cannot download evidence',
      'Cannot export data',
      'Cannot share evidence',
      'Cannot access reports',
      'Cannot access RL engine',
      'Cannot access blockchain data'
    ]
  }
};

// Resource-based access levels
const RESOURCE_ACCESS_LEVELS = {
  evidence: {
    low: ['user', 'investigator', 'admin', 'superadmin'],
    medium: ['investigator', 'admin', 'superadmin'],
    high: ['admin', 'superadmin'],
    critical: ['superadmin']
  },
  
  case: {
    low: ['user', 'investigator', 'admin', 'superadmin'],
    medium: ['investigator', 'admin', 'superadmin'],
    high: ['admin', 'superadmin'],
    critical: ['superadmin']
  },
  
  user: {
    low: ['investigator', 'admin', 'superadmin'],
    medium: ['admin', 'superadmin'],
    high: ['admin', 'superadmin'],
    critical: ['superadmin']
  },
  
  system: {
    low: ['admin', 'superadmin'],
    medium: ['admin', 'superadmin'],
    high: ['superadmin'],
    critical: ['superadmin']
  }
};

// Action-based permissions
const ACTION_PERMISSIONS = {
  'evidence.upload': {
    allowedRoles: ['user', 'investigator', 'admin', 'superadmin'],
    requiresApproval: false,
    auditLevel: 'standard'
  },
  
  'evidence.view': {
    allowedRoles: ['investigator', 'admin', 'superadmin'],
    requiresApproval: false,
    auditLevel: 'standard'
  },
  
  'evidence.download': {
    allowedRoles: ['investigator', 'admin', 'superadmin'],
    requiresApproval: false,
    auditLevel: 'high'
  },
  
  'evidence.export': {
    allowedRoles: ['investigator', 'admin', 'superadmin'],
    requiresApproval: true,
    auditLevel: 'high'
  },
  
  'evidence.share': {
    allowedRoles: ['investigator', 'admin', 'superadmin'],
    requiresApproval: true,
    auditLevel: 'high'
  },
  
  'evidence.delete': {
    allowedRoles: ['admin', 'superadmin'],
    requiresApproval: true,
    auditLevel: 'critical'
  },
  
  'user.create': {
    allowedRoles: ['admin', 'superadmin'],
    requiresApproval: false,
    auditLevel: 'high'
  },
  
  'user.delete': {
    allowedRoles: ['superadmin'],
    requiresApproval: true,
    auditLevel: 'critical'
  },
  
  'system.config': {
    allowedRoles: ['superadmin'],
    requiresApproval: true,
    auditLevel: 'critical'
  }
};

// Helper functions
const getRolePermissions = (role) => {
  return ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.user;
};

const hasPermission = (userRole, permission) => {
  const rolePermissions = getRolePermissions(userRole);
  return rolePermissions.permissions.includes(permission);
};

const canAccessResource = (userRole, resourceType, resourceLevel) => {
  const accessLevels = RESOURCE_ACCESS_LEVELS[resourceType];
  if (!accessLevels || !accessLevels[resourceLevel]) {
    return false;
  }
  return accessLevels[resourceLevel].includes(userRole);
};

const getActionConfig = (action) => {
  return ACTION_PERMISSIONS[action] || {
    allowedRoles: ['user'],
    requiresApproval: false,
    auditLevel: 'standard'
  };
};

const getAllowedRoles = (permission) => {
  const rolePermissions = Object.entries(ROLE_PERMISSIONS)
    .filter(([role, config]) => config.permissions.includes(permission))
    .map(([role]) => role);
  return rolePermissions;
};

module.exports = {
  PERMISSIONS,
  ROLE_PERMISSIONS,
  RESOURCE_ACCESS_LEVELS,
  ACTION_PERMISSIONS,
  getRolePermissions,
  hasPermission,
  canAccessResource,
  getActionConfig,
  getAllowedRoles
};
