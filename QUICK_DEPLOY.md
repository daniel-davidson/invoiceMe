# Quick Deployment Guide - Start Here! 🚀

Get InvoiceMe deployed in 20 minutes for **$0/month**.

---

## 📋 What You Need

- [ ] GitHub account with your code pushed
- [ ] 10 minutes of time
- [ ] Email addresses for signups (Render, Groq, Cloudflare)

---

## 🎯 Step 1: Get Groq API Key (2 minutes)

1. Go to: https://console.groq.com
2. Sign up (free)
3. Click "API Keys" in sidebar
4. Click "Create API Key"
5. **Copy the key** (starts with `gsk_...`)
6. Save it somewhere safe - you'll need it soon

**Free Tier:** 14,400 requests/day (plenty for demos!)

---

## 🎯 Step 2: Deploy Backend to Render (10 minutes)

### A. Create Service

1. Go to: https://render.com
2. Click "Get Started for Free"
3. Sign up with GitHub
4. Click "New +" → "Web Service"
5. Select your `invoiceMe` repository
6. Click "Connect"

### B. Configure

**Basic Settings:**
- **Name:** `invoiceme-backend`
- **Region:** Choose closest to you
- **Branch:** `main` (or your default)
- **Root Directory:** (leave empty)
- **Environment:** `Docker`
- **Dockerfile Path:** `./backend/Dockerfile`
- **Plan:** `Free`

### C. Add Environment Variables

Click "Advanced" then add these one by one:

**Copy these exactly:**
```
DATABASE_URL=postgresql://postgres.bditmctptjkblkryepzg:supabasePass1%40@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres?sslmode=require&pgbouncer=true

SUPABASE_URL=https://bditmctptjkblkryepzg.supabase.co

SUPABASE_PUBLISHABLE_KEY=sb_publishable_oL91y_IAIS5WlK_KYcQaFg_EHNdKbzv

SUPABASE_SECRET_KEY=sb_secret_qHvf95_pkaUyG61xP6O2Cw_mVVKKuaL

SUPABASE_JWKS_URL=https://bditmctptjkblkryepzg.supabase.co/auth/v1/.well-known/jwks.json

LLM_PROVIDER=groq

GROQ_API_KEY=YOUR_GROQ_KEY_HERE

GROQ_MODEL=mixtral-8x7b-32768

NODE_ENV=production

PORT=3000

OCR_PROVIDER=tesseract

TESSERACT_LANGS=eng+heb

FX_PROVIDER=frankfurter

STORAGE_DIR=./uploads

CORS_ORIGINS=https://invoiceme.pages.dev
```

**⚠️ IMPORTANT:** Replace `YOUR_GROQ_KEY_HERE` with your actual Groq API key from Step 1!

### D. Deploy

1. Click "Create Web Service"
2. Wait 5-10 minutes (grab coffee ☕)
3. Watch the logs - should end with "Service is live"
4. **Copy your backend URL** (looks like: `https://invoiceme-backend-abc123.onrender.com`)

### E. Test

Visit: `https://YOUR-BACKEND-URL.onrender.com/health`

Should see:
```json
{"status":"ok","timestamp":"...","environment":"production"}
```

✅ Backend deployed!

---

## 🎯 Step 3: Get Cloudflare Setup (3 minutes)

### A. Get API Token

1. Go to: https://dash.cloudflare.com/profile/api-tokens
2. Click "Create Token"
3. Use template: "Edit Cloudflare Pages"
4. Click "Continue to summary"
5. Click "Create Token"
6. **Copy the token** (you only see it once!)

### B. Get Account ID

1. Go to: https://dash.cloudflare.com
2. Click any site (or Workers & Pages)
3. Look at right sidebar - copy "Account ID"
   - Or check URL: `dash.cloudflare.com/ABC123...` ← that's your account ID

---

## 🎯 Step 4: Setup GitHub Secrets (2 minutes)

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click "New repository secret" and add these THREE secrets:

**Secret 1:**
- Name: `CLOUDFLARE_API_TOKEN`
- Value: (paste your Cloudflare token from Step 3A)

**Secret 2:**
- Name: `CLOUDFLARE_ACCOUNT_ID`
- Value: (paste your account ID from Step 3B)

**Secret 3:**
- Name: `API_URL`
- Value: (paste your Render backend URL from Step 2D)
  - Example: `https://invoiceme-backend-abc123.onrender.com`

---

## 🎯 Step 5: Deploy Frontend (2 minutes)

### Option A: Push to Trigger Deploy (Recommended)

```bash
# Make sure all changes are committed
git add .
git commit -m "Setup deployment"
git push
```

Then:
1. Go to your repo → **Actions** tab
2. Watch the "Deploy Frontend" workflow run
3. Wait ~2-3 minutes
4. Should see green checkmark ✅

