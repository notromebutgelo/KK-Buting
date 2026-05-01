'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Search } from 'lucide-react'
import api from '@/lib/api'
import {
  AdminEmptyState,
  AdminField,
  AdminFilterBar,
  AdminNotice,
  AdminPageIntro,
  AdminStatCard,
  AdminStatGrid,
  AdminSurface,
  AdminSurfaceHeader,
  AdminTableShell,
} from '@/components/admin/workspace'
import { DashboardMiniStat, DashboardPill } from '@/components/dashboard/primitives'
import { cn } from '@/utils/cn'

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
  queueStatus: 'pending' | 'in_review' | 'resubmission_requested' | 'verified' | 'rejected'
  submittedAt: string
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
  summary?: {
    total: number
    pending: number
    inReview: number
    resubmissionRequested: number
  }
}

const PAGE_SIZE = 10

export default function VerificationPage() {
  const [profiles, setProfiles] = useState<QueueProfile[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [ageGroup, setAgeGroup] = useState('all')
  const [documentType, setDocumentType] = useState('all')
  const [dateSubmitted, setDateSubmitted] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [isBulkApproving, setIsBulkApproving] = useState(false)
  const [message, setMessage] = useState('')
  const [adminRole, setAdminRole] = useState('admin')
  const [pagination, setPagination] = useState<QueueResponse['pagination']>({
    page: 1,
    pageSize: PAGE_SIZE,
    total: 0,
    totalPages: 1,
  })
  const [summary, setSummary] = useState<QueueResponse['summary']>({
    total: 0,
    pending: 0,
    inReview: 0,
    resubmissionRequested: 0,
  })
  const [ageGroupOptions, setAgeGroupOptions] = useState<string[]>([])
  const [documentTypeOptions, setDocumentTypeOptions] = useState<string[]>([])

  const isSuperadmin = adminRole === 'superadmin'
  const queryParams = useMemo(
    () => ({
      search,
      status,
      ageGroup,
      documentType,
      dateSubmitted,
      page: currentPage,
      pageSize: PAGE_SIZE,
    }),
    [search, status, ageGroup, documentType, dateSubmitted, currentPage]
  )

  useEffect(() => {
    setCurrentPage(1)
  }, [search, status, ageGroup, documentType, dateSubmitted])

  useEffect(() => {
    let mounted = true

    const loadQueue = async () => {
      setIsLoading(true)
      try {
        const [queueRes, meRes] = await Promise.all([
          api.get<QueueResponse>('/admin/verification', { params: queryParams }),
          api.get('/auth/me'),
        ])

        if (!mounted) return
        setProfiles(queueRes.data.profiles || [])
        setPagination(queueRes.data.pagination)
        setSummary(
          queueRes.data.summary || {
            total: queueRes.data.pagination?.total || 0,
            pending: 0,
            inReview: 0,
            resubmissionRequested: 0,
          }
        )
        setAgeGroupOptions((prev) => {
          const incoming = queueRes.data.filters?.ageGroupOptions || []
          return Array.from(new Set([...prev, ...incoming]))
        })
        setDocumentTypeOptions((prev) => {
          const incoming = queueRes.data.filters?.documentTypeOptions || []
          return Array.from(new Set([...prev, ...incoming]))
        })
        setAdminRole(meRes.data?.role || window.localStorage.getItem('kk-admin-role') || 'admin')
      } catch {
        if (!mounted) return
        setProfiles([])
      } finally {
        if (mounted) setIsLoading(false)
      }
    }

    void loadQueue()
    return () => {
      mounted = false
    }
  }, [queryParams])

  const allVisibleSelected =
    profiles.length > 0 && profiles.every((profile) => selectedIds.includes(profile.userId))

  const readyToApproveIds = profiles
    .filter((profile) => isEligibleForVerification(profile))
    .map((profile) => profile.userId)

  const readySelectedCount = profiles.filter(
    (profile) => selectedIds.includes(profile.userId) && isEligibleForVerification(profile)
  ).length

  const toggleSelectAllVisible = () => {
    if (allVisibleSelected) {
      setSelectedIds((current) => current.filter((id) => !profiles.some((profile) => profile.userId === id)))
      return
    }

    setSelectedIds((current) => [
      ...Array.from(new Set([...current, ...profiles.map((profile) => profile.userId)])),
    ])
  }

  const toggleSelectOne = (userId: string) => {
    setSelectedIds((current) =>
      current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId]
    )
  }

  const handleBulkApprove = async () => {
    setIsBulkApproving(true)
    setMessage('')
    try {
      const selectedReadyIds = profiles
        .filter((profile) => selectedIds.includes(profile.userId) && isEligibleForVerification(profile))
        .map((profile) => profile.userId)

      const res = await api.post('/admin/verification/bulk-approve', {
        userIds: selectedReadyIds,
      })

      const approvedCount = res.data.approved?.length || 0
      const failedCount = res.data.failed?.length || 0
      setMessage(`Bulk approval finished. Approved: ${approvedCount}. Failed: ${failedCount}.`)
      setSelectedIds([])
      const queueRes = await api.get<QueueResponse>('/admin/verification', { params: queryParams })
      setProfiles(queueRes.data.profiles || [])
      setPagination(queueRes.data.pagination)
      setSummary(queueRes.data.summary || summary)
    } catch (error: any) {
      setMessage(error?.response?.data?.error || 'Bulk approval failed.')
    } finally {
      setIsBulkApproving(false)
    }
  }

  const messageTone = message.toLowerCase().includes('fail') ? 'danger' : 'success'

  return (
    <div className="flex flex-col gap-6">
      <AdminPageIntro
        eyebrow="Verification operations"
        title="Keep the review queue moving without turning the page into a wall of filters and tables."
        description="This queue is now structured around what matters most: how much work is waiting, which submissions are ready, and which members need resubmission support before they can move forward."
        pills={[
          <DashboardPill key="role" tone={isSuperadmin ? 'soft' : 'default'}>
            {isSuperadmin ? 'Bulk approval enabled' : 'Admin review mode'}
          </DashboardPill>,
          <DashboardPill key="queue" tone={(summary?.pending || 0) > 0 ? 'warning' : 'default'}>
            {(summary?.pending || 0) > 0 ? 'Queue active' : 'Queue calm'}
          </DashboardPill>,
        ]}
        aside={
          <div className="grid grid-cols-2 gap-3">
            <DashboardMiniStat
              label="Ready selected"
              value={readySelectedCount.toLocaleString()}
              meta="Chosen submissions that can be approved now"
              tone={readySelectedCount > 0 ? 'soft' : 'neutral'}
            />
            <DashboardMiniStat
              label="Resubmission"
              value={(summary?.resubmissionRequested || 0).toLocaleString()}
              meta="Members who need another pass"
              tone={summary?.resubmissionRequested ? 'warning' : 'neutral'}
            />
          </div>
        }
      />

      <AdminStatGrid>
        <AdminStatCard
          label="Total in queue"
          value={(summary?.total || pagination.total).toLocaleString()}
          meta="Every submitted profile currently represented in the queue."
          accent="var(--accent)"
        />
        <AdminStatCard
          label="Pending"
          value={(summary?.pending || 0).toLocaleString()}
          meta="Submissions still waiting for a reviewer to fully process them."
          accent="var(--accent-warm)"
        />
        <AdminStatCard
          label="In review"
          value={(summary?.inReview || 0).toLocaleString()}
          meta="Profiles that are already in active review rather than untouched."
          accent="var(--accent-strong)"
        />
        <AdminStatCard
          label="Resubmission"
          value={(summary?.resubmissionRequested || 0).toLocaleString()}
          meta="Members who need corrections before they can be approved."
          accent="var(--danger-accent)"
        />
      </AdminStatGrid>

      {message ? <AdminNotice tone={messageTone}>{message}</AdminNotice> : null}

      <AdminSurface>
        <AdminSurfaceHeader
          title="Queue filters"
          description="Use the filters to narrow the queue without drowning out the work itself."
          action={
            <button
              type="button"
              disabled={
                !isSuperadmin ||
                isBulkApproving ||
                selectedIds.length === 0 ||
                selectedIds.every((id) => !readyToApproveIds.includes(id))
              }
              onClick={handleBulkApprove}
              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm disabled:opacity-50"
              style={{ background: 'var(--accent)' }}
            >
              {isBulkApproving ? 'Bulk approving...' : 'Bulk approve ready'}
            </button>
          }
        />

        <div className="mt-5">
          <AdminFilterBar columns="xl:grid-cols-5">
            <AdminField label="Search queue">
              <div className="relative xl:col-span-2">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--muted)' }}
                />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Name, email, contact, or city"
                  className="surface-input w-full rounded-xl py-2.5 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-[color:var(--accent)]/25"
                />
              </div>
            </AdminField>

            <AdminField label="Queue status">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="surface-input w-full rounded-xl bg-transparent px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[color:var(--accent)]/25"
              >
                {['all', 'pending', 'in_review', 'resubmission_requested'].map((option) => (
                  <option key={option} value={option}>
                    {option === 'all' ? 'All' : prettifyOption(option)}
                  </option>
                ))}
              </select>
            </AdminField>

            <AdminField label="Age group">
              <select
                value={ageGroup}
                onChange={(e) => setAgeGroup(e.target.value)}
                className="surface-input w-full rounded-xl bg-transparent px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[color:var(--accent)]/25"
              >
                {['all', ...ageGroupOptions].map((option) => (
                  <option key={option} value={option}>
                    {option === 'all' ? 'All' : prettifyOption(option)}
                  </option>
                ))}
              </select>
            </AdminField>

            <AdminField label="Document type">
              <select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                className="surface-input w-full rounded-xl bg-transparent px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[color:var(--accent)]/25"
              >
                {['all', ...documentTypeOptions].map((option) => (
                  <option key={option} value={option}>
                    {option === 'all' ? 'All' : prettifyOption(option)}
                  </option>
                ))}
              </select>
            </AdminField>

            <AdminField label="Date submitted">
              <input
                type="date"
                value={dateSubmitted}
                onChange={(e) => setDateSubmitted(e.target.value)}
                className="surface-input w-full rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[color:var(--accent)]/25"
              />
            </AdminField>
          </AdminFilterBar>
        </div>
      </AdminSurface>

      <AdminSurface>
        <AdminSurfaceHeader
          title="Verification queue"
          description="Each row keeps the member context, document readiness, and next action visible at a glance."
          action={<DashboardPill tone="default">{profiles.length} visible</DashboardPill>}
        />

        <div className="mt-5">
          {isLoading ? (
            <div className="flex justify-center py-20">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[color:var(--accent)] border-t-transparent" />
            </div>
          ) : profiles.length === 0 ? (
            <AdminEmptyState
              title="No verification submissions matched"
              description="Try broadening the filters or clearing the search to reveal more queue items."
            />
          ) : (
            <AdminTableShell minWidth="1240px">
              <table className="w-full">
                <thead style={{ background: 'var(--accent-soft)' }}>
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <input type="checkbox" checked={allVisibleSelected} onChange={toggleSelectAllVisible} />
                    </th>
                    {['Youth Member', 'Age Group', 'Required Documents', 'Queue Status', 'Submitted', 'Actions'].map((heading) => (
                      <th
                        key={heading}
                        className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em]"
                        style={{ color: 'var(--muted)' }}
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[color:var(--stroke)]">
                  {profiles.map((profile) => (
                    <tr
                      key={profile.userId}
                      className="transition-colors hover:bg-[color:var(--accent-soft)]"
                    >
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(profile.userId)}
                          onChange={() => toggleSelectOne(profile.userId)}
                        />
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-[color:var(--accent-soft)]">
                            {profile.idPhotoUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={profile.idPhotoUrl} alt={profile.fullName} className="h-full w-full object-cover" />
                            ) : (
                              <span className="text-sm font-bold" style={{ color: 'var(--accent-strong)' }}>
                                {getInitials(profile.fullName)}
                              </span>
                            )}
                          </div>
                          <div>
                            <p className="font-semibold" style={{ color: 'var(--ink)' }}>
                              {profile.fullName || `${profile.firstName} ${profile.lastName}`}
                            </p>
                            <p className="text-xs" style={{ color: 'var(--muted)' }}>
                              {profile.email || 'No email'} | {profile.contactNumber || 'No contact'}
                            </p>
                            <p className="text-xs" style={{ color: 'var(--muted)' }}>
                              {profile.barangay || '-'}, {profile.city || '-'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm" style={{ color: 'var(--ink)' }}>
                        <div>{profile.youthAgeGroup || '-'}</div>
                        <div className="text-xs" style={{ color: 'var(--muted)' }}>
                          {profile.age ? `${profile.age} years old` : 'Age unavailable'}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="space-y-2">
                          {profile.requiredDocuments.map((document) => (
                            <div key={document.documentType} className="flex items-center justify-between gap-3 text-sm">
                              <span style={{ color: 'var(--ink)' }}>{document.label}</span>
                              <DocumentStatusBadge status={document.reviewStatus} />
                            </div>
                          ))}
                          {profile.missingDocuments.length > 0 ? (
                            <p className="text-xs font-medium text-red-600">
                              Missing: {profile.missingDocuments.map((document) => document.label).join(', ')}
                            </p>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <QueueStatusBadge status={profile.queueStatus} />
                      </td>
                      <td className="px-5 py-4 text-sm" style={{ color: 'var(--muted)' }}>
                        {profile.submittedAt ? new Date(profile.submittedAt).toLocaleDateString('en-PH') : '-'}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-col items-start gap-2">
                          <Link
                            href={`/verification/${profile.userId}`}
                            className="font-semibold text-[color:var(--accent)] hover:text-[color:var(--accent-strong)]"
                          >
                            Review submission
                          </Link>
                          {isEligibleForVerification(profile) ? (
                            <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">
                              Ready to verify
                            </span>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </AdminTableShell>
          )}
        </div>
      </AdminSurface>

      <AdminSurface tone="neutral">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p className="text-sm leading-6" style={{ color: 'var(--muted)' }}>
            Showing {profiles.length === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1}-
            {Math.min(pagination.page * pagination.pageSize, pagination.total)} of {pagination.total} submissions
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={pagination.page === 1}
              className="rounded-lg border px-3 py-2 text-sm disabled:opacity-40"
              style={{ borderColor: 'var(--stroke)', color: 'var(--accent-strong)' }}
            >
              Previous
            </button>
            <span className="px-2 text-sm font-semibold" style={{ color: 'var(--accent-strong)' }}>
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.min(pagination.totalPages, page + 1))}
              disabled={pagination.page === pagination.totalPages}
              className="rounded-lg border px-3 py-2 text-sm disabled:opacity-40"
              style={{ borderColor: 'var(--stroke)', color: 'var(--accent-strong)' }}
            >
              Next
            </button>
          </div>
        </div>
      </AdminSurface>
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
      {prettifyOption(status)}
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
      {prettifyOption(status)}
    </span>
  )
}

function prettifyOption(value: string) {
  return value
    .split('_')
    .join(' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function getInitials(fullName: string) {
  return fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('')
}

function isEligibleForVerification(profile: QueueProfile) {
  return (
    profile.status === 'pending' &&
    profile.missingDocuments.length === 0 &&
    profile.requiredDocuments.every((document) => document.reviewStatus === 'approved')
  )
}
