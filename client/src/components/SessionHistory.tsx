import React from 'react';
import { useApp } from '../context/AppContext';
import { XIcon, DownloadIcon } from './common/Icons';
import { formatDuration, formatDate } from '../utils/formatters';
import { Card } from './common/Card';
import { downloadTranscriptAsText } from '../utils/fileUtils';
import { Session } from '../types';
import { UpgradePrompt } from './UpgradePrompt';
import { getSubscriptionLimits } from '../services/subscriptionService';
import { EmptyState } from './common/EmptyState';

export const SessionHistory: React.FC = () => {
  const { sessions, modals, closeModal, openModal, authState, isLoadingSessions } = useApp();
  const isPremium = authState.user?.isPremium || false;
  const limits = getSubscriptionLimits(isPremium);

  const handleDownload = (e: React.MouseEvent, session: Session) => {
    e.stopPropagation();
    downloadTranscriptAsText(session);
  };

  const handleSessionClick = (session: Session) => {
    openModal('summary', session);
  };

  if (!modals.history) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[59]"
        onClick={() => closeModal('history')}
        aria-hidden="true"
      />
      {/* Sidebar */}
      <div
        className="fixed inset-y-0 left-0 w-80 bg-slate-900 border-r border-slate-800 transform transition-transform duration-300 ease-in-out z-[60] translate-x-0"
        role="dialog"
        aria-label="Your Conversations"
      >
        <div className="p-6 h-full flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-white">Your Journal</h2>
                {!isPremium && (
                  <span
                    className={`px-2 py-0.5 border text-xs rounded-full transition-colors ${
                      sessions.length >= limits.maxSessions
                        ? 'bg-red-500/10 border-red-500/30 text-red-300'
                        : sessions.length >= limits.maxSessions - 1
                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                          : 'bg-slate-800/50 border-slate-700 text-slate-400'
                    }`}
                  >
                    {sessions.length}/{limits.maxSessions} sessions
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                <span>All your therapy, coaching & journaling sessions</span>
              </div>
            </div>
            <button
              onClick={() => closeModal('history')}
              className="text-slate-400 hover:text-white focus:outline-none focus:text-white"
              aria-label="Close History"
            >
              <XIcon />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4">
            {/* Show upgrade prompt if free user has reached session limit */}
            {!isPremium && sessions.length >= limits.maxSessions && (
              <UpgradePrompt
                reason="session_limit"
                currentCount={sessions.length}
                maxCount={limits.maxSessions}
              />
            )}

            {isLoadingSessions ? (
              <div className="space-y-4 py-4">
                {[1, 2, 3].map(i => (
                  <Card key={i} className="animate-pulse">
                    <div className="h-20 bg-slate-800/50 rounded-lg"></div>
                  </Card>
                ))}
              </div>
            ) : sessions.length === 0 ? (
              <EmptyState
                icon={
                  <svg
                    className="w-8 h-8"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                }
                title="Your journal is empty"
                description="Start your first therapy, coaching, or journaling session to see your history here. Every conversation is automatically saved."
                action={
                  !modals.history
                    ? undefined
                    : {
                        label: 'Start a Session',
                        onClick: () => {
                          closeModal('history');
                        },
                      }
                }
              />
            ) : (
              sessions.map(session => (
                <Card
                  key={session.id}
                  onClick={() => handleSessionClick(session)}
                  className="hover:border-amora-500/50 transition-colors cursor-pointer group relative"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm text-amora-300 font-medium">
                      {formatDate(session.date)}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded-full">
                        {formatDuration(session.durationSeconds)}
                      </span>
                      <button
                        onClick={e => handleDownload(e, session)}
                        className="p-1.5 text-slate-500 hover:text-amora-300 hover:bg-slate-700 rounded-full transition-colors"
                        title="Download Conversation"
                        aria-label={`Download conversation from ${formatDate(session.date)}`}
                      >
                        <DownloadIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <p className="text-slate-400 text-sm line-clamp-2 group-hover:text-slate-300">
                    {session.preview}
                  </p>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
};
