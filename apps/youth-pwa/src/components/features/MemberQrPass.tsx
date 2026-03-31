'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import QRCode from 'qrcode'
import { cn } from '@/utils/cn'

interface MemberQrPassProps {
  fullName: string
  memberId: string
  photoUrl?: string | null
  qrValue?: string
  isLocked: boolean
  lockedTitle?: string
  lockedDescription?: string
  lockedActionHref?: string
  lockedActionLabel?: string
  isRefreshing: boolean
  lastUpdatedAt?: number | null
  onRefresh: () => Promise<void> | void
}

export default function MemberQrPass({
  fullName,
  memberId,
  photoUrl,
  qrValue,
  isLocked,
  lockedTitle = 'Complete verification to unlock your QR code',
  lockedDescription,
  lockedActionHref = '/verification/upload',
  lockedActionLabel = 'Go to Verification',
  isRefreshing,
  lastUpdatedAt,
  onRefresh,
}: MemberQrPassProps) {
  const [qrImageUrl, setQrImageUrl] = useState('')
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    let active = true

    if (!qrValue) {
      setQrImageUrl('')
      return
    }

    QRCode.toDataURL(qrValue, {
      width: 264,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#0E2E58',
        light: '#FFFFFF',
      },
    })
      .then((nextUrl) => {
        if (active) {
          setQrImageUrl(nextUrl)
        }
      })
      .catch(() => {
        if (active) {
          setQrImageUrl('')
        }
      })

    return () => {
      active = false
    }
  }, [qrValue])

  const avatarInitials = useMemo(
    () =>
      fullName
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase(),
    [fullName]
  )

  const lastUpdatedLabel = useMemo(() => {
    if (!lastUpdatedAt) return 'Last updated: not yet generated'

    const elapsedMinutes = Math.max(0, Math.floor((now - lastUpdatedAt) / 60_000))
    if (elapsedMinutes <= 0) return 'Last updated: just now'
    if (elapsedMinutes === 1) return 'Last updated: 1 minute ago'
    return `Last updated: ${elapsedMinutes} minutes ago`
  }, [lastUpdatedAt, now])

  async function handleSave() {
    if (!qrImageUrl || !qrValue || isLocked) return

    setSaveState('saving')

    try {
      const response = await fetch(qrImageUrl)
      const blob = await response.blob()
      if (!blob) throw new Error('Unable to create image')

      const file = new File([blob], `${memberId || 'kk-qr-code'}.png`, { type: 'image/png' })

      if (
        typeof navigator !== 'undefined' &&
        'share' in navigator &&
        typeof navigator.canShare === 'function' &&
        navigator.canShare({ files: [file] })
      ) {
        await navigator.share({
          title: 'My KK QR Code',
          text: `${fullName} • ${memberId}`,
          files: [file],
        })
      } else {
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `${memberId || 'kk-qr-code'}.png`
        link.click()
        URL.revokeObjectURL(url)
      }

      setSaveState('saved')
      window.setTimeout(() => setSaveState('idle'), 2500)
    } catch {
      setSaveState('error')
      window.setTimeout(() => setSaveState('idle'), 3000)
    }
  }

  return (
    <section className="relative overflow-hidden rounded-[34px] bg-[linear-gradient(180deg,#0b4b92_0%,#0c5dac_24%,#f5f9ff_24%,#ffffff_100%)] px-5 pb-6 pt-5 shadow-[0_22px_42px_rgba(1,67,132,0.18)]">
      <div className="pointer-events-none absolute left-[-42px] top-[190px] h-[220px] w-[220px] rounded-full bg-[#FCB315]" />
      <div className="pointer-events-none absolute right-[-30px] top-[-10px] h-[160px] w-[160px] rounded-full bg-[radial-gradient(circle,rgba(255,245,212,1)_0%,rgba(252,179,21,0.92)_34%,rgba(252,179,21,0.28)_66%,transparent_72%)]" />

      <div className="relative z-10 flex items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/72">
            Youth QR Pass
          </p>
          <h1 className="mt-1 text-[27px] font-black leading-none text-white">
            My QR Code
          </h1>
        </div>

        <button
          type="button"
          onClick={() => void onRefresh()}
          disabled={isRefreshing || isLocked}
          className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/12 px-4 py-2 text-[12px] font-semibold text-white backdrop-blur disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshIcon spinning={isRefreshing} />
          Refresh QR
        </button>
      </div>

      <div className="relative z-10 mt-6 overflow-hidden rounded-[30px] bg-white/95 px-5 pb-5 pt-6 shadow-[0_22px_30px_rgba(7,45,87,0.12)] backdrop-blur">
        <div className="absolute inset-x-0 top-0 h-[170px] bg-[linear-gradient(180deg,rgba(224,235,248,0.9)_0%,rgba(255,255,255,0.72)_100%)]" />
        <div
          className="absolute inset-0 bg-cover bg-center opacity-[0.18]"
          style={{ backgroundImage: "url('/images/background.png')" }}
        />

        <div className="relative flex flex-col items-center">
          <div className="relative">
            <div className={cn('rounded-[30px] bg-white p-4 shadow-[0_14px_24px_rgba(1,67,132,0.12)]', isLocked && 'blur-[3px]')}>
              {qrImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qrImageUrl} alt="Youth QR code" className="h-[264px] w-[264px] rounded-[24px] bg-white" />
              ) : (
                <div className="h-[264px] w-[264px] rounded-[24px] bg-[linear-gradient(135deg,#eef5fd_0%,#ffffff_100%)]" />
              )}
            </div>

            {isLocked ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex h-[84px] w-[84px] items-center justify-center rounded-full bg-[#0E2E58] text-white shadow-[0_16px_30px_rgba(14,46,88,0.26)]">
                  <LockIcon />
                </div>
              </div>
            ) : null}
          </div>

          <div className="mt-5 flex w-full items-center gap-3 rounded-[22px] border border-[#d8e4f0] bg-white/92 px-4 py-3">
            <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border-2 border-[#0E4F97] bg-[#e8f0fa]">
              {photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoUrl} alt={fullName} className="h-full w-full object-cover" />
              ) : (
                <span className="text-[18px] font-black text-[#014384]">{avatarInitials}</span>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-[17px] font-black uppercase leading-tight text-[#0E2E58]">
                {fullName}
              </p>
              <p className="mt-1 text-[12px] font-semibold tracking-[0.14em] text-[#5f7b9d]">
                {memberId}
              </p>
            </div>
          </div>

          <p className="mt-4 text-[12px] font-medium text-[#6c839e]">
            {lastUpdatedLabel}
          </p>

          {isLocked ? (
            <div className="mt-4 w-full rounded-[24px] border border-[#f3d38e] bg-[#fff8e8] px-4 py-4 text-center">
              <p className="text-[15px] font-bold text-[#8a5b00]">
                {lockedTitle}
              </p>
              {lockedDescription ? (
                <p className="mt-2 text-[13px] leading-[1.6] text-[#8a6a29]">
                  {lockedDescription}
                </p>
              ) : null}
              {lockedActionHref && lockedActionLabel ? (
                <Link
                  href={lockedActionHref}
                  className="mt-4 inline-flex items-center justify-center rounded-full bg-[linear-gradient(90deg,#014384_0%,#035DB7_52%,#0572DC_100%)] px-5 py-3 text-[14px] font-bold text-white shadow-[0_10px_22px_rgba(1,67,132,0.16)]"
                >
                  {lockedActionLabel}
                </Link>
              ) : null}
            </div>
          ) : (
            <div className="mt-5 flex w-full flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => void onRefresh()}
                disabled={isRefreshing}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-[#d6e3f1] bg-white px-5 py-3.5 text-[14px] font-bold text-[#0E2E58] shadow-[0_8px_18px_rgba(1,67,132,0.08)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshIcon spinning={isRefreshing} dark />
                Refresh QR
              </button>

              <button
                type="button"
                onClick={() => void handleSave()}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-[linear-gradient(90deg,#014384_0%,#035DB7_52%,#0572DC_100%)] px-5 py-3.5 text-[14px] font-bold text-white shadow-[0_12px_22px_rgba(5,114,220,0.18)]"
              >
                <DownloadIcon />
                Save QR as Image
              </button>
            </div>
          )}

          {saveState !== 'idle' ? (
            <p
              className={cn(
                'mt-3 text-[12px] font-medium',
                saveState === 'saved' && 'text-[#1f8b4c]',
                saveState === 'saving' && 'text-[#4d78ac]',
                saveState === 'error' && 'text-[#c53030]'
              )}
            >
              {saveState === 'saving' && 'Preparing your QR image...'}
              {saveState === 'saved' && 'QR image ready for download or sharing.'}
              {saveState === 'error' && 'We could not save the QR image right now.'}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  )
}

function RefreshIcon({ spinning = false, dark = false }: { spinning?: boolean; dark?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn('h-4 w-4', spinning && 'animate-spin', dark ? 'text-[#0E2E58]' : 'text-white')}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
      <path d="M21 3v6h-6" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-9 w-9" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 1 1 8 0v3" />
    </svg>
  )
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v12m0 0 4-4m-4 4-4-4M4 19h16" />
    </svg>
  )
}
