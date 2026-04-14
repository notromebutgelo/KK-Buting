'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import api from '@/lib/api'
import Spinner from '@/components/ui/Spinner'
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

    loadQueue()
    return () => {
      mounted = false
    }
  }, [queryParams])

  const allVisibleSelected =
    profiles.length > 0 && profiles.every((profile) => selectedIds.includes(profile.userId))

  const readyToApproveIds = profiles
    .filter((profile) => isEligibleForVerification(profile))
    .map((profile) => profile.userId)

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

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-black text-[color:var(--kk-primary)]">Verification Queue</h1>
          <p className="mt-1 text-sm text-[color:var(--kk-muted)]">
            Review submitted requirements, flag resubmissions, and unlock digital IDs after full approval.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={!isSuperadmin || isBulkApproving || selectedIds.length === 0 || selectedIds.every((id) => !readyToApproveIds.includes(id))}
            onClick={handleBulkApprove}
            className="rounded-xl bg-[linear-gradient(90deg,#014384_0%,#0572DC_100%)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm disabled:opacity-50"
          >
            {isBulkApproving ? 'Bulk approving...' : 'Bulk Approve Ready Submissions'}
          </button>
        </div>
      </div>

      {message ? (
        <div className="rounded-xl border border-[color:var(--kk-border)] bg-[#eef5fd] px-4 py-3 text-sm text-[color:var(--kk-primary)]">
          {message}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryTile label="Total in Queue" value={summary?.total || pagination.total} />
        <SummaryTile label="Pending" value={summary?.pending || 0} tone="pending" />
        <SummaryTile label="In Review" value={summary?.inReview || 0} tone="review" />
        <SummaryTile label="Resubmission" value={summary?.resubmissionRequested || 0} tone="resubmission" />
      </div>

      <div className="rounded-[28px] border border-[color:var(--kk-border)] bg-white/95 p-5 shadow-[0_14px_34px_rgba(1,67,132,0.08)]">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          <SearchInput value={search} onChange={setSearch} />
          <FilterSelect label="Queue Status" value={status} onChange={setStatus} options={['all', 'pending', 'in_review', 'resubmission_requested']} />
          <FilterSelect label="Age Group" value={ageGroup} onChange={setAgeGroup} options={['all', ...ageGroupOptions]} />
          <FilterSelect label="Document Type" value={documentType} onChange={setDocumentType} options={['all', ...documentTypeOptions]} />
          <DateInput label="Date Submitted" value={dateSubmitted} onChange={setDateSubmitted} />
        </div>
      </div>

      <div className="overflow-hidden rounded-[28px] border border-[color:var(--kk-border)] bg-white shadow-[0_14px_34px_rgba(1,67,132,0.08)]">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Spinner size="lg" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1180px] w-full">
              <thead className="bg-[#eef5fd]">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input type="checkbox" checked={allVisibleSelected} onChange={toggleSelectAllVisible} />
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--kk-muted)]">Youth Member</th>
                  <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--kk-muted)]">Age Group</th>
                  <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--kk-muted)]">Required Documents</th>
                  <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--kk-muted)]">Queue Status</th>
                  <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--kk-muted)]">Submitted</th>
                  <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--kk-muted)]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eef2f7]">
                {profiles.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-14 text-center text-sm text-[color:var(--kk-muted)]">
                      No verification submissions matched the current filters.
                    </td>
                  </tr>
                ) : (
                  profiles.map((profile) => (
                    <tr key={profile.userId} className="hover:bg-[#fffaf0]">
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(profile.userId)}
                          onChange={() => toggleSelectOne(profile.userId)}
                        />
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-[#eef5fd]">
                            {profile.idPhotoUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={profile.idPhotoUrl} alt={profile.fullName} className="h-full w-full object-cover" />
                            ) : (
                              <span className="text-sm font-bold text-[color:var(--kk-primary)]">
                                {getInitials(profile.fullName)}
                              </span>
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-[color:var(--kk-primary)]">{profile.fullName || `${profile.firstName} ${profile.lastName}`}</p>
                            <p className="text-xs text-[color:var(--kk-muted)]">
                              {profile.email || 'No email'} | {profile.contactNumber || 'No contact'}
                            </p>
                            <p className="text-xs text-[color:var(--kk-muted)]">
                              {profile.barangay || '-'}, {profile.city || '-'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-[color:var(--kk-ink)]">
                        <div>{profile.youthAgeGroup || '-'}</div>
                        <div className="text-xs text-[color:var(--kk-muted)]">
                          {profile.age ? `${profile.age} years old` : 'Age unavailable'}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="space-y-2">
                          {profile.requiredDocuments.map((document) => (
                            <div key={document.documentType} className="flex items-center justify-between gap-3 text-sm">
                              <span className="text-[color:var(--kk-ink)]">{document.label}</span>
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
                      <td className="px-5 py-4 text-sm text-[color:var(--kk-muted)]">
                        {profile.submittedAt ? new Date(profile.submittedAt).toLocaleDateString('en-PH') : '-'}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-col items-start gap-2">
                          <Link
                            href={`/verification/${profile.userId}`}
                            className="font-semibold text-[color:var(--kk-primary-2)] hover:text-[color:var(--kk-primary)]"
                          >
                            Review Submission
                          </Link>
                          {isEligibleForVerification(profile) ? (
                            <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">
                              Ready to verify
                            </span>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 rounded-[24px] border border-[color:var(--kk-border)] bg-white px-5 py-4 shadow-sm md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-[color:var(--kk-muted)]">
          Showing {profiles.length === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1}-
          {Math.min(pagination.page * pagination.pageSize, pagination.total)} of {pagination.total} submissions
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            disabled={pagination.page === 1}
            className="rounded-lg border border-[color:var(--kk-border)] px-3 py-2 text-sm text-[color:var(--kk-primary)] disabled:opacity-40"
          >
            Previous
          </button>
          <span className="px-2 text-sm font-semibold text-[color:var(--kk-primary)]">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button
            type="button"
            onClick={() => setCurrentPage((page) => Math.min(pagination.totalPages, page + 1))}
            disabled={pagination.page === pagination.totalPages}
            className="rounded-lg border border-[color:var(--kk-border)] px-3 py-2 text-sm text-[color:var(--kk-primary)] disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )
}

function SearchInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="xl:col-span-2">
      <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--kk-muted)]">
        Search Queue
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Name, email, contact, or city"
        className="w-full rounded-xl border border-[color:var(--kk-border)] px-4 py-2.5 text-sm text-[color:var(--kk-ink)] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[color:var(--kk-primary-2)]"
      />
    </div>
  )
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: string[]
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--kk-muted)]">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-[color:var(--kk-border)] bg-white px-4 py-2.5 text-sm text-[color:var(--kk-ink)] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[color:var(--kk-primary-2)]"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option === 'all' ? 'All' : prettifyOption(option)}
          </option>
        ))}
      </select>
    </div>
  )
}

function DateInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--kk-muted)]">
        {label}
      </label>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-[color:var(--kk-border)] px-4 py-2.5 text-sm text-[color:var(--kk-ink)] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[color:var(--kk-primary-2)]"
      />
    </div>
  )
}

function SummaryTile({ label, value, tone = 'default' }: { label: string; value: number; tone?: 'default' | 'pending' | 'review' | 'resubmission' }) {
  const bg =
    tone === 'pending'
      ? 'bg-[#fff3cf]'
      : tone === 'review'
        ? 'bg-[#eef5fd]'
        : tone === 'resubmission'
          ? 'bg-red-50'
          : 'bg-white'

  return (
    <div className={cn('rounded-[22px] border border-[color:var(--kk-border)] px-4 py-4 shadow-sm', bg)}>
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--kk-muted)]">{label}</p>
      <p className="mt-2 text-2xl font-black text-[color:var(--kk-primary)]">{value.toLocaleString()}</p>
    </div>
  )
}

function QueueStatusBadge({ status }: { status: string }) {
  const className =
    status === 'pending'
      ? 'bg-[#fff3cf] text-[#9b6500]'
      : status === 'in_review'
        ? 'bg-[#eef5fd] text-[color:var(--kk-primary)]'
        : status === 'resubmission_requested'
          ? 'bg-red-100 text-red-700'
          : 'bg-slate-100 text-slate-700'

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
            : 'bg-[#fff3cf] text-[#9b6500]'

  return (
    <span className={cn('inline-flex rounded-full px-2 py-1 text-[11px] font-semibold', className)}>
      {prettifyOption(status)}
    </span>
  )
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

function isEligibleForVerification(profile: QueueProfile) {
  return (
    profile.status === 'pending' &&
    profile.missingDocuments.length === 0 &&
    profile.requiredDocuments.every((document) => document.reviewStatus === 'approved')
  )
}
