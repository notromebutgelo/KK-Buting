'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import api from '@/lib/api'
import { cn } from '@/utils/cn'

interface YouthMember {
  uid: string
  UserName: string
  email: string
  createdAt: string
  fullName?: string
  idNumber?: string | null
  age?: number | null
  barangay?: string | null
  purok?: string | null
  contactNumber?: string | null
  gender?: string | null
  ageGroup?: string | null
  profilingStatus?: 'completed' | 'incomplete'
  verificationStatus?: 'pending' | 'verified' | 'rejected' | 'not_submitted'
  isArchived?: boolean
  points?: {
    totalPoints: number
  }
}

interface YouthListResponse {
  users: YouthMember[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
  filters?: {
    purokOptions?: string[]
  }
  summary?: {
    filteredMembers: number
    verified: number
    pending: number
    archived: number
  }
}

type SortKey = 'fullName' | 'createdAt' | 'verificationStatus' | 'ageGroup'

const PAGE_SIZE = 10

export default function YouthPage() {
  const [members, setMembers] = useState<YouthMember[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('createdAt')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [verificationStatus, setVerificationStatus] = useState('all')
  const [profilingStatus, setProfilingStatus] = useState('all')
  const [ageGroup, setAgeGroup] = useState('all')
  const [gender, setGender] = useState('all')
  const [purok, setPurok] = useState('all')
  const [archiveScope, setArchiveScope] = useState<'active' | 'archived' | 'all'>('active')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const [pagination, setPagination] = useState<YouthListResponse['pagination']>({
    page: 1,
    pageSize: PAGE_SIZE,
    total: 0,
    totalPages: 1,
  })
  const [summary, setSummary] = useState<YouthListResponse['summary']>({
    filteredMembers: 0,
    verified: 0,
    pending: 0,
    archived: 0,
  })
  const [purokOptions, setPurokOptions] = useState<string[]>([])

  const queryParams = useMemo(
    () => ({
      search,
      verificationStatus,
      profilingStatus,
      ageGroup,
      gender,
      purok,
      archiveScope,
      dateFrom,
      dateTo,
      sortKey,
      sortDir,
      page: currentPage,
      pageSize: PAGE_SIZE,
    }),
    [
      search,
      verificationStatus,
      profilingStatus,
      ageGroup,
      gender,
      purok,
      archiveScope,
      dateFrom,
      dateTo,
      sortKey,
      sortDir,
      currentPage,
    ]
  )

  useEffect(() => {
    let isMounted = true

    const loadMembers = async () => {
      setIsLoading(true)
      try {
        const res = await api.get<YouthListResponse>('/admin/youth', { params: queryParams })
        if (!isMounted) return
        setMembers(res.data.users || [])
        setPagination(res.data.pagination)
        setSummary(
          res.data.summary || {
            filteredMembers: res.data.pagination?.total || 0,
            verified: 0,
            pending: 0,
            archived: 0,
          }
        )
        setPurokOptions(res.data.filters?.purokOptions || [])
      } catch {
        if (!isMounted) return
        setMembers([])
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    loadMembers()
    return () => {
      isMounted = false
    }
  }, [queryParams])

  useEffect(() => {
    setCurrentPage(1)
  }, [search, verificationStatus, profilingStatus, ageGroup, gender, purok, archiveScope, dateFrom, dateTo])

  const allVisibleSelected =
    members.length > 0 && members.every((member) => selectedIds.includes(member.uid))

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((current) => (current === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortKey(key)
    setSortDir('asc')
  }

  const toggleSelectAllVisible = () => {
    if (allVisibleSelected) {
      setSelectedIds((current) => current.filter((id) => !members.some((member) => member.uid === id)))
      return
    }

    setSelectedIds((current) => [
      ...Array.from(new Set([...current, ...members.map((member) => member.uid)])),
    ])
  }

  const toggleSelectOne = (uid: string) => {
    setSelectedIds((current) =>
      current.includes(uid) ? current.filter((id) => id !== uid) : [...current, uid]
    )
  }

  const getExportRows = async () => {
    const res = await api.get<YouthListResponse>('/admin/youth', {
      params: {
        ...queryParams,
        page: 1,
        pageSize: 5000,
      },
    })

    const rows = res.data.users || []
    return rows.filter((member) => selectedIds.length === 0 || selectedIds.includes(member.uid))
  }

  const exportCsv = async () => {
    setIsExporting(true)
    try {
      const exportRows = await getExportRows()
      const header = [
        'Full Name',
        'Email',
        'Contact Number',
        'KK ID Number',
        'Age',
        'Age Group',
        'Gender',
        'Barangay',
        'Purok',
        'Profiling Status',
        'Verification Status',
        'Points Balance',
        'Date Registered',
      ]

      const rows = exportRows.map((member) => [
        member.fullName || member.UserName || '',
        member.email || '',
        member.contactNumber || '',
        member.idNumber || '',
        member.age ?? '',
        member.ageGroup || '',
        member.gender || '',
        member.barangay || '',
        member.purok || '',
        member.profilingStatus || '',
        member.verificationStatus || '',
        member.points?.totalPoints ?? 0,
        member.createdAt ? new Date(member.createdAt).toLocaleDateString('en-PH') : '',
      ])

      const csv = [header, ...rows]
        .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n')

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'kk-youth-export.csv')
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } finally {
      setIsExporting(false)
    }
  }

  const exportPdf = async () => {
    setIsExporting(true)
    try {
      const exportRows = await getExportRows()
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'pt',
        format: 'a4',
      })
      const generatedAt = new Date().toLocaleString('en-PH')
      const filterSummary = buildFilterSummary({
        search,
        verificationStatus,
        profilingStatus,
        ageGroup,
        gender,
        purok,
        archiveScope,
        dateFrom,
        dateTo,
        selectedCount: selectedIds.length,
      })

      doc.setFillColor(1, 67, 132)
      doc.rect(0, 0, doc.internal.pageSize.getWidth(), 72, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(20)
      doc.text('Youth Management Report', 40, 44)

      doc.setTextColor(19, 34, 56)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      doc.text('Sangguniang Kabataan Barangay Buting', 40, 98)
      doc.text(`Generated: ${generatedAt}`, 40, 114)
      doc.text(`Rows exported: ${exportRows.length}`, 40, 130)

      const wrappedFilters = doc.splitTextToSize(filterSummary, doc.internal.pageSize.getWidth() - 80)
      doc.setFont('helvetica', 'bold')
      doc.text('Applied filters:', 40, 152)
      doc.setFont('helvetica', 'normal')
      doc.text(wrappedFilters, 120, 152)

      autoTable(doc, {
        startY: 182,
        head: [[
          'Full Name',
          'Email',
          'Contact',
          'KK ID',
          'Age',
          'Age Group',
          'Gender',
          'Barangay',
          'Purok',
          'Profiling',
          'Verification',
          'Points',
          'Registered',
        ]],
        body: exportRows.map((member) => [
          member.fullName || member.UserName || '',
          member.email || '',
          member.contactNumber || '',
          member.idNumber || '',
          member.age ?? '',
          member.ageGroup || '',
          member.gender || '',
          member.barangay || '',
          member.purok || '',
          member.profilingStatus || '',
          member.verificationStatus || '',
          String(member.points?.totalPoints ?? 0),
          member.createdAt ? new Date(member.createdAt).toLocaleDateString('en-PH') : '',
        ]),
        styles: {
          font: 'helvetica',
          fontSize: 8,
          cellPadding: 6,
          textColor: [19, 34, 56],
          lineColor: [216, 224, 234],
          lineWidth: 0.5,
        },
        headStyles: {
          fillColor: [5, 114, 220],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
        },
        alternateRowStyles: {
          fillColor: [250, 252, 255],
        },
        margin: { left: 24, right: 24, top: 24, bottom: 24 },
        didDrawPage: () => {
          const pageCount = doc.getNumberOfPages()
          const pageSize = doc.internal.pageSize
          doc.setFontSize(8)
          doc.setTextColor(73, 97, 127)
          doc.text(
            `Page ${doc.getCurrentPageInfo().pageNumber} of ${pageCount}`,
            pageSize.getWidth() - 70,
            pageSize.getHeight() - 12
          )
        },
      })

      doc.save(`kk-youth-report-${new Date().toISOString().slice(0, 10)}.pdf`)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--ink)' }}>Youth Management</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>
            Search, review, export, and maintain youth member records without leaving the admin
            workflow.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={exportCsv}
            disabled={isExporting}
            className="rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-[color:var(--accent-soft)] disabled:opacity-60"
            style={{ borderColor: 'var(--stroke)', color: 'var(--accent-strong)' }}
          >
            {isExporting ? 'Preparing export...' : `Export ${selectedIds.length > 0 ? 'Selected' : 'Filtered'} CSV`}
          </button>
          <button
            type="button"
            onClick={exportPdf}
            disabled={isExporting}
            className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
            style={{ background: 'var(--accent)' }}
          >
            Export PDF Report
          </button>
        </div>
      </div>

      <div className="admin-panel p-5">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <SearchInput value={search} onChange={setSearch} />
          <FilterSelect label="Verification Status" value={verificationStatus} onChange={setVerificationStatus} options={['all', 'not_submitted', 'pending', 'verified', 'rejected']} />
          <FilterSelect label="Profiling Status" value={profilingStatus} onChange={setProfilingStatus} options={['all', 'completed', 'incomplete']} />
          <FilterSelect
            label="Age Group"
            value={ageGroup}
            onChange={setAgeGroup}
            options={['all', 'Early Youth (15-17)', 'Late Youth (18-24)', 'Young Adult (25-30)']}
          />
          <FilterSelect label="Gender" value={gender} onChange={setGender} options={['all', 'Male', 'Female', 'Prefer not to say']} />
          <FilterSelect label="Purok / Zone" value={purok} onChange={setPurok} options={['all', ...purokOptions]} />
          <FilterSelect label="Archive Scope" value={archiveScope} onChange={(value) => setArchiveScope(value as typeof archiveScope)} options={['active', 'archived', 'all']} />
          <div className="grid grid-cols-2 gap-3">
            <DateInput label="Date From" value={dateFrom} onChange={setDateFrom} />
            <DateInput label="Date To" value={dateTo} onChange={setDateTo} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Filtered Members" value={summary?.filteredMembers || pagination.total} />
        <StatTile label="Verified" value={summary?.verified || 0} />
        <StatTile label="Pending Review" value={summary?.pending || 0} />
        <StatTile label="Archived" value={summary?.archived || 0} />
      </div>

      <div className="overflow-hidden rounded-[var(--radius-lg)] border" style={{ borderColor: 'var(--stroke)', background: 'var(--card)' }}>
        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[color:var(--accent)] border-t-transparent" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1200px] w-full">
              <thead className="bg-[color:var(--accent-soft)]">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input type="checkbox" checked={allVisibleSelected} onChange={toggleSelectAllVisible} />
                  </th>
                  <SortableHeader label="Full Name" active={sortKey === 'fullName'} direction={sortDir} onClick={() => toggleSort('fullName')} />
                  <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--muted)' }}>KK ID</th>
                  <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--muted)' }}>Age</th>
                  <SortableHeader label="Age Group" active={sortKey === 'ageGroup'} direction={sortDir} onClick={() => toggleSort('ageGroup')} />
                  <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--muted)' }}>Barangay</th>
                  <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--muted)' }}>Profiling</th>
                  <SortableHeader label="Verification" active={sortKey === 'verificationStatus'} direction={sortDir} onClick={() => toggleSort('verificationStatus')} />
                  <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--muted)' }}>Points</th>
                  <SortableHeader label="Registered" active={sortKey === 'createdAt'} direction={sortDir} onClick={() => toggleSort('createdAt')} />
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--stroke)]">
                {members.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-5 py-14 text-center text-sm" style={{ color: 'var(--muted)' }}>
                      No youth members found with the current filters.
                    </td>
                  </tr>
                ) : (
                  members.map((member) => (
                    <tr key={member.uid} className="hover:bg-[color:var(--accent-soft)]">
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(member.uid)}
                          onChange={() => toggleSelectOne(member.uid)}
                        />
                      </td>
                      <td className="px-5 py-4">
                        <div>
                          <p className="font-semibold" style={{ color: 'var(--ink)' }}>
                            {member.fullName || member.UserName}
                          </p>
                          <p className="text-xs" style={{ color: 'var(--muted)' }}>
                            {member.email || 'No email'} | {member.contactNumber || 'No contact'}
                          </p>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm" style={{ color: 'var(--ink)' }}>
                        {member.idNumber || '-'}
                      </td>
                      <td className="px-5 py-4 text-sm" style={{ color: 'var(--ink)' }}>
                        {member.age ?? '-'}
                      </td>
                      <td className="px-5 py-4 text-sm" style={{ color: 'var(--ink)' }}>
                        {member.ageGroup || '-'}
                      </td>
                      <td className="px-5 py-4 text-sm" style={{ color: 'var(--ink)' }}>
                        <div>{member.barangay || '-'}</div>
                        <div className="text-xs" style={{ color: 'var(--muted)' }}>{member.purok || 'No purok'}</div>
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge
                          label={member.profilingStatus || 'incomplete'}
                          tone={member.profilingStatus === 'completed' ? 'complete' : 'incomplete'}
                        />
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge
                          label={member.verificationStatus || 'pending'}
                          tone={member.verificationStatus || 'pending'}
                        />
                      </td>
                      <td className="px-5 py-4 text-sm font-semibold" style={{ color: 'var(--accent-strong)' }}>
                        {(member.points?.totalPoints || 0).toLocaleString()}
                      </td>
                      <td className="px-5 py-4 text-sm" style={{ color: 'var(--muted)' }}>
                        {member.createdAt ? new Date(member.createdAt).toLocaleDateString('en-PH') : '-'}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Link
                          href={`/youth/${member.uid}`}
                          className="font-semibold text-[color:var(--accent)] hover:text-[color:var(--accent-strong)]"
                        >
                          View Profile
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="admin-card flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between">
        <p className="text-sm" style={{ color: 'var(--muted)' }}>
          Showing {members.length === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1}-
          {Math.min(pagination.page * pagination.pageSize, pagination.total)} of {pagination.total} members
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
    </div>
  )
}

function SearchInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="md:col-span-2">
      <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--muted)' }}>
        Search
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Name, email, contact number, or KK ID"
        className="surface-input w-full rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[color:var(--accent)]/30"
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
      <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--muted)' }}>
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="surface-input w-full rounded-xl bg-transparent px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[color:var(--accent)]/30"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option === 'all' ? 'All' : option.split('_').join(' ')}
          </option>
        ))}
      </select>
    </div>
  )
}

function DateInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--muted)' }}>
        {label}
      </label>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="surface-input w-full rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[color:var(--accent)]/30"
      />
    </div>
  )
}

function SortableHeader({
  label,
  active,
  direction,
  onClick,
}: {
  label: string
  active: boolean
  direction: 'asc' | 'desc'
  onClick: () => void
}) {
  return (
    <th
      className="cursor-pointer px-5 py-3 text-left text-xs font-bold uppercase tracking-[0.16em] hover:text-[color:var(--accent-strong)]"
      style={{ color: 'var(--muted)' }}
      onClick={onClick}
    >
      {label}
      <span
        className={cn(
          'ml-2 inline-block text-[11px]',
          active ? 'text-[color:var(--accent-strong)]' : 'text-transparent'
        )}
      >
        {direction === 'asc' ? '^' : 'v'}
      </span>
    </th>
  )
}

