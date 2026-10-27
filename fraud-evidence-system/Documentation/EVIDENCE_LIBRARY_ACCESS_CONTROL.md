# Evidence Library Role-Based Access Control

## Overview

The Evidence Library implements granular role-based access control (RBAC) to ensure that only authorized personnel can view, export, or share digital evidence. This system restricts access to investigators, administrators, and superadministrators only.

## Role Permissions

### User Roles
1. **User** - Basic role with limited access
2. **Investigator** - Standard access to evidence library
3. **Admin** - Elevated access with additional administrative capabilities
4. **Superadmin** - Full system access with unrestricted capabilities

### Evidence Library Permissions

| Role | View Evidence | Download Evidence | Export Evidence | Share Evidence | Generate Reports | Admin Features |
|------|---------------|-------------------|-----------------|----------------|------------------|----------------|
| User | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Investigator | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Admin | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Superadmin | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

## Implementation Details

### Backend Implementation

#### 1. Role-Based Middleware
The system uses custom middleware to enforce role-based access:

```javascript
// middleware/roleBasedAccess.js
const requireRole = (allowedRoles) => {
  return async (req, res, next) => {
    // Verify user authentication
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Load user and check role
    const user = await User.findById(req.user.id);
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
  };
};
```

#### 2. Evidence Access Control
Additional checks ensure users can only access evidence they're authorized to view:

```javascript
// models/User.js
userSchema.methods.canAccessEvidence = function(evidence) {
  if (!this.canAccessEvidenceLibrary()) {
    return false;
  }
  
  // Superadmin can access everything
  if (this.role === 'superadmin') {
    return true;
  }
  
  // High-security evidence requires elevated access
  if (evidence.riskLevel === 'high' && this.accessLevel !== 'elevated' && this.accessLevel !== 'full') {
    return false;
  }
  
  return true;
};
```

#### 3. Route Protection
All evidence-related routes are protected with role-based middleware:

```javascript
// routes/evidenceRoutes.js
router.get('/', 
  auth, 
  requireRole(['investigator', 'admin', 'superadmin']),
  requireEvidenceLibraryAccess,
  logAccess('evidence_library_view'),
  async (req, res) => {
    // Route implementation
  }
);
```

### Frontend Implementation

#### 1. Role Checking
The Evidence Library component checks user roles on load:

```javascript
// Frontend/src/components/EvidenceLibrary.jsx
const checkUserAccess = () => {
  try {
    const token = localStorage.getItem('authToken');
    if (!token) {
      setHasAccess(false);
      return false;
    }
    
    // Decode JWT to get user role
    const payload = JSON.parse(atob(token.split('.')[1]));
    const role = payload.role;
    setUserRole(role);
    
    // Only allow investigators, admins, and superadmins
    const allowedRoles = ['investigator', 'admin', 'superadmin'];
    const hasValidRole = allowedRoles.includes(role);
    setHasAccess(hasValidRole);
    
    if (!hasValidRole) {
      toast.error('❌ Access denied: Evidence Library requires investigator or admin privileges');
    }
    
    return hasValidRole;
  } catch (error) {
    console.error('Error checking user access:', error);
    setHasAccess(false);
    return false;
  }
};
```

#### 2. Access Control UI
The component displays appropriate messages for unauthorized users:

```jsx
// Access control check
if (!hasAccess) {
  return (
    <div className="access-denied-container">
      <h2>🚫 Access Denied</h2>
      <p>Evidence Library access is restricted to investigators and administrators only.</p>
      <div>
        <p><strong>Required Role:</strong> Investigator, Admin, or Superadmin</p>
        <p><strong>Your Role:</strong> {userRole || 'Unknown'}</p>
      </div>
    </div>
  );
}
```

## API Endpoints

### Protected Evidence Library Routes

| Endpoint | Method | Role Required | Description |
|----------|--------|---------------|-------------|
| `/api/evidence` | GET | Investigator+ | List evidence with role-based filtering |
| `/api/evidence/case/:caseId` | GET | Investigator+ | Get evidence by case ID |
| `/api/evidence/entity/:entity` | GET | Investigator+ | Get evidence by entity |
| `/api/evidence/download/:evidenceId` | GET | Investigator+ | Download evidence file |
| `/api/evidence/share/:evidenceId` | POST | Investigator+ | Share evidence with other users |
| `/api/evidence/verify/:evidenceId` | POST | Investigator+ | Verify evidence integrity |
| `/api/evidence/trail/:caseId` | GET | Investigator+ | Get evidence trail |
| `/api/evidence/timeline/:entity` | GET | Investigator+ | Get comprehensive timeline |
| `/api/evidence/timeline/:entity/export` | GET | Investigator+ | Export timeline data |
| `/api/evidence/linked-trail` | POST | Investigator+ | Get linked evidence trail |

