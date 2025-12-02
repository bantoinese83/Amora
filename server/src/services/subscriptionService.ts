/**
 * Subscription Service (Server-side)
 * Handles subscription status updates
 */

import { userRepository } from '../../../shared/dist/src/repositories/userRepository.js';
import { logger } from '../utils/logger.js';

/**
 * Update user premium status
 */
export async function updatePremiumStatus(userId: string, isPremium: boolean): Promise<void> {
  try {
    await userRepository.updatePremiumStatus(userId, isPremium);
    logger.info('Premium status updated', { userId, isPremium });
  } catch (error) {
    logger.error(
      'Failed to update premium status',
      { userId, isPremium },
      error instanceof Error ? error : undefined
    );
    throw error;
  }
}
