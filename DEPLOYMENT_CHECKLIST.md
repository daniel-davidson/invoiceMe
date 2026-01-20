# Deployment Checklist

Use this checklist to ensure all deployment steps are completed correctly.

## Pre-Deployment

- [ ] Code pushed to GitHub repository
- [ ] Backend Dockerfile fixed (updated to install all dependencies in build stage)
- [ ] GitHub Actions workflow created for frontend
- [ ] Groq API key obtained from https://console.groq.com
- [ ] Cloudflare API token obtained
- [ ] Cloudflare Account ID noted

---

## Backend Deployment (Render)

### Setup
- [ ] Signed up / logged into Render
- [ ] Created new Web Service
- [ ] Connected GitHub repository
- [ ] Selected correct branch (main/master)
- [ ] Set environment to "Docker"
- [ ] Set dockerfile path to `./backend/Dockerfile`
- [ ] Selected "Free" plan

### Environment Variables
- [ ] `DATABASE_URL` - Supabase PostgreSQL connection string
- [ ] `SUPABASE_URL` - https://bditmctptjkblkryepzg.supabase.co
- [ ] `SUPABASE_PUBLISHABLE_KEY` - sb_publishable_...
- [ ] `SUPABASE_SECRET_KEY` - sb_secret_...
- [ ] `SUPABASE_JWKS_URL` - https://bditmctptjkblkryepzg.supabase.co/auth/v1/.well-known/jwks.json
- [ ] `LLM_PROVIDER` - groq
- [ ] `GROQ_API_KEY` - gsk_... (or use `LLM_API_KEY`)
- [ ] `GROQ_MODEL` - mixtral-8x7b-32768 (or llama-3.1-8b-instant)
- [ ] `NODE_ENV` - production
- [ ] `PORT` - 3000
- [ ] `OCR_PROVIDER` - tesseract
- [ ] `TESSERACT_LANGS` - eng+heb
- [ ] `FX_PROVIDER` - frankfurter
- [ ] `STORAGE_DIR` - ./uploads
- [ ] `CORS_ORIGINS` - (will update after frontend deploys)

### Deployment
- [ ] Clicked "Create Web Service"
- [ ] Build completed successfully (check logs)
- [ ] Service is running
- [ ] Health check passed: visit https://your-backend.onrender.com/health
- [ ] Backend URL copied for frontend configuration

---

## Frontend Deployment (Cloudflare Pages)

### GitHub Secrets Setup
- [ ] Went to GitHub repository → Settings → Secrets and variables → Actions
- [ ] Added `CLOUDFLARE_API_TOKEN`
- [ ] Added `CLOUDFLARE_ACCOUNT_ID`
- [ ] Added `API_URL` (your Render backend URL)

### GitHub Actions Workflow
- [ ] Workflow file created at `.github/workflows/deploy-frontend.yml`
- [ ] Committed and pushed workflow file
- [ ] Triggered workflow (push to main or manual dispatch)
- [ ] Workflow completed successfully (check Actions tab)

### Cloudflare Pages Verification
- [ ] Logged into Cloudflare dashboard
- [ ] Verified Pages project "invoiceme" exists
- [ ] Deployment completed successfully
- [ ] Frontend URL copied: https://invoiceme.pages.dev

### Alternative: Manual Deploy
If GitHub Actions didn't work:
- [ ] Built locally: `cd frontend && flutter build web --release --dart-define=API_URL=https://your-backend.onrender.com`
- [ ] Went to Cloudflare Pages → Create project → Direct Upload
- [ ] Uploaded `frontend/build/web` folder
- [ ] Deployment succeeded

---

## Post-Deployment Configuration

### Update Backend CORS
- [ ] Went to Render dashboard → Your service → Environment
- [ ] Updated `CORS_ORIGINS` to: `https://invoiceme.pages.dev`
- [ ] Saved changes (service redeployed automatically)
- [ ] Wait for redeploy to complete (~2-3 minutes)

### Custom Domain (Optional)
If you have a custom domain:
- [ ] Added custom domain in Cloudflare Pages settings
- [ ] Updated DNS records
- [ ] Updated backend `CORS_ORIGINS` to include custom domain
- [ ] SSL certificate provisioned automatically

---

## Testing & Verification

### Backend Tests
- [ ] Health endpoint works: `https://your-backend.onrender.com/health`
- [ ] Config endpoint works: `https://your-backend.onrender.com/api/config`
- [ ] No CORS errors in browser console when accessing from frontend

### Frontend Tests
- [ ] Frontend loads: `https://invoiceme.pages.dev`
- [ ] Can see Welcome/Login screen
- [ ] Sign up flow works
- [ ] Login flow works
- [ ] Home screen loads after login
- [ ] Can upload an invoice (PDF or image)
- [ ] Invoice processes successfully (wait for ~10-30 seconds)
- [ ] Vendor appears on home screen
- [ ] Can view vendor analytics
- [ ] Can change settings (currency, etc.)
- [ ] Logout works

