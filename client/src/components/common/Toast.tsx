import React, { useEffect } from 'react';
import { CheckCircleIcon, XCircleIcon, InfoIcon, AlertIcon, XIcon } from './Icons';
import type { Toast } from '../../context/AppContext';

interface ToastProps {
  toast: Toast;
  onClose: (id: string) => void;
}

export const ToastNotification: React.FC<ToastProps> = ({ toast, onClose }) => {
  useEffect(() => {
    const duration = toast.duration ?? 4000;
    const timer = setTimeout(() => {
      onClose(toast.id);
    }, duration);

    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onClose]);

  const getConfig = () => {
    switch (toast.type) {
      case 'success':
        return {
          icon: CheckCircleIcon,
          bg: 'bg-green-50',
          border: 'border-green-200',
          text: 'text-green-700',
          iconColor: 'text-green-600',
        };
      case 'error':
        return {
          icon: XCircleIcon,
          bg: 'bg-red-50',
          border: 'border-red-200',
          text: 'text-red-700',
          iconColor: 'text-red-600',
        };
      case 'warning':
        return {
          icon: AlertIcon,
          bg: 'bg-amber-50',
          border: 'border-amber-200',
          text: 'text-amber-700',
          iconColor: 'text-amber-600',
        };
      case 'info':
      default:
        return {
          icon: InfoIcon,
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          text: 'text-blue-700',
          iconColor: 'text-blue-600',
        };
    }
  };

  const config = getConfig();
  const Icon = config.icon;

  return (
    <div
      className={`
        ${config.bg} ${config.border} ${config.text}
        border rounded-xl p-4 shadow-lg backdrop-blur-md
        flex items-start gap-3 w-full
        transition-all duration-300 hover:shadow-xl
      `}
      role="alert"
      aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
    >
      <Icon className={`w-5 h-5 ${config.iconColor} flex-shrink-0 mt-0.5`} />
      <p className="flex-1 text-sm leading-relaxed">{toast.message}</p>
      <button
        onClick={() => onClose(toast.id)}
        className={`${config.iconColor} hover:opacity-70 transition-opacity flex-shrink-0`}
        aria-label="Close notification"
      >
        <XIcon className="w-4 h-4" />
      </button>
    </div>
  );
};

interface ToastContainerProps {
  toasts: Toast[];
  onClose: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onClose }) => {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed top-24 right-4 z-[100] flex flex-col gap-3 pointer-events-none max-w-md w-full px-4 sm:px-0"
      role="region"
      aria-label="Notifications"
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map((toast, index) => (
        <div
          key={toast.id}
          className="pointer-events-auto animate-in fade-in slide-in-from-right-4"
          style={{
            animationDelay: `${index * 50}ms`,
          }}
        >
          <ToastNotification toast={toast} onClose={onClose} />
        </div>
      ))}
    </div>
  );
};
