# Railway Environment Variables

## Server URL
**Production URL**: https://amora-server-production.up.railway.app

## Environment Variables to Set in Railway Dashboard

Go to Railway Dashboard → Your Project → Variables and add these:

```
STRIPE_SECRET_KEY=sk_live_YOUR_STRIPE_SECRET_KEY

STRIPE_PRICE_ID_MONTHLY=price_1SZaBALoTzU5JHxjIT4WSaKk

STRIPE_PRICE_ID_YEARLY=price_1SZaBALoTzU5JHxjR6Q6huQr

STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET

NEON_DATABASE_URL=postgresql://user:password@host/database?sslmode=require

NODE_ENV=production
```

## Update Stripe Webhook

1. Go to https://dashboard.stripe.com/webhooks
2. Update your webhook endpoint URL to:
   ```
   https://amora-server-production.up.railway.app/api/webhooks/stripe
   ```

## Update Client (Vercel)

In your Vercel client project (amora-mu.vercel.app):

1. Go to Settings → Environment Variables
2. Update `VITE_BACKEND_URL`:
   ```
   VITE_BACKEND_URL=https://amora-server-production.up.railway.app
   ```
3. Redeploy

## Test Deployment

```bash
# Test health endpoint
curl https://amora-server-production.up.railway.app/health

# Should return: {"status":"ok","timestamp":"..."}
```

