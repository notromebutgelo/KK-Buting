'use client'

import Image from 'next/image'
import Link from 'next/link'
import jsPDF from 'jspdf'
import { useEffect, useMemo, useState } from 'react'
import DigitalIDCard from '@/components/features/DigitalIDCard'
import AlertModal from '@/components/ui/AlertModal'
import Spinner from '@/components/ui/Spinner'
import { getDigitalID, getVerificationStatus } from '@/services/verification.service'
import { useAuthStore } from '@/store/authStore'
import { useUserStore } from '@/store/userStore'

interface DigitalIDData {
  status: string
  idNumber?: string
  digitalIdStatus?: string | null
  qrCode?: string
  memberId?: string
  photoUrl?: string | null
  digitalIdSignatureUrl?: string | null
}

const DIGITAL_ID_TERMS_TEXT =
  'This card is non-transferable and must be used only by the cardholder whose signature appears herein. Cardholder privileges remain subject to implementing guidelines approved by the Sangguniang Kabataan Council.'
const DIGITAL_ID_SIGNATURE_TEXT = 'Mark Jervin B. Ventura'
const DIGITAL_ID_SIGNATORY_NAME = 'HON. MARK JERVIN B. VENTURA'
const DIGITAL_ID_SIGNATORY_TITLE = 'SK CHAIRPERSON'

