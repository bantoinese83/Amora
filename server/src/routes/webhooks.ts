/**
 * Webhook Routes
 * Handles Stripe webhook events for subscription management
 */

import express, { Router, Request, Response } from 'express';
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

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

// Stripe webhook endpoint - needs raw body
router.post(
  '/stripe',
  express.raw({ type: 'application/json' }),
  async (req: Request, res: Response) => {
    const sig = req.headers['stripe-signature'] as string;

    if (!sig) {
      return res.status(400).json({ error: 'Missing stripe-signature header' });
    }

    let event: Stripe.Event;

    try {
      // Initialize Stripe and verify webhook signature
      const stripe = getStripe();
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      logger.error(
        'Webhook signature verification failed',
        {},
        err instanceof Error ? err : undefined
      );
      return res.status(400).json({ error: `Webhook Error: ${errorMessage}` });
    }

    // Handle the event
    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          await handleCheckoutCompleted(session);
          break;
        }

        case 'customer.subscription.created':
        case 'customer.subscription.updated': {
          const subscription = event.data.object as Stripe.Subscription;
          await handleSubscriptionUpdate(subscription);
          break;
        }

        case 'customer.subscription.deleted': {
          const subscription = event.data.object as Stripe.Subscription;
          await handleSubscriptionDeleted(subscription);
          break;
        }

        case 'invoice.paid': {
          const invoice = event.data.object as Stripe.Invoice;
          await handleInvoicePaid(invoice);
          break;
        }

        case 'invoice.payment_failed': {
          const invoice = event.data.object as Stripe.Invoice;
          await handleInvoicePaymentFailed(invoice);
          break;
        }

        default:
          logger.info('Unhandled webhook event type', { eventType: event.type });
      }

      res.json({ received: true });
    } catch (error) {
      logger.error(
        'Error processing webhook',
        { eventType: event?.type },
        error instanceof Error ? error : undefined
      );
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  }
);

/**
 * Handle checkout session completed
 * Activate premium when customer completes checkout
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  if (session.mode !== 'subscription') {
    return; // Only handle subscription checkouts
  }

  const customerEmail = session.customer_email || session.metadata?.customer_email;
  const userId = session.metadata?.user_id;

  // Get customer to find user
  const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
  if (!customerId) {
    logger.warn('No customer ID found in checkout session', { sessionId: session.id });
    return;
  }

  // Get subscription to verify it's active
  const subscriptionId = session.subscription as string;
  if (!subscriptionId) {
    logger.warn('No subscription ID found in checkout session', {
      sessionId: session.id,
      customerId,
    });
    return;
  }

  // Initialize Stripe
  const stripe = getStripe();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  if (subscription.status === 'active' || subscription.status === 'trialing') {
    // Update user premium status and Stripe IDs
    if (userId) {
      // Update by user ID (preferred)
      try {
        await userRepository.updateStripeInfo(userId, customerId, subscriptionId, true);
        logger.info('Premium activated for user', { userId, customerId });
      } catch (error) {
        logger.error(
          'Failed to update user after checkout',
          { userId, customerId },
          error instanceof Error ? error : undefined
        );
        // Fallback to email lookup
        if (customerEmail) {
          await updatePremiumStatusByEmail(customerEmail, true, customerId, subscriptionId);
        }
      }
    } else {
      // Fallback to email lookup
      if (customerEmail) {
        await updatePremiumStatusByEmail(customerEmail, true, customerId, subscriptionId);
      }
    }
  }
}

/**
 * Handle subscription update
 */
async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const customerId =
    typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id;

  if (!customerId) {
    return;
  }

  // Initialize Stripe
  const stripe = getStripe();
  const customer = (await stripe.customers.retrieve(customerId)) as Stripe.Customer;
  const customerEmail = customer.email;
  const userId = customer.metadata?.user_id;

  if (!customerEmail) {
    return;
  }

  const isActive = subscription.status === 'active' || subscription.status === 'trialing';

  // Update by user ID if available, otherwise by email
  if (userId) {
    try {
      await userRepository.updateStripeInfo(userId, customerId, subscription.id, isActive);
      logger.info('Subscription updated', { userId, status: subscription.status, isActive });
    } catch (error) {
      logger.error(
        'Failed to update user subscription',
        { userId, subscriptionId: subscription.id },
        error instanceof Error ? error : undefined
      );
      // Fallback to email lookup
      await updatePremiumStatusByEmail(customerEmail, isActive, customerId, subscription.id);
    }
  } else {
    await updatePremiumStatusByEmail(customerEmail, isActive, customerId, subscription.id);
  }
}

