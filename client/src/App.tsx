import React from 'react';
import { useSpring } from '@react-spring/core';
import { a } from '@react-spring/web';
import { Header } from './components/Header';
import { ControlBar } from './components/ControlBar';
import { StatusIndicator } from './components/StatusIndicator';
import { ModalManager } from './components/ModalManager';
import { Overlay } from './components/Overlay';
import { Scene } from './components/Scene';
import { useApp } from './context/AppContext';
import { useSessionWorkflow } from './hooks/useSessionWorkflow';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useQuickActions } from './hooks/useQuickActions';
import { useNetworkStatus } from './hooks/useNetworkStatus';
import { ConnectionStatus } from './types';
import { AlertIcon, XIcon } from './components/common/Icons';
import { QuickActionsMenu } from './components/QuickActionsMenu';

export default function App() {
  const { openModal, authState, showToast } = useApp();
  const { isOnline, networkStatus } = useNetworkStatus();

  // Use the orchestration hook to handle business logic
  const {
    status,
    audioDataRef,
    isMuted,
    transcripts,
    toggleMute,
    toggleSession,
    reset,
    formattedTime,
    showTimer,
  } = useSessionWorkflow();

  // Spring for background and text color
  const [{ background, fill }, setBg] = useSpring({ background: '#f0f0f0', fill: '#202020' }, []);

  const isConnected = status === ConnectionStatus.CONNECTED;

  // Disconnect active session when user logs out
  React.useEffect(() => {
    if (
      !authState.isAuthenticated &&
      (status === ConnectionStatus.CONNECTED || status === ConnectionStatus.CONNECTING)
    ) {
      reset();
    }
  }, [authState.isAuthenticated, status, reset]);

  // Show offline notification
  React.useEffect(() => {
    if (!isOnline) {
      showToast('You are offline. Please check your internet connection.', 'warning', 5000);
    } else if (networkStatus === 'slow') {
      showToast('Your connection is slow. Some features may not work properly.', 'info', 4000);
    }
  }, [isOnline, networkStatus, showToast]);

  // "Wow" Factor: Keyboard Shortcuts
  useKeyboardShortcuts({
    toggleMute,
    toggleSession,
  });

  // Quick Actions Menu (Command Palette)
  const quickActions = useQuickActions();

  return (
    <a.main style={{ background }} className="relative">
      {/* Connection Error Alert */}
      {status === ConnectionStatus.ERROR && (
        <div
          className="absolute top-24 left-1/2 -translate-x-1/2 w-full max-w-md z-50 px-4"
          role="alert"
          aria-live="assertive"
        >
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 backdrop-blur-md shadow-lg animate-in fade-in slide-in-from-top-4">
            <div className="text-red-600 mt-0.5 flex-shrink-0">
              <AlertIcon className="w-5 h-5" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-red-700 font-semibold text-sm">Connection issue</h3>
              <p className="text-red-600/80 text-xs mt-1">
                We're having trouble connecting. Please check your internet connection and try again.
              </p>
              <button
                onClick={toggleSession}
                className="mt-3 text-xs font-medium text-red-700 hover:text-red-800 underline focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 rounded px-1"
              >
                Try again
              </button>
            </div>
            <button
              onClick={reset}
              className="text-red-600 hover:text-red-700 transition-colors p-1 flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 rounded"
              aria-label="Dismiss error message"
            >
              <XIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-50">
        <Header
          onHistoryClick={() => openModal('history')}
          onSettingsClick={() => openModal('settings')}
          onAuthClick={() => openModal('auth')}
          authState={authState}
          showTimer={showTimer}
          formattedTime={formattedTime}
        />
      </div>

      {/* Split Screen Layout */}
      <main className="flex flex-row w-full h-screen">
        <Overlay fill={fill} transcripts={transcripts} />
        <Scene
          audioRef={audioDataRef}
          isActive={isConnected}
          onClick={authState.isAuthenticated ? toggleSession : undefined}
          setBg={setBg}
          transcripts={transcripts}
        />
      </main>

      {/* Controls Footer - Floating */}
      {isConnected && (
        <footer className="absolute bottom-8 left-1/2 -translate-x-1/2 z-40">
          <ControlBar
            status={status}
            isMuted={isMuted}
            onToggleMute={toggleMute}
            onDisconnect={toggleSession}
          />
        </footer>
      )}

      {/* Status Indicator - Floating */}
      {!isConnected && (
        <div className="absolute bottom-32 left-1/2 -translate-x-1/2 z-40">
          <StatusIndicator
            status={status}
            {...(status === ConnectionStatus.ERROR ? { onRetry: toggleSession } : {})}
          />
        </div>
      )}

      {/* Global Modals Manager */}
      <ModalManager />

      {/* Quick Actions Menu (Command Palette) */}
      <QuickActionsMenu isOpen={quickActions.isOpen} onClose={quickActions.close} />
    </a.main>
  );
}
