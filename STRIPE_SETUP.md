# Stripe Payment Integration Setup

## Stripe Account Information

- **Account**: lamora
- **Account ID**: `acct_1SZZStLoTzU5JHxj`
- **Mode**: Live

## Products and Prices Created

### Product
- **Product ID**: `prod_TWcmey3pVuDZE2`
- **Name**: Amora Premium
- **Description**: Unlimited voice sessions, AI-powered insights, and premium features for Amora

### Prices

#### Monthly Plan
- **Price ID**: `price_1SZZXTLoTzU5JHxjIUkoZZrq`
- **Amount**: $9.99 USD
- **Type**: One-time (needs to be converted to recurring subscription)
- **Payment Link**: `https://buy.stripe.com/9B614o6YTaw83HOePZffy00`

#### Yearly Plan
- **Price ID**: `price_1SZZXULoTzU5JHxjPqDZCb9r`
- **Amount**: $99.99 USD
- **Type**: One-time (needs to be converted to recurring subscription)
- **Payment Link**: `https://buy.stripe.com/bJeeVe1Ez5bOfqwbDNffy01`

## Environment Variables

Add these to your `.env` file:

```env
# Stripe Configuration
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_51SZZStLoTzU5JHxj... (get from Stripe Dashboard)
VITE_STRIPE_PRICE_ID_MONTHLY=price_1SZZXTLoTzU5JHxjIUkoZZrq
VITE_STRIPE_PRICE_ID_YEARLY=price_1SZZXULoTzU5JHxjPqDZCb9r
VITE_BACKEND_URL=http://localhost:3001  # Optional: for full subscription management
```

## Important Notes

### Current Implementation

1. **Payment Links**: The current implementation uses Stripe Payment Links for one-time payments. These work immediately but are not recurring subscriptions.

2. **Subscription Management**: For full subscription management (recurring billing, cancellation, etc.), you need:
   - A backend server to create Stripe Checkout Sessions with `mode: 'subscription'`
   - Stripe webhooks to handle subscription events (payment succeeded, cancelled, etc.)
   - Recurring prices (not one-time prices)

### Next Steps for Full Subscription Support

1. **Create Recurring Prices**:
   - In Stripe Dashboard, go to Products → Amora Premium
   - Create new recurring prices:
     - Monthly: $9.99/month (recurring)
     - Yearly: $99.99/year (recurring)

2. **Set Up Backend Server**:
   - Create checkout sessions with `mode: 'subscription'`
   - Handle Stripe webhooks to update user premium status
   - Implement subscription status checking

3. **Webhook Endpoints** (recommended):
   - `checkout.session.completed` - Activate premium when payment succeeds
   - `customer.subscription.updated` - Update premium status on plan changes
   - `customer.subscription.deleted` - Deactivate premium on cancellation

## Feature Gating

The application now includes feature gating:

- **Free Tier**:
  - 3 sessions maximum
  - 10 minutes per session
  - Basic features only

- **Premium Tier**:
  - Unlimited sessions
  - Up to 1 hour per session
  - All premium features

## Testing

Use Stripe's test mode for development:
- Test card: `4242 4242 4242 4242`
- Any future expiry date
- Any CVC

## Payment Flow

1. User signs up/logs in
2. User selects a plan (monthly or yearly)
3. Redirected to Stripe Payment Link
4. After payment, user is redirected back
5. Premium status is updated in database
6. User gains access to premium features

