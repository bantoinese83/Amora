import React from 'react';

interface ProgressIndicatorProps {
  steps: string[];
  currentStep: number;
  className?: string;
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  steps,
  currentStep,
  className = '',
}) => {
  return (
    <div className={`flex items-center justify-between mb-6 ${className}`}>
      {steps.map((step, index) => {
        const stepNumber = index + 1;
        const isActive = stepNumber === currentStep;
        const isCompleted = stepNumber < currentStep;

        return (
          <React.Fragment key={step}>
            <div className="flex flex-col items-center flex-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
                  isCompleted
                    ? 'bg-amora-500 text-white'
                    : isActive
                      ? 'bg-amora-500 text-white ring-4 ring-amora-500/20'
                      : 'bg-white text-slate-400 border-2 border-slate-300'
                }`}
              >
                {isCompleted ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  stepNumber
                )}
              </div>
              <span
                className={`mt-2 text-xs font-medium transition-colors ${
                  isActive ? 'text-amora-600' : isCompleted ? 'text-slate-500' : 'text-slate-400'
                }`}
              >
                {step}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-2 transition-colors duration-300 ${
                  isCompleted ? 'bg-amora-500' : 'bg-slate-200'
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};
