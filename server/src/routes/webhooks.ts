/**
 * Webhook Routes
 * Handles Stripe webhook events for subscription management
 */

import express, { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { userRepository } from '../../../shared/dist/src/repositories/userRepository.js';

const router = Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-02-24.acacia',
});

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
      // Verify webhook signature
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Webhook signature verification failed:', errorMessage);
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
          console.log(`Unhandled event type: ${event.type}`);
      }

      res.json({ received: true });
    } catch (error) {
      console.error('Error processing webhook:', error);
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
    console.warn('No customer ID found in checkout session');
    return;
  }

  // Get subscription to verify it's active
  const subscriptionId = session.subscription as string;
  if (!subscriptionId) {
    console.warn('No subscription ID found in checkout session');
    return;
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  if (subscription.status === 'active' || subscription.status === 'trialing') {
    // Update user premium status and Stripe IDs
    if (userId) {
      // Update by user ID (preferred)
      try {
        await userRepository.updateStripeInfo(userId, customerId, subscriptionId, true);
        console.log(`Premium activated for user: ${userId}, customer: ${customerId}`);
      } catch (error) {
        console.error(`Failed to update user ${userId}:`, error);
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
      console.log(
        `Subscription ${subscription.status} for user: ${userId}, Premium: ${isActive}`
      );
    } catch (error) {
      console.error(`Failed to update user ${userId}:`, error);
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
      console.log(`Premium deactivated for user: ${userId}`);
    } catch (error) {
      console.error(`Failed to update user ${userId}:`, error);
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
      await userRepository.updateStripeInfo(
        userId,
        customerId,
        subscriptionId || undefined,
        true
      );
      console.log(`Invoice paid, premium confirmed for user: ${userId}`);
    } catch (error) {
      console.error(`Failed to update user ${userId}:`, error);
      if (customerEmail) {
        await updatePremiumStatusByEmail(customerEmail, true, customerId, subscriptionId || undefined);
      }
    }
  } else {
    if (customerEmail) {
      await updatePremiumStatusByEmail(customerEmail, true, customerId, subscriptionId || undefined);
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
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const isActive = subscription.status === 'active' || subscription.status === 'trialing';

    const customer = (await stripe.customers.retrieve(customerId)) as Stripe.Customer;
    const customerEmail = customer.email;
    const userId = customer.metadata?.user_id;

    if (customerEmail) {
      if (userId) {
        try {
          await userRepository.updateStripeInfo(userId, customerId, subscriptionId, isActive);
          console.log(`Payment failed for user ${userId}, Premium status: ${isActive}`);
        } catch (error) {
          console.error(`Failed to update user ${userId}:`, error);
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
      console.log(`Premium status updated: ${email} -> ${isPremium}`);
    } else {
      console.warn(`User not found for email: ${email}`);
    }
  } catch (error) {
    console.error(`Failed to update premium status for ${email}:`, error);
    throw error;
  }
}

export { router as webhookRoutes };
