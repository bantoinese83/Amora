/**
 * Data Access Layer - Session Repository
 * Handles session data persistence with Neon database
 * Includes comprehensive validation and edge case handling
 */
import { Session, MessageLog, AudioChunk } from '../types';
declare class SessionRepository {
  /**
   * Get all sessions for a user
   */
  getAll(userId: string): Promise<Session[]>;
  /**
   * Save a new session
   */
  save(userId: string, session: Session): Promise<Session>;
  /**
   * Update a session
   */
  update(userId: string, id: string, updates: Partial<Session>): Promise<Session | null>;
  /**
   * Get session by ID
   */
  getById(userId: string, id: string): Promise<Session | null>;
  /**
   * Delete a session
   */
  delete(userId: string, id: string): Promise<boolean>;
  /**
   * Create session from transcript
   */
  createFromTranscript(
    userId: string,
    transcript: MessageLog[],
    duration: number,
    audioChunks?: AudioChunk[]
  ): Promise<Session | null>;
  /**
   * Map database row to Session type
   */
  private mapRowToSession;
}
declare const sessionRepository: SessionRepository;
export { sessionRepository };
//# sourceMappingURL=sessionRepository.d.ts.map
