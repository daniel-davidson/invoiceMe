# Production Setup Guide: InvoiceMe MVP

**Version**: 002  
**Date**: 2026-01-20  
**Target Architecture**: Render (Backend) + Cloudflare Pages (Frontend) + Supabase (DB/Auth/Storage) + Groq API (LLM)

---

## Overview

This guide covers deploying InvoiceMe to production using free-tier services:

| Component | Service | Cost |
|-----------|---------|------|
| Backend API | Render (Docker) | Free |
| LLM Extraction | Groq API | Free (60 RPM) |
| Database | Supabase Postgres | Free (500MB) |
| Auth | Supabase Auth | Free (50K users) |
| Storage | Supabase Storage | Free (1GB) |
| Frontend | Cloudflare Pages | Free (unlimited) |

**Total Monthly Cost**: $0 for MVP scale

---

## Prerequisites

1. **Accounts Required**:
   - [Render](https://render.com) account
   - [Groq](https://console.groq.com) account (for API key)
   - [Supabase](https://supabase.com) project (already set up)
   - [Cloudflare](https://pages.cloudflare.com) account
   - GitHub account (for deployment source)

2. **Local Tools**:
   - Git
   - Flutter SDK (for web build)
   - Node.js 18+ (for testing backend locally)

---

## Part 1: Groq API Setup

### Step 1.1: Create Groq API Key

1. Go to [Groq Console](https://console.groq.com)
2. Sign in or create account
3. Navigate to **API Keys** section
4. Click **Create API Key**
5. Name it: `invoiceme-production`
6. Copy the key (starts with `gsk_...`)
7. **Save it securely** (you'll need it for Render)

### Step 1.2: Test Groq API (Optional)

```bash
curl https://api.groq.com/openai/v1/chat/completions \
  -H "Authorization: Bearer YOUR_GROQ_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama-3.3-70b-versatile",
    "messages": [{"role": "user", "content": "Hello"}],
    "temperature": 0
  }'
```

Expected: JSON response with `choices[0].message.content`

---

## Part 2: Backend Deployment (Render)

### Step 2.1: Push Code to GitHub

```bash
# Ensure latest code is committed
git add .
git commit -m "chore: prepare for production deployment"
git push origin 002-invoiceme-mvp
```

### Step 2.2: Create Render Web Service

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **New** → **Web Service**
3. Connect your GitHub repository: `invoiceMe`
4. Configure service:
   - **Name**: `invoiceme-backend`
   - **Region**: Choose closest to your users
   - **Branch**: `002-invoiceme-mvp`
   - **Root Directory**: `backend`
   - **Environment**: `Docker`
   - **Instance Type**: `Free`

### Step 2.3: Configure Environment Variables

Add these environment variables in Render dashboard:

```bash
# Node Environment
NODE_ENV=production
PORT=3000

# Database (from Supabase)
DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres

# Supabase Auth (from Supabase dashboard → Settings → API)
SUPABASE_URL=https://[PROJECT_ID].supabase.co
SUPABASE_SECRET_KEY=[YOUR_SERVICE_ROLE_KEY]
SUPABASE_JWKS_URL=https://[PROJECT_ID].supabase.co/.well-known/jwks.json

# LLM Provider (Groq)
LLM_PROVIDER=groq
GROQ_API_KEY=[YOUR_GROQ_API_KEY_FROM_STEP_1]
GROQ_MODEL=llama-3.3-70b-versatile

# OCR Provider
OCR_PROVIDER=tesseract
TESSERACT_LANGS=eng+heb

# Currency/FX
FX_PROVIDER=frankfurter
FX_API_URL=https://api.frankfurter.app

# Storage
STORAGE_DIR=./uploads

# CORS (update after frontend deployment)
CORS_ORIGINS=https://invoiceme.pages.dev,https://your-custom-domain.com
```

**Important**: Replace placeholders:
- `[PASSWORD]`, `[HOST]`, `[PROJECT_ID]`: From Supabase dashboard → Settings → Database
- `[YOUR_SERVICE_ROLE_KEY]`: From Supabase dashboard → Settings → API → `service_role` key (**Keep secret!**)
- `[YOUR_GROQ_API_KEY_FROM_STEP_1]`: From Step 1.1

### Step 2.4: Deploy

1. Click **Create Web Service**
2. Render will:
   - Build Docker image from `backend/Dockerfile`
   - Run database migrations (via Docker CMD or manual)
   - Start the server on port 3000
3. Wait for deployment (~5-10 minutes first time)
4. Note your backend URL: `https://invoiceme-backend.onrender.com`

### Step 2.5: Verify Backend

Test health endpoint:
```bash
curl https://invoiceme-backend.onrender.com/health
```

Expected: `{"status":"ok","timestamp":"..."}` or similar

Test auth (should require token):
```bash
curl https://invoiceme-backend.onrender.com/vendors
```

Expected: 401 Unauthorized (correct - needs auth token)

---

## Part 3: Frontend Deployment (Cloudflare Pages)

### Step 3.1: Build Flutter Web

1. Update API base URL in `frontend/lib/core/config/app_config.dart`:
   ```dart
   static const String apiBaseUrl = String.fromEnvironment(
     'API_BASE_URL',
     defaultValue: 'https://invoiceme-backend.onrender.com',
   );
   ```

2. Build Flutter web with production config:
   ```bash
   cd frontend
   flutter build web --release \
     --dart-define=API_BASE_URL=https://invoiceme-backend.onrender.com \
     --dart-define=SUPABASE_URL=https://[PROJECT_ID].supabase.co \
     --dart-define=SUPABASE_ANON_KEY=[YOUR_ANON_KEY]
   ```

3. Build output is in: `frontend/build/web/`

### Step 3.2: Add SPA Redirect File

Create `frontend/build/web/_redirects`:
```
/* /index.html 200
```

This ensures Flutter's client-side routing works correctly.

### Step 3.3: Deploy to Cloudflare Pages

**Option A: Cloudflare Dashboard (Manual)**

1. Go to [Cloudflare Pages Dashboard](https://dash.cloudflare.com/pages)
2. Click **Create a project**
3. Connect your GitHub repository: `invoiceMe`
4. Configure build:
   - **Project name**: `invoiceme`
   - **Production branch**: `002-invoiceme-mvp`
   - **Build command**:
     ```bash
     cd frontend && flutter build web --release --dart-define=API_BASE_URL=$API_BASE_URL --dart-define=SUPABASE_URL=$SUPABASE_URL --dart-define=SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY
     ```
   - **Build output directory**: `frontend/build/web`
   - **Root directory**: (leave empty)

5. Add environment variables in Cloudflare Pages settings:
   ```
   API_BASE_URL=https://invoiceme-backend.onrender.com
   SUPABASE_URL=https://[PROJECT_ID].supabase.co
   SUPABASE_ANON_KEY=[YOUR_ANON_KEY]
   ```

6. Click **Save and Deploy**

**Option B: Wrangler CLI (Recommended for CI/CD)**

```bash
# Install Wrangler
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Deploy (from project root)
cd frontend
wrangler pages publish build/web --project-name=invoiceme
```

### Step 3.4: Verify Frontend

1. Open your Cloudflare Pages URL: `https://invoiceme.pages.dev`
2. Test:
   - Welcome screen loads
   - Can navigate to Login/Signup
   - Can sign up new user
   - Can log in
   - Home screen loads after login

---

## Part 4: Update CORS Configuration

Now that you have the frontend URL, update CORS in Render:

1. Go to Render dashboard → invoiceme-backend → Environment
2. Update `CORS_ORIGINS`:
   ```
   CORS_ORIGINS=https://invoiceme.pages.dev,https://your-custom-domain.com
   ```
3. Save (Render will redeploy automatically)

---

## Part 5: Supabase Configuration

### Step 5.1: Verify Storage Buckets

1. Go to Supabase dashboard → Storage
2. Ensure bucket exists: `invoices` (or as configured)
3. Set bucket policies (RLS):
   ```sql
   -- Allow authenticated users to upload to their tenant folder
   CREATE POLICY "Users can upload to their tenant folder"
   ON storage.objects FOR INSERT
   TO authenticated
   WITH CHECK (bucket_id = 'invoices' AND (storage.foldername(name))[1] = auth.uid()::text);

   -- Allow authenticated users to read from their tenant folder
   CREATE POLICY "Users can read from their tenant folder"
   ON storage.objects FOR SELECT
   TO authenticated
   USING (bucket_id = 'invoices' AND (storage.foldername(name))[1] = auth.uid()::text);
   ```

### Step 5.2: Verify Database Schema

1. Go to Supabase dashboard → SQL Editor
2. Run migrations if needed:
   ```bash
   # Locally, test migrations
   cd backend
   npx prisma migrate deploy
   ```

### Step 5.3: Verify Auth Configuration

1. Go to Supabase dashboard → Authentication → Settings
2. Ensure **Email/Password** provider is enabled
3. Add **Site URL**: `https://invoiceme.pages.dev`
4. Add **Redirect URLs**: `https://invoiceme.pages.dev/**`

---

## Part 6: Testing Production

### Test Checklist

- [ ] **Frontend loads**: Visit `https://invoiceme.pages.dev`
- [ ] **Signup works**: Create new user account
- [ ] **Login works**: Log in with created account
- [ ] **Home screen loads**: See empty state or businesses
- [ ] **Upload invoice**: Upload PDF or image
  - [ ] Progress indicator shows
  - [ ] Assign business modal appears
  - [ ] Can create new business with monthly limit
  - [ ] Invoice appears on home screen
- [ ] **Vendor analytics**: Click business → see charts/KPIs
- [ ] **Overall analytics**: Visit analytics screen
- [ ] **Settings**: Update name, currency
- [ ] **Logout**: Log out and verify redirect to welcome

---

## Part 7: Monitoring & Maintenance

### Render Monitoring

- **Logs**: Render dashboard → invoiceme-backend → Logs
- **Metrics**: CPU, memory usage (free tier shows basic metrics)
- **Health checks**: Render pings `/health` endpoint automatically

### Groq API Monitoring

- **Usage**: Groq console → API Keys → View usage
- **Rate limits**: 60 RPM free tier (upgrade if needed)
- **Costs**: Track if you exceed free tier

### Cloudflare Pages Monitoring

- **Analytics**: Cloudflare dashboard → Pages → invoiceme → Analytics
- **Build logs**: Cloudflare dashboard → Pages → invoiceme → Deployments

### Supabase Monitoring

- **Database size**: Supabase dashboard → Database → (check size vs 500MB limit)
- **Auth users**: Supabase dashboard → Authentication → Users
- **Storage usage**: Supabase dashboard → Storage → (check size vs 1GB limit)

---

## Troubleshooting

### Backend Fails to Start

**Check**:
1. Render logs for errors
2. Verify all environment variables are set
3. Verify `DATABASE_URL` is correct (test connection locally)
4. Verify Docker build succeeds (check Dockerfile)

**Common issues**:
- Missing `GROQ_API_KEY`: Backend will fail on first invoice upload
- Wrong `DATABASE_URL`: Prisma can't connect
- Missing Tesseract: Ensure Dockerfile installs `tesseract-ocr`

### Frontend Can't Connect to Backend

**Check**:
1. Browser console for CORS errors
2. Verify `API_BASE_URL` in Flutter build matches Render URL
3. Verify `CORS_ORIGINS` in Render includes Cloudflare Pages URL

**Fix**:
- Update `CORS_ORIGINS` in Render → Save (redeploys automatically)

### Invoice Upload Fails

**Check**:
1. Render logs for extraction errors
2. Verify Groq API key is valid (test with curl)
3. Verify Tesseract is installed (check Render logs during build)

**Common issues**:
- Groq API rate limit exceeded: Upgrade to paid tier or wait
- OCR timeout: Increase timeout in `ocr.service.ts`
- Large PDF: Limit PDF pages to 2 (already implemented)

### Frontend Routing Doesn't Work

**Check**:
1. Verify `_redirects` file exists in `frontend/build/web/`
2. Verify Cloudflare Pages serves `_redirects` file

**Fix**:
- Rebuild with `_redirects` file included

---

## Scaling Considerations

### When to Upgrade

**Render Free Tier Limits**:
- Spins down after 15 min inactivity (cold start ~30s)
- 750 hours/month (sufficient for 1 app)

**Upgrade to Render Starter ($7/mo) when**:
- Need always-on (no cold starts)
- >750 hours/month usage

**Groq Free Tier Limits**:
- 60 requests/minute
- No monthly limit (as of 2026-01)

**Upgrade to Groq Pro ($...) when**:
- Need >60 RPM
- Need higher priority queue

**Supabase Free Tier Limits**:
- 500MB database
- 1GB storage
- 50K auth users

**Upgrade to Supabase Pro ($25/mo) when**:
- Database >500MB
- Storage >1GB
- Need more than 50K users

---

## Security Checklist

- [ ] **Environment variables**: Never commit `.env` files
- [ ] **API keys**: Use Render/Cloudflare secret storage
- [ ] **Supabase service role key**: Only in backend (never frontend)
- [ ] **CORS**: Only allow your frontend domains
- [ ] **Supabase RLS**: Enable row-level security policies
- [ ] **HTTPS**: Render and Cloudflare provide automatic HTTPS
- [ ] **JWT validation**: Backend validates Supabase JWT tokens

---

## Backup & Recovery

### Database Backups

Supabase automatically backs up daily (free tier keeps 7 days).

**Manual backup**:
```bash
# Export database
pg_dump $DATABASE_URL > backup.sql

# Restore database
psql $DATABASE_URL < backup.sql
```

### Storage Backups

Supabase Storage is not automatically backed up on free tier.

**Recommendation**: Download important invoices periodically via Supabase dashboard.

---

## Custom Domain Setup (Optional)

### Cloudflare Pages

1. Go to Cloudflare Pages → invoiceme → Custom domains
2. Add your domain: `app.yourdomain.com`
3. Follow DNS setup instructions
4. Update `CORS_ORIGINS` in Render to include your domain

### Render (Optional)

Render free tier does not support custom domains. Upgrade to Starter for custom backend domain.

---

## Cost Projections

| Users | Invoices/Month | Render | Groq | Supabase | Total |
|-------|----------------|--------|------|----------|-------|
| 1-10 | <100 | Free | Free | Free | **$0** |
| 10-50 | <500 | Free | Free | Free | **$0** |
| 50-100 | <2000 | Free | Free | Free | **$0** |
| 100-500 | <10K | $7 | Free | $25 | **$32** |
| 500+ | >10K | $21+ | $29+ | $25+ | **$75+** |

**MVP Target**: Stay in free tier (<50 users, <500 invoices/month)

---

## Next Steps

After successful deployment:

1. **Test thoroughly** with real invoices
2. **Monitor logs** for errors (first 24 hours)
3. **Share link** with beta testers
4. **Collect feedback** on extraction accuracy
5. **Iterate** based on user feedback

---

**END OF SETUP GUIDE**
