# GitHub Actions Workflow - Frontend Deployment

This workflow automatically builds and deploys your Flutter web frontend to Cloudflare Pages whenever you push changes to the `frontend/` directory.

## Workflow File

Location: `.github/workflows/deploy-frontend.yml`

## Triggers

The workflow runs when:
1. Code is pushed to `main` or `master` branch
2. Changes are made to `frontend/` directory or the workflow file itself
3. Manually triggered via GitHub Actions UI (workflow_dispatch)

## What It Does

1. **Checkout Code** - Gets the latest code from your repository
2. **Setup Flutter** - Installs Flutter 3.19.0 (stable channel)
3. **Get Dependencies** - Runs `flutter pub get` to install packages
4. **Build Web App** - Compiles Flutter app to web (HTML/JS/CSS)
   - Uses `--release` flag for optimized production build
   - Passes `API_URL` from GitHub Secrets to connect to backend
5. **Deploy to Cloudflare Pages** - Uploads build artifacts to Cloudflare
   - Uses official Cloudflare Pages action
   - Automatically provisions SSL certificate
   - Creates preview deployments for each commit

## Required GitHub Secrets

Go to: **Repository → Settings → Secrets and variables → Actions**

Add these secrets:

| Secret Name | Description | Where to Get It |
|-------------|-------------|-----------------|
| `CLOUDFLARE_API_TOKEN` | API token for Cloudflare | Dashboard → Profile → API Tokens → Create Token → "Edit Cloudflare Pages" |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID | Dashboard → Any site → Right sidebar or URL |
| `API_URL` | Your backend URL | From Render deployment (e.g., `https://invoiceme-backend.onrender.com`) |

## Build Output

- **Build directory:** `frontend/build/web`
- **Output files:**
  - `index.html` - Main HTML file
  - `flutter.js` - Flutter engine loader
  - `main.dart.js` - Compiled Dart code
  - `assets/` - Images, fonts, etc.
  - `icons/` - App icons

## Deployment URL

After deployment:
- **Production:** `https://invoiceme.pages.dev`
- **Preview (per commit):** `https://<commit-hash>.invoiceme.pages.dev`

## Monitoring

### Check Deployment Status

1. Go to GitHub repository → **Actions** tab
2. Click on latest workflow run
3. View logs for each step

### Cloudflare Pages Dashboard

1. Go to https://dash.cloudflare.com
2. Click **Workers & Pages**
3. Select **invoiceme** project
4. View deployments, analytics, settings

## Troubleshooting

### Workflow Fails on "Setup Flutter"

**Cause:** Flutter version mismatch or download issue

**Fix:**
```yaml
# Update Flutter version in workflow file
- name: Setup Flutter
  uses: subosito/flutter-action@v2
  with:
    flutter-version: '3.19.0'  # Match your local version
    channel: 'stable'
```

### Workflow Fails on "Build Web"

**Cause:** Build errors in Flutter code

**Fix:**
1. Test build locally: `flutter build web --release`
2. Fix any errors shown
3. Commit and push fixes

### Workflow Fails on "Deploy to Cloudflare Pages"

**Cause:** Invalid API token or account ID

**Fix:**
1. Verify `CLOUDFLARE_API_TOKEN` is correct
2. Verify `CLOUDFLARE_ACCOUNT_ID` is correct
3. Check token permissions (needs "Edit Cloudflare Pages")
4. Regenerate token if needed

### Frontend Loads But Can't Connect to Backend

**Cause:** Wrong `API_URL` or CORS issue

**Fix:**
1. Verify `API_URL` secret points to correct backend
2. Update backend `CORS_ORIGINS` to include Cloudflare Pages URL
3. Rebuild frontend with correct API_URL

## Manual Deployment (Bypass GitHub Actions)

If GitHub Actions isn't working, deploy manually:

```bash
# 1. Build locally
cd frontend
flutter build web --release --dart-define=API_URL=https://your-backend.onrender.com

# 2. Install Wrangler CLI
npm install -g wrangler

# 3. Login to Cloudflare
wrangler login

# 4. Deploy
wrangler pages deploy build/web --project-name=invoiceme
```

## Customization

### Change Build Command

Edit the workflow file:
```yaml
- name: Build Flutter Web
  working-directory: ./frontend
  run: |
    flutter build web --release \
      --dart-define=API_URL=${{ secrets.API_URL }} \
      --dart-define=ANOTHER_VAR=${{ secrets.ANOTHER_VAR }}
```

### Deploy to Specific Branch

```yaml
on:
  push:
    branches: [production]  # Only deploy from 'production' branch
```

### Add Build Cache

Speed up builds by caching Flutter SDK:
```yaml
- name: Cache Flutter dependencies
  uses: actions/cache@v3
  with:
    path: /opt/hostedtunnels/flutter
    key: ${{ runner.os }}-flutter-${{ hashFiles('**/pubspec.lock') }}
```

## Cost

- **GitHub Actions:** Free for public repositories, 2,000 minutes/month for private
- **Cloudflare Pages:** Free (unlimited bandwidth!)
- **Total:** $0/month

## Support

- **GitHub Actions Docs:** https://docs.github.com/en/actions
- **Cloudflare Pages Docs:** https://developers.cloudflare.com/pages
- **Flutter Web Docs:** https://flutter.dev/docs/deployment/web

## Workflow Status Badge

Add this to your README.md to show workflow status:

```markdown
![Deploy Frontend](https://github.com/YOUR_USERNAME/invoiceMe/actions/workflows/deploy-frontend.yml/badge.svg)
```
