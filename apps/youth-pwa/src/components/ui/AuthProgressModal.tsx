'use client'

import { useEffect } from 'react'
import Spinner from '@/components/ui/Spinner'

interface AuthProgressModalProps {
  isOpen: boolean
  title?: string
  message?: string
}

export default function AuthProgressModal({
  isOpen,
  title = 'Signing You In',
  message = 'Please wait while we verify your account and prepare your dashboard.',
}: AuthProgressModalProps) {
  useEffect(() => {
    if (!isOpen) {
      return
    }

    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[radial-gradient(circle_at_top,rgba(1,67,132,0.12),transparent_30%),linear-gradient(180deg,rgba(238,245,253,0.94)_0%,rgba(255,255,255,0.96)_52%,rgba(244,247,251,0.98)_100%)] px-6 backdrop-blur-sm">
      <div className="flex w-full max-w-sm flex-col items-center rounded-[30px] border border-white/85 bg-white/95 px-7 py-8 text-center shadow-[0_28px_80px_rgba(1,67,132,0.18)]">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[radial-gradient(circle_at_top,#ffe09a_0%,#fcb315_52%,#f8c85a_100%)] shadow-[0_14px_34px_rgba(252,179,21,0.24)]">
          <Spinner size="md" className="border-white/30 border-t-[#014384]" />
        </div>
        <h2 className="mt-5 text-xl font-black text-[#014384]">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-gray-500">{message}</p>
      </div>
    </div>
  )
}
