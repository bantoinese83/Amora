#!/usr/bin/env node

/**
 * Script to create recurring subscription prices in Stripe
 * Usage: node scripts/create-recurring-prices.js
 * Requires: STRIPE_SECRET_KEY environment variable
 */

import Stripe from 'stripe';
import { config } from 'dotenv';

// Load environment variables
config({ path: '../server/.env' });
config({ path: '.env.local' });
config();

const PRODUCT_ID = 'prod_TWcmey3pVuDZE2';

async function createRecurringPrices() {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    console.error('❌ Error: STRIPE_SECRET_KEY environment variable is required.');
    console.error('Set it in server/.env or as an environment variable.');
    process.exit(1);
  }

  const stripe = new Stripe(secretKey, {
    apiVersion: '2024-12-18.acacia',
  });

  console.log('🔧 Creating recurring subscription prices for Amora Premium...\n');

  try {
    // Create monthly recurring price ($9.99/month)
    console.log('📅 Creating monthly recurring price ($9.99/month)...');
    const monthlyPrice = await stripe.prices.create({
      product: PRODUCT_ID,
      unit_amount: 999,
      currency: 'usd',
      recurring: {
        interval: 'month',
      },
      metadata: {
        type: 'subscription',
        billing_period: 'monthly',
      },
    });

    console.log(`✅ Monthly price created: ${monthlyPrice.id}\n`);

    // Create yearly recurring price ($99.99/year)
    console.log('📅 Creating yearly recurring price ($99.99/year)...');
    const yearlyPrice = await stripe.prices.create({
      product: PRODUCT_ID,
      unit_amount: 9999,
      currency: 'usd',
      recurring: {
        interval: 'year',
      },
      metadata: {
        type: 'subscription',
        billing_period: 'yearly',
      },
    });

    console.log(`✅ Yearly price created: ${yearlyPrice.id}\n`);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Recurring prices created successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📝 Add these to your .env files:\n');
    console.log('Root .env.local or client/.env:');
    console.log(`VITE_STRIPE_PRICE_ID_MONTHLY=${monthlyPrice.id}`);
    console.log(`VITE_STRIPE_PRICE_ID_YEARLY=${yearlyPrice.id}\n`);
    console.log('Server server/.env:');
    console.log(`STRIPE_PRICE_ID_MONTHLY=${monthlyPrice.id}`);
    console.log(`STRIPE_PRICE_ID_YEARLY=${yearlyPrice.id}\n`);
  } catch (error) {
    console.error('❌ Error creating prices:', error.message);
    if (error.type === 'StripeAuthenticationError') {
      console.error('\n💡 Make sure your STRIPE_SECRET_KEY is correct and has write permissions.');
    }
    process.exit(1);
  }
}

createRecurringPrices();
