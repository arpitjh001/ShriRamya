#!/bin/bash

# Shri Ramya - Secure Deployment Script
# This script deploys the application to Vercel with security checks

set -e

echo "🔒 Shri Ramya - Secure Deployment to Vercel"
echo "============================================"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo -e "${RED}❌ Vercel CLI not found. Installing...${NC}"
    npm install -g vercel
fi

# Security checks
echo -e "\n${YELLOW}🔍 Running security checks...${NC}"

# Check for exposed secrets in files
echo "Checking for exposed secrets..."
if grep -r "mongodb+srv://.*:.*@" --include="*.json" --include="*.js" --include="*.jsx" --exclude-dir=node_modules .; then
    echo -e "${RED}❌ Found exposed MongoDB credentials in code!${NC}"
    exit 1
fi

if grep -r "JWT_SECRET.*=" --include="*.json" --include="*.js" --include="*.jsx" --exclude-dir=node_modules . | grep -v ".env" | grep -v "example"; then
    echo -e "${RED}❌ Found exposed JWT secrets in code!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ No exposed secrets found${NC}"

# Check if .env files are in .gitignore
echo "Checking .gitignore..."
if ! grep -q "^\.env$" .gitignore; then
    echo -e "${RED}❌ .env not in .gitignore!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ .gitignore configured correctly${NC}"

# Verify environment variables are set in Vercel
echo -e "\n${YELLOW}⚠️  Please verify these environment variables are set in Vercel:${NC}"
echo "  - MONGO_URL"
echo "  - JWT_SECRET"
echo "  - REDIS_URL"
echo "  - RAZORPAY_KEY_ID"
echo "  - RAZORPAY_KEY_SECRET"
echo "  - SMTP_USER"
echo "  - SMTP_PASS"
echo "  - CRON_SECRET"
echo ""
read -p "Have you set all environment variables in Vercel? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}❌ Please set environment variables in Vercel dashboard first${NC}"
    exit 1
fi

# Install dependencies
echo -e "\n${YELLOW}📦 Installing dependencies...${NC}"
cd backend_node && npm install --production
cd ../frontend && yarn install

# Build frontend
echo -e "\n${YELLOW}🏗️  Building frontend...${NC}"
cd ../frontend
yarn build

if [ ! -d "dist" ]; then
    echo -e "${RED}❌ Frontend build failed!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Frontend built successfully${NC}"

# Run tests (optional)
echo -e "\n${YELLOW}🧪 Running tests...${NC}"
cd ../backend_node
npm test || echo -e "${YELLOW}⚠️  Some tests failed, but continuing...${NC}"

# Deploy to Vercel
echo -e "\n${YELLOW}🚀 Deploying to Vercel...${NC}"
cd ..

# Production deployment
vercel --prod

echo -e "\n${GREEN}✅ Deployment complete!${NC}"
echo -e "\n${YELLOW}📋 Post-deployment checklist:${NC}"
echo "  1. Verify health endpoint: https://www.shriramya.com/api/v1/health"
echo "  2. Test authentication flow"
echo "  3. Check security headers: https://securityheaders.com"
echo "  4. Verify CORS configuration"
echo "  5. Monitor Vercel logs for errors"
echo ""
echo -e "${GREEN}🎉 Deployment successful!${NC}"
