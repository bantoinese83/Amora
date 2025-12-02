/**
 * Authentication Service
 * Handles authentication API calls to the server
 */

import { logger } from '../utils/logger';
import { cache, CacheKeys } from '../utils/cache';

const API_URL = import.meta.env.VITE_API_URL || 'https://amora-server-production.up.railway.app';

export interface User {
  id: string;
  email: string;
  name: string;
  is_premium: boolean;
  created_at: Date;
  updated_at: Date;
  selected_voice?: string;
}

export interface AuthResponse {
  user: User;
}

/**
 * Check if email exists
 */
export async function checkEmail(email: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/api/auth/check-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      const error = await response.json();
      const userMessage =
        error.error || "We couldn't verify your email. Please check your connection and try again.";
      logger.error(
        'Email check failed',
        { email, status: response.status },
        error instanceof Error ? error : undefined
      );
      throw new Error(userMessage);
    }

    const data = await response.json();
    return data.exists === true;
  } catch (error) {
    logger.error('Email check error', { email }, error instanceof Error ? error : undefined);
    const userMessage =
      error instanceof Error
        ? error.message
        : "We couldn't verify your email. Please check your connection and try again.";
    throw new Error(userMessage);
  }
}

/**
 * Sign up - Create new user
 */
export async function signUp(email: string, pin: string, name: string): Promise<User> {
  try {
    const response = await fetch(`${API_URL}/api/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, pin, name }),
    });

    if (!response.ok) {
      const error = await response.json();
      const userMessage = error.error || "We couldn't create your account. Please try again.";
      logger.error(
        'Sign up failed',
        { email, status: response.status },
        error instanceof Error ? error : undefined
      );
      throw new Error(userMessage);
    }

    const data: AuthResponse = await response.json();
    logger.info('User signed up successfully', { userId: data.user.id, email });

    // Cache the new user immediately
    cache.set(CacheKeys.user(data.user.id), data.user, {
      ttl: 5 * 60 * 1000,
      persist: true,
    });

    return data.user;
  } catch (error) {
    logger.error('Sign up error', { email }, error instanceof Error ? error : undefined);
    const userMessage =
      error instanceof Error ? error.message : "We couldn't create your account. Please try again.";
    throw new Error(userMessage);
  }
}

/**
 * Sign in - Authenticate user
 */
export async function signIn(email: string, pin: string): Promise<User> {
  try {
    const response = await fetch(`${API_URL}/api/auth/signin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, pin }),
    });

    if (!response.ok) {
      const error = await response.json();
      const userMessage =
        error.error || "We couldn't sign you in. Please check your email and PIN and try again.";
      logger.error(
        'Sign in failed',
        { email, status: response.status },
        error instanceof Error ? error : undefined
      );
      throw new Error(userMessage);
    }

    const data: AuthResponse = await response.json();
    logger.info('User signed in successfully', { userId: data.user.id, email });

    // Cache the user immediately after sign in
    cache.set(CacheKeys.user(data.user.id), data.user, {
      ttl: 5 * 60 * 1000,
      persist: true,
    });

    return data.user;
  } catch (error) {
    logger.error('Sign in error', { email }, error instanceof Error ? error : undefined);
    const userMessage =
      error instanceof Error
        ? error.message
        : "We couldn't sign you in. Please check your email and PIN and try again.";
    throw new Error(userMessage);
  }
}

/**
 * Get user with preferences
 * Cached for 5 minutes to reduce API calls
 */
export async function getUser(userId: string): Promise<User> {
  const cacheKey = CacheKeys.user(userId);

  // Check cache first
  const cached = cache.get<User>(cacheKey);
  if (cached) {
    logger.info('User data retrieved from cache', { userId });
    return cached;
  }

  try {
    const response = await fetch(`${API_URL}/api/auth/user/${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      const userMessage =
        error.error || "We couldn't load your account information. Please try again.";
      logger.error(
        'Get user failed',
        { userId, status: response.status },
        error instanceof Error ? error : undefined
      );
      throw new Error(userMessage);
    }

    const data: AuthResponse = await response.json();

    // Cache the user data (persist to localStorage for offline support)
    cache.set(cacheKey, data.user, {
      ttl: 5 * 60 * 1000, // 5 minutes
      persist: true, // Persist to localStorage for offline access
    });

    return data.user;
  } catch (error) {
    logger.error('Get user error', { userId }, error instanceof Error ? error : undefined);
    const userMessage =
      error instanceof Error
        ? error.message
        : "We couldn't load your account information. Please try again.";
    throw new Error(userMessage);
  }
}

/**
 * Invalidate user cache (call after user updates)
 */
export function invalidateUserCache(userId: string): void {
  cache.delete(CacheKeys.user(userId));
  logger.info('User cache invalidated', { userId });
}