export default function DigitalIDPage() {
  const { user } = useAuthStore()
  const { profile, setProfile } = useUserStore()
  const [idData, setIdData] = useState<DigitalIDData | null>(null)
  const [isProfileLoading, setIsProfileLoading] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [errorTitle, setErrorTitle] = useState('Digital ID Unavailable')
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
  const emergencyContactComplete = hasCompleteEmergencyContact(profile)
  const signatureComplete = hasDigitalIdSignature(profile)
  const digitalIdStatus = String(idData?.digitalIdStatus || profile?.digitalIdStatus || '').trim() || null
  const isDigitalIdReady = Boolean(
    (idData?.status === 'verified' || digitalIdStatus === 'active') &&
      (idData?.memberId || idData?.idNumber)
  )
  const queueStatus = profile?.verificationQueueStatus || (profile?.documentsSubmitted ? 'pending' : 'not_submitted')
  const isRejected = profile?.status === 'rejected' || queueStatus === 'rejected'
  const hasSubmittedDocuments = Boolean(
    profile?.documentsSubmitted &&
      ['pending', 'in_review', 'pending_superadmin_id_generation', 'resubmission_requested', 'verified'].includes(queueStatus)
  )
  const isUnderReview = !isVerified && hasSubmittedDocuments && queueStatus !== 'resubmission_requested'
  const needsResubmission = queueStatus === 'resubmission_requested'
  const digitalIdPhotoUrl = idData?.photoUrl || profile?.idPhotoUrl || null
  const digitalIdSignatureUrl = idData?.digitalIdSignatureUrl || profile?.digitalIdSignatureUrl || null
  const awaitingSuperadminTitle =
    digitalIdStatus === 'deactivated' ? 'Digital ID Deactivated' : 'Awaiting Superadmin ID Generation'
  const awaitingSuperadminMessage =
    digitalIdStatus === 'deactivated'
      ? 'Your Digital ID is currently inactive. Please contact your SK office if it needs to be restored.'
      : digitalIdStatus === 'draft'
        ? 'Your verification is complete. Your Digital ID draft is prepared, but the superadmin still needs to issue and activate it before it appears here.'
        : 'Your verification is complete. Your Digital ID will appear here after the superadmin generates and issues it.'
  const headerStatus = isDigitalIdReady
    ? {
        dot: 'bg-[#38a169]',
        label: 'Digital ID Active',
        text: 'text-[#38a169]',
      }
    : digitalIdStatus === 'deactivated'
      ? {
          dot: 'bg-[#d64545]',
          label: 'Digital ID Inactive',
          text: 'text-[#d64545]',
        }
    : isVerified
      ? {
          dot: 'bg-[#0572DC]',
          label: 'Awaiting Superadmin',
          text: 'text-[#0572DC]',
        }
      : {
          dot: 'bg-[#FCB315]',
          label: 'Not Yet Verified',
          text: 'text-[#FCB315]',
        }

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
    if (isProfileLoading || !isVerified || !emergencyContactComplete || !signatureComplete) {
      setIdData(null)
      setErrorTitle('Digital ID Unavailable')
      setError('')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    getDigitalID()
      .then((nextIdData) => {
        setIdData(nextIdData)
        setError('')
      })
      .catch(() => {
        setErrorTitle('Digital ID Unavailable')
        setError('Could not load your Digital ID right now.')
      })
      .finally(() => setIsLoading(false))
  }, [emergencyContactComplete, isProfileLoading, isVerified, signatureComplete])

  async function handleSaveId() {
    if (!profile || !idData || isSaving) {
      return
    }

    setIsSaving(true)

    try {
      const pdf = await buildDigitalIdPdf({
        profile,
        memberId: idData.memberId || idData.idNumber || '',
        photoUrl: digitalIdPhotoUrl,
        signatureUrl: digitalIdSignatureUrl,
      })

      pdf.save(`${sanitizeFileName(idData.memberId || displayName || 'kk_digital_id')}.pdf`)
    } catch {
      setErrorTitle('Save Failed')
      setError('Could not save your Digital ID right now.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="min-h-screen w-full bg-[#f5f5f5] pb-28 text-[#014384]">
      <section className="relative overflow-hidden bg-[linear-gradient(180deg,#7fb3ec_0%,#bdd7f3_20%,#eef5fd_44%,#fff8eb_72%,#f5f5f5_100%)] px-5 pb-6 pt-8">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/35 via-white/12 to-transparent" />

        <div className="relative z-10 flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 gap-3">
            <div className="flex h-[76px] w-[76px] shrink-0 items-center justify-center overflow-hidden rounded-full border-[2.5px] border-[#014384] bg-[#e7eef8]">
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#8db3e0] to-[#dce8f7] text-[24px] font-bold text-[#014384]">
                {getInitials(displayName)}
              </div>
            </div>

            <div className="min-w-0 flex-1 pt-2">
              <p className="text-[11px] font-medium text-[#7486a2]">
                Welcome Back
              </p>
              <h1 className="pr-1 text-[18px] font-extrabold uppercase leading-[1.02] tracking-[0.01em] text-[#014384] [overflow-wrap:anywhere]">
                {displayName}
              </h1>
              <div className="mt-1 flex items-center gap-1.5 text-[12px] font-medium">
                <span
                  className={`inline-block h-2.5 w-2.5 rounded-full ${headerStatus.dot}`}
                />
                <span className={headerStatus.text}>{headerStatus.label}</span>
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
        ) : !emergencyContactComplete ? (
          <div className="mx-auto flex max-w-[340px] flex-col items-center text-center">
            <h2 className="text-[20px] font-extrabold text-[#014384]">
              Add Emergency Contact to Complete Your Digital ID
            </h2>

            <div className="mt-10 flex items-center justify-center">
              <Image
                src="/images/VerifyYourIdentity.png"
                alt="Add emergency contact"
                width={150}
                height={150}
                className="h-auto w-[150px] object-contain"
              />
            </div>

            <p className="mt-10 text-[17px] leading-[1.6] text-[#1e4f91]">
              Add the emergency contact details for the back of your Digital ID before it can be generated or activated.
            </p>

            <p className="mt-4 max-w-[290px] text-[13px] leading-[1.6] text-[#6f87a8]">
              {isVerified
                ? 'Your verification is already complete. Once you save these details, your Digital ID can continue through the superadmin ID generation flow.'
                : 'You can add this now so your Digital ID will be ready to move forward as soon as your verification is completed.'}
            </p>

            <Link
              href="/profile/edit"
              className="mt-10 inline-flex w-full items-center justify-center rounded-full bg-[linear-gradient(90deg,#014384_0%,#035DB7_52%,#0572DC_100%)] px-6 py-4 text-[18px] font-bold text-white shadow-[0_12px_24px_rgba(5,114,220,0.18)]"
            >
              Add Emergency Contact
            </Link>

            <Link
              href="/home"
              className="mt-4 inline-flex w-full items-center justify-center rounded-full border border-[#cbdcf0] bg-white px-6 py-4 text-[16px] font-semibold text-[#014384]"
            >
              Return Home
            </Link>
          </div>
        ) : !signatureComplete ? (
          <div className="mx-auto flex max-w-[340px] flex-col items-center text-center">
            <h2 className="text-[20px] font-extrabold text-[#014384]">
              Add Signature to Complete Your Digital ID
            </h2>

            <div className="mt-10 flex items-center justify-center">
              <Image
                src="/images/DocumentsSubmitted.png"
                alt="Add digital ID signature"
                width={150}
                height={150}
                className="h-auto w-[150px] object-contain"
              />
            </div>

            <p className="mt-10 text-[17px] leading-[1.6] text-[#1e4f91]">
              Draw the signature that should appear on the front of your Digital ID before the card can be displayed.
            </p>

            <p className="mt-4 max-w-[290px] text-[13px] leading-[1.6] text-[#6f87a8]">
              If you make a mistake, you can clear the pad and sign again before saving. You can also replace the saved signature later.
            </p>

            <Link
              href="/profile/signature"
              className="mt-10 inline-flex w-full items-center justify-center rounded-full bg-[linear-gradient(90deg,#014384_0%,#035DB7_52%,#0572DC_100%)] px-6 py-4 text-[18px] font-bold text-white shadow-[0_12px_24px_rgba(5,114,220,0.18)]"
            >
              Add Signature
            </Link>

            <Link
              href="/home"
              className="mt-4 inline-flex w-full items-center justify-center rounded-full border border-[#cbdcf0] bg-white px-6 py-4 text-[16px] font-semibold text-[#014384]"
            >
              Return Home
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
              We&apos;ll send you a notification as soon as your verification
              decision is ready. Rewards unlock after approval, and your Digital
              ID appears after superadmin ID generation.
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
        ) : !isDigitalIdReady ? (
          <div className="mx-auto flex max-w-[340px] flex-col items-center text-center">
            <h2 className="text-[20px] font-extrabold text-[#014384]">
              {awaitingSuperadminTitle}
            </h2>

            <div className="mt-10 flex items-center justify-center">
              <Image
                src="/images/DocumentsSubmitted.png"
                alt="Awaiting Digital ID approval"
                width={150}
                height={150}
                className="h-auto w-[150px] object-contain"
              />
            </div>

            <p className="mt-10 text-[17px] leading-[1.6] text-[#1e4f91]">
              {awaitingSuperadminMessage}
            </p>

            <p className="mt-4 max-w-[290px] text-[13px] leading-[1.6] text-[#6f87a8]">
              We&apos;ll show the final card here as soon as the superadmin finishes the Digital ID issuance step.
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
              memberId={idData.memberId || idData.idNumber || ''}
              photoUrl={digitalIdPhotoUrl}
              signatureUrl={digitalIdSignatureUrl}
            />
            <p className="text-center text-[13px] text-[#5c7aa3]">
              Present this Digital ID to KK officers whenever they need to verify your membership.
            </p>
            <Link
              href="/profile/signature"
              className="inline-flex w-full items-center justify-center rounded-full border border-[#cbdcf0] bg-white px-6 py-4 text-[16px] font-semibold text-[#014384]"
            >
              Update Signature
            </Link>
            <button
              type="button"
              onClick={handleSaveId}
              disabled={isSaving}
              className="inline-flex w-full items-center justify-center rounded-full bg-[linear-gradient(90deg,#014384_0%,#035DB7_52%,#0572DC_100%)] px-6 py-4 text-[18px] font-bold text-white shadow-[0_12px_24px_rgba(5,114,220,0.18)]"
              >
                {isSaving ? 'Saving ID...' : 'Save ID'}
              </button>
            </div>
          )}
        </section>

      <AlertModal
        isOpen={Boolean(error)}
        title={errorTitle}
        message={error}
        onClose={() => {
          setError('')
          setErrorTitle('Digital ID Unavailable')
        }}
      />
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

function hasCompleteEmergencyContact(
  profile:
    | {
        digitalIdEmergencyContactName?: string
        digitalIdEmergencyContactRelationship?: string
        digitalIdEmergencyContactPhone?: string
      }
    | null
    | undefined
) {
  return Boolean(
    String(profile?.digitalIdEmergencyContactName || '').trim() &&
      String(profile?.digitalIdEmergencyContactRelationship || '').trim() &&
      String(profile?.digitalIdEmergencyContactPhone || '').trim()
  )
}

function hasDigitalIdSignature(
  profile:
    | {
        digitalIdSignatureUrl?: string | null
      }
    | null
    | undefined
) {
  return Boolean(String(profile?.digitalIdSignatureUrl || '').trim())
}

async function buildDigitalIdPdf({
  profile,
  memberId,
  photoUrl,
  signatureUrl,
}: {
  profile: {
    firstName?: string
    middleName?: string
    lastName?: string
    barangay?: string
    city?: string
    province?: string
    birthday?: string
    gender?: string
    contactNumber?: string
    verifiedAt?: string
    digitalIdEmergencyContactName?: string
    digitalIdEmergencyContactRelationship?: string
    digitalIdEmergencyContactPhone?: string
  }
  memberId: string
  photoUrl?: string | null
  signatureUrl?: string | null
}) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: [700, 460],
  })

  const [frontBg, photoData, signatureData] = await Promise.all([
    loadImageData('/images/KK ID - Front BG.png'),
    photoUrl ? loadImageData(photoUrl, 'jpeg').catch(() => '') : Promise.resolve(''),
    signatureUrl ? loadImageData(signatureUrl).catch(() => '') : Promise.resolve(''),
  ])

  const fullName = buildFullName(profile).toUpperCase() || 'KABATAAN MEMBER'
  const address = buildAddress(profile)
  const validThru = getDigitalIdValidThru(profile.verifiedAt)
  const emergencyContactName = formatEmergencyContactValue(
    profile.digitalIdEmergencyContactName,
    'Not Provided Yet'
  )
  const emergencyContactPhone = formatEmergencyContactValue(
    profile.digitalIdEmergencyContactPhone,
    'Not Provided Yet'
  )
  const emergencyContactRelationship = formatEmergencyContactValue(
    profile.digitalIdEmergencyContactRelationship,
    'Not Provided Yet'
  )

  doc.setFillColor(245, 249, 255)
  doc.rect(0, 0, 460, 700, 'F')

  doc.addImage(frontBg, 'PNG', 20, 20, 420, 266)
  doc.setFillColor(244, 242, 236)
  doc.roundedRect(20, 330, 420, 266, 24, 24, 'F')
  doc.setDrawColor(80, 88, 82)
  doc.setLineWidth(1.2)
  doc.roundedRect(35, 345, 390, 236, 18, 18, 'S')
  doc.setDrawColor(139, 147, 141)
  doc.setLineWidth(0.6)
  doc.roundedRect(45, 355, 370, 216, 14, 14, 'S')

  doc.setTextColor(11, 47, 91)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(6.8)
  doc.text(memberId || 'DRAFT', 89, 74, { align: 'center', maxWidth: 78 })

  if (photoData) {
    doc.addImage(photoData, 'JPEG', 53, 86, 72, 94)
  } else {
    doc.setTextColor(1, 67, 132)
    doc.setFontSize(22)
    doc.text(getInitials(fullName), 89, 142, { align: 'center' })
  }

  if (signatureData) {
    doc.addImage(signatureData, 'PNG', 48, 184, 82, 22)
  }

  doc.setDrawColor(128, 128, 128)
  doc.setLineWidth(0.8)
  doc.line(50, 208, 128, 208)
  doc.setTextColor(26, 26, 26)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(5.6)
  doc.text('SIGNATURE', 89, 216, { align: 'center' })

  doc.setFont('helvetica', 'bold')
  doc.setTextColor(29, 90, 161)
  doc.setFontSize(7)
  doc.text('NAME:', 164, 84)
  doc.text('HOME ADDRESS:', 164, 119)
  doc.text('DATE OF BIRTH:', 164, 171)
  doc.text('GENDER:', 299, 171)
  doc.text('CONTACT NO:', 164, 219)

  doc.setTextColor(11, 47, 91)
  doc.setFontSize(12)
  doc.text(fullName, 164, 97)
  doc.setFontSize(10.5)
  doc.text(address, 164, 133, { maxWidth: 160 })
  doc.text(formatShortDate(profile.birthday), 164, 184)
  doc.text((profile.gender || '-').toUpperCase(), 299, 184)
  doc.text(profile.contactNumber || '-', 164, 232)

  doc.setTextColor(96, 103, 98)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.text('IN CASE OF EMERGENCY, PLEASE CONTACT:', 230, 381, { align: 'center' })
  doc.setTextColor(31, 38, 33)
  doc.setFontSize(13)
  doc.text(`${emergencyContactName} - ${emergencyContactPhone}`, 230, 398, {
    align: 'center',
    maxWidth: 300,
  })
  doc.setTextColor(107, 114, 108)
  doc.setFontSize(7)
  doc.text(`RELATIONSHIP: ${emergencyContactRelationship}`, 230, 410, {
    align: 'center',
    maxWidth: 260,
  })

  doc.setTextColor(118, 125, 120)
  doc.setFontSize(8)
  doc.text('TERMS AND CONDITIONS', 230, 431, { align: 'center' })
  doc.setTextColor(66, 72, 67)
  doc.setFontSize(7.9)
  doc.text(DIGITAL_ID_TERMS_TEXT, 230, 446, {
    align: 'center',
    maxWidth: 235,
    lineHeightFactor: 1.26,
  })

  doc.setTextColor(122, 128, 123)
  doc.setFontSize(7)
  doc.text('VALID THRU', 230, 490, { align: 'center' })
  doc.setTextColor(34, 40, 35)
  doc.setFontSize(12)
  doc.text(validThru, 230, 504, { align: 'center' })
  doc.setTextColor(68, 75, 69)
  doc.setFont('times', 'italic')
  doc.setFontSize(15)
  doc.text(DIGITAL_ID_SIGNATURE_TEXT, 230, 521, { align: 'center' })
  doc.setDrawColor(77, 84, 78)
  doc.setLineWidth(0.8)
  doc.line(186, 526, 274, 526)
  doc.setTextColor(48, 55, 49)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(6.2)
  doc.text(DIGITAL_ID_SIGNATORY_NAME, 230, 537, { align: 'center' })
  doc.setFontSize(6.4)
  doc.text(DIGITAL_ID_SIGNATORY_TITLE, 230, 546, { align: 'center' })

  return doc
}

