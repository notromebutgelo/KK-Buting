'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  BadgeCheck,
  CalendarDays,
  ChevronDown,
  CircleX,
  Clock3,
  Eye,
  Filter,
  MapPin,
  MoreHorizontal,
  Search,
  Sparkles,
  Store,
  X,
} from 'lucide-react'

import api from '@/lib/api'
import {
  AdminEmptyState,
  AdminNotice,
  AdminSurface,
  AdminTableShell,
} from '@/components/admin/workspace'
import { DashboardPill } from '@/components/dashboard/primitives'
import { cn } from '@/utils/cn'

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected' | 'expired'
type SortOption = 'newest' | 'oldest'
type SubmissionSource = 'all' | 'merchant_portal'

interface Promotion {
  id: string
  merchantId?: string
  merchantName?: string
  title: string
  description?: string
  type?: string
  value?: number
  minPurchaseAmount?: number
  status: string
  submittedAt?: string
  reviewedBy?: string | null
  reviewedAt?: string | null
  reviewNote?: string | null
  expiresAt?: string | null
}

interface MerchantRecord {
  id: string
  name: string
  category?: string
  address?: string
  ownerEmail?: string | null
  contactNumber?: string | null
  ownerPhone?: string | null
  logoUrl?: string | null
  imageUrl?: string | null
}

interface EnrichedPromotion extends Promotion {
  merchant?: MerchantRecord | null
  submissionSource: SubmissionSource
}

const sourceOptions: Array<{ value: SubmissionSource; label: string }> = [
  { value: 'all', label: 'All Sources' },
  { value: 'merchant_portal', label: 'Merchant Portal' },
]

