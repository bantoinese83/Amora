/**
 * Checkout Routes
 * Creates Stripe Checkout sessions for subscriptions
 */

import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { StripeCheckoutSessionParams } from '../types';

const router = Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-02-24.acacia',
});

router.post('/create-checkout-session', async (req: Request, res: Response) => {
  try {
    const { priceId, successUrl, cancelUrl, customerEmail } =
      req.body as StripeCheckoutSessionParams;

    if (!priceId || !successUrl || !cancelUrl) {
      return res.status(400).json({
        error: 'Missing required fields: priceId, successUrl, cancelUrl',
      });
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
      customer_email: customerEmail,
      metadata: {
        // Store user email in metadata for webhook processing
        customer_email: customerEmail || '',
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