function buildFullName(profile: {
  firstName?: string
  middleName?: string
  lastName?: string
}) {
  return [profile.firstName, profile.middleName, profile.lastName]
    .filter(Boolean)
    .join(' ')
}

function buildAddress(profile: {
  barangay?: string
  city?: string
  province?: string
}) {
  const parts = [profile.barangay, profile.city, profile.province]
    .filter(Boolean)
    .join(', ')
    .toUpperCase()

  return parts || '-'
}

function formatShortDate(value?: string) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('en-PH')
}

function formatEmergencyContactValue(value: string | undefined, fallback: string) {
  const nextValue = String(value || '').trim()
  if (!nextValue) {
    return fallback
  }

  if (/^\d[\d\s()+-]*$/.test(nextValue)) {
    return nextValue
  }

  return nextValue
    .toLowerCase()
    .split(/\s+/)
    .map((part) =>
      part
        .split('-')
        .map((segment) =>
          segment ? segment.charAt(0).toUpperCase() + segment.slice(1) : ''
        )
        .join('-')
    )
    .join(' ')
}

function getDigitalIdValidThru(value?: string) {
  const date = new Date(value || new Date().toISOString())

  if (Number.isNaN(date.getTime())) {
    return '-'
  }

  date.setFullYear(date.getFullYear() + 5)

  return date.toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  })
}

