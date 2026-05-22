'use client'

import Image from 'next/image'
import Link from 'next/link'
import jsPDF from 'jspdf'
import { useEffect, useMemo, useState } from 'react'
import DigitalIDCard, { DigitalIdBack } from '@/components/features/DigitalIDCard'
import PhysicalIdRequestStatusBadge, {
  getPhysicalIdRequestStatusLabel,
} from '@/components/features/PhysicalIdRequestStatusBadge'
import AlertModal from '@/components/ui/AlertModal'
import Modal from '@/components/ui/Modal'
import Spinner from '@/components/ui/Spinner'
import { usePhysicalIdRequests } from '@/hooks/usePhysicalIdRequests'
import type { PhysicalIdRequest } from '@/services/physicalIdRequests.service'
import { getDigitalID, getVerificationStatus } from '@/services/verification.service'
import { useAuthStore } from '@/store/authStore'
import { useUserStore } from '@/store/userStore'

interface DigitalIDData {
  status: string
  idNumber?: string
  digitalIdStatus?: string | null
  digitalIdGeneratedAt?: string | null
  digitalIdApprovedAt?: string | null
  qrCode?: string
  memberId?: string
  firstName?: string
  middleName?: string
  lastName?: string
  birthday?: string
  gender?: string
  contactNumber?: string
  barangay?: string
  city?: string
  province?: string
  purok?: string
  photoUrl?: string | null
  digitalIdSignatureUrl?: string | null
}

const DIGITAL_ID_TERMS_TEXT =
  'This card is non-transferable and must be used only by the cardholder whose signature appears herein. Cardholder privileges remain subject to implementing guidelines approved by the Sangguniang Kabataan Council.'
const DIGITAL_ID_SIGNATURE_TEXT = 'Mark Jervin B. Ventura'
const DIGITAL_ID_SIGNATORY_NAME = 'HON. MARK JERVIN B. VENTURA'
const DIGITAL_ID_SIGNATORY_TITLE = 'SK CHAIRPERSON'
const REQUEST_CONTACT_NUMBER_MAX_LENGTH = 11

