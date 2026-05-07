'use client'

import { useEffect, useMemo, useState } from 'react'
import api from '@/lib/api'
import { cn } from '@/utils/cn'

interface Summary {
  totalIssued: number
  totalRedeemed: number
  outstandingBalance: number
}

interface ConversionRate {
  pesosPerPoint: number
  updatedAt?: string | null
  updatedBy?: string | null
}

interface MerchantOption {
  id: string
  name: string
}

interface TransactionRecord {
  id: string
  userId?: string | null
  userName: string
  userEmail?: string | null
  merchantId?: string | null
  merchantName: string
  amountSpent?: number | null
  pointsAwarded: number
  timestamp?: string | null
  status: string
  type: string
}

interface AdjustmentRecord extends TransactionRecord {
  reason?: string | null
  adminName?: string | null
  direction: 'add' | 'deduct'
}

interface LeaderboardRecord {
  userId: string
  userName: string
  userEmail?: string | null
  totalPoints: number
  earnedPoints: number
  redeemedPoints: number
}

interface PointsOverviewResponse {
  transactionLog: TransactionRecord[]
  manualAdjustments: AdjustmentRecord[]
  leaderboard: LeaderboardRecord[]
  summary: Summary
  conversionRate: ConversionRate
  merchantOptions: MerchantOption[]
}

type StatusFilter = 'all' | 'success' | 'failed'

const initialSummary: Summary = {
  totalIssued: 0,
  totalRedeemed: 0,
  outstandingBalance: 0,
}

const initialConversionRate: ConversionRate = {
  pesosPerPoint: 10,
  updatedAt: null,
  updatedBy: null,
}

const TRANSACTION_PAGE_SIZE = 8

type SummaryTone = 'issued' | 'redeemed' | 'balance'

const SUMMARY_CARD_PALETTES: Record<
  SummaryTone,
  {
    eyebrow: string
    border: string
    background: string
    glow: string
    pillBg: string
    pillFg: string
    title: string
    value: string
    detail: string
  }
> = {
  issued: {
    eyebrow: 'Issued',
    border: 'rgba(5, 114, 220, 0.22)',
    background:
      'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(238,246,255,0.96) 100%)',
    glow: 'rgba(5, 114, 220, 0.24)',
    pillBg: 'rgba(5, 114, 220, 0.12)',
    pillFg: '#0453a6',
    title: 'rgba(1, 67, 132, 0.78)',
    value: '#012c58',
    detail: 'rgba(1, 67, 132, 0.68)',
  },
  redeemed: {
    eyebrow: 'Redeemed',
    border: 'rgba(252, 179, 21, 0.28)',
    background:
      'linear-gradient(180deg, rgba(255,253,247,0.98) 0%, rgba(255,247,230,0.96) 100%)',
    glow: 'rgba(252, 179, 21, 0.24)',
    pillBg: 'rgba(252, 179, 21, 0.18)',
    pillFg: '#a15a00',
    title: 'rgba(122, 82, 0, 0.82)',
    value: '#4f2d00',
    detail: 'rgba(138, 75, 0, 0.72)',
  },
  balance: {
    eyebrow: 'Live Balance',
    border: 'rgba(1, 67, 132, 0.18)',
    background:
      'linear-gradient(180deg, rgba(247,251,255,0.98) 0%, rgba(235,244,252,0.96) 100%)',
    glow: 'rgba(4, 83, 166, 0.18)',
    pillBg: 'rgba(1, 67, 132, 0.1)',
    pillFg: '#014384',
    title: 'rgba(1, 67, 132, 0.78)',
    value: '#013f7d',
    detail: 'rgba(1, 67, 132, 0.68)',
  },
}

