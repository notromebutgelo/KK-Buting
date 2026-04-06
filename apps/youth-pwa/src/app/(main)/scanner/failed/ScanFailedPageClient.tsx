'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'

export default function ScanFailedPageClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const reason = searchParams.get('reason') || 'invalid'

  const messages: Record<string, { title: string; desc: string }> = {
    invalid: { title: 'Invalid QR Code', desc: 'This QR code is not recognized as a valid KK event code.' },
    expired: { title: 'QR Code Expired', desc: 'This QR code has already expired. Please use a valid event QR code.' },
    already_scanned: { title: 'Already Scanned', desc: 'You have already scanned this QR code. Each code can only be scanned once.' },
    not_verified: { title: 'Profile Not Verified', desc: 'You need to complete verification before earning points.' },
  }

  const { title, desc } = messages[reason] || messages.invalid

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center px-5">
      <div className="text-center">
        <div className="w-32 h-32 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-red-500/30">
          <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>

        <h1 className="text-3xl font-black text-white mb-2">{title}</h1>
        <p className="text-gray-400 text-sm max-w-xs mx-auto">{desc}</p>

        <div className="space-y-3 w-full max-w-xs mx-auto mt-8">
          <Button
            fullWidth
            onClick={() => router.push('/scanner')}
            className="bg-red-600 hover:bg-red-700"
          >
            Try Again
          </Button>
          <Button
            variant="ghost"
            fullWidth
            onClick={() => router.push('/home')}
            className="text-white hover:bg-white/10"
          >
            Back to Home
          </Button>
        </div>
      </div>
    </div>
  )
}
