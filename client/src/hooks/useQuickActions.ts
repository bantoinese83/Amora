import { useState, useEffect } from 'react';

/**
 * Hook for managing Quick Actions menu (Command Palette)
 * Opens with Cmd+K (Mac) or Ctrl+K (Windows/Linux)
 */
export function useQuickActions() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K on Mac, Ctrl+K on Windows/Linux
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const isModKey = isMac ? e.metaKey : e.ctrlKey;

      if (isModKey && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }

      // Also close with Escape
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    toggle: () => setIsOpen(prev => !prev),
  };
}
