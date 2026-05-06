'use client'

import { useEffect, useMemo, useState } from 'react'
import jsPDF from 'jspdf'
import JSZip from 'jszip'
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
          <h1 className="text-2xl font-black" style={{ color: 'var(--ink)' }}>Digital IDs</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>
            Generate, review, activate, and print KK Digital IDs through the admin and superadmin workflow.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleBatchDownload}
            disabled={!isSuperadmin || isBatchDownloading || selectedIds.length === 0}
            className="rounded-xl border px-4 py-2.5 text-sm font-semibold shadow-sm hover:bg-[color:var(--accent-soft)] disabled:opacity-60"
            style={{ borderColor: 'var(--stroke)', color: 'var(--accent-strong)', background: 'var(--card)' }}
          >
            {isBatchDownloading ? 'Preparing ZIP...' : 'Batch Download ZIP'}
          </button>
        </div>
      </div>

      {message ? (
        <div className="rounded-xl border px-4 py-3 text-sm bg-[color:var(--accent-soft)]" style={{ borderColor: 'var(--stroke)', color: 'var(--accent-strong)' }}>
          {message}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryTile label="Draft IDs" value={summary.draft} tone="draft" />
        <SummaryTile label="Pending Approval" value={summary.pendingApproval} tone="pending" />
        <SummaryTile label="Active IDs" value={summary.active} tone="active" />
        <SummaryTile label="Deactivated" value={summary.deactivated} tone="deactivated" />
      </div>

      <div className="admin-panel">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="md:col-span-2">
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--muted)' }}>
              Search ID List
            </label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name, email, or ID number"
              className="surface-input w-full rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[color:var(--accent)]/30"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--muted)' }}>
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="surface-input bg-transparent w-full rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[color:var(--accent)]/30"
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
        <div className="overflow-hidden rounded-[var(--radius-lg)] border" style={{ borderColor: 'var(--stroke)', background: 'var(--card)' }}>
          {isLoading ? (
            <div className="flex justify-center py-20">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[color:var(--accent)] border-t-transparent" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[900px] w-full">
                <thead className="bg-[color:var(--accent-soft)]">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <input type="checkbox" checked={allVisibleSelected} onChange={toggleSelectAllVisible} />
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--muted)' }}>Member</th>
                    <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--muted)' }}>ID Number</th>
                    <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--muted)' }}>Status</th>
                    <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--muted)' }}>Verified</th>
                    <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--muted)' }}>Actions</th>
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
                          'cursor-pointer hover:bg-[color:var(--accent-soft)]',
                          selectedMemberId === member.uid ? 'bg-[color:var(--accent-soft)]' : ''
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
                            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-[color:var(--accent-soft)]">
                              {member.profilePhotoUrl ? (
                                <img src={member.profilePhotoUrl} alt={member.fullName} className="h-full w-full object-cover" />
                              ) : (
                                <span className="text-sm font-bold" style={{ color: 'var(--accent-strong)' }}>
                                  {getInitials(member.fullName || member.UserName || '')}
                                </span>
                              )}
                            </div>
                            <div>
                              <p className="font-semibold" style={{ color: 'var(--ink)' }}>
                                {member.fullName || member.UserName || 'Youth Member'}
                              </p>
                              <p className="text-xs" style={{ color: 'var(--muted)' }}>{member.email || 'No email'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-sm font-semibold" style={{ color: 'var(--accent-strong)' }}>
                          {member.memberId || 'Not generated'}
                        </td>
                        <td className="px-5 py-4">
                          <StatusBadge status={member.digitalIdStatus} />
                        </td>
                        <td className="px-5 py-4 text-sm" style={{ color: 'var(--muted)' }}>
                          {member.verifiedAt ? new Date(member.verifiedAt).toLocaleDateString('en-PH') : '-'}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-2">
                            {member.digitalIdStatus === 'draft' && !isSuperadmin ? (
                              <ActionChip
                                label="Send for Approval"
                                disabled={!member.emergencyContactComplete || !member.signatureComplete}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleAction('submit', member)
                                }}
                              />
                            ) : null}
                            {member.digitalIdStatus === 'draft' && isSuperadmin ? (
                              <ActionChip
                                label="Approve & Activate"
                                disabled={!member.emergencyContactComplete || !member.signatureComplete}
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
                                disabled={!member.emergencyContactComplete || !member.signatureComplete}
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

        <div className="admin-panel">
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
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--muted)' }}>ID Preview</p>
                <h2 className="mt-2 text-xl font-black" style={{ color: 'var(--ink)' }}>
                  {selectedMember.fullName || 'Digital ID Draft'}
                </h2>
                <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>
                  Review the card before approval and printing.
                </p>
              </div>

              <DigitalIdPreviewCard member={selectedMember} />

              {!selectedMember.emergencyContactComplete ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  The youth member still needs to add a complete emergency contact before this Digital ID can be generated, submitted, approved, or regenerated.
                </div>
              ) : null}

              {!selectedMember.signatureComplete ? (
                <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                  The youth member still needs to save a Digital ID signature before this Digital ID can be generated, submitted, approved, or regenerated.
                </div>
              ) : null}

              <div className="rounded-2xl bg-[color:var(--accent-soft)] p-4 text-sm" style={{ color: 'var(--ink)' }}>
                <div className="grid gap-2">
                  <DetailRow label="ID Number" value={selectedMember.memberId || selectedMember.profile?.idNumber || 'Not generated'} />
                  <DetailRow label="Status" value={prettifyStatus(selectedMember.digitalIdStatus)} />
                  <DetailRow label="Revision" value={String(selectedMember.digitalIdRevision || selectedMember.profile?.digitalIdRevision || 1)} />
                  <DetailRow label="Emergency Contact" value={getEmergencyContactSummary(selectedMember)} />
                  <DetailRow label="Signature" value={selectedMember.signatureComplete ? 'Saved' : 'Missing'} />
                  <DetailRow label="Verified On" value={formatDate(selectedMember.verifiedAt || selectedMember.profile?.verifiedAt)} />
                  <DetailRow label="Approval Requested" value={formatDate(selectedMember.profile?.digitalIdApprovalRequestedAt)} />
                  <DetailRow label="Approved On" value={formatDate(selectedMember.digitalIdApprovedAt || selectedMember.profile?.digitalIdApprovedAt)} />
                  <DetailRow label="Deactivation Reason" value={selectedMember.profile?.digitalIdDeactivationReason || '-'} />
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                {!selectedMember.memberId ? <PrimaryButton label={isSuperadmin ? 'Generate ID' : 'Generate Draft ID'} disabled={isActionLoading || !selectedMember.emergencyContactComplete || !selectedMember.signatureComplete} onClick={() => handleAction('generate', selectedMember)} /> : null}
                {selectedMember.digitalIdStatus === 'draft' && !isSuperadmin ? <PrimaryButton label="Send to Superadmin" disabled={isActionLoading || !selectedMember.emergencyContactComplete || !selectedMember.signatureComplete} onClick={() => handleAction('submit', selectedMember)} /> : null}
                {selectedMember.digitalIdStatus === 'draft' && isSuperadmin ? <PrimaryButton label="Approve & Activate" disabled={isActionLoading || !selectedMember.emergencyContactComplete || !selectedMember.signatureComplete} onClick={() => handleAction('approve', selectedMember)} /> : null}
                {selectedMember.digitalIdStatus === 'pending_approval' && isSuperadmin ? <PrimaryButton label="Approve & Activate" disabled={isActionLoading || !selectedMember.emergencyContactComplete || !selectedMember.signatureComplete} onClick={() => handleAction('approve', selectedMember)} /> : null}
                {selectedMember.digitalIdStatus === 'active' ? <SecondaryButton label="Download PDF" onClick={() => handleDownloadPdf(selectedMember)} /> : null}
                {selectedMember.memberId && isSuperadmin ? <SecondaryButton label="Regenerate ID" onClick={() => handleAction('regenerate', selectedMember)} disabled={isActionLoading || !selectedMember.emergencyContactComplete || !selectedMember.signatureComplete} /> : null}
                {selectedMember.digitalIdStatus === 'active' && isSuperadmin ? <DangerButton label="Deactivate ID" onClick={() => handleAction('deactivate', selectedMember)} disabled={isActionLoading} /> : null}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="admin-card flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between">
        <p className="text-sm" style={{ color: 'var(--muted)' }}>
          Showing {members.length === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1}-
          {Math.min(pagination.page * pagination.pageSize, pagination.total)} of {pagination.total} IDs
        </p>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={pagination.page === 1} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-40" style={{ borderColor: 'var(--stroke)', color: 'var(--accent-strong)' }}>Previous</button>
          <span className="px-2 text-sm font-semibold" style={{ color: 'var(--accent-strong)' }}>
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button type="button" onClick={() => setCurrentPage((page) => Math.min(pagination.totalPages, page + 1))} disabled={pagination.page === pagination.totalPages} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-40" style={{ borderColor: 'var(--stroke)', color: 'var(--accent-strong)' }}>Next</button>
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
      ? 'bg-amber-50'
      : tone === 'pending'
        ? 'bg-[color:var(--accent-soft)]'
        : tone === 'active'
          ? 'bg-green-50'
          : 'bg-red-50'

  return (
    <div className={cn('admin-card px-4 py-4', bg)}>
      <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--muted)' }}>{label}</p>
      <p className="mt-2 text-2xl font-black" style={{ color: 'var(--ink)' }}>{value.toLocaleString()}</p>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const className =
    status === 'draft'
      ? 'bg-amber-50 text-amber-700'
      : status === 'pending_approval'
        ? 'bg-[color:var(--accent-soft)] text-[color:var(--accent-strong)]'
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
  disabled,
}: {
  label: string
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-full px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-45 bg-[color:var(--accent-soft)] text-[color:var(--accent-strong)] hover:opacity-80"
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
      className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
      style={{ background: 'var(--accent)' }}
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
      className="rounded-xl border px-4 py-2.5 text-sm font-semibold shadow-sm hover:bg-[color:var(--accent-soft)] disabled:opacity-60"
      style={{ borderColor: 'var(--stroke)', color: 'var(--accent-strong)', background: 'var(--card)' }}
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
      <span className="text-xs font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--muted)' }}>{label}</span>
      <span className="text-right text-sm" style={{ color: 'var(--accent-strong)' }}>{value}</span>
    </div>
  )
}

