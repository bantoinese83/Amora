import React, { useState } from 'react';
import { Button } from './common/Button';
import { Card } from './common/Card';
import { CheckCircleIcon } from './common/Icons';
import {
  getStripe,
  createCheckoutSession,
  redirectToCheckout,
  CreateCheckoutSessionParams,
  STRIPE_PRICE_IDS,
} from '../services/stripeService';

interface PaymentCheckoutProps {
  onCancel: () => void;
  customerEmail?: string;
  userId?: string;
}

export const PaymentCheckout: React.FC<PaymentCheckoutProps> = ({
  onCancel,
  customerEmail,
  userId,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');
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
        ...(userId ? { userId } : {}),
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

  const plans = {
    monthly: {
      price: '$9.99',
      period: 'per month',
      priceId: STRIPE_PRICE_IDS.monthly,
      savings: null,
    },
    yearly: {
      price: '$99.99',
      period: 'per year',
      priceId: STRIPE_PRICE_IDS.yearly,
      savings: 'Save 17%',
      monthlyEquivalent: '$8.33/month',
    },
  };

  const features = [
    'Unlimited therapy & coaching sessions',
    'Extended sessions up to 1 hour',
    'Unlimited AI insights & analysis',
    'Complete journal history & audio playback',
    'Priority support',
  ];

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amora-500 to-pink-500 mb-4 shadow-lg shadow-amora-500/25">
          <svg
            className="w-8 h-8 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-3xl font-bold text-slate-900">Unlock Full Access</h2>
        <p className="text-slate-600 text-sm leading-relaxed mb-2">
          Get unlimited therapy, coaching & journaling sessions
        </p>
        <div className="flex items-center justify-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-full w-fit mx-auto">
          <span className="text-[10px] text-slate-600 font-medium">🛋️ Therapist</span>
          <span className="text-slate-400">•</span>
          <span className="text-[10px] text-slate-600 font-medium">🎯 Coach</span>
          <span className="text-slate-400">•</span>
          <span className="text-[10px] text-slate-600 font-medium">📔 Journal</span>
        </div>
      </div>

      {/* Plan Selection */}
      <div className="grid grid-cols-2 gap-4">
        {/* Monthly Plan */}
        <button
          onClick={() => setSelectedPlan('monthly')}
          disabled={isLoading}
          className={`relative p-5 rounded-xl border-2 transition-all duration-300 text-left ${
            selectedPlan === 'monthly'
              ? 'border-amora-500 bg-amora-50 shadow-lg shadow-amora-500/20 scale-105'
              : 'border-slate-300 bg-white hover:border-slate-400 hover:bg-slate-50'
          } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <div className="space-y-2">
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-slate-900">{plans.monthly.price}</span>
            </div>
            <p className="text-sm text-slate-600">{plans.monthly.period}</p>
          </div>
          {selectedPlan === 'monthly' && (
            <div className="absolute top-3 right-3">
              <div className="w-5 h-5 rounded-full bg-amora-500 flex items-center justify-center">
                <CheckCircleIcon className="w-3 h-3 text-white" />
              </div>
            </div>
          )}
        </button>

        {/* Yearly Plan */}
        <button
          onClick={() => setSelectedPlan('yearly')}
          disabled={isLoading}
          className={`relative p-5 rounded-xl border-2 transition-all duration-300 text-left ${
            selectedPlan === 'yearly'
              ? 'border-amora-500 bg-amora-50 shadow-lg shadow-amora-500/20 scale-105'
              : 'border-slate-300 bg-white hover:border-slate-400 hover:bg-slate-50'
          } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          {plans.yearly.savings && (
            <div className="absolute -top-2 -right-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
                {plans.yearly.savings}
              </span>
            </div>
          )}
          <div className="space-y-2">
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-slate-900">{plans.yearly.price}</span>
            </div>
            <p className="text-sm text-slate-600">{plans.yearly.period}</p>
            {plans.yearly.monthlyEquivalent && (
              <p className="text-xs text-amora-600 font-medium">{plans.yearly.monthlyEquivalent}</p>
            )}
          </div>
          {selectedPlan === 'yearly' && (
            <div className="absolute top-3 right-3">
              <div className="w-5 h-5 rounded-full bg-amora-500 flex items-center justify-center">
                <CheckCircleIcon className="w-3 h-3 text-white" />
              </div>
            </div>
          )}
        </button>
      </div>

      {/* Features List */}
      <Card className="bg-slate-50 border-slate-200 p-5">
        <div className="space-y-3">
          {features.map((feature, index) => (
            <div
              key={index}
              className="flex items-start gap-3 animate-in fade-in"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex-shrink-0 mt-0.5">
                <div className="w-5 h-5 rounded-full bg-green-50 border border-green-200 flex items-center justify-center">
                  <CheckCircleIcon className="w-3.5 h-3.5 text-green-600" />
                </div>
              </div>
              <span className="text-sm text-slate-700 leading-relaxed">{feature}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Error Message */}
      {error && (
        <div
          className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 text-center animate-in fade-in slide-in-from-top-4"
          role="alert"
        >
          <div className="flex items-center justify-center gap-2">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-3 pt-2">
        <Button
          onClick={() => handleCheckout(plans[selectedPlan].priceId)}
          fullWidth
          disabled={isLoading}
          className="text-base py-4 font-semibold shadow-lg shadow-amora-500/25 hover:shadow-xl hover:shadow-amora-500/30"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Processing...
            </span>
          ) : (
            `Subscribe ${selectedPlan === 'monthly' ? 'Monthly' : 'Yearly'}`
          )}
        </Button>
        <Button
          onClick={onCancel}
          variant="ghost"
          fullWidth
          disabled={isLoading}
          className="text-sm"
        >
          Cancel
        </Button>
      </div>

      {/* Trust Badge */}
      <div className="pt-2">
        <p className="text-xs text-slate-500 text-center leading-relaxed">
          <span className="inline-flex items-center gap-1.5">
            <svg
              className="w-4 h-4 text-slate-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
            Secure payment powered by Stripe
          </span>
          <span className="mx-2">•</span>
          <span>Cancel anytime</span>
        </p>
      </div>
    </div>
  );
};
