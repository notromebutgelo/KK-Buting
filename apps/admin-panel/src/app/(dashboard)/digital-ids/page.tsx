'use client'

import { useEffect, useMemo, useState } from 'react'
import jsPDF from 'jspdf'
import JSZip from 'jszip'
import {
  BadgeCheck,
  Download,
  FileText,
  Hourglass,
  MoreVertical,
  RotateCw,
  Search,
  XCircle,
} from 'lucide-react'
import api from '@/lib/api'
import { cn } from '@/utils/cn'

interface DigitalIdMember {
  uid: string
  UserName?: string
  email?: string
  firstName?: string
  lastName?: string
  fullName?: string
  youthAgeGroup?: string
  contactNumber?: string
  city?: string
  province?: string
  barangay?: string
  purok?: string
  verifiedAt?: string
  memberId?: string
  digitalIdStatus: 'draft' | 'pending_approval' | 'active' | 'deactivated'
  verificationQueueStatus?: string
  verificationDocumentsApprovedAt?: string | null
  verificationDocumentsApprovedBy?: string | null
  verificationReferredToSuperadminAt?: string | null
  verificationReferredToSuperadminBy?: string | null
  digitalIdRevision?: number
  digitalIdGeneratedAt?: string
  digitalIdApprovedAt?: string
  digitalIdDeactivatedAt?: string
  hasDigitalId?: boolean
  emergencyContactComplete?: boolean
  signatureComplete?: boolean
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
    purok?: string
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
    verificationDocumentsApprovedAt?: string | null
    verificationDocumentsApprovedBy?: string | null
    verificationReferredToSuperadminAt?: string | null
    verificationReferredToSuperadminBy?: string | null
    digitalIdRevision?: number
    digitalIdEmergencyContactName?: string
    digitalIdEmergencyContactRelationship?: string
    digitalIdEmergencyContactPhone?: string
    digitalIdSignatureUrl?: string | null
    digitalIdSignatureSignedAt?: string | null
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
const DIGITAL_ID_TERMS_TEXT =
  'This card is non-transferable and must be used only by the cardholder whose signature appears herein. Cardholder privileges remain subject to implementing guidelines approved by the Sangguniang Kabataan Council.'
const DIGITAL_ID_SIGNATURE_TEXT = 'Mark Jervin B. Ventura'
const DIGITAL_ID_SIGNATORY_NAME = 'HON. MARK JERVIN B. VENTURA'
const DIGITAL_ID_SIGNATORY_TITLE = 'SK CHAIRPERSON'
const DIGITAL_ID_SIGNATORY_OFFICE = ''

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
  const [preferredMemberId, setPreferredMemberId] = useState<string | null>(null)
  const [selectedMember, setSelectedMember] = useState<DigitalIdDetail | null>(null)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [previewSide, setPreviewSide] = useState<'front' | 'back'>('front')
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
    if (typeof window === 'undefined') return
    const memberFromQuery = new URLSearchParams(window.location.search).get('member')
    if (memberFromQuery) {
      setPreferredMemberId(memberFromQuery)
      setSelectedMemberId(memberFromQuery)
    }
  }, [])

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

        if (preferredMemberId) {
          setSelectedMemberId(preferredMemberId)
        } else if (!selectedMemberId && nextMembers[0]?.uid) {
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
  }, [preferredMemberId, queryParams, selectedMemberId])

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
        setMessage('Digital ID request queued for superadmin generation.')
      }

      if (action === 'approve') {
        await api.post(`/admin/digital-ids/${member.uid}/approve`)
        setMessage('Digital ID generated and activated.')
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
    <div className="space-y-6">
      {message ? (
        <div className="rounded-xl border px-4 py-3 text-sm bg-[color:var(--accent-soft)]" style={{ borderColor: 'var(--stroke)', color: 'var(--accent-strong)' }}>
          {message}
        </div>
      ) : null}

      <div className="flex justify-end">
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleBatchDownload}
            disabled={!isSuperadmin || isBatchDownloading || selectedIds.length === 0}
            className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2.5 text-sm font-semibold shadow-sm hover:bg-[color:var(--surface-muted)] disabled:opacity-60"
            style={{ borderColor: 'var(--stroke)', color: 'var(--accent-strong)', background: 'var(--card)' }}
          >
            <Download className="h-4 w-4" />
            <span>{isBatchDownloading ? 'Preparing ZIP...' : 'Batch Download'}</span>
            <span
              className="rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.12em]"
              style={{ background: 'var(--accent-soft)', color: 'var(--accent-strong)' }}
            >
              ZIP
            </span>
          </button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 2xl:grid-cols-4">
            <SummaryTile label="Draft IDs" value={summary.draft} tone="draft" />
            <SummaryTile label="Pending Superadmin" value={summary.pendingApproval} tone="pending" />
            <SummaryTile label="Active IDs" value={summary.active} tone="active" />
            <SummaryTile label="Deactivated" value={summary.deactivated} tone="deactivated" />
          </div>

          <div className="admin-panel">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_240px] lg:items-end">
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2"
                  style={{ color: 'var(--muted)' }}
                />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, email, or ID number..."
                  className="surface-input w-full rounded-xl px-11 py-3.5 text-sm outline-none focus:ring-2 focus:ring-[color:var(--accent)]/30"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--muted)' }}>
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="surface-input bg-transparent w-full rounded-xl px-4 py-3.5 text-sm outline-none focus:ring-2 focus:ring-[color:var(--accent)]/30"
                >
                  <option value="all">All</option>
                  <option value="draft">Draft</option>
                  <option value="pending_approval">Pending Superadmin</option>
                  <option value="active">Active</option>
                  <option value="deactivated">Deactivated</option>
                </select>
              </div>
            </div>
          </div>

          <div
            className="overflow-hidden rounded-[var(--radius-lg)] border shadow-[var(--shadow-sm)]"
            style={{ borderColor: 'var(--stroke)', background: 'var(--card-solid)' }}
          >
            {isLoading ? (
              <div className="flex justify-center py-20">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-[color:var(--accent)] border-t-transparent" />
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-[780px] w-full">
                    <thead>
                      <tr className="border-b" style={{ borderColor: 'var(--stroke)' }}>
                        <th className="w-14 px-5 py-4 text-left">
                          <input type="checkbox" checked={allVisibleSelected} onChange={toggleSelectAllVisible} />
                        </th>
                        <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--muted)' }}>Member</th>
                        <th className="w-[190px] px-5 py-4 text-left text-xs font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--muted)' }}>ID Number</th>
                        <th className="w-[140px] px-5 py-4 text-left text-xs font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--muted)' }}>Status</th>
                        <th className="w-[180px] px-5 py-4 text-left text-xs font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--muted)' }}>Updated</th>
                        <th className="w-[160px] px-5 py-4 text-left text-xs font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--muted)' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[color:var(--stroke)]">
                      {members.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-5 py-14 text-center text-sm" style={{ color: 'var(--muted)' }}>
                            No digital ID records matched the current filters.
                          </td>
                        </tr>
                      ) : (
                        members.map((member) => (
                          <tr
                            key={member.uid}
                            className={cn(
                              'cursor-pointer transition-colors hover:bg-[color:var(--surface-muted)]/55',
                              selectedMemberId === member.uid ? 'bg-[color:var(--accent-soft)]/70' : ''
                            )}
                            onClick={() => setSelectedMemberId(member.uid)}
                          >
                            <td className="px-5 py-5" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={selectedIds.includes(member.uid)}
                                onChange={() => toggleSelectOne(member.uid)}
                              />
                            </td>
                            <td className="px-5 py-5">
                              <div className="flex min-w-0 items-center gap-3">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[color:var(--accent-soft)]">
                                  {member.profilePhotoUrl ? (
                                    <img src={member.profilePhotoUrl} alt={member.fullName} className="h-full w-full object-cover" />
                                  ) : (
                                    <span className="text-sm font-bold" style={{ color: 'var(--accent-strong)' }}>
                                      {getInitials(member.fullName || member.UserName || '')}
                                    </span>
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                                    {member.fullName || member.UserName || 'Youth Member'}
                                  </p>
                                  <p className="truncate text-xs" style={{ color: 'var(--muted)' }}>{member.email || 'No email'}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-5 text-sm font-semibold" style={{ color: 'var(--accent-strong)' }}>
                              <span className="block truncate">{member.memberId || 'Not generated'}</span>
                            </td>
                            <td className="px-5 py-5">
                              <StatusBadge status={member.digitalIdStatus} />
                            </td>
                            <td className="px-5 py-5 text-sm" style={{ color: 'var(--muted)' }}>
                              <DateTimeStack value={member.digitalIdApprovedAt || member.digitalIdGeneratedAt || member.verifiedAt} />
                            </td>
                            <td className="px-5 py-5">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setSelectedMemberId(member.uid)
                                  }}
                                  className="rounded-xl border px-4 py-2 text-sm font-semibold transition hover:bg-[color:var(--surface-muted)]"
                                  style={{
                                    borderColor: 'var(--stroke)',
                                    color: 'var(--accent-strong)',
                                    background: 'var(--card-solid)',
                                  }}
                                >
                                  View ID
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setSelectedMemberId(member.uid)
                                  }}
                                  className="rounded-xl border p-2 transition hover:bg-[color:var(--surface-muted)]"
                                  style={{
                                    borderColor: 'var(--stroke)',
                                    color: 'var(--accent-strong)',
                                    background: 'var(--card-solid)',
                                  }}
                                  aria-label="Open ID details"
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-col gap-3 border-t px-5 py-4 md:flex-row md:items-center md:justify-between" style={{ borderColor: 'var(--stroke)' }}>
                  <p className="text-sm" style={{ color: 'var(--muted)' }}>
                    Showing {members.length === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1}-
                    {Math.min(pagination.page * pagination.pageSize, pagination.total)} of {pagination.total} IDs
                  </p>
                  <div className="flex items-center gap-2 self-end md:self-auto">
                    <button type="button" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={pagination.page === 1} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-40" style={{ borderColor: 'var(--stroke)', color: 'var(--accent-strong)' }}>Previous</button>
                    <span className="px-2 text-sm font-semibold" style={{ color: 'var(--accent-strong)' }}>
                      Page {pagination.page} of {pagination.totalPages}
                    </span>
                    <button type="button" onClick={() => setCurrentPage((page) => Math.min(pagination.totalPages, page + 1))} disabled={pagination.page === pagination.totalPages} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-40" style={{ borderColor: 'var(--stroke)', color: 'var(--accent-strong)' }}>Next</button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="self-start xl:sticky xl:top-24">
          <div className="admin-panel space-y-5">
            {isDetailLoading ? (
              <div className="flex min-h-[520px] items-center justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-[color:var(--accent)] border-t-transparent" />
              </div>
            ) : !selectedMember ? (
              <div className="flex min-h-[520px] items-center justify-center text-center text-sm" style={{ color: 'var(--muted)' }}>
                Select a member to preview the Digital ID card.
              </div>
            ) : (
              <div className="space-y-5">
                <div className="border-b pb-4" style={{ borderColor: 'var(--stroke)' }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--muted)' }}>ID Details</p>
                      <h2 className="mt-2 truncate text-[1.35rem] font-black" style={{ color: 'var(--ink)' }}>
                        {selectedMember.fullName || 'Digital ID Draft'}
                      </h2>
                      <p className="mt-1 truncate text-sm" style={{ color: 'var(--muted)' }}>
                        ID Number: {selectedMember.memberId || selectedMember.profile?.idNumber || 'Not generated'}
                      </p>
                      <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>
                        Valid until {getDigitalIdValidThru(selectedMember)}
                      </p>
                    </div>
                    <StatusBadge status={selectedMember.digitalIdStatus} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 rounded-2xl border p-1" style={{ borderColor: 'var(--stroke)', background: 'var(--card-solid)' }}>
                  <PreviewToggleButton
                    active={previewSide === 'front'}
                    label="Front of ID"
                    onClick={() => setPreviewSide('front')}
                  />
                  <PreviewToggleButton
                    active={previewSide === 'back'}
                    label="Back of ID"
                    onClick={() => setPreviewSide('back')}
                  />
                </div>

                <div className="space-y-4">
                  <div
                    className={cn(
                      'rounded-[28px] transition-shadow',
                      previewSide === 'front' ? 'ring-2 ring-[color:var(--accent-soft)] ring-offset-2 ring-offset-transparent' : ''
                    )}
                  >
                    <DigitalIdPreviewCard member={selectedMember} previewSide="front" />
                  </div>
                  <div
                    className={cn(
                      'rounded-[28px] transition-shadow',
                      previewSide === 'back' ? 'ring-2 ring-[color:var(--accent-soft)] ring-offset-2 ring-offset-transparent' : ''
                    )}
                  >
                    <DigitalIdPreviewCard member={selectedMember} previewSide="back" />
                  </div>
                </div>

                {selectedMember.digitalIdStatus === 'pending_approval' ? (
                  <div className="admin-tone-surface admin-tone-body rounded-2xl px-4 py-3 text-sm" data-tone="info">
                    This request is waiting for superadmin issuance. The youth member will only see the Digital ID after you generate and activate it here.
                  </div>
                ) : null}

                {!selectedMember.emergencyContactComplete ? (
                  <div className="admin-tone-surface admin-tone-body rounded-2xl px-4 py-3 text-sm" data-tone="warning">
                    The youth member still needs to add a complete emergency contact before this Digital ID can be generated, submitted, approved, or regenerated.
                  </div>
                ) : null}

                {!selectedMember.signatureComplete ? (
                  <div className="admin-tone-surface admin-tone-body rounded-2xl px-4 py-3 text-sm" data-tone="info">
                    The youth member still needs to save a Digital ID signature before this Digital ID can be generated, submitted, approved, or regenerated.
                  </div>
                ) : null}

                {!isSuperadmin && ['pending_approval', 'draft'].includes(selectedMember.digitalIdStatus) ? (
                  <div className="admin-tone-surface admin-tone-body rounded-2xl px-4 py-3 text-sm" data-tone="info">
                    Superadmins are responsible for issuing the Digital ID after admin verification is complete.
                  </div>
                ) : null}

                <div
                  className="rounded-2xl border p-4 text-sm shadow-[var(--shadow-sm)]"
                  style={{
                    color: 'var(--ink)',
                    borderColor: 'var(--stroke)',
                    background: 'var(--card-solid)',
                  }}
                >
                  <div className="grid gap-3">
                    <DetailRow label="ID Number" value={selectedMember.memberId || selectedMember.profile?.idNumber || 'Not generated'} />
                    <DetailRow label="Status" value={prettifyStatus(selectedMember.digitalIdStatus)} />
                    <DetailRow label="Revision" value={String(selectedMember.digitalIdRevision || selectedMember.profile?.digitalIdRevision || 1)} />
                    <DetailRow label="Approved by Admin" value={selectedMember.verificationDocumentsApprovedBy || selectedMember.profile?.verificationDocumentsApprovedBy || '-'} />
                    <DetailRow label="Admin Approval Time" value={formatDate(selectedMember.verificationDocumentsApprovedAt || selectedMember.profile?.verificationDocumentsApprovedAt || undefined)} />
                    <DetailRow label="Referred by Admin" value={selectedMember.verificationReferredToSuperadminBy || selectedMember.profile?.verificationReferredToSuperadminBy || '-'} />
                    <DetailRow label="Referred On" value={formatDate(selectedMember.verificationReferredToSuperadminAt || selectedMember.profile?.verificationReferredToSuperadminAt || undefined)} />
                    <DetailRow label="Emergency Contact" value={getEmergencyContactSummary(selectedMember)} />
                    <DetailRow label="Signature" value={selectedMember.signatureComplete ? 'Saved' : 'Missing'} />
                    <DetailRow label="Verified On" value={formatDate(selectedMember.verifiedAt || selectedMember.profile?.verifiedAt)} />
                    <DetailRow label="Approval Requested" value={formatDate(selectedMember.profile?.digitalIdApprovalRequestedAt)} />
                    <DetailRow label="Approved On" value={formatDate(selectedMember.digitalIdApprovedAt || selectedMember.profile?.digitalIdApprovedAt)} />
                    <DetailRow label="Deactivation Reason" value={selectedMember.profile?.digitalIdDeactivationReason || '-'} />
                  </div>
                </div>

                <div className="grid gap-3">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {selectedMember.digitalIdStatus === 'draft' && isSuperadmin ? <SecondaryButton label="Generate and Issue ID" onClick={() => handleAction('approve', selectedMember)} disabled={isActionLoading || !selectedMember.emergencyContactComplete || !selectedMember.signatureComplete} icon="issue" /> : null}
                    {selectedMember.digitalIdStatus === 'pending_approval' && isSuperadmin ? <SecondaryButton label="Generate and Issue ID" onClick={() => handleAction('approve', selectedMember)} disabled={isActionLoading || !selectedMember.emergencyContactComplete || !selectedMember.signatureComplete} icon="issue" /> : null}
                    {selectedMember.digitalIdStatus === 'active' ? <SecondaryButton label="Download PDF" onClick={() => handleDownloadPdf(selectedMember)} icon="download" /> : null}
                    {selectedMember.memberId && isSuperadmin ? <SecondaryButton label="Regenerate ID" onClick={() => handleAction('regenerate', selectedMember)} disabled={isActionLoading || !selectedMember.emergencyContactComplete || !selectedMember.signatureComplete} icon="refresh" /> : null}
                  </div>
                  {selectedMember.digitalIdStatus === 'active' && isSuperadmin ? <DangerButton label="Deactivate ID" onClick={() => handleAction('deactivate', selectedMember)} disabled={isActionLoading} /> : null}
                </div>
              </div>
            )}
          </div>
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
  const palette = getSummaryToneStyles(tone)

  return (
    <div
      className="h-full min-h-[126px] rounded-[24px] border px-5 py-5 shadow-[var(--shadow-sm)]"
      style={{ borderColor: 'var(--stroke)', background: 'var(--card-solid)' }}
    >
      <div className="flex items-start gap-4">
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px]"
          style={{ background: palette.iconBg, color: palette.iconFg }}
        >
          <SummaryIcon tone={tone} />
        </div>
        <div className="min-w-0">
          <p className="text-[15px] font-semibold leading-6" style={{ color: 'var(--ink)' }}>
            {label}
          </p>
          <p className="mt-2 text-[34px] font-black leading-none" style={{ color: 'var(--ink)' }}>
            {value.toLocaleString()}
          </p>
          <p className="mt-3 text-sm leading-6" style={{ color: 'var(--muted)' }}>
            {palette.caption}
          </p>
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      data-tone={getDigitalIdTone(status)}
      className="admin-status-pill rounded-full px-2.5 py-1 text-xs font-semibold"
    >
      {prettifyStatus(status)}
    </span>
  )
}

