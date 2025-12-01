import React from 'react';
import { ConnectionStatus } from '../types';

interface StatusIndicatorProps {
  status: ConnectionStatus;
  onRetry?: (() => void) | undefined;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status, onRetry }) => {
  const getStatusConfig = () => {
    switch (status) {
      case ConnectionStatus.DISCONNECTED:
        return {
          text: 'Ready',
          subtext: 'Tap orb to start',
          containerClass: 'bg-slate-800/40 border-slate-700/50 text-slate-400',
          indicatorClass: 'bg-slate-500',
        };
      case ConnectionStatus.CONNECTING:
        return {
          text: 'Getting ready...',
          subtext: 'Just a moment',
          containerClass: 'bg-amber-500/10 border-amber-500/20 text-amber-200',
          indicatorClass: 'bg-amber-400 animate-ping',
        };
      case ConnectionStatus.CONNECTED:
        return {
          text: 'Amora is listening',
          subtext: 'Ready to talk',
          containerClass:
            'bg-amora-500/10 border-amora-500/20 text-amora-200 shadow-[0_0_15px_rgba(139,92,246,0.15)]',
          indicatorClass: 'bg-amora-400 animate-pulse',
        };
      case ConnectionStatus.ERROR:
        return {
          text: 'Something went wrong',
          subtext: 'Tap to try again',
          containerClass: 'bg-red-500/10 border-red-500/20 text-red-300',
          indicatorClass: 'bg-red-500',
        };
      default:
        return { text: '', subtext: '', containerClass: '', indicatorClass: '' };
    }
  };

  const config = getStatusConfig();

  const isClickable = status === ConnectionStatus.ERROR && onRetry;

  return (
    <div
      onClick={isClickable ? onRetry : undefined}
      className={`
        flex items-center gap-3 px-5 py-2.5 rounded-full border backdrop-blur-md transition-all duration-500
        ${config.containerClass}
        ${isClickable ? 'cursor-pointer hover:scale-105 active:scale-95 hover:shadow-lg' : ''}
      `}
      role={isClickable ? 'button' : undefined}
      aria-label={isClickable ? 'Try again' : undefined}
    >
      <div className="relative flex items-center justify-center w-2.5 h-2.5">
        <span
          className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${config.indicatorClass}`}
        />
        <span
          className={`relative inline-flex rounded-full h-2 w-2 ${config.indicatorClass.split(' ')[0]}`}
        />
      </div>

      <div className="flex flex-col leading-none">
        <span className="text-sm font-medium tracking-wide">{config.text}</span>
        {config.subtext && (
          <div className="flex items-center gap-1 mt-1 text-[10px] opacity-70 uppercase tracking-wider font-semibold">
            <span>{config.subtext}</span>
          </div>
        )}
      </div>
    </div>
  );
};
