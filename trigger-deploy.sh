#!/bin/bash
# Quick script to trigger frontend deployment

echo "🚀 Triggering Frontend Deployment to Cloudflare Pages..."
echo ""
echo "This will:"
echo "  1. Create a small change to trigger the workflow"
echo "  2. Commit and push to GitHub"
echo "  3. GitHub Actions will build and deploy automatically"
echo ""

# Create trigger file
mkdir -p frontend/.deploy
echo "Deployed at: $(date)" > frontend/.deploy/LAST_DEPLOY.txt

# Commit and push
git add frontend/.deploy/LAST_DEPLOY.txt
git commit -m "Deploy: Trigger frontend deployment to Cloudflare Pages"
git push

echo ""
echo "✅ Pushed to GitHub!"
echo ""
echo "📊 Watch deployment progress:"
echo "   https://github.com/$(git config --get remote.origin.url | sed 's/.*github.com[:/]\(.*\)\.git/\1/')/actions"
echo ""
echo "⏱️  Deployment takes ~3-5 minutes"
echo ""
echo "After deployment:"
echo "  1. Get URL from Actions log or Cloudflare dashboard"
echo "  2. Update backend CORS_ORIGINS on Render"
echo "  3. Test at https://invoiceme.pages.dev"
