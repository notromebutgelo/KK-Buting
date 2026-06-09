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
  reviewRequestedAt?: string | null
  reviewedBy?: string | null
  reviewedAt?: string | null
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
  currentAddressHouseBlockUnitNumber?: string | null
  currentAddressStreetAddress?: string | null
  purok?: string
  yearsInBarangay?: string | number | null
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
  verificationAdminReviewMessage?: string | null
  verificationAdminReviewDocumentIds?: string[]
  verificationAdminReviewRequestedAt?: string | null
  verificationAdminReviewRequestedBy?: string | null
  digitalIdEmergencyContactComplete?: boolean
  digitalIdSignatureComplete?: boolean
  digitalIdEmergencyContactName?: string | null
  digitalIdEmergencyContactRelationship?: string | null
  digitalIdEmergencyContactPhone?: string | null
  idNumber?: string | null
  digitalIdGeneratedAt?: string | null
  digitalIdGeneratedBy?: string | null
  digitalIdApprovedAt?: string | null
  digitalIdApprovedBy?: string | null
  idPhotoUrl?: string | null
  documents: ReviewDocument[]
  requiredDocuments: ReviewDocument[]
  supplementalDocuments: ReviewDocument[]
  missingDocuments: ReviewDocument[]
}

type ReviewTabKey = 'profile' | 'documents' | 'history' | 'digital_id'

