'use client'

import { CheckCircle, Info, XCircle } from 'lucide-react'
import { cn } from '@/utils/cn'

interface AuthStatusToastProps {
  message: string | null
  tone?: 'info' | 'success' | 'error'
}

export default function AuthStatusToast({
  message,
  tone = 'info',
}: AuthStatusToastProps) {
  if (!message) {
    return null
  }

  const toneClasses = {
    info: 'border-[#cfe4fb] bg-[#f2f8ff] text-[#014384]',
    success: 'border-[#cdeed8] bg-[#effaf3] text-[#148341]',
    error: 'border-[#ffd2d2] bg-[#fff4f4] text-[#b42323]',
  }
  const Icon = tone === 'success' ? CheckCircle : tone === 'error' ? XCircle : Info

  return (
    <div className="fixed left-4 right-4 top-4 z-[120] flex justify-center">
      <div
        className={cn(
          'flex w-full max-w-sm items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold shadow-[0_18px_45px_rgba(1,67,132,0.16)]',
          toneClasses[tone]
        )}
        role="status"
        aria-live="polite"
      >
        <Icon className="h-5 w-5 flex-none" strokeWidth={2.2} />
        <span className="leading-5">{message}</span>
      </div>
    </div>
  )
}
