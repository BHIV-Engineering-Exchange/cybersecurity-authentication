# Render Deployment Guide

This guide will help you deploy your Cybercrime Investigation Dashboard on Render **manually** (without render.yaml).

## Prerequisites

1. A GitHub account with your code pushed
2. A Render account (sign up at https://render.com)
3. A Brevo account for email (optional but recommended)

## Step 1: Deploy PostgreSQL Database

1. Go to your Render Dashboard: https://dashboard.render.com
2. Click **"New +"** → **"PostgreSQL"**
3. Configure:
   - **Name**: `cybercrime-db`
   - **Database**: `cybercrime_db`
   - **User**: `cybercrime_user`
   - **Plan**: Free
   - **Region**: Oregon (or closest to you)
4. Click **"Create Database"**
5. **Copy the Internal Database URL** - you'll need this for the backend

## Step 2: Deploy Backend Service

1. In Render Dashboard, click **"New +"** → **"Web Service"**
2. Connect your GitHub repository (`yashikart/cybercrime`)
3. Configure the service:
   - **Name**: `cybercrime-backend`
   - **Environment**: `Python 3`
   - **Region**: Oregon (same as database)
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Plan**: Free

4. **Add Environment Variables** (click "Add Environment Variable" for each):
   
   **IMPORTANT**: Add this FIRST to specify Python version:
   ```
   PYTHON_VERSION=3.12.7
   ```
   
   Then add the rest:
   ```
   DATABASE_URL=<paste-internal-database-url-from-step-1>
   SECRET_KEY=<generate-a-random-secret-key-here>
   DEBUG=False
   PORT=10000
   CORS_ORIGINS=https://cybercrime-frontend.onrender.com,https://cybercrime-backend.onrender.com
   EVIDENCE_STORAGE_PATH=/opt/render/project/src/backend/evidence_storage
   BREVO_API_KEY=<your-brevo-api-key-if-using>
   OPENROUTER_API_KEY=<your-openrouter-key-if-using>
   ```
   
   **Note**: `CORS_ORIGINS` accepts comma-separated URLs (no spaces after commas). The backend will automatically parse it into a list.

5. Click **"Create Web Service"**

6. **Wait for deployment** - Note your backend URL (e.g., `https://cybercrime-backend.onrender.com`)

## Step 3: Update Backend CORS Settings

After backend deployment, update the `CORS_ORIGINS` environment variable:
1. Go to your backend service → **Environment** tab
2. Edit `CORS_ORIGINS` to include your frontend URL:
   ```
   CORS_ORIGINS=https://cybercrime-frontend.onrender.com,https://cybercrime-backend.onrender.com
   ```
3. Save and wait for redeployment

## Step 4: Update Frontend API Configuration

**IMPORTANT**: Your frontend currently uses hardcoded `http://localhost:3000` URLs. You MUST update them before deploying to Render.

### Step-by-Step Instructions:

#### 1. Create API Utility File

Create `frontend/src/lib/api.ts` with this content:

```typescript
// API base URL - uses environment variable in production, localhost in development
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

// Helper function to build API URLs
export const apiUrl = (path: string) => {
  // Remove leading slash if present
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  // Ensure API_BASE_URL doesn't have trailing slash
  const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
  return `${baseUrl}/${cleanPath}`;
};
```

#### 2. Find All Hardcoded URLs

Your frontend has many files with hardcoded URLs. Here are the main files that need updating:

**Files to update:**
- `frontend/src/components/admin/ComplaintsViewContent.tsx`
- `frontend/src/components/admin/DashboardContent.tsx`
- `frontend/src/components/admin/ManualInvestigatorContent.tsx`
- `frontend/src/components/admin/AccessRequestsContent.tsx`
- `frontend/src/components/admin/AIFraudDetectionContent.tsx`
- `frontend/src/components/admin/RLEngineContent.tsx`
- `frontend/src/components/admin/WalletFraudAnalysis.tsx`
- `frontend/src/components/admin/FraudDetectionContent.tsx`
- `frontend/src/components/admin/InvestigatorActivityContent.tsx`
- `frontend/src/components/admin/InvestigatorCommunicationContent.tsx`
- `frontend/src/components/admin/InvestigatorStatusContent.tsx`
- `frontend/src/components/admin/EvidenceLibraryContent.tsx`
- `frontend/src/components/admin/EscalationsContent.tsx`
- `frontend/src/components/investigator/InvestigatorDashboard.tsx`
- `frontend/src/components/auth/InvestigatorLoginForm.tsx`

#### 3. Update Each File

For each file, do the following:

**a) Add import at the top:**
```typescript
import { apiUrl } from '@/lib/api';
```

