# Railway Deployment Guide

## Prerequisites

1. **Install Railway CLI** (if not already installed):
   ```bash
   npm install -g @railway/cli
   ```

2. **Login to Railway**:
   ```bash
   railway login
   ```

## Deploy Server to Railway

### Step 1: Initialize Railway Project

```bash
cd server
railway init
```

When prompted:
- **Project Name**: `amora-server` (or any name)
- **Environment**: Production (or create new)
- **Service**: Create new service

### Step 2: Link to Existing Project (Optional)

If you already have a Railway project:
```bash
railway link
```
Select your project from the list.

### Step 3: Set Environment Variables

Set all required environment variables:

```bash
# Stripe Configuration
railway variables set STRIPE_SECRET_KEY=sk_live_YOUR_STRIPE_SECRET_KEY

railway variables set STRIPE_PRICE_ID_MONTHLY=price_1SZaBALoTzU5JHxjIT4WSaKk

railway variables set STRIPE_PRICE_ID_YEARLY=price_1SZaBALoTzU5JHxjR6Q6huQr

railway variables set STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET

# Database
railway variables set NEON_DATABASE_URL=postgresql://user:password@host/database?sslmode=require

# Server Configuration
railway variables set NODE_ENV=production
railway variables set PORT=3001
```

Or set them all at once:
```bash
railway variables set \
  STRIPE_SECRET_KEY=sk_live_YOUR_STRIPE_SECRET_KEY \
  STRIPE_PRICE_ID_MONTHLY=price_1SZaBALoTzU5JHxjIT4WSaKk \
  STRIPE_PRICE_ID_YEARLY=price_1SZaBALoTzU5JHxjR6Q6huQr \
  STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET \
  NEON_DATABASE_URL=postgresql://user:password@host/database?sslmode=require \
  NODE_ENV=production \
  PORT=3001
```

### Step 4: Deploy

```bash
railway up
```

This will:
1. Build your server
2. Deploy it to Railway
3. Give you a public URL (e.g., `https://amora-server-production.up.railway.app`)

### Step 5: Get Your Server URL

After deployment, get your public URL:

```bash
railway domain
```

Or check Railway Dashboard → Your Project → Settings → Networking → Public Domain

### Step 6: Update Stripe Webhook

1. Go to [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks)
2. Find your webhook endpoint (or create new)
3. Update the endpoint URL to:
   ```
   https://your-railway-domain.up.railway.app/api/webhooks/stripe
   ```
4. Save changes

### Step 7: Update Client Environment Variables

In your **Vercel client project** (amora-mu.vercel.app):

1. Go to Settings → Environment Variables
2. Update `VITE_BACKEND_URL`:
   ```
   VITE_BACKEND_URL=https://your-railway-domain.up.railway.app
   ```
3. Redeploy client

## Verify Deployment

### Test Server Health
```bash
curl https://your-railway-domain.up.railway.app/health
```
Should return: `{"status":"ok","timestamp":"..."}`

### Test Webhook Endpoint
```bash
curl -X POST https://your-railway-domain.up.railway.app/api/webhooks/stripe \
  -H "stripe-signature: test" \
  -d '{"type":"test"}'
```
Should return signature verification error (expected - means endpoint is working).

## Railway CLI Commands

```bash
# View logs
railway logs

# Open Railway Dashboard
railway open

# View environment variables
railway variables

# Redeploy
railway up

# Check status
railway status
```

## Troubleshooting

### Build Fails
- Check `railway logs` for errors
- Ensure all dependencies are in `package.json`
- Verify TypeScript compiles: `npm run build`

### Server Not Starting
- Check `railway logs` for runtime errors
- Verify `PORT` environment variable is set
- Check database connection

### Webhook Not Working
- Verify `STRIPE_WEBHOOK_SECRET` is set correctly
- Check webhook URL in Stripe Dashboard matches Railway domain
- Check `railway logs` for webhook processing errors

## Quick Deploy Script

Save this as `deploy-railway.sh`:

```bash
#!/bin/bash
cd server
railway variables set STRIPE_SECRET_KEY=sk_live_YOUR_STRIPE_SECRET_KEY
railway variables set STRIPE_PRICE_ID_MONTHLY=price_1SZaBALoTzU5JHxjIT4WSaKk
railway variables set STRIPE_PRICE_ID_YEARLY=price_1SZaBALoTzU5JHxjR6Q6huQr
railway variables set STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET
railway variables set NEON_DATABASE_URL=postgresql://user:password@host/database?sslmode=require
railway variables set NODE_ENV=production
railway up
```

