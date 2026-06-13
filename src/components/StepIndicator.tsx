import { cn } from '@/lib/utils';

interface StepIndicatorProps {
  steps: string[];
  currentStep: number;
  className?: string;
}

export const StepIndicator = ({ steps, currentStep, className }: StepIndicatorProps) => {
  return (
    <div className={cn('flex items-center w-full', className)}>
      {steps.map((step, index) => (
        <div key={index} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center">
            <div
              className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300',
                index < currentStep
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                  : index === currentStep
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 ring-4 ring-blue-100'
                  : 'bg-gray-200 text-gray-500'
              )}
            >
              {index < currentStep ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                index + 1
              )}
            </div>
            <span
              className={cn(
                'mt-2 text-xs font-medium whitespace-nowrap',
                index === currentStep ? 'text-blue-600' : index < currentStep ? 'text-emerald-600' : 'text-gray-400'
              )}
            >
              {step}
            </span>
          </div>
          {index < steps.length - 1 && (
            <div
              className={cn(
                'h-1 flex-1 mx-4 rounded-full transition-all duration-500',
                index < currentStep ? 'bg-emerald-500' : 'bg-gray-200'
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
};
