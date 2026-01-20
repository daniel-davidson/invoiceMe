# Deployment Guide - InvoiceMe

This guide walks you through deploying InvoiceMe to free hosting services.

## Prerequisites

- [x] GitHub repository with your code
- [x] Supabase project (already have)
- [x] Groq API account (free)

---

## Step 1: Get API Keys

### 1.1 Groq API Key (Free - for LLM)

1. Go to https://console.groq.com
2. Sign up / Log in
3. Go to "API Keys" section
4. Create new API key
5. Copy the key (starts with `gsk_...`)

**Free Tier:** 14,400 requests/day, 30 requests/minute

### 1.2 Cloudflare API Token (for frontend deployment)

1. Go to https://dash.cloudflare.com/profile/api-tokens
2. Click "Create Token"
3. Use "Edit Cloudflare Pages" template
4. Select your account
5. Create token and copy it

### 1.3 Get Cloudflare Account ID

1. Go to https://dash.cloudflare.com
2. Click on any website or go to Pages
3. Copy Account ID from the right sidebar (or URL)

---

## Step 2: Deploy Backend to Render

### 2.1 Connect GitHub Repository

1. Go to https://render.com
2. Sign up / Log in
3. Click "New +" → "Web Service"
4. Connect your GitHub account
5. Select your `invoiceMe` repository

### 2.2 Configure Service

**Basic Settings:**
- Name: `invoiceme-backend`
- Region: Choose closest to you (e.g., Oregon, Frankfurt)
- Branch: `main` (or your default branch)
- Root Directory: Leave empty (we use `dockerContext` in render.yaml)

**Build Settings:**
- Environment: `Docker`
- Dockerfile Path: `./backend/Dockerfile`

**Plan:**
- Select: `Free`

### 2.3 Add Environment Variables

Click "Advanced" → "Add Environment Variable" and add these:

**Required - Database:**
```
DATABASE_URL=postgresql://postgres.bditmctptjkblkryepzg:supabasePass1%40@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres?sslmode=require&pgbouncer=true
```

**Required - Supabase Auth:**
```
SUPABASE_URL=https://bditmctptjkblkryepzg.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_oL91y_IAIS5WlK_KYcQaFg_EHNdKbzv
SUPABASE_SECRET_KEY=sb_secret_qHvf95_pkaUyG61xP6O2Cw_mVVKKuaL
SUPABASE_JWKS_URL=https://bditmctptjkblkryepzg.supabase.co/auth/v1/.well-known/jwks.json
```

**Required - LLM (Groq):**
```
LLM_PROVIDER=groq
GROQ_API_KEY=gsk_YOUR_KEY_HERE
GROQ_MODEL=mixtral-8x7b-32768
```

**Optional - Other Settings:**
```
NODE_ENV=production
PORT=3000
OCR_PROVIDER=tesseract
TESSERACT_LANGS=eng+heb
FX_PROVIDER=frankfurter
STORAGE_DIR=./uploads
```

**CORS (update after frontend deployment):**
```
CORS_ORIGINS=https://invoiceme.pages.dev
```

### 2.4 Deploy

1. Click "Create Web Service"
2. Wait for build (5-10 minutes first time)
3. Once deployed, copy your backend URL: `https://invoiceme-backend.onrender.com`

**Note:** Free tier spins down after 15 minutes of inactivity. First request after spin-down takes 30-60 seconds.

---

## Step 3: Deploy Frontend to Cloudflare Pages

You have two options:

### Option A: Automated GitHub Actions (Recommended)

**Setup GitHub Secrets:**

1. Go to your GitHub repository
2. Click "Settings" → "Secrets and variables" → "Actions"
3. Click "New repository secret" and add:

```
Name: CLOUDFLARE_API_TOKEN
Value: <your-cloudflare-api-token>

Name: CLOUDFLARE_ACCOUNT_ID
Value: <your-cloudflare-account-id>

Name: API_URL
Value: https://invoiceme-backend.onrender.com
```

**Deploy:**
- Push any change to `frontend/` folder
- GitHub Actions will automatically build and deploy
- Check "Actions" tab to see progress

### Option B: Manual Deploy (Quick Start)

