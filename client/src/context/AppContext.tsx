import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
  useRef,
} from 'react';
import { AuthState, Session, AudioChunk, MessageLog } from '../types';
import {
  getSessions,
  createSession as createSessionAPI,
  updateSession as updateSessionAPI,
  deleteSession as deleteSessionAPI,
} from '../services/sessionService';
import { preferencesRepository } from '@shared/repositories/preferencesRepository';
import { getUser, type User } from '../services/authService';
import { getSubscriptionLimits } from '@shared/services/subscriptionService';
import { logger } from '../utils/logger';

interface ModalState {
  auth: boolean;
  history: boolean;
  settings: boolean;
  summary: Session | null;
}

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

interface AppContextType {
  // Auth
  authState: AuthState;
  login: (email: string, pin: string, name?: string, user?: User) => Promise<void>;
  logout: () => void;

  // Modals
  modals: ModalState;
  openModal: (key: keyof ModalState, data?: unknown) => void;
  closeModal: (key: keyof ModalState) => void;

  // Voice Settings
  selectedVoice: string;
  setSelectedVoice: (voice: string) => Promise<void>;

  // Sessions
  sessions: Session[];
  isLoadingSessions: boolean;
  saveNewSession: (
    transcript: MessageLog[],
    duration: number,
    audioChunks?: AudioChunk[]
  ) => Promise<Session | null>;
  updateSession: (id: string, updates: Partial<Session>) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  refreshSessions: () => Promise<void>;

