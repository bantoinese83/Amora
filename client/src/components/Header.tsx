import React from 'react';
import { AuthState } from '../types';
import { HistoryIcon, SettingsIcon } from './common/Icons';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

interface HeaderProps {
  onHistoryClick: () => void;
  onSettingsClick: () => void;
  onAuthClick: () => void;
  authState: AuthState;
  showTimer: boolean;
  formattedTime: string;
}

export const Header: React.FC<HeaderProps> = ({
  onHistoryClick,
  onSettingsClick,
  onAuthClick,
  authState,
  showTimer,
  formattedTime,
}) => {
  const { isAuthenticated, user } = authState;
  const { isOnline, networkStatus } = useNetworkStatus();

  return (
    <header className="w-full flex justify-between items-center z-50 p-6 absolute top-0 left-0 right-0">
      <div className="flex items-center gap-4">
        <button
          id="onboarding-history-btn"
          onClick={onHistoryClick}
          className="p-2 text-slate-600 hover:text-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-amora-500 focus:ring-offset-2 rounded-lg"
          title="Your Conversations"
          aria-label="View your past conversations"
        >
          <HistoryIcon />
        </button>

        <button
          onClick={onSettingsClick}
          className="p-2 text-slate-600 hover:text-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-amora-500 focus:ring-offset-2 rounded-lg"
          title="Voice Settings"
          aria-label="Open Voice Settings"
        >
          <SettingsIcon />
        </button>

        <div className="flex items-center gap-3 select-none group">
          <div className="w-8 h-8 rounded-full bg-amora-500 flex items-center justify-center font-bold text-white text-lg">
            A
          </div>
          <div className="hidden sm:block">
            <span className="font-semibold text-xl tracking-tight text-slate-900 block">Amora</span>
            <span className="text-[10px] text-slate-500 font-medium tracking-wide uppercase">
              Therapist • Coach • Journal
            </span>
          </div>
        </div>
      </div>

      {/* Timer Display */}
      {showTimer && (
        <div
          className="absolute left-1/2 -translate-x-1/2 top-16 bg-white/80 backdrop-blur border border-slate-200 px-4 py-1 rounded-full text-slate-700 font-mono text-sm shadow-sm animate-in fade-in slide-in-from-top-2"
          role="timer"
          aria-live="polite"
          aria-label={`Session time: ${formattedTime}`}
        >
          {formattedTime}
        </div>
      )}

      {/* Network Status Indicator */}
      {!isOnline && (
        <div
          className="absolute left-1/2 -translate-x-1/2 top-24 bg-red-50 border border-red-200 px-3 py-1 rounded-full text-red-600 text-xs font-medium animate-in fade-in slide-in-from-top-2 flex items-center gap-2"
          role="status"
          aria-live="assertive"
          aria-label="Network status: Offline"
        >
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" aria-hidden="true" />
          Offline
        </div>
      )}
      {isOnline && networkStatus === 'slow' && (
        <div
          className="absolute left-1/2 -translate-x-1/2 top-24 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full text-amber-600 text-xs font-medium animate-in fade-in slide-in-from-top-2 flex items-center gap-2"
          role="status"
          aria-live="polite"
          aria-label="Network status: Slow connection"
        >
          <div className="w-2 h-2 bg-amber-500 rounded-full" aria-hidden="true" />
          Slow connection
        </div>
      )}

      {/* User Profile / Auth */}
      {isAuthenticated && user ? (
        <button
          onClick={onAuthClick}
          className="flex items-center gap-3 pl-3 pr-1 py-1 bg-white/80 hover:bg-white border border-slate-200 rounded-full transition-all group backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-amora-500 focus:ring-offset-2"
          aria-label={`Manage Profile${user.isPremium ? ' - Premium User' : ''}`}
        >
          <div className="hidden sm:flex flex-col items-end">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-slate-900 group-hover:text-amora-600 transition-colors">
                {user.name}
              </span>
              {user.isPremium && (
                <span className="px-1.5 py-0.5 bg-amora-500 text-white text-[10px] font-bold rounded-full leading-none">
                  PRO
                </span>
              )}
            </div>
            <span className="text-[10px] text-slate-500 font-mono group-hover:text-slate-700 transition-colors">
              {user.email}
            </span>
          </div>
          <div
            className={`w-8 h-8 rounded-full border flex items-center justify-center text-xs font-bold text-white shadow-sm transition-colors ${
              user.isPremium
                ? 'bg-amora-500 border-amora-400 group-hover:border-amora-300'
                : 'bg-slate-600 border-slate-400 group-hover:border-amora-400'
            }`}
          >
            {user.name.charAt(0)}
          </div>
        </button>
      ) : (
        <button
          onClick={onAuthClick}
          className="bg-white/80 hover:bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-full text-sm font-medium transition-colors backdrop-blur-sm focus:ring-2 focus:ring-amora-500 focus:outline-none"
          aria-label="Sign In"
        >
          Sign In
        </button>
      )}
    </header>
  );
};
