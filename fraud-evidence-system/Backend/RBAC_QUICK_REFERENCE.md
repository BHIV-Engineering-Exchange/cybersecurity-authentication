# RBAC Quick Reference Guide

## 🚀 Quick Start

```bash
# 1. Start server
docker-compose up

# 2. Test as different roles
curl -H "x-user-role: user" http://localhost:5000/api/cases
curl -H "x-user-role: admin" http://localhost:5000/api/cases
```

## 👥 Roles (Lowest to Highest)

| Role | Can Do |
|------|--------|
| **guest** | View reports only |
| **user** | Upload evidence, create cases |
| **analyst** | Analyze evidence, RL predictions |
| **investigator** | Verify, download, escalate |
| **admin** | Delete, manage users, RL train |
| **superadmin** | Everything |

## 🔑 Common Permissions

```
upload-evidence      → user+
verify-evidence      → investigator+
delete-evidence      → admin+
view-cases           → user+
create-case          → user+
update-case          → analyst+
delete-case          → admin+
escalate-case        → investigator+
rl-predict           → analyst+
rl-feedback          → investigator+
manage-users         → admin+
```

## 📝 Testing Commands

### Success Examples

```bash
# User uploads evidence ✅
curl -X POST -H "x-user-role: user" \
  http://localhost:5000/api/evidence/upload \
  -F "caseId=CASE-001" -F "entity=0x742d..."

# Investigator verifies ✅
curl -H "x-user-role: investigator" \
  http://localhost:5000/api/evidence/abc123/verify

# Admin deletes case ✅
curl -X DELETE -H "x-user-role: admin" \
  http://localhost:5000/api/cases/abc123
```

### Failure Examples (403)

```bash
# Guest tries to upload ❌
curl -X POST -H "x-user-role: guest" \
  http://localhost:5000/api/evidence/upload

# User tries to verify ❌
curl -H "x-user-role: user" \
  http://localhost:5000/api/evidence/abc123/verify

# Investigator tries to delete ❌
curl -X DELETE -H "x-user-role: investigator" \
  http://localhost:5000/api/cases/abc123
```

## 🎯 Protected Endpoints

| Endpoint | Method | Permission | Min Role |
|----------|--------|------------|----------|
| `/api/evidence/upload` | POST | `upload-evidence` | user |
| `/api/evidence/:id/verify` | GET | `verify-evidence` | investigator |
| `/api/cases` | GET | `view-cases` | user |
| `/api/cases` | POST | `create-case` | user |
| `/api/cases/:id` | PUT | `update-case` | analyst |
| `/api/cases/:id` | DELETE | `delete-case` | admin |
| `/api/rl/predict` | POST | `rl-predict` | analyst |
| `/api/rl/feedback` | POST | `rl-feedback` | investigator |
| `/api/escalate` | POST | `escalate-case` | investigator |

## ⚠️ 403 Response Format

```json
{
  "error": true,
  "code": 403,
  "message": "Forbidden: insufficient permissions",
  "details": {
    "requiredPermissions": ["delete-case"],
    "userRole": "user",
    "allowedRoles": ["admin", "superadmin"]
  },
  "timestamp": "2024-01-07T12:00:00.000Z"
}
```

## 🔧 How to Add New Permission

1. Edit `config/rbac-permissions.json`:

```json
{
  "metadata": {
    "actions": [..., "new-action"]
  },
  "roles": {
    "investigator": {
      "permissions": [..., "new-action"]
    }
  }
}
```

2. Apply to route:

```javascript
app.post('/api/new-endpoint',
  requirePermission('new-action'),
  handler
);
```

3. Restart server - Done! ✅

## 📚 File Locations

```
config/rbac-permissions.json       # Permission matrix
middleware/rbacMiddleware.js       # Authorization logic
postman/rbac_test_collection.json  # Test cases
RBAC_DOCUMENTATION.md              # Full docs
```

## 🧪 Postman Testing

1. Import: `postman/rbac_test_collection.json`
2. Run collection
3. Check: All tests pass ✅

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| Always 403 | Add header: `-H "x-user-role: admin"` |
| Permission not found | Add to `rbac-permissions.json` |
| Middleware not working | Check middleware import and order |

## 💡 Pro Tips

- Use `x-user-role` header for testing
- Check server logs for authorization attempts
- Test both success and failure cases
- Review permissions regularly

---

**Need more details?** See `RBAC_DOCUMENTATION.md`

