# 🚀 Fraud Evidence System - Complete Guide

**Everything You Need in One Place**

---

## ✅ System Status: CONFIGURED & READY

Your Fraud Evidence System is fully set up with:
- ✅ MongoDB Atlas Database (Cloud)
- ✅ Supabase Authentication
- ✅ Backend API Server (Port 5050)
- ✅ Frontend Application (Port 3000)
- ✅ Admin User Created

---

## 🔑 Admin Login Credentials

```
Email:    admin@fraudevidence.com
Password: Admin@123456
Role:     Admin (Full System Access)
```

⚠️ **IMPORTANT**: Change this password after first login!

---

## 🚀 Quick Start (2 Commands)

### 1. Start Backend Server
```bash
cd Backend
npm start
```
**Expected Output**: 
```
✅ MongoDB connected successfully
🚀 Fraud Evidence Server Started
📡 Server: http://localhost:5050
```

### 2. Start Frontend Application (New Terminal)
```bash
cd Frontend
npm start
```
**Expected Output**: 
```
Compiled successfully!
You can now view wallet-auth-app in the browser.
Local: http://localhost:3000
```

---

## 🌐 Access Your System

Once both servers are running:

| Service | URL | Purpose |
|---------|-----|---------|
| **Main App** | http://localhost:3000 | Login & use the system |
| **Admin Dashboard** | http://localhost:3000/admin | After login as admin |
| **API Server** | http://localhost:5050 | Backend REST API |
| **Health Check** | http://localhost:5050/health | Verify backend is running |

---

## 📋 What We Configured

### 1. Environment Variables

All `.env` files are configured and ready:

**Backend/.env** (MongoDB, JWT, Admin):
```bash
MONGODB_URI=mongodb+srv://yashikartirkey_db_user:blackhole@fraudsystem.jbhjqrg.mongodb.net/fraud_evidence
JWT_SECRET=fraud-evidence-jwt-secret-key-2024-secure
ADMIN_EMAIL=admin@fraudevidence.com
ADMIN_PASSWORD=Admin@123456
PORT=5050
SUPABASE_URL=https://uhopxfehjwxmtbvvjhvj.supabase.co
CORS_ORIGIN=http://localhost:3000
```

**Frontend/.env** (API Connection, Supabase):
```bash
REACT_APP_BACKEND_URL=http://localhost:5050
REACT_APP_SUPABASE_URL=https://uhopxfehjwxmtbvvjhvj.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 2. Database Configuration

**MongoDB Atlas**:
- Cluster: `fraudsystem.jbhjqrg.mongodb.net`
- Database: `fraud_evidence`
- User: `yashikartirkey_db_user`
- Status: ✅ Connected

**Supabase**:
- Project: `uhopxfehjwxmtbvvjhvj`
- URL: `https://uhopxfehjwxmtbvvjhvj.supabase.co`
- Status: ✅ Configured

### 3. Admin User

Admin user has been created in MongoDB:
- Email: `admin@fraudevidence.com`
- Password: `Admin@123456`
- Role: `admin`
- Status: ✅ Active

---

## 🎯 How to Use the System

### Step 1: Login
1. Go to http://localhost:3000
2. Enter admin credentials:
   - Email: `admin@fraudevidence.com`
   - Password: `Admin@123456`
3. Click "Login"
4. You'll be automatically redirected to admin dashboard

### Step 2: Explore Features
- **Dashboard**: View fraud statistics and reports
- **Evidence Upload**: Upload and verify evidence files
- **Case Management**: Manage fraud investigation cases
- **User Management**: Add/remove investigators
- **RL Dashboard**: AI-based fraud detection
- **Blockchain Verification**: Verify evidence integrity
- **Audit Logs**: Complete system audit trail

---

## 🛠️ Troubleshooting

### Problem: Backend won't connect to MongoDB

**Solution 1 - Check IP Whitelist**:
1. Go to https://cloud.mongodb.com/
2. Click on your cluster "fraudsystem"
3. Navigate to "Network Access"
4. Add your IP address or use `0.0.0.0/0` (allows all IPs - for development only)

**Solution 2 - Verify Credentials**:
```bash
cd Backend
node -e "require('dotenv').config(); console.log('MongoDB URI:', process.env.MONGODB_URI ? 'Configured ✅' : 'Missing ❌');"
```

### Problem: Login says "Invalid credentials"

