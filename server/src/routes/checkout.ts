/**
 * Checkout Routes
 * Creates Stripe Checkout sessions for subscriptions
 */

import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { StripeCheckoutSessionParams } from '../types/index.js';

const router = Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-02-24.acacia',
});

router.post('/create-checkout-session', async (req: Request, res: Response) => {
  try {
    const { priceId, successUrl, cancelUrl, customerEmail, userId } =
      req.body as StripeCheckoutSessionParams & { userId?: string };

    if (!priceId || !successUrl || !cancelUrl) {
      return res.status(400).json({
        error: 'Missing required fields: priceId, successUrl, cancelUrl',
      });
    }

    // If user ID is provided, try to find or create Stripe customer
    let customerId: string | undefined;
    if (userId && customerEmail) {
      try {
        const { userRepository } = await import(
          '../../../shared/dist/src/repositories/userRepository.js'
        );
        const user = await userRepository.getUserById(userId);
        
        if (user?.stripe_customer_id) {
          // Use existing customer
          customerId = user.stripe_customer_id;
        } else if (customerEmail) {
          // Create or retrieve Stripe customer
          const customers = await stripe.customers.list({
            email: customerEmail,
            limit: 1,
          });
          
          if (customers.data.length > 0) {
            customerId = customers.data[0].id;
            // Update user with customer ID
            await userRepository.updateStripeCustomerId(userId, customerId);
          } else {
            // Create new Stripe customer
            const customer = await stripe.customers.create({
              email: customerEmail,
              metadata: {
                user_id: userId,
              },
            });
            customerId = customer.id;
            // Update user with customer ID
            await userRepository.updateStripeCustomerId(userId, customerId);
          }
        }
      } catch (error) {
        console.warn('Failed to link Stripe customer:', error);
        // Continue without customer ID - Stripe will create one
      }
    }

    // Create checkout session with subscription mode
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription', // Recurring subscription
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer: customerId, // Use existing customer if available
      customer_email: customerId ? undefined : customerEmail, // Only set if no customer ID
      metadata: {
        // Store user info in metadata for webhook processing
        customer_email: customerEmail || '',
        user_id: userId || '',
      },
    });

    res.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to create checkout session';
    res.status(500).json({ error: errorMessage });
  }
});

export { router as checkoutRoutes };
