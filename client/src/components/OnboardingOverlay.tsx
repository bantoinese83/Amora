import React, { useState, useEffect, useLayoutEffect } from 'react';
import { Button } from './common/Button';
import { storageRepository } from '../repositories/storageRepository';

const STORAGE_KEY = 'amora_onboarding_completed_v1';

interface Step {
  targetId: string | null; // null means center modal
  title: string;
  content: string;
}

const STEPS: Step[] = [
  {
    targetId: null,
    title: 'Welcome to Amora',
    content:
      'A therapist, coach, and journal in one app. Get emotional support, actionable guidance, and track your growth—all through natural voice conversations.',
  },
  {
    targetId: 'onboarding-orb',
    title: 'Tap to Speak',
    content:
      'Touch the orb to start talking with Amora. She listens and responds instantly—no typing needed.',
  },
  {
    targetId: 'onboarding-knowledge-btn',
    title: 'Add Context',
    content:
      'Upload documents (like journals or goals) here. Amora will use them to give you more personalized advice.',
  },
  {
    targetId: 'onboarding-history-btn',
    title: 'Your History',
    content: 'View your past conversations and insights here.',
  },
];

export const OnboardingOverlay: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [position, setPosition] = useState<{
    top: number;
    left: number;
    placement: 'bottom' | 'top';
  } | null>(null);

  useEffect(() => {
    const hasSeen = storageRepository.getString(STORAGE_KEY);
    if (!hasSeen) {
      // Small delay to ensure layout is stable
      const timer = setTimeout(() => setIsVisible(true), 1000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, []);

  const handleFinish = () => {
    setIsVisible(false);
    storageRepository.setString(STORAGE_KEY, 'true');
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleFinish();
    }
  };

  // Calculate position of the tooltip relative to target
  useLayoutEffect(() => {
    if (!isVisible) return undefined;

    const step = STEPS[currentStep];
    if (!step || !step.targetId) {
      setPosition(null); // Center
      return undefined;
    }

    const updatePosition = () => {
      const el = document.getElementById(step.targetId!);
      if (el) {
        const rect = el.getBoundingClientRect();
        // Simple logic: prefer bottom, but default to safe spacing
        // For buttons in header (top), show bottom.
        // For orb (center/bottom), show top if space is tight?
        // Given app layout: Header is top, Orb is middle/bottom.

        let top = rect.bottom + 20;
        let left = rect.left + rect.width / 2;
        let placement: 'bottom' | 'top' = 'bottom';

        // Check if Orb (it might be better to show above if low on screen)
        if (rect.top > window.innerHeight * 0.6) {
          top = rect.top - 20;
          placement = 'top';
        }

        setPosition({ top, left, placement });
      }
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    return () => window.removeEventListener('resize', updatePosition);
  }, [currentStep, isVisible]);

  if (!isVisible) return null;

  const step = STEPS[currentStep];
  if (!step) return null;

  const isCentered = !step.targetId || !position;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-white/80 backdrop-blur-[2px] transition-opacity duration-500" />

      {/* Content Container */}
      <div className="relative w-full h-full pointer-events-none">
        {/* If targeting an element, draw a spotlight ring (optional visual flair) */}
        {!isCentered && position && (
          <div
            className="absolute w-12 h-12 border-2 border-amora-500 rounded-full animate-ping opacity-75"
            style={{
              top: position.placement === 'bottom' ? position.top - 44 : position.top + 44, // rough offset back to center of target
              left: position.left - 24,
            }}
          />
        )}

        <div
          className={`
                pointer-events-auto absolute transition-all duration-500 ease-in-out
                bg-white border border-slate-200 p-6 rounded-2xl shadow-2xl max-w-sm w-[90%]
                ${isCentered ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2' : ''}
            `}
          style={
            !isCentered && position
              ? {
                  top: position.placement === 'bottom' ? position.top : 'auto',
                  bottom: position.placement === 'top' ? window.innerHeight - position.top : 'auto',
                  left: position.left,
                  transform: `translateX(-50%) translateY(${position.placement === 'bottom' ? '0' : '0'})`,
                }
              : {}
          }
        >
          <div className="flex justify-between items-start mb-4">
            <span className="text-xs font-bold text-amora-600 uppercase tracking-wider">
              Step {currentStep + 1} of {STEPS.length}
            </span>
            <button
              onClick={handleFinish}
              className="text-slate-500 hover:text-slate-900 text-xs underline"
            >
              Skip
            </button>
          </div>

          <h3 className="text-xl font-bold text-slate-900 mb-2">{step.title}</h3>
          <p className="text-slate-600 mb-6 leading-relaxed">{step.content}</p>

          <div className="flex justify-end gap-3">
            <Button onClick={handleNext} fullWidth={false} className="px-6 py-2 text-sm">
              {currentStep === STEPS.length - 1 ? 'Get Started' : 'Next'}
            </Button>
          </div>

          {/* Arrow Tip */}
          {!isCentered && (
            <div
              className={`absolute left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-l border-t border-slate-200 transform rotate-45 ${
                position?.placement === 'bottom' ? '-top-2.5' : '-bottom-2.5 rotate-[225deg]'
              }`}
            />
          )}
        </div>
      </div>
    </div>
  );
};
