-- Migration: Add Stripe customer and subscription ID columns to users table
-- Run this migration to add Stripe integration fields

-- Add stripe_customer_id column (nullable, can be NULL for users without Stripe account)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255) NULL;

-- Add stripe_subscription_id column (nullable, can be NULL for users without active subscription)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255) NULL;

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer_id ON users(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_stripe_subscription_id ON users(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;

-- Add comment to columns
COMMENT ON COLUMN users.stripe_customer_id IS 'Stripe customer ID for payment processing';
COMMENT ON COLUMN users.stripe_subscription_id IS 'Stripe subscription ID for active subscriptions';

