/**
 * Server-specific types
 */

export interface StripeCheckoutSessionParams {
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
  userId?: string;
}

export interface StripePortalSessionParams {
  returnUrl: string;
  customerId?: string;
  customerEmail?: string;
  userId?: string;
}

export interface WebhookEvent {
  type: string;
  data: {
    object: Record<string, unknown>;
  };
}
