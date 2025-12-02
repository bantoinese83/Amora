/**
 * Database Service Layer
 * Handles connection to Neon PostgreSQL database with connection pooling
 * Includes comprehensive error handling and edge case management
 */
/**
 * Execute a query with error handling and retry logic
 * Uses Neon's sql.query() method for parameterized queries with $1, $2 placeholders
 */
export declare function executeQuery<T = unknown>(query: string, params?: unknown[]): Promise<T[]>;
/**
 * Execute a single row query
 */
export declare function executeQueryOne<T = unknown>(
  query: string,
  params?: unknown[]
): Promise<T | null>;
/**
 * Validate UUID parameter
 */
export declare function validateUUID(uuid: string, paramName?: string): void;
//# sourceMappingURL=databaseService.d.ts.map