function SecondaryButton({
  label,
  onClick,
  disabled,
  icon,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  icon?: 'download' | 'refresh' | 'issue'
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold shadow-sm hover:bg-[color:var(--surface-muted)] disabled:opacity-60"
      style={{ borderColor: 'var(--stroke)', color: 'var(--accent-strong)', background: 'var(--card)' }}
    >
      {icon ? <SecondaryButtonIcon icon={icon} /> : null}
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
      className="w-full rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
    >
      {label}
    </button>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[132px_minmax(0,1fr)] items-start gap-3">
      <span className="text-xs font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--muted)' }}>{label}</span>
      <span className="min-w-0 text-right text-sm leading-6" style={{ color: 'var(--accent-strong)' }}>{value}</span>
    </div>
  )
}

function getDigitalIdTone(status: string) {
  if (status === 'draft') return 'warning'
  if (status === 'pending_approval') return 'info'
  if (status === 'active') return 'success'
  return 'danger'
}

function DigitalIdPreviewCard({
  member,
  previewSide,
}: {
  member: DigitalIdDetail
  previewSide: 'front' | 'back'
}) {
  const fullName = [member.profile?.firstName, member.profile?.middleName, member.profile?.lastName]
    .filter(Boolean)
    .join(' ')
    .toUpperCase() || member.fullName?.toUpperCase() || 'KABATAAN MEMBER'
  const photoUrl = member.photoUrl || member.profilePhotoUrl || null
  const signatureUrl = getMemberSignatureUrl(member)
  const address = buildAddress(member)
  const purok = buildPurok(member.profile?.purok || member.purok)
  const contactNumber = buildFrontCardValue(member.profile?.contactNumber || member.contactNumber)
  const validThru = getDigitalIdValidThru(member)
  const emergencyContactName = getEmergencyContactName(member)
  const emergencyContactPhone = getEmergencyContactPhone(member)
  const emergencyContactRelationship = getEmergencyContactRelationship(member)

  if (previewSide === 'front') {
    return (
      <div className="relative aspect-[1.58/1] overflow-hidden rounded-[24px] border border-[#d9e3f1] shadow-[0_18px_36px_rgba(1,67,132,0.12)]">
        <img src="/images/KK ID - Front BG.png" alt="KK ID front background" className="absolute inset-0 h-full w-full object-cover" />
        <div className="relative flex h-full flex-col px-[8.2%] pb-[10.5%] pt-[18.4%] text-[#0b2f5b]">
          <div className="grid h-full grid-cols-[27%_1fr] gap-[6.5%]">
            <div className="flex flex-col items-center">
              <p className="w-full overflow-hidden text-ellipsis whitespace-nowrap text-center text-[0.35rem] font-black leading-none tracking-[0.05em] text-[#0b2f5b]">
                {member.memberId || member.profile?.idNumber || 'DRAFT'}
              </p>
              <div className="mt-[2.3%] flex h-[49%] w-full items-center justify-center overflow-hidden border border-[#2c5a8f] bg-[#eef4fb]">
                {photoUrl ? <img src={photoUrl} alt={fullName} className="h-full w-full object-cover" /> : <span className="text-sm font-black text-[#014384]">{getInitials(fullName)}</span>}
              </div>
              <div className="mt-[4.6%] flex h-[13%] w-full items-end justify-center overflow-hidden px-[4%]">
                {signatureUrl ? (
                  <img src={signatureUrl} alt="Member signature" className="max-h-full w-full object-contain" />
                ) : null}
              </div>
              <div className="w-full border-t border-[#808080] pt-[3.2%] text-center">
                <p className="text-[0.38rem] font-medium tracking-[0.07em] text-[#1a1a1a]">SIGNATURE</p>
              </div>
            </div>

            <div className="-translate-y-[3.3%] pt-0">
              <PreviewField label="Name" value={fullName} />
              <PreviewField label="Home Address" value={address} className="mt-[1.8%]" />
              <PreviewField label="Purok" value={purok} className="mt-[1.2%]" />
              <div className="mt-[1.2%] grid grid-cols-2 gap-x-[6%] gap-y-[1.5%]">
                <PreviewField label="Date of Birth" value={formatShortDate(member.profile?.birthday)} />
                <PreviewField label="Gender" value={(member.profile?.gender || '-').toUpperCase()} />
                <PreviewField label="Contact No" value={contactNumber} />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative aspect-[1.58/1] overflow-hidden rounded-[24px] border border-[#ced8e4] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.98)_0%,rgba(243,241,235,0.96)_58%,rgba(230,227,219,0.98)_100%)] shadow-[0_18px_36px_rgba(1,67,132,0.12)]">
      <div className="absolute inset-[3.6%] rounded-[18px] border-[1.5px] border-[#4e5650]/65" />
      <div className="absolute inset-[6.2%] rounded-[14px] border border-[#838b85]/35" />
      <div className="relative flex h-full flex-col px-[9%] pb-[20.8%] pt-[9.8%] text-[#2b312e]">
        <div className="text-center">
          <p className="text-[0.38rem] font-bold uppercase tracking-[0.09em] text-[#666d67]">
            In case of emergency, please contact:
          </p>
          <p className="mt-[2.4%] text-[0.66rem] font-black leading-[1.08] tracking-[0.01em] text-[#1f2621]">
            {emergencyContactName} - {emergencyContactPhone}
          </p>
          <p className="mt-[1.8%] text-[0.34rem] font-semibold tracking-[0.08em] text-[#6b726c]">
            Relationship: {emergencyContactRelationship}
          </p>
        </div>

        <div className="mx-auto mt-[5.4%] max-w-[80%] text-center">
          <p className="text-[0.38rem] font-bold uppercase tracking-[0.18em] text-[#767d78]">
            Terms and Conditions
          </p>
          <p className="mt-[2.4%] text-[0.4rem] font-semibold leading-[1.32] text-[#424843]">
            {DIGITAL_ID_TERMS_TEXT}
          </p>
        </div>

        <div className="mt-auto flex justify-center pt-[0.8%]">
          <div className="flex w-full max-w-[62%] flex-col items-center text-center">
            <p className="text-[0.34rem] font-bold uppercase tracking-[0.16em] text-[#7a807b]">
              Valid Until
            </p>
            <p className="mt-[1.4%] text-[0.64rem] font-black text-[#222823]">{validThru}</p>
            <p className="mt-[2.6%] text-[0.7rem] font-semibold italic tracking-[0.02em] text-[#444b45]">
              {DIGITAL_ID_SIGNATURE_TEXT}
            </p>
            <div className="mt-[1%] h-px w-[60%] bg-[#4d544e]" />
            <p className="mt-[1.2%] text-[0.3rem] font-black uppercase leading-none tracking-[0.08em] text-[#303731]">
              {DIGITAL_ID_SIGNATORY_NAME}
            </p>
            <p className="mt-[0.6%] text-[0.29rem] font-black uppercase leading-none tracking-[0.12em] text-[#303731]">
              {DIGITAL_ID_SIGNATORY_TITLE}
            </p>
            {DIGITAL_ID_SIGNATORY_OFFICE ? (
              <p className="mt-[0.4%] text-[0.31rem] font-semibold uppercase leading-none tracking-[0.11em] text-[#656d67]">
                {DIGITAL_ID_SIGNATORY_OFFICE}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}

function PreviewToggleButton({
  active,
  label,
  onClick,
}: {
  active: boolean
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl px-4 py-2 text-sm font-semibold transition"
      style={{
        background: active ? 'var(--accent-soft)' : 'transparent',
        color: active ? 'var(--accent-strong)' : 'var(--ink-soft)',
      }}
    >
      {label}
    </button>
  )
}

function SecondaryButtonIcon({ icon }: { icon: 'download' | 'refresh' | 'issue' }) {
  if (icon === 'download') {
    return <Download className="h-4 w-4" />
  }

  if (icon === 'refresh') {
    return <RotateCw className="h-4 w-4" />
  }

  return <BadgeCheck className="h-4 w-4" />
}

function DateTimeStack({ value }: { value?: string }) {
  if (!value) {
    return '-'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return '-'
  }

  return (
    <div className="space-y-1">
      <p className="font-medium" style={{ color: 'var(--ink-soft)' }}>
        {date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
      </p>
      <p className="text-xs">{date.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}</p>
    </div>
  )
}

function getSummaryToneStyles(tone: 'draft' | 'pending' | 'active' | 'deactivated') {
  if (tone === 'draft') {
    return {
      iconBg: '#fff6e7',
      iconFg: '#f59e0b',
      caption: 'Not yet submitted',
    }
  }

  if (tone === 'pending') {
    return {
      iconBg: '#eef4ff',
      iconFg: '#2563eb',
      caption: 'For review & approval',
    }
  }

  if (tone === 'active') {
    return {
      iconBg: '#edf9f2',
      iconFg: '#22c55e',
      caption: 'Currently active',
    }
  }

  return {
    iconBg: '#fff1f1',
    iconFg: '#ef4444',
    caption: 'No longer active',
  }
}

function SummaryIcon({ tone }: { tone: 'draft' | 'pending' | 'active' | 'deactivated' }) {
  if (tone === 'draft') {
    return <FileText className="h-6 w-6" />
  }

  if (tone === 'pending') {
    return <Hourglass className="h-6 w-6" />
  }

  if (tone === 'active') {
    return <BadgeCheck className="h-6 w-6" />
  }

  return <XCircle className="h-6 w-6" />
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

  const frontBg = await loadImageData('/images/KK ID - Front BG.png')
  const photoData = member.photoUrl || member.profilePhotoUrl
    ? await loadImageData(member.photoUrl || member.profilePhotoUrl || '', 'jpeg').catch(() => '')
    : ''
  const signatureUrl = getMemberSignatureUrl(member)
  const signatureData = signatureUrl
    ? await loadImageData(signatureUrl).catch(() => '')
    : ''
  const fullName = (member.fullName || buildFullName(member.profile || {})).toUpperCase()
  const address = buildAddress(member)
  const purok = buildPurok(member.profile?.purok || member.purok)
  const contactNumber = buildFrontCardValue(member.profile?.contactNumber || member.contactNumber)
  const validThru = getDigitalIdValidThru(member)
  const emergencyContactName = getEmergencyContactName(member)
  const emergencyContactPhone = getEmergencyContactPhone(member)
  const emergencyContactRelationship = getEmergencyContactRelationship(member)

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
  doc.text(member.memberId || member.profile?.idNumber || 'DRAFT', 89, 74 + frontContentOffsetY, { align: 'center', maxWidth: 78 })

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
  doc.text(formatShortDate(member.profile?.birthday), 164, 196 + frontInfoOffsetY)
  doc.text((member.profile?.gender || '-').toUpperCase(), 299, 196 + frontInfoOffsetY)
  doc.text(contactNumber, 164, 231 + frontInfoOffsetY)

  doc.setTextColor(96, 103, 98)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.text('IN CASE OF EMERGENCY, PLEASE CONTACT:', 230, 381, { align: 'center' })
  doc.setTextColor(31, 38, 33)
  doc.setFontSize(13)
  doc.text(`${emergencyContactName} - ${emergencyContactPhone}`, 230, 398, { align: 'center', maxWidth: 300 })
  doc.setTextColor(107, 114, 108)
  doc.setFontSize(7)
  doc.text(`RELATIONSHIP: ${emergencyContactRelationship}`, 230, 410, { align: 'center', maxWidth: 260 })

  doc.setTextColor(118, 125, 120)
  doc.setFontSize(8)
  doc.text('TERMS AND CONDITIONS', 230, 431, { align: 'center' })
  doc.setTextColor(66, 72, 67)
  doc.setFontSize(7.9)
  doc.text(DIGITAL_ID_TERMS_TEXT, 230, 446, { align: 'center', maxWidth: 235, lineHeightFactor: 1.26 })

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
  doc.setTextColor(101, 109, 103)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(5.8)
  if (DIGITAL_ID_SIGNATORY_OFFICE) {
    doc.text(DIGITAL_ID_SIGNATORY_OFFICE, 230, 554, { align: 'center' })
  }

  return doc
}

async function loadImageData(url: string, output: 'png' | 'jpeg' = 'png') {
  const response = await fetch(url)
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
    const image = new Image()
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

function prettifyStatus(value: string) {
  if (value === 'pending_approval') return 'Pending Superadmin ID Generation'
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

function buildPurok(value?: string) {
  const nextValue = String(value || '').trim()
  return nextValue ? nextValue.toUpperCase() : '-'
}

function buildFrontCardValue(value?: string) {
  const nextValue = String(value || '').trim()
  return nextValue || '-'
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

function getEmergencyContactName(member: DigitalIdDetail) {
  return formatEmergencyContactField(member.profile?.digitalIdEmergencyContactName, 'Not Provided Yet')
}

function getEmergencyContactRelationship(member: DigitalIdDetail) {
  return formatEmergencyContactField(member.profile?.digitalIdEmergencyContactRelationship, 'Not Provided Yet')
}

function getEmergencyContactPhone(member: DigitalIdDetail) {
  return formatEmergencyContactField(member.profile?.digitalIdEmergencyContactPhone, 'Not Provided Yet')
}

function getMemberSignatureUrl(member: DigitalIdDetail) {
  return member.profile?.digitalIdSignatureUrl || null
}

function getEmergencyContactSummary(member: DigitalIdDetail) {
  if (!member.emergencyContactComplete) {
    return 'Not provided yet'
  }

  return `${getEmergencyContactName(member)} (${getEmergencyContactRelationship(member)})`
}

function formatEmergencyContactField(value: string | undefined, fallback: string) {
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

function getDigitalIdValidThru(member: DigitalIdDetail) {
  const baseValue =
    member.digitalIdApprovedAt ||
    member.profile?.digitalIdApprovedAt ||
    member.verifiedAt ||
    member.profile?.verifiedAt ||
    member.digitalIdGeneratedAt ||
    member.profile?.digitalIdGeneratedAt ||
    new Date().toISOString()

  const date = new Date(baseValue)

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