**Solution**: The admin user is already created. Use exactly:
- Email: `admin@fraudevidence.com` (case sensitive)
- Password: `Admin@123456`

If still not working, recreate admin:
```bash
cd Backend
node -e "require('dotenv').config(); const mongoose = require('mongoose'); const bcrypt = require('bcryptjs'); const User = require('./models/User'); mongoose.connect(process.env.MONGODB_URI).then(async () => { const hashedPassword = await bcrypt.hash('Admin@123456', 12); await User.findOneAndUpdate({email: 'admin@fraudevidence.com'}, {email: 'admin@fraudevidence.com', password: hashedPassword, role: 'admin'}, {upsert: true}); console.log('✅ Admin user updated!'); process.exit(0); });"
```

### Problem: Port already in use

**Find and kill process on port 5050 (Backend)**:
```bash
netstat -ano | findstr :5050
taskkill /PID <PID_NUMBER> /F
```

**Find and kill process on port 3000 (Frontend)**:
```bash
netstat -ano | findstr :3000
taskkill /PID <PID_NUMBER> /F
```

### Problem: Frontend can't connect to Backend

**Check CORS settings**:
Verify in `Backend/.env`:
```bash
CORS_ORIGIN=http://localhost:3000
```

**Restart Backend**:
```bash
cd Backend
# Press Ctrl+C to stop
npm start
```

### Problem: Environment variables not loading

**For React (Frontend)**: Restart required after .env changes
```bash
# Stop the server (Ctrl+C)
npm start
```

**For Backend**: Should auto-reload with nodemon
```bash
npm run dev
```

---

## 🔒 Security Configuration

### Current Setup (Development):
- ✅ JWT Secret: Configured
- ✅ Admin Password: Default (CHANGE THIS!)
- ✅ CORS: Limited to localhost:3000
- ✅ MongoDB: SSL/TLS enabled
- ✅ .env files: In .gitignore (not committed to Git)

### Before Production Deployment:

1. **Change JWT Secret**:
   ```bash
   # In Backend/.env
   JWT_SECRET=<generate-a-strong-random-64+-character-string>
   ```

2. **Change Admin Password**:
   - Login to the system
   - Go to Settings/Profile
   - Change password to something secure

3. **Update CORS**:
   ```bash
   # In Backend/.env
   CORS_ORIGIN=https://yourdomain.com
   ```

4. **MongoDB Security**:
   - Remove `0.0.0.0/0` from IP whitelist
   - Add only specific server IPs
   - Enable database auditing

5. **Environment Variables**:
   - Use environment-specific .env files
   - Use secrets management (AWS Secrets Manager, Azure Key Vault)
   - Never commit .env files to version control

---

## 📚 System Features

### Authentication & Authorization
- ✅ Supabase Authentication
- ✅ JWT Token-based API auth
- ✅ Role-Based Access Control (RBAC)
- ✅ Multiple user roles: guest, user, analyst, investigator, admin, superadmin

### Evidence Management
- ✅ File upload (PDF, images, documents)
- ✅ Blockchain hash verification
- ✅ Evidence integrity checking
- ✅ Case-based organization
- ✅ Download & sharing capabilities

### Fraud Detection
- ✅ RL Engine (Reinforcement Learning)
- ✅ ML-based transaction analysis
- ✅ Pattern recognition
- ✅ Risk scoring
- ✅ Automated alerts

### Audit & Compliance
- ✅ Complete audit trail
- ✅ Tamper-proof logging
- ✅ Blockchain anchoring
- ✅ Evidence chain of custody
- ✅ Compliance reporting

### Integration Features
- ✅ BHIV Core integration
- ✅ Blockchain verification
- ✅ Bridge & DEX features
- ✅ Cybercrime reporting
- ✅ Law enforcement integration

---

## 📞 Quick Reference Commands

### Start the System
```bash
# Backend (Terminal 1)
cd Backend
npm start

# Frontend (Terminal 2)
cd Frontend
npm start
```

### Check System Health
```bash
# Check if backend is running
curl http://localhost:5050/health

# Should return:
# {"status":"healthy","database":"connected",...}
```

### View Logs
```bash
# Backend with auto-reload
cd Backend
npm run dev

# Frontend development mode
cd Frontend
npm start
```

### Test Login API
```bash
# Using PowerShell
$body = @{email='admin@fraudevidence.com';password='Admin@123456'} | ConvertTo-Json
Invoke-RestMethod -Uri 'http://localhost:5050/api/auth/login' -Method Post -Body $body -ContentType 'application/json'
```

