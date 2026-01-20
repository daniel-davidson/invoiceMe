# Cloudflare Pages Deployment Guide

This document explains how to deploy the InvoiceMe Flutter web frontend to Cloudflare Pages.

## Prerequisites

- Cloudflare account (free tier is sufficient)
- GitHub repository with InvoiceMe code
- Backend deployed to Render (or your backend URL)
- Supabase project configured

## Method 1: Cloudflare Dashboard (Recommended for First Deploy)

### Step 1: Connect Repository

1. Go to [Cloudflare Pages Dashboard](https://dash.cloudflare.com/pages)
2. Click **Create a project**
3. Connect to Git → Select your GitHub repository
4. Select the branch: `002-invoiceme-mvp`

### Step 2: Configure Build Settings

**Build configuration:**
- **Production branch**: `002-invoiceme-mvp` (or `main`)
- **Build command**:
  ```bash
  cd frontend && flutter build web --release --dart-define=API_URL=$API_URL
  ```
- **Build output directory**: `frontend/build/web`
- **Root directory**: (leave empty)

### Step 3: Set Environment Variables

Add these in **Settings → Environment variables** (both Production and Preview):

```
API_URL=https://invoiceme-backend.onrender.com
```

**Important**: Update `API_URL` with your actual Render backend URL.

### Step 4: Deploy

1. Click **Save and Deploy**
2. Wait for build (~3-5 minutes first time)
3. Note your URL: `https://invoiceme-[random].pages.dev`

### Step 5: Update CORS

After deployment, update CORS in your Render backend:

1. Go to Render dashboard → invoiceme-backend → Environment
2. Update `CORS_ORIGINS`:
   ```
   CORS_ORIGINS=https://invoiceme-[random].pages.dev,https://your-custom-domain.com
   ```
3. Save (Render will redeploy)

## Method 2: Wrangler CLI (For CI/CD)

### Prerequisites
```bash
npm install -g wrangler
wrangler login
```

### Deploy Command
```bash
# From project root
cd frontend

# Build with production API URL
flutter build web --release --dart-define=API_URL=https://invoiceme-backend.onrender.com

# Deploy
wrangler pages deploy build/web --project-name=invoiceme
```

## Verifying Deployment

Test these in your deployed app:

1. **Visit URL**: https://invoiceme-[random].pages.dev
2. **Welcome screen** loads correctly
3. **Sign up** works (creates user in Supabase)
4. **Log in** works
5. **Upload invoice** works (calls Render backend)
6. **Analytics** loads

## Custom Domain (Optional)

1. Go to Cloudflare Pages → invoiceme → Custom domains
2. Add domain: `app.yourdomain.com`
3. Follow DNS setup instructions
4. Update CORS in Render backend

## Build Optimization

The build uses these flags:
- `--release`: Production optimizations
- `--dart-define=API_URL=...`: Compile-time backend URL

## Troubleshooting

### Build Fails: "Flutter command not found"

Cloudflare Pages doesn't have Flutter by default. You need to install it in the build process.

**Fix**: Use a custom build command:
```bash
cd frontend && wget -O flutter.tar.xz https://storage.googleapis.com/flutter_infra_release/releases/stable/linux/flutter_linux_3.24.0-stable.tar.xz && tar xf flutter.tar.xz && export PATH="$PATH:`pwd`/flutter/bin" && flutter build web --release --dart-define=API_URL=$API_URL
```

Or use a build script (see `frontend/scripts/build-cloudflare.sh`).

### CORS Errors After Deploy

**Symptom**: Browser console shows CORS errors when calling API.

**Fix**: Update `CORS_ORIGINS` in Render backend to include your Cloudflare Pages URL.

### Routing Doesn't Work

**Symptom**: Direct links to `/analytics` etc. show 404.

**Fix**: Ensure `_redirects` file exists in `frontend/web/_redirects`:
```
/* /index.html 200
```

This file is automatically copied to `build/web/` during build.

## Environment Variables

Only one variable is needed:

| Variable | Value | Purpose |
|----------|-------|---------|
| `API_URL` | `https://invoiceme-backend.onrender.com` | Backend API base URL |

**Note**: Supabase config is fetched from backend at runtime (no frontend secrets needed).

## Performance

- **First load**: ~1-3s (depends on location)
- **Subsequent loads**: <500ms (cached by Cloudflare CDN)
- **Global CDN**: Yes (Cloudflare edge network)

## Monitoring

- **Analytics**: Cloudflare dashboard → Pages → Analytics
- **Build logs**: Cloudflare dashboard → Pages → Deployments
- **Error tracking**: Browser console (consider adding Sentry)

## Cost

- **Free tier**: Unlimited requests, 500 builds/month, 100GB bandwidth/month
- **Sufficient for**: MVP with <10K users
- **Upgrade needed**: Only if >500 builds/month

---

**Next steps**:
1. Deploy backend to Render first
2. Deploy frontend to Cloudflare Pages
3. Update CORS
4. Test full flow
