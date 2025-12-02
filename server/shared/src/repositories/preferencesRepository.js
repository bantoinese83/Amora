/**
 * Data Access Layer - Preferences Repository
 * Handles user preferences persistence with Neon database
 * Includes comprehensive validation and edge case handling
 */
import { executeQuery, executeQueryOne, validateUUID } from '../services/databaseService';
// Valid voice options
const VALID_VOICES = ['Kore', 'Charon', 'Fenrir', 'Aoede', 'Puck'];
/**
 * Validate voice name
 */
function validateVoice(voice) {
  if (!voice || typeof voice !== 'string') {
    return 'Kore'; // Default fallback
  }
  const trimmed = voice.trim();
  if (VALID_VOICES.includes(trimmed)) {
    return trimmed;
  }
  // Return default if invalid
  console.warn(`Invalid voice "${trimmed}", defaulting to "Kore"`);
  return 'Kore';
}
class PreferencesRepository {
  /**
   * Get selected voice for a user
   */
  async getSelectedVoice(userId) {
    if (!userId) {
      return 'Kore';
    }
    try {
      validateUUID(userId, 'User ID');
    } catch (error) {
      console.error('Invalid user ID for preferences:', error);
      return 'Kore';
    }
    try {
      const result = await executeQueryOne(
        `SELECT selected_voice
         FROM user_preferences
         WHERE user_id = $1`,
        [userId]
      );
      return validateVoice(result?.selected_voice || 'Kore');
    } catch (error) {
      console.error('Failed to get selected voice:', error);
      return 'Kore'; // Default fallback
    }
  }
  /**
   * Set selected voice for a user
   */
  async setSelectedVoice(userId, voice) {
    if (!userId) {
      throw new Error('User ID is required');
    }
    validateUUID(userId, 'User ID');
    const validatedVoice = validateVoice(voice);
    try {
      await executeQuery(
        `INSERT INTO user_preferences (user_id, selected_voice)
         VALUES ($1, $2)
         ON CONFLICT (user_id)
         DO UPDATE SET selected_voice = $2`,
        [userId, validatedVoice]
      );
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        throw new Error('User not found');
      }
      throw error;
    }
  }
  /**
   * Initialize preferences for a new user (called after user creation)
   */
  async initializePreferences(userId) {
    if (!userId) {
      throw new Error('User ID is required');
    }
    try {
      validateUUID(userId, 'User ID');
    } catch {
      throw new Error('Invalid user ID');
    }
    try {
      await executeQuery(
        `INSERT INTO user_preferences (user_id, selected_voice)
         VALUES ($1, $2)
         ON CONFLICT (user_id) DO NOTHING`,
        [userId, 'Kore']
      );
    } catch (error) {
      // Log but don't throw - preferences can be created later
      console.warn('Failed to initialize preferences:', error);
    }
  }
}
const preferencesRepository = new PreferencesRepository();
export { preferencesRepository };
//# sourceMappingURL=preferencesRepository.js.map