export default function PromotionsPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [merchants, setMerchants] = useState<MerchantRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [search, setSearch] = useState('')
  const [merchantFilter, setMerchantFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('')
  const [sourceFilter, setSourceFilter] = useState<SubmissionSource>('all')
  const [sortBy, setSortBy] = useState<SortOption>('newest')
  const [selected, setSelected] = useState<EnrichedPromotion | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [rejectNote, setRejectNote] = useState('')
  const [showRejectInput, setShowRejectInput] = useState(false)

  useEffect(() => {
    void loadData()
  }, [])

  async function loadData() {
    setIsLoading(true)
    try {
      const [promotionsRes, merchantsRes] = await Promise.all([
        api.get('/promotions'),
        api.get('/admin/merchants'),
      ])

      setPromotions(promotionsRes.data.promotions || [])
      setMerchants(merchantsRes.data.merchants || merchantsRes.data || [])
    } catch {
      setPromotions([])
      setMerchants([])
    } finally {
      setIsLoading(false)
    }
  }

  const merchantMap = useMemo(() => {
    return new Map(merchants.map((merchant) => [merchant.id, merchant]))
  }, [merchants])

  const enrichedPromotions = useMemo<EnrichedPromotion[]>(
    () =>
      promotions.map((promotion) => ({
        ...promotion,
        merchant: promotion.merchantId ? merchantMap.get(promotion.merchantId) || null : null,
        submissionSource: 'merchant_portal',
      })),
    [merchantMap, promotions]
  )

  const counts = useMemo(
    () => ({
      all: enrichedPromotions.length,
      pending: enrichedPromotions.filter((promotion) => promotion.status === 'pending').length,
      approved: enrichedPromotions.filter(
        (promotion) => promotion.status === 'approved' || promotion.status === 'active'
      ).length,
      rejected: enrichedPromotions.filter((promotion) => promotion.status === 'rejected').length,
      expired: enrichedPromotions.filter((promotion) => promotion.status === 'expired').length,
    }),
    [enrichedPromotions]
  )

  const categoryOptions = useMemo(
    () =>
      Array.from(
        new Set(
          enrichedPromotions
            .map((promotion) => promotion.merchant?.category || prettifyType(promotion.type))
            .filter(Boolean) as string[]
        )
      ).sort((a, b) => a.localeCompare(b)),
    [enrichedPromotions]
  )

  const merchantOptions = useMemo(
    () =>
      Array.from(
        new Set(
          enrichedPromotions
            .map((promotion) => ({
              id: promotion.merchantId || '',
              label: promotion.merchantName || promotion.merchant?.name || 'Unknown Merchant',
            }))
            .filter((merchant) => merchant.id)
            .map((merchant) => JSON.stringify(merchant))
        )
      )
        .map((value) => JSON.parse(value) as { id: string; label: string })
        .sort((a, b) => a.label.localeCompare(b.label)),
    [enrichedPromotions]
  )

  const filtered = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    const next = enrichedPromotions.filter((promotion) => {
      const matchesStatus =
        statusFilter === 'all' ||
        promotion.status === statusFilter ||
        (statusFilter === 'approved' &&
          (promotion.status === 'active' || promotion.status === 'approved'))

      const haystack = [
        promotion.title,
        promotion.description,
        promotion.merchantName,
        promotion.merchant?.name,
        promotion.merchant?.ownerEmail,
        promotion.merchant?.address,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      const matchesSearch = !normalizedSearch || haystack.includes(normalizedSearch)
      const matchesMerchant =
        merchantFilter === 'all' || String(promotion.merchantId || '') === merchantFilter
      const categoryValue = promotion.merchant?.category || prettifyType(promotion.type)
      const matchesCategory = categoryFilter === 'all' || categoryValue === categoryFilter
      const matchesDate =
        !dateFilter ||
        (promotion.submittedAt
          ? new Date(promotion.submittedAt).toISOString().slice(0, 10) === dateFilter
          : false)
      const matchesSource =
        sourceFilter === 'all' || promotion.submissionSource === sourceFilter

      return (
        matchesStatus &&
        matchesSearch &&
        matchesMerchant &&
        matchesCategory &&
        matchesDate &&
        matchesSource
      )
    })

    return [...next].sort((a, b) => {
      const aTime = new Date(a.submittedAt || 0).getTime()
      const bTime = new Date(b.submittedAt || 0).getTime()
      return sortBy === 'newest' ? bTime - aTime : aTime - bTime
    })
  }, [
    categoryFilter,
    dateFilter,
    enrichedPromotions,
    merchantFilter,
    search,
    sortBy,
    sourceFilter,
    statusFilter,
  ])

  const pendingToday = useMemo(
    () =>
      enrichedPromotions.filter(
        (promotion) => promotion.status === 'pending' && isSameDay(promotion.submittedAt)
      ).length,
    [enrichedPromotions]
  )

  const approvedThisWeek = useMemo(
    () =>
      enrichedPromotions.filter(
        (promotion) =>
          (promotion.status === 'active' || promotion.status === 'approved') &&
          isInCurrentWeek(promotion.reviewedAt || promotion.submittedAt)
      ).length,
    [enrichedPromotions]
  )

  const rejectedThisWeek = useMemo(
    () =>
      enrichedPromotions.filter(
        (promotion) =>
          promotion.status === 'rejected' &&
          isInCurrentWeek(promotion.reviewedAt || promotion.submittedAt)
      ).length,
    [enrichedPromotions]
  )

  const expiredThisWeek = useMemo(
    () =>
      enrichedPromotions.filter(
        (promotion) =>
          promotion.status === 'expired' && isInCurrentWeek(promotion.expiresAt)
      ).length,
    [enrichedPromotions]
  )

  async function handleReview(decision: 'approved' | 'rejected') {
    if (!selected) return

    if (decision === 'rejected' && !rejectNote.trim()) {
      setMessage('Please enter a rejection note before rejecting this promotion.')
      return
    }

    setIsSaving(true)
    setMessage('')

    try {
      await api.patch(`/promotions/${selected.id}/review`, {
        decision,
        reviewNote: decision === 'rejected' ? rejectNote : undefined,
      })

      setMessage(`Promotion ${decision === 'approved' ? 'approved' : 'rejected'} successfully.`)
      setRejectNote('')
      setShowRejectInput(false)
      setSelected(null)
      await loadData()
    } catch (error: any) {
      setMessage(error?.response?.data?.error || 'Failed to review promotion.')
    } finally {
      setIsSaving(false)
    }
  }

  function openPromotion(promotion: EnrichedPromotion, mode: 'view' | 'reject' = 'view') {
    setSelected(promotion)
    setRejectNote('')
    setShowRejectInput(mode === 'reject')
    setMessage('')
  }

  function resetFilters() {
    setSearch('')
    setMerchantFilter('all')
    setCategoryFilter('all')
    setDateFilter('')
    setSourceFilter('all')
    setStatusFilter('all')
    setSortBy('newest')
  }

  const tabs: Array<{ id: StatusFilter; label: string; count: number }> = [
    { id: 'all', label: 'All Status', count: counts.all },
    { id: 'pending', label: 'Pending', count: counts.pending },
    { id: 'approved', label: 'Approved', count: counts.approved },
    { id: 'rejected', label: 'Rejected', count: counts.rejected },
    { id: 'expired', label: 'Expired', count: counts.expired },
  ]

  const messageTone =
    message.toLowerCase().includes('fail') || message.toLowerCase().includes('please')
      ? 'danger'
      : 'success'

  return (
    <>
      <div className="flex flex-col gap-6">
        <header className="rounded-[20px] border bg-white px-6 py-6 shadow-[0_2px_18px_rgba(15,23,42,0.04)]" style={{ borderColor: 'var(--stroke)' }}>
          <h1 className="text-[2rem] font-black tracking-[-0.04em]" style={{ color: 'var(--ink)' }}>
            Promotions
          </h1>
          <p className="mt-1 text-sm leading-6" style={{ color: 'var(--muted)' }}>
            Review merchant promotion requests.
          </p>
        </header>

        <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          <PromotionMetricCard
            label="Pending Review"
            value={counts.pending}
            description="Waiting for a decision"
            highlight={`${pendingToday} new today`}
            icon={<Clock3 className="h-5 w-5" strokeWidth={2.1} />}
            tone="warning"
          />
          <PromotionMetricCard
            label="Approved or Active"
            value={counts.approved}
            description="Active promotions"
            highlight={`${approvedThisWeek} this week`}
            icon={<ShieldSuccessIcon />}
            tone="success"
          />
          <PromotionMetricCard
            label="Rejected"
            value={counts.rejected}
            description="Sent back for changes"
            highlight={`${rejectedThisWeek} this week`}
            icon={<CircleX className="h-5 w-5" strokeWidth={2.1} />}
            tone="danger"
          />
          <PromotionMetricCard
            label="Expired"
            value={counts.expired}
            description="No longer active"
            highlight={`${expiredThisWeek} this week`}
            icon={<CalendarDays className="h-5 w-5" strokeWidth={2.1} />}
            tone="violet"
          />
        </section>

        <div className="flex flex-wrap gap-3">
          {tabs.map((tab) => {
            const active = statusFilter === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={cn(
                  'inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition',
                  active ? 'shadow-[0_8px_24px_rgba(15,76,151,0.14)]' : ''
                )}
                style={{
                  background: active ? 'var(--accent)' : '#ffffff',
                  borderColor: active ? 'var(--accent)' : 'var(--stroke)',
                  color: active ? '#ffffff' : 'var(--ink-soft)',
                }}
              >
                <span>{tab.label}</span>
                <span
                  className="inline-flex min-w-[24px] items-center justify-center rounded-full px-2 py-0.5 text-[11px] font-bold"
                  style={{
                    background: active ? 'rgba(255,255,255,0.18)' : 'var(--surface-muted)',
                    color: active ? '#ffffff' : 'var(--muted)',
                  }}
                >
                  {tab.count}
                </span>
              </button>
            )
          })}
        </div>

        {message ? <AdminNotice tone={messageTone}>{message}</AdminNotice> : null}

        <AdminSurface className="px-0 py-0">
          <div className="border-b px-6 py-4" style={{ borderColor: 'var(--stroke)' }}>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h2 className="text-[1.65rem] font-black tracking-[-0.035em]" style={{ color: 'var(--ink)' }}>
                  Promotion queue
                </h2>
                <p className="mt-1 text-sm leading-6" style={{ color: 'var(--muted)' }}>
                  Review and manage merchant promotion campaigns.
                </p>
              </div>
              <DashboardPill tone="soft">{filtered.length} results</DashboardPill>
            </div>
          </div>

          <div className="px-6 py-6">
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_112px_160px]">
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2"
                  style={{ color: 'var(--muted)' }}
                  strokeWidth={2}
                />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by title or merchant name..."
                  className="surface-input h-12 w-full rounded-[12px] py-2.5 pl-11 pr-4 text-sm outline-none focus:ring-2 focus:ring-[color:var(--accent)]/20"
                />
              </div>

              <button
                type="button"
                onClick={resetFilters}
                className="admin-action-button h-12 rounded-[12px] px-4 text-sm font-semibold"
                data-variant="outline"
              >
                <Filter className="h-4.5 w-4.5" />
                Filters
              </button>

              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value as SortOption)}
                  className="surface-input h-12 w-full appearance-none rounded-[12px] bg-transparent px-4 pr-10 text-sm font-semibold outline-none focus:ring-2 focus:ring-[color:var(--accent)]/20"
                >
                  <option value="newest">Sort: Newest</option>
                  <option value="oldest">Sort: Oldest</option>
                </select>
                <ChevronDown
                  className="pointer-events-none absolute right-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2"
                  style={{ color: 'var(--muted)' }}
                  strokeWidth={2}
                />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <FilterSelect
                label="Merchant"
                value={merchantFilter}
                onChange={setMerchantFilter}
                options={[
                  { value: 'all', label: 'All Merchants' },
                  ...merchantOptions.map((merchant) => ({
                    value: merchant.id,
                    label: merchant.label,
                  })),
                ]}
              />

              <FilterSelect
                label="Category"
                value={categoryFilter}
                onChange={setCategoryFilter}
                options={[
                  { value: 'all', label: 'All Categories' },
                  ...categoryOptions.map((category) => ({ value: category, label: category })),
                ]}
              />

              <FilterDate label="Date Range" value={dateFilter} onChange={setDateFilter} />

              <FilterSelect
                label="Submission Source"
                value={sourceFilter}
                onChange={(value) => setSourceFilter(value as SubmissionSource)}
                options={sourceOptions.map((option) => ({
                  value: option.value,
                  label: option.label,
                }))}
              />
            </div>

            <div className="mt-4">
              {isLoading ? (
                <div className="flex justify-center py-20">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-[color:var(--accent)] border-t-transparent" />
                </div>
              ) : filtered.length === 0 ? (
                <AdminEmptyState
                  title="No promotions matched"
                  description="Try another status, merchant, category, or date filter to reveal more campaigns."
                />
              ) : (
                <AdminTableShell minWidth="1040px">
                  <table className="w-full">
                    <thead style={{ background: '#f3f8ff' }}>
                      <tr>
                        {['Campaign', 'Merchant', 'Category', 'Status', 'Submitted', 'Actions'].map(
                          (heading) => (
                            <th
                              key={heading}
                              className="px-5 py-4 text-left text-[11px] font-bold uppercase tracking-[0.16em]"
                              style={{ color: 'var(--muted)' }}
                            >
                              {heading}
                            </th>
                          )
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y" style={{ borderColor: 'var(--stroke)' }}>
                      {filtered.map((promotion) => (
                        <tr key={promotion.id} className="h-[72px] align-top">
                          <td className="px-5 py-4">
                            <div className="flex items-start gap-3">
                              <PromotionThumbnail promotion={promotion} />
                              <div className="min-w-0">
                                <p className="truncate text-sm font-bold" style={{ color: 'var(--ink)' }}>
                                  {promotion.title}
                                </p>
                                <p className="mt-1 line-clamp-2 text-[13px] leading-5" style={{ color: 'var(--muted)' }}>
                                  {promotion.description || 'No campaign description provided.'}
                                </p>
                                <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[#0f4c97]">
                                  {prettifyType(promotion.type)}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex items-start gap-3">
                              <MerchantLogo merchant={promotion.merchant} name={promotion.merchantName} />
                              <div className="min-w-0">
                                <p className="truncate text-sm font-bold" style={{ color: 'var(--ink)' }}>
                                  {promotion.merchantName || promotion.merchant?.name || 'Unknown Merchant'}
                                </p>
                                <p className="truncate text-[13px]" style={{ color: 'var(--muted)' }}>
                                  {promotion.merchant?.ownerEmail || 'No email saved'}
                                </p>
                                <div className="mt-1 flex items-center gap-1 text-[13px]" style={{ color: 'var(--muted)' }}>
                                  <MapPin className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                                  <span className="truncate">
                                    {promotion.merchant?.address || 'Buting, Pasig City'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4 text-sm" style={{ color: 'var(--ink-soft)' }}>
                            {promotion.merchant?.category || prettifyType(promotion.type)}
                          </td>

                          <td className="px-5 py-4">
                            <PromotionStatusCell status={promotion.status} />
                          </td>

                          <td className="px-5 py-4 text-sm leading-5" style={{ color: 'var(--ink-soft)' }}>
                            <span className="block font-medium">{formatDate(promotion.submittedAt)}</span>
                            <span className="block mt-1">{formatTime(promotion.submittedAt)}</span>
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <ActionIconButton
                                label="View promotion"
                                onClick={() => openPromotion(promotion)}
                                icon={<Eye className="h-4.5 w-4.5" strokeWidth={2.1} />}
                              />
                              <ActionIconButton
                                label="Open promotion actions"
                                onClick={() =>
                                  openPromotion(
                                    promotion,
                                    promotion.status === 'pending' ? 'reject' : 'view'
                                  )
                                }
                                icon={<MoreHorizontal className="h-4.5 w-4.5" strokeWidth={2.1} />}
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </AdminTableShell>
              )}
            </div>

            <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <p className="text-sm leading-6" style={{ color: 'var(--muted)' }}>
                Showing {filtered.length === 0 ? 0 : 1} to {filtered.length} of {filtered.length} results
              </p>

              <div className="flex items-center gap-2">
                <PagerButton disabled>
                  <ChevronDown className="h-4 w-4 rotate-90" strokeWidth={2.2} />
                </PagerButton>
                <PagerNumber active>1</PagerNumber>
                <PagerNumber>2</PagerNumber>
                <PagerNumber>3</PagerNumber>
                <span className="px-1 text-sm font-semibold" style={{ color: 'var(--muted)' }}>
                  ...
                </span>
                <PagerNumber>12</PagerNumber>
                <PagerButton>
                  <ChevronDown className="h-4 w-4 -rotate-90" strokeWidth={2.2} />
                </PagerButton>
              </div>
            </div>
          </div>
        </AdminSurface>
      </div>

      {selected ? (
        <PromotionReviewModal
          promotion={selected}
          isSaving={isSaving}
          rejectNote={rejectNote}
          showRejectInput={showRejectInput}
          onRejectNoteChange={setRejectNote}
          onClose={() => {
            setSelected(null)
            setRejectNote('')
            setShowRejectInput(false)
          }}
          onApprove={() => void handleReview('approved')}
          onReject={() => void handleReview('rejected')}
          onToggleReject={() => setShowRejectInput((current) => !current)}
        />
      ) : null}
    </>
  )
}

function PromotionMetricCard({
  label,
  value,
  description,
  highlight,
  icon,
  tone,
}: {
  label: string
  value: number
  description: string
  highlight: string
  icon: ReactNode
  tone: 'warning' | 'success' | 'danger' | 'violet'
}) {
  const palette = getMetricPalette(tone)

  return (
    <div
      className="min-h-[140px] rounded-[16px] border bg-white px-5 py-5 shadow-[0_2px_18px_rgba(15,23,42,0.04)]"
      style={{ borderColor: 'var(--stroke)' }}
    >
      <div className="flex items-start gap-4">
        <div
          className="grid h-14 w-14 shrink-0 place-items-center rounded-[18px]"
          style={{ background: palette.background, color: palette.color }}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: palette.color }}>
            {label}
          </p>
          <p className="mt-3 text-[2rem] font-black leading-none tracking-[-0.03em]" style={{ color: palette.color }}>
            {value}
          </p>
          <p className="mt-3 text-sm leading-6" style={{ color: 'var(--muted)' }}>
            {description}
          </p>
          <p className="mt-2 text-[13px] font-semibold" style={{ color: palette.color }}>
            {tone === 'danger' ? '↑ ' : '↑ '}
            {highlight}
          </p>
        </div>
      </div>
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
  options: Array<{ value: string; label: string }>
}) {
  return (
    <div className="space-y-2">
      <label className="block text-[12px] font-semibold" style={{ color: 'var(--ink-soft)' }}>
        {label}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="surface-input h-12 w-full appearance-none rounded-[12px] bg-transparent px-4 pr-10 text-sm outline-none focus:ring-2 focus:ring-[color:var(--accent)]/20"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2"
          style={{ color: 'var(--muted)' }}
          strokeWidth={2}
        />
      </div>
    </div>
  )
}

function FilterDate({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="space-y-2">
      <label className="block text-[12px] font-semibold" style={{ color: 'var(--ink-soft)' }}>
        {label}
      </label>
      <div className="relative">
        <CalendarDays
          className="pointer-events-none absolute right-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2"
          style={{ color: 'var(--accent)' }}
          strokeWidth={2}
        />
        <input
          type="date"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="surface-input h-12 w-full rounded-[12px] px-4 pr-10 text-sm outline-none focus:ring-2 focus:ring-[color:var(--accent)]/20"
        />
      </div>
    </div>
  )
}

function PromotionThumbnail({ promotion }: { promotion: EnrichedPromotion }) {
  const palette = getCampaignPalette(promotion.status)

  return (
    <div
      className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[12px] text-[10px] font-black uppercase tracking-[0.06em] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]"
      style={{
        background: `linear-gradient(135deg, ${palette.from} 0%, ${palette.to} 100%)`,
        color: palette.text,
      }}
    >
      <span className="px-1 text-center leading-[1.1]">
        {getPromoInitials(promotion.title)}
      </span>
    </div>
  )
}

function MerchantLogo({
  merchant,
  name,
}: {
  merchant?: MerchantRecord | null
  name?: string
}) {
  const displayName = merchant?.name || name || 'Merchant'
  const imageUrl = merchant?.logoUrl || merchant?.imageUrl || ''

  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#eff4fb]">
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt={displayName} className="h-full w-full object-cover" />
      ) : (
        <span className="text-xs font-black uppercase text-[#0f4c97]">
          {getPromoInitials(displayName)}
        </span>
      )}
    </div>
  )
}

