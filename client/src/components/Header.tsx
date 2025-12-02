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
    <header className="w-full max-w-4xl flex justify-between items-center z-10 p-4">
      <div className="flex items-center gap-4">
        <button
          id="onboarding-history-btn"
          onClick={onHistoryClick}
          className="p-2 text-slate-400 hover:text-white transition-colors"
          title="Your Conversations"
          aria-label="View your past conversations"
        >
          <HistoryIcon />
        </button>

        <button
          onClick={onSettingsClick}
          className="p-2 text-slate-400 hover:text-white transition-colors"
          title="Voice Settings"
          aria-label="Open Voice Settings"
        >
          <SettingsIcon />
        </button>

        <div className="flex items-center gap-3 select-none group">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amora-500 to-pink-500 flex items-center justify-center font-bold text-white text-lg shadow-lg shadow-amora-500/30">
            A
          </div>
          <div className="hidden sm:block">
            <span className="font-semibold text-xl tracking-tight text-white block">
              Amora
            </span>
            <span className="text-[10px] text-slate-400 font-medium tracking-wide uppercase">
              Therapist • Coach • Journal
            </span>
          </div>
        </div>
      </div>

      {/* Timer Display */}
      {showTimer && (
        <div className="absolute left-1/2 -translate-x-1/2 top-8 bg-slate-900/80 backdrop-blur border border-slate-700 px-4 py-1 rounded-full text-amora-300 font-mono text-sm shadow-sm animate-in fade-in slide-in-from-top-2">
          {formattedTime}
        </div>
      )}

      {/* Network Status Indicator */}
      {!isOnline && (
        <div className="absolute left-1/2 -translate-x-1/2 top-20 bg-red-500/10 border border-red-500/30 px-3 py-1 rounded-full text-red-300 text-xs font-medium animate-in fade-in slide-in-from-top-2 flex items-center gap-2">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          Offline
        </div>
      )}
      {isOnline && networkStatus === 'slow' && (
        <div className="absolute left-1/2 -translate-x-1/2 top-20 bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-full text-amber-300 text-xs font-medium animate-in fade-in slide-in-from-top-2 flex items-center gap-2">
          <div className="w-2 h-2 bg-amber-500 rounded-full" />
          Slow connection
        </div>
      )}

      {/* Quick Actions Hint */}
      <div className="absolute left-1/2 -translate-x-1/2 bottom-4 hidden md:flex items-center gap-2 text-xs text-slate-600 bg-slate-900/60 backdrop-blur border border-slate-800 px-3 py-1.5 rounded-full">
        <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-400 font-mono text-[10px]">
          {navigator.platform.toUpperCase().indexOf('MAC') >= 0 ? '⌘' : 'Ctrl'}K
        </kbd>
        <span>Quick Actions</span>
      </div>

      {/* User Profile / Auth */}
      {isAuthenticated && user ? (
        <button
          onClick={onAuthClick}
          className="flex items-center gap-3 pl-3 pr-1 py-1 bg-slate-800/40 hover:bg-slate-800/60 border border-slate-700 rounded-full transition-all group"
          aria-label="Manage Profile"
        >
          <div className="hidden sm:flex flex-col items-end">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-slate-200 group-hover:text-white transition-colors">
                {user.name}
              </span>
              {user.isPremium && (
                <span className="px-1.5 py-0.5 bg-gradient-to-r from-amora-500 to-pink-500 text-white text-[10px] font-bold rounded-full leading-none">
                  PRO
                </span>
              )}
            </div>
            <span className="text-[10px] text-slate-500 font-mono group-hover:text-slate-400 transition-colors">
              {user.email}
            </span>
          </div>
          <div
            className={`w-8 h-8 rounded-full border flex items-center justify-center text-xs font-bold text-white shadow-sm transition-colors ${
              user.isPremium
                ? 'bg-gradient-to-tr from-amora-500 to-pink-500 border-amora-400 group-hover:border-amora-300'
                : 'bg-gradient-to-tr from-slate-700 to-slate-600 border-slate-500 group-hover:border-amora-400'
            }`}
          >
            {user.name.charAt(0)}
          </div>
        </button>
      ) : (
        <button
          onClick={onAuthClick}
          className="bg-slate-800/50 hover:bg-slate-800 border border-slate-700 text-slate-300 px-4 py-2 rounded-full text-sm font-medium transition-colors backdrop-blur-sm focus:ring-2 focus:ring-amora-500 focus:outline-none"
          aria-label="Sign In"
        >
          Sign In
        </button>
      )}
    </header>
  );
};
