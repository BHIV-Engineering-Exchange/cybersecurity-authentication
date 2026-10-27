# Role-Based Access Control (RBAC) Documentation

## Overview

This document describes the Role-Based Access Control (RBAC) system implemented in the Fraud Evidence System. The RBAC system ensures that users can only perform actions they are authorized for based on their assigned role.

## Table of Contents

1. [Roles & Permissions](#roles--permissions)
2. [Architecture](#architecture)
3. [Implementation](#implementation)
4. [Usage](#usage)
5. [Testing](#testing)
6. [Examples](#examples)
7. [Extending the System](#extending-the-system)

---

## Roles & Permissions

### Available Roles

The system defines 6 roles with hierarchical permissions:

| Role | Level | Description |
|------|-------|-------------|
| **guest** | 1 | Public access - minimal permissions |
| **user** | 2 | Basic user - can report and view own cases |
| **analyst** | 3 | Fraud analyst - can analyze and annotate evidence |
| **investigator** | 4 | Full case management and evidence access |
| **admin** | 5 | Administrator - can manage users and system operations |
| **superadmin** | 6 | Super Administrator - full system access |

### Permission Matrix

#### Guest Permissions
- ✅ `view-reports`

#### User Permissions
- ✅ `upload-evidence`
- ✅ `view-cases`
- ✅ `create-case`
- ✅ `view-reports`

#### Analyst Permissions  
- ✅ All User permissions, plus:
- ✅ `read-evidence`
- ✅ `annotate-evidence`
- ✅ `update-case`
- ✅ `generate-reports`
- ✅ `rl-predict`

#### Investigator Permissions
- ✅ All Analyst permissions, plus:
- ✅ `verify-evidence`
- ✅ `download-evidence`
- ✅ `share-evidence`
- ✅ `assign-case`
- ✅ `close-case`
- ✅ `escalate-case`
- ✅ `export-reports`
- ✅ `rl-feedback`

#### Admin Permissions
- ✅ All Investigator permissions, plus:
- ✅ `delete-evidence`
- ✅ `delete-case`
- ✅ `rl-train`
- ✅ `manage-users`
- ✅ `view-logs`

#### Superadmin Permissions
- ✅ All Admin permissions, plus:
- ✅ `manage-roles`
- ✅ `system-config`

### Complete Action List

```
read-evidence
upload-evidence
verify-evidence
download-evidence
delete-evidence
share-evidence
annotate-evidence
view-cases
create-case
update-case
delete-case
assign-case
close-case
escalate-case
view-reports
generate-reports
export-reports
rl-predict
rl-feedback
rl-train
manage-users
manage-roles
view-logs
system-config
```

---

## Architecture

### Components

1. **Configuration File** (`config/rbac-permissions.json`)
   - Defines all roles and their permissions
   - Maps actions to API routes
   - Establishes role hierarchy

2. **Middleware** (`middleware/rbacMiddleware.js`)
   - Enforces permissions on routes
   - Provides permission checking functions
   - Handles unauthorized access

3. **Mock Authentication** (`middleware/rbacMiddleware.js`)
   - Simulates user authentication for development
   - Extracts user role from headers or query parameters
   - Will be replaced with real JWT validation in production

### Flow Diagram

```
Request → Mock Auth → RBAC Middleware → Permission Check → Handler
                         ↓                      ↓
                   Load Config          Check User Role
                         ↓                      ↓
                   Extract Role         Has Permission?
                                               ↓
                                        Yes → Continue
                                        No → 403 Forbidden
```

---

## Implementation

### Configuration File Structure

```json
{
  "roles": {
    "role_name": {
      "description": "Role description",
      "level": 1-6,
      "permissions": ["action1", "action2", ...]
    }
  },
  "roleHierarchy": {
    "role_name": level
  },
  "actionToRoutes": {
    "action_name": ["/api/route1", "/api/route2"]
  }
}
```

### Middleware Functions

#### `requirePermission(action, options)`

Requires specific permission(s) to access a route.

```javascript
// Single permission
app.post('/api/evidence/upload', 
  requirePermission('upload-evidence'),
  handler
);

// Multiple permissions (require ANY)
app.post('/api/cases/update',
  requirePermission(['update-case', 'admin-override']),
  handler
);

// Multiple permissions (require ALL)
app.post('/api/sensitive',
  requirePermission(['perm1', 'perm2'], { requireAll: true }),
  handler
);
```

#### `requireRole(roles)`

Requires specific role(s) to access a route.

```javascript
// Single role
app.get('/admin/dashboard',
  requireRole('admin'),
  handler
);

// Multiple roles
app.post('/api/sensitive',
  requireRole(['admin', 'superadmin']),
  handler
);
```

#### `requireMinimumRole(minimumRole)`

Requires minimum role level based on hierarchy.

```javascript
// Requires investigator or higher (investigator, admin, superadmin)
app.post('/api/escalate',
  requireMinimumRole('investigator'),
  handler
);
```

---

## Usage

### Setting User Role for Testing

There are 3 ways to set the user role during development:

#### 1. HTTP Header (Recommended)

```bash
curl -H "x-user-role: analyst" http://localhost:5000/api/cases
```

#### 2. Query Parameter

```bash
curl http://localhost:5000/api/cases?role=analyst
```

#### 3. From req.user (Production)

```javascript
// Set by JWT middleware
req.user = {
  id: 'user-id',
  email: 'user@example.com',
  role: 'analyst'
};
```

### Example Requests

#### Upload Evidence (requires: upload-evidence)

```bash
# As User (PASS)
curl -X POST http://localhost:5000/api/evidence/upload \
  -H "x-user-role: user" \
  -F "caseId=CASE-2024-001" \
  -F "entity=0x742d..."

# As Guest (FAIL - 403)
curl -X POST http://localhost:5000/api/evidence/upload \
  -H "x-user-role: guest" \
  -F "caseId=CASE-2024-001" \
  -F "entity=0x742d..."
```

#### Verify Evidence (requires: verify-evidence)

```bash
# As Investigator (PASS)
curl -H "x-user-role: investigator" \
  http://localhost:5000/api/evidence/abc123/verify

# As Analyst (FAIL - 403)
curl -H "x-user-role: analyst" \
  http://localhost:5000/api/evidence/abc123/verify
```

#### Delete Case (requires: delete-case)

```bash
# As Admin (PASS)
curl -X DELETE http://localhost:5000/api/cases/abc123 \
  -H "x-user-role: admin"

# As Investigator (FAIL - 403)
curl -X DELETE http://localhost:5000/api/cases/abc123 \
  -H "x-user-role: investigator"
```

---

## Testing

### Using Postman

1. **Import Collection**
   ```
   postman/rbac_test_collection.json
   ```

2. **Collection Structure**
   - Guest Role Tests (2 tests)
   - User Role Tests (3 tests)
   - Analyst Role Tests (3 tests)
   - Investigator Role Tests (3 tests)
   - Admin Role Tests (2 tests)
   - Error Response Format Tests (1 test)

3. **Run Tests**
   - Click "Run collection"
   - All tests include assertions
   - Tests verify both successful and denied access

### Expected Responses

#### Success Response (200/201)

```json
{
  "success": true,
  "data": {
    // ... response data
  }
}
```

#### Forbidden Response (403)

```json
{
  "error": true,
  "code": 403,
  "message": "Forbidden: insufficient permissions",
  "details": {
    "requiredPermissions": ["delete-case"],
    "userRole": "investigator",
    "allowedRoles": ["admin", "superadmin"]
  },
  "timestamp": "2024-01-07T12:00:00.000Z"
}
```

### Manual Testing Checklist

- [ ] Guest can view reports
- [ ] Guest cannot upload evidence
- [ ] User can upload evidence
- [ ] User cannot verify evidence
- [ ] Analyst can read evidence
- [ ] Analyst can use RL predict
- [ ] Analyst cannot use RL feedback
- [ ] Investigator can verify evidence
- [ ] Investigator can escalate cases
- [ ] Investigator cannot delete cases
- [ ] Admin can delete cases
- [ ] Admin can manage users
- [ ] All 403 responses have correct format

---

## Examples

### Example 1: Protect New Endpoint

```javascript
// Protect evidence download endpoint
app.get('/api/evidence/:id/download',
  requirePermission('download-evidence'),
  async (req, res) => {
    // Download logic
  }
);
```

### Example 2: Multiple Permissions (ANY)

```javascript
// Allow if user has ANY of these permissions
app.post('/api/reports/generate',
  requirePermission(['generate-reports', 'admin-override']),
  async (req, res) => {
    // Generate report
  }
);
```

### Example 3: Multiple Permissions (ALL)

```javascript
// Require ALL permissions
app.post('/api/sensitive-operation',
  requirePermission(
    ['manage-users', 'view-logs', 'system-config'],
    { requireAll: true }
  ),
  async (req, res) => {
    // Sensitive operation
  }
);
```

### Example 4: Role-Based Access

```javascript
// Only admin and superadmin can access
app.get('/api/admin/dashboard',
  requireRole(['admin', 'superadmin']),
  async (req, res) => {
    // Admin dashboard
  }
);
```

### Example 5: Minimum Role Level

```javascript
// Investigator or higher (investigator, admin, superadmin)
app.post('/api/cases/escalate',
  requireMinimumRole('investigator'),
  async (req, res) => {
    // Escalate case
  }
);
```

### Example 6: Custom Unauthorized Handler

```javascript
app.post('/api/special',
  requirePermission('special-action', {
    onUnauthorized: (req, res, next) => {
      // Custom response
      res.status(403).json({
        error: 'You need special clearance!',
        contactAdmin: 'admin@fraud-evidence.com'
      });
    }
  }),
  handler
);
```

---

## Extending the System

### Adding a New Role

1. **Update `config/rbac-permissions.json`**:

```json
{
  "roles": {
    "auditor": {
      "description": "External auditor - read-only access",
      "level": 3.5,
      "permissions": [
        "view-cases",
        "read-evidence",
        "view-reports",
        "view-logs"
      ]
    }
  },
  "roleHierarchy": {
    "auditor": 3.5
  }
}
```

2. **No code changes needed!** The middleware automatically picks up the new role.

### Adding a New Permission

1. **Update `config/rbac-permissions.json`**:

```json
{
  "metadata": {
    "actions": [...existing actions..., "bulk-export"]
  },
  "roles": {
    "admin": {
      "permissions": [...existing..., "bulk-export"]
    }
  },
  "actionToRoutes": {
    "bulk-export": ["/api/export/bulk"]
  }
}
```

2. **Apply to route**:

```javascript
app.post('/api/export/bulk',
  requirePermission('bulk-export'),
  handler
);
```

### Adding Permission Groups

```json
{
  "permissionGroups": {
    "evidence_full_access": [
      "read-evidence",
      "upload-evidence",
      "verify-evidence",
      "download-evidence",
      "delete-evidence"
    ]
  }
}
```

Then use in code:

```javascript
const evidencePermissions = rbacConfig.permissionGroups.evidence_full_access;
app.use('/api/evidence/*',
  requirePermission(evidencePermissions, { requireAll: true }),
  evidenceRoutes
);
```

---

## Production Considerations

### Replace Mock Authentication

Currently using mock authentication for development. In production:

```javascript
// Replace mockAuth with real JWT middleware
const jwt = require('jsonwebtoken');

function authenticateJWT(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user; // Should include { id, email, role }
    next();
  });
}

// Use in server
app.use(authenticateJWT); // Instead of mockAuth
app.use(addRBACInfo);
```

### Security Best Practices

1. **Always validate JWT** before checking permissions
2. **Log all unauthorized attempts** for security monitoring
3. **Rate limit** permission checks to prevent brute force
4. **Audit trail** for all permission-based actions
5. **Regular review** of role permissions
6. **Principle of least privilege** - give minimum necessary permissions

### Performance Optimization

1. **Cache RBAC config** in memory (already implemented)
2. **Cache user roles** for the session
3. **Use Redis** for distributed caching in production
4. **Minimize permission checks** by grouping routes

---

## Troubleshooting

### Common Issues

#### 1. Always getting 403 Forbidden

**Problem**: Not setting user role

**Solution**: Set `x-user-role` header or `role` query parameter

```bash
curl -H "x-user-role: user" http://localhost:5000/api/cases
```

#### 2. Permission not recognized

**Problem**: Permission not in config file

**Solution**: Add permission to `rbac-permissions.json`:

```json
{
  "metadata": {
    "actions": [..., "new-permission"]
  },
  "roles": {
    "role_name": {
      "permissions": [..., "new-permission"]
    }
  }
}
```

#### 3. Role hierarchy not working

**Problem**: Role level not set in `roleHierarchy`

**Solution**: Add to hierarchy:

```json
{
  "roleHierarchy": {
    "new_role": 4
  }
}
```

#### 4. Middleware not applying

**Problem**: Middleware not imported or applied

**Solution**:

```javascript
const { requirePermission } = require('../middleware/rbacMiddleware');

app.post('/api/endpoint',
  requirePermission('action-name'),  // Add this line
  handler
);
```

---

## API Reference

### Middleware Functions

#### `requirePermission(actions, options)`

- **Parameters**:
  - `actions`: string | string[] - Required permission(s)
  - `options`: object (optional)
    - `requireAll`: boolean - Require all permissions (default: false)
    - `onUnauthorized`: function - Custom unauthorized handler

- **Returns**: Express middleware function

#### `requireRole(roles)`

- **Parameters**:
  - `roles`: string | string[] - Required role(s)

- **Returns**: Express middleware function

#### `requireMinimumRole(minimumRole)`

- **Parameters**:
  - `minimumRole`: string - Minimum required role

- **Returns**: Express middleware function

#### `hasPermission(role, action)`

- **Parameters**:
  - `role`: string - User role
  - `action`: string - Action to check

- **Returns**: boolean

#### `getRolePermissions(role)`

- **Parameters**:
  - `role`: string - Role name

- **Returns**: string[] - Array of permissions

---

## Changelog

### Version 1.0.0 (2024-01-07)

- ✅ Initial RBAC implementation
- ✅ 6 roles with hierarchical permissions
- ✅ 24 distinct actions/permissions
- ✅ Middleware for permission and role checking
- ✅ Mock authentication for development
- ✅ Comprehensive test suite
- ✅ Complete documentation

---

## Support

For questions or issues:
1. Check this documentation
2. Review `config/rbac-permissions.json` for current permissions
3. Test with Postman collection
4. Check server logs for permission attempts

---

**Last Updated**: January 7, 2024  
**Version**: 1.0.0  
**Maintained by**: Backend Team

