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

  return (
    <div className="flex justify-center gap-6 animate-in fade-in slide-in-from-bottom-4">
      <button
        onClick={onToggleMute}
        aria-label={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
        className={`p-4 rounded-full border transition-all ${
          isMuted
            ? 'bg-red-500/20 border-red-500 text-red-500'
            : 'bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white'
        }`}
      >
        {isMuted ? <MicOffIcon /> : <MicIcon />}
      </button>
      <button
        onClick={onDisconnect}
        aria-label="Finish Conversation"
        className="p-4 rounded-full bg-red-500/20 border border-red-500 text-red-500 hover:bg-red-500 hover:text-white transition-all"
      >
        <XIcon />
      </button>
    </div>
  );
};
