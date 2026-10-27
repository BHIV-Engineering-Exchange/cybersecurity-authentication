# Frontend API URL Update Checklist

## ✅ Completed
- [x] Created `frontend/src/lib/api.ts` utility file

## 📋 Files That Need Updates

### Pattern for Each File:
1. **Add import** at the top: `import { apiUrl } from '@/lib/api';`
2. **Replace** all `"http://localhost:3000/api/v1/..."` with `apiUrl("...")`

---

### Admin Components (15 files)

1. **`frontend/src/components/admin/ComplaintsViewContent.tsx`**
   - Line 52: `fetch("http://localhost:3000/api/v1/complaints/")`
   - Line 66: `fetch("http://localhost:3000/api/v1/investigators/investigators")`

2. **`frontend/src/components/admin/DashboardContent.tsx`**
   - Multiple fetch calls (lines 122, 129, 137, 144, 152, 168, 181, 235, 295, 377, 388, 588)

3. **`frontend/src/components/admin/ManualInvestigatorContent.tsx`**
   - Lines 69, 147, 209, 242, 262

4. **`frontend/src/components/admin/AccessRequestsContent.tsx`**
   - Lines 41, 85

5. **`frontend/src/components/admin/AIFraudDetectionContent.tsx`**
   - Lines 121, 132, 144, 154, 166, 178, 189, 203

6. **`frontend/src/components/admin/RLEngineContent.tsx`**
   - Lines 43, 55, 78, 109

7. **`frontend/src/components/admin/WalletFraudAnalysis.tsx`**
   - Lines 44, 48

8. **`frontend/src/components/admin/FraudDetectionContent.tsx`**
   - Lines 66, 77, 89, 99, 115

9. **`frontend/src/components/admin/InvestigatorActivityContent.tsx`**
   - Lines 185, 206, 237, 255, 271, 278, 285, 292, 1109

10. **`frontend/src/components/admin/InvestigatorCommunicationContent.tsx`**
    - Lines 81, 114, 160

11. **`frontend/src/components/admin/InvestigatorStatusContent.tsx`**
    - Lines 105, 125

12. **`frontend/src/components/admin/EvidenceLibraryContent.tsx`**
    - Lines 49, 64, 407, 432

13. **`frontend/src/components/admin/EscalationsContent.tsx`**
    - Lines 79, 94, 111, 133

### Investigator Components (2 files)

14. **`frontend/src/components/investigator/InvestigatorDashboard.tsx`** ⚠️ **LARGEST FILE**
   - **Many occurrences** (lines 57, 99, 332, 375, 628, 930, 1249, 1273, 1289, 1304, 1324, 1559, 1595, 1630, 2032, 2531, 2598, 2621, 3076, 3328, 3501, 3518, 3543, 3874, 3949)

### Auth Components (1 file)

15. **`frontend/src/components/auth/InvestigatorLoginForm.tsx`**
    - Line 294

---

## 🔧 Update Pattern Examples

### Example 1: Simple GET Request
**Before:**
```typescript
const response = await fetch("http://localhost:3000/api/v1/complaints/");
```

**After:**
```typescript
import { apiUrl } from '@/lib/api';
// ... at top of file

const response = await fetch(apiUrl("complaints/"));
```

### Example 2: URL with Path Parameter
**Before:**
```typescript
fetch(`http://localhost:3000/api/v1/investigators/${investigatorId}/dashboard`)
```

**After:**
```typescript
fetch(apiUrl(`investigators/${investigatorId}/dashboard`))
```

### Example 3: URL with Query Parameters
**Before:**
```typescript
fetch(`http://localhost:3000/api/v1/complaints/?status=${status}`)
```

**After:**
```typescript
fetch(apiUrl(`complaints/?status=${status}`))
```

### Example 4: POST/PUT Request with Options
**Before:**
```typescript
fetch("http://localhost:3000/api/v1/complaints/", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(data)
})
```

**After:**
```typescript
fetch(apiUrl("complaints/"), {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(data)
})
```

---

## 🚀 Quick Update Steps

### Option 1: Manual Update (Recommended for first time)
1. Open each file listed above
2. Add `import { apiUrl } from '@/lib/api';` at the top (after other imports)
3. Find and replace each `"http://localhost:3000/api/v1/` with `apiUrl("`
4. Remove the closing `"` and add closing `)`
5. Test locally

### Option 2: VS Code Find & Replace
1. Open VS Code Find & Replace (Ctrl+Shift+H)
2. Enable regex mode (.* icon)
3. **Find:** `"http://localhost:3000/api/v1/([^"]+)"`
4. **Replace:** `apiUrl("$1")`
5. **Files to include:** `frontend/src/**/*.{ts,tsx}`
6. **Review each match** before replacing (some may need manual adjustment)

### Option 3: Use the Script (Advanced)
See `RENDER_DEPLOYMENT.md` Step 4, Section 6 for the automated script.

---

## ✅ Testing Checklist

After updating:
- [ ] Run `npm run dev` in frontend directory
- [ ] Test admin dashboard loads
- [ ] Test investigator dashboard loads
- [ ] Test API calls work (check browser console)
- [ ] Test file uploads
- [ ] Test all major features
- [ ] Commit changes: `git add . && git commit -m "Update frontend to use environment variables for API URLs"`
- [ ] Push to GitHub: `git push origin main`

---

## 📝 Notes

- The `apiUrl()` function automatically handles:
  - Removing leading slashes
  - Ensuring proper URL formatting
  - Using environment variable in production

- **Environment Variable:**
  - Development: Uses `http://localhost:3000/api/v1` (default)
  - Production: Uses `VITE_API_URL` from Render environment variables

- **Total Files to Update:** ~15 files
- **Total URL Replacements:** ~100+ occurrences

---

## 🆘 Need Help?

If you encounter issues:
1. Check browser console for errors
2. Verify `apiUrl` import is correct
3. Ensure all quotes are properly closed
4. Test one file at a time
