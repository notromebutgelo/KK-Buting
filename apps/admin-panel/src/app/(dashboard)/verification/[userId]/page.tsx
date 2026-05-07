'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import api from '@/lib/api'
import LoadingModal from '@/components/ui/LoadingModal'

interface ReviewDocument {
  id: string
  documentType: string
  label: string
  fileUrl?: string | null
  uploadedAt?: string
  reviewStatus: string
  reviewNote?: string | null
  required: boolean
  present: boolean
}

interface VerificationProfile {
  userId: string
  fullName: string
  firstName: string
  middleName?: string
  lastName: string
  suffix?: string
  gender?: string
  age?: number
  birthday?: string
  email?: string
  contactNumber?: string
  region?: string
  province?: string
  city?: string
  barangay?: string
  purok?: string
  civilStatus?: string
  youthAgeGroup?: string
  educationalBackground?: string
  youthClassification?: string
  workStatus?: string
  registeredSkVoter?: boolean | string
  votedLastSkElections?: boolean | string
  registeredNationalVoter?: boolean | string
  attendedKkAssembly?: boolean | string
  kkAssemblyTimesAttended?: number | string
  status: 'pending' | 'verified' | 'rejected'
  queueStatus: string
  submittedAt?: string
  verificationRejectReason?: string | null
  verificationRejectNote?: string | null
  verificationResubmissionMessage?: string | null
  digitalIdStatus?: 'draft' | 'pending_approval' | 'active' | 'deactivated' | string
  digitalIdApprovalRequestedAt?: string | null
  digitalIdApprovalRequestedBy?: string | null
  verificationDocumentsApprovedAt?: string | null
  verificationDocumentsApprovedBy?: string | null
  verificationReferredToSuperadminAt?: string | null
  verificationReferredToSuperadminBy?: string | null
  digitalIdEmergencyContactComplete?: boolean
  digitalIdSignatureComplete?: boolean
  idPhotoUrl?: string | null
  documents: ReviewDocument[]
  requiredDocuments: ReviewDocument[]
  supplementalDocuments: ReviewDocument[]
  missingDocuments: ReviewDocument[]
}

