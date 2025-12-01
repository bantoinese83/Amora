import { useEffect } from 'react';

export interface ShortcutActions {
  toggleMute?: () => void;
  toggleSession?: () => void;
}

export const useKeyboardShortcuts = (actions: ShortcutActions) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore shortcuts if the user is typing in an input field
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      if (e.code === 'Space') {
        // Prevent scrolling when pressing space
        e.preventDefault();
        actions.toggleMute?.();
      }

      if (e.code === 'Escape') {
        actions.toggleSession?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [actions]);
};
