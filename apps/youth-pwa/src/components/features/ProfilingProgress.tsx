interface ProfilingProgressProps {
  currentStep: number
  totalSteps: number
  stepTitle?: string
}

export default function ProfilingProgress({ currentStep, totalSteps, stepTitle }: ProfilingProgressProps) {
  const progress = (currentStep / totalSteps) * 100

  return (
    <div className="px-4 pt-4 pb-2">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">
          Step {currentStep} of {totalSteps}
        </span>
        {stepTitle && <span className="text-sm text-gray-500">{stepTitle}</span>}
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-green-500 to-teal-500 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="flex gap-1 mt-2">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className={`flex-1 h-1 rounded-full transition-colors duration-300 ${
              i < currentStep ? 'bg-green-500' : 'bg-gray-200'
            }`}
          />
        ))}
      </div>
    </div>
  )
}