export default function VerificationDetailPage() {
  const { userId } = useParams<{ userId: string }>()
  const router = useRouter()
  const [profile, setProfile] = useState<VerificationProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [adminRole, setAdminRole] = useState('admin')
  const [rejectReason, setRejectReason] = useState('')
  const [rejectNote, setRejectNote] = useState('')
  const [resubmissionMessage, setResubmissionMessage] = useState('')
  const [selectedDocs, setSelectedDocs] = useState<string[]>([])
  const [docNotes, setDocNotes] = useState<Record<string, string>>({})
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isApproving, setIsApproving] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)
  const [isRequestingResubmission, setIsRequestingResubmission] = useState(false)
  const [isReferringToSuperadmin, setIsReferringToSuperadmin] = useState(false)
  const [busyDocId, setBusyDocId] = useState<string | null>(null)
  const [loadingTitle, setLoadingTitle] = useState('Updating verification')

  const isSuperadmin = adminRole === 'superadmin'

  const loadProfile = async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!silent) {
      setIsLoading(true)
    }
    try {
      const [profileRes, meRes] = await Promise.all([
        api.get(`/admin/verification/${userId}`),
        api.get('/auth/me'),
      ])
      setProfile(profileRes.data.profile || profileRes.data)
      setAdminRole(meRes.data?.role || window.localStorage.getItem('kk-admin-role') || 'admin')
    } catch {
      setProfile(null)
    } finally {
      if (!silent) {
        setIsLoading(false)
      }
    }
  }

  useEffect(() => {
    loadProfile()
  }, [userId])

  const groupedDocuments = useMemo(() => {
    if (!profile) return []
    return [...profile.requiredDocuments, ...profile.supplementalDocuments]
  }, [profile])

  const allRequiredDocumentsApproved =
    (profile?.missingDocuments?.length || 0) === 0 &&
    Boolean(profile?.requiredDocuments.length) &&
    profile?.requiredDocuments?.every((document) => document.reviewStatus === 'approved')
  const flaggedDocumentIds = groupedDocuments
    .filter((document) => ['rejected', 'resubmission_requested'].includes(document.reviewStatus))
    .map((document) => document.id)
  const resubmissionTargetIds = selectedDocs.length > 0 ? selectedDocs : flaggedDocumentIds
  const canVerify = profile?.status === 'pending' && allRequiredDocumentsApproved
  const isPendingSuperadminGeneration = profile?.queueStatus === 'pending_superadmin_id_generation'
  const canForwardToSuperadmin =
    !isSuperadmin &&
    Boolean(allRequiredDocumentsApproved) &&
    !isPendingSuperadminGeneration &&
    profile?.digitalIdStatus !== 'active'
  const isVerificationAlreadyComplete = profile?.status === 'verified'

  const toggleSelectedDoc = (documentId: string) => {
    setSelectedDocs((current) =>
      current.includes(documentId)
        ? current.filter((id) => id !== documentId)
        : [...current, documentId]
    )
  }

  const handleDocumentReview = async (documentId: string, action: 'approved' | 'rejected') => {
    if (!userId || !documentId) {
      setMessage('Document review could not be submitted because the record is missing an identifier.')
      return
    }

    setBusyDocId(documentId)
    setMessage('')
    const note = String(docNotes[documentId] || '')
    try {
      await api.patch(`/admin/verification/${userId}/documents/${documentId}/review`, {
        action,
        note,
      })
      setProfile((current) =>
        current ? applyDocumentReviewUpdate(current, documentId, action, note) : current
      )
      setSelectedDocs((current) =>
        action === 'rejected'
          ? Array.from(new Set([...current, documentId]))
          : current.filter((id) => id !== documentId)
      )
      setMessage(`Document ${action}.`)
    } catch (error: any) {
      setMessage(error?.response?.data?.error || 'Failed to update document review.')
    } finally {
      setBusyDocId(null)
    }
  }

  const handleApproveAndRefer = async () => {
    setLoadingTitle('Approving verification and referring to superadmin')
    setIsApproving(true)
    setMessage('')
    try {
      await api.patch(`/admin/verification/${userId}/approve`)
      await loadProfile()
      setMessage('Verification approved and referred to superadmin for Digital ID generation.')
    } catch (error: any) {
      setMessage(error?.response?.data?.error || 'Failed to approve and refer this submission.')
    } finally {
      setIsApproving(false)
    }
  }

  const handleReferToSuperadmin = async () => {
    setLoadingTitle('Referring to superadmin')
    setIsReferringToSuperadmin(true)
    setMessage('')
    try {
      await api.post(`/admin/digital-ids/${userId}/submit`)
      await loadProfile()
      setMessage('Reminder sent to superadmin for Digital ID generation.')
    } catch (error: any) {
      setMessage(error?.response?.data?.error || 'Failed to refer this member to superadmin.')
    } finally {
      setIsReferringToSuperadmin(false)
    }
  }

  const openDigitalIdWorkspace = () => {
    router.push(`/digital-ids?member=${userId}`)
  }

  const handleReject = async () => {
    setLoadingTitle('Rejecting submission')
    setIsRejecting(true)
    setMessage('')
    try {
      await api.patch(`/admin/verification/${userId}/reject`, {
        reason: rejectReason,
        note: rejectNote,
      })
      await loadProfile()
      setMessage('Submission rejected.')
    } catch (error: any) {
      setMessage(error?.response?.data?.error || 'Failed to reject submission.')
    } finally {
      setIsRejecting(false)
    }
  }

  const handleRequestResubmission = async () => {
    setLoadingTitle('Requesting resubmission')
    setIsRequestingResubmission(true)
    setMessage('')
    try {
      if (!resubmissionTargetIds.length) {
        throw new Error('Flag at least one document before requesting resubmission.')
      }
      await api.patch(`/admin/verification/${userId}/request-resubmission`, {
        documentIds: resubmissionTargetIds,
        message: resubmissionMessage,
      })
      setProfile((current) =>
        current
          ? applyResubmissionRequestUpdate(current, resubmissionTargetIds, resubmissionMessage)
          : current
      )
      setSelectedDocs([])
      setResubmissionMessage('')
      setMessage('Resubmission request sent to the youth member.')
    } catch (error: any) {
      setMessage(error?.response?.data?.error || 'Failed to request resubmission.')
    } finally {
      setIsRequestingResubmission(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[color:var(--accent)] border-t-transparent" />
      </div>
    )
  }

  if (!profile) {
    return <div className="py-20 text-center" style={{ color: 'var(--muted)' }}>Verification record not found.</div>
  }

  return (
    <>
      <LoadingModal
        open={
          isApproving ||
          isRejecting ||
          isRequestingResubmission ||
          isReferringToSuperadmin
        }
        title={loadingTitle}
        description="Please wait while the review action is saved and the submission details are refreshed."
      />
      <div className="space-y-5">
      <div className="admin-panel flex flex-col gap-4 p-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-4">
          <button
            onClick={() => router.back()}
            className="mt-1 inline-flex h-10 w-10 items-center justify-center rounded-xl border hover:bg-[color:var(--accent-soft)]"
            style={{ borderColor: 'var(--stroke)', color: 'var(--accent-strong)' }}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-black" style={{ color: 'var(--ink)' }}>{profile.fullName}</h1>
              <QueueStatusBadge status={profile.queueStatus} />
            </div>
            <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>
              {profile.email || 'No email'} | {profile.contactNumber || 'No contact'}
            </p>
            <p className="mt-1 text-xs uppercase tracking-[0.16em]" style={{ color: 'var(--muted)' }}>
              Submitted: {profile.submittedAt ? new Date(profile.submittedAt).toLocaleString('en-PH') : '-'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <SummaryMini label="Required" value={profile.requiredDocuments.length} />
          <SummaryMini label="Missing" value={profile.missingDocuments.length} />
          <SummaryMini
            label="Approved"
            value={profile.requiredDocuments.filter((document) => document.reviewStatus === 'approved').length}
          />
        </div>
      </div>

      {message ? (
        <div className="rounded-xl border px-4 py-3 text-sm" style={{ borderColor: 'var(--stroke)', background: 'var(--accent-soft)', color: 'var(--accent-strong)' }}>
          {message}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <WorkflowStageCard
          step="1"
          title="Document Review"
          description="Admins and superadmins review each uploaded requirement one document at a time."
          status={
            profile.requiredDocuments.every((document) => document.reviewStatus === 'approved')
              ? 'Documents cleared'
              : profile.requiredDocuments.some((document) => document.reviewStatus === 'rejected')
                ? 'Issues flagged'
                : 'Review in progress'
          }
          tone={
            profile.requiredDocuments.every((document) => document.reviewStatus === 'approved')
              ? 'success'
              : 'default'
          }
        />
        <WorkflowStageCard
          step="2"
          title="Verified and Referred"
          description="Admin approval completes verification and moves the member into the superadmin Digital ID generation queue."
          status={
            isPendingSuperadminGeneration
              ? `Approved by ${profile.verificationDocumentsApprovedBy || 'admin'}`
              : canForwardToSuperadmin
                ? 'Ready for admin approval and referral'
                : profile.digitalIdStatus === 'active'
                  ? 'Handoff completed'
                  : 'Waiting for completed document approvals'
          }
          tone={isPendingSuperadminGeneration ? 'info' : canForwardToSuperadmin ? 'warning' : 'default'}
        />
        <WorkflowStageCard
          step="3"
          title="Digital ID Issuance"
          description="The youth app shows the Digital ID only after the superadmin generates and issues it from the Digital IDs workspace."
          status={
            profile.digitalIdStatus === 'active'
              ? 'Digital ID issued'
              : isPendingSuperadminGeneration
                ? 'Pending superadmin generation'
                : 'Not yet issued'
          }
          tone={profile.digitalIdStatus === 'active' ? 'success' : isPendingSuperadminGeneration ? 'info' : 'default'}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.2fr_1fr]">
        <div className="space-y-5">
          <Panel title="Youth Profile Data">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <ProfileField label="Full Name" value={profile.fullName} />
              <ProfileField label="Age / Age Group" value={`${profile.age || '-'} / ${profile.youthAgeGroup || '-'}`} />
              <ProfileField label="Birthday" value={formatDate(profile.birthday)} />
              <ProfileField label="Gender" value={profile.gender} />
              <ProfileField label="Civil Status" value={profile.civilStatus} />
              <ProfileField label="Contact Number" value={profile.contactNumber} />
              <ProfileField label="Email" value={profile.email} />
              <ProfileField label="Address" value={[profile.purok, profile.barangay, profile.city, profile.province].filter(Boolean).join(', ')} />
              <ProfileField label="Education" value={profile.educationalBackground} />
              <ProfileField label="Classification" value={profile.youthClassification} />
              <ProfileField label="Work Status" value={profile.workStatus} />
              <ProfileField label="SK / National Voter" value={`${formatBool(profile.registeredSkVoter)} / ${formatBool(profile.registeredNationalVoter)}`} />
            </div>
          </Panel>

          <Panel title="Required Document Checklist">
            <div className="space-y-3">
              {profile.requiredDocuments.map((document) => (
                <div key={document.documentType} className="flex items-center justify-between rounded-2xl border px-4 py-3" style={{ borderColor: 'var(--stroke)', background: 'var(--accent-soft)' }}>
                  <div>
                    <p className="font-semibold" style={{ color: 'var(--ink)' }}>{document.label}</p>
                    <p className="text-xs" style={{ color: 'var(--muted)' }}>
                      {document.present ? `Uploaded ${formatDate(document.uploadedAt)}` : 'Not uploaded yet'}
                    </p>
                  </div>
                  <DocumentStatusBadge status={document.reviewStatus} />
                </div>
              ))}
            </div>
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel title="Document Review Panel">
            <div className="space-y-4">
              {groupedDocuments.map((document) => (
                <div key={document.id} className="admin-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        {profile.status === 'pending' && document.present ? (
                          <input
                            type="checkbox"
                            checked={selectedDocs.includes(document.id)}
                            onChange={() => toggleSelectedDoc(document.id)}
                          />
                        ) : null}
                        <h3 className="font-bold" style={{ color: 'var(--ink)' }}>{document.label}</h3>
                      </div>
                      <p className="text-xs" style={{ color: 'var(--muted)' }}>
                        {document.required ? 'Required document' : 'Supplemental document'} | {formatDate(document.uploadedAt)}
                      </p>
                    </div>
                    <DocumentStatusBadge status={document.reviewStatus} />
                  </div>

                  {document.fileUrl ? (
                    <div className="mt-3 overflow-hidden rounded-2xl border bg-[color:var(--accent-soft)]" style={{ borderColor: 'var(--stroke)' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={document.fileUrl}
                        alt={document.label}
                        className="h-[220px] w-full object-contain"
                      />
                    </div>
                  ) : (
                    <EmptyState text="No preview available for this document yet." />
                  )}

                  <div className="mt-3 flex flex-wrap gap-2">
                    {document.fileUrl ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setPreviewUrl(document.fileUrl || null)}
                          className="admin-action-button rounded-lg px-3 py-2 text-sm font-semibold"
                          data-variant="outline"
                        >
                          Zoom / Fullscreen
                        </button>
                        <a
                          href={document.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="admin-action-button rounded-lg px-3 py-2 text-sm font-semibold"
                          data-variant="outline"
                        >
                          Open Original
                        </a>
                      </>
                    ) : null}
                  </div>

                  {profile.status === 'pending' && document.present ? (
                    <>
                      <textarea
                        value={docNotes[document.id] || ''}
                        onChange={(e) => setDocNotes((current) => ({ ...current, [document.id]: e.target.value }))}
                        rows={2}
                        placeholder="Add a short review note, especially if you need to flag an issue."
                        className="surface-input mt-3 w-full rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[color:var(--accent)]/30"
                      />
                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleDocumentReview(document.id, 'approved')}
                          disabled={busyDocId === document.id}
                          className="admin-action-button flex-1 rounded-xl py-2.5 text-sm font-semibold"
                          data-variant="success"
                        >
                          {busyDocId === document.id ? 'Saving...' : 'Mark Approved'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDocumentReview(document.id, 'rejected')}
                          disabled={busyDocId === document.id}
                          className="admin-action-button flex-1 rounded-xl py-2.5 text-sm font-semibold"
                          data-variant="danger"
                        >
                          {busyDocId === document.id ? 'Saving...' : 'Flag Issue'}
                        </button>
                      </div>
                    </>
                  ) : null}
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Verification Actions">
            <div className="space-y-4">
              {!isSuperadmin ? (
                <p className="admin-tone-surface admin-tone-body rounded-xl px-4 py-3 text-sm" data-tone="warning">
                  Admins own the document-verification step. Once every required document is approved, use one approval action to mark the member verified and refer the case to the superadmin for Digital ID generation.
                </p>
              ) : (
                <p className="admin-tone-surface admin-tone-body rounded-xl px-4 py-3 text-sm" data-tone="info">
                  Superadmin work now starts after admin verification is complete. Review the handoff context here, then use the Digital IDs workspace to generate and issue the final card.
                </p>
              )}

              {profile.missingDocuments.length > 0 ? (
                <p className="admin-tone-surface admin-tone-body rounded-xl px-4 py-3 text-sm" data-tone="danger">
                  Missing required documents: {profile.missingDocuments.map((document) => document.label).join(', ')}
                </p>
              ) : null}

              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--muted)' }}>
                  Resubmission Message
                </label>
                <textarea
                  value={resubmissionMessage}
                  onChange={(e) => setResubmissionMessage(e.target.value)}
                  rows={3}
                  placeholder="Tell the youth member what to re-upload and why."
                  className="surface-input w-full rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[color:var(--accent)]/30"
                />
                <p className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>
                  {resubmissionTargetIds.length > 0 && selectedDocs.length === 0
                    ? 'Flagged documents are automatically included in the resubmission request.'
                    : 'Select the documents above that need to be re-uploaded.'}
                </p>
              </div>

              <button
                type="button"
                onClick={handleRequestResubmission}
                disabled={isRequestingResubmission || resubmissionTargetIds.length === 0 || !resubmissionMessage.trim()}
                className="admin-action-button w-full rounded-xl py-2.5 font-semibold"
                data-variant="outline"
              >
                {isRequestingResubmission ? 'Sending request...' : 'Request Resubmission'}
              </button>

              {canForwardToSuperadmin ? (
                <div className="admin-card p-4">
                  <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                    {isVerificationAlreadyComplete
                      ? 'Refer to Superadmin for Digital ID Generation'
                      : 'Approve Verification and Refer to Superadmin'}
                  </p>
                  <p className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>
                    {isVerificationAlreadyComplete
                      ? 'All required documents are approved. Forward this verified member into the superadmin Digital ID generation queue.'
                      : 'This single action completes verification, records the admin approval, and sends the member into the superadmin Digital ID generation queue.'}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={isVerificationAlreadyComplete ? handleReferToSuperadmin : handleApproveAndRefer}
                      disabled={isVerificationAlreadyComplete ? isReferringToSuperadmin : !canForwardToSuperadmin || isApproving}
                      className="admin-action-button flex-1 rounded-xl py-2.5 text-sm font-semibold"
                      data-variant="primary"
                    >
                      {isVerificationAlreadyComplete
                        ? isReferringToSuperadmin
                          ? 'Sending referral...'
                          : 'Refer to Superadmin'
                        : isApproving
                          ? 'Approving and referring...'
                          : 'Approve Verification and Refer to Superadmin'}
                    </button>
                  </div>
                </div>
              ) : null}

              {!isSuperadmin && isPendingSuperadminGeneration ? (
                <div className="admin-card p-4">
                  <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                    Superadmin Queue Reminder
                  </p>
                  <p className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>
                    The member is already waiting in the superadmin Digital ID generation queue. You can resend the reminder if needed.
                  </p>
                  <div className="admin-tone-surface admin-tone-body mt-3 grid gap-2 rounded-2xl p-4 text-sm" data-tone="info">
                    <DetailRowCompact
                      label="Approved by Admin"
                      value={profile.verificationDocumentsApprovedBy || 'Not recorded'}
                    />
                    <DetailRowCompact
                      label="Approved On"
                      value={formatDateTime(profile.verificationDocumentsApprovedAt || undefined)}
                    />
                    <DetailRowCompact
                      label="Referred by Admin"
                      value={profile.verificationReferredToSuperadminBy || 'Not recorded'}
                    />
                    <DetailRowCompact
                      label="Referred On"
                      value={formatDateTime(profile.verificationReferredToSuperadminAt || profile.digitalIdApprovalRequestedAt || undefined)}
                    />
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={handleReferToSuperadmin}
                      disabled={isReferringToSuperadmin}
                      className="admin-action-button flex-1 rounded-xl py-2.5 text-sm font-semibold"
                      data-variant="neutral"
                    >
                      {isReferringToSuperadmin ? 'Sending reminder...' : 'Send Reminder to Superadmin'}
                    </button>
                  </div>
                </div>
              ) : null}

              {isSuperadmin && isPendingSuperadminGeneration ? (
                <div className="admin-card p-4">
                  <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                    Ready for Superadmin ID Generation
                  </p>
                  <p className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>
                    Admin verification is complete. Open the Digital IDs workspace to generate and issue the card that will appear in the youth app.
                  </p>
                  <div className="admin-tone-surface admin-tone-body mt-3 grid gap-2 rounded-2xl p-4 text-sm" data-tone="info">
                    <DetailRowCompact
                      label="Approved by Admin"
                      value={profile.verificationDocumentsApprovedBy || 'Not recorded'}
                    />
                    <DetailRowCompact
                      label="Approved On"
                      value={formatDateTime(profile.verificationDocumentsApprovedAt || undefined)}
                    />
                    <DetailRowCompact
                      label="Referred by Admin"
                      value={profile.verificationReferredToSuperadminBy || 'Not recorded'}
                    />
                    <DetailRowCompact
                      label="Referred On"
                      value={formatDateTime(profile.verificationReferredToSuperadminAt || profile.digitalIdApprovalRequestedAt || undefined)}
                    />
                  </div>

                  {!profile.digitalIdEmergencyContactComplete ? (
                    <div className="admin-tone-surface admin-tone-body mt-3 rounded-xl px-3 py-2 text-xs" data-tone="warning">
                      The member still needs a complete emergency contact before you can generate the Digital ID.
                    </div>
                  ) : null}

                  {!profile.digitalIdSignatureComplete ? (
                    <div className="admin-tone-surface admin-tone-body mt-3 rounded-xl px-3 py-2 text-xs" data-tone="info">
                      The member still needs a saved Digital ID signature before you can generate the Digital ID.
                    </div>
                  ) : null}

                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={openDigitalIdWorkspace}
                      className="admin-action-button flex-1 rounded-xl py-2.5 text-sm font-semibold"
                      data-variant="primary"
                    >
                      Open Digital IDs Workspace
                    </button>
                  </div>
                </div>
              ) : null}

              {isSuperadmin ? (
                <div className="admin-tone-surface rounded-2xl p-4" data-tone="danger">
                  <p className="admin-tone-status text-sm font-semibold">Reject Entire Submission</p>
                  <div className="mt-3 space-y-3">
                    <input
                      type="text"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Reason shown to the youth member"
                      className="surface-input w-full rounded-xl px-4 py-2.5 text-sm"
                    />
                    <textarea
                      value={rejectNote}
                      onChange={(e) => setRejectNote(e.target.value)}
                      rows={3}
                      placeholder="Internal or supporting note"
                      className="surface-input w-full rounded-xl px-4 py-2.5 text-sm"
                    />
                    <button
                      type="button"
                      onClick={handleReject}
                      disabled={isRejecting || !rejectReason.trim()}
                      className="admin-action-button w-full rounded-xl py-2.5 text-sm font-semibold"
                      data-variant="danger"
                    >
                      {isRejecting ? 'Rejecting...' : 'Reject Submission'}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </Panel>
        </div>
      </div>

      {previewUrl ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6"
          onClick={() => setPreviewUrl(null)}
        >
          <div className="relative max-h-full max-w-6xl" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setPreviewUrl(null)}
              className="absolute right-0 top-0 z-10 rounded-full bg-white/90 px-3 py-2 text-sm font-semibold"
              style={{ color: 'var(--accent-strong)' }}
            >
              Close
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl} alt="Document preview" className="max-h-[85vh] rounded-2xl object-contain" />
          </div>
        </div>
      ) : null}
      </div>
    </>
  )
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="admin-panel p-5">
      <h2 className="text-lg font-black" style={{ color: 'var(--ink)' }}>{title}</h2>
      <div className="mt-4">{children}</div>
    </div>
  )
}

