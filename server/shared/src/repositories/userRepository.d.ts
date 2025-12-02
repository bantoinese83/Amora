/**
 * User Repository
 * Handles user authentication and data persistence with Neon database
 * Includes comprehensive validation and edge case handling
 */
export interface User {
  id: string;
  email: string;
  name: string;
  is_premium: boolean;
  created_at: Date;
  updated_at: Date;
}
export interface UserWithPreferences extends User {
  selected_voice: string;
}
declare class UserRepository {
  /**
   * Create a new user with email and PIN
   */
  createUser(email: string, pin: string, name: string): Promise<User>;
  /**
   * Authenticate user with email and PIN
   */
  authenticateUser(email: string, pin: string): Promise<User | null>;
  /**
   * Get user by ID
   */
  getUserById(userId: string): Promise<User | null>;
  /**
   * Get user with preferences
   */
  getUserWithPreferences(userId: string): Promise<UserWithPreferences | null>;
  /**
   * Update user PIN
   */
  updateUserPin(userId: string, newPin: string): Promise<void>;
  /**
   * Update user premium status
   */
  updatePremiumStatus(userId: string, isPremium: boolean): Promise<void>;
  /**
   * Check if email exists
   */
  emailExists(email: string): Promise<boolean>;
  /**
   * Find user by email
   */
  findByEmail(email: string): Promise<User | null>;
}
declare const userRepository: UserRepository;
export { userRepository };
//# sourceMappingURL=userRepository.d.ts.map
