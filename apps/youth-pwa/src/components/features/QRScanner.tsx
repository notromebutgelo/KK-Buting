'use client'
import { useEffect, useRef, useState } from 'react'

interface QRScannerProps {
  onScan: (result: string) => void
  onError?: (error: string) => void
  isActive?: boolean
}

export default function QRScanner({ onScan, onError, isActive = true }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const scannerRef = useRef<import('qr-scanner').default | null>(null)
  const [hasCamera, setHasCamera] = useState(true)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!isActive) return

    let mounted = true

    async function initScanner() {
      if (!videoRef.current) return

      try {
        const QrScanner = (await import('qr-scanner')).default
        const hasDevice = await QrScanner.hasCamera()

        if (!mounted) return
        if (!hasDevice) {
          setHasCamera(false)
          setIsLoading(false)
          onError?.('No camera found')
          return
        }

        const scanner = new QrScanner(
          videoRef.current,
          (result) => {
            onScan(result.data)
          },
          {
            highlightScanRegion: true,
            highlightCodeOutline: true,
            preferredCamera: 'environment',
          }
        )

        scannerRef.current = scanner
        await scanner.start()
        if (mounted) setIsLoading(false)
      } catch (err: unknown) {
        if (!mounted) return
        const message = err instanceof Error ? err.message : 'Camera error'
        onError?.(message)
        setHasCamera(false)
        setIsLoading(false)
      }
    }

    initScanner()

    return () => {
      mounted = false
      scannerRef.current?.destroy()
      scannerRef.current = null
    }
  }, [isActive, onScan, onError])

  if (!hasCamera) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-gray-900 rounded-2xl text-white gap-3">
        <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <p className="text-gray-300 text-sm">Camera not available</p>
      </div>
    )
  }

  return (
    <div className="relative overflow-hidden rounded-2xl bg-black">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
          <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      )}
      <video
        ref={videoRef}
        className="w-full aspect-square object-cover"
        playsInline
        muted
      />
      {/* Scan overlay */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-52 h-52 relative">
          <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-green-400 rounded-tl-lg" />
          <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-green-400 rounded-tr-lg" />
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-green-400 rounded-bl-lg" />
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-green-400 rounded-br-lg" />
          {/* Scan line animation */}
          <div className="absolute inset-x-0 top-0 h-0.5 bg-green-400 opacity-80 animate-bounce" />
        </div>
      </div>
    </div>
  )
}
