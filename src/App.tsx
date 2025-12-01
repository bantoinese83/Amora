import { Header } from './components/Header';
import { TranscriptViewer } from './components/TranscriptViewer';
import { VoiceOrb } from './components/VoiceOrb';
import { ControlBar } from './components/ControlBar';
import { BackgroundGlow } from './components/BackgroundGlow';
import { StatusIndicator } from './components/StatusIndicator';
import { ModalManager } from './components/ModalManager';
import { useApp } from './context/AppContext';
import { useSessionWorkflow } from './hooks/useSessionWorkflow';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useQuickActions } from './hooks/useQuickActions';
import { ConnectionStatus } from './types';
import { AlertIcon, XIcon } from './components/common/Icons';
import { QuickActionsMenu } from './components/QuickActionsMenu';

export default function App() {
  const { ragStoreName, openModal, authState } = useApp();

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

  // "Wow" Factor: Keyboard Shortcuts
  useKeyboardShortcuts({
    toggleMute,
    toggleSession,
  });

  // Quick Actions Menu (Command Palette)
  const quickActions = useQuickActions();

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-between p-4 relative overflow-hidden font-sans">
      {/* Optimized Background Animation */}
      <BackgroundGlow audioRef={audioDataRef} status={status} />

      {/* Connection Error Alert */}
      {status === ConnectionStatus.ERROR && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 w-full max-w-md z-50 px-4">
          <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-4 flex items-start gap-3 backdrop-blur-md shadow-lg animate-in fade-in slide-in-from-top-4">
            <div className="text-red-400 mt-0.5">
              <AlertIcon className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className="text-red-200 font-semibold text-sm">Oops, something went wrong</h3>
              <p className="text-red-300/80 text-xs mt-1">
                We're having trouble connecting. Please check your internet and try again.
              </p>
            </div>
            <button
              onClick={reset}
              className="text-red-400 hover:text-red-200 transition-colors p-1"
              aria-label="Close"
            >
              <XIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <Header
        onHistoryClick={() => openModal('history')}
        onKnowledgeClick={() => openModal('knowledge')}
        onSettingsClick={() => openModal('settings')}
        onAuthClick={() => openModal('auth')}
        ragStoreName={ragStoreName}
        authState={authState}
        showTimer={showTimer}
        formattedTime={formattedTime}
      />

      {/* Main Visual Interface */}
      <main className="flex-1 flex flex-col items-center justify-center w-full max-w-2xl z-10 gap-8 min-h-[400px]">
        <TranscriptViewer transcripts={transcripts} status={status} />

        <div className="flex flex-col items-center gap-8">
          <VoiceOrb status={status} audioRef={audioDataRef} onClick={toggleSession} />
          <StatusIndicator
            status={status}
            ragStoreName={ragStoreName}
            {...(status === ConnectionStatus.ERROR ? { onRetry: toggleSession } : {})}
          />
        </div>
      </main>

      {/* Controls Footer */}
      <footer className="w-full max-w-lg z-10 pb-8 min-h-[88px]">
        <ControlBar
          status={status}
          isMuted={isMuted}
          onToggleMute={toggleMute}
          onDisconnect={toggleSession}
        />
        <div className="text-center mt-4 text-xs text-slate-600 opacity-0 hover:opacity-100 transition-opacity select-none">
          Shortcuts: Space to Mute • Esc to Disconnect
        </div>
      </footer>

      {/* Global Modals Manager */}
      <ModalManager />

      {/* Quick Actions Menu (Command Palette) */}
      <QuickActionsMenu isOpen={quickActions.isOpen} onClose={quickActions.close} />
    </div>
  );
}
