import React, { useEffect, useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { usePinInput } from '../hooks/usePinInput';
import { Modal } from './common/Modal';
import { Card } from './common/Card';
import { Button } from './common/Button';
import { PaymentCheckout } from './PaymentCheckout';
import { checkEmail, signUp, signIn } from '../services/authService';
import { updatePremiumStatus } from '../services/subscriptionService';
import {
  checkPaymentStatus,
  cleanupPaymentParams,
  createPortalSession,
  redirectToPortal,
} from '../services/stripeService';

type AuthMode = 'email' | 'pin' | 'payment';

export const AuthPaymentModal: React.FC = () => {
  const { modals, login, authState, closeModal } = useApp();
  const [mode, setMode] = useState<AuthMode>('email');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [isLoadingPortal, setIsLoadingPortal] = useState(false);

  // Prevent concurrent operations
  const authInProgress = useRef(false);
  const checkingEmailRef = useRef(false);

  const {
    values,
    error,
    handleDigitChange,
    attempts,
    reset: resetPin,
  } = usePinInput(4, async () => {
    // PIN entered - authenticate or sign up
    // Auto-submit when all 4 digits are entered
    if (!authInProgress.current) {
      await handleAuth();
    }
  });

  const handleAuth = async () => {
    // Prevent concurrent auth attempts
    if (authInProgress.current) {
      return;
    }

    // Validate email
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setAuthError('Please enter your email');
      return;
    }

    // Basic email format check
    if (!trimmedEmail.includes('@') || !trimmedEmail.includes('.')) {
      setAuthError('Please enter a valid email address');
      return;
    }

    const pin = values.join('');
    if (pin.length !== 4) {
      return; // Wait for full PIN
    }

    // Validate PIN format
    if (!/^\d{4}$/.test(pin)) {
      setAuthError('PIN must be 4 digits');
      resetPin();
      return;
    }

    authInProgress.current = true;
    setIsLoading(true);
    setAuthError(null);

    try {
      // Check if user exists to determine signup vs signin
      if (checkingEmailRef.current) {
        return;
      }

      checkingEmailRef.current = true;
      let emailExists: boolean;
      try {
        emailExists = await checkEmail(trimmedEmail);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unable to verify email. Please check your connection and try again.';
        setAuthError(errorMessage);
        setIsLoading(false);
        authInProgress.current = false;
        checkingEmailRef.current = false;
        return;
      } finally {
        checkingEmailRef.current = false;
      }

      if (emailExists) {
        // Sign in flow
        try {
          const user = await signIn(trimmedEmail, pin);
          await login(trimmedEmail, pin, undefined, user);
          resetPin();
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Failed to sign in. Please try again.';
          setAuthError(errorMessage);
          setIsLoading(false);
          authInProgress.current = false;
          return;
        }
      } else {
        // Sign up flow - need name
        const trimmedName = name.trim();
        if (!trimmedName) {
          setAuthError('Please enter your name to create an account');
          setIsLoading(false);
          authInProgress.current = false;
          return;
        }

        // Validate name length
        if (trimmedName.length < 1 || trimmedName.length > 255) {
          setAuthError('Name must be between 1 and 255 characters');
          setIsLoading(false);
          authInProgress.current = false;
          return;
        }

        try {
          const user = await signUp(trimmedEmail, pin, trimmedName);
          await login(trimmedEmail, pin, trimmedName, user);
          setShowPayment(true);
          resetPin();
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Failed to create account. Please try again.';
          setAuthError(errorMessage);
          setIsLoading(false);
          authInProgress.current = false;
          return;
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Authentication failed. Please try again.';
      setAuthError(errorMessage);
      resetPin();
    } finally {
      setIsLoading(false);
      authInProgress.current = false;
    }
  };

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setAuthError('Please enter your email');
      return;
    }

    // Basic email validation
    if (!trimmedEmail.includes('@') || !trimmedEmail.includes('.')) {
      setAuthError('Please enter a valid email address');
      return;
    }

    if (trimmedEmail.length > 255) {
      setAuthError('Email address is too long');
      return;
    }

    // Prevent navigation if already loading
    if (isLoading || authInProgress.current) {
      return;
    }

    setMode('pin');
    setAuthError(null);
    setTimeout(() => {
      const pinInput = document.getElementById('pin-0');
      if (pinInput) {
        pinInput.focus();
      }
    }, 100);
  };

  // Check for payment status in URL (after Stripe redirect)
  useEffect(() => {
    const handlePaymentSuccess = async () => {
      const userId = authState.user?.id;
      const paymentStatus = checkPaymentStatus();
      
      if (!paymentStatus?.success || !paymentStatus.sessionId) {
        return;
      }

      if (!userId) {
        console.error('No user ID available for payment verification');
        cleanupPaymentParams();
        return;
      }

      try {
        // Verify session with backend
        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'https://amora-server-production.up.railway.app';
        const response = await fetch(`${backendUrl}/api/subscription/verify-session`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionId: paymentStatus.sessionId,
            userId,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.isActive) {
            // Premium activated - reload to refresh auth state
            cleanupPaymentParams();
            window.location.reload();
            return;
          }
        }

        // Fallback: Update premium status directly
        await updatePremiumStatus(userId, true);
        cleanupPaymentParams();
        window.location.reload();
      } catch (error) {
        console.error('Failed to verify payment session:', error);
        // Fallback: Update premium status directly
        try {
          await updatePremiumStatus(userId, true);
          cleanupPaymentParams();
          window.location.reload();
        } catch (fallbackError) {
          console.error('Failed to update premium status after payment:', fallbackError);
          cleanupPaymentParams();
        }
      }
    };

    try {
      const paymentStatus = checkPaymentStatus();
      if (paymentStatus) {
        if (paymentStatus.success) {
          // Payment successful - verify and update
          handlePaymentSuccess();
          setShowPayment(false);
        } else {
          // Payment failed or cancelled
          setShowPayment(false);
          cleanupPaymentParams();
        }
      }
    } catch {
      // Payment status check failed, continue normally
    }
  }, [authState.user?.id]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!modals.auth) {
      setMode('email');
      setEmail('');
      setName('');
      setAuthError(null);
      setShowPayment(false);
      resetPin();
      authInProgress.current = false;
      checkingEmailRef.current = false;
    } else if (authState.isAuthenticated && !isPremium) {
      // If modal opens for authenticated non-premium user, show payment checkout directly
      // Don't reset mode/email since user is already logged in
    }
  }, [modals.auth, resetPin, authState.isAuthenticated, isPremium]);

  // Auto-focus email input on mount
  useEffect(() => {
    if (modals.auth && !authState.isAuthenticated && mode === 'email' && !showPayment) {
      const timer = setTimeout(() => {
        const emailInput = document.getElementById('auth-email');
        if (emailInput) {
          emailInput.focus();
        }
      }, 100);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [modals.auth, authState.isAuthenticated, mode, showPayment]);

  // Determine if user is premium
  const isPremium = authState.user?.isPremium || false;

  return (
    <Modal isOpen={modals.auth} onClose={undefined}>
      {!authState.isAuthenticated ? (
        showPayment ? (
          <PaymentCheckout
            onCancel={() => setShowPayment(false)}
            customerEmail={email || authState.user?.email}
            userId={authState.user?.id}
          />
        ) : mode === 'email' ? (
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
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Welcome to Amora</h2>
            <p className="text-slate-400 mb-6">
              Enter your email to get started with secure voice sessions.
            </p>

            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div>
                <input
                  id="auth-email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={e => {
                    const value = e.target.value;
                    // Limit email length
                    if (value.length <= 255) {
                      setEmail(value);
                      setAuthError(null);
                    }
                  }}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amora-500"
                  required
                  autoComplete="email"
                  disabled={isLoading}
                  maxLength={255}
                />
              </div>

              {authError && (
                <div className="mb-4 animate-fade-in">
                  <p className="text-red-400 text-sm">{authError}</p>
                </div>
              )}

              <Button type="submit" fullWidth disabled={isLoading || !email.trim()}>
                {isLoading ? 'Loading...' : 'Continue'}
              </Button>

              <p className="text-xs text-slate-500 mt-4">
                New to Amora? We'll create your account when you enter your PIN.
              </p>
            </form>
          </div>
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
            <h2 className="text-2xl font-bold text-white mb-2">Enter Your PIN</h2>
            <p className="text-slate-400 mb-4 break-words">{email}</p>
            <div className="mb-4">
              <input
                type="text"
                placeholder="Your name (for new accounts)"
                value={name}
                onChange={e => {
                  const value = e.target.value;
                  // Limit name length
                  if (value.length <= 255) {
                    setName(value);
                    setAuthError(null);
                  }
                }}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amora-500 mb-2"
                autoComplete="name"
                disabled={isLoading}
                maxLength={255}
              />
              <p className="text-xs text-slate-500">
                Enter your name if this is your first time. Existing users can leave this blank.
              </p>
            </div>
            <p className="text-slate-400 mb-8">Enter your 4-digit PIN to continue</p>

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
                  onChange={e => {
                    if (!isLoading && !authInProgress.current) {
                      handleDigitChange(idx, e.target.value);
                    }
                  }}
                  onKeyDown={e => {
                    // Submit on Enter key when PIN is complete
                    if (
                      e.key === 'Enter' &&
                      values.every(v => v !== '') &&
                      !isLoading &&
                      !authInProgress.current
                    ) {
                      e.preventDefault();
                      handleAuth();
                    }
                  }}
                  className={`w-14 h-16 bg-slate-800 border-2 rounded-xl text-center text-2xl font-bold text-white focus:outline-none focus:border-amora-500 transition-all duration-200 ${
                    error || authError ? 'border-red-500 animate-shake' : 'border-slate-600'
                  }`}
                  aria-label={`PIN digit ${idx + 1} of 4`}
                  autoComplete="one-time-code"
                  disabled={isLoading || authInProgress.current}
                />
              ))}
            </div>

            {(error || authError) && (
              <div className="mb-4 animate-fade-in">
                <p className="text-red-400 text-sm">
                  {authError ||
                    (attempts >= 3
                      ? 'Too many incorrect attempts. Please wait a moment.'
                      : 'Incorrect PIN. Please try again.')}
                </p>
              </div>
            )}

            {isLoading && (
              <div className="mb-4">
                <div className="w-6 h-6 border-2 border-amora-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              </div>
            )}

            {/* Continue button - appears when PIN is complete */}
            {values.every(v => v !== '') && !isLoading && (
              <div className="mb-4">
                <Button
                  onClick={async () => {
                    if (!authInProgress.current) {
                      await handleAuth();
                    }
                  }}
                  fullWidth
                  disabled={isLoading || authInProgress.current}
                >
                  Continue
                </Button>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                if (!isLoading && !authInProgress.current) {
                  setMode('email');
                  setAuthError(null);
                  resetPin();
                }
              }}
              className="text-sm text-slate-400 hover:text-slate-300 mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading || authInProgress.current}
            >
              ← Back to email
            </button>
          </div>
        )
      ) : shouldShowPayment ? (
        // Authenticated but NOT Premium - Show payment checkout
        <PaymentCheckout
          onCancel={() => {
            // Close modal when canceling payment
            closeModal('auth');
          }}
          customerEmail={authState.user?.email}
          userId={authState.user?.id}
        />
      ) : isPremium ? (
        // Authenticated and Premium - Show subscription management
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-tr from-amora-500 to-pink-500 rounded-full mx-auto mb-4 flex items-center justify-center text-2xl font-bold text-white">
            {authState.user?.name?.charAt(0) || 'U'}
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
              if (isLoadingPortal) {
                return;
              }

              setIsLoadingPortal(true);
              try {
                const returnUrl = window.location.origin;
                const params = {
                  returnUrl,
                  ...(authState.user?.email ? { customerEmail: authState.user.email } : {}),
                  ...(authState.user?.id ? { userId: authState.user.id } : {}),
                } as Parameters<typeof createPortalSession>[0];
                
                console.log('Creating portal session with params:', { ...params, customerEmail: params.customerEmail ? '***' : undefined });
                
                const portalSession = await createPortalSession(params);

                if (portalSession?.url) {
                  await redirectToPortal(portalSession.url);
                } else {
                  throw new Error('No portal URL returned');
                }
              } catch (error) {
                console.error('Failed to open subscription portal:', error);
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                
                // Provide more specific error messages
                if (errorMessage.includes('Customer not found') || errorMessage.includes('No active subscription')) {
                  // If user needs subscription, redirect to payment checkout
                  // Close current modal and show payment checkout
                  closeModal('auth');
                  // Re-open modal - it will show PaymentCheckout for non-premium users
                  // For premium users without customer ID, they also need to subscribe
                  setTimeout(() => {
                    openModal('auth');
                  }, 100);
                } else if (errorMessage.includes('404') || errorMessage.includes('not found')) {
                  alert(
                    'Subscription not found. If you recently subscribed, please wait a moment and try again.'
                  );
                } else {
                  alert(
                    `Unable to open subscription management: ${errorMessage}. Please check your internet connection and try again.`
                  );
                }
              } finally {
                setIsLoadingPortal(false);
              }
            }}
            fullWidth
            disabled={isLoadingPortal}
          >
            {isLoadingPortal ? 'Opening...' : 'Manage Subscription'}
          </Button>
        </div>
      ) : null}
    </Modal>
  );
};
