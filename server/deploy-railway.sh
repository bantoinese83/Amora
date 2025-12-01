#!/bin/bash

# Railway Deployment Script
# This script sets environment variables and deploys the server

cd "$(dirname "$0")"

echo "🚀 Deploying Amora Server to Railway..."
echo ""

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI is not installed."
    echo "Install it with: npm install -g @railway/cli"
    exit 1
fi

# Check if logged in
if ! railway whoami &> /dev/null; then
    echo "⚠️  Not logged in to Railway. Please run: railway login"
    exit 1
fi

echo "📋 Setting environment variables..."

# Set variables one by one (Railway CLI requires service to be linked)
# Set environment variables via Railway CLI
# Note: Set these manually or use Railway Dashboard
# railway variables --set "STRIPE_SECRET_KEY=your_secret_key"
# railway variables --set "STRIPE_PRICE_ID_MONTHLY=your_monthly_price_id"
# railway variables --set "STRIPE_PRICE_ID_YEARLY=your_yearly_price_id"
# railway variables --set "STRIPE_WEBHOOK_SECRET=your_webhook_secret"
# railway variables --set "NEON_DATABASE_URL=your_database_url"

railway variables --set "NODE_ENV=production" 2>&1 | grep -v "No service linked" || true

echo ""
echo "🚀 Deploying..."
railway up

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Deployment complete!"
echo ""
echo "📋 Next Steps:"
echo "1. Get your server URL: railway domain"
echo "2. Set environment variables in Railway Dashboard if not set via CLI"
echo "3. Update Stripe webhook URL to: https://your-domain.up.railway.app/api/webhooks/stripe"
echo "4. Update VITE_BACKEND_URL in Vercel client project"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

