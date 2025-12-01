/**
 * User Repository
 * Handles user authentication and data persistence with Neon database
 * Includes comprehensive validation and edge case handling
 */
import bcrypt from 'bcryptjs';
import { executeQuery, executeQueryOne, validateUUID } from '../services/databaseService';
// Constants for validation
const MAX_EMAIL_LENGTH = 255;
const MAX_NAME_LENGTH = 255;
const MIN_NAME_LENGTH = 1;
const MIN_PIN_LENGTH = 4;
const MAX_PIN_LENGTH = 6;
/**
 * Validate and normalize email
 */
function validateEmail(email) {
    if (!email || typeof email !== 'string') {
        throw new Error('Email is required');
    }
    const trimmed = email.trim();
    if (trimmed.length === 0) {
        throw new Error('Email cannot be empty');
    }
    if (trimmed.length > MAX_EMAIL_LENGTH) {
        throw new Error(`Email must be ${MAX_EMAIL_LENGTH} characters or less`);
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
        throw new Error('Invalid email format');
    }
    return trimmed.toLowerCase();
}
/**
 * Validate and normalize name
 */
function validateName(name) {
    if (!name || typeof name !== 'string') {
        throw new Error('Name is required');
    }
    const trimmed = name.trim();
    if (trimmed.length < MIN_NAME_LENGTH) {
        throw new Error(`Name must be at least ${MIN_NAME_LENGTH} character`);
    }
    if (trimmed.length > MAX_NAME_LENGTH) {
        throw new Error(`Name must be ${MAX_NAME_LENGTH} characters or less`);
    }
    // Remove excessive whitespace
    return trimmed.replace(/\s+/g, ' ');
}
/**
 * Validate PIN
 */
