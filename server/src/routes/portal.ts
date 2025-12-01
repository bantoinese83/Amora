/**
 * Portal Routes
 * Creates Stripe Customer Portal sessions for subscription management
 */

import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { StripePortalSessionParams } from '../types';

const router = Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-02-24.acacia',
});

router.post('/create-portal-session', async (req: Request, res: Response) => {
  try {
    const { returnUrl, customerId, customerEmail } = req.body as StripePortalSessionParams;

    if (!returnUrl) {
      return res.status(400).json({ error: 'Missing required field: returnUrl' });
    }

    let customer: Stripe.Customer | null = null;

    // Find customer by ID or email
    if (customerId) {
      customer = (await stripe.customers.retrieve(customerId)) as Stripe.Customer;
    } else if (customerEmail) {
      const customers = await stripe.customers.list({
        email: customerEmail,
        limit: 1,
      });
      customer = customers.data[0] || null;
    }

    if (!customer) {
      return res.status(404).json({
        error: 'Customer not found. Please ensure you have an active subscription.',
      });
    }

    // Create portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: customer.id,
      return_url: returnUrl,
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Error creating portal session:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create portal session';
    res.status(500).json({ error: errorMessage });
  }
});

export { router as portalRoutes };