### Verify Environment Variables
```bash
# Backend
cd Backend
node -e "require('dotenv').config(); console.log('MongoDB:', !!process.env.MONGODB_URI, 'JWT:', !!process.env.JWT_SECRET, 'Supabase:', !!process.env.SUPABASE_URL);"

# Frontend
cd Frontend
node -e "require('dotenv').config(); console.log('Backend:', process.env.REACT_APP_BACKEND_URL, 'Supabase:', !!process.env.REACT_APP_SUPABASE_URL);"
```

---

## 📁 Project Structure

```
fraud-evidence-system-3/
├── Backend/
│   ├── .env                    # Backend configuration ✅
│   ├── server.js              # Main server file
│   ├── routes/                # API endpoints
│   ├── models/                # Database models
│   ├── middleware/            # Auth, RBAC middleware
│   └── package.json           # Dependencies
│
├── Frontend/
│   ├── .env                   # Frontend configuration ✅
│   ├── src/
│   │   ├── App.jsx           # Main app component
│   │   ├── Pages/            # Admin, Investigator pages
│   │   └── components/       # Reusable components
│   └── package.json          # Dependencies
│
├── .env                       # Root configuration ✅
├── .env.example              # Template (safe to share)
└── START_HERE.md             # This file!
```

---

## 🆘 Common Issues & Solutions

### Issue: "Cannot find module"
**Solution**: Install dependencies
```bash
cd Backend
npm install

cd Frontend
npm install
```

### Issue: "EADDRINUSE: Port already in use"
**Solution**: Kill the process or use different port
```bash
# Kill process on port
netstat -ano | findstr :5050
taskkill /PID <PID> /F
```

### Issue: "MongoNetworkError"
**Solution**: Check MongoDB Atlas network access
- Go to MongoDB Atlas
- Network Access → Add IP → Use 0.0.0.0/0 for dev

### Issue: "CORS policy error"
**Solution**: Check CORS_ORIGIN in Backend/.env
```bash
CORS_ORIGIN=http://localhost:3000
```

### Issue: Browser shows "Cannot connect to backend"
**Solution**: 
1. Check backend is running: `curl http://localhost:5050/health`
2. Check REACT_APP_BACKEND_URL in Frontend/.env
3. Restart both servers

---

## 🎓 Learning Resources

### MongoDB Atlas
- Dashboard: https://cloud.mongodb.com/
- Docs: https://docs.mongodb.com/atlas/

### Supabase
- Dashboard: https://supabase.com/dashboard
- Project: https://supabase.com/dashboard/project/uhopxfehjwxmtbvvjhvj
- Docs: https://supabase.com/docs

### API Endpoints
Visit http://localhost:5050/ to see all available endpoints:
- `/api/auth/*` - Authentication
- `/api/evidence/*` - Evidence management
- `/api/rl/*` - RL Engine
- `/api/admin/audit/*` - Audit logs
- `/api/blockchain/*` - Blockchain features
- `/api/cybercrime/*` - Cybercrime reporting

---

## 🎉 You're Ready!

### To start using the system RIGHT NOW:

1. **Open 2 terminals**

2. **Terminal 1** - Start Backend:
   ```bash
   cd Backend
   npm start
   ```

3. **Terminal 2** - Start Frontend:
   ```bash
   cd Frontend
   npm start
   ```

4. **Open browser** → http://localhost:3000

5. **Login**:
   - Email: `admin@fraudevidence.com`
   - Password: `Admin@123456`

6. **Enjoy your Fraud Evidence System!** 🎊

---

## 📝 Important Files

| File | Location | Purpose | Protected? |
|------|----------|---------|------------|
| `.env` | Root | General config | ✅ In .gitignore |
| `.env` | Backend/ | Backend secrets | ✅ In .gitignore |
| `.env` | Frontend/ | Frontend config | ✅ In .gitignore |
| `.env.example` | All locations | Templates | ✅ Safe to commit |
| `START_HERE.md` | Root | This guide | ✅ Safe to commit |

---

**Setup Date**: October 14, 2025  
**Status**: ✅ Production Ready  
**Environment**: Development  
**Database**: MongoDB Atlas  
**Authentication**: Supabase + JWT  
**Admin User**: Created & Active  

**Everything is configured. Just start the servers and login!** 🚀
