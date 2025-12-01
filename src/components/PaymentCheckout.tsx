import React, { useState } from 'react';
import { Button } from './common/Button';
import { Card } from './common/Card';
import {
  getStripe,
  createCheckoutSession,
  redirectToCheckout,
  CreateCheckoutSessionParams,
} from '../services/stripeService';

interface PaymentCheckoutProps {
  onCancel: () => void;
  customerEmail?: string;
}

// Stripe Price IDs - Replace with your actual Stripe Price IDs
const PRICE_IDS = {
  monthly: import.meta.env.VITE_STRIPE_PRICE_ID_MONTHLY || 'price_monthly',
  yearly: import.meta.env.VITE_STRIPE_PRICE_ID_YEARLY || 'price_yearly',
};

export const PaymentCheckout: React.FC<PaymentCheckoutProps> = ({ onCancel, customerEmail }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('monthly');
  const [error, setError] = useState<string | null>(null);

  const handleCheckout = async (priceId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const stripe = await getStripe();
      if (!stripe) {
        throw new Error('Stripe is not available. Please check your configuration.');
      }

      const successUrl = `${window.location.origin}?payment=success&session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${window.location.origin}?payment=cancel`;

      const params = {
        priceId,
        successUrl,
        cancelUrl,
        ...(customerEmail && customerEmail.trim() !== '' ? { customerEmail } : {}),
      } as CreateCheckoutSessionParams;
      const session = await createCheckoutSession(params);

      if (!session) {
        throw new Error('Failed to create checkout session');
      }

      // Redirect to Stripe Checkout
      await redirectToCheckout(session.url);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-bold text-white mb-2">Choose Your Plan</h3>
        <p className="text-slate-400 text-sm">Unlock unlimited sessions and premium features</p>
      </div>

      {/* Plan Selection */}
      <div className="flex gap-3">
        <Card
          onClick={() => setSelectedPlan('monthly')}
          className={`cursor-pointer transition-all ${
            selectedPlan === 'monthly'
              ? 'border-amora-500 bg-amora-900/20'
              : 'border-slate-700 hover:border-slate-600'
          }`}
        >
          <div className="text-center">
            <div className="text-2xl font-bold text-white mb-1">$9.99</div>
            <div className="text-sm text-slate-400">per month</div>
          </div>
        </Card>
        <Card
          onClick={() => setSelectedPlan('yearly')}
          className={`cursor-pointer transition-all ${
            selectedPlan === 'yearly'
              ? 'border-amora-500 bg-amora-900/20'
              : 'border-slate-700 hover:border-slate-600'
          }`}
        >
          <div className="text-center">
            <div className="text-2xl font-bold text-white mb-1">$99.99</div>
            <div className="text-sm text-slate-400">per year</div>
            <div className="text-xs text-green-400 mt-1">Save 17%</div>
          </div>
        </Card>
      </div>

      {/* Features List */}
      <Card className="bg-slate-800/50">
        <ul className="space-y-2 text-sm text-slate-300">
          <li className="flex items-center gap-2">
            <span className="text-green-400">✓</span>
            <span>Unlimited voice sessions</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-400">✓</span>
            <span>AI-powered insights and analysis</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-400">✓</span>
            <span>Knowledge base integration</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-400">✓</span>
            <span>Priority support</span>
          </li>
        </ul>
      </Card>

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-400 text-center">
          {error}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button onClick={onCancel} variant="ghost" fullWidth disabled={isLoading}>
          Cancel
        </Button>
        <Button
          onClick={() => handleCheckout(PRICE_IDS[selectedPlan])}
          fullWidth
          disabled={isLoading}
        >
          {isLoading ? 'Processing...' : `Subscribe ${selectedPlan === 'monthly' ? 'Monthly' : 'Yearly'}`}
        </Button>
      </div>

      <p className="text-xs text-slate-500 text-center">
        Secure payment powered by Stripe. Cancel anytime.
      </p>
    </div>
  );
};

