/**
 * Portal Routes
 * Creates Stripe Customer Portal sessions for subscription management
 */

import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { StripePortalSessionParams } from '../types/index.js';
import { logger } from '../utils/logger';

const router = Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-02-24.acacia',
});

router.post('/create-portal-session', async (req: Request, res: Response) => {
  try {
    const { returnUrl, customerId, customerEmail, userId } = req.body as StripePortalSessionParams & {
      userId?: string;
    };

    if (!returnUrl) {
      return res.status(400).json({ error: 'Missing required field: returnUrl' });
    }

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

    logger.info('Portal session created successfully', { customerId: customer.id, userId });
    res.json({ url: session.url });
  } catch (error) {
    logger.error('Error creating portal session', { userId, customerEmail }, error instanceof Error ? error : undefined);
    res.status(500).json({ error: "We couldn't open subscription management. Please try again." });
  }
});

export { router as portalRoutes };
