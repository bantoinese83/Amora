import { useCallback, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { useVoiceClient } from './useVoiceClient';
import { useSessionTimer } from './useSessionTimer';
import { useAutoRetry } from './useAutoRetry';
import { ConnectionStatus } from '../types';
import { SESSION_DURATION_SECONDS } from '../constants';
import { getSubscriptionLimits } from '../services/subscriptionService';

/**
 * Orchestrates the business logic for running a session.
 * Connects Voice Client, Timer, and Data Storage.
 */
export function useSessionWorkflow() {
  const { selectedVoice, saveNewSession, openModal, authState, showToast, sessions } = useApp();

  // Get session duration based on subscription
  const isPremium = authState.user?.isPremium || false;
  const limits = getSubscriptionLimits(isPremium);
  const sessionDuration = isPremium ? SESSION_DURATION_SECONDS : limits.maxSessionDuration;

  const {
    status,
    audioDataRef,
    isMuted,
    transcripts,
    audioChunks,
    connect,
    disconnect,
    toggleMute,
  } = useVoiceClient();

  // Logic to run when a session ends (either by timer or manually)
  const completeSession = useCallback(
    async (isManual: boolean, timeLeft: number) => {
      // 1. Stop Voice
      await disconnect();

      // 2. Calculate Duration
      // If manual, duration is max - left. If timer, duration is max.
      const duration = isManual ? sessionDuration - timeLeft : sessionDuration;

      // 3. Save Data
      if (transcripts.length > 0) {
        const newSession = await saveNewSession(transcripts, duration, audioChunks);
        if (newSession) {
          openModal('summary', newSession);
        }
      }
    },
    [disconnect, transcripts, saveNewSession, openModal, sessionDuration]
  );

  const handleTimerComplete = useCallback(() => {
    completeSession(false, 0);
  }, [completeSession]);

  // Timer Hook
  const { timeLeft, formattedTime, resetTimer } = useSessionTimer(
    sessionDuration,
    status === ConnectionStatus.CONNECTED,
    handleTimerComplete
  );

  // Track if we've shown warnings to avoid duplicates
  const warningShownRef = useRef<{ oneMinute: boolean; thirtySeconds: boolean }>({
    oneMinute: false,
    thirtySeconds: false,
  });

  // Show countdown warnings
  useEffect(() => {
    if (status !== ConnectionStatus.CONNECTED) {
      // Reset warnings when disconnected
      warningShownRef.current = { oneMinute: false, thirtySeconds: false };
      return;
    }

    // Show warning at 1 minute remaining
    if (timeLeft === 60 && !warningShownRef.current.oneMinute) {
      warningShownRef.current.oneMinute = true;
      showToast('1 minute remaining in your session', 'warning', 3000);
    }

    // Show warning at 30 seconds remaining
    if (timeLeft === 30 && !warningShownRef.current.thirtySeconds) {
      warningShownRef.current.thirtySeconds = true;
      showToast('30 seconds remaining', 'warning', 3000);
    }
  }, [timeLeft, status, showToast]);

  // Auto-retry on connection errors
  const attemptReconnect = useCallback(async () => {
    resetTimer();
    const userName = authState.user?.name || 'there';
    await connect(selectedVoice, userName);
  }, [connect, selectedVoice, resetTimer, authState.user?.name]);

  const { retry: autoRetry, reset: resetRetry } = useAutoRetry(attemptReconnect, {
    maxRetries: 2,
    initialDelay: 2000,
    maxDelay: 5000,
  });

  // Auto-retry on error state
  useEffect(() => {
    if (status === ConnectionStatus.ERROR) {
      autoRetry();
    } else {
      resetRetry();
    }
  }, [status, autoRetry, resetRetry]);

  // Main Action: User toggles the session on/off
  const toggleSession = async () => {
    if (status === ConnectionStatus.CONNECTED || status === ConnectionStatus.CONNECTING) {
      // Manual Stop
      resetRetry();
      await completeSession(true, timeLeft);
      resetTimer();
    } else {
      // Check authentication before starting
      if (!authState.isAuthenticated) {
        openModal('auth');
        return;
      }

      // Check session limit for free users (warn before starting)
      const isPremium = authState.user?.isPremium || false;
      if (!isPremium) {
        const limits = getSubscriptionLimits(false);
        const remainingSessions = limits.maxSessions - sessions.length;
        if (remainingSessions <= 0) {
          showToast(
            `You've reached your session limit (${limits.maxSessions} sessions). Upgrade to premium for unlimited sessions.`,
            'warning',
            5000
          );
          openModal('auth'); // Open auth modal to show upgrade option
          return;
        } else if (remainingSessions === 1) {
          showToast(
            'This is your last free session. Upgrade to premium for unlimited sessions.',
            'info',
            4000
          );
        }
      }

      // Start
      resetRetry();
      resetTimer();
      warningShownRef.current = { oneMinute: false, thirtySeconds: false }; // Reset warnings
      const userName = authState.user?.name || 'there';
      await connect(selectedVoice, userName);
    }
  };

  return {
    status,
    audioDataRef,
    isMuted,
    transcripts,
    toggleMute,
    toggleSession,
    reset: disconnect, // Expose disconnect as reset to clear errors
    formattedTime,
    showTimer: status === ConnectionStatus.CONNECTED,
  };
}
