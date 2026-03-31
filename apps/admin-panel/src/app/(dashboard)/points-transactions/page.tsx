'use client'

import { useEffect, useMemo, useState } from 'react'
import api from '@/lib/api'
import Spinner from '@/components/ui/Spinner'
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
  pesosPerPoint: 50,
  updatedAt: null,
  updatedBy: null,
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
  const [conversionRateInput, setConversionRateInput] = useState('50')

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
        setConversionRateInput(String(nextData.conversionRate?.pesosPerPoint || 50))
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
      setConversionRateInput(String(data.conversionRate?.pesosPerPoint || 50))
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
      setConversionRateInput(String(nextData.conversionRate?.pesosPerPoint || 50))
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

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Points & Transactions</h1>
          <p className="mt-0.5 text-sm text-gray-500">
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
          accent="bg-[linear-gradient(135deg,#014384_0%,#0B69C7_100%)]"
        />
        <SummaryCard
          title="Total Points Redeemed"
          value={formatPoints(data.summary.totalRedeemed)}
          detail="Rewards redeemed by verified youth members"
          accent="bg-[linear-gradient(135deg,#F39C12_0%,#FCB315_100%)]"
        />
        <SummaryCard
          title="Outstanding Balance"
          value={formatPoints(data.summary.outstandingBalance)}
          detail="Current live balance across all youth wallets"
          accent="bg-[linear-gradient(135deg,#0F9D58_0%,#38C172_100%)]"
        />
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div className="rounded-[28px] border border-[color:var(--kk-border)] bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-lg font-black text-gray-900">Transaction Log</h2>
              <p className="text-sm text-gray-500">Filter QR scan events by merchant, user, status, date, and points range.</p>
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
                  className="flex-1 rounded-2xl bg-[#014384] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#035db7]"
                >
                  Apply Filters
                </button>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="rounded-2xl border border-[color:var(--kk-border)] px-4 py-3 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>

          <div className="mt-5 overflow-hidden rounded-3xl border border-[color:var(--kk-border)]">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[color:var(--kk-border)] text-sm">
                <thead className="bg-[#F8FAFC] text-left text-xs uppercase tracking-[0.16em] text-gray-500">
                  <tr>
                    <th className="px-4 py-3 font-bold">User</th>
                    <th className="px-4 py-3 font-bold">Merchant</th>
                    <th className="px-4 py-3 font-bold">Amount</th>
                    <th className="px-4 py-3 font-bold">Points</th>
                    <th className="px-4 py-3 font-bold">Status</th>
                    <th className="px-4 py-3 font-bold">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[color:var(--kk-border)] bg-white">
                  {data.transactionLog.length ? (
                    data.transactionLog.map((transaction) => (
                      <tr key={transaction.id} className="align-top">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-gray-900">{transaction.userName}</p>
                          <p className="text-xs text-gray-500">{transaction.userEmail || 'No email'}</p>
                        </td>
                        <td className="px-4 py-3 text-gray-700">{transaction.merchantName}</td>
                        <td className="px-4 py-3 text-gray-700">
                          {typeof transaction.amountSpent === 'number' ? `PHP ${transaction.amountSpent.toFixed(2)}` : 'N/A'}
                        </td>
                        <td className="px-4 py-3 font-semibold text-[#014384]">{formatPoints(transaction.pointsAwarded)}</td>
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
                        <td className="px-4 py-3 text-gray-500">{formatDateTime(transaction.timestamp)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-500">
                        No transactions matched the current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <section className="rounded-[28px] border border-[color:var(--kk-border)] bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-gray-900">Conversion Rate Settings</h2>
                <p className="text-sm text-gray-500">Adjust the barangay-wide PHP to point conversion.</p>
              </div>
              <span className={cn(
                'rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.14em]',
                isSuperadmin ? 'bg-[#E8F1FF] text-[#014384]' : 'bg-gray-100 text-gray-500'
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
                  className="mt-2 w-full rounded-2xl border border-[color:var(--kk-border)] bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-[#014384] disabled:cursor-not-allowed disabled:bg-gray-50"
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

          <section className="rounded-[28px] border border-[color:var(--kk-border)] bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-gray-900">Points Leaderboard</h2>
                <p className="text-sm text-gray-500">Top point earners in the barangay.</p>
              </div>
              <span className="rounded-full bg-[#E8F1FF] px-3 py-1 text-xs font-bold text-[#014384]">Top 10</span>
            </div>
            <div className="mt-4 space-y-3">
              {filteredLeaderboard.length ? (
                filteredLeaderboard.map((entry, index) => (
                  <div key={entry.userId} className="flex items-center justify-between gap-3 rounded-2xl border border-[color:var(--kk-border)] px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#014384] text-sm font-black text-white">
                        #{index + 1}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{entry.userName}</p>
                        <p className="text-xs text-gray-500">{entry.userEmail || 'No email'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-[#014384]">{formatPoints(entry.totalPoints)}</p>
                      <p className="text-xs text-gray-500">Earned {formatPoints(entry.earnedPoints)}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-[color:var(--kk-border)] px-4 py-8 text-center text-sm text-gray-500">
                  No leaderboard records yet.
                </div>
              )}
            </div>
          </section>
        </div>
      </section>

      <section className="rounded-[28px] border border-[color:var(--kk-border)] bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
        <div className="mb-4">
          <h2 className="text-lg font-black text-gray-900">Manual Adjustment Log</h2>
          <p className="text-sm text-gray-500">Every admin-triggered point addition or deduction with reason and admin attribution.</p>
        </div>

        <div className="overflow-hidden rounded-3xl border border-[color:var(--kk-border)]">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[color:var(--kk-border)] text-sm">
              <thead className="bg-[#F8FAFC] text-left text-xs uppercase tracking-[0.16em] text-gray-500">
                <tr>
                  <th className="px-4 py-3 font-bold">User</th>
                  <th className="px-4 py-3 font-bold">Direction</th>
                  <th className="px-4 py-3 font-bold">Points</th>
                  <th className="px-4 py-3 font-bold">Reason</th>
                  <th className="px-4 py-3 font-bold">Admin</th>
                  <th className="px-4 py-3 font-bold">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--kk-border)] bg-white">
                {data.manualAdjustments.length ? (
                  data.manualAdjustments.map((adjustment) => (
                    <tr key={adjustment.id}>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-900">{adjustment.userName}</p>
                        <p className="text-xs text-gray-500">{adjustment.userEmail || 'No email'}</p>
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
                      <td className="px-4 py-3 font-semibold text-[#014384]">{formatPoints(adjustment.pointsAwarded)}</td>
                      <td className="px-4 py-3 text-gray-700">{adjustment.reason || 'No reason provided'}</td>
                      <td className="px-4 py-3 text-gray-700">{adjustment.adminName || 'System'}</td>
                      <td className="px-4 py-3 text-gray-500">{formatDateTime(adjustment.timestamp)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-500">
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
  accent,
}: {
  title: string
  value: string
  detail: string
  accent: string
}) {
  return (
    <div className={cn('overflow-hidden rounded-[28px] p-[1px] shadow-[0_18px_40px_rgba(15,23,42,0.08)]', accent)}>
      <div className="rounded-[27px] bg-white/96 p-5 backdrop-blur">
        <p className="text-sm font-semibold text-gray-500">{title}</p>
        <p className="mt-3 text-3xl font-black text-gray-900">{value}</p>
        <p className="mt-2 text-sm text-gray-500">{detail}</p>
      </div>
    </div>
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
        className="mt-2 w-full rounded-2xl border border-[color:var(--kk-border)] bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-[#014384]"
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
        className="mt-2 w-full rounded-2xl border border-[color:var(--kk-border)] bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-[#014384]"
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
