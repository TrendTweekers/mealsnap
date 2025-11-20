#!/bin/bash

# Quick Deploy Script - Build, Deploy & Push in one command
# Usage: ./scripts/quick-deploy.sh "Your commit message"

set -e

COMMIT_MSG=${1:-"Auto deploy"}

echo "🚀 Quick Deploy Script"
echo "======================"
echo ""

# Build
echo "📦 Building..."
npm run build

# Deploy to Vercel
echo "🚀 Deploying to Vercel..."
vercel --prod

# Push to GitHub
echo "📤 Pushing to GitHub..."
git add -A
git commit -m "$COMMIT_MSG"
git push

echo ""
echo "✅ All done! Deployed and pushed."