### Protected Report Generation Routes

| Endpoint | Method | Role Required | Description |
|----------|--------|---------------|-------------|
| `/api/reports/case/:caseId` | POST | Investigator+ | Generate case report |
| `/api/reports/entity/:entity` | POST | Investigator+ | Generate entity report |
| `/api/reports/linked` | POST | Investigator+ | Generate linked investigation report |
| `/api/reports/preview/case/:caseId` | GET | Investigator+ | Preview case report |
| `/api/reports/preview/entity/:entity` | GET | Investigator+ | Preview entity report |

## Security Features

### 1. JWT Authentication
All requests require a valid JWT token with role information.

### 2. Audit Logging
All access attempts are logged for security monitoring:
```javascript
const logAccess = (action) => {
  return (req, res, next) => {
    const logData = {
      action,
      user: req.user?.email || 'anonymous',
      ip: req.ip,
      timestamp: new Date(),
      path: req.originalUrl
    };
    console.log(`[ACCESS_LOG] ${JSON.stringify(logData)}`);
    next();
  };
};
```

### 3. Evidence Filtering
Even within allowed roles, evidence is filtered based on access levels:
```javascript
const filterEvidenceByAccess = (user, evidenceList) => {
  if (!user || !evidenceList) return [];
  return evidenceList.filter(evidence => {
    return user.canAccessEvidence(evidence);
  });
};
```

## Testing Access Control

### 1. Role-Based Testing
Test each role's access to ensure proper restrictions:

```bash
# Test with user role (should be denied)
curl -H "Authorization: Bearer USER_TOKEN" \
     http://localhost:5050/api/evidence

# Test with investigator role (should be allowed)
curl -H "Authorization: Bearer INVESTIGATOR_TOKEN" \
     http://localhost:5050/api/evidence

# Test with admin role (should be allowed)
curl -H "Authorization: Bearer ADMIN_TOKEN" \
     http://localhost:5050/api/evidence
```

### 2. Permission Testing
Verify specific permissions for each role:

```javascript
// Test download permission
describe('Evidence Download Permissions', () => {
  test('User role should be denied', async () => {
    const response = await request(app)
      .get('/api/evidence/download/123')
      .set('Authorization', `Bearer ${userToken}`);
    expect(response.status).toBe(403);
  });

  test('Investigator role should be allowed', async () => {
    const response = await request(app)
      .get('/api/evidence/download/123')
      .set('Authorization', `Bearer ${investigatorToken}`);
    expect(response.status).toBe(200);
  });
});
```

## Compliance and Best Practices

### 1. Least Privilege Principle
Users are granted the minimum permissions necessary to perform their job functions.

### 2. Separation of Duties
Different roles have distinct permissions to prevent conflicts of interest.

### 3. Regular Access Reviews
Periodic reviews of user roles and permissions ensure continued appropriateness.

### 4. Audit Trail
All access and actions are logged for compliance and security monitoring.

## Error Handling

### 1. Unauthorized Access (401)
```json
{
  "error": "Authentication required"
}
```

### 2. Forbidden Access (403)
```json
{
  "error": "Insufficient role privileges",
  "requiredRoles": ["investigator", "admin", "superadmin"],
  "userRole": "user"
}
```

### 3. Evidence Access Denied (403)
```json
{
  "error": "Access denied to this evidence",
  "reason": "Evidence access level exceeds user permissions",
  "evidenceRiskLevel": "high",
  "userAccessLevel": "standard"
}
```

## Future Enhancements

### 1. Dynamic Permission Management
Allow administrators to customize role permissions through the UI.

### 2. Time-Based Access
Implement time-limited access for specific evidence items.

### 3. Multi-Factor Authentication
Add MFA requirements for high-risk evidence access.

### 4. Advanced Auditing
Implement detailed audit trails with change tracking and anomaly detection.