import React, { ReactNode, useEffect, useRef } from 'react';
import { XIcon } from './Icons';

interface ModalProps {
  isOpen: boolean;
  onClose?: (() => void) | undefined;
  children: ReactNode;
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children, className = '' }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Focus trap and management
  useEffect(() => {
    if (!isOpen) return;

    // Store the previously focused element
    previousActiveElement.current = document.activeElement as HTMLElement;

    // Focus the modal
    const focusableElements = modalRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements?.[0] as HTMLElement;
    firstElement?.focus();

    // Handle Escape key
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);

    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
      // Restore focus to previous element
      previousActiveElement.current?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm p-4 animate-in fade-in"
      onClick={e => {
        if (e.target === e.currentTarget && onClose) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        ref={modalRef}
        className={`bg-white border border-slate-200 p-8 rounded-2xl shadow-xl relative animate-in fade-in slide-in-from-bottom-4 max-h-[90vh] overflow-y-auto ${className}`}
      >
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-amora-500 rounded-lg p-1"
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
