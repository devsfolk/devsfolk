import React from 'react';
import { Check } from 'lucide-react';

interface EditorStepIndicatorProps {
  currentStep: 1 | 2 | 3 | 4;
}

const steps = [
  { number: 1, label: 'Template' },
  { number: 2, label: 'Color & Size' },
  { number: 3, label: 'Design' },
  { number: 4, label: 'Preview' },
];

export const EditorStepIndicator: React.FC<EditorStepIndicatorProps> = ({ currentStep }) => {
  return (
    <div className="w-full max-w-4xl mx-auto mb-8">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = step.number < currentStep;
          const isActive = step.number === currentStep;
          const isUpcoming = step.number > currentStep;

          return (
            <React.Fragment key={step.number}>
              {/* Step Circle */}
              <div className="flex flex-col items-center relative">
                <div
                  className={`
                    w-12 h-12 rounded-full flex items-center justify-center font-black text-sm transition-all
                    ${isCompleted ? 'bg-green-600 text-white' : ''}
                    ${isActive ? 'bg-black text-white ring-4 ring-black/10' : ''}
                    ${isUpcoming ? 'bg-gray-200 text-gray-400' : ''}
                  `}
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    step.number
                  )}
                </div>
                <p
                  className={`
                    mt-2 text-xs font-black uppercase tracking-wider whitespace-nowrap
                    ${isCompleted || isActive ? 'text-black' : 'text-gray-400'}
                  `}
                >
                  {step.label}
                </p>
              </div>

              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div
                  className={`
                    flex-1 h-1 mx-2 transition-all
                    ${step.number < currentStep ? 'bg-green-600' : 'bg-gray-200'}
                  `}
                  style={{ minWidth: '40px' }}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