function PromotionStatusCell({ status }: { status: string }) {
  return (
    <div className="space-y-2">
      <PromotionStatusPill status={status} />
      <p className="text-[13px] leading-5" style={{ color: 'var(--muted)' }}>
        {getStatusSubcopy(status)}
      </p>
    </div>
  )
}

function ActionIconButton({
  label,
  onClick,
  icon,
}: {
  label: string
  onClick: () => void
  icon: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="inline-flex h-10 w-10 items-center justify-center rounded-[12px] border bg-white text-[#0f4c97] shadow-[0_2px_12px_rgba(15,23,42,0.04)] transition hover:bg-[#f8fbff]"
      style={{ borderColor: 'var(--stroke)' }}
    >
      {icon}
    </button>
  )
}

function PagerButton({
  children,
  disabled,
}: {
  children: ReactNode
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      className="inline-flex h-10 w-10 items-center justify-center rounded-[12px] border bg-white text-[#0f4c97] transition disabled:cursor-not-allowed disabled:opacity-45"
      style={{ borderColor: 'var(--stroke)' }}
    >
      {children}
    </button>
  )
}

function PagerNumber({
  children,
  active,
}: {
  children: ReactNode
  active?: boolean
}) {
  return (
    <button
      type="button"
      className="inline-flex h-10 min-w-[40px] items-center justify-center rounded-[12px] px-3 text-sm font-semibold transition"
      style={
        active
          ? { background: 'var(--accent)', color: '#ffffff' }
          : { background: '#ffffff', color: 'var(--ink-soft)', border: '1px solid var(--stroke)' }
      }
    >
      {children}
    </button>
  )
}

