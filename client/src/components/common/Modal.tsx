import React, { ReactNode } from 'react';
import { XIcon } from './Icons';

interface ModalProps {
  isOpen: boolean;
  onClose?: (() => void) | undefined;
  children: ReactNode;
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children, className = '' }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div
        className={`bg-slate-900 border border-slate-700 p-6 rounded-2xl shadow-2xl relative ${className}`}
      >
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
            aria-label="Close"
          >
            <XIcon />
          </button>
        )}
        {children}
      </div>
    </div>
  );
};