### Performance Tests
- [ ] First backend request after cold start: 30-60 seconds (expected on free tier)
- [ ] Subsequent requests: <3 seconds
- [ ] Frontend loads: <2 seconds
- [ ] Invoice upload processing: 10-30 seconds (depends on file size)

---

## Monitoring

### Render Dashboard
- [ ] Service status shows "Live"
- [ ] No error logs in "Logs" tab
- [ ] Check "Events" tab for deployment history

### Cloudflare Pages Dashboard
- [ ] Deployment status shows "Success"
- [ ] Check "Deployments" for build history
- [ ] Analytics tab shows traffic (if any)

### GitHub Actions
- [ ] Workflow runs show green checkmarks
- [ ] No failed builds

---

## Troubleshooting

### Backend Build Fails
- [ ] Check Render logs for specific error
- [ ] Verify Dockerfile syntax
- [ ] Ensure all environment variables are set
- [ ] Check if Prisma migrations need to run

### Backend Runtime Errors
- [ ] Check Render logs for stack traces
- [ ] Verify database connection (DATABASE_URL)
- [ ] Verify Groq API key is valid
- [ ] Check CORS configuration

### Frontend Build Fails
- [ ] Check GitHub Actions logs
- [ ] Verify Flutter version in workflow matches your project
- [ ] Ensure `API_URL` secret is set correctly
- [ ] Check for any Dart/Flutter compilation errors

### Frontend Runtime Errors
- [ ] Open browser DevTools → Console tab
- [ ] Check for CORS errors → Update backend CORS_ORIGINS
- [ ] Check for API connection errors → Verify API_URL
- [ ] Check Network tab for failed requests

### CORS Errors
```
Access to fetch at 'https://backend.onrender.com/...' from origin 'https://invoiceme.pages.dev' has been blocked by CORS policy
```
**Fix:** Update backend `CORS_ORIGINS` to include frontend URL

### Cold Start Delays
On Render free tier, backend sleeps after 15 minutes of inactivity.
- **Expected:** First request takes 30-60 seconds to wake up
- **Solution:** Upgrade to Starter plan ($7/mo) to remove cold starts
- **Workaround:** Use a service like UptimeRobot to ping your backend every 10 minutes

---

## Success Criteria

Your deployment is successful when:
- ✅ Backend health endpoint returns 200 OK
- ✅ Frontend loads without errors
- ✅ User can sign up and log in
- ✅ User can upload and process an invoice
- ✅ Invoice data appears correctly
- ✅ Vendor analytics shows data
- ✅ No console errors in browser
- ✅ No error logs in Render dashboard

---

## Cost Summary

| Service | Plan | Monthly Cost |
|---------|------|--------------|
| Render (Backend) | Free | $0 |
| Groq API | Free tier | $0 |
| Supabase | Free tier | $0 |
| Cloudflare Pages | Free | $0 |
| **Total** | | **$0** |

**Limitations on free tier:**
- Render: Backend sleeps after 15 min inactivity
- Groq: 14,400 requests/day, 30 requests/min
- Supabase: 500 MB DB, 1 GB storage, 2 GB bandwidth
- Cloudflare: Unlimited bandwidth (!)

**Upgrade when needed:**
- Render Starter ($7/mo): No cold starts
- More Groq requests: Still free, very generous limits
- Supabase Pro ($25/mo): More storage, better support

---

## Next Steps After Deployment

1. **Share your app:** Send `https://invoiceme.pages.dev` to testers
2. **Monitor usage:** Check Render/Cloudflare analytics
3. **Gather feedback:** Note what works/doesn't work
4. **Iterate:** Make improvements based on feedback
5. **Consider upgrades:** If traffic increases, upgrade Render to remove cold starts

---

## Support Resources

- **Render:** https://render.com/docs
- **Cloudflare Pages:** https://developers.cloudflare.com/pages
- **Groq API:** https://console.groq.com/docs
- **Supabase:** https://supabase.com/docs
- **GitHub Actions:** https://docs.github.com/en/actions

---

## Rollback Plan

If deployment fails or has issues:

### Rollback Backend
1. Go to Render dashboard → Your service → Events
2. Find previous successful deployment
3. Click "Redeploy"

### Rollback Frontend
1. Go to Cloudflare Pages → Deployments
2. Find previous successful deployment
3. Click "..." → "Rollback to this deployment"

### Revert Code Changes
```bash
git log  # Find commit hash before deployment changes
git revert <commit-hash>
git push
```

---

**Last Updated:** 2026-01-20
**For Questions:** Refer to DEPLOYMENT_GUIDE.md for detailed instructions
