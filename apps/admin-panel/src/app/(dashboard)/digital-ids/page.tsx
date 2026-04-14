'use client'

import { useEffect, useMemo, useState } from 'react'
import jsPDF from 'jspdf'
import JSZip from 'jszip'
import QRCode from 'qrcode'
import api from '@/lib/api'
import Spinner from '@/components/ui/Spinner'
import { cn } from '@/utils/cn'

interface DigitalIdMember {
  uid: string
  UserName?: string
  email?: string
  firstName?: string
  lastName?: string
  fullName?: string
  youthAgeGroup?: string
  city?: string
  province?: string
  barangay?: string
  verifiedAt?: string
  memberId?: string
  digitalIdStatus: 'draft' | 'pending_approval' | 'active' | 'deactivated'
  digitalIdRevision?: number
  digitalIdGeneratedAt?: string
  digitalIdApprovedAt?: string
  digitalIdDeactivatedAt?: string
  hasDigitalId?: boolean
  profilePhotoUrl?: string | null
}

interface DigitalIdDetail extends DigitalIdMember {
  photoUrl?: string | null
  profile?: {
    firstName?: string
    middleName?: string
    lastName?: string
    suffix?: string
    birthday?: string
    gender?: string
    contactNumber?: string
    barangay?: string
    city?: string
    province?: string
    verifiedAt?: string
    idNumber?: string
    digitalIdStatus?: string
    digitalIdDeactivationReason?: string | null
    digitalIdGeneratedAt?: string
    digitalIdApprovedAt?: string
    digitalIdApprovalRequestedAt?: string
    digitalIdRevision?: number
  }
}

