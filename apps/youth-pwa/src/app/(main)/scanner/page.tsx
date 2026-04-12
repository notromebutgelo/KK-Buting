'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import MemberQrPass from '@/components/features/MemberQrPass'
import AlertModal from '@/components/ui/AlertModal'
import Spinner from '@/components/ui/Spinner'
import { getDigitalID, getVerificationStatus } from '@/services/verification.service'
import { useAuthStore } from '@/store/authStore'
import { useUserStore } from '@/store/userStore'

interface DigitalIdResponse {
  status: string
  idNumber?: string
  memberId?: string
  qrCode?: string
  qrPayload?: string
  qrToken?: string
  photoUrl?: string | null
}

export default function ScannerPage() {
  const { user } = useAuthStore()
  const { profile, setProfile } = useUserStore()
  const [idData, setIdData] = useState<DigitalIdResponse | null>(null)
  const [isProfileLoading, setIsProfileLoading] = useState(true)
  const [isQrLoading, setIsQrLoading] = useState(false)
  const [error, setError] = useState('')
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null)

  const displayName = useMemo(() => {
    const value = profile
      ? [profile.firstName, profile.middleName, profile.lastName].filter(Boolean).join(' ')
      : user?.UserName || 'Youth Member'

    return value.toUpperCase()
  }, [profile, user?.UserName])

  const isVerified = Boolean(profile?.verified || profile?.status === 'verified')
  const isDigitalIdReady =
    idData?.status === 'verified' &&
    Boolean(idData?.memberId || idData?.idNumber) &&
    Boolean(idData?.qrPayload || idData?.qrCode || idData?.qrToken)
  const memberId = idData?.memberId || idData?.idNumber || 'KK-BUTING-PENDING'
  const qrValue = isDigitalIdReady
    ? idData?.qrPayload ||
      buildFallbackQrPayload(
        memberId,
        profile?.userId || user?.uid || '',
        idData?.qrToken || idData?.qrCode || ''
      )
    : undefined
  const lockConfig = !isVerified
    ? {
        title: 'Complete verification to unlock your QR code',
        description:
          'Submit your verification documents first so we can unlock your secure youth QR pass for merchant scans.',
        href: '/verification/upload',
        label: 'Go to Verification',
      }
    : !isDigitalIdReady
      ? {
          title: 'Your Digital ID is not active yet',
          description:
            'Your account is verified, but your KK Digital ID has not been generated or activated yet. Please check back soon or contact your administrator.',
          href: '/verification/status',
          label: 'Check Verification Status',
        }
      : undefined

  const loadQr = useCallback(async () => {
    setIsQrLoading(true)
    setError('')

    try {
      const nextIdData = await getDigitalID()
      setIdData(nextIdData)
      setLastUpdatedAt(Date.now())
    } catch (nextError: any) {
      setError(nextError?.response?.data?.error || 'Could not load your QR code right now.')
    } finally {
      setIsQrLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true

    async function ensureProfile() {
      try {
        const nextProfile = await getVerificationStatus()
        if (active) {
          setProfile(nextProfile)
        }
      } catch {
        if (active) {
          setProfile(null)
        }
      } finally {
        if (active) {
          setIsProfileLoading(false)
        }
      }
    }

    ensureProfile()

    return () => {
      active = false
    }
  }, [setProfile])

  useEffect(() => {
    if (isProfileLoading || !isVerified) {
      setIdData(null)
      setLastUpdatedAt(null)
      setIsQrLoading(false)
      return
    }

    void loadQr()
  }, [isProfileLoading, isVerified, loadQr])

  if (isProfileLoading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-[#f5f5f5]">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-full bg-[#f5f5f5] px-6 py-8 text-center text-[#014384]">
        <div className="mx-auto max-w-[360px] rounded-[30px] bg-white px-6 py-10 shadow-[0_18px_38px_rgba(1,67,132,0.10)]">
          <h1 className="text-[24px] font-black">Complete Your Profile First</h1>
          <p className="mt-4 text-[15px] leading-[1.7] text-[#4d78ac]">
            We couldn&apos;t find your youth profile yet. Finish onboarding so we can generate your secure QR pass.
          </p>
          <Link
            href="/intro"
            className="mt-8 inline-flex w-full items-center justify-center rounded-full bg-[linear-gradient(90deg,#014384_0%,#035DB7_52%,#0572DC_100%)] px-5 py-4 text-[16px] font-bold text-white shadow-[0_12px_22px_rgba(1,67,132,0.16)]"
          >
            Continue Profiling
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-full bg-[#f4f4f4] pb-8 text-[#014384]">
      <section className="relative overflow-hidden bg-[linear-gradient(180deg,#7fb3ec_0%,#bdd7f3_20%,#eef5fd_44%,#fff8eb_72%,#f5f5f5_100%)] px-5 pb-6 pt-8">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/35 via-white/12 to-transparent" />

        <div className="relative z-10 flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 gap-3">
            <div className="flex h-[76px] w-[76px] shrink-0 items-center justify-center overflow-hidden rounded-full border-[2.5px] border-[#014384] bg-[#e7eef8]">
              {profile.idPhotoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.idPhotoUrl} alt={displayName} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#8db3e0] to-[#dce8f7] text-[24px] font-bold text-[#014384]">
                  {getInitials(displayName)}
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1 pt-2">
              <p className="text-[11px] font-medium text-[#7486a2]">KK Youth Member</p>
              <h1 className="pr-1 text-[18px] font-extrabold uppercase leading-[1.02] tracking-[0.01em] text-[#014384] [overflow-wrap:anywhere]">
                {displayName}
              </h1>
              <div className="mt-1 flex items-center gap-1.5 text-[12px] font-medium">
                <span className={`inline-block h-2.5 w-2.5 rounded-full ${isVerified ? 'bg-[#38a169]' : 'bg-[#FCB315]'}`} />
                <span className={isVerified ? 'text-[#38a169]' : 'text-[#FCB315]'}>
                  {isVerified ? 'QR Ready for Merchants' : 'Verification Required'}
                </span>
              </div>
            </div>
          </div>

          <div className="shrink-0 pt-1">
            <Image
              src="/images/FOOTER.png"
              alt="SK Barangay Buting"
              width={132}
              height={34}
              className="h-auto w-[86px] object-contain sm:w-[132px]"
            />
          </div>
        </div>
      </section>

      <section className="px-5 pt-3">
        <MemberQrPass
          fullName={displayName}
          memberId={memberId}
          photoUrl={idData?.photoUrl || profile.idPhotoUrl}
          qrValue={qrValue}
          isLocked={!isDigitalIdReady}
          lockedTitle={lockConfig?.title}
          lockedDescription={lockConfig?.description}
          lockedActionHref={lockConfig?.href}
          lockedActionLabel={lockConfig?.label}
          isRefreshing={isQrLoading}
          lastUpdatedAt={lastUpdatedAt}
          onRefresh={loadQr}
        />

        <div className="mt-4 rounded-[22px] bg-white px-5 py-4 shadow-[0_14px_28px_rgba(1,67,132,0.08)]">
          <p className="text-[14px] font-bold text-[#0E2E58]">Use this at partner merchants</p>
          <p className="mt-2 text-[13px] leading-[1.6] text-[#5f7b9d]">
            Present this QR pass to merchant partners so they can scan it from their Merchant APK and award your KK points securely.
          </p>
        </div>
      </section>

      <AlertModal
        isOpen={Boolean(error)}
        title="QR Code Unavailable"
        message={error}
        onClose={() => setError('')}
      />
    </div>
  )
}

function buildFallbackQrPayload(digitalIdNumber: string, uid: string, token: string) {
  if (!digitalIdNumber || !uid || !token) return undefined

  return JSON.stringify({
    digitalIdNumber,
    uid,
    token,
  })
}

function getInitials(value: string) {
  return value
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0] || '')
    .join('')
    .toUpperCase()
}
