import React from 'react';
import { useApp } from '../context/AppContext';
import { Button } from './common/Button';
import { Card } from './common/Card';
import { getSubscriptionLimits } from '../services/subscriptionService';

interface UpgradePromptProps {
  reason?: 'session_limit' | 'duration_limit' | 'analysis_limit' | 'feature_locked';
  currentCount?: number;
  maxCount?: number;
}

export const UpgradePrompt: React.FC<UpgradePromptProps> = ({
  reason = 'feature_locked',
  maxCount,
}) => {
  const { authState, openModal } = useApp();
  const isPremium = authState.user?.isPremium || false;

  // Don't show if already premium
  if (isPremium) {
    return null;
  }

  const limits = getSubscriptionLimits(false);

  const getMessage = () => {
    switch (reason) {
      case 'session_limit':
        return `You've reached your session limit (${maxCount || limits.maxSessions} sessions). Upgrade to premium for unlimited sessions.`;
      case 'duration_limit':
        return `Session duration limit reached (${limits.maxSessionDuration / 60} minutes). Upgrade to premium for longer sessions.`;
      case 'analysis_limit':
        return `You've used your free AI analysis (${maxCount || limits.maxAnalyses} analysis). Upgrade to premium for unlimited insights.`;
      default:
        return 'Upgrade to premium to unlock all features.';
    }
  };

  return (
    <Card className="bg-amora-50 border-amora-200">
      <div className="text-center space-y-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">Unlock Full Access</h3>
          <p className="text-xs text-amora-600 mb-2 font-medium">Get the complete therapist, coach & journal experience</p>
          <p className="text-slate-700 text-sm">{getMessage()}</p>
        </div>

        <div className="space-y-2.5 text-sm text-slate-700">
          <div className="flex items-center justify-center gap-2">
            <span className="text-green-600 text-base">✓</span>
            <span className="font-medium">Unlimited therapy sessions</span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <span className="text-green-600 text-base">✓</span>
            <span className="font-medium">Extended sessions (up to 1 hour)</span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <span className="text-green-600 text-base">✓</span>
            <span className="font-medium">Unlimited coaching insights & analysis</span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <span className="text-green-600 text-base">✓</span>
            <span className="font-medium">Complete journal history & audio playback</span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <span className="text-green-600 text-base">✓</span>
            <span className="font-medium">Priority support</span>
          </div>
        </div>

        <Button
          onClick={() => openModal('auth')}
          className="bg-gradient-to-r from-amora-500 to-pink-500 hover:from-amora-600 hover:to-pink-600"
        >
          Upgrade to Premium
        </Button>
      </div>
    </Card>
  );
};
