'use client'

import type { Ref } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import jsPDF from 'jspdf'
import JSZip from 'jszip'
import {
  AlertCircle,
  BadgeCheck,
  CheckCircle2,
  Download,
  FileText,
  Hourglass,
  MoreVertical,
  Printer,
  RotateCw,
  Search,
  X,
  XCircle,
} from 'lucide-react'
import api from '@/lib/api'
import {
  captureDigitalIdElement,
  captureDigitalIdNode,
  canvasToJpegBlob,
} from '@/lib/digitalIdCapture'
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
  currentAddressHouseBlockUnitNumber?: string
  currentAddressStreetAddress?: string
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
    currentAddressHouseBlockUnitNumber?: string
    currentAddressStreetAddress?: string
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

interface ActionToast {
  id: number
  tone: 'success' | 'danger'
  title: string
  message: string
}

interface DigitalIdCanvases {
  front: HTMLCanvasElement
  back: HTMLCanvasElement
}

type DigitalIdCanvasSource = DigitalIdCanvases | Promise<DigitalIdCanvases>

const PAGE_SIZE = 10
const EXPORT_ACTION_TIMEOUT_MS = 25_000
const DIGITAL_ID_TERMS_TEXT =
  'This card is non-transferable and must be used only by the cardholder whose signature appears herein. Cardholder privileges remain subject to implementing guidelines approved by the Sangguniang Kabataan Council.'
