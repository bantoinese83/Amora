/**
 * Subscription Service (Server-side)
 * Handles subscription status updates
 */

import { userRepository } from '../../../shared/dist/src/repositories/userRepository.js';

/**
 * Update user premium status
 */
export async function updatePremiumStatus(userId: string, isPremium: boolean): Promise<void> {
  try {
    await userRepository.updatePremiumStatus(userId, isPremium);
  } catch (error) {
    console.error('Failed to update premium status:', error);
    throw error;
  }
}
