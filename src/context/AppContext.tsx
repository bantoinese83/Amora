import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthState, Session, AudioChunk } from '../types';
import { MessageLog } from '../types';
import { sessionRepository } from '../repositories/sessionRepository';
import { preferencesRepository } from '../repositories/preferencesRepository';

interface ModalState {
  auth: boolean;
  history: boolean;
  knowledge: boolean;
  settings: boolean;
  summary: Session | null;
}

interface AppContextType {
  // Auth
  authState: AuthState;
  login: () => void;

  // Modals
  modals: ModalState;
  openModal: (key: keyof ModalState, data?: unknown) => void;
  closeModal: (key: keyof ModalState) => void;

  // RAG
  ragStoreName: string | null;
  setRagStoreName: (name: string) => void;

  // Voice Settings
  selectedVoice: string;
  setSelectedVoice: (voice: string) => void;

  // Sessions
  sessions: Session[];
  saveNewSession: (
    transcript: MessageLog[],
    duration: number,
    audioChunks?: AudioChunk[]
  ) => Session | null;
  updateSession: (id: string, updates: Partial<Session>) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Auth State
  const [authState, setAuthState] = useState<AuthState>({ isAuthenticated: false });

  // Modal State
  const [modals, setModals] = useState<ModalState>({
    auth: true, // Start with auth open - required for security
    history: false,
    knowledge: false,
    settings: false,
    summary: null,
  });

  // RAG State
  const [ragStoreName, setRagStoreNameState] = useState<string | null>(null);

  // Voice State
  const [selectedVoice, setSelectedVoiceState] = useState<string>('Kore');

  // Session State
  const [sessions, setSessions] = useState<Session[]>([]);

  // Initialization
  useEffect(() => {
    setSessions(sessionRepository.getAll());

    const savedStore = preferencesRepository.getRagStoreName();
    if (savedStore) setRagStoreNameState(savedStore);

    const savedVoice = preferencesRepository.getSelectedVoice();
    if (savedVoice) setSelectedVoiceState(savedVoice);
  }, []);

  const login = () => {
    setAuthState({
      isAuthenticated: true,
      user: { name: 'Amora User', email: 'user@amora.ai', isPremium: true },
    });
    closeModal('auth');
    // Mark PIN as set if it was the default (first login)
    if (!preferencesRepository.isPinSet()) {
      preferencesRepository.setPin('1234');
    }
  };

  const openModal = (key: keyof ModalState, data?: unknown) => {
    setModals(prev => ({ ...prev, [key]: data !== undefined ? data : true }));
  };

  const closeModal = (key: keyof ModalState) => {
    setModals(prev => ({ ...prev, [key]: key === 'summary' ? null : false }));
  };

  const setRagStoreName = (name: string) => {
    setRagStoreNameState(name);
    preferencesRepository.setRagStoreName(name);
  };

  const setSelectedVoice = (voice: string) => {
    setSelectedVoiceState(voice);
    preferencesRepository.setSelectedVoice(voice);
  };

  const saveNewSession = (
    transcript: MessageLog[],
    duration: number,
    audioChunks?: AudioChunk[]
  ) => {
    const newSession = sessionRepository.createFromTranscript(transcript, duration, audioChunks);
    if (newSession) {
      setSessions(prev => [newSession, ...prev]);
    }
    return newSession;
  };

  const updateSession = (id: string, updates: Partial<Session>) => {
    const updated = sessionRepository.update(id, updates);
    if (updated) {
      setSessions(prev => prev.map(s => (s.id === id ? updated : s)));
    }
  };

  return (
    <AppContext.Provider
      value={{
        authState,
        login,
        modals,
        openModal,
        closeModal,
        ragStoreName,
        setRagStoreName,
        selectedVoice,
        setSelectedVoice,
        sessions,
        saveNewSession,
        updateSession,
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
