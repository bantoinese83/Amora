/**
 * Subscription Service
 * Handles subscription management, status checking, and feature gating
 */

import { userRepository } from '../repositories/userRepository';
import { logger } from '../utils/logger';

export interface SubscriptionStatus {
  isActive: boolean;
  subscriptionId?: string;
  customerId?: string;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd?: boolean;
  paymentMethod?: string; // e.g., "•••• 4242"
  paymentBrand?: string; // e.g., "visa", "mastercard"
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
    logger.error(
      'Failed to check subscription status',
      { userId },
      error instanceof Error ? error : undefined
    );
    return { isActive: false };
  }
}

/**
 * Update user premium status based on subscription
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

/**
 * Feature gating - check if user has access to a feature
 */
export async function hasFeatureAccess(userId: string): Promise<boolean> {
  const status = await checkSubscriptionStatus(userId);
  return status.isActive;
}

/**
 * Get subscription details including payment method and billing date
 */
export async function getSubscriptionDetails(userId: string): Promise<SubscriptionStatus | null> {
  try {
    const API_URL = import.meta.env.VITE_API_URL || 'https://amora-server-production.up.railway.app';
    const response = await fetch(`${API_URL}/api/subscription/status/${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      logger.error('Failed to fetch subscription details', { userId, status: response.status });
      return null;
    }

    const data = await response.json();
    return {
      isActive: data.isActive || false,
      subscriptionId: data.subscriptionId,
      customerId: data.customerId,
      currentPeriodEnd: data.currentPeriodEnd ? new Date(data.currentPeriodEnd) : undefined,
      cancelAtPeriodEnd: data.cancelAtPeriodEnd || false,
      paymentMethod: data.paymentMethod,
      paymentBrand: data.paymentBrand,
    };
  } catch (error) {
    logger.error(
      'Error fetching subscription details',
      { userId },
      error instanceof Error ? error : undefined
    );
    return null;
  }
}

/**
 * Get subscription limits based on plan
 */
export function getSubscriptionLimits(isPremium: boolean): {
  maxSessions: number;
  maxSessionDuration: number; // in seconds
  maxAnalyses: number;
  features: string[];
} {
  if (isPremium) {
    return {
      maxSessions: Infinity,
      maxSessionDuration: 3600, // 1 hour
      maxAnalyses: Infinity,
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
    maxSessionDuration: 300, // 5 minutes
    maxAnalyses: 1, // 1 AI analysis for free users
    features: ['basic_sessions'],
  };
}