interface DigitalIdResponse {
  members: DigitalIdMember[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
  summary: {
    draft: number
    pendingApproval: number
    active: number
    deactivated: number
  }
}

const PAGE_SIZE = 10

export default function DigitalIdsPage() {
  const [members, setMembers] = useState<DigitalIdMember[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [status, setStatus] = useState('all')
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [isActionLoading, setIsActionLoading] = useState(false)
  const [isBatchDownloading, setIsBatchDownloading] = useState(false)
  const [adminRole, setAdminRole] = useState('admin')
  const [message, setMessage] = useState('')
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)
  const [selectedMember, setSelectedMember] = useState<DigitalIdDetail | null>(null)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [pagination, setPagination] = useState<DigitalIdResponse['pagination']>({
    page: 1,
    pageSize: PAGE_SIZE,
    total: 0,
    totalPages: 1,
  })
  const [summary, setSummary] = useState<DigitalIdResponse['summary']>({
    draft: 0,
    pendingApproval: 0,
    active: 0,
    deactivated: 0,
  })

  const queryParams = useMemo(
    () => ({
      status,
      search,
      page: currentPage,
      pageSize: PAGE_SIZE,
    }),
    [status, search, currentPage]
  )

  const isSuperadmin = adminRole === 'superadmin'
  const allVisibleSelected =
    members.length > 0 && members.every((member) => selectedIds.includes(member.uid))

  useEffect(() => {
    setCurrentPage(1)
  }, [status, search])

  useEffect(() => {
    let mounted = true

    async function loadPage() {
      setIsLoading(true)
      try {
        const [idsRes, meRes] = await Promise.all([
          api.get<DigitalIdResponse>('/admin/digital-ids', { params: queryParams }),
          api.get('/auth/me'),
        ])

        if (!mounted) return

        const nextMembers = idsRes.data.members || []
        setMembers(nextMembers)
        setPagination(idsRes.data.pagination)
        setSummary(idsRes.data.summary)
        setAdminRole(meRes.data?.role || window.localStorage.getItem('kk-admin-role') || 'admin')

        if (!selectedMemberId && nextMembers[0]?.uid) {
          setSelectedMemberId(nextMembers[0].uid)
        } else if (
          selectedMemberId &&
          !nextMembers.some((member) => member.uid === selectedMemberId) &&
          nextMembers[0]?.uid
        ) {
          setSelectedMemberId(nextMembers[0].uid)
        }
      } catch {
        if (!mounted) return
        setMembers([])
      } finally {
        if (mounted) setIsLoading(false)
      }
    }

    loadPage()
    return () => {
      mounted = false
    }
  }, [queryParams, selectedMemberId])

  useEffect(() => {
    if (!selectedMemberId) {
      setSelectedMember(null)
      return
    }

    let mounted = true

    async function loadDetail() {
      setIsDetailLoading(true)
      try {
        const res = await api.get<{ member: DigitalIdDetail }>(`/admin/digital-ids/${selectedMemberId}`)
        if (mounted) {
          setSelectedMember(res.data.member)
        }
      } catch {
        if (mounted) {
          setSelectedMember(null)
        }
      } finally {
        if (mounted) {
          setIsDetailLoading(false)
        }
      }
    }

    loadDetail()
    return () => {
      mounted = false
    }
  }, [selectedMemberId])

  const refreshPage = async (preferredId?: string | null) => {
    const idsRes = await api.get<DigitalIdResponse>('/admin/digital-ids', { params: queryParams })
    setMembers(idsRes.data.members || [])
    setPagination(idsRes.data.pagination)
    setSummary(idsRes.data.summary)

    const nextId =
      preferredId ||
      selectedMemberId ||
      idsRes.data.members?.[0]?.uid ||
      null

    setSelectedMemberId(nextId)

    if (nextId) {
      const detailRes = await api.get<{ member: DigitalIdDetail }>(`/admin/digital-ids/${nextId}`)
      setSelectedMember(detailRes.data.member)
    } else {
      setSelectedMember(null)
    }
  }

  const handleAction = async (
    action: 'generate' | 'submit' | 'approve' | 'deactivate' | 'regenerate',
    member: DigitalIdMember | DigitalIdDetail
  ) => {
    setIsActionLoading(true)
    setMessage('')

    try {
      if (action === 'generate') {
        await api.post(`/admin/digital-ids/${member.uid}/generate`)
        setMessage('Draft ID generated successfully.')
      }

      if (action === 'submit') {
        await api.post(`/admin/digital-ids/${member.uid}/submit`)
        setMessage('Digital ID sent to Superadmin for approval.')
      }

      if (action === 'approve') {
        await api.post(`/admin/digital-ids/${member.uid}/approve`)
        setMessage('Digital ID approved and activated.')
      }

      if (action === 'deactivate') {
        const reason =
          window.prompt('Reason for deactivation (optional):', 'User no longer eligible') || ''
        await api.patch(`/admin/digital-ids/${member.uid}/deactivate`, { reason })
        setMessage('Digital ID deactivated.')
      }

      if (action === 'regenerate') {
        await api.post(`/admin/digital-ids/${member.uid}/regenerate`)
        setMessage('A new draft ID has been issued. Old QR access is invalidated once the new ID is approved.')
      }

      await refreshPage(member.uid)
    } catch (error: any) {
      setMessage(error?.response?.data?.error || 'Action failed.')
    } finally {
      setIsActionLoading(false)
    }
  }

  const handleDownloadPdf = async (member: DigitalIdMember | DigitalIdDetail) => {
    const detail =
      'profile' in member && member.profile
        ? (member as DigitalIdDetail)
        : (await api.get<{ member: DigitalIdDetail }>(`/admin/digital-ids/${member.uid}`)).data.member

    const pdf = await buildDigitalIdPdf(detail)
    pdf.save(`${(detail.memberId || detail.profile?.idNumber || detail.uid).replace(/[^\w-]+/g, '_')}.pdf`)
  }

  const handleBatchDownload = async () => {
    const activeIds = members.filter(
      (member) =>
        selectedIds.includes(member.uid) &&
        member.digitalIdStatus === 'active'
    )

    if (activeIds.length === 0) {
      setMessage('Select at least one active ID to export as ZIP.')
      return
    }

    setIsBatchDownloading(true)
    setMessage('')

    try {
      const zip = new JSZip()

      for (const member of activeIds) {
        const detailRes = await api.get<{ member: DigitalIdDetail }>(`/admin/digital-ids/${member.uid}`)
        const pdf = await buildDigitalIdPdf(detailRes.data.member)
        const blob = pdf.output('blob')
        const fileName = `${(member.memberId || member.uid).replace(/[^\w-]+/g, '_')}.pdf`
        zip.file(fileName, blob)
      }

      const blob = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `kk-digital-ids-${new Date().toISOString().slice(0, 10)}.zip`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      setMessage(`Downloaded ${activeIds.length} active IDs as ZIP.`)
    } finally {
      setIsBatchDownloading(false)
    }
  }

  const toggleSelectAllVisible = () => {
    if (allVisibleSelected) {
      setSelectedIds((current) => current.filter((id) => !members.some((member) => member.uid === id)))
      return
    }

    setSelectedIds((current) => Array.from(new Set([...current, ...members.map((member) => member.uid)])))
  }

  const toggleSelectOne = (uid: string) => {
    setSelectedIds((current) =>
      current.includes(uid) ? current.filter((id) => id !== uid) : [...current, uid]
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-black text-[color:var(--kk-primary)]">Digital IDs</h1>
          <p className="mt-1 text-sm text-[color:var(--kk-muted)]">
            Generate, review, activate, and print KK Digital IDs through the admin and superadmin workflow.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleBatchDownload}
            disabled={!isSuperadmin || isBatchDownloading || selectedIds.length === 0}
            className="rounded-xl border border-[color:var(--kk-border)] bg-white px-4 py-2.5 text-sm font-semibold text-[color:var(--kk-primary)] shadow-sm hover:bg-[#eef5fd] disabled:opacity-60"
          >
            {isBatchDownloading ? 'Preparing ZIP...' : 'Batch Download ZIP'}
          </button>
        </div>
      </div>

      {message ? (
        <div className="rounded-xl border border-[color:var(--kk-border)] bg-[#eef5fd] px-4 py-3 text-sm text-[color:var(--kk-primary)]">
          {message}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryTile label="Draft IDs" value={summary.draft} tone="draft" />
        <SummaryTile label="Pending Approval" value={summary.pendingApproval} tone="pending" />
        <SummaryTile label="Active IDs" value={summary.active} tone="active" />
        <SummaryTile label="Deactivated" value={summary.deactivated} tone="deactivated" />
      </div>

      <div className="rounded-[28px] border border-[color:var(--kk-border)] bg-white/95 p-5 shadow-[0_14px_34px_rgba(1,67,132,0.08)]">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="md:col-span-2">
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--kk-muted)]">
              Search ID List
            </label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name, email, or ID number"
              className="w-full rounded-xl border border-[color:var(--kk-border)] px-4 py-2.5 text-sm text-[color:var(--kk-ink)] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[color:var(--kk-primary-2)]"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--kk-muted)]">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-xl border border-[color:var(--kk-border)] bg-white px-4 py-2.5 text-sm text-[color:var(--kk-ink)] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[color:var(--kk-primary-2)]"
            >
              <option value="all">All</option>
              <option value="draft">Draft</option>
              <option value="pending_approval">Pending Approval</option>
              <option value="active">Active</option>
              <option value="deactivated">Deactivated</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="overflow-hidden rounded-[28px] border border-[color:var(--kk-border)] bg-white shadow-[0_14px_34px_rgba(1,67,132,0.08)]">
          {isLoading ? (
            <div className="flex justify-center py-20">
              <Spinner size="lg" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[900px] w-full">
                <thead className="bg-[#eef5fd]">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <input type="checkbox" checked={allVisibleSelected} onChange={toggleSelectAllVisible} />
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--kk-muted)]">Member</th>
                    <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--kk-muted)]">ID Number</th>
                    <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--kk-muted)]">Status</th>
                    <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--kk-muted)]">Verified</th>
                    <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--kk-muted)]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eef2f7]">
                  {members.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-14 text-center text-sm text-[color:var(--kk-muted)]">
                        No digital ID records matched the current filters.
                      </td>
                    </tr>
                  ) : (
                    members.map((member) => (
                      <tr
                        key={member.uid}
                        className={cn(
                          'cursor-pointer hover:bg-[#fffaf0]',
                          selectedMemberId === member.uid ? 'bg-[#fffaf0]' : ''
                        )}
                        onClick={() => setSelectedMemberId(member.uid)}
                      >
                        <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(member.uid)}
                            onChange={() => toggleSelectOne(member.uid)}
                          />
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-[#eef5fd]">
                              {member.profilePhotoUrl ? (
                                <img src={member.profilePhotoUrl} alt={member.fullName} className="h-full w-full object-cover" />
                              ) : (
                                <span className="text-sm font-bold text-[color:var(--kk-primary)]">
                                  {getInitials(member.fullName || member.UserName || '')}
                                </span>
                              )}
                            </div>
                            <div>
                              <p className="font-semibold text-[color:var(--kk-primary)]">
                                {member.fullName || member.UserName || 'Youth Member'}
                              </p>
                              <p className="text-xs text-[color:var(--kk-muted)]">{member.email || 'No email'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-sm font-semibold text-[color:var(--kk-primary)]">
                          {member.memberId || 'Not generated'}
                        </td>
                        <td className="px-5 py-4">
                          <StatusBadge status={member.digitalIdStatus} />
                        </td>
                        <td className="px-5 py-4 text-sm text-[color:var(--kk-muted)]">
                          {member.verifiedAt ? new Date(member.verifiedAt).toLocaleDateString('en-PH') : '-'}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-2">
                            {member.digitalIdStatus === 'draft' && !isSuperadmin ? (
                              <ActionChip
                                label="Send for Approval"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleAction('submit', member)
                                }}
                              />
                            ) : null}
                            {member.digitalIdStatus === 'draft' && isSuperadmin ? (
                              <ActionChip
                                label="Approve & Activate"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleAction('approve', member)
                                }}
                              />
                            ) : null}
                            {member.digitalIdStatus === 'active' ? (
                              <ActionChip
                                label="Download PDF"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDownloadPdf(member)
                                }}
                              />
                            ) : null}
                            {!member.memberId ? (
                              <ActionChip
                                label={isSuperadmin ? 'Generate ID' : 'Generate Draft'}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleAction('generate', member)
                                }}
                              />
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

        <div className="rounded-[28px] border border-[color:var(--kk-border)] bg-white p-5 shadow-[0_14px_34px_rgba(1,67,132,0.08)]">
          {isDetailLoading ? (
            <div className="flex min-h-[520px] items-center justify-center">
              <Spinner size="lg" />
            </div>
          ) : !selectedMember ? (
            <div className="flex min-h-[520px] items-center justify-center text-center text-sm text-[color:var(--kk-muted)]">
              Select a member to preview the Digital ID card.
            </div>
          ) : (
            <div className="space-y-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--kk-muted)]">ID Preview</p>
                <h2 className="mt-2 text-xl font-black text-[color:var(--kk-primary)]">
                  {selectedMember.fullName || 'Digital ID Draft'}
                </h2>
                <p className="mt-1 text-sm text-[color:var(--kk-muted)]">
                  Review the card before approval and printing.
                </p>
              </div>

              <DigitalIdPreviewCard member={selectedMember} />

              <div className="rounded-2xl bg-[#f8fbff] p-4 text-sm text-[color:var(--kk-ink)]">
                <div className="grid gap-2">
                  <DetailRow label="ID Number" value={selectedMember.memberId || selectedMember.profile?.idNumber || 'Not generated'} />
                  <DetailRow label="Status" value={prettifyStatus(selectedMember.digitalIdStatus)} />
                  <DetailRow label="Revision" value={String(selectedMember.digitalIdRevision || selectedMember.profile?.digitalIdRevision || 1)} />
                  <DetailRow label="Verified On" value={formatDate(selectedMember.verifiedAt || selectedMember.profile?.verifiedAt)} />
                  <DetailRow label="Approval Requested" value={formatDate(selectedMember.profile?.digitalIdApprovalRequestedAt)} />
                  <DetailRow label="Approved On" value={formatDate(selectedMember.digitalIdApprovedAt || selectedMember.profile?.digitalIdApprovedAt)} />
                  <DetailRow label="Deactivation Reason" value={selectedMember.profile?.digitalIdDeactivationReason || '-'} />
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                {!selectedMember.memberId ? <PrimaryButton label={isSuperadmin ? 'Generate ID' : 'Generate Draft ID'} disabled={isActionLoading} onClick={() => handleAction('generate', selectedMember)} /> : null}
                {selectedMember.digitalIdStatus === 'draft' && !isSuperadmin ? <PrimaryButton label="Send to Superadmin" disabled={isActionLoading} onClick={() => handleAction('submit', selectedMember)} /> : null}
                {selectedMember.digitalIdStatus === 'draft' && isSuperadmin ? <PrimaryButton label="Approve & Activate" disabled={isActionLoading} onClick={() => handleAction('approve', selectedMember)} /> : null}
                {selectedMember.digitalIdStatus === 'pending_approval' && isSuperadmin ? <PrimaryButton label="Approve & Activate" disabled={isActionLoading} onClick={() => handleAction('approve', selectedMember)} /> : null}
                {selectedMember.digitalIdStatus === 'active' ? <SecondaryButton label="Download PDF" onClick={() => handleDownloadPdf(selectedMember)} /> : null}
                {selectedMember.memberId && isSuperadmin ? <SecondaryButton label="Regenerate ID" onClick={() => handleAction('regenerate', selectedMember)} disabled={isActionLoading} /> : null}
                {selectedMember.digitalIdStatus === 'active' && isSuperadmin ? <DangerButton label="Deactivate ID" onClick={() => handleAction('deactivate', selectedMember)} disabled={isActionLoading} /> : null}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-[24px] border border-[color:var(--kk-border)] bg-white px-5 py-4 shadow-sm md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-[color:var(--kk-muted)]">
          Showing {members.length === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1}-
          {Math.min(pagination.page * pagination.pageSize, pagination.total)} of {pagination.total} IDs
        </p>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={pagination.page === 1} className="rounded-lg border border-[color:var(--kk-border)] px-3 py-2 text-sm text-[color:var(--kk-primary)] disabled:opacity-40">Previous</button>
          <span className="px-2 text-sm font-semibold text-[color:var(--kk-primary)]">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button type="button" onClick={() => setCurrentPage((page) => Math.min(pagination.totalPages, page + 1))} disabled={pagination.page === pagination.totalPages} className="rounded-lg border border-[color:var(--kk-border)] px-3 py-2 text-sm text-[color:var(--kk-primary)] disabled:opacity-40">Next</button>
        </div>
      </div>
    </div>
  )
}