function PromotionReviewModal({
  promotion,
  isSaving,
  rejectNote,
  showRejectInput,
  onRejectNoteChange,
  onClose,
  onApprove,
  onReject,
  onToggleReject,
}: {
  promotion: EnrichedPromotion
  isSaving: boolean
  rejectNote: string
  showRejectInput: boolean
  onRejectNoteChange: (value: string) => void
  onClose: () => void
  onApprove: () => void
  onReject: () => void
  onToggleReject: () => void
}) {
  const merchantName = promotion.merchantName || promotion.merchant?.name || 'Unknown Merchant'
  const canApprove = promotion.status !== 'active' && promotion.status !== 'expired'
  const canReject = promotion.status !== 'expired'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(15,23,42,0.44)] p-6 backdrop-blur-sm">
      <div
        className="w-full max-w-[680px] rounded-[22px] border bg-white shadow-[0_24px_72px_rgba(15,23,42,0.18)]"
        style={{ borderColor: 'var(--stroke)' }}
      >
        <div className="flex items-start justify-between gap-4 border-b px-6 py-5" style={{ borderColor: 'var(--stroke)' }}>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--accent-strong)' }}>
              Promotion review
            </p>
            <h2 className="mt-2 text-[1.65rem] font-black tracking-[-0.035em]" style={{ color: 'var(--ink)' }}>
              {promotion.title}
            </h2>
            <p className="mt-1 text-sm leading-6" style={{ color: 'var(--muted)' }}>
              Review the merchant context and decide whether this campaign should go live.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[#0f4c97] transition hover:bg-[#eff4fb]"
          >
            <X className="h-4.5 w-4.5" strokeWidth={2.2} />
          </button>
        </div>

        <div className="space-y-5 px-6 py-6">
          <div className="grid gap-4 sm:grid-cols-[88px_minmax(0,1fr)]">
            <div className="flex items-center justify-center rounded-[18px] bg-[linear-gradient(135deg,#edf4ff_0%,#dfe9fb_100%)] p-4">
              <Sparkles className="h-10 w-10 text-[#0f4c97]" strokeWidth={2} />
            </div>
            <div className="rounded-[18px] border bg-[#fbfdff] px-4 py-4" style={{ borderColor: 'var(--stroke)' }}>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-black tracking-[-0.03em]" style={{ color: 'var(--ink)' }}>
                  {merchantName}
                </h3>
                <PromotionStatusPill status={promotion.status} />
              </div>
              <p className="mt-2 text-sm leading-6" style={{ color: 'var(--muted)' }}>
                {promotion.description || 'No campaign description provided.'}
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <DetailTile label="Category" value={promotion.merchant?.category || prettifyType(promotion.type)} />
            <DetailTile label="Value" value={formatValue(promotion)} />
            <DetailTile
              label="Minimum Purchase"
              value={
                Number(promotion.minPurchaseAmount) > 0
                  ? `PHP ${Number(promotion.minPurchaseAmount).toLocaleString()}`
                  : 'None'
              }
            />
            <DetailTile label="Submitted" value={formatDateTime(promotion.submittedAt)} />
            <DetailTile label="Merchant Email" value={promotion.merchant?.ownerEmail || 'No email saved'} />
            <DetailTile
              label="Merchant Address"
              value={promotion.merchant?.address || 'Buting, Pasig City'}
            />
          </div>

          {promotion.reviewNote ? (
            <div
              className="rounded-[16px] border px-4 py-4"
              style={{
                borderColor: 'color-mix(in srgb, var(--warning-accent) 26%, white 74%)',
                background: 'var(--warning-bg)',
              }}
            >
              <p className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--warning-fg)' }}>
                Review note
              </p>
              <p className="mt-2 text-sm leading-6" style={{ color: 'var(--warning-fg)' }}>
                {promotion.reviewNote}
              </p>
            </div>
          ) : null}

          {showRejectInput ? (
            <div className="space-y-3">
              <label className="block text-[12px] font-semibold" style={{ color: 'var(--ink-soft)' }}>
                Rejection note
              </label>
              <textarea
                value={rejectNote}
                onChange={(event) => onRejectNoteChange(event.target.value)}
                rows={4}
                className="surface-input w-full rounded-[14px] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#ef4444]/20"
                placeholder="Explain what the merchant should fix before resubmitting."
              />
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={onClose}
              className="admin-action-button h-11 rounded-[14px] text-sm font-semibold"
              data-variant="outline"
            >
              Cancel
            </button>

            {showRejectInput ? (
              <button
                type="button"
                onClick={onReject}
                disabled={isSaving}
                className="admin-action-button h-11 rounded-[14px] text-sm font-semibold"
                data-variant="danger"
              >
                {isSaving ? 'Saving...' : 'Confirm Rejection'}
              </button>
            ) : (
              <button
                type="button"
                onClick={onApprove}
                disabled={!canApprove || isSaving}
                className="admin-action-button h-11 rounded-[14px] text-sm font-semibold"
                data-variant="primary"
              >
                {isSaving ? 'Saving...' : 'Approve Promotion'}
              </button>
            )}
          </div>

          {!showRejectInput && canReject ? (
            <button
              type="button"
              onClick={onToggleReject}
              disabled={isSaving}
              className="w-full rounded-[14px] border border-[#ffd3d4] bg-[#fff5f5] px-4 py-3 text-sm font-semibold text-[#ef4444] transition hover:bg-[#ffeded]"
            >
              Reject with Note
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function DetailTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[16px] border bg-[#fbfdff] px-4 py-4" style={{ borderColor: 'var(--stroke)' }}>
      <p className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--muted)' }}>
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold leading-6" style={{ color: 'var(--ink)' }}>
        {value}
      </p>
    </div>
  )
}

function PromotionStatusPill({ status }: { status: string }) {
  const tones: Record<string, string> = {
    pending: 'bg-[#fff5e8] text-[#f59e0b]',
    approved: 'bg-[#edf6ff] text-[#2563eb]',
    active: 'bg-[#ecfdf5] text-[#16a34a]',
    rejected: 'bg-[#fff1f2] text-[#ef4444]',
    expired: 'bg-[#f3efff] text-[#7c3aed]',
  }

  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2.5 py-1 text-xs font-semibold',
        tones[status] || 'bg-[#eff4fb] text-[#64748b]'
      )}
    >
      {getStatusLabel(status)}
    </span>
  )
}

