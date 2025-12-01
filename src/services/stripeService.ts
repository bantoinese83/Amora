import { loadStripe, Stripe } from '@stripe/stripe-js';

// Initialize Stripe with publishable key
let stripePromise: Promise<Stripe | null> | null = null;

export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
    if (!publishableKey) {
      console.warn('Stripe publishable key not found. Payment features will be disabled.');
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
}

/**
 * Creates a Stripe Checkout session via backend API
 * Note: This requires a backend endpoint at /api/create-checkout-session
 * For production, replace this URL with your actual backend endpoint
 */
export async function createCheckoutSession(
  params: CreateCheckoutSessionParams
): Promise<{ sessionId: string; url: string } | null> {
  try {
    // In production, this should point to your backend API
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
    const response = await fetch(`${backendUrl}/api/create-checkout-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error(`Failed to create checkout session: ${response.statusText}`);
    }

    const data = await response.json();
    return { sessionId: data.sessionId, url: data.url };
  } catch (error) {
    console.error('Error creating checkout session:', error);
    // For development, return a mock session URL
    // In production, this should never happen
    if (import.meta.env.DEV) {
      console.warn('Using mock checkout session for development');
      return {
        sessionId: 'mock_session_id',
        url: `${window.location.origin}?payment=success`,
      };
    }
    throw error;
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
}

/**
 * Creates a Stripe Customer Portal session via backend API
 * This allows customers to manage their subscription, update payment methods, etc.
 * Note: This requires a backend endpoint at /api/create-portal-session
 */
export async function createPortalSession(
  params: CreatePortalSessionParams
): Promise<{ url: string } | null> {
  try {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
    const response = await fetch(`${backendUrl}/api/create-portal-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error(`Failed to create portal session: ${response.statusText}`);
    }

    const data = await response.json();
    return { url: data.url };
  } catch (error) {
    console.error('Error creating portal session:', error);
    // For development, show a helpful message
    if (import.meta.env.DEV) {
      console.warn('Portal session creation failed. Make sure your backend is running.');
      alert(
        'Subscription management requires a backend server. Please set up the backend endpoint at /api/create-portal-session'
      );
    }
    throw error;
  }
}

/**
 * Redirects to Stripe Customer Portal
 */
export async function redirectToPortal(portalUrl: string): Promise<void> {
  window.location.href = portalUrl;
}
