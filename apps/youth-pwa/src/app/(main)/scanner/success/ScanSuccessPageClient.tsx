'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { formatPoints } from '@/utils/formatPoints'
import Button from '@/components/ui/Button'

export default function ScanSuccessPageClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const points = parseInt(searchParams.get('points') || '0', 10)

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center px-5">
      <div className="text-center">
        <div className="w-32 h-32 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-green-500/30">
          <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="text-4xl font-black text-white mb-2">
          +{formatPoints(points)}
        </h1>
        <p className="text-green-400 font-bold text-xl mb-2">KK Points Earned!</p>
        <p className="text-gray-400 text-sm">
          QR code scanned successfully. Keep participating in KK activities to earn more points!
        </p>

        <div className="mt-8 bg-white/10 border border-white/20 rounded-2xl p-4 text-center mb-8">
          <p className="text-gray-300 text-sm">Points have been added to your account</p>
          <p className="text-green-400 font-bold mt-1">Check your balance on the home screen</p>
        </div>

        <div className="space-y-3 w-full max-w-xs mx-auto">
          <Button
            fullWidth
            onClick={() => router.push('/scanner')}
            className="bg-green-600 hover:bg-green-700"
          >
            Scan Another Code
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
