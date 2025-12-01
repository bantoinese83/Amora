/**
 * Subscription Service
 * Handles subscription management, status checking, and feature gating
 */

import { userRepository } from '../repositories/userRepository.js';

export interface SubscriptionStatus {
  isActive: boolean;
  subscriptionId?: string;
  customerId?: string;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd?: boolean;
}

/**
 * Check if user has an active subscription
 * This would typically check Stripe subscriptions via webhook or API
 * For now, we check the database premium status
 */
export async function checkSubscriptionStatus(userId: string): Promise<SubscriptionStatus> {
  try {
    const user = await userRepository.getUserById(userId);
    if (!user) {
      return { isActive: false };
    }

    return {
      isActive: user.is_premium || false,
      // In a real implementation, you'd fetch this from Stripe
      // For now, we rely on the database premium status
    };
  } catch (error) {
    console.error('Failed to check subscription status:', error);
    return { isActive: false };
  }
}

/**
 * Update user premium status based on subscription
 */
export async function updatePremiumStatus(userId: string, isPremium: boolean): Promise<void> {
  try {
    await userRepository.updatePremiumStatus(userId, isPremium);
  } catch (error) {
    console.error('Failed to update premium status:', error);
    throw error;
  }
}

/**
 * Feature gating - check if user has access to a feature
 */
export async function hasFeatureAccess(userId: string): Promise<boolean> {
  const status = await checkSubscriptionStatus(userId);
  return status.isActive;
}

/**
 * Get subscription limits based on plan
 */
export function getSubscriptionLimits(isPremium: boolean): {
  maxSessions: number;
  maxSessionDuration: number; // in seconds
  features: string[];
} {
  if (isPremium) {
    return {
      maxSessions: Infinity,
      maxSessionDuration: 3600, // 1 hour
      features: [
        'unlimited_sessions',
        'premium_insights',
        'priority_support',
        'audio_playback',
        'session_history',
      ],
    };
  }

  // Free tier limits
  return {
    maxSessions: 3, // Limited sessions for free users
    maxSessionDuration: 600, // 10 minutes
    features: ['basic_sessions'],
  };
}
