/**
 * Subscription Routes
 * Handles subscription status checking and syncing
 */

import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { userRepository } from '../../../shared/dist/src/repositories/userRepository.js';
import { logger } from '../utils/logger.js';

const router = Router();

// Lazy initialization of Stripe to avoid errors if key is missing
function getStripe(): Stripe {
  const apiKey = process.env.STRIPE_SECRET_KEY;
  if (!apiKey) {
    throw new Error(
      'Stripe API key is not configured. Please set STRIPE_SECRET_KEY in your environment variables.'
    );
  }
  return new Stripe(apiKey, {
    apiVersion: '2025-02-24.acacia',
  });
}

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
        const stripe = getStripe();
        const customer = (await stripe.customers.retrieve(
          user.stripe_customer_id
        )) as Stripe.Customer;

        if (user.stripe_subscription_id) {
          const subscription = await stripe.subscriptions.retrieve(user.stripe_subscription_id, {
            expand: ['default_payment_method'],
          });
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

          // Get payment method details
          let paymentMethod: { last4?: string; brand?: string } | undefined;
          if (subscription.default_payment_method) {
            const pm =
              typeof subscription.default_payment_method === 'string'
                ? await stripe.paymentMethods.retrieve(subscription.default_payment_method)
                : subscription.default_payment_method;
            if (pm && 'card' in pm && pm.card) {
              paymentMethod = {
                last4: pm.card.last4,
                brand: pm.card.brand,
              };
            }
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
            paymentMethod: paymentMethod?.last4 ? `•••• ${paymentMethod.last4}` : undefined,
            paymentBrand: paymentMethod?.brand,
          });
        } else {
          // Customer exists but no subscription - check for any active subscriptions
          const stripe = getStripe();
          const subscriptions = await stripe.subscriptions.list({
            customer: user.stripe_customer_id,
            status: 'all',
            limit: 1,
          });

          if (subscriptions.data.length > 0) {
            const subscription = await stripe.subscriptions.retrieve(subscriptions.data[0].id, {
              expand: ['default_payment_method'],
            });
            const isActive = subscription.status === 'active' || subscription.status === 'trialing';

            // Update user with subscription ID
            await userRepository.updateStripeInfo(
              userId,
              user.stripe_customer_id,
              subscription.id,
              isActive
            );

            // Get payment method details
            let paymentMethod: { last4?: string; brand?: string } | undefined;
            if (subscription.default_payment_method) {
              const pm =
                typeof subscription.default_payment_method === 'string'
                  ? await stripe.paymentMethods.retrieve(subscription.default_payment_method)
                  : subscription.default_payment_method;
              if (pm && 'card' in pm && pm.card) {
                paymentMethod = {
                  last4: pm.card.last4,
                  brand: pm.card.brand,
                };
              }
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
              paymentMethod: paymentMethod?.last4 ? `•••• ${paymentMethod.last4}` : undefined,
              paymentBrand: paymentMethod?.brand,
            });
          }
        }
      } catch (error) {
        const subscriptionIdFromUser = user.stripe_subscription_id;
        logger.error(
          'Error fetching Stripe subscription',
          { subscriptionId: subscriptionIdFromUser },
          error instanceof Error ? error : undefined
        );
        // Fall back to database status if Stripe is not configured
        if (error instanceof Error && error.message.includes('Stripe API key')) {
          // Continue with database status only
        }
      }
    }

    // Return database status
    return res.json({
      isActive: user.is_premium || false,
      subscriptionId: user.stripe_subscription_id || undefined,
      customerId: user.stripe_customer_id || undefined,
    });
  } catch (error) {
    const userIdFromParams = req.params.userId;
    logger.error(
      'Error getting subscription status',
      { userId: userIdFromParams },
      error instanceof Error ? error : undefined
    );
    res
      .status(500)
      .json({ error: "We couldn't check your subscription status. Please try again." });
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

    // Initialize Stripe
    const stripe = getStripe();

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
      typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;

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
    const userIdFromBody = (req.body as { userId?: string })?.userId;
    const sessionIdFromBody = (req.body as { sessionId?: string })?.sessionId;
    logger.error(
      'Error verifying session',
      { userId: userIdFromBody, sessionId: sessionIdFromBody },
      error instanceof Error ? error : undefined
    );
    if (error instanceof Error && error.message.includes('Stripe API key')) {
      res
        .status(500)
        .json({ error: 'Payment verification is not configured. Please contact support.' });
    } else {
      res.status(500).json({ error: "We couldn't verify your payment. Please try again." });
    }
  }
});

export { router as subscriptionRoutes };
