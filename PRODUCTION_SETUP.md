# Production Setup Guide

## 🚀 Current Production URL

- **Client**: https://amora-mu.vercel.app/
- **Server**: Needs to be deployed separately (see below)

## 📋 Production Checklist

### ✅ Completed
- [x] Recurring subscription prices created
- [x] Environment variables configured locally
- [x] Server code structured for deployment

### ⚠️ Needs Setup

#### 1. Deploy Server to Vercel

The server needs to be deployed separately from the client to handle Stripe webhooks.

**Option A: Deploy Server as Separate Vercel Project (Recommended)**

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New Project"
3. Import your repository
4. Configure:
   - **Root Directory**: `server`
   - **Framework Preset**: Other
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

5. Add Environment Variables:
   ```
   STRIPE_SECRET_KEY=sk_live_YOUR_STRIPE_SECRET_KEY
   STRIPE_PRICE_ID_MONTHLY=price_1SZaBALoTzU5JHxjIT4WSaKk
   STRIPE_PRICE_ID_YEARLY=price_1SZaBALoTzU5JHxjR6Q6huQr
   NEON_DATABASE_URL=postgresql://user:password@host/database?sslmode=require
   STRIPE_WEBHOOK_SECRET=whsec_... (from Stripe Dashboard)
   PORT=3001
   NODE_ENV=production
   ```

6. Deploy and note the server URL (e.g., `https://amora-server.vercel.app`)

**Option B: Use Vercel Serverless Functions**

Create `api/` directory in root and move server routes there (more complex, not recommended for this setup).

#### 2. Set Up Production Webhook in Stripe

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/webhooks)
2. Click **"+ Add endpoint"**
3. Configure:
   - **Endpoint URL**: `https://your-server-domain.vercel.app/api/webhooks/stripe`
   - **Description**: "Amora Production Webhooks"
   - **Events to send**:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.paid`
     - `invoice.payment_failed`

4. Click **"Add endpoint"**
5. **Copy the Signing secret** (starts with `whsec_`)
6. Add it to your Vercel server environment variables as `STRIPE_WEBHOOK_SECRET`

#### 3. Update Client Environment Variables

In your **client Vercel project** (amora-mu.vercel.app), update environment variables:

```
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_51SZZStLoTzU5JHxjcHJ4JkSh6WFPOUNwB3jB2Fe6PUQ8ZfQUCO9sftf2WfJJnO7cxIO0YaTpIkr36PvLH0zfLV1g008K6ZzRZr
VITE_STRIPE_PRICE_ID_MONTHLY=price_1SZaBALoTzU5JHxjIT4WSaKk
VITE_STRIPE_PRICE_ID_YEARLY=price_1SZaBALoTzU5JHxjR6Q6huQr
VITE_BACKEND_URL=https://your-server-domain.vercel.app
   VITE_NEON_DATABASE_URL=postgresql://user:password@host/database?sslmode=require
GEMINI_API_KEY=AIzaSyAWVMBslVNaGf5Ij-D2AqxGuP_w5PK08zs
```

**Important**: Replace `your-server-domain.vercel.app` with your actual server deployment URL.

#### 4. Test Production Webhook

1. Make a test purchase on https://amora-mu.vercel.app/
2. Check Stripe Dashboard → Webhooks → Your endpoint → Recent events
3. Verify events are being received and processed
4. Check your database to confirm premium status is updated

## 🔍 Verify Production Setup

### Check Server Deployment
```bash
curl https://your-server-domain.vercel.app/health
```
Should return: `{"status":"ok","timestamp":"..."}`

### Check Webhook Endpoint
```bash
curl -X POST https://your-server-domain.vercel.app/api/webhooks/stripe \
  -H "stripe-signature: test" \
  -d '{"type":"test"}'
```
Should return an error about signature verification (this is expected - means endpoint is working).

### Test Checkout Flow
1. Go to https://amora-mu.vercel.app/
2. Sign up/login
3. Click "Upgrade to Premium"
4. Complete checkout with test card: `4242 4242 4242 4242`
5. Verify premium status is activated in database

## 🐛 Troubleshooting

### Webhook Not Receiving Events

1. **Check Stripe Dashboard**:
   - Go to Webhooks → Your endpoint
   - Check "Recent events" tab
   - Look for failed deliveries

2. **Verify Endpoint URL**:
   - Must be HTTPS (not HTTP)
   - Must match exactly: `/api/webhooks/stripe`
   - Check Vercel deployment logs

3. **Check Webhook Secret**:
   - Must match the secret from Stripe Dashboard
   - Check Vercel environment variables

### Premium Status Not Updating

1. **Check Server Logs**:
   - Vercel Dashboard → Your project → Functions → View logs
   - Look for webhook processing errors

2. **Verify Database Connection**:
   - Check `NEON_DATABASE_URL` is correct
   - Test database connection from server

3. **Check User Email Match**:
   - Stripe customer email must match user email in database
   - Check webhook logs for "User not found" errors

## 📝 Quick Reference

### Production URLs
- **Client**: https://amora-mu.vercel.app/
- **Server**: `https://your-server-domain.vercel.app` (deploy separately)

### Stripe Configuration
- **Account**: lamora (acct_1SZZStLoTzU5JHxj)
- **Mode**: Live
- **Product**: prod_TWcmey3pVuDZE2 (Amora Premium)
- **Monthly Price**: price_1SZaBALoTzU5JHxjIT4WSaKk ($9.99/month)
- **Yearly Price**: price_1SZaBALoTzU5JHxjR6Q6huQr ($99.99/year)

### Environment Variables Summary

**Client (Vercel)**:
- `VITE_STRIPE_PUBLISHABLE_KEY`
- `VITE_STRIPE_PRICE_ID_MONTHLY`
- `VITE_STRIPE_PRICE_ID_YEARLY`
- `VITE_BACKEND_URL` (your server URL)
- `VITE_NEON_DATABASE_URL`
- `GEMINI_API_KEY`

**Server (Vercel)**:
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET` (from Stripe Dashboard)
- `STRIPE_PRICE_ID_MONTHLY`
- `STRIPE_PRICE_ID_YEARLY`
- `NEON_DATABASE_URL`
- `PORT` (optional, Vercel sets this)
- `NODE_ENV=production`