const reviewTabs: Array<{ key: ReviewTabKey; label: string; description: string }> = [
  { key: 'profile', label: 'Profile Information', description: 'Personal, KK, contact, and emergency details' },
  { key: 'documents', label: 'Document Review', description: 'Uploads, checklist, remarks, approve, and reject' },
  { key: 'history', label: 'Verification History', description: 'Submission, review, and status change audit' },
  { key: 'digital_id', label: 'Digital ID', description: 'Preview handoff, generation status, and download path' },
]

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
  const [activeTab, setActiveTab] = useState<ReviewTabKey>('profile')

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
      const nextProfile = profileRes.data.profile || profileRes.data
      const nextRole =
        meRes.data?.role || window.localStorage.getItem('kk-admin-role') || 'admin'
      setProfile(nextProfile)
      setAdminRole(nextRole)
      if (
        nextRole === 'admin' &&
        nextProfile.queueStatus === 'admin_reverification_requested'
      ) {
        setSelectedDocs(nextProfile.verificationAdminReviewDocumentIds || [])
      }
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

  useEffect(() => {
    const tab = new URLSearchParams(window.location.search).get('tab')
    if (isReviewTabKey(tab)) {
      setActiveTab(tab)
    }
  }, [])

  const groupedDocuments = useMemo(() => {
    if (!profile) return []
    return [...profile.requiredDocuments, ...profile.supplementalDocuments]
  }, [profile])
  const documentsNeedingAction = useMemo(() => {
    if (!profile) return []
    return profile.requiredDocuments.filter((document) =>
      !document.present ||
      ['missing', 'pending', 'rejected', 'resubmission_requested'].includes(
        String(document.reviewStatus || '')
      )
    )
  }, [profile])

  const allRequiredDocumentsApproved =
    (profile?.missingDocuments?.length || 0) === 0 &&
    Boolean(profile?.requiredDocuments.length) &&
    profile?.requiredDocuments?.every((document) => document.reviewStatus === 'approved')
  const flaggedDocumentIds = groupedDocuments
    .filter((document) => ['rejected', 'resubmission_requested'].includes(document.reviewStatus))
    .map((document) => document.id)
  const defaultResubmissionTargetIds = isSuperadmin
    ? groupedDocuments.filter((document) => document.present).map((document) => document.id)
    : flaggedDocumentIds
  const resubmissionTargetIds =
    selectedDocs.length > 0 ? selectedDocs : defaultResubmissionTargetIds
  const isPendingSuperadminGeneration = profile?.queueStatus === 'pending_superadmin_id_generation'
  const canForwardToSuperadmin =
    Boolean(allRequiredDocumentsApproved) &&
    !isPendingSuperadminGeneration &&
    profile?.queueStatus !== 'admin_reverification_requested' &&
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
    setLoadingTitle('Approving verification and marking ready for Digital ID')
    setIsApproving(true)
    setMessage('')
    try {
      await api.patch(`/admin/verification/${userId}/approve`)
      await loadProfile()
      setMessage('Verification approved. The member is now ready for Digital ID generation.')
    } catch (error: any) {
      setMessage(error?.response?.data?.error || 'Failed to approve this submission.')
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
      if (isSuperadmin) {
        await loadProfile({ silent: true })
      } else {
        setProfile((current) =>
          current
            ? applyResubmissionRequestUpdate(current, resubmissionTargetIds, resubmissionMessage)
            : current
        )
      }
      setSelectedDocs([])
      setResubmissionMessage('')
      setMessage(
        isSuperadmin
          ? 'Re-verification request sent to the admin. The youth member was not notified.'
          : 'Resubmission request sent to the youth member.'
      )
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
              <QueueStatusBadge status={profile.queueStatus} digitalIdStatus={profile.digitalIdStatus} />
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
          description="Admins make document decisions. Superadmins can select documents and return the case for admin re-verification."
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
          title="Ready for ID Generation"
          description="Admin or superadmin approval completes document verification and moves the member into the Digital ID generation queue."
          status={
            isPendingSuperadminGeneration
              ? `Ready after approval by ${profile.verificationDocumentsApprovedBy || 'reviewer'}`
              : canForwardToSuperadmin
                ? 'Ready for reviewer approval'
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
                ? 'Ready for superadmin generation'
                : 'Not yet issued'
          }
          tone={profile.digitalIdStatus === 'active' ? 'success' : isPendingSuperadminGeneration ? 'info' : 'default'}
        />
      </div>

      <div className="admin-panel p-2">
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          {reviewTabs.map((tab) => {
            const active = activeTab === tab.key
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className="rounded-2xl border px-4 py-3 text-left transition"
                style={{
                  borderColor: active ? '#3d7cff' : 'var(--stroke)',
                  background: active ? 'var(--accent-soft)' : 'var(--card-solid)',
                }}
              >
                <span className="block text-sm font-black" style={{ color: active ? 'var(--accent-strong)' : 'var(--ink)' }}>
                  {tab.label}
                </span>
                <span className="mt-1 block text-xs leading-5" style={{ color: 'var(--muted)' }}>
                  {tab.description}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {activeTab === 'profile' ? (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <Panel title="Personal Information">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <ProfileField label="Full Name" value={profile.fullName} />
              <ProfileField label="Birthday" value={formatDate(profile.birthday)} />
              <ProfileField label="Age / Age Group" value={`${profile.age || '-'} / ${profile.youthAgeGroup || '-'}`} />
              <ProfileField label="Gender" value={profile.gender} />
              <ProfileField label="Civil Status" value={profile.civilStatus} />
              <ProfileField label="Status" value={prettifyStatusLabel(profile.queueStatus, profile.digitalIdStatus)} />
            </div>
          </Panel>

          <Panel title="KK Profiling Data">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <ProfileField label="Education" value={profile.educationalBackground} />
              <ProfileField label="Classification" value={profile.youthClassification} />
              <ProfileField label="Work Status" value={profile.workStatus} />
              <ProfileField label="SK Voter" value={formatBool(profile.registeredSkVoter)} />
              <ProfileField label="Voted Last SK Election" value={formatBool(profile.votedLastSkElections)} />
              <ProfileField label="National Voter" value={formatBool(profile.registeredNationalVoter)} />
              <ProfileField label="Attended KK Assembly" value={formatBool(profile.attendedKkAssembly)} />
              <ProfileField label="KK Assembly Times" value={profile.kkAssemblyTimesAttended} />
            </div>
          </Panel>

          <Panel title="Contact Details">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <ProfileField label="Email" value={profile.email} />
              <ProfileField label="Contact Number" value={profile.contactNumber} />
              <ProfileField label="House / Block / Unit No." value={profile.currentAddressHouseBlockUnitNumber} />
              <ProfileField label="Street Address" value={profile.currentAddressStreetAddress} />
              <ProfileField label="Purok" value={profile.purok} />
              <ProfileField label="Barangay" value={profile.barangay} />
              <ProfileField label="City" value={profile.city} />
              <ProfileField label="Province" value={profile.province} />
              <ProfileField label="Years in Barangay" value={profile.yearsInBarangay} />
            </div>
          </Panel>

          <Panel title="Emergency Contact">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <ProfileField label="Contact Name" value={profile.digitalIdEmergencyContactName} />
              <ProfileField label="Relationship" value={profile.digitalIdEmergencyContactRelationship} />
              <ProfileField label="Phone Number" value={profile.digitalIdEmergencyContactPhone} />
              <ProfileField label="Digital ID Ready" value={profile.digitalIdEmergencyContactComplete ? 'Emergency contact complete' : 'Emergency contact incomplete'} />
            </div>
          </Panel>
        </div>
      ) : null}

      {activeTab === 'documents' ? (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.25fr_0.85fr]">
          <Panel title="Submitted Documents">
            <div className="space-y-4">
              {groupedDocuments.length === 0 ? (
                <EmptyState text="No submitted documents are available yet." />
              ) : (
                groupedDocuments.map((document) => (
                  <div key={document.id} className="admin-card p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          {(profile.status === 'pending' || isSuperadmin) && document.present ? (
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
                        {document.reviewNote ? (
                          <p className="mt-2 rounded-xl border px-3 py-2 text-xs leading-5" style={{ borderColor: '#f3d4d4', background: '#fff4f4', color: '#9e4040' }}>
                            Reviewer note: {document.reviewNote}
                          </p>
                        ) : null}
                      </div>
                      <DocumentStatusBadge status={document.reviewStatus} />
                    </div>

                    {document.fileUrl ? (
                      <div className="mt-3 overflow-hidden rounded-2xl border bg-[color:var(--accent-soft)]" style={{ borderColor: 'var(--stroke)' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={document.fileUrl}
                          alt={document.label}
                          className="h-[260px] w-full object-contain"
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

                    {!isSuperadmin && profile.status === 'pending' && document.present ? (
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
                ))
              )}
            </div>
          </Panel>

          <Panel title="Approval Checklist and Remarks">
            <div className="space-y-4">
              <p className="admin-tone-surface admin-tone-body rounded-xl px-4 py-3 text-sm" data-tone="info">
                {isSuperadmin
                  ? 'Select the documents that need another look, then send your message to the admin. The admin owns the final rejection note sent to the youth member.'
                  : 'Admins review documents, add member-facing notes, and decide whether to approve, reject, or request resubmission.'}
              </p>

              {profile.missingDocuments.length > 0 ? (
                <p className="admin-tone-surface admin-tone-body rounded-xl px-4 py-3 text-sm" data-tone="danger">
                  Missing required documents: {profile.missingDocuments.map((document) => document.label).join(', ')}
                </p>
              ) : null}

              <div className="space-y-3">
                {profile.requiredDocuments.map((document) => (
                  <div key={document.documentType} className="flex items-center justify-between gap-3 rounded-2xl border px-4 py-3" style={{ borderColor: 'var(--stroke)', background: 'var(--accent-soft)' }}>
                    <div>
                      <p className="font-semibold" style={{ color: 'var(--ink)' }}>{document.label}</p>
                      <p className="text-xs" style={{ color: 'var(--muted)' }}>
                        {document.present ? `Uploaded ${formatDate(document.uploadedAt)}` : 'Not uploaded yet'}
                      </p>
                      {document.reviewNote ? (
                        <p className="mt-2 text-xs leading-5" style={{ color: '#9e4040' }}>
                          {document.reviewNote}
                        </p>
                      ) : null}
                    </div>
                    <DocumentStatusBadge status={document.reviewStatus} />
                  </div>
                ))}
              </div>

              {profile.verificationAdminReviewMessage ? (
                <div className="admin-tone-surface rounded-2xl p-4" data-tone="warning">
                  <p className="admin-tone-status text-sm font-semibold">
                    Superadmin Re-verification Message
                  </p>
                  <p className="admin-tone-body mt-2 text-sm leading-6">
                    {profile.verificationAdminReviewMessage}
                  </p>
                  <p className="admin-tone-body mt-2 text-xs">
                    Sent by {profile.verificationAdminReviewRequestedBy || 'superadmin'}
                    {profile.verificationAdminReviewRequestedAt
                      ? ` on ${formatDateTime(profile.verificationAdminReviewRequestedAt)}`
                      : ''}
                  </p>
                  {profile.verificationAdminReviewDocumentIds?.length ? (
                    <p className="admin-tone-body mt-2 text-xs font-semibold">
                      Documents for admin review:{' '}
                      {groupedDocuments
                        .filter((document) =>
                          profile.verificationAdminReviewDocumentIds?.includes(document.id)
                        )
                        .map((document) => document.label)
                        .join(', ') || 'Selected verification documents'}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {documentsNeedingAction.length > 0 ? (
                <div className="admin-tone-surface rounded-2xl p-4" data-tone="warning">
                  <p className="admin-tone-status text-sm font-semibold">
                    Documents needing attention or replacement
                  </p>
                  <div className="mt-3 space-y-2">
                    {documentsNeedingAction.map((document) => (
                      <div key={document.documentType} className="rounded-xl bg-white/70 px-3 py-3 text-sm">
                        <div className="flex items-start justify-between gap-3">
                          <span className="font-semibold" style={{ color: 'var(--ink)' }}>{document.label}</span>
                          <DocumentStatusBadge status={document.reviewStatus} />
                        </div>
                        {document.reviewNote ? (
                          <p className="mt-2 text-xs leading-5" style={{ color: '#9e4040' }}>
                            {document.reviewNote}
                          </p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--muted)' }}>
                  {isSuperadmin ? 'Message to Admin' : 'Resubmission Message'}
                </label>
                <textarea
                  value={resubmissionMessage}
                  onChange={(e) => setResubmissionMessage(e.target.value)}
                  rows={3}
                  placeholder={
                    isSuperadmin
                      ? 'Explain what the admin should verify again before deciding the member outcome.'
                      : 'Tell the youth member what to re-upload and why.'
                  }
                  className="surface-input w-full rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[color:var(--accent)]/30"
                />
                <p className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>
                  {isSuperadmin
                    ? 'This is sent only to admins. The admin will write the final note shown to the youth member.'
                    : resubmissionTargetIds.length > 0 && selectedDocs.length === 0
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
                {isRequestingResubmission
                  ? 'Sending request...'
                  : isSuperadmin
                    ? 'Send to Admin for Re-verification'
                    : 'Request Resubmission'}
              </button>

              {canForwardToSuperadmin ? (
                <div className="admin-card p-4">
                  <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                    {isVerificationAlreadyComplete
                      ? 'Refer for Digital ID Generation'
                      : 'Approve Verification and Mark Ready for Digital ID'}
                  </p>
                  <p className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>
                    {isVerificationAlreadyComplete
                      ? 'All required documents are approved. Move this verified member into the Digital ID generation queue.'
                      : 'This action records the reviewer approval and moves the member into the Digital ID generation queue.'}
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
                          : 'Refer to Digital ID Queue'
                        : isApproving
                          ? 'Approving...'
                          : 'Approve and Mark Ready'}
                    </button>
                  </div>
                </div>
              ) : null}

              {!isSuperadmin &&
              profile.digitalIdStatus !== 'active' &&
              profile.queueStatus !== 'rejected' ? (
                <div className="admin-tone-surface rounded-2xl p-4" data-tone="danger">
                  <p className="admin-tone-status text-sm font-semibold">Reject Verification Request</p>
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
                      placeholder="Additional details shown to the youth member"
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
      ) : null}

      {activeTab === 'history' ? (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <Panel title="Verification History">
            <div className="admin-tone-surface admin-tone-body grid gap-3 rounded-2xl p-4 text-sm" data-tone="info">
              <DetailRowCompact label="Current Status" value={prettifyStatusLabel(profile.queueStatus, profile.digitalIdStatus)} />
              <DetailRowCompact label="Submitted" value={formatDateTime(profile.submittedAt)} />
              <DetailRowCompact label="Reviewed By" value={profile.verificationDocumentsApprovedBy || 'Not recorded'} />
              <DetailRowCompact label="Reviewed On" value={formatDateTime(profile.verificationDocumentsApprovedAt || undefined)} />
              <DetailRowCompact label="Referred By" value={profile.verificationReferredToSuperadminBy || 'Not recorded'} />
              <DetailRowCompact label="Referred On" value={formatDateTime(profile.verificationReferredToSuperadminAt || profile.digitalIdApprovalRequestedAt || undefined)} />
            </div>

            {profile.verificationRejectReason || profile.verificationRejectNote ? (
              <div className="admin-tone-surface admin-tone-body mt-4 rounded-2xl p-4 text-sm" data-tone="danger">
                <p className="admin-tone-status font-semibold">Rejection Notes</p>
                <p className="mt-2">{profile.verificationRejectReason || 'No public reason recorded.'}</p>
                <p className="mt-1">{profile.verificationRejectNote || 'No internal note recorded.'}</p>
              </div>
            ) : null}

            {profile.verificationResubmissionMessage ? (
              <div className="admin-tone-surface admin-tone-body mt-4 rounded-2xl p-4 text-sm" data-tone="warning">
                <p className="admin-tone-status font-semibold">Latest Resubmission Message</p>
                <p className="mt-2">{profile.verificationResubmissionMessage}</p>
              </div>
            ) : null}

            {profile.verificationAdminReviewMessage ? (
              <div className="admin-tone-surface admin-tone-body mt-4 rounded-2xl p-4 text-sm" data-tone="warning">
                <p className="admin-tone-status font-semibold">Superadmin Message to Admin</p>
                <p className="mt-2">{profile.verificationAdminReviewMessage}</p>
                <p className="mt-2 text-xs">
                  {profile.verificationAdminReviewRequestedBy || 'Superadmin'} |{' '}
                  {formatDateTime(profile.verificationAdminReviewRequestedAt || undefined)}
                </p>
              </div>
            ) : null}
          </Panel>

          <Panel title="Approval Logs">
            <div className="space-y-3">
              {groupedDocuments.map((document) => (
                <div key={document.id} className="rounded-2xl border p-4" style={{ borderColor: 'var(--stroke)', background: 'var(--accent-soft)' }}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold" style={{ color: 'var(--ink)' }}>{document.label}</p>
                      <p className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>
                        Reviewed by {document.reviewedBy || 'Not recorded'} | {formatDateTime(document.reviewedAt || undefined)}
                      </p>
                    </div>
                    <DocumentStatusBadge status={document.reviewStatus} />
                  </div>
                  {document.reviewNote ? (
                    <p className="mt-3 text-sm leading-6" style={{ color: 'var(--muted)' }}>{document.reviewNote}</p>
                  ) : null}
                </div>
              ))}
            </div>
          </Panel>
        </div>
      ) : null}

      {activeTab === 'digital_id' ? (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_0.95fr]">
          <Panel title="Digital ID Preview and Handoff">
            <div className="space-y-4">
              <div className="admin-tone-surface admin-tone-body rounded-2xl p-4 text-sm" data-tone={profile.digitalIdStatus === 'active' ? 'success' : isPendingSuperadminGeneration ? 'info' : 'warning'}>
                <p className="admin-tone-status font-semibold">{prettifyStatusLabel(profile.queueStatus, profile.digitalIdStatus)}</p>
                <p className="mt-2">
                  {profile.digitalIdStatus === 'active'
                    ? 'The Digital ID has been generated and issued.'
                    : isPendingSuperadminGeneration
                      ? 'This member is ready for the superadmin to generate the Digital ID.'
                      : 'Complete document approval before Digital ID generation.'}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <ProfileField label="KK ID Number" value={profile.idNumber} />
                <ProfileField label="Digital ID Status" value={prettifyStatusLabel(profile.digitalIdStatus || 'draft')} />
                <ProfileField label="Emergency Contact" value={profile.digitalIdEmergencyContactComplete ? 'Complete' : 'Incomplete'} />
                <ProfileField label="Signature" value={profile.digitalIdSignatureComplete ? 'Complete' : 'Missing'} />
              </div>

              {isSuperadmin && isPendingSuperadminGeneration ? (
                <button
                  type="button"
                  onClick={openDigitalIdWorkspace}
                  className="admin-action-button w-full rounded-xl py-2.5 text-sm font-semibold"
                  data-variant="primary"
                >
                  Generate Digital ID
                </button>
              ) : (
                <button
                  type="button"
                  onClick={openDigitalIdWorkspace}
                  className="admin-action-button w-full rounded-xl py-2.5 text-sm font-semibold"
                  data-variant="outline"
                >
                  Open Digital IDs Workspace
                </button>
              )}
            </div>
          </Panel>

          <Panel title="Generation History">
            <div className="admin-tone-surface admin-tone-body grid gap-3 rounded-2xl p-4 text-sm" data-tone="info">
              <DetailRowCompact label="Requested By" value={profile.digitalIdApprovalRequestedBy || 'Not recorded'} />
              <DetailRowCompact label="Requested On" value={formatDateTime(profile.digitalIdApprovalRequestedAt || undefined)} />
              <DetailRowCompact label="Generated By" value={profile.digitalIdGeneratedBy || 'Not recorded'} />
              <DetailRowCompact label="Generated On" value={formatDateTime(profile.digitalIdGeneratedAt || undefined)} />
              <DetailRowCompact label="Approved By" value={profile.digitalIdApprovedBy || 'Not recorded'} />
              <DetailRowCompact label="Approved On" value={formatDateTime(profile.digitalIdApprovedAt || undefined)} />
            </div>
          </Panel>
        </div>
      ) : null}

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
      <p className="mt-2 text-sm font-semibold" style={{ color: 'var(--ink)' }}>{formatProfileFieldValue(value)}</p>
    </div>
  )
}

function formatProfileFieldValue(value?: string | number | null) {
  return value === null || typeof value === 'undefined' || value === '' ? '-' : String(value)
}

function SummaryMini({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-[color:var(--accent-soft)] px-4 py-3 text-center">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--muted)' }}>{label}</p>
      <p className="mt-2 text-2xl font-black" style={{ color: 'var(--ink)' }}>{value.toLocaleString()}</p>
    </div>
  )
}

function QueueStatusBadge({
  status,
  digitalIdStatus,
}: {
  status: string
  digitalIdStatus?: string
}) {
  return (
    <span
      data-tone={getQueueTone(status)}
      className="admin-status-pill rounded-full px-2.5 py-1 text-xs font-semibold"
    >
      {prettifyStatusLabel(status, digitalIdStatus)}
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

function prettifyStatusLabel(value: string, digitalIdStatus?: string) {
  if (digitalIdStatus === 'active') return 'Digital ID Generated'
  if (value === 'active') return 'Digital ID Generated'
  if (value === 'pending_approval') return 'Ready for Digital ID Generation'
  if (value === 'draft') return 'Draft'
  if (value === 'pending_superadmin_id_generation') return 'Ready for Digital ID Generation'
  if (value === 'admin_reverification_requested') return 'Admin Re-verification Required'
  if (value === 'in_review') return 'Pending Review'
  if (value === 'pending') return 'Pending Review'
  if (value === 'resubmission_requested') return 'Resubmission Requested'
  if (value === 'verified') return digitalIdStatus ? 'Approved' : 'Digital ID Generated'
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
  if (status === 'admin_reverification_requested') return 'warning'
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

function isReviewTabKey(value: string | null): value is ReviewTabKey {
  return reviewTabs.some((tab) => tab.key === value)
}
