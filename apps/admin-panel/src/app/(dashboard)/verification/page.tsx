'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  ClipboardList,
  Download,
  Eye,
  FileWarning,
  Filter,
  Mail,
  MapPin,
  RefreshCw,
  Search,
  Shield,
  ShieldCheck,
  X,
} from 'lucide-react'

import api from '@/lib/api'
import { AdminEmptyState, AdminSurface } from '@/components/admin/workspace'

interface QueueDocument {
  id: string
  documentType: string
  label: string
  reviewStatus: string
  present: boolean
}

interface QueueProfile {
  userId: string
  fullName: string
  firstName: string
  lastName: string
  email: string
  contactNumber: string
  city: string
  province: string
  barangay: string
  age: number | null
  youthAgeGroup: string
  status: 'pending' | 'verified' | 'rejected'
  queueStatus:
    | 'pending'
    | 'in_review'
    | 'pending_superadmin_id_generation'
    | 'resubmission_requested'
    | 'verified'
    | 'rejected'
  digitalIdStatus?: string
  submittedAt: string
  verificationDocumentsApprovedAt?: string | null
  verificationDocumentsApprovedBy?: string | null
  verificationReferredToSuperadminAt?: string | null
  verificationReferredToSuperadminBy?: string | null
  idPhotoUrl?: string | null
  requiredDocuments: QueueDocument[]
  missingDocuments: QueueDocument[]
  documentCounts: {
    approved: number
    pending: number
    rejected: number
    resubmissionRequested: number
  }
}

interface QueueSummary {
  total: number
  pending: number
  inReview: number
  pendingSuperadmin: number
  resubmissionRequested: number
  pendingReview?: number
  flaggedBySystem?: number
  requiringAttention?: number
  approvedToday?: number
}

interface QueueResponse {
  profiles: QueueProfile[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
  filters?: {
    ageGroupOptions?: string[]
    documentTypeOptions?: string[]
  }
  summary?: QueueSummary
}

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
  reviewedBy?: string | null
  reviewedAt?: string | null
}

interface VerificationDetailProfile {
  userId: string
  fullName: string
  firstName: string
  lastName: string
  email?: string
  contactNumber?: string
  city?: string
  province?: string
  barangay?: string
  purok?: string
  age?: number
  youthAgeGroup?: string
  status: 'pending' | 'verified' | 'rejected'
  queueStatus: string
  submittedAt?: string
  verificationRejectReason?: string | null
  verificationRejectNote?: string | null
  verificationResubmissionMessage?: string | null
  digitalIdStatus?: string
  digitalIdEmergencyContactComplete?: boolean
  digitalIdSignatureComplete?: boolean
  digitalIdApprovalRequestedAt?: string | null
  digitalIdApprovalRequestedBy?: string | null
  verificationDocumentsApprovedAt?: string | null
  verificationDocumentsApprovedBy?: string | null
  verificationReferredToSuperadminAt?: string | null
  verificationReferredToSuperadminBy?: string | null
  idPhotoUrl?: string | null
  documents: ReviewDocument[]
  requiredDocuments: ReviewDocument[]
  supplementalDocuments: ReviewDocument[]
  missingDocuments: ReviewDocument[]
}

type ReviewActionId =
  | 'open_digital_ids'
  | 'approve_and_refer'
  | 'request_resubmission'
  | 'reject_submission'
  | 'open_full_review'

type ReviewActionOption = {
  id: ReviewActionId
  label: string
  description: string
  tone: 'success' | 'warning' | 'danger' | 'info'
}

const PAGE_SIZE = 8