### Option B: Manual Trigger

1. Go to repo → **Actions** tab
2. Click "Deploy Frontend to Cloudflare Pages"
3. Click "Run workflow" → "Run workflow"
4. Wait ~2-3 minutes

### Check Deployment

1. Go to: https://dash.cloudflare.com
2. Click **Workers & Pages**
3. Should see "invoiceme" project
4. Click it → See successful deployment
5. **Copy your frontend URL:** `https://invoiceme.pages.dev`

---

## 🎯 Step 6: Test Everything! (3 minutes)

### Test Frontend

1. Visit: `https://invoiceme.pages.dev`
2. Should see login/signup screen
3. Open browser DevTools (F12) → Console tab
4. Should see NO errors

### Test Signup & Login

1. Click "Sign Up"
2. Enter email and password
3. Check email for confirmation (or skip if disabled in Supabase)
4. Log in
5. Should see home screen (empty at first)

### Test Invoice Upload

1. Click "Upload Invoice" or "+" button
2. Select a PDF or image (any invoice/receipt)
3. Wait 10-30 seconds (first request may take longer)
4. Should see success message
5. Vendor should appear on home screen

### Check for Errors

Open browser DevTools:
- **Console:** Should be clean (no red errors)
- **Network:** Check failed requests (should all be green/200)
- If CORS errors → Backend CORS needs updating (see troubleshooting)

✅ If all tests pass → **YOU'RE DONE!** 🎉

---

## 🔧 Troubleshooting

### Backend Build Failed

**Check Render logs for:**
```
exit code: 127
```

**Fix:** Dockerfile was already updated. Try:
1. Go to Render → Your service → Settings
2. Click "Manual Deploy" → "Clear build cache & deploy"

### Frontend Build Failed

**Check GitHub Actions logs for:**
```
flutter: not found
```

**Fix:** Workflow already created. Check:
1. Workflow file exists: `.github/workflows/deploy-frontend.yml`
2. All secrets are set correctly
3. Retry: Actions tab → Re-run workflow

### CORS Errors in Browser

```
Access to fetch... has been blocked by CORS policy
```

**Fix:** Update backend CORS:
1. Render → Your service → Environment
2. Find `CORS_ORIGINS`
3. Update to: `https://invoiceme.pages.dev`
4. Click "Save Changes"
5. Wait for redeploy (~2 min)

### Backend Takes Forever

First request after 15 minutes of inactivity takes 30-60 seconds (cold start). This is normal on free tier.

**Fix:** Upgrade to Render Starter ($7/mo) to remove cold starts.

### "Invalid Groq API Key"

**Fix:** 
1. Check Render environment variables
2. Make sure `GROQ_API_KEY` has correct value (starts with `gsk_`)
3. Test key: `curl -H "Authorization: Bearer gsk_..." https://api.groq.com/openai/v1/models`

---

## 📊 What You Just Deployed

```
                User Browser
                     ↓
        Flutter Web (Cloudflare Pages)
         https://invoiceme.pages.dev
                     ↓
        NestJS Backend (Render Docker)
    https://invoiceme-backend.onrender.com
                     ↓
        ┌────────────┼────────────┐
        ↓            ↓            ↓
    PostgreSQL   Storage      Groq API
    (Supabase)   (Supabase)   (14K/day)
```

**Cost: $0/month** 🎉

---

## 🚀 Next Steps

1. **Share your app:** Send link to friends/testers
2. **Customize:** Update app name, colors, logo
3. **Add domain:** Setup custom domain in Cloudflare Pages (optional)
4. **Monitor:** Check Render logs, Cloudflare analytics
5. **Upgrade:** When ready, upgrade Render to remove cold starts

---

## 📚 Need More Help?

- **Detailed Guide:** See `DEPLOYMENT_GUIDE.md`
- **Checklist:** See `DEPLOYMENT_CHECKLIST.md`
- **Summary:** See `DEPLOYMENT_FIXES_SUMMARY.md`
- **Workflow:** See `.github/workflows/README.md`

---

## ✅ Success Checklist

After deployment, you should have:

- ✅ Backend URL: `https://your-app.onrender.com`
- ✅ Frontend URL: `https://invoiceme.pages.dev`
- ✅ Backend health check returns 200 OK
- ✅ Frontend loads without errors
- ✅ Can sign up and log in
- ✅ Can upload and process invoices
- ✅ Vendor data appears correctly
- ✅ No CORS errors
- ✅ **Total cost: $0/month**

**Congratulations! Your app is live!** 🎉

---

**Having issues?** Check the troubleshooting sections in:
- This guide (above)
- `DEPLOYMENT_GUIDE.md` (comprehensive)
- `DEPLOYMENT_CHECKLIST.md` (step-by-step)
