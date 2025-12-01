# Stripe Webhook Setup for Production

## Current Status

❌ **Production webhook is NOT set up yet**

Your app at https://amora-mu.vercel.app/ is deployed, but the server needs to be deployed separately and webhooks need to be configured.

## Step-by-Step Setup

### Step 1: Deploy Server to Vercel

1. **Go to Vercel Dashboard**: https://vercel.com/dashboard
2. **Click "Add New Project"**
3. **Import your GitHub repository** (same repo as client)
4. **Configure Project**:
   - **Project Name**: `amora-server` (or any name)
   - **Root Directory**: `server` ⚠️ **IMPORTANT**
   - **Framework Preset**: Other
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

5. **Add Environment Variables** (click "Environment Variables"):
   ```
   STRIPE_SECRET_KEY=sk_live_YOUR_STRIPE_SECRET_KEY
   STRIPE_PRICE_ID_MONTHLY=price_1SZaBALoTzU5JHxjIT4WSaKk
   STRIPE_PRICE_ID_YEARLY=price_1SZaBALoTzU5JHxjR6Q6huQr
   NEON_DATABASE_URL=postgresql://neondb_owner:npg_jAfVvJ9Rk7iK@ep-still-breeze-admv7r41-pooler.c-2.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require
   NODE_ENV=production
   ```

6. **Deploy** and note your server URL (e.g., `https://amora-server-xyz.vercel.app`)

### Step 2: Configure Production Webhook in Stripe

1. **Go to Stripe Dashboard**: https://dashboard.stripe.com/webhooks
2. **Click "+ Add endpoint"**
3. **Fill in the form**:
   - **Endpoint URL**: `https://your-server-domain.vercel.app/api/webhooks/stripe`
     - Replace `your-server-domain.vercel.app` with your actual server URL from Step 1
   - **Description**: "Amora Production Webhooks"
   - **Version**: Latest API version (2024-12-18.acacia or later)

4. **Select Events to Listen**:
   - ✅ `checkout.session.completed`
   - ✅ `customer.subscription.created`
   - ✅ `customer.subscription.updated`
   - ✅ `customer.subscription.deleted`
   - ✅ `invoice.paid`
   - ✅ `invoice.payment_failed`

5. **Click "Add endpoint"**

6. **Copy the Signing Secret**:
   - After creating the endpoint, you'll see a "Signing secret"
   - It starts with `whsec_`
   - **Copy this immediately** - you can only see it once!

7. **Add to Vercel Server Environment Variables**:
   - Go back to Vercel Dashboard → Your server project → Settings → Environment Variables
   - Add: `STRIPE_WEBHOOK_SECRET` = `whsec_...` (the secret you just copied)
   - Redeploy the server

### Step 3: Update Client Environment Variables

In your **client Vercel project** (amora-mu.vercel.app):

1. Go to **Settings → Environment Variables**
2. Update `VITE_BACKEND_URL` to your server URL:
   ```
   VITE_BACKEND_URL=https://your-server-domain.vercel.app
   ```
3. Verify all other variables are set:
   ```
   VITE_STRIPE_PUBLISHABLE_KEY=pk_live_51SZZStLoTzU5JHxjcHJ4JkSh6WFPOUNwB3jB2Fe6PUQ8ZfQUCO9sftf2WfJJnO7cxIO0YaTpIkr36PvLH0zfLV1g008K6ZzRZr
   VITE_STRIPE_PRICE_ID_MONTHLY=price_1SZaBALoTzU5JHxjIT4WSaKk
   VITE_STRIPE_PRICE_ID_YEARLY=price_1SZaBALoTzU5JHxjR6Q6huQr
   VITE_NEON_DATABASE_URL=postgresql://user:password@host/database?sslmode=require
   GEMINI_API_KEY=AIzaSyAWVMBslVNaGf5Ij-D2AqxGuP_w5PK08zs
   ```
4. **Redeploy** the client

### Step 4: Test Production Webhook

1. **Make a test purchase**:
   - Go to https://amora-mu.vercel.app/
   - Sign up/login
   - Click "Upgrade to Premium"
   - Use test card: `4242 4242 4242 4242`
   - Any future expiry date, any CVC

2. **Check Stripe Dashboard**:
   - Go to Webhooks → Your endpoint
   - Click "Recent events"
   - You should see `checkout.session.completed` event
   - Click on it to see details

3. **Verify Premium Status**:
   - Check your database to confirm the user's `is_premium` field is `true`
   - Or check the app - user should see premium features

## Verification Checklist

- [ ] Server deployed to Vercel
- [ ] Server URL noted (e.g., `https://amora-server-xyz.vercel.app`)
- [ ] Webhook endpoint created in Stripe Dashboard
- [ ] Webhook URL points to: `https://your-server-domain.vercel.app/api/webhooks/stripe`
- [ ] All 6 events selected in Stripe webhook
- [ ] `STRIPE_WEBHOOK_SECRET` added to server Vercel environment variables
- [ ] `VITE_BACKEND_URL` updated in client Vercel environment variables
- [ ] Test purchase completed successfully
- [ ] Webhook events received in Stripe Dashboard
- [ ] Premium status updated in database

## Troubleshooting

### Webhook Not Receiving Events

**Check 1: Endpoint URL**
- Must be HTTPS (not HTTP)
- Must end with `/api/webhooks/stripe`
- Check Vercel deployment logs for errors

**Check 2: Webhook Secret**
- Must match the secret from Stripe Dashboard
- Check Vercel environment variables are set correctly
- Redeploy server after adding secret

**Check 3: Server Deployment**
- Verify server is deployed and accessible
- Test: `curl https://your-server-domain.vercel.app/health`
- Should return: `{"status":"ok","timestamp":"..."}`

### Premium Status Not Updating

**Check 1: User Email Match**
- Stripe customer email must match user email in database
- Check webhook logs in Stripe Dashboard for errors

**Check 2: Database Connection**
- Verify `NEON_DATABASE_URL` is correct in server environment
- Check Vercel function logs for database errors

**Check 3: Webhook Processing**
- Check Vercel function logs for webhook processing errors
- Look for "User not found" or database errors

## Quick Test Commands

```bash
# Test server health
curl https://your-server-domain.vercel.app/health

# Test checkout endpoint (should return checkout session URL)
curl -X POST https://your-server-domain.vercel.app/api/create-checkout-session \
  -H "Content-Type: application/json" \
  -d '{"priceId":"price_1SZaBALoTzU5JHxjIT4WSaKk","successUrl":"https://amora-mu.vercel.app/?success","cancelUrl":"https://amora-mu.vercel.app/?cancel"}'
```

## Current Production Status

- ✅ Client deployed: https://amora-mu.vercel.app/
- ❌ Server not deployed yet
- ❌ Production webhook not configured yet
- ✅ Recurring prices created
- ✅ Environment variables ready

**Next Action**: Deploy server to Vercel and configure webhook endpoint.

