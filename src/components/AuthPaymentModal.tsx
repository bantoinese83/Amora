import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { usePinInput } from '../hooks/usePinInput';
import { Modal } from './common/Modal';
import { Card } from './common/Card';
import { Button } from './common/Button';
import { PaymentCheckout } from './PaymentCheckout';
import { preferencesRepository } from '../repositories/preferencesRepository';
import {
  checkPaymentStatus,
  cleanupPaymentParams,
  createPortalSession,
  redirectToPortal,
} from '../services/stripeService';

export const AuthPaymentModal: React.FC = () => {
  const { modals, login, authState } = useApp();
  const isFirstTime = !preferencesRepository.isPinSet();
  const [showPayment, setShowPayment] = useState(false);
  const [customerEmail, setCustomerEmail] = useState('');
  const [isLoadingPortal, setIsLoadingPortal] = useState(false);

  const { values, error, handleDigitChange, attempts } = usePinInput(4, () => {
    // After PIN validation, show payment screen
    setShowPayment(true);
  });

  // Check for payment status in URL (after Stripe redirect)
  useEffect(() => {
    const paymentStatus = checkPaymentStatus();
    if (paymentStatus) {
      if (paymentStatus.success) {
        // Payment successful - complete login
        login();
        cleanupPaymentParams();
      } else {
        // Payment failed or cancelled
        setShowPayment(false);
        cleanupPaymentParams();
      }
    }
  }, [login]);

  // Auto-focus first input on mount
  useEffect(() => {
    if (modals.auth && !authState.isAuthenticated && !showPayment) {
      setTimeout(() => {
        document.getElementById('pin-0')?.focus();
      }, 100);
    }
  }, [modals.auth, authState.isAuthenticated, showPayment]);

  return (
    <Modal isOpen={modals.auth} onClose={undefined}>
      {!authState.isAuthenticated ? (
        showPayment ? (
          <PaymentCheckout
            onCancel={() => setShowPayment(false)}
            customerEmail={customerEmail || ''}
          />
        ) : (
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-tr from-amora-500 to-pink-500 rounded-full mx-auto mb-4 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Welcome to Amora</h2>
            <p className="text-slate-400 mb-8">
              Enter your 4-digit passcode to access your secure sessions.
            </p>

            <div
              className="flex justify-center gap-4 mb-6"
              role="group"
              aria-label="PIN entry - 4 digit passcode"
            >
              {values.map((digit, idx) => (
                <input
                  key={idx}
                  id={`pin-${idx}`}
                  type="password"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={e => handleDigitChange(idx, e.target.value)}
                  className={`w-14 h-16 bg-slate-800 border-2 rounded-xl text-center text-2xl font-bold text-white focus:outline-none focus:border-amora-500 transition-all duration-200 ${error ? 'border-red-500 animate-shake' : 'border-slate-600'}`}
                  aria-label={`PIN digit ${idx + 1} of 4`}
                  autoComplete="one-time-code"
                  aria-describedby="pin-description"
                />
              ))}
            </div>
            <p id="pin-description" className="sr-only">
              Enter your 4-digit PIN code
            </p>

            {error && (
              <div className="mb-4 animate-fade-in">
                <p className="text-red-400 text-sm">
                  {attempts >= 3
                    ? 'Too many incorrect attempts. Please wait a moment.'
                    : 'Incorrect passcode. Please try again.'}
                </p>
              </div>
            )}

            {isFirstTime && (
              <div className="mb-4 p-3 bg-amora-900/30 border border-amora-700/50 rounded-lg">
                <p className="text-xs text-amora-300">
                  First time? Use the default passcode:{' '}
                  <span className="font-mono font-bold">1234</span>
                </p>
                <p className="text-xs text-slate-500 mt-1">You can change it later in settings</p>
              </div>
            )}

            <p className="text-xs text-slate-500 mt-6">Your sessions are encrypted and secure</p>
            {/* Email input for payment (optional, can be collected later) */}
            <div className="mt-4">
              <input
                type="email"
                placeholder="Email (optional, for receipt)"
                value={customerEmail}
                onChange={e => setCustomerEmail(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amora-500"
              />
            </div>
          </div>
        )
      ) : (
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-tr from-amora-500 to-pink-500 rounded-full mx-auto mb-4 flex items-center justify-center text-2xl font-bold text-white">
            {authState.user?.name.charAt(0)}
          </div>
          <h2 className="text-2xl font-bold text-white mb-1">Amora Premium</h2>
          <div className="badge bg-amora-900/50 text-amora-300 px-3 py-1 rounded-full text-xs font-medium inline-block mb-6 border border-amora-700">
            Active Plan
          </div>

          <Card className="text-left mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-slate-300">Payment Method</span>
              <span className="text-white font-mono">•••• 4242</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-300">Next Billing</span>
              <span className="text-white">Nov 12, 2025</span>
            </div>
          </Card>

          <Button
            onClick={async () => {
              setIsLoadingPortal(true);
              try {
                const returnUrl = window.location.origin;
                const params = {
                  returnUrl,
                  ...(authState.user?.email ? { customerEmail: authState.user.email } : {}),
                } as Parameters<typeof createPortalSession>[0];
                const portalSession = await createPortalSession(params);

                if (portalSession?.url) {
                  await redirectToPortal(portalSession.url);
                }
              } catch (error) {
                console.error('Failed to open subscription portal:', error);
                setIsLoadingPortal(false);
                // Show user-friendly error
                alert(
                  'Unable to open subscription management. Please check your internet connection and try again.'
                );
              }
            }}
            fullWidth
            disabled={isLoadingPortal}
          >
            {isLoadingPortal ? 'Opening...' : 'Manage Subscription'}
          </Button>
        </div>
      )}
    </Modal>
  );
};
