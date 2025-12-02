/**
 * Cache Utility
 * Provides in-memory caching with TTL (time-to-live) and optional localStorage persistence
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds (default: 5 minutes)
  persist?: boolean; // Whether to persist to localStorage (default: false)
  keyPrefix?: string; // Prefix for localStorage keys
}

class Cache {
  private memoryCache: Map<string, CacheEntry<unknown>> = new Map();
  private readonly defaultTTL = 5 * 60 * 1000; // 5 minutes
  private readonly localStoragePrefix = 'amora_cache_';

  /**
   * Get data from cache
   */
  get<T>(key: string): T | null {
    // Try memory cache first
    const memoryEntry = this.memoryCache.get(key);
    if (memoryEntry && this.isValid(memoryEntry)) {
      return memoryEntry.data as T;
    }

    // Try localStorage if memory cache miss
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(`${this.localStoragePrefix}${key}`);
        if (stored) {
          const entry: CacheEntry<T> = JSON.parse(stored);
          if (this.isValid(entry)) {
            // Restore to memory cache
            this.memoryCache.set(key, entry);
            return entry.data;
          } else {
            // Expired, remove from localStorage
            localStorage.removeItem(`${this.localStoragePrefix}${key}`);
          }
        }
      } catch (error) {
        // Silently fail if localStorage is unavailable or corrupted
        console.warn('Cache: Failed to read from localStorage', error);
      }
    }

    return null;
  }

  /**
   * Set data in cache
   */
  set<T>(key: string, data: T, options: CacheOptions = {}): void {
    const ttl = options.ttl ?? this.defaultTTL;
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
    };

    // Store in memory cache
    this.memoryCache.set(key, entry);

    // Optionally persist to localStorage
    if (options.persist && typeof window !== 'undefined') {
      try {
        const storageKey = options.keyPrefix
          ? `${this.localStoragePrefix}${options.keyPrefix}_${key}`
          : `${this.localStoragePrefix}${key}`;
        localStorage.setItem(storageKey, JSON.stringify(entry));
      } catch (error) {
        // Silently fail if localStorage is full or unavailable
        console.warn('Cache: Failed to write to localStorage', error);
      }
    }
  }

  /**
   * Check if cache entry is still valid
   */
  private isValid<T>(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.timestamp < entry.ttl;
  }

  /**
   * Remove entry from cache
   */
  delete(key: string): void {
    this.memoryCache.delete(key);
    if (typeof window !== 'undefined') {
      try {
        // Remove all localStorage entries with this key (including prefixed ones)
        const keys = Object.keys(localStorage);
        keys.forEach(storageKey => {
          if (storageKey.startsWith(`${this.localStoragePrefix}${key}`)) {
            localStorage.removeItem(storageKey);
          }
        });
      } catch (error) {
        console.warn('Cache: Failed to delete from localStorage', error);
      }
    }
  }

  /**
   * Clear all cache entries matching a pattern
   */
  clearPattern(pattern: string): void {
    const keysToDelete: string[] = [];

    // Clear from memory cache
    this.memoryCache.forEach((_, key) => {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => this.memoryCache.delete(key));

    // Clear from localStorage
    if (typeof window !== 'undefined') {
      try {
        const keys = Object.keys(localStorage);
        keys.forEach(storageKey => {
          if (storageKey.includes(pattern)) {
            localStorage.removeItem(storageKey);
          }
        });
      } catch (error) {
        console.warn('Cache: Failed to clear pattern from localStorage', error);
      }
    }
  }

  /**
   * Clear all cache entries for a user
   */
  clearUser(userId: string): void {
    this.clearPattern(`user_${userId}`);
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.memoryCache.clear();
    if (typeof window !== 'undefined') {
      try {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
          if (key.startsWith(this.localStoragePrefix)) {
            localStorage.removeItem(key);
          }
        });
      } catch (error) {
        console.warn('Cache: Failed to clear localStorage', error);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): { memorySize: number; localStorageSize: number } {
    let localStorageSize = 0;
    if (typeof window !== 'undefined') {
      try {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
          if (key.startsWith(this.localStoragePrefix)) {
            const value = localStorage.getItem(key);
            if (value) {
              localStorageSize += value.length;
            }
          }
        });
      } catch {
        // Ignore errors
      }
    }

    return {
      memorySize: this.memoryCache.size,
      localStorageSize,
    };
  }
}

// Export singleton instance
export const cache = new Cache();

/**
 * Cache keys for consistent key generation
 */
export const CacheKeys = {
  user: (userId: string) => `user_${userId}`,
  sessions: (userId: string) => `sessions_${userId}`,
  session: (userId: string, sessionId: string) => `session_${userId}_${sessionId}`,
  subscription: (userId: string) => `subscription_${userId}`,
  emailCheck: (email: string) => `email_check_${email.toLowerCase()}`,
} as const;
