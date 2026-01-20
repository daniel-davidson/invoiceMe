# Create Cloudflare Pages Project - Quick Guide

The GitHub Action failed because the "invoiceme" project doesn't exist in Cloudflare yet.

## ⚡ Quick Fix (Choose One Method)

---

### Method 1: Via Wrangler CLI (Fastest - 2 minutes)

**Step 1: Login to Cloudflare**
```bash
wrangler login
```
This opens a browser - authorize the connection.

**Step 2: Create the project**
```bash
wrangler pages project create invoiceme
```

**Step 3: Re-run GitHub Action**
Go to: https://github.com/YOUR_USERNAME/invoiceMe/actions
Click the failed run → "Re-run all jobs"

✅ **Done!** The project exists, GitHub Actions will now work.

---

### Method 2: Deploy Built Files (Creates Project + First Deploy)

**One command:**
```bash
cd /Users/daniel.d/Developer/projs/invoiceMe
wrangler pages deploy frontend/build/web --project-name=invoiceme
```

This will:
1. ✅ Create the "invoiceme" project
2. ✅ Upload your built frontend
3. ✅ Give you a live URL immediately
4. ✅ Enable GitHub Actions for future deployments

**After this, GitHub Actions will work automatically!**

---

### Method 3: Via Cloudflare Dashboard (Manual)

If you prefer the web interface:

1. **Go to:** https://dash.cloudflare.com
2. **Click:** "Workers & Pages" (left sidebar)
3. **Click:** "Create application" → "Pages"
4. **Choose ONE:**
   
   **Option A: Upload Built Files**
   - Click "Upload assets"
   - Project name: `invoiceme`
   - Drag folder: `frontend/build/web`
   - Click "Deploy"
   
   **Option B: Connect to Git**
   - Click "Connect to Git"
   - Select GitHub
   - Select repository: `invoiceMe`
   - Project name: `invoiceme`
   - Build command: (leave empty)
   - Build output: `frontend/build/web`
   - Click "Save and Deploy"
   - Cancel the first build (GitHub Actions will handle it)

---

## Why This Happens

The `cloudflare/pages-action` in GitHub Actions can only deploy to **existing** projects. It cannot create new projects.

**You must create the project once via:**
- Wrangler CLI
- Cloudflare dashboard
- First manual deployment

**After that, all future deployments via GitHub Actions work automatically!**

---

## Recommended: Method 2 (One-Command Deploy)

```bash
# Login once
wrangler login

# Deploy (creates project + uploads files)
wrangler pages deploy frontend/build/web --project-name=invoiceme
```

**This is the fastest way to get your app live AND enable GitHub Actions!**

---

## After Project is Created

**Your URLs will be:**
- Production: `https://invoiceme.pages.dev`
- Preview: `https://[commit-hash].invoiceme.pages.dev`

**GitHub Actions will now work for all future deployments!**

Just push to `frontend/` folder or run `./trigger-deploy.sh`

---

## Troubleshooting

**"wrangler: command not found"**
```bash
npm install -g wrangler
```

**"Not logged in"**
```bash
wrangler login
```

**"Project name already exists"**
Good! The project exists. Just re-run the GitHub Action.

---

## Next Steps

1. ✅ Run one of the methods above to create project
2. ✅ Get your live URL
3. ✅ Update backend CORS: `CORS_ORIGINS=https://invoiceme.pages.dev`
4. ✅ Test your app!

**Total time: 2-5 minutes** ⚡
