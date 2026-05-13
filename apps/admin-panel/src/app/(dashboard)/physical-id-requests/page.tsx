'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import api from '@/lib/api'
import {
  AdminEmptyState,
  AdminField,
  AdminFilterBar,
  AdminNotice,
  AdminSurface,
  AdminTableShell,
  AdminTableStat,
} from '@/components/admin/workspace'
import { cn } from '@/utils/cn'

type PhysicalIdRequestStatus =
  | 'pending'
  | 'approved'
  | 'processing'
  | 'ready_for_pickup'
  | 'completed'
  | 'rejected'

interface PhysicalIdRequestSummary {
  id: string
  userId: string
  digitalIdReference: string
  fullName: string
  purok: string
  reason: string
  contactNumber: string
  notes: string
  status: PhysicalIdRequestStatus
  statusLabel: string
  adminRemarks: string | null
  rejectionReason: string | null
  handledBy: string | null
  createdAt: string | null
  updatedAt: string | null
  approvedAt: string | null
  processingAt: string | null
  readyForPickupAt: string | null
  completedAt: string | null
  rejectedAt: string | null
  readyForPickupNotice: string | null
}

interface PhysicalIdRequestDetail extends PhysicalIdRequestSummary {
  allowedActions: PhysicalIdRequestStatus[]
  user: {
    userId: string
    email: string
    userName: string
  }
  profile: {
    firstName: string
    middleName: string
    lastName: string
    suffix: string
    fullName: string
    contactNumber: string
    barangay: string
    city: string
    province: string
    purok: string
    youthAgeGroup: string
    verificationStatus: string
    verifiedAt: string | null
  }
  digitalId: {
    memberId: string
    digitalIdStatus: string
    generatedAt: string | null
    approvedAt: string | null
    deactivatedAt: string | null
  }
}