**b) Replace hardcoded URLs:**

**Before:**
```typescript
fetch("http://localhost:3000/api/v1/complaints/")
fetch(`http://localhost:3000/api/v1/investigators/${id}`)
```

**After:**
```typescript
fetch(apiUrl("complaints/"))
fetch(apiUrl(`investigators/${id}`))
```

**c) For URLs with query parameters:**
```typescript
// Before:
fetch(`http://localhost:3000/api/v1/complaints/?status=${status}`)

// After:
fetch(apiUrl(`complaints/?status=${status}`))
```

#### 4. Quick Find & Replace (Using VS Code or similar)

1. Open VS Code Find & Replace (Ctrl+Shift+H / Cmd+Shift+H)
2. Enable regex mode (.* icon)
3. Find: `"http://localhost:3000/api/v1/(.*?)"`
4. Replace: `apiUrl("$1")`
5. **Important**: Review each replacement manually to ensure correctness

#### 5. Test Locally

After making changes:
1. Set `VITE_API_URL=http://localhost:3000/api/v1` in your `.env` file (optional, defaults to localhost)
2. Run `npm run dev` in the frontend directory
3. Test that all API calls still work
4. Commit and push changes

#### 6. Alternative: Automated Script (Advanced)

If you have many files, you can use a script. Create `update-api-urls.js` in project root:

```javascript
const fs = require('fs');
const path = require('path');
const glob = require('glob');

const files = glob.sync('frontend/src/**/*.{ts,tsx}');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  // Check if file already imports apiUrl
  if (content.includes("from '@/lib/api'") || content.includes('apiUrl')) {
    return; // Skip if already updated
  }
  
  // Replace http://localhost:3000/api/v1/... with apiUrl(...)
  const updated = content.replace(
    /"http:\/\/localhost:3000\/api\/v1\/([^"]+)"/g,
    'apiUrl("$1")'
  );
  
  if (updated !== content) {
    // Add import if not present
    if (!updated.includes("import { apiUrl }")) {
      const importLine = "import { apiUrl } from '@/lib/api';";
      // Add after other imports
      updated = updated.replace(
        /(import\s+.*?from\s+['"][^'"]+['"];?\s*\n)+/,
        `$&${importLine}\n`
      );
    }
    fs.writeFileSync(file, updated);
    console.log(`Updated: ${file}`);
  }
});
```

**Note**: Review all changes manually before committing!

### What Happens After Deployment?

- **Development**: Uses `http://localhost:3000/api/v1` (default)
- **Production (Render)**: Uses `VITE_API_URL` environment variable you set in Step 5

## Step 5: Deploy Frontend Service

1. In Render Dashboard, click **"New +"** → **"Web Service"**
2. Connect the same GitHub repository (`yashikart/cybercrime`)
3. Configure:
   - **Name**: `cybercrime-frontend`
   - **Environment**: `Node`
   - **Region**: Oregon (same as backend)
   - **Branch**: `main`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npx vite preview --host 0.0.0.0 --port $PORT`
   - **Plan**: Free

4. **Add Environment Variables** (CRITICAL - Must be set BEFORE first build):
   ```
   VITE_API_URL=https://cybercrime-backend.onrender.com/api/v1
   PORT=10000
   ```
   **⚠️ IMPORTANT**: 
   - Replace `cybercrime-backend` with your actual backend service name
   - `VITE_API_URL` MUST be set BEFORE the first build
   - Vite embeds environment variables at BUILD time, not runtime
   - If you add it later, you MUST manually redeploy to rebuild

5. Click **"Create Web Service"**

6. **Wait for deployment** - Note your frontend URL (e.g., `https://cybercrime-frontend.onrender.com`)

## Step 6: Update Frontend Environment Variable (If Needed)

If you need to change `VITE_API_URL` after initial deployment:
1. Go to frontend service → **Environment** tab
2. Update `VITE_API_URL` with your actual backend URL:
   ```
   VITE_API_URL=https://cybercrime-backend.onrender.com/api/v1
   ```
   **⚠️ CRITICAL**: After changing `VITE_API_URL`, you MUST manually redeploy:
   - Go to **Manual Deploy** → **Deploy latest commit**
   - This rebuilds the app with the new environment variable

## Step 7: Configure Email (Brevo) - Optional

1. Sign up at https://www.brevo.com (if not already)
2. Go to Settings → API Keys
3. Create a new API key
4. Copy the key (starts with `xkeysib-...`)
5. Add it to backend environment variables as `BREVO_API_KEY`

