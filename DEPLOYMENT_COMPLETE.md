# ✅ Deployment Complete!

## 🌐 Server Deployment

**Railway Server URL**: https://amora-server-production.up.railway.app

**Status**: ✅ Deployed and configured

**Environment Variables**: ✅ All set
- ✅ STRIPE_SECRET_KEY
- ✅ STRIPE_PRICE_ID_MONTHLY
- ✅ STRIPE_PRICE_ID_YEARLY
- ✅ STRIPE_WEBHOOK_SECRET
- ✅ NEON_DATABASE_URL
- ✅ NODE_ENV

## 📋 Final Configuration Steps

### 1. Update Stripe Webhook (REQUIRED)

1. Go to [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks)
2. Find your webhook endpoint (or create new)
3. Update the endpoint URL to:
   ```
   https://amora-server-production.up.railway.app/api/webhooks/stripe
   ```
4. Ensure these events are selected:
   - ✅ `checkout.session.completed`
   - ✅ `customer.subscription.created`
   - ✅ `customer.subscription.updated`
   - ✅ `customer.subscription.deleted`
   - ✅ `invoice.paid`
   - ✅ `invoice.payment_failed`
5. Save changes

### 2. Update Vercel Client Environment Variables

In your **Vercel client project** (amora-mu.vercel.app):

1. Go to **Settings → Environment Variables**
2. Update `VITE_BACKEND_URL`:
   ```
   VITE_BACKEND_URL=https://amora-server-production.up.railway.app
   ```
3. **Redeploy** the client

### 3. Verify Deployment

```bash
# Test server health
curl https://amora-server-production.up.railway.app/health

# Should return: {"status":"ok","timestamp":"..."}
```

```bash
# Test checkout endpoint
curl -X POST https://amora-server-production.up.railway.app/api/create-checkout-session \
  -H "Content-Type: application/json" \
  -d '{
    "priceId": "price_1SZaBALoTzU5JHxjIT4WSaKk",
    "successUrl": "https://amora-mu.vercel.app/?success",
    "cancelUrl": "https://amora-mu.vercel.app/?cancel"
  }'
```

## 🎯 Production URLs

- **Client (Frontend)**: https://amora-mu.vercel.app/
- **Server (Backend)**: https://amora-server-production.up.railway.app
- **Webhook Endpoint**: https://amora-server-production.up.railway.app/api/webhooks/stripe

## ✅ Checklist

- [x] Server deployed to Railway
- [x] Environment variables configured
- [x] Recurring subscription prices created
- [ ] Stripe webhook URL updated
- [ ] Client VITE_BACKEND_URL updated
- [ ] Test purchase completed
- [ ] Premium status updates verified

## 🐛 Troubleshooting

### Server Returns 404

The server may still be deploying. Wait a few minutes and check:
- Railway Dashboard → Deployments → Check build logs
- Railway Dashboard → Service → Logs

### Webhook Not Working

1. Verify webhook URL in Stripe Dashboard matches Railway domain
2. Check `STRIPE_WEBHOOK_SECRET` is set correctly in Railway
3. Check Railway logs: `railway logs`
4. Verify events are being sent in Stripe Dashboard → Webhooks → Recent events

### Premium Status Not Updating

1. Check Railway logs for webhook processing errors
2. Verify user email matches Stripe customer email
3. Check database connection is working
4. Verify webhook events are being received in Stripe Dashboard

## 📊 Monitoring

- **Railway Dashboard**: https://railway.com/project/1fe55e4a-4fe2-4c12-9d92-47c9a6133e0f
- **Stripe Dashboard**: https://dashboard.stripe.com/webhooks
- **Vercel Dashboard**: https://vercel.com/dashboard

## 🚀 You're All Set!

Once you complete steps 1-2 above, your production environment will be fully configured with:
- ✅ Recurring subscription payments
- ✅ Automatic premium status updates via webhooks
- ✅ Customer portal for subscription management
- ✅ Full production deployment

