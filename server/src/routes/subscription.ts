/**
 * Subscription Routes
 * Handles subscription status checking and syncing
 */

import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { userRepository } from '../../../shared/dist/src/repositories/userRepository.js';

const router = Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-02-24.acacia',
});

/**
 * Get subscription status for a user
 */
router.get('/status/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const user = await userRepository.getUserById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // If user has Stripe customer ID, verify subscription status with Stripe
    if (user.stripe_customer_id) {
      try {
        const customer = (await stripe.customers.retrieve(user.stripe_customer_id)) as Stripe.Customer;
        
        if (user.stripe_subscription_id) {
          const subscription = await stripe.subscriptions.retrieve(user.stripe_subscription_id);
          const isActive = subscription.status === 'active' || subscription.status === 'trialing';
          
          // Sync status if different
          if (isActive !== user.is_premium) {
            await userRepository.updateStripeInfo(
              userId,
              user.stripe_customer_id,
              user.stripe_subscription_id,
              isActive
            );
          }

          return res.json({
            isActive,
            subscriptionId: subscription.id,
            customerId: customer.id,
            status: subscription.status,
            currentPeriodEnd: subscription.current_period_end
              ? new Date(subscription.current_period_end * 1000).toISOString()
              : undefined,
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
          });
        } else {
          // Customer exists but no subscription - check for any active subscriptions
          const subscriptions = await stripe.subscriptions.list({
            customer: user.stripe_customer_id,
            status: 'all',
            limit: 1,
          });

          if (subscriptions.data.length > 0) {
            const subscription = subscriptions.data[0];
            const isActive = subscription.status === 'active' || subscription.status === 'trialing';
            
            // Update user with subscription ID
            await userRepository.updateStripeInfo(
              userId,
              user.stripe_customer_id,
              subscription.id,
              isActive
            );

            return res.json({
              isActive,
              subscriptionId: subscription.id,
              customerId: customer.id,
              status: subscription.status,
              currentPeriodEnd: subscription.current_period_end
                ? new Date(subscription.current_period_end * 1000).toISOString()
                : undefined,
              cancelAtPeriodEnd: subscription.cancel_at_period_end,
            });
          }
        }
      } catch (error) {
        console.error('Error fetching Stripe subscription:', error);
        // Fall back to database status
      }
    }

    // Return database status
    return res.json({
      isActive: user.is_premium || false,
      subscriptionId: user.stripe_subscription_id || undefined,
      customerId: user.stripe_customer_id || undefined,
    });
  } catch (error) {
    console.error('Error getting subscription status:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to get subscription status';
    res.status(500).json({ error: errorMessage });
  }
});

/**
 * Verify checkout session and update user status
 */
router.post('/verify-session', async (req: Request, res: Response) => {
  try {
    const { sessionId, userId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    // Retrieve checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription', 'customer'],
    });

    if (session.mode !== 'subscription') {
      return res.status(400).json({ error: 'Session is not a subscription checkout' });
    }

    const customerId =
      typeof session.customer === 'string' ? session.customer : session.customer?.id;
    const subscriptionId =
      typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription?.id;

    if (!customerId || !subscriptionId) {
      return res.status(400).json({ error: 'Invalid checkout session' });
    }

    // Get subscription to verify status
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const isActive = subscription.status === 'active' || subscription.status === 'trialing';

    // Update user if userId provided
    if (userId) {
      await userRepository.updateStripeInfo(userId, customerId, subscriptionId, isActive);
    } else {
      // Try to find user by email
      const customerEmail = session.customer_email || session.metadata?.customer_email;
      if (customerEmail) {
        const user = await userRepository.findByEmail(customerEmail);
        if (user) {
          await userRepository.updateStripeInfo(user.id, customerId, subscriptionId, isActive);
        }
      }
    }

    res.json({
      success: true,
      isActive,
      subscriptionId,
      customerId,
      status: subscription.status,
    });
  } catch (error) {
    console.error('Error verifying session:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to verify session';
    res.status(500).json({ error: errorMessage });
  }
});

export { router as subscriptionRoutes };