const DIGITAL_ID_SIGNATORY_SIGNATURE_SRC = '/images/sk-chairperson-signature.png'
const DIGITAL_ID_SIGNATORY_NAME = 'HON. MARK JERVIN B. VENTURA'
const DIGITAL_ID_SIGNATORY_TITLE = 'SK CHAIRPERSON'
const DIGITAL_ID_SIGNATORY_OFFICE = ''
const DIGITAL_ID_BARANGAY_LOGO_SRC = '/images/brgy logo.png'
const DIGITAL_ID_SK_LOGO_SRC = '/images/SKButingLogo.png'
export default function DigitalIdsPage() {
  const [members, setMembers] = useState<DigitalIdMember[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [status, setStatus] = useState('all')
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [isActionLoading, setIsActionLoading] = useState(false)
  const [isBatchDownloading, setIsBatchDownloading] = useState(false)
  const [pdfAction, setPdfAction] = useState<'download' | 'jpeg' | 'print' | null>(null)
  const [adminRole, setAdminRole] = useState('admin')
  const [message, setMessage] = useState('')
  const [toast, setToast] = useState<ActionToast | null>(null)
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)
  const [preferredMemberId, setPreferredMemberId] = useState<string | null>(null)
  const [selectedMember, setSelectedMember] = useState<DigitalIdDetail | null>(null)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [previewSide, setPreviewSide] = useState<'front' | 'back'>('front')
  const frontPreviewRef = useRef<HTMLDivElement | null>(null)
  const backPreviewRef = useRef<HTMLDivElement | null>(null)
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
    if (!toast) return

    const timeout = window.setTimeout(() => {
      setToast((current) => current?.id === toast.id ? null : current)
    }, 5_500)

    return () => window.clearTimeout(timeout)
  }, [toast])

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

  const resolveDigitalIdDetail = async (member: DigitalIdMember | DigitalIdDetail) => {
    if ('profile' in member && member.profile) {
      return member as DigitalIdDetail
    }

    const response = await api.get<{ member: DigitalIdDetail }>(
      `/admin/digital-ids/${member.uid}`,
      { timeout: 10_000 }
    )

    return response.data.member
  }

  const getPreviewCaptureWidth = () => {
    const width = frontPreviewRef.current?.getBoundingClientRect().width

    return width && Number.isFinite(width) && width > 0 ? width : undefined
  }

  const captureSelectedPreviewCanvases = async (detail: DigitalIdDetail) => {
    const frontPreview = frontPreviewRef.current
    const backPreview = backPreviewRef.current

    if (selectedMember?.uid === detail.uid && frontPreview && backPreview) {
      const [front, back] = await Promise.all([
        captureDigitalIdElement(frontPreview),
        captureDigitalIdElement(backPreview),
      ])

      return { front, back }
    }

    return renderDigitalIdCanvases(detail, getPreviewCaptureWidth())
  }

  const handleDownloadPdf = async (member: DigitalIdMember | DigitalIdDetail) => {
    setPdfAction('download')
    setMessage('')
    setToast(null)

    try {
      const detail = await resolveDigitalIdDetail(member)
      const pdf = await withExportTimeout(
        buildDigitalIdPdf(detail, captureSelectedPreviewCanvases(detail)),
        'PDF export timed out. Check the member photo or signature, then try again.'
      )
      pdf.save(`${(detail.memberId || detail.profile?.idNumber || detail.uid).replace(/[^\w-]+/g, '_')}.pdf`)
      showActionToast(
        'success',
        'PDF Download Started',
        'The Digital ID PDF was prepared successfully and sent to your downloads.'
      )
    } catch (error: unknown) {
      showActionToast(
        'danger',
        'PDF Download Failed',
        getExportErrorMessage(error, 'We could not prepare this Digital ID PDF.')
      )
    } finally {
      setPdfAction(null)
    }
  }

  const handleDownloadJpeg = async (member: DigitalIdMember | DigitalIdDetail) => {
    setPdfAction('jpeg')
    setMessage('')
    setToast(null)

    try {
      const detail = await resolveDigitalIdDetail(member)
      const images = await withExportTimeout(
        buildDigitalIdJpegs(detail, captureSelectedPreviewCanvases(detail)),
        'JPEG export timed out. Check the member photo or signature, then try again.'
      )
      const fileName = (detail.memberId || detail.profile?.idNumber || detail.uid)
        .replace(/[^\w-]+/g, '_')
      await downloadDigitalIdJpegZip(images, fileName)
      showActionToast(
        'success',
        'JPEG Download Started',
        'The front and back JPEG files were prepared successfully and sent to your downloads.'
      )
    } catch (error: unknown) {
      showActionToast(
        'danger',
        'JPEG Download Failed',
        getExportErrorMessage(error, 'We could not prepare this Digital ID JPEG.')
      )
    } finally {
      setPdfAction(null)
    }
  }

  const showActionToast = (
    tone: ActionToast['tone'],
    title: string,
    toastMessage: string
  ) => {
    setToast({
      id: Date.now(),
      tone,
      title,
      message: toastMessage,
    })
  }

  const handlePrintPdf = async (member: DigitalIdMember | DigitalIdDetail) => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      setMessage('Allow pop-ups for this site to open the print preview.')
      return
    }

    printWindow.document.title = 'Preparing Digital ID'
    printWindow.document.body.innerHTML =
      '<p style="font-family:Arial,sans-serif;padding:24px;color:#173b68">Preparing Digital ID print preview...</p>'
    setPdfAction('print')
    setMessage('')

    try {
      const detail = await resolveDigitalIdDetail(member)
      const pdf = await withExportTimeout(
        buildDigitalIdPdf(detail, captureSelectedPreviewCanvases(detail)),
        'Print export timed out. Check the member photo or signature, then try again.'
      )
      pdf.autoPrint()
      const url = URL.createObjectURL(pdf.output('blob'))
      printWindow.location.replace(url)
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
      setMessage('Digital ID print preview opened in a new tab.')
    } catch (error: any) {
      printWindow.close()
      setMessage(error?.response?.data?.error || 'We could not prepare this Digital ID for printing.')
    } finally {
      setPdfAction(null)
    }
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
      const fallbackCaptureWidth = getPreviewCaptureWidth()

      for (const member of activeIds) {
        const detailRes = await api.get<{ member: DigitalIdDetail }>(`/admin/digital-ids/${member.uid}`)
        const pdf = await buildDigitalIdPdf(
          detailRes.data.member,
          renderDigitalIdCanvases(detailRes.data.member, fallbackCaptureWidth)
        )
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
    } catch (error: any) {
      setMessage(error?.response?.data?.error || 'We could not prepare the selected Digital IDs.')
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
      {toast ? (
        <ActionToastNotice
          toast={toast}
          onClose={() => setToast(null)}
        />
      ) : null}

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
            disabled={isBatchDownloading || selectedIds.length === 0}
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
                    <DigitalIdPreviewCard member={selectedMember} previewSide="front" cardRef={frontPreviewRef} />
                  </div>
                  <div
                    className={cn(
                      'rounded-[28px] transition-shadow',
                      previewSide === 'back' ? 'ring-2 ring-[color:var(--accent-soft)] ring-offset-2 ring-offset-transparent' : ''
                    )}
                  >
                    <DigitalIdPreviewCard member={selectedMember} previewSide="back" cardRef={backPreviewRef} />
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
                    {selectedMember.digitalIdStatus === 'active' ? <SecondaryButton label={pdfAction === 'download' ? 'Preparing PDF...' : 'Download PDF'} onClick={() => handleDownloadPdf(selectedMember)} disabled={pdfAction !== null} icon="download" /> : null}
                    {selectedMember.digitalIdStatus === 'active' ? <SecondaryButton label={pdfAction === 'jpeg' ? 'Preparing JPEGs...' : 'Download JPEGs'} onClick={() => handleDownloadJpeg(selectedMember)} disabled={pdfAction !== null} icon="download" /> : null}
                    {selectedMember.digitalIdStatus === 'active' ? <SecondaryButton label={pdfAction === 'print' ? 'Preparing print...' : 'Print ID'} onClick={() => handlePrintPdf(selectedMember)} disabled={pdfAction !== null} icon="print" /> : null}
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

function ActionToastNotice({
  toast,
  onClose,
}: {
  toast: ActionToast
  onClose: () => void
}) {
  const isSuccess = toast.tone === 'success'

  return (
    <div
      className="fixed right-4 top-5 z-[100] w-[min(390px,calc(100vw-2rem))]"
      role={isSuccess ? 'status' : 'alert'}
      aria-live={isSuccess ? 'polite' : 'assertive'}
    >
      <div
        className="admin-tone-surface overflow-hidden rounded-2xl shadow-[var(--shadow-lg)]"
        data-tone={toast.tone}
      >
        <div className="flex items-start gap-3 p-4">
          <div
            className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
            style={{ background: 'var(--tone-border)', color: 'var(--tone-status)' }}
          >
            {isSuccess ? (
              <CheckCircle2 className="h-5 w-5" />
            ) : (
              <AlertCircle className="h-5 w-5" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="admin-tone-title text-sm font-black">{toast.title}</p>
            <p className="admin-tone-body mt-1 text-sm leading-5">{toast.message}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="admin-tone-status rounded-lg p-1.5 transition hover:bg-black/5"
            aria-label="Close notification"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div
          className="h-1 w-full"
          style={{ background: 'var(--tone-status)' }}
        />
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
  icon?: 'download' | 'print' | 'refresh' | 'issue'
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
  cardRef,
}: {
  member: DigitalIdDetail
  previewSide: 'front' | 'back'
  cardRef?: Ref<HTMLDivElement>
}) {
  const fullName = [member.profile?.firstName, member.profile?.middleName, member.profile?.lastName]
    .filter(Boolean)
    .join(' ')
    .toUpperCase() || member.fullName?.toUpperCase() || 'KABATAAN MEMBER'
  const photoUrl = getExportSafeImageUrl(member.photoUrl || member.profilePhotoUrl)
  const signatureUrl = getExportSafeImageUrl(getMemberSignatureUrl(member))
  const address = buildAddress(member)
  const purok = buildPurok(member.profile?.purok || member.purok)
  const contactNumber = buildFrontCardValue(member.profile?.contactNumber || member.contactNumber)
  const validThru = getDigitalIdValidThru(member)
  const emergencyContactName = getEmergencyContactName(member)
  const emergencyContactPhone = getEmergencyContactPhone(member)
  const emergencyContactRelationship = getEmergencyContactRelationship(member)

  if (previewSide === 'front') {
    return (
      <div ref={cardRef} className="relative aspect-[1628/1040] overflow-hidden rounded-[24px] [container-type:inline-size] border border-[#d9e3f1] shadow-[0_18px_36px_rgba(1,67,132,0.12)]">
        <img src="/images/KK ID - Front BG.png" alt="KK ID front background" className="absolute inset-0 h-full w-full object-cover" />
        <DigitalIdFrontHeader />
        <div className="relative flex h-full flex-col px-[8.2%] pb-[10.5%] pt-[18.4%] text-[#0b2f5b]">
          <div className="grid h-full grid-cols-[27%_1fr] gap-[6.5%]">
            <div className="flex flex-col items-center">
              <div className="relative z-10 flex min-h-[2.25cqw] w-full items-center justify-center px-[2%]">
                <p className="max-w-full whitespace-nowrap text-center text-[1.7cqw] font-black leading-[1.25] tracking-[0.05em] text-[#0b2f5b]">
                  {member.memberId || member.profile?.idNumber || 'DRAFT'}
                </p>
              </div>
              <div className="relative mt-[3.8%] flex h-[49%] w-full items-center justify-center overflow-hidden border border-[#2c5a8f] bg-[#eef4fb]">
                {photoUrl ? (
                  <>
                    <img
                      src={photoUrl}
                      alt=""
                      aria-hidden="true"
                      className="pointer-events-none absolute h-px w-px opacity-0"
                    />
                    <div
                      role="img"
                      aria-label={fullName}
                      className="h-full w-full bg-cover bg-center bg-no-repeat"
                      style={{ backgroundImage: `url("${photoUrl}")` }}
                    />
                  </>
                ) : (
                  <span className="text-[3cqw] font-black text-[#014384]">{getInitials(fullName)}</span>
                )}
              </div>
              <div className="mt-[4.6%] flex h-[13%] w-full items-end justify-center overflow-hidden px-[4%]">
                {signatureUrl ? (
                  <img src={signatureUrl} alt="Member signature" className="max-h-full w-full object-contain" />
                ) : null}
              </div>
              <div className="w-full border-t border-[#808080] pt-[3.2%] text-center">
                <p className="text-[1.55cqw] font-medium tracking-[0.07em] text-[#1a1a1a]">SIGNATURE</p>
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
    <div ref={cardRef} className="relative aspect-[1628/1040] overflow-hidden rounded-[24px] [container-type:inline-size] border border-[#ced8e4] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.98)_0%,rgba(243,241,235,0.96)_58%,rgba(230,227,219,0.98)_100%)] shadow-[0_18px_36px_rgba(1,67,132,0.12)]">
      <div className="absolute inset-[3.6%] rounded-[18px] border-[1.5px] border-[#4e5650]/65" />
      <div className="absolute inset-[6.2%] rounded-[14px] border border-[#838b85]/35" />
      <div className="relative flex h-full flex-col px-[9%] pb-[10.2%] pt-[9.8%] text-[#2b312e]">
        <div className="text-center">
          <p className="text-[1.24cqw] font-bold uppercase tracking-[0.09em] text-[#666d67]">
            In case of emergency, please contact:
          </p>
          <p className="mt-[2.4%] text-[2.15cqw] font-black leading-[1.08] tracking-[0.01em] text-[#1f2621]">
            {emergencyContactName} - {emergencyContactPhone}
          </p>
          <p className="mt-[1.8%] text-[1.11cqw] font-semibold tracking-[0.08em] text-[#6b726c]">
            Relationship: {emergencyContactRelationship}
          </p>
        </div>

        <div className="mx-auto mt-[5.4%] max-w-[80%] text-center">
          <p className="text-[1.24cqw] font-bold uppercase tracking-[0.18em] text-[#767d78]">
            Terms and Conditions
          </p>
          <p className="mt-[2.4%] text-[1.3cqw] font-semibold leading-[1.32] text-[#424843]">
            {DIGITAL_ID_TERMS_TEXT}
          </p>
        </div>

        <div className="mt-auto flex justify-center pt-[1%]">
          <div className="flex w-full max-w-[68%] flex-col items-center text-center">
            <p className="text-[1.11cqw] font-bold uppercase tracking-[0.16em] text-[#7a807b]">
              Valid Until
            </p>
            <p className="mt-[1.4%] text-[2.08cqw] font-black leading-none text-[#222823]">{validThru}</p>
            <div className="mt-[1.2%] flex h-[8.8cqw] w-full items-center justify-center overflow-hidden">
              <img
                src={DIGITAL_ID_SIGNATORY_SIGNATURE_SRC}
                alt="Signature of Mark Jervin B. Ventura"
                draggable={false}
                className="block h-full w-auto max-w-[48%] object-contain"
                style={{ transform: 'rotate(180deg)' }}
              />
            </div>
            <div className="-mt-[0.4%] h-px w-[58%] bg-[#4d544e]" />
            <p className="mt-[1.4%] text-[1.42cqw] font-black uppercase leading-[1.1] tracking-[0.06em] text-[#303731]">
              {DIGITAL_ID_SIGNATORY_NAME}
            </p>
            <p className="mt-[0.8%] text-[1.22cqw] font-black uppercase leading-[1.1] tracking-[0.1em] text-[#303731]">
              {DIGITAL_ID_SIGNATORY_TITLE}
            </p>
            {DIGITAL_ID_SIGNATORY_OFFICE ? (
              <p className="mt-[0.5%] text-[1.15cqw] font-semibold uppercase leading-none tracking-[0.11em] text-[#656d67]">
                {DIGITAL_ID_SIGNATORY_OFFICE}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}

function DigitalIdFrontHeader() {
  return (
    <div className="absolute inset-x-0 top-0 h-[18.9%] bg-[#014384] text-white">
      <img
        src={DIGITAL_ID_BARANGAY_LOGO_SRC}
        alt="Barangay Buting seal"
        className="absolute left-[4.1%] top-[16%] h-[62%] w-auto rounded-full object-contain"
      />
      <img
        src={DIGITAL_ID_SK_LOGO_SRC}
        alt="Katipunan ng Kabataan Barangay Buting seal"
        className="absolute right-[4.1%] top-[16%] h-[62%] w-auto rounded-full object-contain"
      />
      <div className="absolute inset-x-[13.2%] top-[15%] text-center">
        <p className="whitespace-nowrap font-serif text-[clamp(1rem,4.4cqw,2.05rem)] leading-none tracking-[0.08em]">
          KATIPUNAN NG KABATAAN
        </p>
        <p className="mt-[1.2%] whitespace-nowrap text-[clamp(0.32rem,1.25cqw,0.64rem)] font-semibold uppercase leading-none tracking-[0.08em]">
          SANGGUNIANG KABATAAN NG BARANGAY BUTING, PASIG CITY
        </p>
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

function SecondaryButtonIcon({ icon }: { icon: 'download' | 'print' | 'refresh' | 'issue' }) {
  if (icon === 'download') {
    return <Download className="h-4 w-4" />
  }

  if (icon === 'print') {
    return <Printer className="h-4 w-4" />
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
      <p className="text-[1.55cqw] font-bold uppercase leading-[1.18] tracking-[0.06em] text-[#1d5aa1]">{label}:</p>
      <p className="break-words text-[2.62cqw] font-black leading-[1.15] text-[#0b2f5b]">{value || '-'}</p>
    </div>
  )
}

function withExportTimeout<T>(promise: Promise<T>, message: string) {
  return new Promise<T>((resolve, reject) => {
    const timeout = window.setTimeout(
      () => reject(new Error(message)),
      EXPORT_ACTION_TIMEOUT_MS
    )

    promise.then(
      (value) => {
        window.clearTimeout(timeout)
        resolve(value)
      },
      (error) => {
        window.clearTimeout(timeout)
        reject(error)
      }
    )
  })
}

function getExportErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  if (typeof error === 'object' && error !== null) {
    const responseError = error as {
      response?: {
        data?: {
          error?: unknown
        }
      }
    }
    const apiMessage = responseError.response?.data?.error

    if (typeof apiMessage === 'string' && apiMessage.trim()) {
      return apiMessage
    }
  }

  return fallback
}

async function buildDigitalIdPdf(
  member: DigitalIdDetail,
  canvasSource?: DigitalIdCanvasSource
) {
  const { front, back } = canvasSource ? await canvasSource : await renderDigitalIdCanvases(member)
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'px',
    format: [front.width, front.height],
  })

  drawDigitalIdPdfPage(doc, front)
  doc.addPage([back.width, back.height], 'landscape')
  drawDigitalIdPdfPage(doc, back)

  return doc
}

function drawDigitalIdPdfPage(
  doc: jsPDF,
  canvas: HTMLCanvasElement
) {
  doc.addImage(
    canvas.toDataURL('image/png'),
    'PNG',
    0,
    0,
    canvas.width,
    canvas.height
  )
}

async function buildDigitalIdJpegs(
  member: DigitalIdDetail,
  canvasSource?: DigitalIdCanvasSource
) {
  return canvasSource ? await canvasSource : await renderDigitalIdCanvases(member)
}

async function downloadDigitalIdJpegZip(
  canvases: DigitalIdCanvases,
  baseFileName: string
) {
  const zip = new JSZip()
  const [frontBlob, backBlob] = await Promise.all([
    canvasToJpegBlob(canvases.front),
    canvasToJpegBlob(canvases.back),
  ])

  zip.file(`${baseFileName}-front.jpg`, frontBlob)
  zip.file(`${baseFileName}-back.jpg`, backBlob)

  const blob = await zip.generateAsync({ type: 'blob' })
  downloadBlob(blob, `${baseFileName}-jpeg.zip`)
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000)
}

async function renderDigitalIdCanvases(member: DigitalIdDetail, width?: number) {
  const captureOptions = width ? { width } : undefined
  const [front, back] = await Promise.all([
    captureDigitalIdNode(
      <DigitalIdPreviewCard member={member} previewSide="front" />,
      captureOptions
    ),
    captureDigitalIdNode(
      <DigitalIdPreviewCard member={member} previewSide="back" />,
      captureOptions
    ),
  ])

  return { front, back }
}

function getExportSafeImageUrl(value?: string | null) {
  const normalizedUrl = String(value || '').trim()

  if (
    !normalizedUrl ||
    normalizedUrl.startsWith('data:') ||
    normalizedUrl.startsWith('blob:') ||
    normalizedUrl.startsWith('/')
  ) {
    return normalizedUrl || null
  }

  if (/^https?:\/\//i.test(normalizedUrl)) {
    try {
      const parsedUrl = new URL(normalizedUrl)

      if (typeof window !== 'undefined' && parsedUrl.origin === window.location.origin) {
        return `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`
      }
    } catch {
      return normalizedUrl
    }

    return `/api/image-proxy?url=${encodeURIComponent(normalizedUrl)}`
  }

  return normalizedUrl
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

function buildAddress(
  member: Pick<
    DigitalIdDetail,
    | 'profile'
    | 'currentAddressHouseBlockUnitNumber'
    | 'currentAddressStreetAddress'
    | 'barangay'
    | 'city'
    | 'province'
  >,
) {
  return [
    member.profile?.currentAddressHouseBlockUnitNumber || member.currentAddressHouseBlockUnitNumber,
    member.profile?.currentAddressStreetAddress || member.currentAddressStreetAddress,
    member.profile?.barangay || member.barangay,
    member.profile?.city || member.city,
    member.profile?.province || member.province,
  ]
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
