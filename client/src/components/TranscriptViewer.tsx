import React from 'react';
import { MessageLog, ConnectionStatus } from '../types';
import { useAutoScroll } from '../hooks/useAutoScroll';
import { MessageBubble } from './common/MessageBubble';

interface TranscriptViewerProps {
  transcripts: MessageLog[];
  status: ConnectionStatus;
}

const STARTERS = [
  "I'm feeling a bit overwhelmed.",
  'I had a conflict with a friend.',
  'I want to work on my goals.',
  "I need to process what happened today.",
];

export const TranscriptViewer: React.FC<TranscriptViewerProps> = ({ transcripts, status }) => {
  const transcriptContainerRef = useAutoScroll(transcripts);
  const isConnected = status === ConnectionStatus.CONNECTED;

  return (
    <div className="w-full h-48 relative">
      <div
        ref={transcriptContainerRef}
        className="absolute inset-0 overflow-y-auto space-y-4 px-4 scroll-smooth"
        style={{
          maskImage: 'linear-gradient(to bottom, transparent, black 20%, black 80%, transparent)',
        }}
      >
        {transcripts.length === 0 && isConnected && (
          <div className="h-full flex flex-col items-center justify-center animate-in fade-in duration-700">
            <p className="text-slate-500 mb-4 text-sm font-medium">Start your conversation...</p>
            <div className="flex flex-wrap justify-center gap-2 max-w-md mb-3">
              {STARTERS.map((text, i) => (
                <div
                  key={i}
                  className="bg-slate-800/50 border border-slate-700 px-3 py-1.5 rounded-full text-xs text-slate-300 pointer-events-none select-none"
                >
                  "{text}"
                </div>
              ))}
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-600 mt-2">
              <span>🛋️ Therapist</span>
              <span>•</span>
              <span>🎯 Coach</span>
              <span>•</span>
              <span>📔 Journal</span>
            </div>
          </div>
        )}

        {transcripts.length === 0 && status === ConnectionStatus.CONNECTING && (
          <p className="text-center text-slate-500 animate-pulse mt-20">Getting ready...</p>
        )}

        {transcripts.map(msg => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
      </div>
    </div>
  );
};
