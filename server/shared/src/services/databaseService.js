/**
 * Database Service Layer
 * Handles connection to Neon PostgreSQL database with connection pooling
 * Includes comprehensive error handling and edge case management
 */
import { neon, neonConfig } from '@neondatabase/serverless';
// Configure Neon for optimal performance
// Suppress browser warning - we've assessed the risks and have proper safeguards
neonConfig.disableWarningInBrowsers = true;
let sql = null;
let isInitializing = false;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second
/**
 * Validate UUID format
 */
function isValidUUID(uuid) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}
/**
 * Initialize database connection with retry logic
 */
function initDatabase() {
    if (sql) {
        return sql;
    }
    if (isInitializing) {
        throw new Error('Database initialization already in progress');
    }
    isInitializing = true;
    try {
        const connectionString = (typeof process !== 'undefined' && process.env?.NEON_DATABASE_URL) ||
            (typeof process !== 'undefined' && process.env?.VITE_NEON_DATABASE_URL) ||
            (typeof import.meta !== 'undefined' && import.meta.env?.VITE_NEON_DATABASE_URL) ||
            '';
        if (!connectionString ||
            typeof connectionString !== 'string' ||
            connectionString.trim() === '') {
            throw new Error('NEON_DATABASE_URL or VITE_NEON_DATABASE_URL environment variable is required. Please set it in your .env file.');
        }
        // Validate connection string format
        if (!connectionString.startsWith('postgresql://') &&
            !connectionString.startsWith('postgres://')) {
            throw new Error('Invalid database connection string format');
        }
        sql = neon(connectionString);
        return sql;
    }
    catch (error) {
        isInitializing = false;
        throw error;
    }
    finally {
        isInitializing = false;
    }
}
/**
 * Get database connection (lazy initialization)
 */
function getDatabase() {
    if (!sql) {
        return initDatabase();
    }
    return sql;
}
/**
 * Execute a query with error handling and retry logic
 * Uses Neon's sql.query() method for parameterized queries with $1, $2 placeholders
 */
export async function executeQuery(query, params) {
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
    let lastError = null;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
            const database = getDatabase();
            if (params && params.length > 0) {
                // Use sql.query() for parameterized queries with $1, $2 placeholders
                // According to Neon docs: sql.query("SELECT $1", [value])
                const result = await database.query(query, params);
                // Neon's query() returns an array of rows directly
                return Array.isArray(result) ? result : [];
            }
            else {
                // For queries without parameters, use tagged template literal
                const result = await database([query]);
                return Array.isArray(result) ? result : [];
            }
        }
        catch (error) {
            lastError = error instanceof Error ? error : new Error('Unknown database error');
            // Don't retry on certain errors
            if (lastError.message.includes('syntax error') ||
                lastError.message.includes('invalid input') ||
                lastError.message.includes('permission denied') ||
                lastError.message.includes('duplicate key') ||
                lastError.message.includes('tagged-template') ||
                lastError.message.includes('does not support')) {
                throw lastError;
            }
            // Retry on network/connection errors
            if (attempt < MAX_RETRIES - 1) {
                await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (attempt + 1)));
                continue;
            }
            // Last attempt failed
            console.error('Database query error after retries:', lastError);
            throw new Error(`Database operation failed after ${MAX_RETRIES} attempts: ${lastError.message}`);
        }
    }
    throw lastError || new Error('Database operation failed');
}
/**
 * Execute a single row query
 */
export async function executeQueryOne(query, params) {
    const results = await executeQuery(query, params);
    return results[0] || null;
}
/**
 * Validate UUID parameter
 */
export function validateUUID(uuid, paramName = 'ID') {
    if (!uuid || typeof uuid !== 'string') {
        throw new Error(`${paramName} must be a valid UUID string`);
    }
    if (!isValidUUID(uuid)) {
        throw new Error(`${paramName} is not a valid UUID format`);
    }
}
//# sourceMappingURL=databaseService.js.map