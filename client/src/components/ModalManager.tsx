import React from 'react';
import { SessionHistory } from './SessionHistory';
import { PostSessionSummary } from './PostSessionSummary';
import { AuthPaymentModal } from './AuthPaymentModal';
import { SettingsModal } from './SettingsModal';
import { OnboardingOverlay } from './OnboardingOverlay';
import { ToastContainer } from './common/Toast';
import { useApp } from '../context/AppContext';

/**
 * Manages the rendering of all application modals and overlays.
 * Separates the concern of "Modal Orchestration" from "Main Layout".
 */
export const ModalManager: React.FC = () => {
  const { toasts, removeToast } = useApp();

  return (
    <>
      {/* Session History manages its own slide-in/out via CSS classes and Context */}
      <SessionHistory />

      {/* Standard Modals (controlled by AppContext) */}
      <PostSessionSummary />
      <AuthPaymentModal />
      <SettingsModal />

      {/* Onboarding Overlay (controlled by LocalStorage/Local State) */}
      <OnboardingOverlay />

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </>
  );
};
