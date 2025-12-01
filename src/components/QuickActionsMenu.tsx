import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { XIcon, HistoryIcon, BookIcon, SettingsIcon, DownloadIcon, CopyIcon } from './common/Icons';
import { formatDate } from '../utils/formatters';
import { downloadTranscriptAsText } from '../utils/fileUtils';
import { copyToClipboard, formatTranscriptForSharing } from '../utils/clipboardUtils';

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  shortcut?: string;
  action: () => void;
  category: 'navigation' | 'session' | 'export';
}

export const QuickActionsMenu: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  const { openModal, sessions } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Get recent sessions (last 5)
  const recentSessions = sessions.slice(0, 5);

  const actions: QuickAction[] = [
    {
      id: 'history',
      label: 'View Past Conversations',
      icon: <HistoryIcon />,
      shortcut: 'H',
      action: () => {
        openModal('history');
        onClose();
      },
      category: 'navigation',
    },
    {
      id: 'knowledge',
      label: 'Open Knowledge Base',
      icon: <BookIcon />,
      shortcut: 'K',
      action: () => {
        openModal('knowledge');
        onClose();
      },
      category: 'navigation',
    },
    {
      id: 'settings',
      label: 'Open Settings',
      icon: <SettingsIcon />,
      shortcut: 'S',
      action: () => {
        openModal('settings');
        onClose();
      },
      category: 'navigation',
    },
    ...recentSessions.map((session, idx) => {
      const action: QuickAction = {
        id: `session-${session.id}`,
        label: `View: ${session.preview.slice(0, 40)}...`,
        icon: <HistoryIcon />,
        ...(idx < 9 ? { shortcut: String(idx + 1) } : {}),
        action: () => {
          openModal('summary', session);
          onClose();
        },
        category: 'session' as const,
      };
      return action;
    }),
    ...recentSessions.slice(0, 3).map(session => ({
      id: `download-${session.id}`,
      label: `Save Conversation: ${formatDate(session.date)}`,
      icon: <DownloadIcon />,
      action: () => {
        downloadTranscriptAsText(session);
        onClose();
      },
      category: 'export' as const,
    })),
    ...recentSessions.slice(0, 3).map(session => ({
      id: `copy-${session.id}`,
      label: `Copy Conversation: ${formatDate(session.date)}`,
      icon: copiedId === `copy-${session.id}` ? <CopyIcon /> : <CopyIcon />,
      action: async () => {
        const text = formatTranscriptForSharing(session.transcript);
        const success = await copyToClipboard(text);
        if (success) {
          setCopiedId(`copy-${session.id}`);
          setTimeout(() => setCopiedId(null), 2000);
          onClose();
        }
      },
      category: 'export' as const,
    })),
  ];

  const filteredActions = actions.filter(action =>
    action.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      setSearchQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % filteredActions.length);
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredActions.length) % filteredActions.length);
        return;
      }

      if (e.key === 'Enter' && filteredActions[selectedIndex]) {
        e.preventDefault();
        filteredActions[selectedIndex].action();
        return;
      }

      // Quick shortcuts
      const action = filteredActions.find(
        a => a.shortcut && a.shortcut.toLowerCase() === e.key.toLowerCase()
      );
      if (action && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        action.action();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredActions, selectedIndex, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={menuRef}
        className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden backdrop-blur-xl animate-in fade-in slide-in-from-top-4"
      >
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-slate-800">
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              placeholder="Search actions or type a command..."
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setSelectedIndex(0);
              }}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amora-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white transition-colors"
            aria-label="Close"
          >
            <XIcon />
          </button>
        </div>

        {/* Actions List */}
        <div className="max-h-96 overflow-y-auto">
          {filteredActions.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No actions found</div>
          ) : (
            <div className="p-2">
              {filteredActions.map((action, idx) => (
                <button
                  key={action.id}
                  onClick={action.action}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all
                    ${
                      idx === selectedIndex
                        ? 'bg-amora-500/20 border border-amora-500/30 text-white'
                        : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
                    }
                  `}
                  onMouseEnter={() => setSelectedIndex(idx)}
                >
                  <div className={`${idx === selectedIndex ? 'text-amora-400' : 'text-slate-500'}`}>
                    {action.icon}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{action.label}</div>
                  </div>
                  {action.shortcut && (
                    <div className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded font-mono">
                      {action.shortcut}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-slate-800 text-xs text-slate-500 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>Esc Close</span>
          </div>
          <div className="text-slate-600">
            {filteredActions.length} {filteredActions.length === 1 ? 'action' : 'actions'}
          </div>
        </div>
      </div>
    </div>
  );
};
