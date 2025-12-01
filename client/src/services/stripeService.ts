/**
 * Stripe Service
 * Handles Stripe payment operations using Stripe MCP tools
 * Note: In production, these operations should be done server-side for security
 */

import { loadStripe, Stripe } from '@stripe/stripe-js';
import { logger } from '../utils/logger';

// Stripe Price IDs - Set these in your .env file
export const STRIPE_PRICE_IDS = {
  monthly: import.meta.env.VITE_STRIPE_PRICE_ID_MONTHLY || 'price_1SZZXTLoTzU5JHxjIUkoZZrq',
  yearly: import.meta.env.VITE_STRIPE_PRICE_ID_YEARLY || 'price_1SZZXULoTzU5JHxjPqDZCb9r',
};

// Payment Link URLs (created via Stripe MCP)
// These should be created server-side in production
export const STRIPE_PAYMENT_LINKS = {
  monthly: 'https://buy.stripe.com/9B614o6YTaw83HOePZffy00',
  yearly: 'https://buy.stripe.com/bJeeVe1Ez5bOfqwbDNffy01',
};

// Initialize Stripe with publishable key
let stripePromise: Promise<Stripe | null> | null = null;

export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
    if (!publishableKey) {
      logger.warn('Stripe publishable key not found', {});
      return Promise.resolve(null);
    }
    stripePromise = loadStripe(publishableKey);
  }
  return stripePromise;
}

export interface CreateCheckoutSessionParams {
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
  userId?: string;
}

/**
 * Creates a Stripe Checkout session
 * In production, this should be done server-side
 * For now, we use payment links as a workaround
 */
export async function createCheckoutSession(
  params: CreateCheckoutSessionParams
): Promise<{ sessionId: string; url: string } | null> {
  try {
    // Backend API URL - defaults to localhost:3001 in dev
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

    if (backendUrl) {
      // Use backend API if available
      const response = await fetch(`${backendUrl}/api/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (response.ok) {
        const data = await response.json();
        return { sessionId: data.sessionId, url: data.url };
      }
    }

    // Fallback: Use payment links based on price ID
    // This is a workaround - in production, use proper checkout sessions
    const isMonthly = params.priceId === STRIPE_PRICE_IDS.monthly;
    const paymentLink = isMonthly ? STRIPE_PAYMENT_LINKS.monthly : STRIPE_PAYMENT_LINKS.yearly;

    return {
      sessionId: `plink_${Date.now()}`,
      url: paymentLink,
    };
  } catch (error) {
    logger.error(
      'Checkout session creation failed',
      { priceId: params.priceId },
      error instanceof Error ? error : undefined
    );
    const userMessage =
      error instanceof Error
        ? error.message
        : "We couldn't start the payment process. Please try again.";
    throw new Error(userMessage);
  }
}

/**
 * Redirects to Stripe Checkout
 */
export async function redirectToCheckout(sessionUrl: string): Promise<void> {
  window.location.href = sessionUrl;
}

/**
 * Checks if the current URL contains payment success/failure parameters
 */
export function checkPaymentStatus(): {
  success: boolean;
  sessionId?: string;
  error?: string;
} | null {
  const urlParams = new URLSearchParams(window.location.search);
  const paymentStatus = urlParams.get('payment');
  const sessionId = urlParams.get('session_id');
  const error = urlParams.get('error');

  if (paymentStatus === 'success' || sessionId) {
    const result: { success: boolean; sessionId?: string; error?: string } = { success: true };
    if (sessionId) {
      result.sessionId = sessionId;
    }
    return result;
  }

  if (paymentStatus === 'cancel' || error) {
    return { success: false, error: error || 'Payment was cancelled' };
  }

  return null;
}

/**
 * Cleans up payment-related URL parameters
 */
export function cleanupPaymentParams(): void {
  const url = new URL(window.location.href);
  url.searchParams.delete('payment');
  url.searchParams.delete('session_id');
  url.searchParams.delete('error');
  window.history.replaceState({}, '', url.toString());
}

export interface CreatePortalSessionParams {
  returnUrl: string;
  customerId?: string;
  customerEmail?: string;
  userId?: string;
}

/**
 * Creates a Stripe Customer Portal session
 * In production, this should be done server-side
 */
export async function createPortalSession(
  params: CreatePortalSessionParams
): Promise<{ url: string } | null> {
  try {
    const backendUrl =
      import.meta.env.VITE_BACKEND_URL || 'https://amora-server-production.up.railway.app';

    // Use backend API
    const response = await fetch(`${backendUrl}/api/create-portal-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      // Try to get error message from response
      let errorMessage = 'Failed to create portal session';
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch {
        errorMessage = `Server responded with status ${response.status}`;
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    if (!data.url) {
      throw new Error('No portal URL returned from server');
    }

    return { url: data.url };
  } catch (error) {
    logger.error(
      'Portal session creation failed',
      { customerEmail: params.customerEmail },
      error instanceof Error ? error : undefined
    );
    const userMessage =
      error instanceof Error
        ? error.message
        : "We couldn't open subscription management. Please try again.";
    throw new Error(userMessage);
  }
}

/**
 * Redirects to Stripe Customer Portal
 */
export async function redirectToPortal(portalUrl: string): Promise<void> {
  window.location.href = portalUrl;
}