/**
 * Handle subscription deleted
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId =
    typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id;

  if (!customerId) {
    return;
  }

  // Initialize Stripe
  const stripe = getStripe();
  const customer = (await stripe.customers.retrieve(customerId)) as Stripe.Customer;
  const customerEmail = customer.email;
  const userId = customer.metadata?.user_id;

  if (!customerEmail) {
    return;
  }

  // Update by user ID if available, otherwise by email
  if (userId) {
    try {
      await userRepository.updateStripeInfo(userId, customerId, undefined, false);
      logger.info('Premium deactivated for user', { userId });
    } catch (error) {
      logger.error(
        'Failed to deactivate premium for user',
        { userId },
        error instanceof Error ? error : undefined
      );
      if (customerEmail) {
        await updatePremiumStatusByEmail(customerEmail, false, customerId, undefined);
      }
    }
  } else {
    if (customerEmail) {
      await updatePremiumStatusByEmail(customerEmail, false, customerId, undefined);
    }
  }
}

/**
 * Handle invoice paid
 */
async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;

  if (!customerId) {
    return;
  }

  // Initialize Stripe
  const stripe = getStripe();
  const customer = (await stripe.customers.retrieve(customerId)) as Stripe.Customer;
  const customerEmail = customer.email;
  const userId = customer.metadata?.user_id;

  if (!customerEmail) {
    return;
  }

  const subscriptionId =
    typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id;

  // Ensure premium is active when invoice is paid
  if (userId) {
    try {
      await userRepository.updateStripeInfo(userId, customerId, subscriptionId || undefined, true);
      logger.info('Invoice paid, premium confirmed', { userId, subscriptionId });
    } catch (error) {
      logger.error(
        'Failed to update user after invoice paid',
        { userId },
        error instanceof Error ? error : undefined
      );
      if (customerEmail) {
        await updatePremiumStatusByEmail(
          customerEmail,
          true,
          customerId,
          subscriptionId || undefined
        );
      }
    }
  } else {
    if (customerEmail) {
      await updatePremiumStatusByEmail(
        customerEmail,
        true,
        customerId,
        subscriptionId || undefined
      );
    }
  }
}

/**
 * Handle invoice payment failed
 */
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;

  if (!customerId) {
    return;
  }

  // Check if subscription is still active
  const subscriptionId =
    typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id;

  if (subscriptionId) {
    // Initialize Stripe
    const stripe = getStripe();
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const isActive = subscription.status === 'active' || subscription.status === 'trialing';

    const customer = (await stripe.customers.retrieve(customerId)) as Stripe.Customer;
    const customerEmail = customer.email;
    const userId = customer.metadata?.user_id;

    if (customerEmail) {
      if (userId) {
        try {
          await userRepository.updateStripeInfo(userId, customerId, subscriptionId, isActive);
          logger.info('Payment failed, premium status updated', { userId, isActive });
        } catch (error) {
          logger.error(
            'Failed to update user after payment failed',
            { userId },
            error instanceof Error ? error : undefined
          );
          await updatePremiumStatusByEmail(customerEmail, isActive, customerId, subscriptionId);
        }
      } else {
        await updatePremiumStatusByEmail(customerEmail, isActive, customerId, subscriptionId);
      }
    }
  }
}

/**
 * Update premium status by email
 */
async function updatePremiumStatusByEmail(
  email: string,
  isPremium: boolean,
  customerId?: string | null,
  subscriptionId?: string | null
) {
  try {
    const user = await userRepository.findByEmail(email);

    if (user) {
      if (customerId || subscriptionId) {
        // Update Stripe IDs and premium status together
        await userRepository.updateStripeInfo(
          user.id,
          customerId ?? user.stripe_customer_id ?? undefined,
          subscriptionId ?? user.stripe_subscription_id ?? undefined,
          isPremium
        );
      } else {
        // Just update premium status
        await userRepository.updatePremiumStatus(user.id, isPremium);
      }
      logger.info('Premium status updated by email', { email, isPremium });
    } else {
      logger.warn('User not found for email', { email });
    }
  } catch (error) {
    logger.error(
      'Failed to update premium status by email',
      { email },
      error instanceof Error ? error : undefined
    );
    throw error;
  }
}

export { router as webhookRoutes };
