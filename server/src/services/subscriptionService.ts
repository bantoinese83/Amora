/**
 * Subscription Service (Server-side)
 * Handles subscription status updates
 */

import { userRepository } from '../../../shared/src/repositories/userRepository';

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