**Build locally:**
```bash
cd frontend
flutter build web --release --dart-define=API_URL=https://invoiceme-backend.onrender.com
```

**Deploy:**
1. Go to https://dash.cloudflare.com
2. Click "Workers & Pages" → "Create application" → "Pages"
3. Choose "Direct Upload"
4. Name: `invoiceme`
5. Drag and drop `frontend/build/web` folder
6. Click "Deploy"

Your frontend will be at: `https://invoiceme.pages.dev`

---

## Step 4: Update Backend CORS

After frontend deploys, update backend CORS:

1. Go to Render dashboard → Your service
2. Go to "Environment"
3. Update `CORS_ORIGINS`:
   ```
   CORS_ORIGINS=https://invoiceme.pages.dev
   ```
4. Save changes (service will redeploy)

---

## Step 5: Verify Deployment

### Backend Health Check

Visit: `https://invoiceme-backend.onrender.com/health`

Should return:
```json
{
  "status": "ok",
  "timestamp": "2026-01-20T...",
  "environment": "production"
}
```

### Frontend

1. Visit: `https://invoiceme.pages.dev`
2. Try to sign up
3. Log in
4. Upload an invoice
5. Check if it processes

---

## Troubleshooting

### Backend Issues

**Build fails with "npm run build: command not found"**
- ✅ Fixed in updated Dockerfile (installs all dependencies in builder stage)

**"Ollama connection refused"**
- Make sure you set `LLM_PROVIDER=groq` (not `ollama`)
- Verify `GROQ_API_KEY` is set correctly

**"Cannot connect to database"**
- Verify `DATABASE_URL` is correct
- Check Supabase project is active

**CORS errors from frontend**
- Update `CORS_ORIGINS` to include your Cloudflare Pages URL
- Format: `https://invoiceme.pages.dev` (no trailing slash)

### Frontend Issues

**Blank page / Build not found**
- Check GitHub Actions logs for build errors
- Verify `API_URL` secret is set correctly
- Make sure Flutter version in workflow matches your local version

**API calls fail**
- Check Network tab in browser DevTools
- Verify API_URL is correct in build
- Check backend CORS settings

**GitHub Action fails**
- Verify all secrets are set correctly
- Check Flutter version in workflow file
- Review action logs for specific errors

---

## Costs

| Service | Cost | Limits |
|---------|------|--------|
| Render Backend | **$0/month** | 512 MB RAM, spins down after 15 min |
| Groq API | **$0/month** | 14,400 requests/day |
| Supabase | **$0/month** | 500 MB DB, 1 GB storage |
| Cloudflare Pages | **$0/month** | Unlimited bandwidth! |
| **Total** | **$0/month** | Perfect for MVP/demos |

---

## Upgrading (When Needed)

### Remove Cold Starts (Backend)

Upgrade Render to "Starter" plan: **$7/month**
- No spin down
- 512 MB RAM
- Always-on

### More Resources

Render "Standard": **$25/month**
- 2 GB RAM
- Better for production

### Alternatives

- Railway: $5/month (no free tier)
- Fly.io: Usage-based, ~$5-10/month
- Oracle Cloud: Free forever (24 GB RAM!) but requires DevOps skills

---

## Next Steps

1. ✅ Deploy backend to Render
2. ✅ Get Groq API key
3. ✅ Setup GitHub secrets
4. ✅ Push to GitHub (triggers frontend deploy)
5. ✅ Update CORS
6. ✅ Test end-to-end

---

## Support

- Render Docs: https://render.com/docs
- Cloudflare Pages: https://developers.cloudflare.com/pages
- Groq API: https://console.groq.com/docs
- GitHub Actions: https://docs.github.com/en/actions

---

## Architecture Diagram

```
User Browser
    ↓
Flutter Web (Cloudflare Pages) - FREE
    ↓ HTTPS
NestJS Backend (Render Docker) - FREE
    ↓
├─ PostgreSQL (Supabase) - FREE
├─ Storage (Supabase) - FREE  
├─ Auth (Supabase) - FREE
└─ LLM (Groq API) - FREE
```

**Total: $0/month** 🎉
