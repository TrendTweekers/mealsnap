#!/bin/bash

# ChefAI Admin Automation Script
# Run this script to automate common admin tasks

set -e

echo "🚀 ChefAI Admin Automation"
echo "=========================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Must run from project root directory"
    exit 1
fi

# Function to run health check
run_health_check() {
    echo -e "${BLUE}📊 Running Health Check...${NC}"
    npm run health-check || echo "⚠️  Health check script not found, skipping..."
    echo ""
}

# Function to check build
check_build() {
    echo -e "${BLUE}🔨 Checking Build...${NC}"
    npm run build
    echo -e "${GREEN}✅ Build successful!${NC}"
    echo ""
}

# Function to run linting
run_lint() {
    echo -e "${BLUE}🔍 Running Linter...${NC}"
    npm run lint || echo "⚠️  Linting issues found (non-blocking)"
    echo ""
}

# Function to check types
check_types() {
    echo -e "${BLUE}📝 Checking TypeScript Types...${NC}"
    npm run type-check || echo "⚠️  Type errors found (non-blocking)"
    echo ""
}

# Function to deploy to Vercel
deploy_vercel() {
    echo -e "${BLUE}🚀 Deploying to Vercel...${NC}"
    read -p "Deploy to production? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        vercel --prod
        echo -e "${GREEN}✅ Deployed!${NC}"
    else
        echo "⏭️  Skipping deployment"
    fi
    echo ""
}

# Function to push to GitHub
push_github() {
    echo -e "${BLUE}📤 Pushing to GitHub...${NC}"
    read -p "Push to GitHub? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git add -A
        read -p "Commit message: " commit_msg
        git commit -m "${commit_msg:-Auto commit}"
        git push
        echo -e "${GREEN}✅ Pushed to GitHub!${NC}"
    else
        echo "⏭️  Skipping GitHub push"
    fi
    echo ""
}

# Main menu
show_menu() {
    echo "What would you like to automate?"
    echo ""
    echo "1) Full Pre-Deployment Check (build + lint + types)"
    echo "2) Build & Deploy to Vercel"
    echo "3) Build, Deploy & Push to GitHub"
    echo "4) Health Check Only"
    echo "5) Lint & Fix"
    echo "6) Exit"
    echo ""
    read -p "Select option (1-6): " choice
    echo ""
    
    case $choice in
        1)
            check_build
            run_lint
            check_types
            echo -e "${GREEN}✅ Pre-deployment check complete!${NC}"
            ;;
        2)
            check_build
            deploy_vercel
            ;;
        3)
            check_build
            deploy_vercel
            push_github
            ;;
        4)
            run_health_check
            ;;
        5)
            run_lint
            npm run lint:fix
            echo -e "${GREEN}✅ Linting complete!${NC}"
            ;;
        6)
            echo "👋 Goodbye!"
            exit 0
            ;;
        *)
            echo "❌ Invalid option"
            show_menu
            ;;
    esac
}

# Run menu
show_menu