function StatusBadge({
  label,
  tone,
}: {
  label: string
  tone: 'pending' | 'verified' | 'rejected' | 'not_submitted' | 'complete' | 'incomplete' | string
}) {
  const className =
    tone === 'verified'
      ? 'bg-[color:var(--accent-soft)] text-[color:var(--accent-strong)]'
      : tone === 'pending'
        ? 'bg-amber-50 text-amber-700'
        : tone === 'not_submitted'
          ? 'bg-[color:var(--surface-muted)] text-[color:var(--muted)]'
        : tone === 'rejected'
          ? 'bg-red-100 text-red-700'
          : tone === 'complete'
            ? 'bg-[color:var(--accent-soft)] text-[color:var(--accent-strong)]'
            : 'bg-[color:var(--surface-muted)] text-[color:var(--muted)]'

  return (
    <span className={cn('inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize', className)}>
      {label}
    </span>
  )
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="admin-card px-4 py-4">
      <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--muted)' }}>{label}</p>
      <p className="mt-2 text-2xl font-black" style={{ color: 'var(--ink)' }}>{value.toLocaleString()}</p>
    </div>
  )
}

function buildFilterSummary({
  search,
  verificationStatus,
  profilingStatus,
  ageGroup,
  gender,
  purok,
  archiveScope,
  dateFrom,
  dateTo,
  selectedCount,
}: {
  search: string
  verificationStatus: string
  profilingStatus: string
  ageGroup: string
  gender: string
  purok: string
  archiveScope: string
  dateFrom: string
  dateTo: string
  selectedCount: number
}) {
  const segments = [
    selectedCount > 0 ? `Selected rows only (${selectedCount})` : 'All rows from current filtered view',
    search ? `Search: ${search}` : '',
    verificationStatus !== 'all' ? `Verification: ${verificationStatus}` : '',
    profilingStatus !== 'all' ? `Profiling: ${profilingStatus}` : '',
    ageGroup !== 'all' ? `Age group: ${ageGroup}` : '',
    gender !== 'all' ? `Gender: ${gender}` : '',
    purok !== 'all' ? `Purok: ${purok}` : '',
    archiveScope !== 'active' ? `Archive scope: ${archiveScope}` : 'Archive scope: active only',
    dateFrom ? `From: ${dateFrom}` : '',
    dateTo ? `To: ${dateTo}` : '',
  ].filter(Boolean)

  return segments.join(' | ')
}
