/**
 * Subscription Service
 * Handles subscription management, status checking, and feature gating
 */
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
export declare function checkSubscriptionStatus(userId: string): Promise<SubscriptionStatus>;
/**
 * Update user premium status based on subscription
 */
export declare function updatePremiumStatus(userId: string, isPremium: boolean): Promise<void>;
/**
 * Feature gating - check if user has access to a feature
 */
export declare function hasFeatureAccess(userId: string): Promise<boolean>;
/**
 * Get subscription limits based on plan
 */
export declare function getSubscriptionLimits(isPremium: boolean): {
    maxSessions: number;
    maxSessionDuration: number;
    features: string[];
};
//# sourceMappingURL=subscriptionService.d.ts.map