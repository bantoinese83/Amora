/**
 * Data Access Layer - Session Repository
 * Handles session data persistence with Neon database
 * Includes comprehensive validation and edge case handling
 */

import { Session, MessageLog, AudioChunk } from '../types/index.js';
import { executeQuery, executeQueryOne, validateUUID } from '../services/databaseService.js';

interface SessionRow {
  id: string;
  user_id: string;
  date: Date;
  duration_seconds: number;
  preview: string;
  transcript: MessageLog[];
  analysis: SessionAnalysis | null;
  audio_chunks: AudioChunk[] | null;
  created_at: Date;
  updated_at: Date;
}

interface SessionAnalysis {
  mood: string;
  icon: string;
  title: string;
  summary: string;
  keyInsight: string;
  actionItem: string;
  encouragement: string;
}

// Constants
const MAX_PREVIEW_LENGTH = 500;
const MAX_TRANSCRIPT_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_AUDIO_CHUNKS_SIZE = 50 * 1024 * 1024; // 50MB
const MIN_DURATION = 0;
const MAX_DURATION = 86400; // 24 hours

/**
 * Validate and sanitize session data
 */
function validateSessionData(
  transcript: MessageLog[],
  duration: number,
  audioChunks?: AudioChunk[]
): { isValid: boolean; error?: string } {
  // Validate transcript
  if (!Array.isArray(transcript)) {
    return { isValid: false, error: 'Transcript must be an array' };
  }

  if (transcript.length === 0) {
    return { isValid: false, error: 'Transcript cannot be empty' };
  }

  // Validate transcript size
  try {
    const transcriptSize = JSON.stringify(transcript).length;
    if (transcriptSize > MAX_TRANSCRIPT_SIZE) {
      return { isValid: false, error: 'Transcript is too large' };
    }
  } catch {
    return { isValid: false, error: 'Failed to validate transcript size' };
  }

  // Validate duration
  if (typeof duration !== 'number' || !isFinite(duration)) {
    return { isValid: false, error: 'Duration must be a valid number' };
  }

  if (duration < MIN_DURATION || duration > MAX_DURATION) {
    return {
      isValid: false,
      error: `Duration must be between ${MIN_DURATION} and ${MAX_DURATION} seconds`,
    };
  }

  // Validate audio chunks if provided
  if (audioChunks) {
    if (!Array.isArray(audioChunks)) {
      return { isValid: false, error: 'Audio chunks must be an array' };
    }

    try {
      const audioSize = JSON.stringify(audioChunks).length;
      if (audioSize > MAX_AUDIO_CHUNKS_SIZE) {
        return { isValid: false, error: 'Audio chunks are too large' };
      }
    } catch {
      return { isValid: false, error: 'Failed to validate audio chunks size' };
    }
  }

  return { isValid: true };
}

/**
 * Generate preview from transcript
 */
function generatePreview(transcript: MessageLog[]): string {
  const firstUserMessage = transcript.find(t => t.role === 'user');
  if (firstUserMessage?.text) {
    const preview = firstUserMessage.text.slice(0, MAX_PREVIEW_LENGTH);
    return preview.length < firstUserMessage.text.length ? preview + '...' : preview;
  }
  return 'Session';
}

/**
 * Safely serialize JSON with error handling
 */
function safeJSONStringify(value: unknown): string | null {
  try {
    return JSON.stringify(value);
  } catch (error) {
    console.error('Failed to serialize JSON:', error);
    return null;
  }
}

class SessionRepository {
  /**
   * Get all sessions for a user
   */
  async getAll(userId: string): Promise<Session[]> {
    if (!userId) {
      return [];
    }

    try {
      validateUUID(userId, 'User ID');
    } catch (error) {
      console.error('Invalid user ID:', error);
      return [];
    }

    try {
      const rows = await executeQuery<SessionRow>(
        `SELECT id, user_id, date, duration_seconds, preview, transcript, analysis, audio_chunks, created_at, updated_at
         FROM sessions
         WHERE user_id = $1
         ORDER BY date DESC
         LIMIT 1000`,
        [userId]
      );

      const mappedSessions = (rows as any[])
        .map((row: any) => this.mapRowToSession(row))
        .filter((session: Session | null): session is Session => session !== null);
      return mappedSessions;
    } catch (error) {
      console.error('Failed to load sessions', error);
      return [];
    }
  }

