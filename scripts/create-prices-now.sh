#!/bin/bash

# Quick script to create recurring prices
# Usage: STRIPE_SECRET_KEY=sk_live_... ./scripts/create-prices-now.sh

if [ -z "$STRIPE_SECRET_KEY" ]; then
    echo "❌ Error: STRIPE_SECRET_KEY environment variable is required."
    echo ""
    echo "Usage:"
    echo "  STRIPE_SECRET_KEY=sk_live_... ./scripts/create-prices-now.sh"
    echo ""
    echo "Or export it first:"
    echo "  export STRIPE_SECRET_KEY=sk_live_..."
    echo "  ./scripts/create-prices-now.sh"
    exit 1
fi

cd "$(dirname "$0")/.." || exit

node scripts/create-recurring-prices.js

