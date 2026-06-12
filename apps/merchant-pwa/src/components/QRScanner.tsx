'use client'

import { useEffect, useRef, useState } from 'react'
import { Camera, CameraOff } from 'lucide-react'

interface QRScannerProps {
  active: boolean
  disabledMessage?: string
  onDecode: (value: string) => void
}

export default function QRScanner({ active, disabledMessage, onDecode }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [status, setStatus] = useState<'idle' | 'starting' | 'ready' | 'blocked'>('idle')
  const [message, setMessage] = useState('Camera scanner is ready when this tab is active.')

  useEffect(() => {
    if (!active || !videoRef.current) {
      setStatus(disabledMessage ? 'blocked' : 'idle')
      setMessage(disabledMessage || 'Camera scanner is ready when this tab is active.')
      return
    }

    let stopped = false
    let scanner: { start: () => Promise<void>; stop: () => void; destroy: () => void } | null = null
    let stream: MediaStream | null = null
    let frame = 0

    async function startBarcodeDetector(video: HTMLVideoElement) {
      const BarcodeDetectorCtor = (window as typeof window & {
        BarcodeDetector?: new (options?: { formats?: string[] }) => {
          detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue?: string }>>
        }
      }).BarcodeDetector

      if (!BarcodeDetectorCtor) {
        throw new Error('Camera scanner is unavailable in this browser.')
      }

      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      })
      video.srcObject = stream
      await video.play()

      const detector = new BarcodeDetectorCtor({ formats: ['qr_code'] })
      const tick = async () => {
        if (stopped) return
        try {
          const codes = await detector.detect(video)
          const value = codes.find((code) => code.rawValue)?.rawValue
          if (value) onDecode(value)
        } catch {
          // Keep scanning; a single frame failure is normal while the camera focuses.
        }
        frame = window.requestAnimationFrame(tick)
      }
      frame = window.requestAnimationFrame(tick)
    }

    async function start() {
      const video = videoRef.current
      if (!video) return
      setStatus('starting')
      setMessage('Starting camera...')

      try {
        const { default: QrScanner } = await import('qr-scanner')
        scanner = new QrScanner(
          video,
          (result) => {
            const value = typeof result === 'string' ? result : result.data
            if (value) onDecode(value)
          },
          {
            preferredCamera: 'environment',
            highlightScanRegion: true,
            highlightCodeOutline: true,
            returnDetailedScanResult: true,
          }
        )
        await scanner.start()
        setStatus('ready')
        setMessage('Point the camera at the youth member QR code.')
      } catch {
        try {
          await startBarcodeDetector(video)
          setStatus('ready')
          setMessage('Point the camera at the youth member QR code.')
        } catch (error) {
          setStatus('blocked')
          setMessage(error instanceof Error ? error.message : 'Camera permission is blocked. Use manual token entry below.')
        }
      }
    }

    void start()

    return () => {
      stopped = true
      scanner?.stop()
      scanner?.destroy()
      stream?.getTracks().forEach((track) => track.stop())
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [active, disabledMessage, onDecode])

  return (
    <div className="scanner-shell">
      <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
      <div className="scanner-corners" aria-hidden="true" />
      {!active && disabledMessage ? (
        <div className="absolute inset-0 grid place-items-center bg-[#0b2f5b]/76 px-8 text-center text-white backdrop-blur-sm">
          <div>
            <CameraOff className="mx-auto h-9 w-9 text-[#FCB315]" />
            <p className="mt-3 text-sm font-black">{disabledMessage}</p>
          </div>
        </div>
      ) : null}
      <div className="absolute inset-x-3 bottom-3 rounded-2xl bg-white/90 px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur">
        <span className="inline-flex items-center gap-2">
          {status === 'blocked' ? <CameraOff className="h-4 w-4 text-rose-600" /> : <Camera className="h-4 w-4 text-emerald-600" />}
          {message}
        </span>
      </div>
    </div>
  )
}
