'use client'

import Spinner from '@/components/ui/Spinner'

interface PageScreenSpinnerProps {
  label?: string
}

export default function PageScreenSpinner({
  label = 'Loading your page...',
}: PageScreenSpinnerProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[radial-gradient(circle_at_top,rgba(1,67,132,0.10),transparent_28%),linear-gradient(180deg,#eef5fd_0%,#ffffff_52%,#f4f7fb_100%)] px-6">
      <div className="flex w-full max-w-xs flex-col items-center rounded-[28px] border border-white/80 bg-white/92 px-6 py-8 text-center shadow-[0_24px_70px_rgba(1,67,132,0.14)] backdrop-blur">
        <Spinner size="lg" />
        <p className="mt-5 text-sm font-semibold text-[#014384]">{label}</p>
        <p className="mt-2 text-xs leading-5 text-gray-500">
          Please wait while we prepare the latest content.
        </p>
      </div>
    </div>
  )
}
