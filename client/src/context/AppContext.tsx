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
import { sessionRepository } from '@shared/repositories/sessionRepository';
import { preferencesRepository } from '@shared/repositories/preferencesRepository';
import { userRepository } from '@shared/repositories/userRepository';
import { getSubscriptionLimits } from '@shared/services/subscriptionService';

interface ModalState {
  auth: boolean;
  history: boolean;
  settings: boolean;
  summary: Session | null;
}

interface AppContextType {
  // Auth
  authState: AuthState;
  login: (email: string, pin: string, name?: string) => Promise<void>;
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
  refreshSessions: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEY_USER_ID = 'amora_user_id';

/**
 * Safe localStorage operations with error handling
 */
const safeLocalStorage = {
  getItem: (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.warn('localStorage.getItem failed:', error);
      return null;
    }
  },
  setItem: (key: string, value: string): boolean => {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.warn('localStorage.setItem failed:', error);
      return false;
    }
  },
  removeItem: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn('localStorage.removeItem failed:', error);
    }
  },
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Auth State
  const [authState, setAuthState] = useState<AuthState>({ isAuthenticated: false });
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Modal State
  const [modals, setModals] = useState<ModalState>({
    auth: true, // Start with auth open - required for security
    history: false,
    settings: false,
    summary: null,
  });

  // Voice State
  const [selectedVoice, setSelectedVoiceState] = useState<string>('Kore');

  // Session State
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);

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
          loadingUserRef.current = false;
          return;
        }

        // Validate UUID format before querying
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(storedUserId)) {
          console.warn('Invalid user ID format in storage, clearing');
          safeLocalStorage.removeItem(STORAGE_KEY_USER_ID);
          loadingUserRef.current = false;
          return;
        }

        const user = await userRepository.getUserWithPreferences(storedUserId);
        if (user) {
          setCurrentUserId(user.id);
          setAuthState({
            isAuthenticated: true,
            user: {
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
          // User not found, clear storage
          safeLocalStorage.removeItem(STORAGE_KEY_USER_ID);
        }
      } catch (error) {
        console.error('Failed to load stored user:', error);
        safeLocalStorage.removeItem(STORAGE_KEY_USER_ID);
      } finally {
        loadingUserRef.current = false;
      }
    };

    loadStoredUser();
  }, []);

  // Load sessions from database
  const loadSessions = useCallback(async (userId: string) => {
    if (!userId || userId.trim() === '') {
      setSessions([]);
      return;
    }

    setIsLoadingSessions(true);
    try {
      const userSessions = await sessionRepository.getAll(userId);
      // Filter out any null sessions from mapping errors
      setSessions(userSessions.filter((s): s is Session => s !== null));
    } catch (error) {
      console.error('Failed to load sessions:', error);
      setSessions([]);
    } finally {
      setIsLoadingSessions(false);
    }
  }, []);

  // Login function - handles both signup and signin
  const login = useCallback(
    async (email: string, pin: string, name?: string) => {
      // Prevent concurrent login attempts
      if (loginInProgress.current) {
        throw new Error('Login already in progress. Please wait.');
      }

      // Validate inputs
      if (!email || typeof email !== 'string' || email.trim() === '') {
        throw new Error('Email is required');
      }

      if (!pin || typeof pin !== 'string' || pin.trim() === '') {
        throw new Error('PIN is required');
      }

      if (name !== undefined && (!name || typeof name !== 'string' || name.trim() === '')) {
        throw new Error('Name is required for new accounts');
      }

      loginInProgress.current = true;

      try {
        let user;

        if (name) {
          // Sign up flow
          const emailExists = await userRepository.emailExists(email);
          if (emailExists) {
            throw new Error('An account with this email already exists. Please sign in instead.');
          }

          user = await userRepository.createUser(email, pin, name);
        } else {
          // Sign in flow
          user = await userRepository.authenticateUser(email, pin);
          if (!user) {
            // Check if email exists to provide better error message
            const emailExists = await userRepository.emailExists(email);
            if (!emailExists) {
              throw new Error('No account found with this email. Please sign up first.');
            }
            throw new Error('Incorrect PIN. Please try again.');
          }
        }

        // Get user with preferences
        let userWithPrefs = await userRepository.getUserWithPreferences(user.id);
        if (!userWithPrefs) {
          // Try to create preferences if they don't exist
          try {
            await preferencesRepository.initializePreferences(user.id);
            // Retry getting user with preferences
            const retryUser = await userRepository.getUserWithPreferences(user.id);
            if (!retryUser) {
              throw new Error('Failed to load user preferences');
            }
            userWithPrefs = retryUser;
          } catch (prefError) {
            console.error('Failed to initialize preferences:', prefError);
            throw new Error('Failed to load user preferences');
          }
        }

        // Store user ID
        setCurrentUserId(user.id);
        const stored = safeLocalStorage.setItem(STORAGE_KEY_USER_ID, user.id);
        if (!stored) {
          console.warn('Failed to store user ID in localStorage, but continuing');
        }

        // Update auth state
        setAuthState({
          isAuthenticated: true,
          user: {
            name: user.name || 'User',
            email: user.email || '',
            isPremium: user.is_premium || false,
          },
        });

        // Load preferences
        setSelectedVoiceState(userWithPrefs.selected_voice || 'Kore');

        // Load sessions (don't await to avoid blocking)
        loadSessions(user.id).catch(error => {
          console.error('Failed to load sessions after login:', error);
        });

        // Close auth modal
        setModals(prev => ({ ...prev, auth: false }));
      } catch (error) {
        // Reset state on error
        setCurrentUserId(null);
        safeLocalStorage.removeItem(STORAGE_KEY_USER_ID);
        throw error;
      } finally {
        loginInProgress.current = false;
      }
    },
    [loadSessions]
  );

  // Logout function
  const logout = useCallback(() => {
    setCurrentUserId(null);
    setAuthState({ isAuthenticated: false });
    setSessions([]);
    setSelectedVoiceState('Kore');
    safeLocalStorage.removeItem(STORAGE_KEY_USER_ID);
    setModals(prev => ({ ...prev, auth: true }));
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
        console.warn('Cannot set voice: no user logged in');
        return;
      }

      if (!voice || typeof voice !== 'string' || voice.trim() === '') {
        console.warn('Invalid voice selection');
        return;
      }

      const previousVoice = selectedVoice;
      setSelectedVoiceState(voice);

      try {
        await preferencesRepository.setSelectedVoice(currentUserId, voice);
      } catch (error) {
        console.error('Failed to save voice preference:', error);
        // Revert on error
        setSelectedVoiceState(previousVoice);
        // Try to load saved preference
        try {
          const saved = await preferencesRepository.getSelectedVoice(currentUserId);
          if (saved) setSelectedVoiceState(saved);
        } catch (loadError) {
          console.error('Failed to load saved voice preference:', loadError);
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
        console.warn('Cannot save session: no user logged in');
        return null;
      }

      // Feature gating: Check subscription limits
      const isPremium = authState.user?.isPremium || false;
      const limits = getSubscriptionLimits(isPremium);

      // Check session count limit for free users
      if (!isPremium && sessions.length >= limits.maxSessions) {
        console.warn(
          `Session limit reached (${limits.maxSessions} sessions). Upgrade to premium for unlimited sessions.`
        );
        openModal('auth'); // Open auth modal to show upgrade option
        return null;
      }

      // Check session duration limit
      if (duration > limits.maxSessionDuration) {
        console.warn(
          `Session duration exceeds limit (${limits.maxSessionDuration}s). Upgrade to premium for longer sessions.`
        );
        // Still save the session but truncate duration
        duration = limits.maxSessionDuration;
      }

      // Validate inputs
      if (!Array.isArray(transcript) || transcript.length === 0) {
        console.warn('Cannot save session: empty transcript');
        return null;
      }

      if (typeof duration !== 'number' || !isFinite(duration) || duration < 0) {
        console.warn('Cannot save session: invalid duration');
        return null;
      }

      try {
        const newSession = await sessionRepository.createFromTranscript(
          currentUserId,
          transcript,
          duration,
          audioChunks
        );

        if (newSession) {
          setSessions(prev => [newSession, ...prev]);
        }

        return newSession;
      } catch (error) {
        console.error('Failed to save session:', error);
        return null;
      }
    },
    [currentUserId, authState.user?.isPremium, sessions.length, openModal]
  );

  const updateSession = useCallback(
    async (id: string, updates: Partial<Session>) => {
      if (!currentUserId) {
        console.warn('Cannot update session: no user logged in');
        return;
      }

      if (!id || id.trim() === '') {
        console.warn('Cannot update session: invalid session ID');
        return;
      }

      try {
        const updated = await sessionRepository.update(currentUserId, id, updates);
        if (updated) {
          setSessions(prev => prev.map(s => (s.id === id ? updated : s)));
        }
      } catch (error) {
        console.error('Failed to update session:', error);
      }
    },
    [currentUserId]
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
        refreshSessions,
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