function ProfileField({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--stroke)', background: 'var(--accent-soft)' }}>
      <p className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--muted)' }}>{label}</p>
      <p className="mt-2 text-sm font-semibold" style={{ color: 'var(--ink)' }}>{value || '-'}</p>
    </div>
  )
}

function SummaryMini({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-[color:var(--accent-soft)] px-4 py-3 text-center">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--muted)' }}>{label}</p>
      <p className="mt-2 text-2xl font-black" style={{ color: 'var(--ink)' }}>{value.toLocaleString()}</p>
    </div>
  )
}

function QueueStatusBadge({ status }: { status: string }) {
  return (
    <span
      data-tone={getQueueTone(status)}
      className="admin-status-pill rounded-full px-2.5 py-1 text-xs font-semibold"
    >
      {prettifyStatusLabel(status)}
    </span>
  )
}

function DocumentStatusBadge({ status }: { status: string }) {
  return (
    <span
      data-tone={getDocumentTone(status)}
      className="admin-status-pill rounded-full px-2 py-1 text-[11px] font-semibold"
    >
      {prettifyDocumentStatus(status)}
    </span>
  )
}

function WorkflowStageCard({
  step,
  title,
  description,
  status,
  tone,
}: {
  step: string
  title: string
  description: string
  status: string
  tone: 'default' | 'warning' | 'info' | 'success'
}) {
  return (
    <div className="admin-tone-surface rounded-2xl p-4" data-tone={tone}>
      <p className="admin-tone-eyebrow text-[11px] font-bold uppercase tracking-[0.16em]">
        Step {step}
      </p>
      <h3 className="admin-tone-title mt-2 text-sm font-black">{title}</h3>
      <p className="admin-tone-body mt-1 text-xs leading-5">{description}</p>
      <p className="admin-tone-status mt-3 text-sm font-semibold">{status}</p>
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed px-4 py-10 text-center text-sm" style={{ borderColor: 'var(--stroke)', color: 'var(--muted)' }}>
      {text}
    </div>
  )
}