function validatePIN(pin) {
    if (!pin || typeof pin !== 'string') {
        throw new Error('PIN is required');
    }
    if (pin.length < MIN_PIN_LENGTH || pin.length > MAX_PIN_LENGTH) {
        throw new Error(`PIN must be ${MIN_PIN_LENGTH}-${MAX_PIN_LENGTH} digits`);
    }
    if (!/^\d+$/.test(pin)) {
        throw new Error('PIN must contain only digits');
    }
}
class UserRepository {
    /**
     * Create a new user with email and PIN
     */
    async createUser(email, pin, name) {
        // Validate inputs
        const normalizedEmail = validateEmail(email);
        validatePIN(pin);
        const normalizedName = validateName(name);
        // Hash PIN with bcrypt (10 rounds)
        let pinHash;
        try {
            pinHash = await bcrypt.hash(pin, 10);
        }
        catch {
            throw new Error('Failed to hash PIN. Please try again.');
        }
        try {
            // Insert user
            const userResult = await executeQueryOne(`INSERT INTO users (email, pin_hash, name, is_premium)
         VALUES ($1, $2, $3, $4)
         RETURNING id, email, name, is_premium, created_at, updated_at`, [normalizedEmail, pinHash, normalizedName, false]);
            if (!userResult) {
                throw new Error('Failed to create user');
            }
            // Create default preferences (with error handling)
            try {
                await executeQuery(`INSERT INTO user_preferences (user_id, selected_voice)
           VALUES ($1, $2)
           ON CONFLICT (user_id) DO NOTHING`, [userResult.id, 'Kore']);
            }
            catch (prefError) {
                // Log but don't fail user creation if preferences fail
                console.warn('Failed to create user preferences:', prefError);
                // User can still use the app, preferences will be created on first access
            }
            return userResult;
        }
        catch (error) {
            if (error instanceof Error) {
                // Handle specific database errors
                if (error.message.includes('unique constraint') ||
                    error.message.includes('duplicate key')) {
                    throw new Error('An account with this email already exists');
                }
                if (error.message.includes('violates check constraint')) {
                    throw new Error('Invalid user data provided');
                }
                if (error.message.includes('value too long')) {
                    throw new Error('One or more fields exceed maximum length');
                }
            }
            throw error;
        }
    }
    /**
     * Authenticate user with email and PIN
     */
    async authenticateUser(email, pin) {
        // Validate inputs
        let normalizedEmail;
        try {
            normalizedEmail = validateEmail(email);
        }
        catch {
            // Return null for invalid email instead of throwing
            return null;
        }
        validatePIN(pin);
        try {
            const user = await executeQueryOne(`SELECT id, email, name, is_premium, pin_hash, created_at, updated_at
         FROM users
         WHERE email = $1`, [normalizedEmail]);
            if (!user || !user.pin_hash) {
                return null;
            }
            // Verify PIN with timing-safe comparison
            let isValid;
            try {
                isValid = await bcrypt.compare(pin, user.pin_hash);
            }
            catch (error) {
                // Log but don't expose bcrypt errors
                console.error('PIN verification error:', error);
                return null;
            }
            if (!isValid) {
                return null;
            }
            // Return user without PIN hash
            const { pin_hash, ...userWithoutPin } = user;
            return userWithoutPin;
        }
        catch (error) {
            console.error('Authentication error:', error);
            // Don't expose database errors to user
            return null;
        }
    }
    /**
     * Get user by ID
     */
    async getUserById(userId) {
        if (!userId) {
            return null;
        }
        try {
            validateUUID(userId, 'User ID');
        }
        catch {
            return null;
        }
        try {
            return executeQueryOne(`SELECT id, email, name, is_premium, created_at, updated_at
         FROM users
         WHERE id = $1`, [userId]);
        }
        catch (error) {
            console.error('Failed to get user by ID:', error);
            return null;
        }
    }
    /**
     * Get user with preferences
     */
    async getUserWithPreferences(userId) {
        if (!userId) {
            return null;
        }
        try {
            validateUUID(userId, 'User ID');
        }
        catch {
            return null;
        }
        try {
            const result = await executeQueryOne(`SELECT u.id, u.email, u.name, u.is_premium, u.created_at, u.updated_at,
                COALESCE(up.selected_voice, 'Kore') as selected_voice
         FROM users u
         LEFT JOIN user_preferences up ON u.id = up.user_id
         WHERE u.id = $1`, [userId]);
            return result;
        }
        catch (error) {
            console.error('Failed to get user with preferences:', error);
            return null;
        }
    }
    /**
     * Update user PIN
     */
    async updateUserPin(userId, newPin) {
        if (!userId) {
            throw new Error('User ID is required');
        }
        validateUUID(userId, 'User ID');
        validatePIN(newPin);
        let pinHash;
        try {
            pinHash = await bcrypt.hash(newPin, 10);
        }
        catch {
            throw new Error('Failed to hash PIN. Please try again.');
        }
        try {
            const result = await executeQuery(`UPDATE users SET pin_hash = $1 WHERE id = $2`, [
                pinHash,
                userId,
            ]);
            // Verify update succeeded
            if (!Array.isArray(result) || result.length === 0) {
                throw new Error('Failed to update PIN');
            }
        }
        catch (error) {
            if (error instanceof Error && error.message.includes('not found')) {
                throw new Error('User not found');
            }
            throw error;
        }
    }
    /**
     * Update user premium status
     */
    async updatePremiumStatus(userId, isPremium) {
        if (!userId) {
            throw new Error('User ID is required');
        }
        validateUUID(userId, 'User ID');
        if (typeof isPremium !== 'boolean') {
            throw new Error('Premium status must be a boolean');
        }
        try {
            await executeQuery(`UPDATE users SET is_premium = $1 WHERE id = $2`, [isPremium, userId]);
        }
        catch (error) {
            if (error instanceof Error && error.message.includes('not found')) {
                throw new Error('User not found');
            }
            throw error;
        }
    }
    /**
     * Check if email exists
     */
    async emailExists(email) {
        try {
            const normalizedEmail = validateEmail(email);
            const result = await executeQueryOne(`SELECT EXISTS(SELECT 1 FROM users WHERE email = $1) as exists`, [normalizedEmail]);
            return result?.exists === true;
        }
        catch (error) {
            // Return false on error to allow signup flow to proceed
            console.error('Failed to check email existence:', error);
            return false;
        }
    }
    /**
     * Find user by email
     */
    async findByEmail(email) {
        try {
            const normalizedEmail = validateEmail(email);
            return await executeQueryOne(`SELECT id, email, name, is_premium, created_at, updated_at
         FROM users
         WHERE email = $1`, [normalizedEmail]);
        }
        catch (error) {
            console.error('Failed to find user by email:', error);
            return null;
        }
    }
}
const userRepository = new UserRepository();
export { userRepository };
//# sourceMappingURL=userRepository.js.map