async function loadImageData(url: string, output: 'png' | 'jpeg' = 'png') {
  const response = await fetch(getPdfAssetUrl(url), { cache: 'no-store' })
  if (!response.ok) {
    throw new Error(`Failed to fetch image asset: ${response.status}`)
  }

  const blob = await response.blob()
  const objectUrl = URL.createObjectURL(blob)

  try {
    return await rasterizeImage(objectUrl, output)
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

function rasterizeImage(url: string, output: 'png' | 'jpeg') {
  return new Promise<string>((resolve, reject) => {
    const image = new window.Image()
    image.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = image.naturalWidth || image.width
      canvas.height = image.naturalHeight || image.height

      const context = canvas.getContext('2d')
      if (!context) {
        reject(new Error('Failed to prepare image canvas'))
        return
      }

      if (output === 'jpeg') {
        context.fillStyle = '#ffffff'
        context.fillRect(0, 0, canvas.width, canvas.height)
      }

      context.drawImage(image, 0, 0)
      resolve(canvas.toDataURL(output === 'jpeg' ? 'image/jpeg' : 'image/png', 0.96))
    }
    image.onerror = () => reject(new Error('Failed to load image'))
    image.src = url
  })
}

function getPdfAssetUrl(url: string) {
  const normalizedUrl = String(url || '').trim()

  if (!normalizedUrl) {
    return normalizedUrl
  }

  if (
    normalizedUrl.startsWith('data:') ||
    normalizedUrl.startsWith('blob:') ||
    normalizedUrl.startsWith('/')
  ) {
    return normalizedUrl
  }

  if (/^https?:\/\//i.test(normalizedUrl)) {
    try {
      const parsedUrl = new URL(normalizedUrl)

      if (typeof window !== 'undefined' && parsedUrl.origin === window.location.origin) {
        return `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`
      }
    } catch {
      return normalizedUrl
    }

    return `/api/image-proxy?url=${encodeURIComponent(normalizedUrl)}`
  }

  return normalizedUrl
}

function sanitizeFileName(value: string) {
  return value.replace(/[^\w-]+/g, '_')
}