function formatDate(value?: string) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })
}

function formatDateTime(value?: string) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatBool(value?: boolean | string) {
  if (value === true || value === 'Yes') return 'Yes'
  if (value === false || value === 'No') return 'No'
  return '-'
}

function prettifyStatusLabel(value: string) {
  if (value === 'pending_superadmin_id_generation') return 'Pending Superadmin ID Generation'
  if (value === 'in_review') return 'Documents In Review'
  if (value === 'pending') return 'Awaiting Document Review'
  if (value === 'resubmission_requested') return 'Resubmission Requested'
  return value.split('_').join(' ').replace(/\b\w/g, (char) => char.toUpperCase())
}

function prettifyDocumentStatus(value: string) {
  if (value === 'rejected') return 'Flagged'
  if (value === 'pending') return 'Needs Review'
  return prettifyStatusLabel(value)
}

function DetailRowCompact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-xs font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--muted)' }}>
        {label}
      </span>
      <span className="text-right text-sm" style={{ color: 'var(--accent-strong)' }}>
        {value}
      </span>
    </div>
  )
}

function applyDocumentReviewUpdate(
  profile: VerificationProfile,
  documentId: string,
  action: 'approved' | 'rejected',
  note: string
): VerificationProfile {
  const updateDocument = (document: ReviewDocument) =>
    document.id === documentId
      ? {
          ...document,
          reviewStatus: action,
          reviewNote: note || null,
        }
      : document

  const requiredDocuments = profile.requiredDocuments.map(updateDocument)
  const supplementalDocuments = profile.supplementalDocuments.map(updateDocument)
  const documents = profile.documents.map(updateDocument)
  const allDocuments = [...requiredDocuments, ...supplementalDocuments]
  const nextStatus = action === 'rejected' ? 'pending' : profile.status

  return {
    ...profile,
    status: nextStatus,
    digitalIdStatus: action === 'rejected' ? 'draft' : profile.digitalIdStatus,
    verificationDocumentsApprovedAt: action === 'rejected' ? null : profile.verificationDocumentsApprovedAt,
    verificationDocumentsApprovedBy: action === 'rejected' ? null : profile.verificationDocumentsApprovedBy,
    verificationReferredToSuperadminAt: action === 'rejected' ? null : profile.verificationReferredToSuperadminAt,
    verificationReferredToSuperadminBy: action === 'rejected' ? null : profile.verificationReferredToSuperadminBy,
    digitalIdApprovalRequestedAt: action === 'rejected' ? null : profile.digitalIdApprovalRequestedAt,
    digitalIdApprovalRequestedBy: action === 'rejected' ? null : profile.digitalIdApprovalRequestedBy,
    verificationRejectReason: action === 'rejected' ? null : profile.verificationRejectReason,
    verificationRejectNote: action === 'rejected' ? null : profile.verificationRejectNote,
    requiredDocuments,
    supplementalDocuments,
    documents,
    missingDocuments: requiredDocuments.filter((document) => !document.present),
    queueStatus: computeLocalQueueStatus(nextStatus, allDocuments),
  }
}