function ShieldSuccessIcon() {
  return <BadgeCheck className="h-5 w-5" strokeWidth={2.1} />
}

function formatValue(promotion: Promotion): string {
  if (!promotion.type) return String(promotion.value || '-')
  if (promotion.type === 'points_multiplier') return `${promotion.value}x points`
  if (promotion.type === 'discount') return `${promotion.value}% off`
  if (promotion.type === 'freebie') return 'Free item'
  return String(promotion.value || '-')
}

function prettifyType(type?: string) {
  if (!type) return 'General'
  return type
    .split('_')
    .join(' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function getStatusLabel(status: string) {
  if (status === 'pending') return 'Pending Review'
  if (status === 'active' || status === 'approved') return 'Approved'
  if (status === 'rejected') return 'Rejected'
  if (status === 'expired') return 'Expired'
  return status
}

function getStatusSubcopy(status: string) {
  if (status === 'pending') return 'Awaiting your decision'
  if (status === 'active' || status === 'approved') return 'Active'
  if (status === 'rejected') return 'Sent back for changes'
  if (status === 'expired') return 'Campaign has ended'
  return 'Status updated'
}

function getMetricPalette(tone: 'warning' | 'success' | 'danger' | 'violet') {
  if (tone === 'warning') {
    return { background: '#fff6e8', color: '#f59e0b' }
  }
  if (tone === 'success') {
    return { background: '#ecfdf5', color: '#16a34a' }
  }
  if (tone === 'danger') {
    return { background: '#fff1f2', color: '#ef4444' }
  }
  return { background: '#f3efff', color: '#7c3aed' }
}

function getCampaignPalette(status: string) {
  if (status === 'pending') {
    return { from: '#ffe0b2', to: '#ffb74d', text: '#7c2d12' }
  }
  if (status === 'active' || status === 'approved') {
    return { from: '#d9fbe6', to: '#86efac', text: '#166534' }
  }
  if (status === 'rejected') {
    return { from: '#ffd8dc', to: '#ff9aa2', text: '#991b1b' }
  }
  if (status === 'expired') {
    return { from: '#ede9fe', to: '#c4b5fd', text: '#5b21b6' }
  }
  return { from: '#dbeafe', to: '#93c5fd', text: '#1d4ed8' }
}

function getPromoInitials(value: string) {
  return value
    .split(' ')
    .filter(Boolean)
    .slice(0, 3)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

function formatDate(value?: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatTime(value?: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleTimeString('en-PH', {
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatDateTime(value?: string | null) {
  if (!value) return 'Not available'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Not available'
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

function isInCurrentWeek(value?: string | null) {
  if (!value) return false
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return false

  const today = new Date()
  const start = new Date(today)
  start.setHours(0, 0, 0, 0)
  start.setDate(today.getDate() - today.getDay())

  const end = new Date(start)
  end.setDate(start.getDate() + 7)

  return date >= start && date < end
}