export default function VerificationPage() {
  const router = useRouter()
  const [profiles, setProfiles] = useState<QueueProfile[]>([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [ageGroup, setAgeGroup] = useState('all')
  const [dateSubmitted, setDateSubmitted] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [isActionLoading, setIsActionLoading] = useState(false)
  const [adminRole, setAdminRole] = useState('admin')
  const [pagination, setPagination] = useState<QueueResponse['pagination']>({
    page: 1,
    pageSize: PAGE_SIZE,
    total: 0,
    totalPages: 1,
  })
  const [summary, setSummary] = useState<QueueSummary>({
    total: 0,
    pending: 0,
    inReview: 0,
    pendingSuperadmin: 0,
    resubmissionRequested: 0,
    pendingReview: 0,
    flaggedBySystem: 0,
    requiringAttention: 0,
    approvedToday: 0,
  })
  const [ageGroupOptions, setAgeGroupOptions] = useState<string[]>([])
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedProfile, setSelectedProfile] = useState<VerificationDetailProfile | null>(null)
  const [selectedAction, setSelectedAction] = useState<ReviewActionId>('open_full_review')
  const [resubmissionMessage, setResubmissionMessage] = useState('')
  const [rejectReason, setRejectReason] = useState('')
  const [rejectNote, setRejectNote] = useState('')
  const [message, setMessage] = useState('')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [refreshToken, setRefreshToken] = useState(0)

  const isSuperadmin = adminRole === 'superadmin'

  const queryParams = useMemo(
    () => ({
      search,
      status,
      ageGroup,
      dateSubmitted,
      page: currentPage,
      pageSize: PAGE_SIZE,
    }),
    [ageGroup, currentPage, dateSubmitted, search, status]
  )

  useEffect(() => {
    setCurrentPage(1)
  }, [search, status, ageGroup, dateSubmitted])

  useEffect(() => {
    let active = true

    const loadQueue = async () => {
      setIsLoading(true)
      try {
        const [queueRes, meRes] = await Promise.all([
          api.get<QueueResponse>('/admin/verification', { params: queryParams }),
          api.get('/auth/me'),
        ])

        if (!active) return

        setProfiles(queueRes.data.profiles || [])
        setPagination(queueRes.data.pagination)
        setSummary(
          queueRes.data.summary || {
            total: queueRes.data.pagination?.total || 0,
            pending: 0,
            inReview: 0,
            pendingSuperadmin: 0,
            resubmissionRequested: 0,
            pendingReview: 0,
            flaggedBySystem: 0,
            requiringAttention: 0,
            approvedToday: 0,
          }
        )
        setAgeGroupOptions(queueRes.data.filters?.ageGroupOptions || [])
        setAdminRole(
          meRes.data?.role || window.localStorage.getItem('kk-admin-role') || 'admin'
        )
      } catch {
        if (!active) return
        setProfiles([])
        setSelectedProfile(null)
      } finally {
        if (active) {
          setIsLoading(false)
        }
      }
    }

    void loadQueue()

    return () => {
      active = false
    }
  }, [queryParams, refreshToken])

  useEffect(() => {
    if (!profiles.length) {
      setSelectedUserId('')
      setSelectedProfile(null)
      return
    }

    if (!selectedUserId || !profiles.some((profile) => profile.userId === selectedUserId)) {
      setSelectedUserId(profiles[0].userId)
    }
  }, [profiles, selectedUserId])

  useEffect(() => {
    if (!selectedUserId) return

    let active = true
    setDetailLoading(true)

    api
      .get(`/admin/verification/${selectedUserId}`)
      .then((res) => {
        if (!active) return
        setSelectedProfile(res.data.profile || res.data)
      })
      .catch(() => {
        if (!active) return
        setSelectedProfile(null)
      })
      .finally(() => {
        if (active) {
          setDetailLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [selectedUserId])

  const queueMetrics = useMemo(
    () => ({
      pendingReview:
        summary.pendingReview ?? Number(summary.pending || 0) + Number(summary.inReview || 0),
      flaggedBySystem:
        summary.flaggedBySystem ??
        profiles.filter((profile) => Number(profile.documentCounts.rejected || 0) > 0).length,
      requiringAttention:
        summary.requiringAttention ?? Number(summary.resubmissionRequested || 0),
      approvedToday:
        summary.approvedToday ??
        profiles.filter((profile) => isSameDay(profile.verificationDocumentsApprovedAt)).length,
    }),
    [profiles, summary]
  )

  const selectedQueueProfile = useMemo(
    () => profiles.find((profile) => profile.userId === selectedUserId) || null,
    [profiles, selectedUserId]
  )

  const approvedRequiredCount = useMemo(() => {
    if (!selectedProfile) return 0
    return selectedProfile.requiredDocuments.filter(
      (document) => document.reviewStatus === 'approved'
    ).length
  }, [selectedProfile])

  const visibleDocuments = useMemo(() => {
    if (!selectedProfile) return []
    return selectedProfile.requiredDocuments
  }, [selectedProfile])

  const resubmissionTargetIds = useMemo(
    () => (selectedProfile ? getResubmissionTargetIds(selectedProfile) : []),
    [selectedProfile]
  )

  const actionOptions = useMemo(
    () => getReviewActionOptions(selectedProfile, isSuperadmin),
    [isSuperadmin, selectedProfile]
  )

  useEffect(() => {
    if (!actionOptions.length) {
      setSelectedAction('open_full_review')
      return
    }

    if (!actionOptions.some((option) => option.id === selectedAction)) {
      setSelectedAction(actionOptions[0].id)
    }
  }, [actionOptions, selectedAction])

  useEffect(() => {
    setResubmissionMessage('')
    setRejectReason('')
    setRejectNote('')
  }, [selectedUserId])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    setRefreshToken((current) => current + 1)
    setTimeout(() => {
      setIsRefreshing(false)
    }, 450)
  }

  const handleExport = () => {
    const rows = profiles.map((profile) => ({
      member: profile.fullName,
      email: profile.email,
      ageGroup: profile.youthAgeGroup,
      queueStatus: getQueueStatusLabel(profile.queueStatus),
      submitted: formatShortDate(profile.submittedAt),
      approvedBy: profile.verificationDocumentsApprovedBy || '',
      referredAt: formatShortDateTime(profile.verificationReferredToSuperadminAt),
    }))

    const header = Object.keys(rows[0] || {
      member: '',
      email: '',
      ageGroup: '',
      queueStatus: '',
      submitted: '',
      approvedBy: '',
      referredAt: '',
    })

    const csv = [
      header.join(','),
      ...rows.map((row) =>
        header
          .map((key) => `"${String(row[key as keyof typeof row] || '').replace(/"/g, '""')}"`)
          .join(',')
      ),
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `verification-queue-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleConfirmAction = async () => {
    if (!selectedProfile) return

    if (selectedAction === 'open_digital_ids') {
      router.push(`/digital-ids?member=${selectedProfile.userId}`)
      return
    }

    if (selectedAction === 'open_full_review') {
      router.push(`/verification/${selectedProfile.userId}`)
      return
    }

    setIsActionLoading(true)
    setMessage('')

    try {
      if (selectedAction === 'approve_and_refer') {
        await api.patch(`/admin/verification/${selectedProfile.userId}/approve`)
        setMessage('Verification approved and referred to the Digital ID issuance queue.')
      }

      if (selectedAction === 'request_resubmission') {
        if (!resubmissionTargetIds.length) {
          throw new Error('No review issues are available for resubmission yet.')
        }
        if (!resubmissionMessage.trim()) {
          throw new Error('Please enter a resubmission message before confirming.')
        }

        await api.patch(`/admin/verification/${selectedProfile.userId}/request-resubmission`, {
          documentIds: resubmissionTargetIds,
          message: resubmissionMessage,
        })
        setMessage('Resubmission request sent to the youth member.')
      }

      if (selectedAction === 'reject_submission') {
        if (!rejectReason.trim()) {
          throw new Error('Please enter a rejection reason before confirming.')
        }

        await api.patch(`/admin/verification/${selectedProfile.userId}/reject`, {
          reason: rejectReason,
          note: rejectNote,
        })
        setMessage('Submission rejected.')
      }

      setRefreshToken((current) => current + 1)
      const detailRes = await api.get(`/admin/verification/${selectedProfile.userId}`)
      setSelectedProfile(detailRes.data.profile || detailRes.data)
    } catch (error: any) {
      setMessage(error?.response?.data?.error || error?.message || 'Failed to save the review action.')
    } finally {
      setIsActionLoading(false)
    }
  }

  const handlePreviewDocument = (fileUrl?: string | null) => {
    if (!fileUrl) return

    if (isImageDocument(fileUrl)) {
      setPreviewUrl(fileUrl)
      return
    }

    window.open(fileUrl, '_blank', 'noopener,noreferrer')
  }

  return (
    <>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <AdminSurface className="px-6 py-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2.5">
                <h1
                  className="text-[1.95rem] font-black tracking-[-0.04em]"
                  style={{ color: 'var(--ink)' }}
                >
                  Verification Queue
                </h1>
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[color:var(--accent-soft)] text-[color:var(--accent)]">
                  <Shield className="h-4.5 w-4.5" strokeWidth={2.2} />
                </span>
              </div>
              <p className="max-w-4xl text-sm leading-6" style={{ color: 'var(--muted)' }}>
                Review submissions verified by admins. Check documents and either approve and refer,
                request re-verification, or reject.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => void handleRefresh()}
                aria-label="Refresh queue"
                className="admin-action-button h-11 w-11 rounded-[14px] px-0 text-sm font-semibold"
                data-variant="outline"
              >
                <RefreshCw className={`h-4.5 w-4.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
              <button
                type="button"
                onClick={handleExport}
                className="admin-action-button h-11 rounded-[14px] px-4 text-sm font-semibold"
                data-variant="primary"
              >
                <Download className="h-4.5 w-4.5" />
                Export
              </button>
            </div>
          </div>

          <section className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
            <VerificationMetricCard
              label="Pending Review"
              value={queueMetrics.pendingReview.toLocaleString()}
              description="Awaiting your review."
              icon={<ClipboardList className="h-5 w-5" strokeWidth={2.1} />}
              tone="violet"
            />
            <VerificationMetricCard
              label="Flagged by System"
              value={queueMetrics.flaggedBySystem.toLocaleString()}
              description="Auto-flagged submissions."
              icon={<FlagMetricIcon />}
              tone="warning"
            />
            <VerificationMetricCard
              label="Requiring Attention"
              value={queueMetrics.requiringAttention.toLocaleString()}
              description="Need admin re-verification."
              icon={<CircleAlert className="h-5 w-5" strokeWidth={2.1} />}
              tone="danger"
            />
            <VerificationMetricCard
              label="Approved Today"
              value={queueMetrics.approvedToday.toLocaleString()}
              description="Approved and ID generated."
              icon={<BadgeCheck className="h-5 w-5" strokeWidth={2.1} />}
              tone="success"
            />
          </section>

          <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-[1.5fr_0.68fr_0.68fr_0.9fr_0.48fr]">
            <FilterField label="Search">
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2"
                  style={{ color: 'var(--muted)' }}
                  strokeWidth={2}
                />
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by name, email, or location..."
                  className="surface-input h-11 w-full rounded-[14px] py-2.5 pl-11 pr-4 text-sm outline-none focus:ring-2 focus:ring-[color:var(--accent)]/20"
                />
              </div>
            </FilterField>

            <FilterField label="Age Group">
              <select
                value={ageGroup}
                onChange={(event) => setAgeGroup(event.target.value)}
                className="surface-input h-11 w-full rounded-[14px] bg-transparent px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[color:var(--accent)]/20"
              >
                <option value="all">All</option>
                {ageGroupOptions.map((option) => (
                  <option key={option} value={option}>
                    {prettifyOption(option)}
                  </option>
                ))}
              </select>
            </FilterField>

            <FilterField label="Queue Status">
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className="surface-input h-11 w-full rounded-[14px] bg-transparent px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[color:var(--accent)]/20"
              >
                {[
                  'all',
                  'pending',
                  'in_review',
                  'pending_superadmin_id_generation',
                  'resubmission_requested',
                  'verified',
                  'rejected',
                ].map((option) => (
                  <option key={option} value={option}>
                    {option === 'all' ? 'All' : getQueueStatusLabel(option)}
                  </option>
                ))}
              </select>
            </FilterField>

            <FilterField label="Submitted Date">
              <div className="relative">
                <CalendarDays
                  className="pointer-events-none absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2"
                  style={{ color: 'var(--accent)' }}
                  strokeWidth={2}
                />
                <input
                  type="date"
                  value={dateSubmitted}
                  onChange={(event) => setDateSubmitted(event.target.value)}
                  className="surface-input h-11 w-full rounded-[14px] py-2.5 pl-11 pr-4 text-sm outline-none focus:ring-2 focus:ring-[color:var(--accent)]/20"
                />
              </div>
            </FilterField>

            <div className="flex items-end">
              <button
                type="button"
                onClick={() => setRefreshToken((current) => current + 1)}
                className="admin-action-button h-11 w-full rounded-[14px] px-4 text-sm font-semibold"
                data-variant="outline"
              >
                <Filter className="h-4.5 w-4.5" />
                Filters
              </button>
            </div>
          </div>

          <div
            className="mt-6 overflow-hidden rounded-[16px] border"
            style={{ borderColor: 'var(--stroke)', background: 'var(--card-solid)' }}
          >
            <div className="overflow-x-auto">
              <div className="min-w-[1020px]">
                <div
                  className="grid items-center gap-4 px-4 py-3 text-[11px] font-bold uppercase tracking-[0.16em]"
                  style={{
                    background: 'var(--surface-muted)',
                    color: 'var(--muted)',
                    gridTemplateColumns:
                      '32px minmax(0,2.2fr) minmax(0,1fr) minmax(0,1.55fr) minmax(0,1.8fr) 92px 72px',
                  }}
                >
                  <span />
                  <span>Youth Member</span>
                  <span>Age Group</span>
                  <span>Required Documents</span>
                  <span>Queue Status</span>
                  <span>Submitted</span>
                  <span className="text-right">Actions</span>
                </div>

                {isLoading ? (
                  <div className="flex justify-center py-20">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-[color:var(--accent)] border-t-transparent" />
                  </div>
                ) : profiles.length === 0 ? (
                  <div className="p-6">
                    <AdminEmptyState
                      title="No verification submissions matched"
                      description="Try broadening the filters or refreshing the queue to reveal more submissions."
                    />
                  </div>
                ) : (
                  <div style={{ background: 'var(--card-solid)' }}>
                    {profiles.map((profile, index) => {
                      const isSelected = profile.userId === selectedUserId
                      return (
                        <div
                          key={profile.userId}
                          role="button"
                          tabIndex={0}
                          onClick={() => setSelectedUserId(profile.userId)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault()
                              setSelectedUserId(profile.userId)
                            }
                          }}
                          className={`grid min-h-[88px] cursor-pointer items-center gap-4 px-4 py-4 transition-all ${
                            isSelected
                              ? 'border border-[#3d7cff] shadow-[inset_0_0_0_1px_rgba(61,124,255,0.08)]'
                              : index !== 0
                                ? 'border-t'
                                : ''
                          }`}
                          style={{
                            borderColor: isSelected ? '#3d7cff' : 'var(--stroke)',
                            background: isSelected
                              ? 'color-mix(in srgb, var(--accent-soft) 58%, var(--card-solid) 42%)'
                              : 'var(--card-solid)',
                            gridTemplateColumns:
                              '32px minmax(0,2.2fr) minmax(0,1fr) minmax(0,1.55fr) minmax(0,1.8fr) 92px 72px',
                          }}
                        >
                          <div className="flex items-center justify-center">
                            <span
                              className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                                isSelected ? 'border-[#2563eb] bg-[#2563eb]' : 'border-[#cad5e5]'
                              }`}
                              style={!isSelected ? { background: 'var(--card-solid)' } : undefined}
                            >
                              {isSelected ? (
                                <CheckCircle2 className="h-3.5 w-3.5 text-white" strokeWidth={2.4} />
                              ) : null}
                            </span>
                          </div>

                          <div className="flex items-center gap-3">
                            <div
                              className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full"
                              style={{ background: 'var(--accent-soft)' }}
                            >
                              {profile.idPhotoUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={profile.idPhotoUrl}
                                  alt={profile.fullName}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <span className="text-sm font-bold text-[#0f4c97]">
                                  {getInitials(profile.fullName)}
                                </span>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-[14px] font-bold" style={{ color: 'var(--ink)' }}>
                                {profile.fullName}
                              </p>
                              <p className="truncate text-[13px]" style={{ color: 'var(--muted)' }}>
                                {profile.email || 'No email on file'}
                              </p>
                              <p className="truncate text-[13px]" style={{ color: 'var(--muted)' }}>
                                {profile.barangay || '-'}, {profile.city || '-'}
                              </p>
                            </div>
                          </div>

                          <div className="text-sm">
                            <p className="font-semibold" style={{ color: 'var(--ink)' }}>
                              {profile.youthAgeGroup || '-'}
                            </p>
                            <p className="mt-1 text-[13px]" style={{ color: 'var(--muted)' }}>
                              {profile.age ? `${profile.age} years old` : 'Age unavailable'}
                            </p>
                          </div>

                          <div className="space-y-1.5 text-sm">
                            {profile.requiredDocuments.slice(0, 3).map((document) => (
                              <div key={document.documentType} className="flex items-center gap-2">
                                <DocumentStateIcon status={document.reviewStatus} />
                                <span className="truncate" style={{ color: 'var(--ink)' }}>
                                  {document.label}
                                </span>
                              </div>
                            ))}
                          </div>

                          <div className="space-y-2">
                            <QueueStatusBadge status={profile.queueStatus} />
                            <div className="space-y-1 text-[13px] leading-5" style={{ color: 'var(--muted)' }}>
                              {profile.verificationDocumentsApprovedBy ? (
                                <p className="truncate">
                                  Verified by {profile.verificationDocumentsApprovedBy}
                                </p>
                              ) : null}
                              {profile.verificationReferredToSuperadminAt ? (
                                <p>Referred {formatShortDateTime(profile.verificationReferredToSuperadminAt)}</p>
                              ) : null}
                              {!profile.verificationDocumentsApprovedBy &&
                              !profile.verificationReferredToSuperadminAt ? (
                                <p>Waiting for next review action</p>
                              ) : null}
                            </div>
                          </div>

                          <div className="text-sm font-medium leading-5" style={{ color: 'var(--ink-soft)' }}>
                            <span className="block">{formatShortDate(profile.submittedAt)}</span>
                          </div>

                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation()
                                setSelectedUserId(profile.userId)
                              }}
                              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border text-[#0f4c97] shadow-[0_6px_18px_rgba(15,76,151,0.04)] transition hover:bg-[color:var(--surface-muted)]"
                              style={{ borderColor: 'var(--stroke)', background: 'var(--card-solid)' }}
                            >
                              <Eye className="h-4.5 w-4.5" strokeWidth={2.1} />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-sm leading-6" style={{ color: 'var(--muted)' }}>
              Showing {profiles.length === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1}-
              {Math.min(pagination.page * pagination.pageSize, pagination.total)} of {pagination.total} submissions
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={pagination.page === 1}
                className="admin-action-button h-10 rounded-[12px] px-3.5 text-sm font-semibold"
                data-variant="outline"
              >
                <ChevronLeft className="h-4 w-4" strokeWidth={2.2} />
                Previous
              </button>
              {Array.from({ length: Math.min(pagination.totalPages, 3) }, (_, index) => {
                const pageNumber = index + 1
                const active = pageNumber === pagination.page
                return (
                  <button
                    key={pageNumber}
                    type="button"
                    onClick={() => setCurrentPage(pageNumber)}
                    className="inline-flex h-10 min-w-[40px] items-center justify-center rounded-[12px] px-3 text-sm font-bold transition"
                    style={
                      active
                        ? { background: 'var(--accent)', color: '#ffffff' }
                        : {
                            border: '1px solid var(--stroke)',
                            color: 'var(--ink-soft)',
                            background: 'var(--card-solid)',
                          }
                    }
                  >
                    {pageNumber}
                  </button>
                )
              })}
              <button
                type="button"
                onClick={() =>
                  setCurrentPage((page) => Math.min(pagination.totalPages, page + 1))
                }
                disabled={pagination.page === pagination.totalPages}
                className="admin-action-button h-10 rounded-[12px] px-3.5 text-sm font-semibold"
                data-variant="outline"
              >
                Next
                <ChevronRight className="h-4 w-4" strokeWidth={2.2} />
              </button>
            </div>
          </div>
        </AdminSurface>

        <AdminSurface className="sticky top-6 self-start px-6 py-6">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[color:var(--accent-soft)] text-[color:var(--accent)]">
                  <ShieldCheck className="h-4.5 w-4.5" strokeWidth={2.1} />
                </span>
                <h2 className="text-[1.85rem] font-black tracking-[-0.04em]" style={{ color: 'var(--ink)' }}>
                  Review Submission
                </h2>
              </div>
              <p className="text-sm leading-6" style={{ color: 'var(--muted)' }}>
                Check the applicant&apos;s details and documents carefully.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setSelectedUserId('')
                setSelectedProfile(null)
              }}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[color:var(--accent-strong)] transition hover:bg-[color:var(--accent-soft)]"
            >
              <X className="h-4.5 w-4.5" strokeWidth={2.2} />
            </button>
          </div>

          {message ? (
            <div
              className="mt-5 rounded-[16px] border px-4 py-3 text-sm leading-6"
              style={{
                borderColor: 'color-mix(in srgb, var(--accent) 24%, white 76%)',
                background: 'var(--accent-soft)',
                color: 'var(--accent-strong)',
              }}
            >
              {message}
            </div>
          ) : null}

          {detailLoading ? (
            <div className="flex justify-center py-20">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[color:var(--accent)] border-t-transparent" />
            </div>
          ) : !selectedProfile ? (
            <div className="mt-6">
              <AdminEmptyState
                title="No submission selected"
                description="Pick a member from the queue to inspect the uploaded requirements and review actions."
              />
            </div>
          ) : (
            <div className="mt-5 space-y-5">
              <div
                className="rounded-[18px] border px-5 py-4"
                style={{ borderColor: 'var(--stroke)', background: 'var(--card-solid)' }}
              >
                <div className="flex items-start gap-4">
                  <div
                    className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full"
                    style={{ background: 'var(--accent-soft)' }}
                  >
                    {selectedProfile.idPhotoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={selectedProfile.idPhotoUrl}
                        alt={selectedProfile.fullName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-lg font-black text-[#0f4c97]">
                        {getInitials(selectedProfile.fullName)}
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-[1.35rem] font-black tracking-[-0.03em]" style={{ color: 'var(--ink)' }}>
                      {selectedProfile.fullName}
                    </h3>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="admin-status-pill rounded-full px-2.5 py-1 text-xs font-semibold" data-tone="info">
                        {selectedProfile.youthAgeGroup || 'Youth Member'}
                      </span>
                      <span className="text-sm" style={{ color: 'var(--muted)' }}>
                        {selectedProfile.age ? `${selectedProfile.age} years old` : 'Age unavailable'}
                      </span>
                    </div>
                    <div className="mt-3 space-y-2 text-sm" style={{ color: 'var(--muted)' }}>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-[#0f4c97]" strokeWidth={2} />
                        <span className="truncate">{selectedProfile.email || 'No email on file'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-[#0f4c97]" strokeWidth={2} />
                        <span className="truncate">
                          {[selectedProfile.barangay, selectedProfile.city].filter(Boolean).join(', ') || 'Location unavailable'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black" style={{ color: 'var(--ink)' }}>
                    Required Documents
                  </h3>
                  <span className="admin-status-pill rounded-full px-2.5 py-1 text-xs font-semibold" data-tone="success">
                    {approvedRequiredCount}/{selectedProfile.requiredDocuments.length || 0} Complete
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                {visibleDocuments.map((document) => (
                  <div
                    key={document.id}
                    className="grid min-h-[72px] grid-cols-[72px_minmax(0,1fr)_auto_auto] items-center gap-3 rounded-[16px] border px-3 py-3"
                    style={{ borderColor: 'var(--stroke)', background: 'var(--card-solid)' }}
                  >
                    <button
                      type="button"
                      onClick={() => handlePreviewDocument(document.fileUrl)}
                      className="flex h-[56px] w-[72px] items-center justify-center overflow-hidden rounded-[12px] border"
                      style={{
                        borderColor: 'var(--stroke)',
                        background: 'color-mix(in srgb, var(--surface-muted) 82%, transparent)',
                      }}
                    >
                      {document.fileUrl && isImageDocument(document.fileUrl) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={document.fileUrl}
                          alt={document.label}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--muted)' }}>
                          {document.fileUrl ? getFileKind(document.fileUrl) : 'File'}
                        </span>
                      )}
                    </button>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold" style={{ color: 'var(--ink)' }}>
                        {document.label}
                      </p>
                      <p className="truncate text-[13px]" style={{ color: 'var(--muted)' }}>
                        File: {getDocumentFilename(document.fileUrl)}
                      </p>
                      <p className="truncate text-[13px]" style={{ color: 'var(--muted)' }}>
                        Uploaded: {formatShortDateTime(document.uploadedAt)}
                      </p>
                    </div>

                    <DocumentStatusBadge status={document.reviewStatus} />

                    <button
                      type="button"
                      onClick={() => handlePreviewDocument(document.fileUrl)}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border text-[#0f4c97] shadow-[0_6px_18px_rgba(15,76,151,0.04)] transition hover:bg-[color:var(--surface-muted)]"
                      style={{ borderColor: 'var(--stroke)', background: 'var(--card-solid)' }}
                    >
                      <Eye className="h-4.5 w-4.5" strokeWidth={2.1} />
                    </button>
                  </div>
                ))}
              </div>

              <div
                className="rounded-[16px] border px-4 py-4"
                style={{
                  borderColor: 'var(--stroke)',
                  background: 'color-mix(in srgb, var(--surface-muted) 82%, transparent)',
                }}
              >
                <h3 className="text-base font-black" style={{ color: 'var(--ink)' }}>
                  Admin Verification Summary
                </h3>
                <div className="mt-3 flex items-start gap-3">
                  <span
                    className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full text-[#16a34a]"
                    style={{ background: 'color-mix(in srgb, var(--success-bg) 88%, transparent)' }}
                  >
                    <CheckCircle2 className="h-4 w-4" strokeWidth={2.1} />
                  </span>
                  <div className="min-w-0 flex-1 text-sm leading-6" style={{ color: 'var(--muted)' }}>
                    {selectedProfile.verificationDocumentsApprovedBy ? (
                      <>
                        <p className="font-semibold" style={{ color: 'var(--ink-soft)' }}>
                          Verified by {selectedProfile.verificationDocumentsApprovedBy}
                        </p>
                        <p>{formatLongDateTime(selectedProfile.verificationDocumentsApprovedAt)}</p>
                        <p className="mt-2">All documents marked as complete.</p>
                      </>
                    ) : (
                      <p>Verification approval has not been finalized yet.</p>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-base font-black" style={{ color: 'var(--ink)' }}>
                  Superadmin Action
                </h3>
                <div
                  className="mt-3 rounded-[16px] border px-4 py-3"
                  style={{
                    borderColor: selectedAction ? '#3d7cff' : 'var(--stroke)',
                    background: 'var(--card-solid)',
                  }}
                >
                  <div className="space-y-3">
                    {actionOptions.map((option) => (
                      <label
                        key={option.id}
                        className="flex cursor-pointer items-start gap-3 rounded-[12px] px-1 py-1.5"
                      >
                        <input
                          type="radio"
                          name="verification-action"
                          checked={selectedAction === option.id}
                          onChange={() => setSelectedAction(option.id)}
                          className="mt-1 h-4 w-4 border-[#cad5e5] text-[#0f4c97] focus:ring-[#0f4c97]/25"
                        />
                        <div className="min-w-0">
                          <p className={`text-sm font-bold ${getActionToneText(option.tone)}`}>
                            {option.label}
                          </p>
                          <p className="mt-1 text-[13px] leading-5" style={{ color: 'var(--muted)' }}>
                            {option.description}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {selectedAction === 'request_resubmission' ? (
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--muted)' }}>
                    Resubmission Message
                  </label>
                  <textarea
                    value={resubmissionMessage}
                    onChange={(event) => setResubmissionMessage(event.target.value)}
                    rows={4}
                    placeholder="Tell the youth member what needs to be corrected or re-uploaded."
                    className="surface-input w-full rounded-[14px] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[color:var(--accent)]/20"
                  />
                </div>
              ) : null}

              {selectedAction === 'reject_submission' ? (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--muted)' }}>
                      Rejection Reason
                    </label>
                    <input
                      type="text"
                      value={rejectReason}
                      onChange={(event) => setRejectReason(event.target.value)}
                      placeholder="Reason shown to the applicant"
                      className="surface-input h-11 w-full rounded-[14px] px-4 text-sm outline-none focus:ring-2 focus:ring-[color:var(--accent)]/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--muted)' }}>
                      Internal Note
                    </label>
                    <textarea
                      value={rejectNote}
                      onChange={(event) => setRejectNote(event.target.value)}
                      rows={3}
                      placeholder="Add a supporting note for the rejection record."
                      className="surface-input w-full rounded-[14px] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[color:var(--accent)]/20"
                    />
                  </div>
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedUserId('')
                    setSelectedProfile(null)
                    setMessage('')
                  }}
                  className="admin-action-button h-11 rounded-[14px] text-sm font-semibold"
                  data-variant="outline"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleConfirmAction()}
                  disabled={isActionLoading || !selectedProfile}
                  className="admin-action-button h-11 rounded-[14px] text-sm font-semibold"
                  data-variant="primary"
                >
                  {isActionLoading ? 'Saving...' : 'Confirm Action'}
                </button>
              </div>
            </div>
          )}
        </AdminSurface>
      </div>

      {previewUrl ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6"
          onClick={() => setPreviewUrl(null)}
        >
          <div
            className="relative max-h-full max-w-6xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPreviewUrl(null)}
              className="absolute right-0 top-0 z-10 rounded-full bg-white/90 px-3 py-2 text-sm font-semibold"
              style={{ color: 'var(--accent-strong)' }}
            >
              Close
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Document preview"
              className="max-h-[85vh] rounded-2xl object-contain"
            />
          </div>
        </div>
      ) : null}
    </>
  )
}

function VerificationMetricCard({
  label,
  value,
  description,
  icon,
  tone,
}: {
  label: string
  value: string
  description: string
  icon: React.ReactNode
  tone: 'violet' | 'warning' | 'danger' | 'success'
}) {
  const palette = getVerificationMetricPalette(tone)

  return (
    <div
      className="min-h-[118px] rounded-[18px] border px-6 py-5 shadow-[0_10px_28px_rgba(15,76,151,0.05)]"
      style={{ borderColor: 'var(--stroke)', background: 'var(--card-solid)' }}
    >
      <div className="flex items-start gap-4">
        <div
          className="grid h-12 w-12 shrink-0 place-items-center rounded-full"
          style={{ background: palette.background, color: palette.color }}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--ink-soft)' }}>
            {label}
          </p>
          <p className="mt-3 text-[1.95rem] font-black leading-none tracking-[-0.03em]" style={{ color: palette.color }}>
            {value}
          </p>
          <p className="mt-2.5 text-sm leading-6" style={{ color: 'var(--muted)' }}>
            {description}
          </p>
        </div>
      </div>
    </div>
  )
}

function FilterField({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <label className="block text-xs font-bold" style={{ color: 'var(--ink-soft)' }}>
        {label}
      </label>
      {children}
    </div>
  )
}

function QueueStatusBadge({ status }: { status: string }) {
  return (
    <span
      data-tone={getQueueTone(status)}
      className="admin-status-pill rounded-full px-2.5 py-1 text-xs font-semibold"
    >
      {getQueueStatusLabel(status)}
    </span>
  )
}

function DocumentStatusBadge({ status }: { status: string }) {
  return (
    <span
      data-tone={getDocumentTone(status)}
      className="admin-status-pill rounded-full px-2.5 py-1 text-xs font-semibold"
    >
      {getDocumentStatusLabel(status)}
    </span>
  )
}

function DocumentStateIcon({ status }: { status: string }) {
  if (status === 'approved') {
    return <CheckCircle2 className="h-4 w-4 shrink-0 text-[#16a34a]" strokeWidth={2.1} />
  }

  if (status === 'rejected' || status === 'resubmission_requested') {
    return <CircleAlert className="h-4 w-4 shrink-0 text-[#ef4444]" strokeWidth={2.1} />
  }

  return <FileWarning className="h-4 w-4 shrink-0 text-[#f59e0b]" strokeWidth={2.1} />
}

function FlagMetricIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.1}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 4v16M6 5h10l-1.75 3L16 11H6" />
    </svg>
  )
}

function getVerificationMetricPalette(
  tone: 'violet' | 'warning' | 'danger' | 'success'
) {
  if (tone === 'warning') {
    return {
      background: '#fff8e7',
      color: '#f59e0b',
    }
  }

  if (tone === 'danger') {
    return {
      background: '#fff1f2',
      color: '#ef4444',
    }
  }

  if (tone === 'success') {
    return {
      background: '#edf9f0',
      color: '#16a34a',
    }
  }

  return {
    background: '#f2ecff',
    color: '#7c3aed',
  }
}

function getQueueStatusLabel(value: string) {
  if (value === 'pending_superadmin_id_generation') return 'Pending Superadmin Review'
  if (value === 'in_review') return 'Documents In Review'
  if (value === 'pending') return 'Pending Review'
  if (value === 'resubmission_requested') return 'Needs Attention'
  if (value === 'verified') return 'Verified'
  if (value === 'rejected') return 'Rejected'
  return value.split('_').join(' ').replace(/\b\w/g, (char) => char.toUpperCase())
}

function getDocumentStatusLabel(value: string) {
  if (value === 'approved') return 'Verified'
  if (value === 'rejected') return 'Flagged'
  if (value === 'resubmission_requested') return 'Resubmit'
  if (value === 'pending') return 'Needs Review'
  return value.split('_').join(' ').replace(/\b\w/g, (char) => char.toUpperCase())
}

function getQueueTone(status: string) {
  if (status === 'pending' || status === 'in_review') return 'info'
  if (status === 'pending_superadmin_id_generation') return 'info'
  if (status === 'resubmission_requested') return 'warning'
  if (status === 'rejected') return 'danger'
  if (status === 'verified') return 'success'
  return 'neutral'
}

function getDocumentTone(status: string) {
  if (status === 'approved') return 'success'
  if (status === 'rejected') return 'danger'
  if (status === 'resubmission_requested') return 'warning'
  if (status === 'pending') return 'info'
  return 'neutral'
}

function prettifyOption(value: string) {
  return value.split('_').join(' ').replace(/\b\w/g, (char) => char.toUpperCase())
}

function getInitials(fullName: string) {
  return fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('')
}

function formatShortDate(value?: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-PH')
}

function formatShortDateTime(value?: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('en-PH', {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatLongDateTime(value?: string | null) {
  if (!value) return 'Not yet recorded'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('en-PH', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function isSameDay(value?: string | null) {
  if (!value) return false
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return false
  return date.toDateString() === new Date().toDateString()
}

function canApproveAndRefer(profile: VerificationDetailProfile | null) {
  if (!profile) return false
  if (profile.queueStatus === 'pending_superadmin_id_generation') return false
  if (profile.digitalIdStatus === 'active') return false
  if (profile.missingDocuments.length > 0) return false
  if (!profile.requiredDocuments.length) return false

  return profile.requiredDocuments.every(
    (document) => document.present && document.reviewStatus === 'approved'
  )
}

function getResubmissionTargetIds(profile: VerificationDetailProfile) {
  const flagged = profile.documents
    .filter((document) =>
      ['rejected', 'resubmission_requested'].includes(String(document.reviewStatus || ''))
    )
    .map((document) => document.id)

  if (flagged.length > 0) {
    return flagged
  }

  const pendingRequired = profile.requiredDocuments
    .filter((document) => document.present && document.reviewStatus !== 'approved')
    .map((document) => document.id)

  if (pendingRequired.length > 0) {
    return pendingRequired
  }

  return profile.requiredDocuments
    .filter((document) => document.present)
    .map((document) => document.id)
}

function getReviewActionOptions(
  profile: VerificationDetailProfile | null,
  isSuperadmin: boolean
): ReviewActionOption[] {
  if (!profile) return []

  const options: ReviewActionOption[] = []

  if (isSuperadmin && profile.queueStatus === 'pending_superadmin_id_generation') {
    options.push({
      id: 'open_digital_ids',
      label: 'Approve and Generate ID',
      description: 'Approve this submission and continue in the Digital IDs workspace.',
      tone: 'success',
    })
  } else if (canApproveAndRefer(profile)) {
    options.push({
      id: 'approve_and_refer',
      label: isSuperadmin ? 'Approve Verification' : 'Approve and Refer to ID Queue',
      description: isSuperadmin
        ? 'Complete verification and move this member into the issuance queue.'
        : 'Complete verification and move this member into the Digital ID issuance queue.',
      tone: 'success',
    })
  } else {
    options.push({
      id: 'open_full_review',
      label: 'Open Full Review Page',
      description: 'Use the dedicated review screen for deeper document-level work.',
      tone: 'info',
    })
  }

  if (profile.requiredDocuments.length > 0) {
    options.push({
      id: 'request_resubmission',
      label: isSuperadmin ? 'Request Admin to Verify Again' : 'Request Resubmission',
      description: isSuperadmin
        ? 'Return this case to admin for re-verification and additional checks.'
        : 'Send the member back for corrections and additional checks.',
      tone: 'warning',
    })
  }

  if (isSuperadmin) {
    options.push({
      id: 'reject_submission',
      label: 'Reject Submission',
      description: 'Reject this submission. The applicant will be notified.',
      tone: 'danger',
    })
  }

  return options
}

function getActionToneText(tone: ReviewActionOption['tone']) {
  if (tone === 'success') return 'text-[#15803d]'
  if (tone === 'warning') return 'text-[#c57a09]'
  if (tone === 'danger') return 'text-[#dc2626]'
  return 'text-[#0f4c97]'
}

function isImageDocument(fileUrl: string) {
  return /\.(png|jpe?g|webp|gif|bmp|svg)(\?.*)?$/i.test(fileUrl)
}

function getFileKind(fileUrl: string) {
  if (/\.pdf(\?.*)?$/i.test(fileUrl)) return 'PDF'
  if (isImageDocument(fileUrl)) return 'Image'
  return 'File'
}

function getDocumentFilename(fileUrl?: string | null) {
  if (!fileUrl) return 'No file'

  try {
    const pathname = new URL(fileUrl).pathname
    const rawName = pathname.split('/').filter(Boolean).pop() || 'document'
    return decodeURIComponent(rawName)
  } catch {
    const rawName = fileUrl.split('/').filter(Boolean).pop() || 'document'
    return decodeURIComponent(rawName)
  }
}
