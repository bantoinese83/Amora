#!/bin/bash

# Script to create recurring subscription prices in Stripe
# Requires: Stripe CLI (stripe) and jq
# Run: ./scripts/create-recurring-prices.sh

set -e

PRODUCT_ID="prod_TWcmey3pVuDZE2"

echo "🔧 Creating recurring subscription prices for Amora Premium..."
echo ""

# Check if Stripe CLI is installed
if ! command -v stripe &> /dev/null; then
    echo "❌ Error: Stripe CLI is not installed."
    echo "Install it from: https://stripe.com/docs/stripe-cli"
    exit 1
fi

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo "❌ Error: jq is not installed."
    echo "Install it with: brew install jq (macOS) or apt-get install jq (Linux)"
    exit 1
fi

# Create monthly recurring price ($9.99/month)
echo "📅 Creating monthly recurring price ($9.99/month)..."
MONTHLY_PRICE=$(stripe prices create \
  --product="$PRODUCT_ID" \
  --unit-amount=999 \
  --currency=usd \
  --recurring[interval]=month \
  --metadata[type]=subscription \
  --metadata[billing_period]=monthly \
  --format=json 2>/dev/null | jq -r '.id')

if [ "$MONTHLY_PRICE" = "null" ] || [ -z "$MONTHLY_PRICE" ]; then
    echo "❌ Failed to create monthly price"
    exit 1
fi

echo "✅ Monthly price created: $MONTHLY_PRICE"
echo ""

# Create yearly recurring price ($99.99/year)
echo "📅 Creating yearly recurring price ($99.99/year)..."
YEARLY_PRICE=$(stripe prices create \
  --product="$PRODUCT_ID" \
  --unit-amount=9999 \
  --currency=usd \
  --recurring[interval]=year \
  --metadata[type]=subscription \
  --metadata[billing_period]=yearly \
  --format=json 2>/dev/null | jq -r '.id')

if [ "$YEARLY_PRICE" = "null" ] || [ -z "$YEARLY_PRICE" ]; then
    echo "❌ Failed to create yearly price"
    exit 1
fi

echo "✅ Yearly price created: $YEARLY_PRICE"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Recurring prices created successfully!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📝 Add these to your .env files:"
echo ""
echo "Client (.env or Vercel):"
echo "VITE_STRIPE_PRICE_ID_MONTHLY=$MONTHLY_PRICE"
echo "VITE_STRIPE_PRICE_ID_YEARLY=$YEARLY_PRICE"
echo ""
echo "Server (server/.env or Vercel):"
echo "STRIPE_PRICE_ID_MONTHLY=$MONTHLY_PRICE"
echo "STRIPE_PRICE_ID_YEARLY=$YEARLY_PRICE"
echo ""