  // Toasts
  toasts: Toast[];
  showToast: (message: string, type?: Toast['type'], duration?: number) => void;
  removeToast: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEY_USER_ID = 'amora_user_id';

/**
 * Safe localStorage operations with error handling
 */
// Safe localStorage wrapper - errors are logged but don't break the app
const safeLocalStorage = {
  getItem: (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch {
      // Silent fail for localStorage - errors are expected in some browsers/contexts
      return null;
    }
  },
  setItem: (key: string, value: string): boolean => {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch {
      // Silent fail for localStorage - errors are expected in some browsers/contexts
      return false;
    }
  },
  removeItem: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch {
      // Silent fail for localStorage - errors are expected in some browsers/contexts
    }
  },
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Auth State
  const [authState, setAuthState] = useState<AuthState>({ isAuthenticated: false });
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true); // Track if we're checking stored user

  // Modal State
  const [modals, setModals] = useState<ModalState>({
    auth: false, // Will be set after checking localStorage
    history: false,
    settings: false,
    summary: null,
  });

  // Voice State
  const [selectedVoice, setSelectedVoiceState] = useState<string>('Kore');

  // Session State
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);

  // Toast State
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Prevent concurrent operations
  const loginInProgress = useRef(false);
  const loadingUserRef = useRef(false);

  // Load user from storage on mount
  useEffect(() => {
    const loadStoredUser = async () => {
      // Prevent concurrent loads
      if (loadingUserRef.current) {
        return;
      }

      loadingUserRef.current = true;

      try {
        const storedUserId = safeLocalStorage.getItem(STORAGE_KEY_USER_ID);
        if (!storedUserId || storedUserId.trim() === '') {
          // No stored user, show auth modal
          setIsLoadingAuth(false);
          setModals(prev => ({ ...prev, auth: true }));
          loadingUserRef.current = false;
          return;
        }

        // Validate UUID format before querying
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(storedUserId)) {
          logger.warn('Invalid user ID format in storage, clearing', { storedUserId });
          safeLocalStorage.removeItem(STORAGE_KEY_USER_ID);
          setIsLoadingAuth(false);
          setModals(prev => ({ ...prev, auth: true }));
          loadingUserRef.current = false;
          return;
        }

        const user = await getUser(storedUserId);
        if (user) {
          setCurrentUserId(user.id);
          setAuthState({
            isAuthenticated: true,
            user: {
              id: user.id,
              name: user.name || 'User',
              email: user.email || '',
              isPremium: user.is_premium || false,
            },
          });
          setSelectedVoiceState(user.selected_voice || 'Kore');
          setModals(prev => ({ ...prev, auth: false }));
          // Load sessions
          await loadSessions(user.id);
        } else {
          // User not found, clear storage and show auth modal
          safeLocalStorage.removeItem(STORAGE_KEY_USER_ID);
          setModals(prev => ({ ...prev, auth: true }));
        }
      } catch (error) {
        logger.error('Failed to load stored user', {}, error instanceof Error ? error : undefined);
        safeLocalStorage.removeItem(STORAGE_KEY_USER_ID);
        setModals(prev => ({ ...prev, auth: true }));
      } finally {
        setIsLoadingAuth(false);
        loadingUserRef.current = false;
      }
    };

    loadStoredUser();
  }, []);

  // Load sessions from API
  const loadSessions = useCallback(async (userId: string) => {
    if (!userId || userId.trim() === '') {
      setSessions([]);
      return;
    }

    setIsLoadingSessions(true);
    try {
      const userSessions = await getSessions(userId);
      // Filter out any null sessions from mapping errors
      setSessions(userSessions.filter((s): s is Session => s !== null));
    } catch (error) {
      logger.error(
        'Failed to load sessions',
        { userId },
        error instanceof Error ? error : undefined
      );
      setSessions([]);
    } finally {
      setIsLoadingSessions(false);
    }
  }, []);

  // Toast management (defined before login to avoid hoisting issues)
  const showToast = useCallback(
    (message: string, type: Toast['type'] = 'info', duration?: number) => {
      const id = `toast-${Date.now()}-${Math.random()}`;
      const newToast: Toast = { id, message, type, duration };
      setToasts(prev => [...prev, newToast]);
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  // Login function - accepts user object directly (from authService)
  const login = useCallback(
    async (_email: string, _pin: string, _name?: string, user?: User) => {
      // Prevent concurrent login attempts
      if (loginInProgress.current) {
        throw new Error('Login already in progress. Please wait.');
      }

      // If user is provided, use it directly (from authService)
      // Otherwise, this is a legacy call and should not be used
      if (!user) {
        throw new Error('User object is required. Use authService methods instead.');
      }

      loginInProgress.current = true;

      try {
        // User already authenticated via API, use it directly
        const userWithPrefs = user;

        // Store user ID
        setCurrentUserId(user.id);
        const stored = safeLocalStorage.setItem(STORAGE_KEY_USER_ID, user.id);
        if (!stored) {
          logger.warn('Failed to store user ID in localStorage, but continuing', {
            userId: user.id,
          });
        }

        // Update auth state
        setAuthState({
          isAuthenticated: true,
          user: {
            id: user.id,
            name: user.name || 'User',
            email: user.email || '',
            isPremium: user.is_premium || false,
          },
        });

        // Load preferences
        setSelectedVoiceState(userWithPrefs.selected_voice || 'Kore');

        // Load sessions (don't await to avoid blocking)
        loadSessions(user.id).catch(error => {
          logger.error(
            'Failed to load sessions after login',
            { userId: user.id },
            error instanceof Error ? error : undefined
          );
        });

        // Close auth modal
        setModals(prev => ({ ...prev, auth: false }));

        // Show welcome message
        showToast(`Welcome${user.name ? `, ${user.name}` : ''}! 👋`, 'success', 3000);
      } catch (error) {
        // Reset state on error
        setCurrentUserId(null);
        safeLocalStorage.removeItem(STORAGE_KEY_USER_ID);
        throw error;
      } finally {
        loginInProgress.current = false;
      }
    },
    [loadSessions, showToast]
  );

  // Logout function
  const logout = useCallback(() => {
    setCurrentUserId(null);
    setAuthState({ isAuthenticated: false });
    setSessions([]);
    setSelectedVoiceState('Kore');
    safeLocalStorage.removeItem(STORAGE_KEY_USER_ID);
    setModals(prev => ({ ...prev, auth: true }));
    // Note: Active voice sessions should be disconnected by the component
    // that manages the voice client (useSessionWorkflow)
  }, []);

  const openModal = useCallback((key: keyof ModalState, data?: unknown) => {
    setModals(prev => ({ ...prev, [key]: data !== undefined ? data : true }));
  }, []);

  const closeModal = useCallback((key: keyof ModalState) => {
    setModals(prev => ({ ...prev, [key]: key === 'summary' ? null : false }));
  }, []);

  const setSelectedVoice = useCallback(
    async (voice: string) => {
      if (!currentUserId) {
        logger.warn('Cannot set voice: no user logged in', {});
        return;
      }

      if (!voice || typeof voice !== 'string' || voice.trim() === '') {
        logger.warn('Invalid voice selection', { voice });
        return;
      }

      const previousVoice = selectedVoice;
      setSelectedVoiceState(voice);

      try {
        await preferencesRepository.setSelectedVoice(currentUserId, voice);
        logger.info('Voice preference saved', { userId: currentUserId, voice });
      } catch (error) {
        logger.error(
          'Failed to save voice preference',
          { userId: currentUserId, voice },
          error instanceof Error ? error : undefined
        );
        // Revert on error
        setSelectedVoiceState(previousVoice);
        // Try to load saved preference
        try {
          const saved = await preferencesRepository.getSelectedVoice(currentUserId);
          if (saved) setSelectedVoiceState(saved);
        } catch (loadError) {
          logger.error(
            'Failed to load saved voice preference',
            { userId: currentUserId },
            loadError instanceof Error ? loadError : undefined
          );
        }
      }
    },
    [currentUserId, selectedVoice]
  );

  const saveNewSession = useCallback(
    async (
      transcript: MessageLog[],
      duration: number,
      audioChunks?: AudioChunk[]
    ): Promise<Session | null> => {
      if (!currentUserId) {
        logger.warn('Cannot save session: no user logged in', {});
        return null;
      }

      // Feature gating: Check subscription limits
      const isPremium = authState.user?.isPremium || false;
      const limits = getSubscriptionLimits(isPremium);

      // Check session count limit for free users
      if (!isPremium && sessions.length >= limits.maxSessions) {
        logger.warn('Session limit reached', {
          userId: currentUserId,
          currentCount: sessions.length,
          maxSessions: limits.maxSessions,
        });
        openModal('auth'); // Open auth modal to show upgrade option
        return null;
      }

      // Check session duration limit
      if (duration > limits.maxSessionDuration) {
        logger.warn('Session duration exceeds limit', {
          userId: currentUserId,
          duration,
          maxDuration: limits.maxSessionDuration,
        });
        // Still save the session but truncate duration
        duration = limits.maxSessionDuration;
      }

      // Validate inputs
      if (!Array.isArray(transcript) || transcript.length === 0) {
        logger.warn('Cannot save session: empty transcript', { userId: currentUserId });
        return null;
      }

      if (typeof duration !== 'number' || !isFinite(duration) || duration < 0) {
        logger.warn('Cannot save session: invalid duration', { userId: currentUserId, duration });
        return null;
      }

      try {
        const newSession = await createSessionAPI(currentUserId, transcript, duration, audioChunks);

        if (newSession) {
          setSessions(prev => [newSession, ...prev]);
          logger.info('Session saved successfully', {
            userId: currentUserId,
            sessionId: newSession.id,
            duration,
          });
          // Show success toast
          showToast('Conversation saved successfully!', 'success');
        }

        return newSession;
      } catch (error) {
        logger.error(
          'Failed to save session',
          { userId: currentUserId, duration },
          error instanceof Error ? error : undefined
        );
        showToast("We couldn't save your conversation. Please try again.", 'error');
        return null;
      }
    },
    [currentUserId, authState.user?.isPremium, sessions.length, openModal, showToast]
  );

  const updateSession = useCallback(
    async (id: string, updates: Partial<Session>) => {
      if (!currentUserId) {
        logger.warn('Cannot update session: no user logged in', {});
        return;
      }

      if (!id || id.trim() === '') {
        logger.warn('Cannot update session: invalid session ID', { sessionId: id });
        return;
      }

      try {
        const updated = await updateSessionAPI(currentUserId, id, updates);
        if (updated) {
          setSessions(prev => prev.map(s => (s.id === id ? updated : s)));
          logger.info('Session updated successfully', { userId: currentUserId, sessionId: id });
        }
      } catch (error) {
        logger.error(
          'Failed to update session',
          { userId: currentUserId, sessionId: id },
          error instanceof Error ? error : undefined
        );
      }
    },
    [currentUserId]
  );

  const deleteSession = useCallback(
    async (id: string) => {
      if (!currentUserId) {
        throw new Error('User must be logged in to delete sessions');
      }

      try {
        await deleteSessionAPI(currentUserId, id);
        // Remove from local state immediately for responsive UI
        setSessions(prev => prev.filter(s => s.id !== id));
        showToast('Session deleted successfully', 'success');
      } catch (error) {
        logger.error(
          'Failed to delete session',
          { userId: currentUserId, sessionId: id },
          error instanceof Error ? error : undefined
        );
        const errorMessage =
          error instanceof Error
            ? error.message
            : "We couldn't delete this conversation. Please try again.";
        showToast(errorMessage, 'error');
        throw error;
      }
    },
    [currentUserId, showToast]
  );

  const refreshSessions = useCallback(async () => {
    if (!currentUserId) {
      return;
    }

    await loadSessions(currentUserId);
  }, [currentUserId, loadSessions]);

  return (
    <AppContext.Provider
      value={{
        authState,
        login,
        logout,
        modals,
        openModal,
        closeModal,
        selectedVoice,
        setSelectedVoice,
        sessions,
        isLoadingSessions,
        saveNewSession,
        updateSession,
        deleteSession,
        refreshSessions,
        toasts,
        showToast,
        removeToast,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
