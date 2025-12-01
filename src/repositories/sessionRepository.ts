/**
 * Data Access Layer - Session Repository
 * Handles session data persistence, separating data access from business logic
 */

import { Session, MessageLog, AudioChunk } from '../types';
import { storageRepository } from './storageRepository';

const STORAGE_KEY_SESSIONS = 'amora_sessions';

class SessionRepository {
  getAll(): Session[] {
    try {
      return storageRepository.get<Session[]>(STORAGE_KEY_SESSIONS) || [];
    } catch (error) {
      console.error('Failed to load sessions', error);
      return [];
    }
  }

  save(session: Session): Session {
    const sessions = this.getAll();
    sessions.unshift(session);
    storageRepository.set(STORAGE_KEY_SESSIONS, sessions);
    return session;
  }

  update(id: string, updates: Partial<Session>): Session | null {
    const sessions = this.getAll();
    const index = sessions.findIndex(s => s.id === id);

    if (index === -1) return null;

    const existingSession = sessions[index];
    if (!existingSession) return null;

    const updatedSession: Session = { ...existingSession, ...updates };
    sessions[index] = updatedSession;
    storageRepository.set(STORAGE_KEY_SESSIONS, sessions);

    return updatedSession;
  }

  delete(id: string): boolean {
    const sessions = this.getAll();
    const filtered = sessions.filter(s => s.id !== id);

    if (filtered.length === sessions.length) return false;

    storageRepository.set(STORAGE_KEY_SESSIONS, filtered);
    return true;
  }

  clear(): void {
    storageRepository.remove(STORAGE_KEY_SESSIONS);
  }

  createFromTranscript(
    transcript: MessageLog[],
    duration: number,
    audioChunks?: AudioChunk[]
  ): Session | null {
    if (transcript.length === 0) return null;

    const newSession: Session = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      durationSeconds: duration,
      preview: transcript.find(t => t.role === 'user')?.text.slice(0, 50) + '...' || 'Session',
      transcript: transcript,
      ...(audioChunks && audioChunks.length > 0 ? { audioChunks } : {}),
    };

    return this.save(newSession);
  }
}

const sessionRepository = new SessionRepository();
export { sessionRepository };