## Important Notes

### Free Tier Limitations

- **Sleep after inactivity**: Free services sleep after 15 minutes of inactivity
- **Cold starts**: First request after sleep takes ~30 seconds
- **Database**: Free PostgreSQL has 90-day retention limit
- **Storage**: Evidence files are ephemeral on free tier (use S3 for production)

### Environment Variables Reference

**Backend Required:**
- `DATABASE_URL` - PostgreSQL connection string (from database service)
- `SECRET_KEY` - Random secret for JWT tokens
- `DEBUG` - Set to `False` for production
- `PORT` - Usually `10000` (Render sets this automatically via `$PORT`)
- `CORS_ORIGINS` - Comma-separated list of allowed origins

**Backend Optional:**
- `BREVO_API_KEY` - For email functionality
- `OPENROUTER_API_KEY` - For AI features
- `EVIDENCE_STORAGE_PATH` - File storage path

**Frontend Required:**
- `VITE_API_URL` - Backend API URL
- `PORT` - Usually `10000`

### Troubleshooting

1. **Build fails with "metadata-generation-failed" or Rust/Cargo errors**:
   - **Solution**: Add `PYTHON_VERSION=3.12.7` environment variable to your backend service
   - Render defaults to Python 3.13 which may not have pre-built wheels for all packages
   - Go to backend service → **Environment** → Add `PYTHON_VERSION=3.12.7`
   - Save and redeploy

2. **Backend fails with "error parsing value for field CORS_ORIGINS"**:
   - **Solution**: Ensure `CORS_ORIGINS` is set as comma-separated URLs without spaces: `url1,url2,url3`
   - Example: `https://cybercrime-frontend.onrender.com,https://cybercrime-backend.onrender.com`
   - The backend now automatically parses comma-separated strings (or JSON arrays)
   - Make sure there are no spaces after commas

3. **Backend won't start**:
   - Check logs in Render dashboard → **Logs** tab
   - Verify `DATABASE_URL` is correct (use Internal Database URL)
   - Ensure all required environment variables are set
   - Check if `requirements.txt` has all dependencies

2. **CORS errors**:
   - Update `CORS_ORIGINS` in backend to include frontend URL
   - Make sure URLs don't have trailing slashes
   - Restart backend service after changing env vars

3. **Database connection issues**:
   - Use **Internal Database URL** (not External) for backend
   - Format: `postgresql://user:password@host:5432/database`
   - Ensure PostgreSQL service is running

4. **Frontend can't reach backend**:
   - Verify `VITE_API_URL` matches backend URL exactly
   - Check backend is running and accessible
   - **Important**: After changing `VITE_API_URL`, manually redeploy frontend
   - Check browser console for errors

5. **Build failures**:
   - Check build logs in Render dashboard
   - Verify `requirements.txt` or `package.json` are correct
   - Check Root Directory is set correctly (`backend` or `frontend`)

### Post-Deployment Checklist

- [ ] Backend is accessible at `https://cybercrime-backend.onrender.com`
- [ ] Frontend is accessible at `https://cybercrime-frontend.onrender.com`
- [ ] Backend health check: `https://cybercrime-backend.onrender.com/health`
- [ ] Database connection is working (check backend logs)
- [ ] CORS is configured correctly (no CORS errors in browser console)
- [ ] Email service is configured (Brevo API key added)
- [ ] Superadmin account can log in
- [ ] File uploads work (evidence storage)
- [ ] API endpoints respond correctly
- [ ] Frontend can communicate with backend

### Updating Your Deployment

1. Push changes to GitHub (`git push origin main`)
2. Render automatically detects changes
3. Services rebuild automatically
4. Check deployment logs for errors
5. If environment variables changed, manually redeploy

### Getting Your Service URLs

- Backend URL: `https://cybercrime-backend.onrender.com`
- Frontend URL: `https://cybercrime-frontend.onrender.com`
- Database URL: Found in database service → **Connections** tab

### Production Considerations

1. **Use PostgreSQL**: ✅ Already configured
2. **File Storage**: For production, use AWS S3 or similar for evidence storage
3. **Environment Variables**: Never commit secrets to Git
4. **SSL**: Render provides SSL automatically
5. **Custom Domain**: You can add custom domains in Render settings
6. **Upgrade Plan**: Consider upgrading from free tier for production

## Need Help?

- Render Docs: https://render.com/docs
- Render Community: https://community.render.com
- Check deployment logs in Render dashboard → **Logs** tab
- Check service status in Render dashboard → **Events** tab
