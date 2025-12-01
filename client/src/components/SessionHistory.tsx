import React from 'react';
import { useApp } from '../context/AppContext';
import { XIcon, DownloadIcon } from './common/Icons';
import { formatDuration, formatDate } from '../utils/formatters';
import { Card } from './common/Card';
import { downloadTranscriptAsText } from '../utils/fileUtils';
import { Session } from '../types';
import { UpgradePrompt } from './UpgradePrompt';
import { getSubscriptionLimits } from '../services/subscriptionService';

export const SessionHistory: React.FC = () => {
  const { sessions, modals, closeModal, openModal, authState } = useApp();
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
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-xl font-bold text-white">History</h2>
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

            {sessions.length === 0 ? (
              <p className="text-slate-500 text-center mt-10">No conversations yet.</p>
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