export default function PointsTransactionsPage() {
  const [adminRole, setAdminRole] = useState('admin')
  const [data, setData] = useState<PointsOverviewResponse>({
    transactionLog: [],
    manualAdjustments: [],
    leaderboard: [],
    summary: initialSummary,
    conversionRate: initialConversionRate,
    merchantOptions: [],
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [filters, setFilters] = useState({
    search: '',
    merchantId: 'all',
    status: 'all' as StatusFilter,
    dateFrom: '',
    dateTo: '',
    minPoints: '',
    maxPoints: '',
  })
  const [conversionRateInput, setConversionRateInput] = useState('10')
  const [transactionPage, setTransactionPage] = useState(1)

  const isSuperadmin = adminRole === 'superadmin'

  useEffect(() => {
    let mounted = true

    async function loadInitialData() {
      setIsLoading(true)
      try {
        const [overviewRes, meRes] = await Promise.all([
          api.get('/admin/points-transactions'),
          api.get('/auth/me'),
        ])

        if (!mounted) return

        const nextData = overviewRes.data as PointsOverviewResponse
        setData(nextData)
        setConversionRateInput(String(nextData.conversionRate?.pesosPerPoint || 10))
        setTransactionPage(1)
        setAdminRole(meRes.data?.role || window.localStorage.getItem('kk-admin-role') || 'admin')
      } catch {
        if (!mounted) return
        setData({
          transactionLog: [],
          manualAdjustments: [],
          leaderboard: [],
          summary: initialSummary,
          conversionRate: initialConversionRate,
          merchantOptions: [],
        })
      } finally {
        if (mounted) setIsLoading(false)
      }
    }

    loadInitialData()
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    if (!isLoading) {
      setConversionRateInput(String(data.conversionRate?.pesosPerPoint || 10))
    }
  }, [data.conversionRate, isLoading])

  async function loadOverview() {
    const params: Record<string, string | number> = {}

    if (filters.search.trim()) params.search = filters.search.trim()
    if (filters.merchantId !== 'all') params.merchantId = filters.merchantId
    if (filters.status !== 'all') params.status = filters.status
    if (filters.dateFrom) params.dateFrom = filters.dateFrom
    if (filters.dateTo) params.dateTo = filters.dateTo
    if (filters.minPoints) params.minPoints = Number(filters.minPoints)
    if (filters.maxPoints) params.maxPoints = Number(filters.maxPoints)

    const res = await api.get('/admin/points-transactions', { params })
    const nextData = res.data as PointsOverviewResponse
    setData(nextData)
    setTransactionPage(1)
  }

  async function handleApplyFilters() {
    setIsLoading(true)
    setMessage('')

    try {
      await loadOverview()
    } catch (error: any) {
      setMessage(error?.response?.data?.error || 'We could not load points and transaction data right now.')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleResetFilters() {
    const nextFilters = {
      search: '',
      merchantId: 'all',
      status: 'all' as StatusFilter,
      dateFrom: '',
      dateTo: '',
      minPoints: '',
      maxPoints: '',
    }

    setFilters(nextFilters)
    setIsLoading(true)
    setMessage('')

    try {
      const res = await api.get('/admin/points-transactions')
      const nextData = res.data as PointsOverviewResponse
      setData(nextData)
      setConversionRateInput(String(nextData.conversionRate?.pesosPerPoint || 10))
      setTransactionPage(1)
    } catch (error: any) {
      setMessage(error?.response?.data?.error || 'We could not reset the filters right now.')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleSaveConversionRate() {
    if (!isSuperadmin) return

    setIsSaving(true)
    setMessage('')

    try {
      await api.patch('/admin/points-transactions/conversion-rate', {
        pesosPerPoint: Number(conversionRateInput || 0),
      })
      await loadOverview()
      setMessage('Conversion rate updated successfully.')
    } catch (error: any) {
      setMessage(error?.response?.data?.error || 'We could not update the conversion rate right now.')
    } finally {
      setIsSaving(false)
    }
  }

  const filteredLeaderboard = useMemo(
    () => data.leaderboard.slice(0, 10),
    [data.leaderboard]
  )

  const transactionPageCount = Math.max(
    1,
    Math.ceil(data.transactionLog.length / TRANSACTION_PAGE_SIZE)
  )

  const paginatedTransactionLog = useMemo(() => {
    const start = (transactionPage - 1) * TRANSACTION_PAGE_SIZE
    return data.transactionLog.slice(start, start + TRANSACTION_PAGE_SIZE)
  }, [data.transactionLog, transactionPage])

  const transactionVisiblePages = useMemo(
    () => buildPaginationPages(transactionPage, transactionPageCount),
    [transactionPage, transactionPageCount]
  )

  const transactionRangeStart = data.transactionLog.length
    ? (transactionPage - 1) * TRANSACTION_PAGE_SIZE + 1
    : 0
  const transactionRangeEnd = data.transactionLog.length
    ? transactionRangeStart + paginatedTransactionLog.length - 1
    : 0

  useEffect(() => {
    setTransactionPage((current) => Math.min(current, transactionPageCount))
  }, [transactionPageCount])

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[color:var(--accent)] border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Points & Transactions</h1>
          <p className="mt-0.5 text-sm" style={{ color: 'var(--muted)' }}>
            Monitor every QR transaction, points movement, and barangay-wide balance summary.
          </p>
        </div>
        <div className="rounded-2xl border border-[#FCB315]/35 bg-[#FFF7E6] px-4 py-3 text-sm text-[#8A5A00] shadow-sm">
          Current conversion rate: <span className="font-bold">PHP {data.conversionRate.pesosPerPoint} = 1 point</span>
        </div>
      </div>

      {message ? (
        <div className="rounded-2xl border border-[#FCB315]/35 bg-[#FFF7E6] px-4 py-3 text-sm text-[#7A5200]">
          {message}
        </div>
      ) : null}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <SummaryCard
          title="Total Points Issued"
          value={formatPoints(data.summary.totalIssued)}
          detail="Successful earn transactions across all merchants"
          tone="issued"
        />
        <SummaryCard
          title="Total Points Redeemed"
          value={formatPoints(data.summary.totalRedeemed)}
          detail="Rewards redeemed by verified youth members"
          tone="redeemed"
        />
        <SummaryCard
          title="Outstanding Balance"
          value={formatPoints(data.summary.outstandingBalance)}
          detail="Current live balance across all youth wallets"
          tone="balance"
        />
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div className="admin-panel">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-black text-gray-900">Transaction Log</h2>
                <p className="text-sm" style={{ color: 'var(--muted)' }}>Filter QR scan events by merchant, user, status, date, and points range.</p>
              </div>
              <span
                className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.14em]"
                style={{
                  borderColor: 'rgba(5, 114, 220, 0.18)',
                  background: 'color-mix(in srgb, var(--accent-soft) 72%, white 28%)',
                  color: 'var(--accent-strong)',
                }}
              >
                {data.transactionLog.length.toLocaleString()} records
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <FilterInput
                label="Search user or merchant"
                value={filters.search}
                onChange={(value) => setFilters((current) => ({ ...current, search: value }))}
                placeholder="Name or email"
              />
              <FilterSelect
                label="Merchant"
                value={filters.merchantId}
                onChange={(value) => setFilters((current) => ({ ...current, merchantId: value }))}
                options={[
                  { value: 'all', label: 'All merchants' },
                  ...data.merchantOptions.map((merchant) => ({
                    value: merchant.id,
                    label: merchant.name,
                  })),
                ]}
              />
              <FilterSelect
                label="Status"
                value={filters.status}
                onChange={(value) => setFilters((current) => ({ ...current, status: value as StatusFilter }))}
                options={[
                  { value: 'all', label: 'All statuses' },
                  { value: 'success', label: 'Success' },
                  { value: 'failed', label: 'Failed' },
                ]}
              />
              <FilterInput
                label="Date from"
                type="date"
                value={filters.dateFrom}
                onChange={(value) => setFilters((current) => ({ ...current, dateFrom: value }))}
              />
              <FilterInput
                label="Date to"
                type="date"
                value={filters.dateTo}
                onChange={(value) => setFilters((current) => ({ ...current, dateTo: value }))}
              />
              <FilterInput
                label="Min points"
                type="number"
                value={filters.minPoints}
                onChange={(value) => setFilters((current) => ({ ...current, minPoints: value }))}
                placeholder="0"
              />
              <FilterInput
                label="Max points"
                type="number"
                value={filters.maxPoints}
                onChange={(value) => setFilters((current) => ({ ...current, maxPoints: value }))}
                placeholder="500"
              />
              <div className="flex items-end gap-2">
                <button
                  type="button"
                  onClick={handleApplyFilters}
                  className="flex-1 rounded-2xl px-4 py-3 text-sm font-semibold text-white transition"
                  style={{ background: 'var(--accent)' }}
                >
                  Apply Filters
                </button>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="rounded-2xl border px-4 py-3 text-sm font-semibold transition hover:bg-[color:var(--accent-soft)]"
                  style={{ borderColor: 'var(--stroke)', color: 'var(--accent-strong)', background: 'var(--card)' }}
                >
                  Reset
                </button>
              </div>
            </div>
          </div>

          <div className="mt-5 overflow-hidden rounded-[var(--radius-lg)] border" style={{ borderColor: 'var(--stroke)', background: 'var(--card)' }}>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[color:var(--stroke)] text-sm">
                <thead className="bg-[color:var(--accent-soft)] text-left text-xs uppercase tracking-[0.16em]">
                  <tr>
                    <th className="px-4 py-3 font-bold" style={{ color: 'var(--muted)' }}>User</th>
                    <th className="px-4 py-3 font-bold" style={{ color: 'var(--muted)' }}>Merchant</th>
                    <th className="px-4 py-3 font-bold" style={{ color: 'var(--muted)' }}>Amount</th>
                    <th className="px-4 py-3 font-bold" style={{ color: 'var(--muted)' }}>Points</th>
                    <th className="px-4 py-3 font-bold" style={{ color: 'var(--muted)' }}>Status</th>
                    <th className="px-4 py-3 font-bold" style={{ color: 'var(--muted)' }}>Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[color:var(--stroke)] bg-white">
                {paginatedTransactionLog.length ? (
                    paginatedTransactionLog.map((transaction) => (
                      <tr key={transaction.id} className="align-top hover:bg-[color:var(--accent-soft)]">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-gray-900">{transaction.userName}</p>
                          <p className="text-xs" style={{ color: 'var(--muted)' }}>{transaction.userEmail || 'No email'}</p>
                        </td>
                        <td className="px-4 py-3 text-gray-700">{transaction.merchantName}</td>
                        <td className="px-4 py-3 text-gray-700">
                          {typeof transaction.amountSpent === 'number' ? `PHP ${transaction.amountSpent.toFixed(2)}` : 'N/A'}
                        </td>
                        <td className="px-4 py-3 font-semibold" style={{ color: 'var(--accent-strong)' }}>{formatPoints(transaction.pointsAwarded)}</td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              'inline-flex rounded-full px-2.5 py-1 text-xs font-bold capitalize',
                              transaction.status === 'failed'
                                ? 'bg-red-50 text-red-600'
                                : 'bg-green-50 text-green-600'
                            )}
                          >
                            {transaction.status}
                          </span>
                        </td>
                        <td className="px-4 py-3" style={{ color: 'var(--muted)' }}>{formatDateTime(transaction.timestamp)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-sm" style={{ color: 'var(--muted)' }}>
                        No transactions matched the current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {data.transactionLog.length ? (
              <div
                className="flex flex-col gap-3 border-t px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                style={{ borderColor: 'var(--stroke)', background: 'color-mix(in srgb, var(--card) 92%, transparent)' }}
              >
                <p className="text-sm" style={{ color: 'var(--muted)' }}>
                  Showing <span style={{ color: 'var(--ink)', fontWeight: 700 }}>{transactionRangeStart}-{transactionRangeEnd}</span> of{' '}
                  <span style={{ color: 'var(--ink)', fontWeight: 700 }}>{data.transactionLog.length.toLocaleString()}</span> transactions
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setTransactionPage((current) => Math.max(1, current - 1))}
                    disabled={transactionPage === 1}
                    className="admin-action-button rounded-xl px-3 py-2 text-sm font-semibold"
                    data-variant="outline"
                  >
                    Previous
                  </button>
                  {transactionVisiblePages.map((page, index) =>
                    page === 'ellipsis' ? (
                      <span
                        key={`ellipsis-${index}`}
                        className="px-2 text-[0px] font-semibold leading-none after:text-sm after:leading-none after:content-['...']"
                        style={{ color: 'var(--muted)' }}
                      >
                        …
                      </span>
                    ) : (
                      <button
                        key={`page-${page}`}
                        type="button"
                        onClick={() => setTransactionPage(page)}
                        className="admin-action-button min-w-[42px] rounded-xl px-3 py-2 text-sm font-semibold"
                        data-variant={page === transactionPage ? 'primary' : 'outline'}
                      >
                        {page}
                      </button>
                    )
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      setTransactionPage((current) =>
                        Math.min(transactionPageCount, current + 1)
                      )
                    }
                    disabled={transactionPage === transactionPageCount}
                    className="admin-action-button rounded-xl px-3 py-2 text-sm font-semibold"
                    data-variant="outline"
                  >
                    Next
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="space-y-6">
          <section className="admin-panel">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-gray-900">Conversion Rate Settings</h2>
                <p className="text-sm" style={{ color: 'var(--muted)' }}>Adjust the barangay-wide PHP to point conversion.</p>
              </div>
              <span className={cn(
                'rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.14em]',
                isSuperadmin ? 'bg-[color:var(--accent-soft)] text-[color:var(--accent-strong)]' : 'bg-[color:var(--surface-muted)] text-[color:var(--muted)]'
              )}>
                {isSuperadmin ? 'Superadmin' : 'View only'}
              </span>
            </div>

            <div className="mt-4 space-y-3">
              <label className="block text-sm font-semibold text-gray-700">
                PHP per point
                <input
                  type="number"
                  min="1"
                  value={conversionRateInput}
                  onChange={(event) => setConversionRateInput(event.target.value)}
                  disabled={!isSuperadmin || isSaving}
                  className="surface-input mt-2 w-full rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[color:var(--accent)]/30 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </label>
              <div className="rounded-2xl bg-[#F8FAFC] px-4 py-3 text-sm text-gray-600">
                Last updated: {formatRelativeOrDate(data.conversionRate.updatedAt)}
                {data.conversionRate.updatedBy ? ` by ${data.conversionRate.updatedBy}` : ''}
              </div>
              <button
                type="button"
                onClick={handleSaveConversionRate}
                disabled={!isSuperadmin || isSaving}
                className="w-full rounded-2xl bg-[#FCB315] px-4 py-3 text-sm font-bold text-[#014384] transition hover:bg-[#F5A700] disabled:cursor-not-allowed disabled:opacity-55"
              >
                {isSaving ? 'Saving...' : 'Save Conversion Rate'}
              </button>
            </div>
          </section>

          <section className="admin-panel">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-gray-900">Points Leaderboard</h2>
                <p className="text-sm" style={{ color: 'var(--muted)' }}>Top point earners in the barangay.</p>
              </div>
              <span className="rounded-full px-3 py-1 text-xs font-bold bg-[color:var(--accent-soft)] text-[color:var(--accent-strong)]">Top 10</span>
            </div>
            <div className="mt-4 space-y-3">
              {filteredLeaderboard.length ? (
                filteredLeaderboard.map((entry, index) => (
                  <div key={entry.userId} className="flex items-center justify-between gap-3 rounded-2xl border px-4 py-3" style={{ borderColor: 'var(--stroke)' }}>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-black text-white" style={{ background: 'var(--accent)' }}>
                        #{index + 1}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{entry.userName}</p>
                        <p className="text-xs" style={{ color: 'var(--muted)' }}>{entry.userEmail || 'No email'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-black" style={{ color: 'var(--accent-strong)' }}>{formatPoints(entry.totalPoints)}</p>
                      <p className="text-xs" style={{ color: 'var(--muted)' }}>Earned {formatPoints(entry.earnedPoints)}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed px-4 py-8 text-center text-sm" style={{ borderColor: 'var(--stroke)', color: 'var(--muted)' }}>
                  No leaderboard records yet.
                </div>
              )}
            </div>
          </section>
        </div>
      </section>

      <section className="admin-panel">
        <div className="mb-4">
          <h2 className="text-lg font-black text-gray-900">Manual Adjustment Log</h2>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>Every admin-triggered point addition or deduction with reason and admin attribution.</p>
        </div>

        <div className="overflow-hidden rounded-[var(--radius-lg)] border" style={{ borderColor: 'var(--stroke)', background: 'var(--card)' }}>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[color:var(--stroke)] text-sm">
              <thead className="bg-[color:var(--accent-soft)] text-left text-xs uppercase tracking-[0.16em]">
                <tr>
                  <th className="px-4 py-3 font-bold" style={{ color: 'var(--muted)' }}>User</th>
                  <th className="px-4 py-3 font-bold" style={{ color: 'var(--muted)' }}>Direction</th>
                  <th className="px-4 py-3 font-bold" style={{ color: 'var(--muted)' }}>Points</th>
                  <th className="px-4 py-3 font-bold" style={{ color: 'var(--muted)' }}>Reason</th>
                  <th className="px-4 py-3 font-bold" style={{ color: 'var(--muted)' }}>Admin</th>
                  <th className="px-4 py-3 font-bold" style={{ color: 'var(--muted)' }}>Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--stroke)] bg-white">
                {data.manualAdjustments.length ? (
                  data.manualAdjustments.map((adjustment) => (
                    <tr key={adjustment.id} className="hover:bg-[color:var(--accent-soft)]">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-900">{adjustment.userName}</p>
                        <p className="text-xs" style={{ color: 'var(--muted)' }}>{adjustment.userEmail || 'No email'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'inline-flex rounded-full px-2.5 py-1 text-xs font-bold uppercase',
                            adjustment.direction === 'add'
                              ? 'bg-green-50 text-green-600'
                              : 'bg-red-50 text-red-600'
                          )}
                        >
                          {adjustment.direction}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold" style={{ color: 'var(--accent-strong)' }}>{formatPoints(adjustment.pointsAwarded)}</td>
                      <td className="px-4 py-3 text-gray-700">{adjustment.reason || 'No reason provided'}</td>
                      <td className="px-4 py-3 text-gray-700">{adjustment.adminName || 'System'}</td>
                      <td className="px-4 py-3" style={{ color: 'var(--muted)' }}>{formatDateTime(adjustment.timestamp)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-sm" style={{ color: 'var(--muted)' }}>
                      No manual point adjustments have been recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  )
}

function SummaryCard({
  title,
  value,
  detail,
  tone,
}: {
  title: string
  value: string
  detail: string
  tone: SummaryTone
}) {
  const palette = SUMMARY_CARD_PALETTES[tone]

  return (
    <div
      className="relative overflow-hidden rounded-[28px] border p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)]"
      style={{ borderColor: palette.border, background: palette.background }}
    >
      <div
        className="pointer-events-none absolute -right-8 top-0 h-28 w-28 rounded-full blur-3xl"
        style={{ background: palette.glow }}
      />
      <span
        className="relative inline-flex items-center rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em]"
        style={{ background: palette.pillBg, color: palette.pillFg }}
      >
        {palette.eyebrow}
      </span>
      <p className="relative mt-4 text-sm font-semibold" style={{ color: palette.title }}>{title}</p>
      <p className="relative mt-3 text-3xl font-black" style={{ color: palette.value }}>{value}</p>
      <p className="relative mt-2 max-w-xs text-sm leading-relaxed" style={{ color: palette.detail }}>{detail}</p>
    </div>
  )
}

function buildPaginationPages(currentPage: number, totalPages: number) {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  const candidatePages = new Set<number>([
    1,
    totalPages,
    currentPage - 1,
    currentPage,
    currentPage + 1,
  ])

  const pages = [...candidatePages]
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b)

  const visible: Array<number | 'ellipsis'> = []

  pages.forEach((page, index) => {
    if (index > 0 && page - pages[index - 1] > 1) {
      visible.push('ellipsis')
    }
    visible.push(page)
  })

  return visible
}

function PaginationEllipsis({ index }: { index: number }) {
  return (
    <span
      key={`ellipsis-${index}`}
      className="px-2 text-sm font-semibold"
      style={{ color: 'var(--muted)' }}
    >
      …
    </span>
  )
}

function PaginationPageButton({
  page,
  isActive,
  onClick,
}: {
  page: number
  isActive: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="admin-action-button min-w-[42px] rounded-xl px-3 py-2 text-sm font-semibold"
      data-variant={isActive ? 'primary' : 'outline'}
    >
      {page}
    </button>
  )
}

function FilterInput({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <label className="block text-sm font-semibold text-gray-700">
      {label}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="surface-input mt-2 w-full rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[color:var(--accent)]/30"
      />
    </label>
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
    <label className="block text-sm font-semibold text-gray-700">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="surface-input bg-transparent mt-2 w-full rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[color:var(--accent)]/30"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function formatPoints(value: number) {
  return `${Number(value || 0).toLocaleString()} pts`
}

function formatDateTime(value?: string | null) {
  if (!value) return 'No timestamp'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Invalid date'
  return date.toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatRelativeOrDate(value?: string | null) {
  if (!value) return 'Not updated yet'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown'

  const diffMinutes = Math.round((Date.now() - date.getTime()) / 60000)
  if (diffMinutes < 1) return 'just now'
  if (diffMinutes === 1) return '1 minute ago'
  if (diffMinutes < 60) return `${diffMinutes} minutes ago`

  return date.toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}
