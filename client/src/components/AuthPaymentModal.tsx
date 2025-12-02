import React, { useEffect, useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { usePinInput } from '../hooks/usePinInput';
import { Modal } from './common/Modal';
import { Card } from './common/Card';
import { Button } from './common/Button';
import { PaymentCheckout } from './PaymentCheckout';
import { ProgressIndicator } from './common/ProgressIndicator';
import { TherapistIcon, CoachIcon, JournalIcon } from './common/Icons';
import { checkEmail, signUp, signIn } from '../services/authService';
import { updatePremiumStatus, getSubscriptionDetails } from '../services/subscriptionService';
import {
  checkPaymentStatus,
  cleanupPaymentParams,
  createPortalSession,
  redirectToPortal,
} from '../services/stripeService';
import { logger } from '../utils/logger';

type AuthMode = 'email' | 'pin' | 'payment';

export const AuthPaymentModal: React.FC = () => {
  const { modals, login, authState, closeModal, openModal, logout } = useApp();
  const [mode, setMode] = useState<AuthMode>('email');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [isLoadingPortal, setIsLoadingPortal] = useState(false);
  const [subscriptionDetails, setSubscriptionDetails] = useState<{
    paymentMethod?: string;
    nextBilling?: string;
  } | null>(null);
  const [isLoadingSubscription, setIsLoadingSubscription] = useState(false);

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
          error instanceof Error
            ? error.message
            : 'Unable to verify email. Please check your connection and try again.';
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
        logger.error('No user ID available for payment verification', {});
        cleanupPaymentParams();
        return;
      }

      try {
        // Verify session with backend
        const backendUrl =
          import.meta.env.VITE_BACKEND_URL || 'https://amora-server-production.up.railway.app';
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
        logger.error(
          'Failed to verify payment session',
          { userId },
          error instanceof Error ? error : undefined
        );
        // Fallback: Update premium status directly
        try {
          await updatePremiumStatus(userId, true);
          cleanupPaymentParams();
          window.location.reload();
        } catch (fallbackError) {
          logger.error(
            'Failed to update premium status after payment',
            { userId },
            fallbackError instanceof Error ? fallbackError : undefined
          );
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

  // Determine if user is premium (must be defined before useEffects that use it)
  const isPremium = authState.user?.isPremium || false;

  // Fetch subscription details when premium user view is shown
  useEffect(() => {
    const fetchSubscriptionDetails = async () => {
      if (!modals.auth || !isPremium || !authState.user?.id) {
        setSubscriptionDetails(null);
        return;
      }

      setIsLoadingSubscription(true);
      try {
        const details = await getSubscriptionDetails(authState.user.id);
        if (details) {
          setSubscriptionDetails({
            paymentMethod: details.paymentMethod,
            nextBilling: details.currentPeriodEnd
              ? new Date(details.currentPeriodEnd).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })
              : undefined,
          });
        } else {
          setSubscriptionDetails(null);
        }
      } catch (error) {
        logger.error(
          'Failed to fetch subscription details',
          { userId: authState.user?.id },
          error instanceof Error ? error : undefined
        );
        setSubscriptionDetails(null);
      } finally {
        setIsLoadingSubscription(false);
      }
    };

    fetchSubscriptionDetails();
  }, [modals.auth, isPremium, authState.user?.id]);

  // If authenticated and not premium, show payment checkout directly
  const shouldShowPayment = authState.isAuthenticated && !isPremium;

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

  // Determine current step for progress indicator
  const getCurrentStep = (): number => {
    if (!authState.isAuthenticated) {
      if (showPayment) return 3;
      if (mode === 'pin') return 2;
      return 1;
    }
    if (authState.user?.isPremium) return 3;
    return 2;
  };

  const authSteps = ['Email', 'PIN', 'Complete'];

  return (
    <Modal isOpen={modals.auth} onClose={undefined}>
      {!authState.isAuthenticated && !showPayment && (
        <ProgressIndicator steps={authSteps} currentStep={getCurrentStep()} className="mb-6" />
      )}
      {!authState.isAuthenticated ? (
        showPayment ? (
          <PaymentCheckout
            onCancel={() => setShowPayment(false)}
            customerEmail={email || authState.user?.email}
            userId={authState.user?.id}
          />
        ) : mode === 'email' ? (
          <div className="text-center">
            <div className="w-16 h-16 bg-amora-500 rounded-full mx-auto mb-4 flex items-center justify-center">
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
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Welcome to Amora</h2>
            <p className="text-slate-600 mb-3">
              A therapist, coach, and journal in one app. Enter your email to get started.
            </p>
            <div className="flex items-center justify-center gap-2 mb-6 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-full w-fit mx-auto">
              <div className="flex items-center gap-1">
                <TherapistIcon className="w-3 h-3 text-slate-600" />
                <span className="text-[10px] text-slate-600 font-medium">Therapist</span>
              </div>
              <span className="text-slate-400">•</span>
              <div className="flex items-center gap-1">
                <CoachIcon className="w-3 h-3 text-slate-600" />
                <span className="text-[10px] text-slate-600 font-medium">Coach</span>
              </div>
              <span className="text-slate-400">•</span>
              <div className="flex items-center gap-1">
                <JournalIcon className="w-3 h-3 text-slate-600" />
                <span className="text-[10px] text-slate-600 font-medium">Journal</span>
              </div>
            </div>

            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="auth-email"
                  className="block text-sm font-medium text-slate-700 mb-2"
                >
                  Email Address
                </label>
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
                  className={`w-full bg-white border rounded-lg px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 transition-colors ${
                    authError && email.trim() === ''
                      ? 'border-red-300 focus:ring-red-500'
                      : 'border-slate-300 focus:ring-amora-500 focus:border-amora-500'
                  }`}
                  required
                  autoComplete="email"
                  disabled={isLoading}
                  maxLength={255}
                  aria-invalid={authError ? 'true' : 'false'}
                  aria-describedby={authError ? 'email-error' : undefined}
                />
                {authError && email.trim() === '' && (
                  <p id="email-error" className="mt-1 text-xs text-red-400" role="alert">
                    {authError}
                  </p>
                )}
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
            <div className="w-16 h-16 bg-amora-500 rounded-full mx-auto mb-4 flex items-center justify-center">
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
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Enter Your PIN</h2>
            <p className="text-slate-600 mb-4 break-words">{email}</p>
            <div className="mb-4">
              <label htmlFor="auth-name" className="block text-sm font-medium text-slate-700 mb-2">
                Your Name <span className="text-slate-500 text-xs">(for new accounts)</span>
              </label>
              <input
                id="auth-name"
                type="text"
                placeholder="Enter your name"
                value={name}
                onChange={e => {
                  const value = e.target.value;
                  // Limit name length
                  if (value.length <= 255) {
                    setName(value);
                    setAuthError(null);
                  }
                }}
                className={`w-full bg-white border rounded-lg px-4 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 transition-colors mb-2 ${
                  authError && name.trim() === ''
                    ? 'border-red-300 focus:ring-red-500'
                    : 'border-slate-300 focus:ring-amora-500 focus:border-amora-500'
                }`}
                autoComplete="name"
                disabled={isLoading}
                maxLength={255}
                aria-invalid={authError ? 'true' : 'false'}
                aria-describedby={authError ? 'name-error' : undefined}
              />
              {authError && name.trim() === '' && (
                <p id="name-error" className="mt-1 text-xs text-red-400" role="alert">
                  {authError}
                </p>
              )}
              <p className="text-xs text-slate-500 mt-1">Existing users can leave this blank.</p>
            </div>
            <p className="text-slate-600 mb-8">Enter your 4-digit PIN to continue</p>

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
                  className={`w-14 h-16 bg-white border-2 rounded-xl text-center text-2xl font-bold text-slate-900 focus:outline-none focus:border-amora-500 transition-all duration-200 ${
                    error || authError ? 'border-red-300 animate-shake' : 'border-slate-300'
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
              className="text-sm text-slate-500 hover:text-slate-700 mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading || authInProgress.current}
            >
              ← Back to email
            </button>
          </div>
        )
      ) : shouldShowPayment ? (
        // Authenticated but NOT Premium - Show payment checkout with logout option
        <div className="space-y-4">
          <PaymentCheckout
            onCancel={() => {
              // Close modal when canceling payment
              closeModal('auth');
            }}
            customerEmail={authState.user?.email}
            userId={authState.user?.id}
          />
          <div className="pt-4 border-t border-slate-700/50">
            <Button
              onClick={() => {
                logout();
                closeModal('auth');
              }}
              variant="ghost"
              fullWidth
              className="text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/30"
            >
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                Sign Out
              </span>
            </Button>
          </div>
        </div>
      ) : isPremium ? (
        // Authenticated and Premium - Show subscription management
        <div className="text-center">
          <div className="w-16 h-16 bg-amora-500 rounded-full mx-auto mb-4 flex items-center justify-center text-2xl font-bold text-white">
            {authState.user?.name?.charAt(0) || 'U'}
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-1">Amora Premium</h2>
          <div className="badge bg-amora-50 text-amora-700 px-3 py-1 rounded-full text-xs font-medium inline-block mb-6 border border-amora-200">
            Active Plan
          </div>

          {isLoadingSubscription ? (
            <Card className="text-center mb-6 py-6">
              <div className="flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-amora-500 border-t-transparent rounded-full animate-spin" />
              </div>
            </Card>
          ) : subscriptionDetails ? (
            <Card className="text-left mb-6">
              {subscriptionDetails.paymentMethod && (
                <div className="flex justify-between items-center mb-2">
                  <span className="text-slate-600">Payment Method</span>
                  <span className="text-slate-900 font-mono">{subscriptionDetails.paymentMethod}</span>
                </div>
              )}
              {subscriptionDetails.nextBilling && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Next Billing</span>
                  <span className="text-slate-900">{subscriptionDetails.nextBilling}</span>
                </div>
              )}
              {!subscriptionDetails.paymentMethod && !subscriptionDetails.nextBilling && (
                <div className="text-center py-2">
                  <p className="text-slate-500 text-sm">
                    Subscription details will appear after your first payment
                  </p>
                </div>
              )}
            </Card>
          ) : null}

          <div className="space-y-3">
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

                  logger.info('Creating portal session', {
                    userId: params.userId,
                    hasCustomerEmail: !!params.customerEmail,
                  });

                  const portalSession = await createPortalSession(params);

                  if (portalSession?.url) {
                    await redirectToPortal(portalSession.url);
                  } else {
                    throw new Error('No portal URL returned');
                  }
                } catch (error) {
                  logger.error(
                    'Failed to open subscription portal',
                    { userId: authState.user?.id },
                    error instanceof Error ? error : undefined
                  );
                  const errorMessage = error instanceof Error ? error.message : 'Unknown error';

                  // Provide more specific error messages
                  if (
                    errorMessage.includes('Customer not found') ||
                    errorMessage.includes('No active subscription')
                  ) {
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

            <Button
              onClick={() => {
                logout();
                closeModal('auth');
              }}
              variant="ghost"
              fullWidth
              className="text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/30"
            >
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                Sign Out
              </span>
            </Button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
};