export default function DigitalIDPage() {
  const { user } = useAuthStore()
  const { profile, setProfile } = useUserStore()
  const [idData, setIdData] = useState<DigitalIDData | null>(null)
  const [isProfileLoading, setIsProfileLoading] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [errorTitle, setErrorTitle] = useState('Digital ID Unavailable')
  const [error, setError] = useState('')
  const [isPhysicalRequestModalOpen, setIsPhysicalRequestModalOpen] = useState(false)
  const [requestReason, setRequestReason] = useState('')
  const [requestContactNumber, setRequestContactNumber] = useState('')
  const [requestNotes, setRequestNotes] = useState('')
  const [requestFormError, setRequestFormError] = useState('')
  const [requestFeedback, setRequestFeedback] = useState<{
    title: string
    message: string
    tone: 'success' | 'error'
  } | null>(null)

  const {
    requests: physicalIdRequests,
    activeRequest: activePhysicalIdRequest,
    canRequest: canRequestPhysicalId,
    eligibilityReason: physicalIdEligibilityReason,
    isLoading: isPhysicalIdRequestsLoading,
    isSubmitting: isSubmittingPhysicalIdRequest,
    error: physicalIdRequestsError,
    clearError: clearPhysicalIdRequestsError,
    submitRequest: submitPhysicalIdRequest,
  } = usePhysicalIdRequests({
    enabled: !isProfileLoading,
  })

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
  const requestContactNumberError = getPhysicalIdRequestContactNumberError(
    requestContactNumber
  )
  const digitalIdProfile = profile
    ? {
        ...profile,
        firstName: idData?.firstName || profile.firstName,
        middleName: idData?.middleName || profile.middleName,
        lastName: idData?.lastName || profile.lastName,
        birthday: idData?.birthday || profile.birthday,
        gender: idData?.gender || profile.gender,
        contactNumber: idData?.contactNumber || profile.contactNumber,
        barangay: idData?.barangay || profile.barangay,
        city: idData?.city || profile.city,
        province: idData?.province || profile.province,
        purok: idData?.purok || profile.purok,
      }
    : null
  const awaitingSuperadminTitle =
    digitalIdStatus === 'deactivated' ? 'Digital ID Deactivated' : 'Awaiting Superadmin ID Generation'
  const awaitingSuperadminMessage =
    digitalIdStatus === 'deactivated'
      ? 'Your Digital ID is currently inactive. Please contact your SK office if it needs to be restored.'
      : digitalIdStatus === 'draft'
        ? 'Your verification is complete. Your Digital ID draft is prepared, but the superadmin still needs to issue and activate it before it appears here.'
        : 'Your verification is complete. Your Digital ID will appear here after the superadmin generates and issues it.'
  const pageIntroTitle = isDigitalIdReady ? 'Verified Member' : 'Digital ID'
  const pageIntroDescription = isDigitalIdReady
    ? 'Your official Katipunan ng Kabataan credential is ready for verification, saving, and physical-copy requests.'
    : isVerified
      ? 'Your credential progress is visible here while your Digital ID completes the issuance flow.'
      : 'Complete the remaining steps below to unlock your official Katipunan ng Kabataan credential.'
  const headerStatus = isDigitalIdReady
    ? {
        label: 'Digital ID Active',
        pillClass: 'border border-[#cfe8d8] bg-[#edf9f2] text-[#24724a]',
      }
    : digitalIdStatus === 'deactivated'
      ? {
          label: 'Digital ID Inactive',
          pillClass: 'border border-[#f3d1d1] bg-[#fff2f2] text-[#c34646]',
        }
    : isVerified
      ? {
          label: 'Awaiting Superadmin',
          pillClass: 'border border-[#d5e7fb] bg-[#eef6ff] text-[#0f5eb3]',
        }
      : {
          label: 'Not Yet Verified',
          pillClass: 'border border-[#f6e1b3] bg-[#fff8eb] text-[#b47c09]',
        }
  const digitalIdIssuedAt = resolveDigitalIdIssuedAt(
    idData?.digitalIdApprovedAt,
    profile?.digitalIdApprovedAt,
    idData?.digitalIdGeneratedAt,
    profile?.digitalIdGeneratedAt,
    digitalIdProfile?.digitalIdApprovedAt,
    digitalIdProfile?.digitalIdGeneratedAt,
    digitalIdProfile?.verifiedAt,
    profile?.verifiedAt
  )
  const issuedSinceLabel =
    isVerified || isDigitalIdReady ? String(extractYear(digitalIdIssuedAt)) : 'Pending'
  const barangayLabel = digitalIdProfile?.barangay || profile?.barangay || 'Not set'
  const emergencyContactName = formatEmergencyContactValue(
    digitalIdProfile?.digitalIdEmergencyContactName,
    'Not Provided Yet'
  )
  const emergencyContactPhone = formatEmergencyContactValue(
    digitalIdProfile?.digitalIdEmergencyContactPhone,
    'Not Provided Yet'
  )
  const emergencyContactRelationship = formatEmergencyContactValue(
    digitalIdProfile?.digitalIdEmergencyContactRelationship,
    'Not Provided Yet'
  )
  const digitalIdValidThru = getDigitalIdValidThru(digitalIdIssuedAt)

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

  useEffect(() => {
    const nextContactNumber = normalizePhysicalIdRequestContactNumber(
      idData?.contactNumber || profile?.contactNumber || ''
    )
    setRequestContactNumber(nextContactNumber)
  }, [idData?.contactNumber, profile?.contactNumber])

  async function handleSaveId() {
    if (!digitalIdProfile || !idData || isSaving) {
      return
    }

    setIsSaving(true)

    try {
      const pdf = await buildDigitalIdPdf({
        profile: digitalIdProfile,
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

  function openPhysicalIdRequestModal() {
    setRequestReason('')
    setRequestNotes('')
    setRequestFormError('')
    setRequestContactNumber(
      normalizePhysicalIdRequestContactNumber(
        idData?.contactNumber || profile?.contactNumber || ''
      )
    )
    setIsPhysicalRequestModalOpen(true)
  }

  async function handleSubmitPhysicalIdRequest(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()
    setRequestFormError('')

    const trimmedReason = requestReason.trim()
    const trimmedContactNumber = normalizePhysicalIdRequestContactNumber(
      requestContactNumber
    )
    const trimmedNotes = requestNotes.trim()

    if (!trimmedReason) {
      setRequestFormError('Please tell us why you need a physical ID copy.')
      return
    }

    if (getPhysicalIdRequestContactNumberError(trimmedContactNumber)) {
      setRequestFormError('Contact number must be 11 digits and start with 09.')
      return
    }

    try {
      await submitPhysicalIdRequest({
        reason: trimmedReason,
        contactNumber: trimmedContactNumber,
        notes: trimmedNotes || undefined,
      })

      setIsPhysicalRequestModalOpen(false)
      setRequestFeedback({
        title: 'Physical ID Request Submitted',
        message:
          'Your request has been submitted successfully. Physical IDs are for pick-up only, and we will notify you once the request is approved and scheduled for release.',
        tone: 'success',
      })
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Failed to submit your physical ID request. Please try again.'
      setRequestFormError(message)
    }
  }

  return (
    <div className="min-h-screen w-full bg-[linear-gradient(180deg,#edf4fd_0%,#f6fbff_28%,#fffaf0_62%,#f5f6f8_100%)] pb-28 text-[#014384]">
      <section className="px-5 pb-8 pt-[calc(env(safe-area-inset-top)+20px)]">
        <div className="mx-auto max-w-[420px]">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7088aa]">
                Digital ID
              </p>
              <h1 className="mt-2 text-[24px] font-black leading-[1.05] text-[#014384]">
                {pageIntroTitle}
              </h1>
              <p className="mt-2 max-w-[280px] text-[13px] leading-6 text-[#5c7aa3]">
                {pageIntroDescription}
              </p>
            </div>

            <div className="flex shrink-0 flex-col items-end gap-3 pt-1">
              <Image
                src="/images/FOOTER.png"
                alt="SK Barangay Buting"
                width={132}
                height={34}
                className="h-auto w-[92px] object-contain sm:w-[132px]"
              />
              <span
                className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold ${headerStatus.pillClass}`}
              >
                {headerStatus.label}
              </span>
            </div>
          </div>

          <div className="mt-6">
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
            <CredentialSummaryPanel
              statusLabel={headerStatus.label}
              issuedSinceLabel={issuedSinceLabel}
              barangayLabel={barangayLabel}
            />

            <div className="space-y-3">
              <DigitalIDCard
                profile={digitalIdProfile!}
                memberId={idData.memberId || idData.idNumber || ''}
                photoUrl={digitalIdPhotoUrl}
                signatureUrl={digitalIdSignatureUrl}
                showBack={false}
              />
              <p className="px-1 text-center text-[13px] leading-6 text-[#5c7aa3]">
                Present this credential to KK officers whenever they need to verify your membership.
              </p>
            </div>

            <PhysicalIdCopySection
              activeRequest={activePhysicalIdRequest}
              latestRequest={physicalIdRequests[0] || null}
              canRequest={canRequestPhysicalId && isDigitalIdReady}
              eligibilityReason={physicalIdEligibilityReason}
              isLoading={isPhysicalIdRequestsLoading}
              onRequest={openPhysicalIdRequestModal}
            />

            <CredentialActionsSection
              isSaving={isSaving}
              onSave={handleSaveId}
            />

            <EmergencyCredentialPanel
              emergencyContactName={emergencyContactName}
              emergencyContactPhone={emergencyContactPhone}
              emergencyContactRelationship={emergencyContactRelationship}
              validThru={digitalIdValidThru}
            />
          </div>
        )}
          </div>
        </div>
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

      <AlertModal
        isOpen={Boolean(physicalIdRequestsError)}
        title="Physical ID Requests Unavailable"
        message={physicalIdRequestsError || ''}
        tone="error"
        onClose={clearPhysicalIdRequestsError}
      />

      <AlertModal
        isOpen={Boolean(requestFeedback)}
        title={requestFeedback?.title}
        message={requestFeedback?.message || ''}
        tone={requestFeedback?.tone}
        onClose={() => setRequestFeedback(null)}
      />

      <Modal
        isOpen={isPhysicalRequestModalOpen}
        onClose={() => {
          if (!isSubmittingPhysicalIdRequest) {
            setIsPhysicalRequestModalOpen(false)
            setRequestFormError('')
          }
        }}
        title="Request Physical Copy"
        size="md"
      >
        <form onSubmit={handleSubmitPhysicalIdRequest} className="space-y-4">
          <div className="rounded-[18px] border border-[#ffe1a6] bg-[#fff8eb] px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#b88408]">
              Pick-up only
            </p>
            <p className="mt-2 text-sm leading-6 text-[#7a5b14]">
              Physical Digital IDs are released for pick-up only. We will notify you once the request is approved and ready.
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#2c4d77]">
              Reason for request
            </label>
            <textarea
              value={requestReason}
              onChange={(event) => setRequestReason(event.target.value)}
              placeholder="Tell us why you need a physical copy of your Digital ID."
              rows={4}
              maxLength={300}
              className="w-full rounded-2xl border border-[#d8e5f4] bg-[#f8fbff] px-4 py-3 text-sm text-[#014384] placeholder:text-[#8ca4c1] outline-none transition focus:border-[#0572DC] focus:ring-2 focus:ring-[#0572DC]/20"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#2c4d77]">
              Contact number
            </label>
            <input
              type="tel"
              value={requestContactNumber}
              onChange={(event) =>
                setRequestContactNumber(
                  normalizePhysicalIdRequestContactNumber(event.target.value)
                )
              }
              inputMode="numeric"
              maxLength={REQUEST_CONTACT_NUMBER_MAX_LENGTH}
              placeholder="Example: 09171234567"
              className={`w-full rounded-2xl border px-4 py-3 text-sm text-[#014384] placeholder:text-[#8ca4c1] outline-none transition focus:ring-2 ${
                requestContactNumberError
                  ? 'border-[#f0b7b7] bg-[#fff3f3] focus:border-[#d64545] focus:ring-[#d64545]/20'
                  : 'border-[#d8e5f4] bg-[#f8fbff] focus:border-[#0572DC] focus:ring-[#0572DC]/20'
              }`}
            />
            <p
              className={`mt-1.5 text-xs ${
                requestContactNumberError ? 'text-[#d64545]' : 'text-[#6f89aa]'
              }`}
            >
              {requestContactNumberError || 'Use an 11-digit mobile number that starts with 09.'}
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#2c4d77]">
              Optional notes
            </label>
            <textarea
              value={requestNotes}
              onChange={(event) => setRequestNotes(event.target.value)}
              placeholder="Add anything else the SK office should know."
              rows={3}
              maxLength={1000}
              className="w-full rounded-2xl border border-[#d8e5f4] bg-[#f8fbff] px-4 py-3 text-sm text-[#014384] placeholder:text-[#8ca4c1] outline-none transition focus:border-[#0572DC] focus:ring-2 focus:ring-[#0572DC]/20"
            />
          </div>

          {requestFormError ? (
            <div className="rounded-[18px] border border-[#f5d0d0] bg-[#fff1f1] px-4 py-3 text-sm leading-6 text-[#bf4747]">
              {requestFormError}
            </div>
          ) : null}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                setIsPhysicalRequestModalOpen(false)
                setRequestFormError('')
              }}
              disabled={isSubmittingPhysicalIdRequest}
              className="inline-flex flex-1 items-center justify-center rounded-full border border-[#d8e5f4] bg-white px-5 py-3 text-sm font-semibold text-[#014384] disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingPhysicalIdRequest}
              className="inline-flex flex-1 items-center justify-center rounded-full bg-[linear-gradient(90deg,#014384_0%,#035DB7_52%,#0572DC_100%)] px-5 py-3 text-sm font-bold text-white shadow-[0_10px_22px_rgba(5,114,220,0.18)] disabled:opacity-60"
            >
              {isSubmittingPhysicalIdRequest ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

function PhysicalIdCopySection({
  activeRequest,
  latestRequest,
  canRequest,
  eligibilityReason,
  isLoading,
  onRequest,
}: {
  activeRequest: PhysicalIdRequest | null
  latestRequest: PhysicalIdRequest | null
  canRequest: boolean
  eligibilityReason: string | null
  isLoading: boolean
  onRequest: () => void
}) {
  return (
    <section className="rounded-[28px] border border-[#d9e5f3] bg-white/78 px-5 py-5 shadow-[0_12px_24px_rgba(1,67,132,0.06)] backdrop-blur-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7e95b2]">
            Physical ID Copy
          </p>
          <h2 className="mt-1 text-[17px] font-extrabold text-[#014384]">
            Request a physical release
          </h2>
        </div>
        <span className="rounded-full border border-[#f5dfb1] bg-[#fff8eb] px-3 py-1 text-[11px] font-bold text-[#b88408]">
          Pick-up only
        </span>
      </div>

      <p className="mt-3 text-[13px] leading-6 text-[#5c7aa3]">
        Use this if you need a physical copy of your Digital ID. Requests go through review, production, and pick-up scheduling before release.
      </p>

      {isLoading ? (
        <div className="mt-4 flex justify-center py-8">
          <Spinner size="md" />
        </div>
      ) : activeRequest ? (
        <div className="mt-4 rounded-[22px] border border-[#dbe7f6] bg-[#f7fbff] px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6f89aa]">
                Active request
              </p>
              <p className="mt-1 text-[15px] font-bold text-[#014384]">
                {formatRequestDate(activeRequest.createdAt)}
              </p>
            </div>
            <PhysicalIdRequestStatusBadge status={activeRequest.status} />
          </div>

          <p className="mt-3 text-[13px] leading-6 text-[#315b8d]">
            Current status: {getPhysicalIdRequestStatusLabel(activeRequest.status)}.
          </p>

          {activeRequest.adminRemarks ? (
            <p className="mt-3 rounded-[18px] border border-[#d7e7fb] bg-white px-4 py-3 text-[13px] leading-6 text-[#315b8d]">
              <span className="font-bold">Admin remarks:</span> {activeRequest.adminRemarks}
            </p>
          ) : null}

          {activeRequest.readyForPickupNotice ? (
            <p className="mt-3 rounded-[18px] border border-[#ccecd8] bg-[#eefaf2] px-4 py-3 text-[13px] leading-6 text-[#23724a]">
              {activeRequest.readyForPickupNotice}
            </p>
          ) : null}
        </div>
      ) : (
        <div className="mt-4 rounded-[22px] border border-[#dbe7f6] bg-[#f7fbff] px-4 py-4">
          <p className="text-[13px] leading-6 text-[#315b8d]">
            {canRequest
              ? 'You can submit one request at a time. Once approved, the SK office will continue the processing and notify you when it is ready for pick-up.'
              : eligibilityReason || 'Physical copy requests are currently unavailable for your account.'}
          </p>
          {latestRequest ? (
            <div className="mt-3 flex items-center gap-2 text-[12px] text-[#5c7aa3]">
              <span>Latest request:</span>
              <PhysicalIdRequestStatusBadge status={latestRequest.status} size="sm" />
            </div>
          ) : null}
        </div>
      )}

      <div className="mt-4 flex flex-col gap-3">
        <button
          type="button"
          onClick={onRequest}
          disabled={!canRequest || isLoading}
          className="inline-flex w-full items-center justify-center rounded-full bg-[linear-gradient(90deg,#014384_0%,#035DB7_52%,#0572DC_100%)] px-5 py-3.5 text-[15px] font-bold text-white shadow-[0_10px_22px_rgba(5,114,220,0.16)] disabled:opacity-55"
        >
          Request Physical Copy
        </button>
        <Link
          href="/profile/physical-id-requests"
          className="inline-flex w-full items-center justify-center rounded-full border border-[#d8e5f4] bg-white px-5 py-3 text-[14px] font-semibold text-[#014384]"
        >
          My Physical ID Requests
        </Link>
      </div>
    </section>
  )
}

function CredentialSummaryPanel({
  statusLabel,
  issuedSinceLabel,
  barangayLabel,
}: {
  statusLabel: string
  issuedSinceLabel: string
  barangayLabel: string
}) {
  return (
    <section className="rounded-[26px] border border-[#d9e5f3] bg-white/74 px-4 py-4 shadow-[0_10px_22px_rgba(1,67,132,0.05)] backdrop-blur-sm">
      <div className="grid grid-cols-2 gap-3">
        <CredentialMetaItem label="Digital ID Status" value={statusLabel} />
        <CredentialMetaItem label="Member State" value="Verified Member" />
        <CredentialMetaItem label="Issued Since" value={issuedSinceLabel} />
        <CredentialMetaItem label="Barangay" value={barangayLabel} />
      </div>
    </section>
  )
}

function CredentialMetaItem({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-[20px] border border-[#e5edf7] bg-[#f8fbff] px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7a91b0]">
        {label}
      </p>
      <p className="mt-1.5 text-[14px] font-bold leading-5 text-[#014384]">
        {value}
      </p>
    </div>
  )
}

function CredentialActionsSection({
  isSaving,
  onSave,
}: {
  isSaving: boolean
  onSave: () => void
}) {
  return (
    <section className="rounded-[28px] border border-[#d9e5f3] bg-white/76 px-5 py-5 shadow-[0_12px_24px_rgba(1,67,132,0.05)] backdrop-blur-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7e95b2]">
            Credential Actions
          </p>
          <p className="mt-2 text-[13px] leading-6 text-[#5c7aa3]">
            Save a copy, review your verification, or replace the signature shown on the card.
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          className="col-span-2 inline-flex items-center justify-center rounded-full bg-[linear-gradient(90deg,#014384_0%,#035DB7_52%,#0572DC_100%)] px-6 py-4 text-[17px] font-bold text-white shadow-[0_12px_24px_rgba(5,114,220,0.16)] disabled:opacity-60"
        >
          {isSaving ? 'Saving ID...' : 'Save ID'}
        </button>
        <Link
          href="/verification/status"
          className="inline-flex items-center justify-center rounded-full border border-[#d8e5f4] bg-white px-4 py-3 text-[14px] font-semibold text-[#014384]"
        >
          Verification Status
        </Link>
        <Link
          href="/profile/signature"
          className="inline-flex items-center justify-center rounded-full border border-[#d8e5f4] bg-white px-4 py-3 text-[14px] font-semibold text-[#014384]"
        >
          Update Signature
        </Link>
      </div>
    </section>
  )
}

function EmergencyCredentialPanel({
  emergencyContactName,
  emergencyContactPhone,
  emergencyContactRelationship,
  validThru,
}: {
  emergencyContactName: string
  emergencyContactPhone: string
  emergencyContactRelationship: string
  validThru: string
}) {
  return (
    <section className="rounded-[28px] border border-[#e2e8f1] bg-white/68 px-4 py-4 shadow-[0_8px_18px_rgba(1,67,132,0.04)] backdrop-blur-sm">
      <div className="px-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8a9bb2]">
          Emergency & Validity
        </p>
        <p className="mt-2 text-[13px] leading-6 text-[#6b81a1]">
          These are the emergency and validity details shown on the back of your digital credential.
        </p>
      </div>

      <div className="mt-4">
        <DigitalIdBack
          emergencyContactName={emergencyContactName}
          emergencyContactPhone={emergencyContactPhone}
          emergencyContactRelationship={emergencyContactRelationship}
          validThru={validThru}
        />
      </div>
    </section>
  )
}

function extractYear(value?: string) {
  if (!value) return new Date().getFullYear()
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return new Date().getFullYear()
  return date.getFullYear()
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
    purok?: string
    barangay?: string
    city?: string
    province?: string
    birthday?: string
    gender?: string
    contactNumber?: string
    verifiedAt?: string
    digitalIdGeneratedAt?: string | null
    digitalIdApprovedAt?: string | null
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
  const purok = buildPurok(profile.purok)
  const contactNumber = buildFrontCardValue(profile.contactNumber)
  const validThru = getDigitalIdValidThru(
    resolveDigitalIdIssuedAt(
      profile.digitalIdApprovedAt,
      profile.digitalIdGeneratedAt,
      profile.verifiedAt
    )
  )
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
  const frontContentOffsetY = -12
  const frontInfoOffsetY = -18

  doc.setTextColor(11, 47, 91)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(6.8)
  doc.text(memberId || 'DRAFT', 89, 74 + frontContentOffsetY, { align: 'center', maxWidth: 78 })

  if (photoData) {
    doc.addImage(photoData, 'JPEG', 53, 86 + frontContentOffsetY, 72, 94)
  } else {
    doc.setTextColor(1, 67, 132)
    doc.setFontSize(22)
    doc.text(getInitials(fullName), 89, 142 + frontContentOffsetY, { align: 'center' })
  }

  if (signatureData) {
    doc.addImage(signatureData, 'PNG', 48, 184 + frontContentOffsetY, 82, 22)
  }

  doc.setDrawColor(128, 128, 128)
  doc.setLineWidth(0.8)
  doc.line(50, 208 + frontContentOffsetY, 128, 208 + frontContentOffsetY)
  doc.setTextColor(26, 26, 26)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(5.6)
  doc.text('SIGNATURE', 89, 216 + frontContentOffsetY, { align: 'center' })

  doc.setFont('helvetica', 'bold')
  doc.setTextColor(29, 90, 161)
  doc.setFontSize(7)
  doc.text('NAME:', 164, 84 + frontInfoOffsetY)
  doc.text('HOME ADDRESS:', 164, 111 + frontInfoOffsetY)
  doc.text('PUROK:', 164, 152 + frontInfoOffsetY)
  doc.text('DATE OF BIRTH:', 164, 183 + frontInfoOffsetY)
  doc.text('GENDER:', 299, 183 + frontInfoOffsetY)
  doc.text('CONTACT NO:', 164, 218 + frontInfoOffsetY)

  doc.setTextColor(11, 47, 91)
  doc.setFontSize(12)
  doc.text(fullName, 164, 97 + frontInfoOffsetY)
  doc.setFontSize(10.5)
  doc.text(address, 164, 123 + frontInfoOffsetY, { maxWidth: 160 })
  doc.text(purok, 164, 164 + frontInfoOffsetY, { maxWidth: 160 })
  doc.text(formatShortDate(profile.birthday), 164, 196 + frontInfoOffsetY)
  doc.text((profile.gender || '-').toUpperCase(), 299, 196 + frontInfoOffsetY)
  doc.text(contactNumber, 164, 231 + frontInfoOffsetY)

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
  doc.text('VALID UNTIL', 230, 490, { align: 'center' })
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

function buildPurok(value?: string) {
  const nextValue = String(value || '').trim()
  return nextValue ? nextValue.toUpperCase() : '-'
}

function buildFrontCardValue(value?: string) {
  const nextValue = String(value || '').trim()
  return nextValue || '-'
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

  date.setFullYear(date.getFullYear() + 2)

  return date.toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  })
}

function resolveDigitalIdIssuedAt(
  ...values: Array<string | null | undefined>
): string | undefined {
  for (const value of values) {
    const normalized = String(value || '').trim()
    if (normalized) {
      return normalized
    }
  }

  return undefined
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

function normalizePhysicalIdRequestContactNumber(value: string) {
  return value.replace(/\D/g, '').slice(0, REQUEST_CONTACT_NUMBER_MAX_LENGTH)
}

function getPhysicalIdRequestContactNumberError(value: string) {
  const trimmedValue = value.trim()

  if (!trimmedValue) {
    return 'Contact number is required for pickup coordination.'
  }

  if (!/^09\d{9}$/.test(trimmedValue)) {
    return 'Contact number must be 11 digits and start with 09.'
  }

  return ''
}

function formatRequestDate(value: string | null) {
  if (!value) {
    return 'Recently submitted'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return 'Recently submitted'
  }

  return date.toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}