interface PhysicalIdRequestsResponse {
  requests: PhysicalIdRequestSummary[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
  summary: {
    total: number
    pending: number
    approved: number
    processing: number
    readyForPickup: number
    completed: number
    rejected: number
  }
  filters: {
    purokOptions: string[]
  }
}

const PAGE_SIZE = 10
const STATUS_FILTERS: Array<{ id: string; label: string }> = [
  { id: 'all', label: 'All requests' },
  { id: 'pending', label: 'Pending' },
  { id: 'approved', label: 'Approved' },
  { id: 'processing', label: 'Processing' },
  { id: 'ready_for_pickup', label: 'Ready for Pick-up' },
  { id: 'completed', label: 'Completed' },
  { id: 'rejected', label: 'Rejected' },
]

export default function PhysicalIdRequestsPage() {
  const [requests, setRequests] = useState<PhysicalIdRequestSummary[]>([])
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [selectedRequest, setSelectedRequest] =
    useState<PhysicalIdRequestDetail | null>(null)
  const [status, setStatus] = useState('all')
  const [search, setSearch] = useState('')
  const [purok, setPurok] = useState('all')
  const [requestDate, setRequestDate] = useState('')
  const [draftStatus, setDraftStatus] = useState('all')
  const [draftSearch, setDraftSearch] = useState('')
  const [draftPurok, setDraftPurok] = useState('all')
  const [draftRequestDate, setDraftRequestDate] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pagination, setPagination] = useState<PhysicalIdRequestsResponse['pagination']>({
    page: 1,
    pageSize: PAGE_SIZE,
    total: 0,
    totalPages: 1,
  })
  const [summary, setSummary] = useState<PhysicalIdRequestsResponse['summary']>({
    total: 0,
    pending: 0,
    approved: 0,
    processing: 0,
    readyForPickup: 0,
    completed: 0,
    rejected: 0,
  })
  const [purokOptions, setPurokOptions] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [isActionLoading, setIsActionLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageTone, setMessageTone] = useState<'success' | 'danger' | 'info'>(
    'info'
  )
  const [actionStatus, setActionStatus] = useState<PhysicalIdRequestStatus | null>(null)
  const [actionRemarks, setActionRemarks] = useState('')
  const [actionRejectionReason, setActionRejectionReason] = useState('')
  const [remarksDraft, setRemarksDraft] = useState('')
  const [refreshTick, setRefreshTick] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showAboutCard, setShowAboutCard] = useState(true)
  const hasLoadedRequestsRef = useRef(false)

  const isActionModalOpen = Boolean(actionStatus)
  const selectedRequestPurok =
    selectedRequest?.purok || selectedRequest?.profile.purok || '-'
  const selectedRequestCopyableReference =
    selectedRequest?.digitalIdReference || selectedRequest?.digitalId.memberId || ''
  const selectedRequestReference = selectedRequestCopyableReference || '-'
  const resultRangeStart =
    requests.length === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1
  const resultRangeEnd = Math.min(
    pagination.page * pagination.pageSize,
    pagination.total
  )
  const isRejectionAction = actionStatus === 'rejected'
  const isActionSubmitDisabled =
    isActionLoading || (isRejectionAction && !actionRejectionReason.trim())

  const queryParams = useMemo(
    () => ({
      status: status === 'all' ? '' : status,
      search: search.trim(),
      purok: purok === 'all' ? '' : purok,
      requestDate,
      page: currentPage,
      pageSize: PAGE_SIZE,
    }),
    [currentPage, purok, requestDate, search, status]
  )

  useEffect(() => {
    setCurrentPage(1)
  }, [status, search, purok, requestDate])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const triggerRefresh = () => setRefreshTick((value) => value + 1)
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        triggerRefresh()
      }
    }, 15000)

    window.addEventListener('focus', triggerRefresh)

    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener('focus', triggerRefresh)
    }
  }, [])

  useEffect(() => {
    let mounted = true

    async function loadRequests() {
      if (hasLoadedRequestsRef.current) {
        setIsRefreshing(true)
      } else {
        setIsLoading(true)
      }

      try {
        const res = await api.get<PhysicalIdRequestsResponse>(
          '/admin/physical-id-requests',
          { params: queryParams }
        )

        if (!mounted) return

        const nextRequests = res.data.requests || []
        setRequests(nextRequests)
        setPagination(res.data.pagination)
        setSummary(res.data.summary)
        setPurokOptions(res.data.filters?.purokOptions || [])
        hasLoadedRequestsRef.current = true

        if (nextRequests.length === 0) {
          setSelectedRequestId(null)
          setSelectedRequest(null)
          setIsDetailModalOpen(false)
          return
        }

        if (
          selectedRequestId
          && !nextRequests.some((request) => request.id === selectedRequestId)
        ) {
          setSelectedRequestId(null)
          setSelectedRequest(null)
          setIsDetailModalOpen(false)
        }
      } catch (error: any) {
        if (!mounted) return
        setRequests([])
        setSelectedRequestId(null)
        setSelectedRequest(null)
        setIsDetailModalOpen(false)
        setMessage(
          error?.response?.data?.error || 'Failed to load physical ID requests.'
        )
        setMessageTone('danger')
      } finally {
        if (mounted) {
          setIsLoading(false)
          setIsRefreshing(false)
        }
      }
    }

    void loadRequests()

    return () => {
      mounted = false
    }
  }, [queryParams, refreshTick])

  useEffect(() => {
    if (!selectedRequestId) {
      setSelectedRequest(null)
      return
    }

    if (!isDetailModalOpen) {
      return
    }

    let mounted = true

    async function loadDetail() {
      setIsDetailLoading(true)
      try {
        const res = await api.get<{ request: PhysicalIdRequestDetail }>(
          `/admin/physical-id-requests/${selectedRequestId}`
        )

        if (!mounted) return
        setSelectedRequest(res.data.request)
        setRemarksDraft(res.data.request.adminRemarks || '')
      } catch (error: any) {
        if (!mounted) return
        setSelectedRequest(null)
        setMessage(error?.response?.data?.error || 'Failed to load request details.')
        setMessageTone('danger')
      } finally {
        if (mounted) {
          setIsDetailLoading(false)
        }
      }
    }

    void loadDetail()

    return () => {
      mounted = false
    }
  }, [isDetailModalOpen, selectedRequestId])

  async function refreshData(preferredRequestId?: string | null) {
    const listRes = await api.get<PhysicalIdRequestsResponse>(
      '/admin/physical-id-requests',
      { params: queryParams }
    )
    const nextRequests = listRes.data.requests || []
    setRequests(nextRequests)
    setPagination(listRes.data.pagination)
    setSummary(listRes.data.summary)
    setPurokOptions(listRes.data.filters?.purokOptions || [])

    const requestExists = (requestId: string | null | undefined) =>
      Boolean(requestId && nextRequests.some((request) => request.id === requestId))

    const nextSelectedId = requestExists(preferredRequestId)
      ? preferredRequestId || null
      : requestExists(selectedRequestId)
        ? selectedRequestId
        : null

    setSelectedRequestId(nextSelectedId)

    if (!nextSelectedId) {
      setSelectedRequest(null)
      setIsDetailModalOpen(false)
      return
    }

    const detailRes = await api.get<{ request: PhysicalIdRequestDetail }>(
      `/admin/physical-id-requests/${nextSelectedId}`
    )
    setSelectedRequest(detailRes.data.request)
    setRemarksDraft(detailRes.data.request.adminRemarks || '')
  }

  async function handleCopy(value: string, label: string) {
    if (!value || value === '-') {
      return
    }

    try {
      await navigator.clipboard.writeText(value)
      setMessage(`${label} copied.`)
      setMessageTone('success')
    } catch {
      setMessage(`Could not copy ${label.toLowerCase()}.`)
      setMessageTone('danger')
    }
  }

  const openActionModal = (nextStatus: PhysicalIdRequestStatus) => {
    setActionStatus(nextStatus)
    setActionRemarks(selectedRequest?.adminRemarks || '')
    setActionRejectionReason(selectedRequest?.rejectionReason || '')
  }

  const openDetailModal = (requestId: string) => {
    setSelectedRequestId(requestId)
    setIsDetailModalOpen(true)
  }

  const closeDetailModal = () => {
    setIsDetailModalOpen(false)
  }

  const handleApplyFilters = () => {
    setStatus(draftStatus)
    setSearch(draftSearch)
    setPurok(draftPurok)
    setRequestDate(draftRequestDate)
    setCurrentPage(1)
  }

  const handleClearFilters = () => {
    setDraftStatus('all')
    setDraftSearch('')
    setDraftPurok('all')
    setDraftRequestDate('')
    setStatus('all')
    setSearch('')
    setPurok('all')
    setRequestDate('')
    setCurrentPage(1)
  }

  const closeActionModal = (force = false) => {
    if (isActionLoading && !force) {
      return
    }

    setActionStatus(null)
    setActionRemarks('')
    setActionRejectionReason('')
  }

  const handleActionSubmit = async () => {
    if (!selectedRequest || !actionStatus) {
      return
    }

    setIsActionLoading(true)
    try {
      await api.patch(`/admin/physical-id-requests/${selectedRequest.id}`, {
        status: actionStatus,
        adminRemarks: actionRemarks.trim(),
        rejectionReason:
          actionStatus === 'rejected' ? actionRejectionReason.trim() : '',
      })
      setMessage(buildActionSuccessMessage(actionStatus))
      setMessageTone('success')
      closeActionModal(true)
      await refreshData(selectedRequest.id)
    } catch (error: any) {
      setMessage(error?.response?.data?.error || 'Failed to update the request.')
      setMessageTone('danger')
    } finally {
      setIsActionLoading(false)
    }
  }

  const handleSaveRemarks = async () => {
    if (!selectedRequest) {
      return
    }

    setIsActionLoading(true)
    try {
      await api.patch(`/admin/physical-id-requests/${selectedRequest.id}`, {
        adminRemarks: remarksDraft.trim(),
      })
      setMessage('Admin remarks saved successfully.')
      setMessageTone('success')
      await refreshData(selectedRequest.id)
    } catch (error: any) {
      setMessage(error?.response?.data?.error || 'Failed to save admin remarks.')
      setMessageTone('danger')
    } finally {
      setIsActionLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-[30px] font-black leading-tight" style={{ color: 'var(--ink)' }}>
            Physical ID Requests
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6" style={{ color: 'var(--muted)' }}>
            Manage physical Digital ID copy requests and pick-up workflow.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className="rounded-full border px-3 py-1 text-xs font-semibold"
            style={{
              borderColor: 'var(--stroke)',
              color: 'var(--accent-strong)',
              background: 'var(--card)',
            }}
          >
            Barangay Buting
          </span>
          {isRefreshing ? (
            <span
              className="rounded-full border px-3 py-1 text-xs font-semibold"
              style={{
                borderColor: 'var(--stroke)',
                color: 'var(--muted)',
                background: 'var(--surface-muted)',
              }}
            >
              Refreshing
            </span>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <MetricCard
          label="Total Requests"
          caption="All time requests"
          value={summary.total}
          tone="default"
          icon="clipboard"
        />
        <MetricCard
          label="Pending Review"
          caption="Awaiting approval"
          value={summary.pending}
          tone="warning"
          icon="clock"
        />
        <MetricCard
          label="Processing"
          caption="Being prepared"
          value={summary.processing}
          tone="info"
          icon="gear"
        />
        <MetricCard
          label="Ready for Pick-up"
          caption="For member claim"
          value={summary.readyForPickup}
          tone="success"
          icon="bag"
        />
        <MetricCard
          label="Completed"
          caption="Successfully claimed"
          value={summary.completed}
          tone="royal"
          icon="check"
        />
        <MetricCard
          label="Rejected"
          caption="Not approved"
          value={summary.rejected}
          tone="danger"
          icon="close"
        />
      </div>

      {message ? <AdminNotice tone={messageTone}>{message}</AdminNotice> : null}

      <AdminSurface className="overflow-visible">
        <form
          className="flex flex-col gap-5"
          onSubmit={(event) => {
            event.preventDefault()
            handleApplyFilters()
          }}
        >
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-[24px] font-black" style={{ color: 'var(--ink)' }}>
                Filters
              </h2>
              <p className="mt-1 text-sm leading-6" style={{ color: 'var(--muted)' }}>
                Refine the request list using the filters below.
              </p>
            </div>

            <button
              type="button"
              onClick={handleClearFilters}
              className="inline-flex items-center justify-center gap-2 self-start rounded-xl border px-4 py-2.5 text-sm font-semibold transition hover:bg-[color:var(--surface-muted)]"
              style={{ borderColor: 'var(--stroke)', color: 'var(--accent-strong)' }}
            >
              <ActionGlyph icon="refresh" />
              Reset
            </button>
          </div>

          <AdminFilterBar columns="xl:grid-cols-[minmax(0,0.8fr)_minmax(0,0.8fr)_minmax(0,1.2fr)_minmax(0,0.95fr)_auto]">
            <AdminField label="Status">
              <select
                value={draftStatus}
                onChange={(event) => setDraftStatus(event.target.value)}
                className="surface-input w-full rounded-xl bg-transparent px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[color:var(--accent)]/25"
              >
                <option value="all">All Statuses</option>
                {STATUS_FILTERS.filter((option) => option.id !== 'all').map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </AdminField>

            <AdminField label="Purok">
              <select
                value={draftPurok}
                onChange={(event) => setDraftPurok(event.target.value)}
                className="surface-input w-full rounded-xl bg-transparent px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[color:var(--accent)]/25"
              >
                <option value="all">All Purok</option>
                {purokOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </AdminField>

            <AdminField label="Search">
              <input
                type="text"
                value={draftSearch}
                onChange={(event) => setDraftSearch(event.target.value)}
                placeholder="Search by name, ID, contact number, or purok..."
                className="surface-input w-full rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[color:var(--accent)]/25"
              />
            </AdminField>

            <AdminField label="Request Date">
              <input
                type="date"
                value={draftRequestDate}
                onChange={(event) => setDraftRequestDate(event.target.value)}
                className="surface-input w-full rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[color:var(--accent)]/25"
              />
            </AdminField>

            <AdminField label="Apply">
              <button
                type="submit"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
                style={{ background: 'linear-gradient(135deg,#014384 0%, #0b63bf 100%)' }}
              >
                <ActionGlyph icon="filter" />
                Apply Filters
              </button>
            </AdminField>
          </AdminFilterBar>
        </form>
      </AdminSurface>

      <AdminSurface className="overflow-visible">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-[24px] font-black" style={{ color: 'var(--ink)' }}>
                Requests
              </h2>
              <p className="mt-1 text-sm leading-6" style={{ color: 'var(--muted)' }}>
                {pagination.total} result{pagination.total === 1 ? '' : 's'} found
              </p>
            </div>
          </div>

          {isLoading && requests.length === 0 ? (
            <div className="flex justify-center py-20">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[color:var(--accent)] border-t-transparent" />
            </div>
          ) : requests.length === 0 ? (
            <AdminEmptyState
              title="No physical ID requests matched"
              description="Try broadening the filters or clearing the current search."
            />
          ) : (
            <AdminTableShell>
              <table className="w-full table-fixed">
                <colgroup>
                  <col style={{ width: '24%' }} />
                  <col style={{ width: '22%' }} />
                  <col style={{ width: '8%' }} />
                  <col style={{ width: '12%' }} />
                  <col style={{ width: '11%' }} />
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '13%' }} />
                </colgroup>
                <thead style={{ background: 'var(--accent-soft)' }}>
                  <tr>
                    {[
                      'Requester',
                      'Digital ID Ref',
                      'Purok',
                      'Request Date',
                      'Status',
                      'Updated',
                      'Actions',
                    ].map((heading) => (
                      <th
                        key={heading}
                        className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.16em]"
                        style={{ color: 'var(--muted)' }}
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[color:var(--stroke)]">
                  {requests.map((request) => {
                    const isSelected =
                      isDetailModalOpen && selectedRequestId === request.id
                    const requestDateParts = formatDateParts(request.createdAt)
                    const updatedDateParts = formatDateParts(
                      request.updatedAt || request.createdAt
                    )
                    return (
                      <tr
                        key={request.id}
                        className={cn(
                          'transition-colors',
                          isSelected
                            ? 'bg-[color:var(--accent-soft)]'
                            : 'hover:bg-[color:var(--accent-soft)]/70'
                        )}
                      >
                        <td className="overflow-hidden px-3 py-3 align-top">
                          <div className="flex items-start gap-2.5">
                            <RequestAvatar name={request.fullName} />
                            <div className="min-w-0 flex-1">
                              <p
                                className="truncate text-[13px] font-semibold leading-5"
                                style={{ color: 'var(--ink)' }}
                                title={request.fullName}
                              >
                                {request.fullName}
                              </p>
                              <div
                                className="mt-0.5 flex items-center gap-1.5 text-[11px]"
                                style={{ color: 'var(--muted)' }}
                              >
                                <span
                                  className="truncate"
                                  title={request.contactNumber || 'No contact number'}
                                >
                                  {request.contactNumber || 'No contact number'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="overflow-hidden px-3 py-3 align-top">
                          <div className="min-w-0">
                            <p
                              className="truncate text-[13px] font-medium leading-5"
                              style={{ color: 'var(--ink-soft)' }}
                              title={
                                request.digitalIdReference || 'No Digital ID reference'
                              }
                            >
                              {request.digitalIdReference || 'No Digital ID reference'}
                            </p>
                            <p
                              className="mt-0.5 truncate text-[11px]"
                              style={{ color: 'var(--muted)' }}
                              title={request.userId}
                            >
                              {request.userId}
                            </p>
                          </div>
                        </td>
                        <td className="overflow-hidden px-3 py-3 align-top">
                          <p
                            className="truncate text-[13px] leading-5"
                            style={{ color: 'var(--ink)' }}
                            title={request.purok || '-'}
                          >
                            {request.purok || '-'}
                          </p>
                        </td>
                        <td className="overflow-hidden px-3 py-3 align-top">
                          <DateMeta
                            date={requestDateParts.date}
                            time={requestDateParts.time}
                          />
                        </td>
                        <td className="overflow-hidden px-3 py-3 align-top">
                          <CompactStatusPill tone={getRequestTone(request.status)}>
                            {request.statusLabel}
                          </CompactStatusPill>
                        </td>
                        <td className="overflow-hidden px-3 py-3 align-top">
                          <DateMeta
                            date={updatedDateParts.date}
                            time={updatedDateParts.time}
                          />
                        </td>
                        <td className="overflow-hidden px-3 py-3 align-top">
                          <div className="flex justify-start xl:justify-end">
                            <button
                              type="button"
                              onClick={() => openDetailModal(request.id)}
                              className="inline-flex min-w-[116px] items-center justify-center gap-1 whitespace-nowrap rounded-lg border px-2.5 py-1.5 text-[13px] font-semibold transition hover:bg-[color:var(--accent-soft)]"
                              style={{
                                borderColor: 'var(--stroke)',
                                color: 'var(--accent-strong)',
                              }}
                            >
                              View Details
                              <ActionGlyph icon="chevron-right" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </AdminTableShell>
          )}

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-sm leading-6" style={{ color: 'var(--muted)' }}>
              Showing {resultRangeStart}-{resultRangeEnd} of {pagination.total} results
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
              <span
                className="rounded-lg px-3 py-2 text-sm font-semibold"
                style={{
                  background: 'var(--accent-soft)',
                  color: 'var(--accent-strong)',
                }}
              >
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                type="button"
                onClick={() =>
                  setCurrentPage((page) => Math.min(pagination.totalPages, page + 1))
                }
                disabled={pagination.page === pagination.totalPages}
                className="rounded-lg border px-3 py-2 text-sm disabled:opacity-40"
                style={{ borderColor: 'var(--stroke)', color: 'var(--accent-strong)' }}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </AdminSurface>

      {showAboutCard ? (
        <AdminSurface tone="default">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full"
                style={{
                  background: 'linear-gradient(135deg,rgba(5,114,220,0.12),rgba(1,67,132,0.18))',
                  color: 'var(--accent)',
                }}
              >
              <ActionGlyph icon="info" />
            </div>
            <div>
                <h3 className="text-lg font-bold" style={{ color: 'var(--ink)' }}>
                  About Physical ID Requests
                </h3>
                <p className="mt-1 text-sm leading-6" style={{ color: 'var(--muted)' }}>
                  Members request physical copies of their Digital ID for official
                  use. Approve, prepare, and mark as ready once the ID is available
                  for pick-up.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowAboutCard(false)}
              className="rounded-xl border p-2 transition hover:bg-[color:var(--surface-muted)]"
              style={{ borderColor: 'var(--stroke)', color: 'var(--muted)' }}
              aria-label="Dismiss about card"
            >
              <ActionGlyph icon="x" />
            </button>
          </div>
        </AdminSurface>
      ) : null}

      {isDetailModalOpen ? (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center px-4 py-6"
          style={{ background: 'rgba(15,23,42,0.42)', backdropFilter: 'blur(10px)' }}
        >
          <div
            className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[28px] border shadow-[var(--shadow-lg)]"
            style={{ background: 'var(--card-solid)', borderColor: 'var(--stroke)' }}
          >
            <div
              className="flex items-start justify-between gap-4 border-b px-6 py-5"
              style={{ borderColor: 'var(--stroke)' }}
            >
              <div>
                <p
                  className="text-xs font-semibold uppercase tracking-[0.18em]"
                  style={{ color: 'var(--muted)' }}
                >
                  Request Review
                </p>
                <h2 className="mt-1 text-[28px] font-black" style={{ color: 'var(--ink)' }}>
                  Request Details
                </h2>
                <p className="mt-2 text-sm leading-6" style={{ color: 'var(--muted)' }}>
                  Review the selected request, save remarks, and move it through the
                  next valid workflow step.
                </p>
              </div>
              <button
                type="button"
                onClick={closeDetailModal}
                className="rounded-2xl border p-3 transition hover:bg-[color:var(--surface-muted)]"
                style={{ borderColor: 'var(--stroke)', color: 'var(--accent-strong)' }}
                aria-label="Close request details"
              >
                <ActionGlyph icon="x" />
              </button>
            </div>

            <div className="overflow-y-auto px-6 py-6">
              {isDetailLoading ? (
                <div className="flex justify-center py-24">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-[color:var(--accent)] border-t-transparent" />
                </div>
              ) : !selectedRequest ? (
                <AdminEmptyState
                  title="No request selected"
                  description="Choose a request from the queue to open its member context and workflow actions."
                />
              ) : (
                <div className="space-y-5">
                  <div
                    className="rounded-[24px] border px-5 py-5"
                    style={{
                      borderColor: 'var(--stroke)',
                      background: 'var(--card-solid)',
                    }}
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <p
                          className="truncate text-xl font-black"
                          style={{ color: 'var(--ink)' }}
                          title={selectedRequest.fullName}
                        >
                          {selectedRequest.fullName}
                        </p>
                        <p
                          className="mt-1 truncate text-sm"
                          style={{ color: 'var(--muted)' }}
                          title={
                            selectedRequest.user.email ||
                            selectedRequest.user.userName ||
                            selectedRequest.user.userId
                          }
                        >
                          {selectedRequest.user.email ||
                            selectedRequest.user.userName ||
                            selectedRequest.user.userId}
                        </p>
                      </div>
                      <AdminTableStat tone={getRequestTone(selectedRequest.status)}>
                        {selectedRequest.statusLabel}
                      </AdminTableStat>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <InlineMeta value={`Purok: ${selectedRequestPurok}`} />
                      <InlineMeta
                        value={`Updated: ${formatDateTime(
                          selectedRequest.updatedAt || selectedRequest.createdAt
                        )}`}
                      />
                      <InlineMeta value="Barangay Buting" />
                    </div>
                  </div>

                  {selectedRequest.readyForPickupNotice ? (
                    <AdminNotice tone="success">
                      {selectedRequest.readyForPickupNotice}
                    </AdminNotice>
                  ) : null}

                  {selectedRequest.rejectionReason ? (
                    <AdminNotice tone="danger">
                      Rejection reason: {selectedRequest.rejectionReason}
                    </AdminNotice>
                  ) : null}

                    <div className="grid items-start gap-4 xl:grid-cols-2">
                    <DetailSection title="Member Info">
                      <DetailRow
                        label="Full name"
                        value={
                          selectedRequest.profile.fullName ||
                          selectedRequest.fullName ||
                          '-'
                        }
                      />
                      <DetailRow
                        label="Email / username"
                        value={
                          selectedRequest.user.email ||
                          selectedRequest.user.userName ||
                          '-'
                        }
                      />
                      <DetailRow
                        label="User ID"
                        value={selectedRequest.userId}
                        copyValue={selectedRequest.userId}
                        onCopy={handleCopy}
                      />
                      <DetailRow
                        label="Contact number"
                        value={
                          selectedRequest.contactNumber ||
                          selectedRequest.profile.contactNumber ||
                          '-'
                        }
                        copyValue={
                          selectedRequest.contactNumber ||
                          selectedRequest.profile.contactNumber ||
                          ''
                        }
                        onCopy={handleCopy}
                      />
                      <DetailRow label="Purok / Zone" value={selectedRequestPurok} />
                      <DetailRow
                        label="City / Province"
                        value={buildCityProvince(
                          selectedRequest.profile.city,
                          selectedRequest.profile.province
                        )}
                      />
                    </DetailSection>

                    <DetailSection title="Request Info">
                      <DetailRow
                        label="Digital ID ref"
                        value={selectedRequestReference}
                        copyValue={selectedRequestCopyableReference}
                        onCopy={handleCopy}
                      />
                      <DetailRow
                        label="Request date"
                        value={formatDateTime(selectedRequest.createdAt)}
                      />
                      <DetailRow
                        label="Last updated"
                        value={formatDateTime(
                          selectedRequest.updatedAt || selectedRequest.createdAt
                        )}
                      />
                      <DetailRow label="Purok / Zone" value={selectedRequestPurok} />
                      <DetailTextBlock
                        title="Reason for request"
                        value={selectedRequest.reason}
                      />
                      {selectedRequest.notes ? (
                        <DetailTextBlock
                          title="Member notes"
                          value={selectedRequest.notes}
                        />
                      ) : null}
                    </DetailSection>

                    <DetailSection title="Digital ID Info">
                      <DetailRow
                        label="Member ID"
                        value={selectedRequest.digitalId.memberId || '-'}
                        copyValue={selectedRequest.digitalId.memberId || ''}
                        onCopy={handleCopy}
                      />
                      <DetailRow
                        label="Digital ID status"
                        value={prettifyStatus(
                          selectedRequest.digitalId.digitalIdStatus
                        )}
                      />
                      <DetailRow
                        label="Generated at"
                        value={formatDateTime(selectedRequest.digitalId.generatedAt)}
                      />
                      <DetailRow
                        label="Approved at"
                        value={formatDateTime(selectedRequest.digitalId.approvedAt)}
                      />
                      <DetailRow
                        label="Handled by"
                        value={selectedRequest.handledBy || 'Not assigned yet'}
                      />
                    </DetailSection>

                    <DetailSection
                      title="Admin Remarks"
                      action={
                        <button
                          type="button"
                          onClick={handleSaveRemarks}
                          disabled={isActionLoading}
                          className="rounded-xl border px-4 py-2 text-sm font-semibold disabled:opacity-60"
                          style={{
                            borderColor: 'var(--stroke)',
                            color: 'var(--accent-strong)',
                          }}
                        >
                          Save remarks
                        </button>
                      }
                    >
                      <textarea
                        value={remarksDraft}
                        onChange={(event) => setRemarksDraft(event.target.value)}
                        rows={6}
                        className="surface-input w-full rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[color:var(--accent)]/25"
                        placeholder="Add internal handling notes, pick-up instructions, or review context."
                      />
                    </DetailSection>
                  </div>

                  <DetailSection title="Workflow Actions">
                    {selectedRequest.allowedActions.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {selectedRequest.allowedActions.map((nextStatus) => (
                          <button
                            key={nextStatus}
                            type="button"
                            onClick={() => openActionModal(nextStatus)}
                            className="rounded-full px-3 py-2 text-xs font-semibold transition hover:opacity-85"
                            style={{
                              background: getActionButtonBackground(nextStatus),
                              color: getActionButtonColor(nextStatus),
                            }}
                          >
                            {buildActionLabel(nextStatus)}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p
                        className="text-sm leading-6"
                        style={{ color: 'var(--muted)' }}
                      >
                        No further workflow actions are available for this request.
                      </p>
                    )}
                  </DetailSection>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {isActionModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: 'rgba(15,23,42,0.42)', backdropFilter: 'blur(10px)' }}
        >
          <div
            className="w-full max-w-lg rounded-[24px] border p-6 shadow-[var(--shadow-lg)]"
            style={{ background: 'var(--card-solid)', borderColor: 'var(--stroke)' }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold" style={{ color: 'var(--ink)' }}>
                  {buildActionModalTitle(actionStatus)}
                </h2>
                <p className="mt-1 text-sm leading-6" style={{ color: 'var(--muted)' }}>
                  {actionStatus === 'rejected'
                    ? 'Rejections must include a reason before the request can be closed.'
                    : 'Confirm the next workflow step and save any supporting remarks.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => closeActionModal()}
                className="rounded-xl border px-3 py-2 text-xs font-semibold"
                style={{ borderColor: 'var(--stroke)', color: 'var(--muted)' }}
              >
                Close
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div
                className="rounded-2xl border px-4 py-4"
                style={{ borderColor: 'var(--stroke)', background: 'var(--surface-muted)' }}
              >
                <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                  {selectedRequest?.fullName || 'Selected request'}
                </p>
                <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>
                  Current status: {selectedRequest?.statusLabel || '-'}
                </p>
              </div>

              {actionStatus === 'rejected' ? (
                <div>
                  <label
                    className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em]"
                    style={{ color: 'var(--muted)' }}
                  >
                    Rejection reason
                  </label>
                  <textarea
                    value={actionRejectionReason}
                    onChange={(event) => setActionRejectionReason(event.target.value)}
                    rows={3}
                    className="surface-input w-full rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[color:var(--accent)]/25"
                    placeholder="Explain why this request cannot move forward."
                  />
                </div>
              ) : null}

              <div>
                <label
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em]"
                  style={{ color: 'var(--muted)' }}
                >
                  Admin remarks
                </label>
                <textarea
                  value={actionRemarks}
                  onChange={(event) => setActionRemarks(event.target.value)}
                  rows={4}
                  className="surface-input w-full rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[color:var(--accent)]/25"
                  placeholder="Optional remarks to save together with this status update."
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => closeActionModal()}
                disabled={isActionLoading}
                className="rounded-xl border px-4 py-2.5 text-sm font-semibold disabled:opacity-60"
                style={{ borderColor: 'var(--stroke)', color: 'var(--ink-soft)' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleActionSubmit}
                disabled={isActionSubmitDisabled}
                className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                style={{ background: 'var(--accent)' }}
              >
                {isActionLoading ? 'Saving...' : buildActionConfirmLabel(actionStatus)}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function MetricCard({
  label,
  caption,
  value,
  tone,
  icon,
}: {
  label: string
  caption: string
  value: number
  tone: 'default' | 'warning' | 'info' | 'success' | 'royal' | 'danger'
  icon: 'clipboard' | 'clock' | 'gear' | 'bag' | 'check' | 'close'
}) {
  const toneMap = {
    default: {
      accent: '#0f5eb3',
      iconBackground: 'rgba(15,94,179,0.10)',
    },
    warning: {
      accent: '#c58b08',
      iconBackground: 'rgba(197,139,8,0.12)',
    },
    info: {
      accent: '#2269d7',
      iconBackground: 'rgba(34,105,215,0.10)',
    },
    success: {
      accent: '#23a060',
      iconBackground: 'rgba(35,160,96,0.10)',
    },
    royal: {
      accent: '#4864e8',
      iconBackground: 'rgba(72,100,232,0.10)',
    },
    danger: {
      accent: '#dc4b4b',
      iconBackground: 'rgba(220,75,75,0.10)',
    },
  } satisfies Record<string, { accent: string; iconBackground: string }>

  const palette = toneMap[tone]

  return (
    <div
      className="rounded-[24px] border bg-white px-4 py-4 shadow-[var(--shadow-sm)]"
      style={{
        borderColor: 'var(--stroke)',
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[18px]"
          style={{
            background: palette.iconBackground,
            color: palette.accent,
          }}
        >
          <ActionGlyph icon={icon} />
        </div>

        <div className="min-w-0">
          <p className="text-[15px] font-semibold leading-6" style={{ color: 'var(--ink)' }}>
            {label}
          </p>
          <p className="mt-2 text-[30px] font-black leading-none" style={{ color: 'var(--ink)' }}>
            {value}
          </p>
          <p className="mt-2 text-sm leading-6" style={{ color: 'var(--muted)' }}>
            {caption}
          </p>
        </div>
      </div>
    </div>
  )
}

function CopyInlineButton({
  label,
  onClick,
}: {
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation()
        onClick()
      }}
      className="shrink-0 rounded-lg border p-1.5 transition hover:bg-[color:var(--accent-soft)]"
      style={{ borderColor: 'var(--stroke)', color: 'var(--accent-strong)' }}
      title={`Copy ${label}`}
      aria-label={`Copy ${label}`}
    >
      <ActionGlyph icon="copy" />
    </button>
  )
}

function RequestAvatar({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('')

  return (
    <div
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-[11px] font-black"
      style={{
        borderColor: '#d7e6f8',
        background: 'linear-gradient(135deg,rgba(5,114,220,0.12),rgba(1,67,132,0.18))',
        color: 'var(--accent-strong)',
      }}
    >
      {initials || 'KK'}
    </div>
  )
}

function DateMeta({ date, time }: { date: string; time: string }) {
  return (
    <div className="space-y-0.5 text-[11px] leading-5">
      <p className="font-medium" style={{ color: 'var(--ink-soft)' }}>
        {date}
      </p>
      <p style={{ color: 'var(--muted)' }}>{time || '-'}</p>
    </div>
  )
}

function CompactStatusPill({
  children,
  tone,
}: {
  children: React.ReactNode
  tone: 'default' | 'warning' | 'success' | 'danger'
}) {
  const toneMap = {
    default: {
      border: '#d5e4f6',
      background: '#f3f8ff',
      color: '#0d5eb6',
    },
    warning: {
      border: '#efd9a8',
      background: '#fff7e4',
      color: '#8f7836',
    },
    success: {
      border: '#cfe7d7',
      background: '#eefaf2',
      color: '#23724a',
    },
    danger: {
      border: '#efcdcd',
      background: '#fff1f1',
      color: '#bf4747',
    },
  } as const

  const palette = toneMap[tone]

  return (
    <span
      className="inline-flex whitespace-nowrap rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]"
      style={{
        borderColor: palette.border,
        background: palette.background,
        color: palette.color,
      }}
    >
      {children}
    </span>
  )
}

function InlineMeta({ value }: { value: string }) {
  return (
    <span
      className="rounded-full border px-3 py-1 text-xs font-medium"
      style={{
        borderColor: 'var(--stroke)',
        background: 'var(--surface-muted)',
        color: 'var(--muted)',
      }}
    >
      {value}
    </span>
  )
}

function DetailSection({
  title,
  action,
  children,
}: {
  title: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div
      className="rounded-[24px] border px-4 py-4"
      style={{
        borderColor: 'var(--stroke)',
        background: 'var(--card-solid)',
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
          {title}
        </p>
        {action}
      </div>
      <div className="mt-4 space-y-3">{children}</div>
    </div>
  )
}

function DetailRow({
  label,
  value,
  copyValue,
  onCopy,
}: {
  label: string
  value: string
  copyValue?: string
  onCopy?: (value: string, label: string) => void | Promise<void>
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span
        className="text-xs font-semibold uppercase tracking-[0.16em]"
        style={{ color: 'var(--muted)' }}
      >
        {label}
      </span>
      <div className="flex max-w-[65%] items-start justify-end gap-2">
        <span
          className="break-words text-right text-sm leading-6"
          style={{ color: 'var(--ink-soft)' }}
          title={value}
        >
          {value}
        </span>
        {copyValue && onCopy ? (
          <CopyInlineButton
            label={label}
            onClick={() => {
              void onCopy(copyValue, label)
            }}
          />
        ) : null}
      </div>
    </div>
  )
}

function DetailTextBlock({
  title,
  value,
}: {
  title: string
  value: string
}) {
  return (
    <div
      className="rounded-xl border px-4 py-3"
      style={{ borderColor: 'var(--stroke)', background: 'color-mix(in srgb, var(--card-solid) 96%, var(--surface-muted) 4%)' }}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--muted)' }}>
        {title}
      </p>
      <p className="mt-2 text-sm leading-6" style={{ color: 'var(--ink-soft)' }}>
        {value}
      </p>
    </div>
  )
}

function ActionGlyph({
  icon,
}: {
  icon:
    | 'clipboard'
    | 'clock'
    | 'gear'
    | 'bag'
    | 'check'
    | 'close'
    | 'x'
    | 'refresh'
    | 'filter'
    | 'chevron-right'
    | 'info'
    | 'copy'
}) {
  const commonProps = {
    fill: 'none',
    stroke: 'currentColor',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    strokeWidth: 1.9,
  }

  if (icon === 'clipboard') {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <path {...commonProps} d="M9 4h6m-5 3h4m-7 2h10m-9 4h8m-9 4h8" />
        <path
          {...commonProps}
          d="M9 4.5h6a1 1 0 0 1 1 1V7H8V5.5a1 1 0 0 1 1-1Z"
        />
        <path {...commonProps} d="M7 7H6.5A1.5 1.5 0 0 0 5 8.5v10A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5v-10A1.5 1.5 0 0 0 17.5 7H17" />
      </svg>
    )
  }

  if (icon === 'clock') {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <circle {...commonProps} cx="12" cy="12" r="8.5" />
        <path {...commonProps} d="M12 7.5v4.8l3.2 1.9" />
      </svg>
    )
  }

  if (icon === 'gear') {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <circle {...commonProps} cx="12" cy="12" r="3" />
        <path {...commonProps} d="M12 5v2.1M12 16.9V19M5 12h2.1M16.9 12H19M7.1 7.1l1.5 1.5M15.4 15.4l1.5 1.5M16.9 7.1l-1.5 1.5M8.6 15.4l-1.5 1.5" />
      </svg>
    )
  }

  if (icon === 'bag') {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <path {...commonProps} d="M6 9h12l-.8 9.3a1.8 1.8 0 0 1-1.8 1.7H8.6a1.8 1.8 0 0 1-1.8-1.7L6 9Z" />
        <path {...commonProps} d="M9 9V7.8A3 3 0 0 1 12 4.8a3 3 0 0 1 3 3V9" />
      </svg>
    )
  }

  if (icon === 'check') {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <circle {...commonProps} cx="12" cy="12" r="8.5" />
        <path {...commonProps} d="m8.8 12.3 2.1 2.1 4.4-4.9" />
      </svg>
    )
  }

  if (icon === 'close') {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <circle {...commonProps} cx="12" cy="12" r="8.5" />
        <path {...commonProps} d="m9 9 6 6m0-6-6 6" />
      </svg>
    )
  }

  if (icon === 'x') {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <path {...commonProps} d="m7 7 10 10M17 7 7 17" />
      </svg>
    )
  }

  if (icon === 'refresh') {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
        <path {...commonProps} d="M20 11a8 8 0 0 0-13.7-5.7M4 5v4h4" />
        <path {...commonProps} d="M4 13a8 8 0 0 0 13.7 5.7M20 19v-4h-4" />
      </svg>
    )
  }

  if (icon === 'filter') {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
        <path {...commonProps} d="M4 7h10m3 0h3M4 17h3m3 0h10M11 7a2 2 0 1 1 4 0 2 2 0 0 1-4 0Zm-4 10a2 2 0 1 1 4 0 2 2 0 0 1-4 0Z" />
      </svg>
    )
  }

  if (icon === 'chevron-right') {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
        <path {...commonProps} d="m10 7 5 5-5 5" />
      </svg>
    )
  }

  if (icon === 'info') {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <circle {...commonProps} cx="12" cy="12" r="8.5" />
        <path {...commonProps} d="M12 10.5v5m0-8h.01" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        {...commonProps}
        d="M8 8h8v10H8zM8 6.5h5l3 3M10 11h4m-4 3h4"
      />
    </svg>
  )
}

function getRequestTone(status: PhysicalIdRequestStatus) {
  if (status === 'pending') return 'warning'
  if (status === 'approved' || status === 'processing') return 'default'
  if (status === 'ready_for_pickup' || status === 'completed') return 'success'
  return 'danger'
}

function formatDateParts(value: string | null) {
  if (!value) {
    return { date: '-', time: '' }
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return { date: '-', time: '' }
  }

  return {
    date: date.toLocaleDateString('en-PH', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }),
    time: date.toLocaleTimeString('en-PH', {
      hour: '2-digit',
      minute: '2-digit',
    }),
  }
}

function formatDateTime(value: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'

  return date.toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function prettifyStatus(value: string) {
  if (!value) return '-'
  return value
    .split('_')
    .join(' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function buildCityProvince(city: string, province: string) {
  const parts = [city, province].filter(Boolean)
  return parts.length > 0 ? parts.join(', ') : '-'
}

function buildActionLabel(status: PhysicalIdRequestStatus) {
  if (status === 'approved') return 'Approve request'
  if (status === 'processing') return 'Mark as processing'
  if (status === 'ready_for_pickup') return 'Mark ready for pick-up'
  if (status === 'completed') return 'Mark as completed'
  return 'Reject request'
}

function buildActionModalTitle(status: PhysicalIdRequestStatus | null) {
  if (!status) return 'Update physical ID request'
  return buildActionLabel(status)
}

function buildActionConfirmLabel(status: PhysicalIdRequestStatus | null) {
  if (!status) return 'Confirm update'
  if (status === 'approved') return 'Approve request'
  if (status === 'processing') return 'Start processing'
  if (status === 'ready_for_pickup') return 'Mark ready for pick-up'
  if (status === 'completed') return 'Mark completed'
  return 'Reject request'
}

function buildActionSuccessMessage(status: PhysicalIdRequestStatus) {
  if (status === 'approved') return 'Physical ID request approved successfully.'
  if (status === 'processing') return 'Physical ID request moved to processing.'
  if (status === 'ready_for_pickup') return 'Physical ID request marked as ready for pick-up.'
  if (status === 'completed') return 'Physical ID request marked as completed.'
  return 'Physical ID request rejected successfully.'
}

function getActionButtonBackground(status: PhysicalIdRequestStatus) {
  if (status === 'rejected') return '#fff1f1'
  if (status === 'ready_for_pickup' || status === 'completed') return '#eefaf2'
  if (status === 'approved') return '#edf5ff'
  return '#f3f8ff'
}

function getActionButtonColor(status: PhysicalIdRequestStatus) {
  if (status === 'rejected') return '#bf4747'
  if (status === 'ready_for_pickup' || status === 'completed') return '#23724a'
  return '#0d5eb6'
}