  /**
   * Save a new session
   */
  async save(userId: string, session: Session): Promise<Session> {
    if (!userId) {
      throw new Error('User ID is required');
    }

    validateUUID(userId, 'User ID');

    // Validate session data
    const validation = validateSessionData(
      session.transcript,
      session.durationSeconds,
      session.audioChunks
    );
    if (!validation.isValid) {
      throw new Error(validation.error || 'Invalid session data');
    }

    // Generate preview if not provided or invalid
    const preview =
      session.preview && session.preview.length > 0
        ? session.preview.slice(0, MAX_PREVIEW_LENGTH)
        : generatePreview(session.transcript);

    // Validate date
    let sessionDate: string;
    try {
      const date = new Date(session.date);
      if (isNaN(date.getTime())) {
        throw new Error('Invalid date');
      }
      sessionDate = date.toISOString();
    } catch {
      sessionDate = new Date().toISOString();
    }

    // Serialize JSON fields
    const transcriptJson = safeJSONStringify(session.transcript);
    if (!transcriptJson) {
      throw new Error('Failed to serialize transcript');
    }

    const analysisJson = session.analysis ? safeJSONStringify(session.analysis) : null;
    const audioChunksJson = session.audioChunks ? safeJSONStringify(session.audioChunks) : null;

    try {
      const result = await executeQueryOne<SessionRow>(
        `INSERT INTO sessions (user_id, date, duration_seconds, preview, transcript, analysis, audio_chunks)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, user_id, date, duration_seconds, preview, transcript, analysis, audio_chunks, created_at, updated_at`,
        [
          userId,
          sessionDate,
          session.durationSeconds,
          preview,
          transcriptJson,
          analysisJson,
          audioChunksJson,
        ]
      );

      if (!result) {
        throw new Error('Failed to save session');
      }

      const mappedSession = this.mapRowToSession(result);
      if (!mappedSession) {
        throw new Error('Failed to map session data');
      }

      return mappedSession;
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('value too long')) {
          throw new Error('Session data exceeds maximum size limit');
        }
        if (error.message.includes('violates check constraint')) {
          throw new Error('Invalid session data provided');
        }
      }
      throw error;
    }
  }

  /**
   * Update a session
   */
  async update(userId: string, id: string, updates: Partial<Session>): Promise<Session | null> {
    if (!userId || !id) {
      return null;
    }

    try {
      validateUUID(userId, 'User ID');
      validateUUID(id, 'Session ID');
    } catch {
      return null;
    }

    const updatesArray: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (updates.durationSeconds !== undefined) {
      if (typeof updates.durationSeconds !== 'number' || !isFinite(updates.durationSeconds)) {
        return null;
      }
      if (updates.durationSeconds < MIN_DURATION || updates.durationSeconds > MAX_DURATION) {
        return null;
      }
      updatesArray.push(`duration_seconds = $${paramIndex++}`);
      params.push(updates.durationSeconds);
    }

    if (updates.preview !== undefined) {
      const preview = String(updates.preview).slice(0, MAX_PREVIEW_LENGTH);
      updatesArray.push(`preview = $${paramIndex++}`);
      params.push(preview);
    }

    if (updates.transcript !== undefined) {
      const transcriptJson = safeJSONStringify(updates.transcript);
      if (!transcriptJson) {
        return null;
      }
      if (transcriptJson.length > MAX_TRANSCRIPT_SIZE) {
        return null;
      }
      updatesArray.push(`transcript = $${paramIndex++}`);
      params.push(transcriptJson);
    }

    if (updates.analysis !== undefined) {
      const analysisJson = updates.analysis ? safeJSONStringify(updates.analysis) : null;
      if (updates.analysis && !analysisJson) {
        return null;
      }
      updatesArray.push(`analysis = $${paramIndex++}`);
      params.push(analysisJson);
    }

    if (updates.audioChunks !== undefined) {
      const audioChunksJson = updates.audioChunks ? safeJSONStringify(updates.audioChunks) : null;
      if (updates.audioChunks && !audioChunksJson) {
        return null;
      }
      if (audioChunksJson && audioChunksJson.length > MAX_AUDIO_CHUNKS_SIZE) {
        return null;
      }
      updatesArray.push(`audio_chunks = $${paramIndex++}`);
      params.push(audioChunksJson);
    }

    if (updatesArray.length === 0) {
      // No updates to make
      return this.getById(userId, id);
    }

    params.push(userId, id);

    try {
      const result = await executeQueryOne<SessionRow>(
        `UPDATE sessions
         SET ${updatesArray.join(', ')}
         WHERE user_id = $${paramIndex++} AND id = $${paramIndex++}
         RETURNING id, user_id, date, duration_seconds, preview, transcript, analysis, audio_chunks, created_at, updated_at`,
        params
      );

      return result ? this.mapRowToSession(result) : null;
    } catch (error) {
      console.error('Failed to update session:', error);
      return null;
    }
  }

  /**
   * Get session by ID
   */
  async getById(userId: string, id: string): Promise<Session | null> {
    if (!userId || !id) {
      return null;
    }

    try {
      validateUUID(userId, 'User ID');
      validateUUID(id, 'Session ID');
    } catch {
      return null;
    }

    try {
      const result = await executeQueryOne<SessionRow>(
        `SELECT id, user_id, date, duration_seconds, preview, transcript, analysis, audio_chunks, created_at, updated_at
         FROM sessions
         WHERE user_id = $1 AND id = $2`,
        [userId, id]
      );

      return result ? this.mapRowToSession(result) : null;
    } catch (error) {
      console.error('Failed to get session by ID:', error);
      return null;
    }
  }

  /**
   * Delete a session
   */
  async delete(userId: string, id: string): Promise<boolean> {
    if (!userId || !id) {
      return false;
    }

    try {
      validateUUID(userId, 'User ID');
      validateUUID(id, 'Session ID');
    } catch {
      return false;
    }

    try {
      await executeQuery(`DELETE FROM sessions WHERE user_id = $1 AND id = $2`, [userId, id]);
      return true;
    } catch (error) {
      console.error('Failed to delete session:', error);
      return false;
    }
  }

  /**
   * Create session from transcript
   */
  async createFromTranscript(
    userId: string,
    transcript: MessageLog[],
    duration: number,
    audioChunks?: AudioChunk[]
  ): Promise<Session | null> {
    if (!userId) {
      return null;
    }

    try {
      validateUUID(userId, 'User ID');
    } catch {
      return null;
    }

    // Validate data
    const validation = validateSessionData(transcript, duration, audioChunks);
    if (!validation.isValid) {
      console.error('Invalid session data:', validation.error);
      return null;
    }

    const preview = generatePreview(transcript);

    const newSession: Session = {
      id: '', // Will be set by database
      date: new Date().toISOString(),
      durationSeconds: duration,
      preview,
      transcript,
      ...(audioChunks && audioChunks.length > 0 ? { audioChunks } : {}),
    };

    try {
      return await this.save(userId, newSession);
    } catch (error) {
      console.error('Failed to create session from transcript:', error);
      return null;
    }
  }

  /**
   * Map database row to Session type
   */
  private mapRowToSession(row: SessionRow): Session | null {
    try {
      // Parse JSON fields safely
      let transcript: MessageLog[] = [];
      if (row.transcript) {
        if (typeof row.transcript === 'string') {
          try {
            transcript = JSON.parse(row.transcript);
          } catch (error) {
            console.error('Failed to parse transcript JSON:', error);
            transcript = [];
          }
        } else if (Array.isArray(row.transcript)) {
          transcript = row.transcript;
        }
      }

      let analysis = undefined;
      if (row.analysis) {
        if (typeof row.analysis === 'string') {
          try {
            analysis = JSON.parse(row.analysis);
          } catch (error) {
            console.error('Failed to parse analysis JSON:', error);
          }
        } else if (typeof row.analysis === 'object') {
          analysis = row.analysis as SessionAnalysis;
        }
      }

      let audioChunks = undefined;
      if (row.audio_chunks) {
        if (typeof row.audio_chunks === 'string') {
          try {
            audioChunks = JSON.parse(row.audio_chunks);
          } catch (error) {
            console.error('Failed to parse audio chunks JSON:', error);
          }
        } else if (Array.isArray(row.audio_chunks)) {
          audioChunks = row.audio_chunks;
        }
      }

      // Parse date safely
      let dateString: string;
      if (row.date instanceof Date) {
        dateString = row.date.toISOString();
      } else if (typeof row.date === 'string') {
        const date = new Date(row.date);
        dateString = isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
      } else {
        dateString = new Date().toISOString();
      }

      return {
        id: row.id,
        date: dateString,
        durationSeconds: row.duration_seconds,
        preview: row.preview || 'Session',
        transcript,
        ...(analysis ? { analysis } : {}),
        ...(audioChunks ? { audioChunks } : {}),
      };
    } catch (error) {
      console.error('Failed to map session row:', error);
      return null;
    }
  }
}

const sessionRepository = new SessionRepository();
export { sessionRepository };
