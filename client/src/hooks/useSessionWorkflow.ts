import { useCallback, useEffect } from 'react';
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
  const { selectedVoice, saveNewSession, openModal, authState } = useApp();

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
    [disconnect, transcripts, saveNewSession, openModal]
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

  // Auto-retry on connection errors
  const attemptReconnect = useCallback(async () => {
    resetTimer();
    await connect(selectedVoice);
  }, [connect, selectedVoice, resetTimer]);

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
      // Start
      resetRetry();
      resetTimer();
      await connect(selectedVoice);
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