function SummaryTile({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: 'draft' | 'pending' | 'active' | 'deactivated'
}) {
  const bg =
    tone === 'draft'
      ? 'bg-[#fff3cf]'
      : tone === 'pending'
        ? 'bg-[#eef5fd]'
        : tone === 'active'
          ? 'bg-green-50'
          : 'bg-red-50'

  return (
    <div className={cn('rounded-[22px] border border-[color:var(--kk-border)] px-4 py-4 shadow-sm', bg)}>
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--kk-muted)]">{label}</p>
      <p className="mt-2 text-2xl font-black text-[color:var(--kk-primary)]">{value.toLocaleString()}</p>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const className =
    status === 'draft'
      ? 'bg-[#fff3cf] text-[#9b6500]'
      : status === 'pending_approval'
        ? 'bg-[#eef5fd] text-[color:var(--kk-primary)]'
        : status === 'active'
          ? 'bg-green-100 text-green-700'
          : 'bg-red-100 text-red-700'

  return (
    <span className={cn('inline-flex rounded-full px-2.5 py-1 text-xs font-semibold', className)}>
      {prettifyStatus(status)}
    </span>
  )
}

function ActionChip({
  label,
  onClick,
}: {
  label: string
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full bg-[#eef5fd] px-3 py-1.5 text-xs font-semibold text-[color:var(--kk-primary)] transition hover:bg-[#d9e9fb]"
    >
      {label}
    </button>
  )
}

function PrimaryButton({
  label,
  onClick,
  disabled,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-xl bg-[linear-gradient(90deg,#014384_0%,#0572DC_100%)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
    >
      {label}
    </button>
  )
}

function SecondaryButton({
  label,
  onClick,
  disabled,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-xl border border-[color:var(--kk-border)] bg-white px-4 py-2.5 text-sm font-semibold text-[color:var(--kk-primary)] shadow-sm hover:bg-[#eef5fd] disabled:opacity-60"
    >
      {label}
    </button>
  )
}

function DangerButton({
  label,
  onClick,
  disabled,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
    >
      {label}
    </button>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-xs font-bold uppercase tracking-[0.14em] text-[color:var(--kk-muted)]">{label}</span>
      <span className="text-right text-sm text-[color:var(--kk-primary)]">{value}</span>
    </div>
  )
}

function DigitalIdPreviewCard({ member }: { member: DigitalIdDetail }) {
  const [qrDataUrl, setQrDataUrl] = useState('')
  const fullName = [member.profile?.firstName, member.profile?.middleName, member.profile?.lastName]
    .filter(Boolean)
    .join(' ')
    .toUpperCase() || member.fullName?.toUpperCase() || 'KABATAAN MEMBER'
  const photoUrl = member.photoUrl || member.profilePhotoUrl || null
  const address = buildAddress(member)

  useEffect(() => {
    let active = true

    async function buildQr() {
      const qrValue = `KK|${member.uid}|${member.memberId || member.profile?.idNumber || ''}|${member.digitalIdRevision || member.profile?.digitalIdRevision || 1}`
      try {
        const nextQr = await QRCode.toDataURL(qrValue, {
          width: 180,
          margin: 1,
          color: { dark: '#014384', light: '#FFFFFF' },
        })
        if (active) setQrDataUrl(nextQr)
      } catch {
        if (active) setQrDataUrl('')
      }
    }

    buildQr()
    return () => {
      active = false
    }
  }, [member.uid, member.memberId, member.profile?.idNumber, member.digitalIdRevision, member.profile?.digitalIdRevision])

  return (
    <div className="space-y-4">
      <div className="relative aspect-[1.58/1] overflow-hidden rounded-[24px] border border-[#d9e3f1] shadow-[0_18px_36px_rgba(1,67,132,0.12)]">
        <img src="/images/KK ID - Front BG.png" alt="KK ID front background" className="absolute inset-0 h-full w-full object-cover" />
        <div className="relative flex h-full flex-col px-[8.2%] pb-[10.5%] pt-[22.8%] text-[#0b2f5b]">
          <div className="grid h-full grid-cols-[27%_1fr] gap-[6.5%]">
            <div className="flex flex-col">
              <div className="flex h-[54%] items-center justify-center overflow-hidden border border-[#2c5a8f] bg-[#eef4fb]">
                {photoUrl ? <img src={photoUrl} alt={fullName} className="h-full w-full object-cover" /> : <span className="text-sm font-black text-[#014384]">{getInitials(fullName)}</span>}
              </div>
              <div className="mt-[6.5%] border-t border-[#808080] pt-[4.5%] text-center">
                <p className="text-[0.38rem] font-medium tracking-[0.07em] text-[#1a1a1a]">SIGNATURE</p>
              </div>
              <p className="mt-[5%] break-all text-[0.42rem] font-bold leading-tight text-[#0b2f5b]">{member.memberId || member.profile?.idNumber || 'DRAFT'}</p>
            </div>

            <div className="pt-[0.5%]">
              <PreviewField label="Name" value={fullName} />
              <PreviewField label="Home Address" value={address} className="mt-[4%]" />
              <div className="mt-[3%] grid grid-cols-2 gap-x-[6%] gap-y-[3%]">
                <PreviewField label="Date of Birth" value={formatShortDate(member.profile?.birthday)} />
                <PreviewField label="Gender" value={(member.profile?.gender || '-').toUpperCase()} />
                <PreviewField label="Contact No" value={member.profile?.contactNumber || '-'} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative aspect-[1.58/1] overflow-hidden rounded-[24px] border border-[#d9e3f1] shadow-[0_18px_36px_rgba(1,67,132,0.12)]">
        <img src="/images/KK ID - Back BG.png" alt="KK ID back background" className="absolute inset-0 h-full w-full object-cover" />
        <div className="relative grid h-full grid-cols-[44%_1fr] gap-[5%] px-[7.5%] pb-[10%] pt-[22.8%] text-[#0b2f5b]">
          <div className="flex flex-col justify-start">
            <div className="max-w-[72%]">
              <img src="/images/FOOTER.png" alt="SK Barangay Buting" className="h-auto w-full object-contain" />
            </div>
            <p className="mt-[6.5%] text-[0.49rem] font-bold leading-[1.35] text-[#20456f]">IN CASE OF EMERGENCY, PLEASE CONTACT:</p>
            <p className="mt-[2%] text-[0.7rem] font-black uppercase leading-tight text-[#0b2f5b]">SHARRAINE KIZH V. CUETO</p>
            <p className="mt-[5%] text-[0.49rem] font-bold uppercase leading-[1.3] text-[#1d5aa1]">Emergency Contact No:</p>
            <p className="mt-[1%] text-[0.7rem] font-black text-[#0b2f5b]">09220422042</p>
            <p className="mt-[6%] max-w-[94%] text-[0.52rem] italic leading-[1.4] text-[#4c6d95]">If found, please return to the Barangay Hall of Barangay Buting, Pasig City.</p>
          </div>

          <div className="flex items-start justify-center pt-[2%]">
            <div className="w-full max-w-[162px] rounded-[14px] bg-white/92 p-[4%] shadow-md">
              {qrDataUrl ? <img src={qrDataUrl} alt="QR code" className="h-auto w-full" /> : <div className="aspect-square w-full rounded-[10px] bg-[#eef5fd]" />}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function PreviewField({ label, value, className = '' }: { label: string; value: string; className?: string }) {
  return (
    <div className={className}>
      <p className="text-[0.38rem] font-bold uppercase tracking-[0.06em] text-[#1d5aa1]">{label}:</p>
      <p className="break-words text-[0.64rem] font-black leading-[1.15] text-[#0b2f5b]">{value || '-'}</p>
    </div>
  )
}

async function buildDigitalIdPdf(member: DigitalIdDetail) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: [700, 460],
  })

  const qrValue = `KK|${member.uid}|${member.memberId || member.profile?.idNumber || ''}|${member.digitalIdRevision || member.profile?.digitalIdRevision || 1}`
  const [qrDataUrl, frontBg, backBg, footerLogo] = await Promise.all([
    QRCode.toDataURL(qrValue, {
      width: 220,
      margin: 1,
      color: { dark: '#014384', light: '#FFFFFF' },
    }),
    loadImageData('/images/KK ID - Front BG.png'),
    loadImageData('/images/KK ID - Back BG.png'),
    loadImageData('/images/FOOTER.png'),
  ])
  const photoData = member.photoUrl || member.profilePhotoUrl
    ? await loadImageData(member.photoUrl || member.profilePhotoUrl || '').catch(() => '')
    : ''
  const fullName = (member.fullName || buildFullName(member.profile || {})).toUpperCase()
  const address = buildAddress(member)

  doc.setFillColor(245, 249, 255)
  doc.rect(0, 0, 460, 700, 'F')

  doc.addImage(frontBg, 'PNG', 20, 20, 420, 266)
  doc.addImage(backBg, 'PNG', 20, 330, 420, 266)

  if (photoData) {
    doc.addImage(photoData, 'JPEG', 53, 83, 72, 103)
  } else {
    doc.setTextColor(1, 67, 132)
    doc.setFontSize(22)
    doc.text(getInitials(fullName), 89, 142, { align: 'center' })
  }

  doc.setFont('helvetica', 'normal')
  doc.setTextColor(11, 47, 91)
  doc.setFontSize(6.5)
  doc.text(member.memberId || member.profile?.idNumber || 'DRAFT', 52, 204)

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
  doc.text(formatShortDate(member.profile?.birthday), 164, 184)
  doc.text((member.profile?.gender || '-').toUpperCase(), 299, 184)
  doc.text(member.profile?.contactNumber || '-', 164, 232)

  doc.addImage(footerLogo, 'PNG', 38, 392, 130, 28)
  doc.setTextColor(32, 69, 111)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.text('IN CASE OF EMERGENCY, PLEASE CONTACT:', 36, 442)
  doc.setTextColor(11, 47, 91)
  doc.setFontSize(13)
  doc.text('SHARRAINE KIZH V. CUETO', 36, 460)
  doc.setTextColor(29, 90, 161)
  doc.setFontSize(8)
  doc.text('EMERGENCY CONTACT NO:', 36, 495)
  doc.setTextColor(11, 47, 91)
  doc.setFontSize(13)
  doc.text('09220422042', 36, 512)
  doc.setTextColor(76, 109, 149)
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(8.5)
  doc.text('If found, please return to the Barangay Hall of Barangay Buting, Pasig City.', 36, 548, { maxWidth: 150 })

  doc.addImage(qrDataUrl, 'PNG', 256, 403, 148, 148)

  return doc
}

async function loadImageData(url: string) {
  const response = await fetch(url)
  const blob = await response.blob()
  return await blobToDataUrl(blob)
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Failed to load image'))
    reader.readAsDataURL(blob)
  })
}

function prettifyStatus(value: string) {
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

function buildAddress(member: Pick<DigitalIdDetail, 'profile' | 'barangay' | 'city' | 'province'>) {
  return [member.profile?.barangay || member.barangay, member.profile?.city || member.city, member.profile?.province || member.province]
    .filter(Boolean)
    .join(', ')
    .toUpperCase() || '-'
}

function formatDate(value?: string) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })
}

function formatShortDate(value?: string) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('en-PH')
}

function extractYear(value?: string) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return String(date.getFullYear())
}

function buildFullName(profile: DigitalIdDetail['profile']) {
  return [profile?.firstName, profile?.middleName, profile?.lastName].filter(Boolean).join(' ')
}