function applyResubmissionRequestUpdate(
  profile: VerificationProfile,
  documentIds: string[],
  message: string
): VerificationProfile {
  const ids = new Set(documentIds)
  const updateDocument = (document: ReviewDocument) =>
    ids.has(document.id)
      ? {
          ...document,
          reviewStatus: 'resubmission_requested',
          reviewNote: message,
        }
      : document

  const requiredDocuments = profile.requiredDocuments.map(updateDocument)
  const supplementalDocuments = profile.supplementalDocuments.map(updateDocument)
  const documents = profile.documents.map(updateDocument)

  return {
    ...profile,
    status: 'pending',
    queueStatus: 'resubmission_requested',
    digitalIdStatus: 'draft',
    verificationResubmissionMessage: message,
    verificationDocumentsApprovedAt: null,
    verificationDocumentsApprovedBy: null,
    verificationReferredToSuperadminAt: null,
    verificationReferredToSuperadminBy: null,
    digitalIdApprovalRequestedAt: null,
    digitalIdApprovalRequestedBy: null,
    verificationRejectReason: null,
    verificationRejectNote: null,
    requiredDocuments,
    supplementalDocuments,
    documents,
    missingDocuments: requiredDocuments.filter((document) => !document.present),
  }
}

function computeLocalQueueStatus(
  status: VerificationProfile['status'],
  documents: ReviewDocument[]
) {
  if (status === 'rejected') return 'rejected'
  if (documents.some((document) => document.reviewStatus === 'resubmission_requested')) {
    return 'resubmission_requested'
  }
  if (
    documents.some((document) =>
      ['approved', 'rejected'].includes(document.reviewStatus)
    )
  ) {
    return 'in_review'
  }
  return 'pending'
}

function getQueueTone(status: string) {
  if (status === 'pending' || status === 'in_review') return 'warning'
  if (status === 'pending_superadmin_id_generation') return 'info'
  if (status === 'resubmission_requested' || status === 'rejected') return 'danger'
  if (status === 'verified') return 'success'
  return 'neutral'
}

function getDocumentTone(status: string) {
  if (status === 'approved') return 'success'
  if (status === 'rejected' || status === 'resubmission_requested') return 'danger'
  if (status === 'pending') return 'warning'
  return 'neutral'
}
