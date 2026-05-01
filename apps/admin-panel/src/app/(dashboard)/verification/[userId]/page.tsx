'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import api from '@/lib/api'
import LoadingModal from '@/components/ui/LoadingModal'
import { cn } from '@/utils/cn'

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
  verificationRejectReason?: string
  verificationRejectNote?: string
  verificationResubmissionMessage?: string
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
  const [busyDocId, setBusyDocId] = useState<string | null>(null)
  const [loadingTitle, setLoadingTitle] = useState('Updating verification')

  const isSuperadmin = adminRole === 'superadmin'

  const loadProfile = async () => {
    setIsLoading(true)
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
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadProfile()
  }, [userId])

  const groupedDocuments = useMemo(() => {
    if (!profile) return []
    return [...profile.requiredDocuments, ...profile.supplementalDocuments]
  }, [profile])

  const canVerify =
    profile?.status === 'pending' &&
    (profile?.missingDocuments?.length || 0) === 0 &&
    profile?.requiredDocuments?.every((document) => document.reviewStatus === 'approved')

  const toggleSelectedDoc = (documentId: string) => {
    setSelectedDocs((current) =>
      current.includes(documentId)
        ? current.filter((id) => id !== documentId)
        : [...current, documentId]
    )
  }

  const handleDocumentReview = async (documentId: string, action: 'approved' | 'rejected') => {
    setLoadingTitle(action === 'approved' ? 'Approving document' : 'Rejecting document')
    setBusyDocId(documentId)
    setMessage('')
    try {
      await api.patch(`/admin/verification/${userId}/documents/${documentId}/review`, {
        action,
        note: docNotes[documentId] || '',
      })
      await loadProfile()
      setMessage(`Document ${action}.`)
    } catch (error: any) {
      setMessage(error?.response?.data?.error || 'Failed to update document review.')
    } finally {
      setBusyDocId(null)
    }
  }

  const handleVerify = async () => {
    setLoadingTitle('Verifying submission')
    setIsApproving(true)
    setMessage('')
    try {
      await api.patch(`/admin/verification/${userId}/approve`)
      await loadProfile()
      setMessage('Submission verified and digital ID unlocked.')
    } catch (error: any) {
      setMessage(error?.response?.data?.error || 'Failed to verify submission.')
    } finally {
      setIsApproving(false)
    }
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
      await api.patch(`/admin/verification/${userId}/request-resubmission`, {
        documentIds: selectedDocs,
        message: resubmissionMessage,
      })
      await loadProfile()
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
        open={Boolean(busyDocId) || isApproving || isRejecting || isRequestingResubmission}
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
                          className="rounded-lg border px-3 py-2 text-sm font-semibold transition-colors hover:bg-[color:var(--accent-soft)]"
                          style={{ borderColor: 'var(--stroke)', color: 'var(--accent-strong)' }}
                        >
                          Zoom / Fullscreen
                        </button>
                        <a
                          href={document.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-lg border px-3 py-2 text-sm font-semibold transition-colors hover:bg-[color:var(--accent-soft)]"
                          style={{ borderColor: 'var(--stroke)', color: 'var(--accent-strong)' }}
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
                        placeholder="Per-document review note"
                        className="surface-input mt-3 w-full rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[color:var(--accent)]/30"
                      />
                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleDocumentReview(document.id, 'approved')}
                          disabled={busyDocId === document.id}
                          className="flex-1 rounded-xl bg-green-600 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                        >
                          {busyDocId === document.id ? 'Saving...' : 'Approve Document'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDocumentReview(document.id, 'rejected')}
                          disabled={busyDocId === document.id}
                          className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                        >
                          {busyDocId === document.id ? 'Saving...' : 'Reject Document'}
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
                <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  Bulk approval is superadmin-only, but you can still review documents and process individual submissions here.
                </p>
              ) : null}

              {profile.missingDocuments.length > 0 ? (
                <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
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
                  Select the documents above that need to be re-uploaded.
                </p>
              </div>

              <button
                type="button"
                onClick={handleRequestResubmission}
                disabled={isRequestingResubmission || selectedDocs.length === 0 || !resubmissionMessage.trim()}
                className="w-full rounded-xl border py-2.5 font-semibold transition-colors hover:bg-[color:var(--accent-soft)] disabled:opacity-60"
                style={{ borderColor: 'var(--stroke)', color: 'var(--accent-strong)' }}
              >
                {isRequestingResubmission ? 'Sending request...' : 'Request Resubmission'}
              </button>

              <div className="admin-card p-4">
                <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>Final Verification</p>
                <p className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>
                  Only verify after every required document is present and approved.
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={handleVerify}
                    disabled={!canVerify || isApproving}
                    className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                    style={{ background: 'var(--accent)' }}
                  >
                    {isApproving ? 'Verifying...' : 'Verify Submission'}
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                <p className="text-sm font-semibold text-red-700">Reject Entire Submission</p>
                <div className="mt-3 space-y-3">
                  <input
                    type="text"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Reason shown to the youth member"
                    className="w-full rounded-xl border border-red-200 px-4 py-2.5 text-sm"
                  />
                  <textarea
                    value={rejectNote}
                    onChange={(e) => setRejectNote(e.target.value)}
                    rows={3}
                    placeholder="Internal or supporting note"
                    className="w-full rounded-xl border border-red-200 px-4 py-2.5 text-sm"
                  />
                  <button
                    type="button"
                    onClick={handleReject}
                    disabled={isRejecting || !rejectReason.trim()}
                    className="w-full rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {isRejecting ? 'Rejecting...' : 'Reject Submission'}
                  </button>
                </div>
              </div>
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
  const className =
    status === 'pending'
      ? 'bg-amber-50 text-amber-700'
      : status === 'in_review'
        ? 'bg-[color:var(--accent-soft)] text-[color:var(--accent-strong)]'
        : status === 'resubmission_requested'
          ? 'bg-red-100 text-red-700'
          : 'bg-[color:var(--surface-muted)] text-[color:var(--muted)]'

  return (
    <span className={cn('inline-flex rounded-full px-2.5 py-1 text-xs font-semibold', className)}>
      {prettify(status)}
    </span>
  )
}

function DocumentStatusBadge({ status }: { status: string }) {
  const className =
    status === 'approved'
      ? 'bg-green-100 text-green-700'
      : status === 'rejected'
        ? 'bg-red-100 text-red-700'
        : status === 'resubmission_requested'
          ? 'bg-red-50 text-red-700'
          : status === 'missing'
            ? 'bg-slate-100 text-slate-600'
            : 'bg-amber-50 text-amber-700'

  return (
    <span className={cn('inline-flex rounded-full px-2 py-1 text-[11px] font-semibold', className)}>
      {prettify(status)}
    </span>
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

function formatBool(value?: boolean | string) {
  if (value === true || value === 'Yes') return 'Yes'
  if (value === false || value === 'No') return 'No'
  return '-'
}

function prettify(value: string) {
  return value.split('_').join(' ').replace(/\b\w/g, (char) => char.toUpperCase())
}
