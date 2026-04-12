'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { refreshVerifiedUser, resendVerificationEmail } from '@/services/auth.service'
import { getPostAuthRedirect } from '@/services/profiling.service'
import { useAuthStore } from '@/store/authStore'
import AlertModal from '@/components/ui/AlertModal'

const RESEND_SECONDS = 60

export default function OTPPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get('email')
  const nextPath = searchParams.get('next') || '/intro'
  const { setUser, setToken } = useAuthStore()

  const [isChecking, setIsChecking] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS)

  useEffect(() => {
    if (secondsLeft <= 0) return
    const timer = window.setTimeout(() => setSecondsLeft((value) => value - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [secondsLeft])

  const formattedTime = useMemo(() => {
    const minutes = Math.floor(secondsLeft / 60)
    const seconds = secondsLeft % 60
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }, [secondsLeft])

  const handleContinue = async () => {
    setIsChecking(true)
    setError('')
    setMessage('')

    try {
      const { user, token } = await refreshVerifiedUser()
      setUser(user)
      setToken(token)
      document.cookie = `auth-token=${token}; path=/; max-age=${60 * 60 * 24 * 7}`
      router.push(await getPostAuthRedirect(nextPath))
    } catch (err: any) {
      setError(err?.message || 'Your email is not verified yet.')
    } finally {
      setIsChecking(false)
    }
  }

  const handleResend = async () => {
    setIsResending(true)
    setError('')
    setMessage('')

    try {
      await resendVerificationEmail()
      setMessage('Verification link sent. Please check your inbox.')
      setSecondsLeft(RESEND_SECONDS)
    } catch (err: any) {
      setError(err?.message || 'Unable to resend verification email.')
    } finally {
      setIsResending(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5] text-[#014384]">
      <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,#8eb8e8_0%,#c3daf4_18%,#eef5fd_42%,#fff8eb_72%,#f5f5f5_100%)] px-5 pb-10 pt-6">
        <div className="absolute inset-0 bg-white/14 backdrop-blur-[8px]" />

        <div className="relative z-10 mx-auto flex max-w-[360px] flex-col">
          <div className="mb-4 flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/88 text-[#014384] shadow-[0_10px_24px_rgba(1,67,132,0.12)]"
              aria-label="Go back"
            >
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6a84a8]">Verify Email</p>
              <h1 className="text-[18px] font-extrabold text-[#014384]">Check Your Email</h1>
            </div>
          </div>

          <div className="rounded-[30px] bg-white/94 px-5 pb-7 pt-6 shadow-[0_24px_60px_rgba(1,67,132,0.18)] backdrop-blur">
            <div className="rounded-[24px] bg-[linear-gradient(135deg,#fcb315_0%,#ffd774_38%,#fff0c4_100%)] px-5 py-5 text-white shadow-[0_16px_38px_rgba(252,179,21,0.18)]">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/26">
                <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 6h16v12H4z" />
                  <path d="m4 7 8 6 8-6" />
                </svg>
              </div>
              <h2 className="mt-4 text-[24px] font-extrabold leading-tight text-[#014384]">Check Your Email</h2>
              <p className="mt-2 text-[13px] leading-[1.55] text-[#3d5f8b]">
                We sent a verification link to your email. Open it to confirm your identity, then return here.
              </p>
              <p className="mt-3 break-all text-[13px] font-bold text-[#014384]">
                {email || 'your email address'}
              </p>
            </div>

            {message ? (
              <div className="mt-4 rounded-[18px] bg-[#edf8f0] px-4 py-3 text-center text-[13px] font-medium text-[#2f855a]">
                {message}
              </div>
            ) : null}

            <div className="mt-5 grid grid-cols-4 gap-2">
              {[
                { step: '1', label: 'Open', desc: 'Inbox' },
                { step: '2', label: 'Tap', desc: 'Link' },
                { step: '3', label: 'Return', desc: 'Here' },
                { step: '4', label: 'Continue', desc: 'Setup' },
              ].map((item) => (
                <div
                  key={item.step}
                  className="rounded-[16px] border border-[#cfe0f3] bg-[#f8fbff] px-2 py-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]"
                >
                  <p className="text-[18px] font-black text-[#014384]">{item.step}</p>
                  <p className="mt-1 text-[11px] font-semibold text-[#3d5f8b]">{item.label}</p>
                  <p className="text-[10px] text-[#8aa0bc]">{item.desc}</p>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={handleContinue}
              disabled={isChecking}
              className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-[linear-gradient(90deg,#014384_0%,#035DB7_52%,#0572DC_100%)] px-6 py-4 text-[16px] font-bold text-white shadow-[0_12px_24px_rgba(5,114,220,0.18)] disabled:cursor-not-allowed disabled:opacity-55"
            >
              {isChecking ? <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white/70 border-t-transparent" /> : 'I Verified My Email'}
            </button>

            <p className="mt-5 text-center text-[12px] font-semibold text-[#7b97bc]">{formattedTime}</p>

            <p className="mt-2 text-center text-[12px] text-[#7b97bc]">
              Didn&apos;t receive the link?{' '}
              <button
                type="button"
                onClick={handleResend}
                disabled={isResending || secondsLeft > 0}
                className="font-bold text-[#014384] disabled:opacity-40"
              >
                {isResending ? 'Sending...' : 'Resend'}
              </button>
            </p>
          </div>
        </div>
      </div>

      <AlertModal
        isOpen={Boolean(error)}
        title="Verification Issue"
        message={error}
        onClose={() => setError('')}
      />
    </div>
  )
}
