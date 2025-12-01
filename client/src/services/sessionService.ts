/**
 * Session Service
 * Handles session API calls to the server
 */

import { Session, MessageLog, AudioChunk } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'https://amora-server-production.up.railway.app';

/**
 * Get all sessions for a user
 */
export async function getSessions(userId: string): Promise<Session[]> {
  try {
    const response = await fetch(`${API_URL}/api/sessions/user/${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get sessions');
    }

    const data = await response.json();
    return data.sessions || [];
  } catch (error) {
    console.error('Error getting sessions:', error);
    throw error;
  }
}

/**
 * Get session by ID
 */
export async function getSession(userId: string, sessionId: string): Promise<Session | null> {
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
      throw new Error(error.error || 'Failed to get session');
    }

    const data = await response.json();
    return data.session || null;
  } catch (error) {
    console.error('Error getting session:', error);
    throw error;
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
      console.warn(
        `Session payload too large (${(payloadSize / 1024 / 1024).toFixed(2)}MB). Saving without audio chunks.`
      );
      finalPayload = {
        transcript,
        durationSeconds,
        // Omit audioChunks
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
      let errorMessage = 'Failed to create session';
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch {
        // If response is not JSON (e.g., HTML error page), use status text
        errorMessage = response.status === 413
          ? 'Session data is too large. Saving without audio playback.'
          : `Server error: ${response.status} ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    
    // Log warning if audio was omitted
    if (data.warning) {
      console.warn(data.warning);
    }
    
    return data.session;
  } catch (error) {
    console.error('Error creating session:', error);
    throw error;
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
      throw new Error(error.error || 'Failed to update session');
    }

    const data = await response.json();
    return data.session;
  } catch (error) {
    console.error('Error updating session:', error);
    throw error;
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
      throw new Error(error.error || 'Failed to delete session');
    }

    const data = await response.json();
    return data.success === true;
  } catch (error) {
    console.error('Error deleting session:', error);
    throw error;
  }
}

