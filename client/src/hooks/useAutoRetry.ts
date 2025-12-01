import { useCallback, useRef } from 'react';

interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
}

/**
 * Hook for automatic retry with exponential backoff
 * Provides smart retry logic for connection errors
 */
export function useAutoRetry(retryFn: () => Promise<void>, options: RetryOptions = {}) {
  const { maxRetries = 3, initialDelay = 1000, maxDelay = 10000, backoffMultiplier = 2 } = options;

  const retryCountRef = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const retry = useCallback(async () => {
    if (retryCountRef.current >= maxRetries) {
      retryCountRef.current = 0;
      return false;
    }

    retryCountRef.current += 1;
    const delay = Math.min(
      initialDelay * Math.pow(backoffMultiplier, retryCountRef.current - 1),
      maxDelay
    );

    return new Promise<boolean>(resolve => {
      timeoutRef.current = setTimeout(async () => {
        try {
          await retryFn();
          retryCountRef.current = 0; // Reset on success
          resolve(true);
        } catch {
          // Will retry again if maxRetries not reached
          if (retryCountRef.current < maxRetries) {
            const willRetry = await retry();
            resolve(willRetry);
          } else {
            retryCountRef.current = 0;
            resolve(false);
          }
        }
      }, delay);
    });
  }, [retryFn, maxRetries, initialDelay, maxDelay, backoffMultiplier]);

  const reset = useCallback(() => {
    retryCountRef.current = 0;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  return { retry, reset, retryCount: retryCountRef.current };
}
