# GitHub → Cloudflare Pages Setup Guide

## Prerequisites
✅ GitHub repository with code pushed
✅ Cloudflare account
✅ Backend deployed on Render

---

## Step 1: Get Cloudflare API Token

### A. Create API Token

1. **Go to:** https://dash.cloudflare.com/profile/api-tokens
2. **Click:** "Create Token"
3. **Use Template:** "Edit Cloudflare Pages"
4. **Click:** "Continue to summary"
5. **Click:** "Create Token"
6. **COPY THE TOKEN** (you'll only see it once!)
   - Should look like: `abc123...xyz789`
   - Save it somewhere safe temporarily

### B. Get Account ID

1. **Go to:** https://dash.cloudflare.com
2. **Click:** "Workers & Pages" (or any project)
3. **Look at right sidebar** - Copy "Account ID"
   - Or check URL: `dash.cloudflare.com/YOUR_ACCOUNT_ID_HERE`
   - Should be a string like: `abc123def456...`

---

## Step 2: Get Backend URL

Your Render backend URL. Should be something like:
- `https://invoiceme-backend.onrender.com`
- Or check Render dashboard → Your service → Copy the URL

---

## Step 3: Add GitHub Secrets

### A. Go to Repository Settings

1. **Open your GitHub repo:** https://github.com/YOUR_USERNAME/invoiceMe
2. **Click:** "Settings" tab (top right)
3. **Left sidebar:** Click "Secrets and variables" → "Actions"

### B. Add Three Secrets

Click "New repository secret" for each:

#### Secret 1: CLOUDFLARE_API_TOKEN
- **Name:** `CLOUDFLARE_API_TOKEN`
- **Value:** (paste your API token from Step 1A)
- Click "Add secret"

#### Secret 2: CLOUDFLARE_ACCOUNT_ID
- **Name:** `CLOUDFLARE_ACCOUNT_ID`
- **Value:** (paste your account ID from Step 1B)
- Click "Add secret"

#### Secret 3: API_URL
- **Name:** `API_URL`
- **Value:** Your Render backend URL (from Step 2)
- Example: `https://invoiceme-backend-abc123.onrender.com`
- Click "Add secret"

### C. Verify Secrets

You should now see 3 secrets listed:
- ✅ CLOUDFLARE_API_TOKEN
- ✅ CLOUDFLARE_ACCOUNT_ID
- ✅ API_URL

---

## Step 4: Trigger Deployment

### Option A: Push a Change (Triggers Automatically)

The workflow runs when you push changes to `frontend/` folder:

```bash
cd /Users/daniel.d/Developer/projs/invoiceMe

# Make a small change to trigger deployment
echo "# Deployed via GitHub Actions" >> frontend/README.md

# Commit and push
git add frontend/README.md
git commit -m "Trigger frontend deployment"
git push
```

### Option B: Manual Trigger (No Code Change)

1. **Go to:** https://github.com/YOUR_USERNAME/invoiceMe/actions
2. **Left sidebar:** Click "Deploy Frontend to Cloudflare Pages"
3. **Click:** "Run workflow" button (right side)
4. **Select branch:** main
5. **Click:** "Run workflow" (green button)

---

## Step 5: Watch Deployment

1. **Go to Actions tab:** https://github.com/YOUR_USERNAME/invoiceMe/actions
2. **Click on the running workflow** (yellow dot = in progress)
3. **Watch the steps:**
   - ✅ Checkout Code
   - ✅ Setup Flutter
   - ✅ Get Dependencies
   - ✅ Build Web
   - ✅ Deploy to Cloudflare Pages

**Time:** ~3-5 minutes

---

## Step 6: Get Your Frontend URL

### A. From GitHub Actions Log

At the end of deployment, you'll see:
```
Deploying to Cloudflare Pages...
✅ Deployment successful
URL: https://invoiceme.pages.dev
```

### B. From Cloudflare Dashboard

1. **Go to:** https://dash.cloudflare.com
2. **Click:** "Workers & Pages"
3. **Find:** "invoiceme" project
4. **Click on it** → See deployment URL

---

## Step 7: Update Backend CORS

Now that frontend is deployed:

1. **Go to Render:** https://render.com/dashboard
2. **Click:** Your backend service
3. **Click:** "Environment" (left sidebar)
4. **Find:** `CORS_ORIGINS`
5. **Update to:** `https://invoiceme.pages.dev`
6. **Click:** "Save Changes"
7. **Wait:** ~2 minutes for redeploy

---

## Step 8: Test Your Deployed App

1. **Visit:** `https://invoiceme.pages.dev`
2. **Check:**
   - ✅ App loads (no white screen)
   - ✅ No errors in browser console (F12)
   - ✅ Can sign up / log in
   - ✅ Can upload invoice
   - ✅ Invoice processes successfully

---

## Troubleshooting

### "Workflow not running"

**Check:**
- Secrets are added correctly (case-sensitive!)
- Workflow file exists: `.github/workflows/deploy-frontend.yml`
- You pushed the workflow file to GitHub

**Fix:**
```bash
cd /Users/daniel.d/Developer/projs/invoiceMe
git add .github/workflows/
git commit -m "Add deployment workflow"
git push
```

### "Build failed: Flutter not found"

**Solution:** This should not happen with our workflow - it installs Flutter automatically.

**Check workflow logs for:**
- Flutter installation step
- Flutter version (should be 3.19.0)

### "Deploy failed: Invalid API token"

**Check:**
- Token copied correctly (no extra spaces)
- Token has "Edit Cloudflare Pages" permissions
- Token not expired

**Fix:** Generate new token and update GitHub secret

### "CORS errors in browser"

**Fix:**
1. Check backend `CORS_ORIGINS` includes your frontend URL
2. Wait for backend to redeploy (2 min)
3. Clear browser cache
4. Try again

---

## Future Deployments

Once setup, deployments are **automatic**:

1. **Make changes** to `frontend/` code
2. **Commit and push:**
   ```bash
   git add .
   git commit -m "Update frontend"
   git push
   ```
3. **GitHub Actions** automatically builds and deploys
4. **Done!** Changes live in ~3-5 minutes

---

## Project URLs (After Setup)

- **Frontend:** https://invoiceme.pages.dev
- **Backend:** https://your-backend.onrender.com
- **GitHub Actions:** https://github.com/YOUR_USERNAME/invoiceMe/actions
- **Cloudflare Dashboard:** https://dash.cloudflare.com

---

## Cost

Everything remains **$0/month**:
- ✅ GitHub Actions: Free for public repos
- ✅ Cloudflare Pages: Unlimited bandwidth
- ✅ Render Backend: Free tier (with cold starts)
- ✅ Supabase: Free tier
- ✅ Groq API: 14,400 requests/day free

---

## Summary Checklist

Before triggering deployment:
- [ ] Cloudflare API token obtained
- [ ] Account ID copied
- [ ] Backend URL ready
- [ ] All 3 GitHub secrets added
- [ ] Workflow file pushed to GitHub

To deploy:
- [ ] Push to trigger OR manually run workflow
- [ ] Watch Actions tab for progress
- [ ] Get frontend URL from logs/Cloudflare
- [ ] Update backend CORS
- [ ] Test the app

**Ready to deploy!** 🚀
