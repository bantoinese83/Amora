/**
 * Data Access Layer - Preferences Repository
 * Handles user preferences persistence with Neon database
 * Includes comprehensive validation and edge case handling
 */
declare class PreferencesRepository {
    /**
     * Get selected voice for a user
     */
    getSelectedVoice(userId: string): Promise<string>;
    /**
     * Set selected voice for a user
     */
    setSelectedVoice(userId: string, voice: string): Promise<void>;
    /**
     * Initialize preferences for a new user (called after user creation)
     */
    initializePreferences(userId: string): Promise<void>;
}
declare const preferencesRepository: PreferencesRepository;
export { preferencesRepository };
//# sourceMappingURL=preferencesRepository.d.ts.map