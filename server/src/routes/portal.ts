/**
 * Portal Routes
 * Creates Stripe Customer Portal sessions for subscription management
 */

import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { StripePortalSessionParams } from '../types/index.js';
import { logger } from '../utils/logger';

const router = Router();

// Lazy initialization of Stripe to avoid errors if key is missing
function getStripe(): Stripe {
  const apiKey = process.env.STRIPE_SECRET_KEY;
  if (!apiKey) {
    throw new Error('Stripe API key is not configured. Please set STRIPE_SECRET_KEY in your environment variables.');
  }
  return new Stripe(apiKey, {
    apiVersion: '2025-02-24.acacia',
  });
}

router.post('/create-portal-session', async (req: Request, res: Response) => {
  try {
    const { returnUrl, customerId, customerEmail, userId } = req.body as StripePortalSessionParams & {
      userId?: string;
    };

    if (!returnUrl) {
      return res.status(400).json({ error: 'Missing required field: returnUrl' });
    }

    // Initialize Stripe
    const stripe = getStripe();

    let customer: Stripe.Customer | null = null;
    let stripeCustomerId: string | null = null;

    // Try to get customer ID from user record first (preferred)
    if (userId) {
      try {
        const { userRepository } = await import(
          '../../../shared/dist/src/repositories/userRepository.js'
        );
        const user = await userRepository.getUserById(userId);
        if (user?.stripe_customer_id) {
          stripeCustomerId = user.stripe_customer_id;
        }
      } catch (error) {
        logger.warn('Failed to get user Stripe customer ID', { userId }, error instanceof Error ? error : undefined);
      }
    }

    // Find customer by ID or email
    if (stripeCustomerId) {
      customer = (await stripe.customers.retrieve(stripeCustomerId)) as Stripe.Customer;
    } else if (customerId) {
      customer = (await stripe.customers.retrieve(customerId)) as Stripe.Customer;
    } else if (customerEmail) {
      const customers = await stripe.customers.list({
        email: customerEmail,
        limit: 1,
      });
      customer = customers.data[0] || null;
    }

    if (!customer) {
      logger.error('Customer not found for portal session', { userId, customerId, customerEmail, stripeCustomerId });
      
      // If user is marked as premium but has no Stripe customer, they need to subscribe
      if (userId) {
        try {
          const { userRepository } = await import(
            '../../../shared/dist/src/repositories/userRepository.js'
          );
          const user = await userRepository.getUserById(userId);
          if (user?.is_premium && !user.stripe_customer_id) {
            return res.status(400).json({
              error: 'No active subscription found. Please subscribe to Amora Premium to manage your subscription.',
              needsSubscription: true,
            });
          }
        } catch (error) {
          logger.warn('Failed to check user premium status', { userId }, error instanceof Error ? error : undefined);
        }
      }
      
      return res.status(404).json({
        error: 'Customer not found. Please ensure you have an active subscription. If you recently subscribed, please wait a moment and try again.',
      });
    }

    // Verify customer has at least one subscription before creating portal session
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      logger.warn('Customer has no subscriptions', { customerId: customer.id });
      return res.status(400).json({
        error: 'No active subscription found. Please subscribe to Amora Premium first.',
      });
    }

    // Create portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: customer.id,
      return_url: returnUrl,
    });

    const { userId: reqUserId, customerEmail: reqCustomerEmail } = req.body as StripePortalSessionParams & { userId?: string };
    logger.info('Portal session created successfully', { customerId: customer.id, userId: reqUserId });
    res.json({ url: session.url });
  } catch (error) {
    const { userId: reqUserId, customerEmail: reqCustomerEmail } = req.body as StripePortalSessionParams & { userId?: string };
    logger.error('Error creating portal session', { userId: reqUserId, customerEmail: reqCustomerEmail }, error instanceof Error ? error : undefined);
    if (error instanceof Error && error.message.includes('Stripe API key')) {
      res.status(500).json({ error: "Subscription management is not configured. Please contact support." });
    } else {
      res.status(500).json({ error: "We couldn't open subscription management. Please try again." });
    }
  }
});

export { router as portalRoutes };
