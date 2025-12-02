import React from 'react';
import { ConnectionStatus } from '../types';
import { MicIcon, MicOffIcon, XIcon } from './common/Icons';

interface ControlBarProps {
  status: ConnectionStatus;
  isMuted: boolean;
  onToggleMute: () => void;
  onDisconnect: () => void;
}

export const ControlBar: React.FC<ControlBarProps> = ({
  status,
  isMuted,
  onToggleMute,
  onDisconnect,
}) => {
  if (status !== ConnectionStatus.CONNECTED) return null;

  // Disable controls if not authenticated (shouldn't happen, but safety check)

  return (
    <div
      className="flex justify-center gap-6 animate-in fade-in slide-in-from-bottom-4"
      role="toolbar"
      aria-label="Session controls"
    >
      <button
        onClick={onToggleMute}
        aria-label={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
        aria-pressed={isMuted}
        className={`p-4 rounded-full border transition-all backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-amora-500 focus:ring-offset-2 ${
          isMuted
            ? 'bg-red-50 border-red-300 text-red-600 hover:bg-red-100'
            : 'bg-white/80 border-slate-200 text-slate-700 hover:bg-white hover:text-slate-900'
        }`}
      >
        {isMuted ? <MicOffIcon /> : <MicIcon />}
      </button>
      <button
        onClick={onDisconnect}
        aria-label="Finish Conversation"
        className="p-4 rounded-full bg-red-50 border border-red-300 text-red-600 hover:bg-red-100 hover:text-red-700 transition-all backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
      >
        <XIcon />
      </button>
    </div>
  );
};
