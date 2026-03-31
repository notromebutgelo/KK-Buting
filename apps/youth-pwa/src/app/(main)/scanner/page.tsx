'use client'
import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import api from '@/lib/api'
import PageHeader from '@/components/layout/PageHeader'
import Spinner from '@/components/ui/Spinner'

const QRScanner = dynamic(() => import('@/components/features/QRScanner'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-64 bg-gray-900 rounded-2xl">
      <Spinner size="md" className="border-white/30 border-t-white" />
    </div>
  ),
})

export default function ScannerPage() {
  const router = useRouter()
  const [isProcessing, setIsProcessing] = useState(false)
  const [scanActive, setScanActive] = useState(true)
  const [error, setError] = useState('')

  const handleScan = useCallback(async (data: string) => {
    if (isProcessing) return
    setIsProcessing(true)
    setScanActive(false)
    setError('')

    try {
      const res = await api.post('/qr/scan', { qrData: data })
      const points = res.data.pointsEarned || res.data.points || 0
      router.push(`/scanner/success?points=${points}`)
    } catch {
      router.push('/scanner/failed')
    }
  }, [isProcessing, router])

  const handleError = useCallback((err: string) => {
    setError(err)
  }, [])

  return (
    <div className="min-h-full bg-gray-900">
      <div className="relative">
        <PageHeader
          title="Scan QR Code"
          subtitle="Point camera at a KK QR code"
          className="bg-transparent border-0"
          transparent
        />
        <div className="px-4">
          <div className="relative">
            <QRScanner
              onScan={handleScan}
              onError={handleError}
              isActive={scanActive && !isProcessing}
            />
          </div>

          {isProcessing && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-2xl">
              <div className="bg-white rounded-2xl p-6 text-center">
                <Spinner size="md" />
                <p className="text-gray-700 font-medium mt-3">Processing...</p>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="mx-4 mt-4 p-3 bg-red-900/50 border border-red-700 rounded-xl text-red-300 text-sm text-center">
            {error}
          </div>
        )}

        <div className="px-5 mt-6 text-center">
          <p className="text-gray-400 text-sm">Scan QR codes at KK events to earn points</p>
          <p className="text-gray-500 text-xs mt-1">Make sure the QR code is well-lit and fully visible</p>
        </div>

        {/* Digital ID link */}
        <div className="px-5 mt-8">
          <button
            onClick={() => router.push('/scanner/digital-id')}
            className="w-full bg-white/10 border border-white/20 rounded-2xl p-4 flex items-center gap-3 hover:bg-white/15 transition-colors"
          >
            <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0" />
              </svg>
            </div>
            <div className="text-left">
              <p className="text-white font-semibold text-sm">My Digital ID</p>
              <p className="text-gray-400 text-xs">Show your KK member QR code</p>
            </div>
            <svg className="w-4 h-4 text-gray-400 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
