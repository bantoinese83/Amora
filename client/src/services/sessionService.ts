/**
 * Session Service
 * Handles session API calls to the server
 */

import { Session, MessageLog, AudioChunk } from '../types';
import { logger } from '../utils/logger';
import { cache, CacheKeys } from '../utils/cache';

const API_URL = import.meta.env.VITE_API_URL || 'https://amora-server-production.up.railway.app';

/**
 * Get all sessions for a user
 * Cached for 2 minutes to reduce API calls when opening history modal
 */
export async function getSessions(userId: string): Promise<Session[]> {
  const cacheKey = CacheKeys.sessions(userId);

  // Check cache first
  const cached = cache.get<Session[]>(cacheKey);
  if (cached) {
    logger.info('Sessions retrieved from cache', { userId, count: cached.length });
    return cached;
  }

  try {
    const response = await fetch(`${API_URL}/api/sessions/user/${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      const userMessage = error.error || "We couldn't load your conversations. Please try again.";
      logger.error(
        'Get sessions failed',
        { userId, status: response.status },
        error instanceof Error ? error : undefined
      );
      throw new Error(userMessage);
    }

    const data = await response.json();
    const sessions = data.sessions || [];
    logger.info('Sessions loaded', { userId, count: sessions.length });

    // Cache the sessions (shorter TTL since they change more frequently)
    cache.set(cacheKey, sessions, {
      ttl: 2 * 60 * 1000, // 2 minutes
      persist: false, // Don't persist sessions to localStorage (can be large)
    });

    return sessions;
  } catch (error) {
    logger.error('Get sessions error', { userId }, error instanceof Error ? error : undefined);
    const userMessage =
      error instanceof Error
        ? error.message
        : "We couldn't load your conversations. Please try again.";
    throw new Error(userMessage);
  }
}

/**
 * Get session by ID
 * Cached for 5 minutes
 */
export async function getSession(userId: string, sessionId: string): Promise<Session | null> {
  const cacheKey = CacheKeys.session(userId, sessionId);

  // Check cache first
  const cached = cache.get<Session>(cacheKey);
  if (cached) {
    logger.info('Session retrieved from cache', { userId, sessionId });
    return cached;
  }

  try {
    const response = await fetch(`${API_URL}/api/sessions/${sessionId}/user/${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      const error = await response.json();
      const userMessage = error.error || "We couldn't load this conversation. Please try again.";
      logger.error(
        'Get session failed',
        { userId, sessionId, status: response.status },
        error instanceof Error ? error : undefined
      );
      throw new Error(userMessage);
    }

    const data = await response.json();
    const session = data.session || null;

    // Cache the session if found
    if (session) {
      cache.set(cacheKey, session, {
        ttl: 5 * 60 * 1000, // 5 minutes
        persist: false, // Don't persist individual sessions (can be large)
      });
    }

    return session;
  } catch (error) {
    logger.error(
      'Get session error',
      { userId, sessionId },
      error instanceof Error ? error : undefined
    );
    const userMessage =
      error instanceof Error
        ? error.message
        : "We couldn't load this conversation. Please try again.";
    throw new Error(userMessage);
  }
}

/**
 * Create a new session
 */
export async function createSession(
  userId: string,
  transcript: MessageLog[],
  durationSeconds: number,
  audioChunks?: AudioChunk[]
): Promise<Session> {
  try {
    // Check payload size before sending
    const payload = {
      transcript,
      durationSeconds,
      audioChunks,
    };
    const payloadSize = new Blob([JSON.stringify(payload)]).size;
    const maxSize = 45 * 1024 * 1024; // 45MB (leave some headroom for 50MB limit)

    // If payload is too large, send without audio chunks
    let finalPayload = payload;
    if (payloadSize > maxSize && audioChunks) {
      logger.warn('Session payload too large, omitting audio', {
        userId,
        payloadSizeMB: (payloadSize / 1024 / 1024).toFixed(2),
        maxSizeMB: (maxSize / 1024 / 1024).toFixed(2),
      });
      finalPayload = {
        transcript,
        durationSeconds,
        audioChunks: undefined, // Explicitly set to undefined when omitted
      };
    }

    const response = await fetch(`${API_URL}/api/sessions/user/${userId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(finalPayload),
    });

    if (!response.ok) {
      // Try to parse error, but handle HTML responses (413 errors sometimes return HTML)
      let userMessage = "We couldn't save your conversation. Please try again.";
      try {
        const errorData = await response.json();
        userMessage = errorData.error || userMessage;
      } catch {
        // If response is not JSON (e.g., HTML error page), use user-friendly message
        userMessage =
          response.status === 413
            ? "Your conversation was saved, but audio playback isn't available for this session."
            : "We couldn't save your conversation. Please try again.";
      }
      logger.error('Create session failed', { userId, status: response.status, durationSeconds });
      throw new Error(userMessage);
    }

    const data = await response.json();

    // Log warning if audio was omitted
    if (data.warning) {
      logger.warn('Session saved without audio', { userId, sessionId: data.session?.id });
    }

    logger.info('Session created successfully', {
      userId,
      sessionId: data.session?.id,
      durationSeconds,
    });

    // Invalidate sessions list cache (new session added)
    cache.delete(CacheKeys.sessions(userId));

    // Cache the new session
    if (data.session) {
      cache.set(CacheKeys.session(userId, data.session.id), data.session, {
        ttl: 5 * 60 * 1000,
        persist: false,
      });
    }

    return data.session;
  } catch (error) {
    logger.error(
      'Create session error',
      { userId, durationSeconds },
      error instanceof Error ? error : undefined
    );
    const userMessage =
      error instanceof Error
        ? error.message
        : "We couldn't save your conversation. Please try again.";
    throw new Error(userMessage);
  }
}

/**
 * Update a session
 */
export async function updateSession(
  userId: string,
  sessionId: string,
  updates: Partial<Session>
): Promise<Session> {
  try {
    const response = await fetch(`${API_URL}/api/sessions/${sessionId}/user/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const error = await response.json();
      const userMessage = error.error || "We couldn't update your conversation. Please try again.";
      logger.error(
        'Update session failed',
        { userId, sessionId, status: response.status },
        error instanceof Error ? error : undefined
      );
      throw new Error(userMessage);
    }

    const data = await response.json();
    logger.info('Session updated successfully', { userId, sessionId });

    // Invalidate caches
    cache.delete(CacheKeys.session(userId, sessionId));
    cache.delete(CacheKeys.sessions(userId)); // Sessions list changed

    // Cache the updated session
    if (data.session) {
      cache.set(CacheKeys.session(userId, sessionId), data.session, {
        ttl: 5 * 60 * 1000,
        persist: false,
      });
    }

    return data.session;
  } catch (error) {
    logger.error(
      'Update session error',
      { userId, sessionId },
      error instanceof Error ? error : undefined
    );
    const userMessage =
      error instanceof Error
        ? error.message
        : "We couldn't update your conversation. Please try again.";
    throw new Error(userMessage);
  }
}

/**
 * Delete a session
 */
export async function deleteSession(userId: string, sessionId: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/api/sessions/${sessionId}/user/${userId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      const userMessage = error.error || "We couldn't delete this conversation. Please try again.";
      logger.error(
        'Delete session failed',
        { userId, sessionId, status: response.status },
        error instanceof Error ? error : undefined
      );
      throw new Error(userMessage);
    }

    const data = await response.json();
    logger.info('Session deleted successfully', { userId, sessionId });

    // Invalidate caches
    cache.delete(CacheKeys.session(userId, sessionId));
    cache.delete(CacheKeys.sessions(userId)); // Sessions list changed

    return data.success === true;
  } catch (error) {
    logger.error(
      'Delete session error',
      { userId, sessionId },
      error instanceof Error ? error : undefined
    );
    const userMessage =
      error instanceof Error
        ? error.message
        : "We couldn't delete this conversation. Please try again.";
    throw new Error(userMessage);
  }
}
