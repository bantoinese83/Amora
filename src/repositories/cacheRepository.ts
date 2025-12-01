/**
 * Data Access Layer - Cache Repository
 * Handles caching operations for RAG stores, separating data access from business logic
 */

import { storageRepository } from './storageRepository';

const CACHE_PREFIX = 'amora_rag_cache_';
const CACHE_TTL_MS = 40 * 60 * 60 * 1000; // 40 hours

interface CachedStore {
  storeName: string;
  timestamp: number;
}

class CacheRepository {
  private getCacheKey(file: File): string {
    return `${CACHE_PREFIX}${file.name}_${file.size}_${file.lastModified}`;
  }

  getCachedStore(file: File): string | null {
    try {
      const key = this.getCacheKey(file);
      const cached = storageRepository.get<CachedStore>(key);

      if (!cached) return null;

      const age = Date.now() - cached.timestamp;

      if (age > CACHE_TTL_MS) {
        this.removeCachedStore(file);
        return null;
      }

      return cached.storeName;
    } catch (error) {
      console.error('Failed to get cached store', error);
      return null;
    }
  }

  setCachedStore(file: File, storeName: string): void {
    try {
      const key = this.getCacheKey(file);
      const data: CachedStore = {
        storeName,
        timestamp: Date.now(),
      };
      storageRepository.set(key, data);
    } catch (error) {
      console.warn('Failed to cache store', error);
    }
  }

  removeCachedStore(file: File): void {
    const key = this.getCacheKey(file);
    storageRepository.remove(key);
  }

  clearExpiredCaches(): void {
    // This would require iterating through all localStorage keys
    // For now, we rely on TTL checks during get operations
    // Can be enhanced if needed
  }
}

const cacheRepository = new CacheRepository();
export { cacheRepository };