function DigitalIdPreviewCard({ member }: { member: DigitalIdDetail }) {
  const fullName = [member.profile?.firstName, member.profile?.middleName, member.profile?.lastName]
    .filter(Boolean)
    .join(' ')
    .toUpperCase() || member.fullName?.toUpperCase() || 'KABATAAN MEMBER'
  const photoUrl = member.photoUrl || member.profilePhotoUrl || null
  const signatureUrl = getMemberSignatureUrl(member)
  const address = buildAddress(member)
  const validThru = getDigitalIdValidThru(member)
  const emergencyContactName = getEmergencyContactName(member)
  const emergencyContactPhone = getEmergencyContactPhone(member)
  const emergencyContactRelationship = getEmergencyContactRelationship(member)

  return (
    <div className="space-y-4">
      <div className="relative aspect-[1.58/1] overflow-hidden rounded-[24px] border border-[#d9e3f1] shadow-[0_18px_36px_rgba(1,67,132,0.12)]">
        <img src="/images/KK ID - Front BG.png" alt="KK ID front background" className="absolute inset-0 h-full w-full object-cover" />
        <div className="relative flex h-full flex-col px-[8.2%] pb-[10.5%] pt-[22.8%] text-[#0b2f5b]">
          <div className="grid h-full grid-cols-[27%_1fr] gap-[6.5%]">
            <div className="flex flex-col items-center">
              <p className="w-full overflow-hidden text-ellipsis whitespace-nowrap text-center text-[0.35rem] font-black leading-none tracking-[0.05em] text-[#0b2f5b]">
                {member.memberId || member.profile?.idNumber || 'DRAFT'}
              </p>
              <div className="mt-[2.8%] flex h-[49%] w-full items-center justify-center overflow-hidden border border-[#2c5a8f] bg-[#eef4fb]">
                {photoUrl ? <img src={photoUrl} alt={fullName} className="h-full w-full object-cover" /> : <span className="text-sm font-black text-[#014384]">{getInitials(fullName)}</span>}
              </div>
              <div className="mt-[5.2%] flex h-[13%] w-full items-end justify-center overflow-hidden px-[4%]">
                {signatureUrl ? (
                  <img src={signatureUrl} alt="Member signature" className="max-h-full w-full object-contain" />
                ) : null}
              </div>
              <div className="w-full border-t border-[#808080] pt-[3.8%] text-center">
                <p className="text-[0.38rem] font-medium tracking-[0.07em] text-[#1a1a1a]">SIGNATURE</p>
              </div>
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

      <div className="relative aspect-[1.58/1] overflow-hidden rounded-[24px] border border-[#ced8e4] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.98)_0%,rgba(243,241,235,0.96)_58%,rgba(230,227,219,0.98)_100%)] shadow-[0_18px_36px_rgba(1,67,132,0.12)]">
        <div className="absolute inset-[3.6%] rounded-[18px] border-[1.5px] border-[#4e5650]/65" />
        <div className="absolute inset-[6.2%] rounded-[14px] border border-[#838b85]/35" />
        <div className="relative flex h-full flex-col px-[9%] pb-[21.8%] pt-[10%] text-[#2b312e]">
          <div className="text-center">
            <p className="text-[0.42rem] font-bold uppercase tracking-[0.09em] text-[#666d67]">
              In case of emergency, please contact:
            </p>
            <p className="mt-[2.6%] text-[0.74rem] font-black leading-[1.05] tracking-[0.01em] text-[#1f2621]">
              {emergencyContactName} - {emergencyContactPhone}
            </p>
            <p className="mt-[2.2%] text-[0.38rem] font-semibold tracking-[0.08em] text-[#6b726c]">
              Relationship: {emergencyContactRelationship}
            </p>
          </div>

          <div className="mx-auto mt-[5.6%] max-w-[80%] text-center">
            <p className="text-[0.42rem] font-bold uppercase tracking-[0.18em] text-[#767d78]">
              Terms and Conditions
            </p>
            <p className="mt-[3%] text-[0.46rem] font-semibold leading-[1.38] text-[#424843]">
              {DIGITAL_ID_TERMS_TEXT}
            </p>
          </div>

          <div className="mt-auto flex justify-center pt-[0.8%]">
            <div className="flex w-full max-w-[61%] flex-col items-center text-center">
              <p className="text-[0.36rem] font-bold uppercase tracking-[0.16em] text-[#7a807b]">
                Valid Thru
              </p>
              <p className="mt-[1.4%] text-[0.72rem] font-black text-[#222823]">{validThru}</p>
              <p className="mt-[2.6%] text-[0.82rem] font-semibold italic tracking-[0.02em] text-[#444b45]">
                {DIGITAL_ID_SIGNATURE_TEXT}
              </p>
              <div className="mt-[1%] h-px w-[58%] bg-[#4d544e]" />
              <p className="mt-[1.2%] text-[0.34rem] font-black uppercase leading-none tracking-[0.08em] text-[#303731]">
                {DIGITAL_ID_SIGNATORY_NAME}
              </p>
              <p className="mt-[0.6%] text-[0.33rem] font-black uppercase leading-none tracking-[0.12em] text-[#303731]">
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

  doc.setTextColor(11, 47, 91)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(6.8)
  doc.text(member.memberId || member.profile?.idNumber || 'DRAFT', 89, 74, { align: 'center', maxWidth: 78 })

  if (photoData) {
    doc.addImage(photoData, 'JPEG', 53, 86, 72, 94)
  } else {
    doc.setTextColor(1, 67, 132)
    doc.setFontSize(22)
    doc.text(getInitials(fullName), 89, 142, { align: 'center' })
  }

  if (signatureData) {
    doc.addImage(signatureData, 'PNG', 48, 184, 82, 22)
  }

  doc.setDrawColor(128, 128, 128)
  doc.setLineWidth(0.8)
  doc.line(50, 208, 128, 208)
  doc.setTextColor(26, 26, 26)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(5.6)
  doc.text('SIGNATURE', 89, 216, { align: 'center' })

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
  doc.text('VALID THRU', 230, 490, { align: 'center' })
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

  date.setFullYear(date.getFullYear() + 5)

  return date.toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  })
}
