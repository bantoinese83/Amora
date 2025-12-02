import React, { useState } from 'react';
import { MessageLog } from '../../types';
import { CopyIcon, CheckIcon } from './Icons';

interface MessageBubbleProps {
  message: MessageLog;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.role === 'user';
  const [isCopied, setIsCopied] = useState(false);

  const bubbleStyles = isUser
    ? 'bg-white/80 text-slate-900 border border-slate-200 backdrop-blur-sm'
    : 'bg-amora-50 text-amora-900 border border-amora-200 backdrop-blur-sm';

  const handleCopy = () => {
    navigator.clipboard.writeText(message.text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300 group`}
    >
      <div
        className={`relative max-w-[80%] rounded-xl px-4 py-2 text-lg ${bubbleStyles} shadow-sm`}
      >
        {message.text}

        {/* Copy Button (Visible on Hover) */}
        <button
          onClick={handleCopy}
          className={`absolute top-2 ${isUser ? '-left-8' : '-right-8'} p-1.5 rounded-full bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 opacity-0 group-hover:opacity-100 transition-all duration-200 scale-90 hover:scale-100 shadow-sm`}
          title="Copy text"
        >
          {isCopied ? (
            <CheckIcon className="w-3 h-3 text-green-600" />
          ) : (
            <CopyIcon className="w-3 h-3" />
          )}
        </button>
      </div>
    </div>
  );
};
