'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import DigitalIDCard from '@/components/features/DigitalIDCard'
import Spinner from '@/components/ui/Spinner'
import { getDigitalID, getVerificationStatus } from '@/services/verification.service'
import { useAuthStore } from '@/store/authStore'
import { useUserStore } from '@/store/userStore'

interface DigitalIDData {
  qrCode: string
  memberId: string
  photoUrl?: string | null
}

export default function DigitalIDPage() {
  const { user } = useAuthStore()
  const { profile, setProfile } = useUserStore()
  const [idData, setIdData] = useState<DigitalIDData | null>(null)
  const [isProfileLoading, setIsProfileLoading] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const displayName = useMemo(() => {
    if (!profile) {
      return (user?.UserName || 'YOUTH MEMBER').toUpperCase()
    }

    return [profile.firstName, profile.middleName, profile.lastName]
      .filter(Boolean)
      .join(' ')
      .toUpperCase()
  }, [profile, user?.UserName])

  const isVerified = profile?.status === 'verified'
  const queueStatus = profile?.verificationQueueStatus || (profile?.documentsSubmitted ? 'pending' : 'not_submitted')
  const isRejected = profile?.status === 'rejected' || queueStatus === 'rejected'
  const hasSubmittedDocuments = Boolean(
    profile?.documentsSubmitted &&
      ['pending', 'in_review', 'resubmission_requested', 'verified'].includes(queueStatus)
  )
  const isUnderReview = !isVerified && hasSubmittedDocuments && queueStatus !== 'resubmission_requested'
  const needsResubmission = queueStatus === 'resubmission_requested'

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
      setError('')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    getDigitalID()
      .then(setIdData)
      .catch(() => setError('Could not load your Digital ID right now.'))
      .finally(() => setIsLoading(false))
  }, [isProfileLoading, isVerified])

  return (
    <div className="min-h-screen w-full bg-[#f5f5f5] pb-28 text-[#014384]">
      <section className="relative overflow-hidden bg-[linear-gradient(180deg,#7fb3ec_0%,#bdd7f3_20%,#eef5fd_44%,#fff8eb_72%,#f5f5f5_100%)] px-5 pb-6 pt-8">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/35 via-white/12 to-transparent" />

        <div className="relative z-10 flex items-start justify-between gap-4">
          <div className="flex gap-3">
            <div className="flex h-[76px] w-[76px] items-center justify-center overflow-hidden rounded-full border-[2.5px] border-[#014384] bg-[#e7eef8]">
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#8db3e0] to-[#dce8f7] text-[24px] font-bold text-[#014384]">
                {getInitials(displayName)}
              </div>
            </div>

            <div className="pt-2">
              <p className="text-[11px] font-medium text-[#7486a2]">
                Welcome Back
              </p>
              <h1 className="max-w-[190px] text-[18px] font-extrabold uppercase leading-[1.02] tracking-[0.01em] text-[#014384]">
                {displayName}
              </h1>
              <div className="mt-1 flex items-center gap-1.5 text-[12px] font-medium">
                <span
                  className={`inline-block h-2.5 w-2.5 rounded-full ${
                    isVerified ? 'bg-[#38a169]' : 'bg-[#FCB315]'
                  }`}
                />
                <span className={isVerified ? 'text-[#38a169]' : 'text-[#FCB315]'}>
                  {isVerified ? 'Verified' : 'Not Yet Verified'}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-1">
            <Image
              src="/images/FOOTER.png"
              alt="SK Barangay Buting"
              width={132}
              height={34}
              className="h-auto w-[132px] object-contain"
            />
          </div>
        </div>
      </section>

      <section className="px-6 pb-8 pt-10">
        {isProfileLoading ? (
          <div className="flex min-h-[52vh] items-center justify-center">
            <Spinner size="lg" />
          </div>
        ) : !profile ? (
          <div className="mx-auto flex max-w-[340px] flex-col items-center text-center">
            <h2 className="text-[20px] font-extrabold text-[#014384]">
              Complete Your Profile
            </h2>
            <p className="mt-6 text-[16px] leading-[1.6] text-[#1e4f91]">
              We couldn&apos;t find your profiling details yet. Complete your
              profile first so we can prepare your Digital ID and verification
              status.
            </p>
            <Link
              href="/intro"
              className="mt-10 inline-flex w-full items-center justify-center rounded-full bg-[linear-gradient(90deg,#014384_0%,#035DB7_52%,#0572DC_100%)] px-6 py-4 text-[18px] font-bold text-white shadow-[0_12px_24px_rgba(5,114,220,0.18)]"
            >
              Continue Profiling
            </Link>
          </div>
        ) : needsResubmission ? (
          <div className="mx-auto flex max-w-[340px] flex-col items-center text-center">
            <h2 className="text-[20px] font-extrabold text-[#014384]">
              Re-upload Required
            </h2>

            <div className="mt-10 flex items-center justify-center">
              <Image
                src="/images/VerifyYourIdentity.png"
                alt="Re-upload required documents"
                width={150}
                height={150}
                className="h-auto w-[150px] object-contain"
              />
            </div>

            <p className="mt-10 text-[17px] leading-[1.6] text-[#1e4f91]">
              Your administrator requested updated verification files. Please re-upload the flagged documents so your review can continue.
            </p>

            {(profile?.verificationResubmissionMessage || profile?.verificationRejectReason) ? (
              <p className="mt-8 max-w-[290px] rounded-[18px] bg-[#fff8eb] px-4 py-3 text-[13px] leading-[1.6] text-[#7c5a0a]">
                {profile?.verificationResubmissionMessage || profile?.verificationRejectReason}
              </p>
            ) : null}

            <Link
              href="/verification/upload"
              className="mt-10 inline-flex w-full items-center justify-center rounded-full bg-[linear-gradient(90deg,#014384_0%,#035DB7_52%,#0572DC_100%)] px-6 py-4 text-[18px] font-bold text-white shadow-[0_12px_24px_rgba(5,114,220,0.18)]"
            >
              Re-upload Documents
            </Link>
          </div>
        ) : isRejected ? (
          <div className="mx-auto flex max-w-[340px] flex-col items-center text-center">
            <h2 className="text-[20px] font-extrabold text-[#014384]">
              Verification Rejected
            </h2>

            <div className="mt-10 flex items-center justify-center">
              <Image
                src="/images/VerifyYourIdentity.png"
                alt="Verification rejected"
                width={150}
                height={150}
                className="h-auto w-[150px] object-contain"
              />
            </div>

            <p className="mt-10 text-[17px] leading-[1.6] text-[#1e4f91]">
              Your verification submission was rejected. Please review the feedback below and submit updated documents so your application can be reviewed again.
            </p>

            {(profile?.verificationRejectReason || profile?.verificationRejectNote) ? (
              <p className="mt-8 max-w-[290px] rounded-[18px] bg-[#fff1f1] px-4 py-3 text-[13px] leading-[1.6] text-[#b14444]">
                {profile?.verificationRejectReason}
                {profile?.verificationRejectNote ? ` ${profile.verificationRejectNote}` : ''}
              </p>
            ) : null}

            <Link
              href="/verification/upload"
              className="mt-10 inline-flex w-full items-center justify-center rounded-full bg-[linear-gradient(90deg,#014384_0%,#035DB7_52%,#0572DC_100%)] px-6 py-4 text-[18px] font-bold text-white shadow-[0_12px_24px_rgba(5,114,220,0.18)]"
            >
              Retry Submission
            </Link>
          </div>
        ) : isUnderReview ? (
          <div className="mx-auto flex max-w-[340px] flex-col items-center text-center">
            <h2 className="text-[20px] font-extrabold text-[#014384]">
              Verification Under Review
            </h2>

            <div className="mt-10 flex items-center justify-center">
              <Image
                src="/images/DocumentsSubmitted.png"
                alt="Verification under review"
                width={150}
                height={150}
                className="h-auto w-[150px] object-contain"
              />
            </div>

            <p className="mt-10 text-[17px] leading-[1.6] text-[#1e4f91]">
              We&apos;ve received your documents! Our administrator are
              currently reviewing your application.
            </p>

            <p className="mt-4 text-[13px] font-medium text-[#7486a2]">
              Current queue status: {queueStatus.split('_').join(' ')}
            </p>

            <p className="mt-8 max-w-[290px] text-[13px] leading-[1.6] text-[#d69b13]">
              We&apos;ll send you a notification as soon as your Digital ID and
              exclusive rewards are unlocked.
            </p>
          </div>
        ) : !isVerified ? (
          <div className="mx-auto flex max-w-[340px] flex-col items-center text-center">
            <h2 className="text-[20px] font-extrabold text-[#014384]">
              Verify Your Identity
            </h2>

            <div className="mt-10 flex items-center justify-center">
              <Image
                src="/images/VerifyYourIdentity.png"
                alt="Verify your identity"
                width={150}
                height={150}
                className="h-auto w-[150px] object-contain"
              />
            </div>

            <p className="mt-10 text-[17px] leading-[1.6] text-[#1e4f91]">
              You haven&apos;t submitted your documents yet. Verify your profile
              to unlock your official Digital ID and exclusive rewards.
            </p>

            <Link
              href="/verification/upload"
              className="mt-10 inline-flex w-full items-center justify-center rounded-full bg-[linear-gradient(90deg,#014384_0%,#035DB7_52%,#0572DC_100%)] px-6 py-4 text-[18px] font-bold text-white shadow-[0_12px_24px_rgba(5,114,220,0.18)]"
            >
              Upload Documents
            </Link>
          </div>
        ) : isLoading ? (
          <div className="flex min-h-[52vh] items-center justify-center">
            <Spinner size="lg" />
          </div>
        ) : error || !idData ? (
          <div className="mx-auto flex max-w-[340px] flex-col items-center text-center">
            <h2 className="text-[20px] font-extrabold text-[#014384]">
              Digital ID Unavailable
            </h2>
            <p className="mt-6 text-[16px] leading-[1.6] text-[#1e4f91]">
              {error || 'We could not load your Digital ID right now.'}
            </p>
            <Link
              href="/verification/status"
              className="mt-10 inline-flex w-full items-center justify-center rounded-full bg-[linear-gradient(90deg,#014384_0%,#035DB7_52%,#0572DC_100%)] px-6 py-4 text-[18px] font-bold text-white shadow-[0_12px_24px_rgba(5,114,220,0.18)]"
            >
              Check Verification Status
            </Link>
          </div>
        ) : (
          <div className="space-y-5">
            <DigitalIDCard
              profile={profile}
              qrData={idData.qrCode}
              memberId={idData.memberId}
              photoUrl={idData.photoUrl || profile.idPhotoUrl}
            />
            <p className="text-center text-[13px] text-[#5c7aa3]">
              Show this QR code to KK officers to verify your membership.
            </p>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex w-full items-center justify-center rounded-full bg-[linear-gradient(90deg,#014384_0%,#035DB7_52%,#0572DC_100%)] px-6 py-4 text-[18px] font-bold text-white shadow-[0_12px_24px_rgba(5,114,220,0.18)]"
            >
              Save / Print ID
            </button>
          </div>
        )}
      </section>
    </div>
  )
}

function getInitials(value: string) {
  return value
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}
