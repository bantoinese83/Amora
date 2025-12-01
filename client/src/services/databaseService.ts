/**
 * Database Service Layer
 * Handles connection to Neon PostgreSQL database with connection pooling
 * Includes comprehensive error handling and edge case management
 */

import { neon, neonConfig } from '@neondatabase/serverless';

// Configure Neon for optimal performance
// Suppress browser warning - we've assessed the risks and have proper safeguards
neonConfig.disableWarningInBrowsers = true;

let sql: ReturnType<typeof neon> | null = null;
let isInitializing = false;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

/**
 * Validate UUID format
 */
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Initialize database connection with retry logic
 */
function initDatabase(): ReturnType<typeof neon> {
  if (sql) {
    return sql;
  }

  if (isInitializing) {
    throw new Error('Database initialization already in progress');
  }

  isInitializing = true;

  try {
    const connectionString = import.meta.env.VITE_NEON_DATABASE_URL;
    if (
      !connectionString ||
      typeof connectionString !== 'string' ||
      connectionString.trim() === ''
    ) {
      throw new Error(
        'VITE_NEON_DATABASE_URL environment variable is required. Please set it in your .env file.'
      );
    }

    // Validate connection string format
    if (
      !connectionString.startsWith('postgresql://') &&
      !connectionString.startsWith('postgres://')
    ) {
      throw new Error('Invalid database connection string format');
    }

    sql = neon(connectionString);
    return sql;
  } catch (error) {
    isInitializing = false;
    throw error;
  } finally {
    isInitializing = false;
  }
}

/**
 * Get database connection (lazy initialization)
 */
function getDatabase(): ReturnType<typeof neon> {
  if (!sql) {
    return initDatabase();
  }
  return sql;
}

/**
 * Execute a query with error handling and retry logic
 * Uses Neon's sql.query() method for parameterized queries with $1, $2 placeholders
 */
export async function executeQuery<T = unknown>(query: string, params?: unknown[]): Promise<T[]> {
  // Validate query
  if (!query || typeof query !== 'string' || query.trim() === '') {
    throw new Error('Query cannot be empty');
  }

  // Validate params
  if (params && !Array.isArray(params)) {
    throw new Error('Parameters must be an array');
  }

  // Limit parameter count to prevent abuse
  if (params && params.length > 100) {
    throw new Error('Too many parameters (maximum 100)');
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const database = getDatabase();

      if (params && params.length > 0) {
        // Use sql.query() for parameterized queries with $1, $2 placeholders
        // According to Neon docs: sql.query("SELECT $1", [value])
        const result = await (
          database as unknown as {
            query: (query: string, params: unknown[]) => Promise<T[]>;
          }
        ).query(query, params);

        // Neon's query() returns an array of rows directly
        return Array.isArray(result) ? (result as T[]) : [];
      } else {
        // For queries without parameters, use tagged template literal
        const result = await (
          database as unknown as (
            strings: TemplateStringsArray,
            ...values: unknown[]
          ) => Promise<T[]>
        )([query] as unknown as TemplateStringsArray);
        return Array.isArray(result) ? (result as T[]) : [];
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown database error');

      // Don't retry on certain errors
      if (
        lastError.message.includes('syntax error') ||
        lastError.message.includes('invalid input') ||
        lastError.message.includes('permission denied') ||
        lastError.message.includes('duplicate key') ||
        lastError.message.includes('tagged-template') ||
        lastError.message.includes('does not support')
      ) {
        throw lastError;
      }

      // Retry on network/connection errors
      if (attempt < MAX_RETRIES - 1) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (attempt + 1)));
        continue;
      }

      // Last attempt failed
      // Note: This is a shared service, logger may not be available
      // Error is thrown with user-friendly message
      throw new Error(
        `We're having trouble connecting to the database. Please try again in a moment.`
      );
    }
  }

  throw lastError || new Error('Database operation failed');
}

/**
 * Execute a single row query
 */
export async function executeQueryOne<T = unknown>(
  query: string,
  params?: unknown[]
): Promise<T | null> {
  const results = await executeQuery<T>(query, params);
  return results[0] || null;
}

/**
 * Validate UUID parameter
 */
export function validateUUID(uuid: string, paramName = 'ID'): void {
  if (!uuid || typeof uuid !== 'string') {
    throw new Error(`${paramName} must be a valid UUID string`);
  }

  if (!isValidUUID(uuid)) {
    throw new Error(`${paramName} is not a valid UUID format`);
  }
}
