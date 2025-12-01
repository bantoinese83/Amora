/**
 * Data Access Layer - Storage Repository
 * Abstracts localStorage operations to separate data access from business logic
 */

import { logger } from '../utils/logger';

export class StorageRepository {
  private static instance: StorageRepository;

  private constructor() {}

  static getInstance(): StorageRepository {
    if (!StorageRepository.instance) {
      StorageRepository.instance = new StorageRepository();
    }
    return StorageRepository.instance;
  }

  get<T>(key: string): T | null {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.debug(
        'Failed to get item from storage',
        { key },
        error instanceof Error ? error : undefined
      );
      return null;
    }
  }

  set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      logger.debug(
        'Failed to set item in storage',
        { key },
        error instanceof Error ? error : undefined
      );
    }
  }

  remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      logger.debug(
        'Failed to remove item from storage',
        { key },
        error instanceof Error ? error : undefined
      );
    }
  }

  getString(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      logger.debug(
        'Failed to get string from storage',
        { key },
        error instanceof Error ? error : undefined
      );
      return null;
    }
  }

  setString(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      logger.debug(
        'Failed to set string in storage',
        { key },
        error instanceof Error ? error : undefined
      );
    }
  }
}

export const storageRepository = StorageRepository.getInstance();
