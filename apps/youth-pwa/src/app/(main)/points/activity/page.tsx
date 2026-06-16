'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronLeft,
  Gift,
  ReceiptText,
  ScanLine,
  Store,
} from 'lucide-react'

import Spinner from '@/components/ui/Spinner'
import { usePoints } from '@/hooks/usePoints'
import { cn } from '@/utils/cn'
import { formatPoints } from '@/utils/formatPoints'

type ActivityFilter = 'all' | 'earn' | 'redeem'

type PointsTransaction = {
  id: string
  type: 'earn' | 'redeem'
  direction?: 'add' | 'deduct'
  points: number
  description: string
  createdAt: string
  merchantId?: string | null
  merchantName?: string | null
  merchantLogoUrl?: string | null
  rewardId?: string | null
  rewardTitle?: string | null
  amountSpent?: number | null
  status?: string
  reason?: string | null
}

const FILTERS: Array<{ value: ActivityFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'earn', label: 'Earned' },
  { value: 'redeem', label: 'Used' },
]

export default function PointsActivityPage() {
  const router = useRouter()
  const { data, isLoading, error } = usePoints()
  const [filter, setFilter] = useState<ActivityFilter>('all')

  const transactions = useMemo(
    () => (data?.transactions || []) as PointsTransaction[],
    [data?.transactions]
  )
  const filteredTransactions = useMemo(
    () =>
      filter === 'all'
        ? transactions
        : transactions.filter((transaction) => transaction.type === filter),
    [filter, transactions]
  )
  const latestEarned = useMemo(
    () => transactions.find((transaction) => transaction.type === 'earn') || null,
    [transactions]
  )

  return (
    <div className="min-h-full bg-[#f4f7fc] pb-28 text-[#123f73]">
      <header className="sticky top-0 z-20 bg-[#f4f7fc]/94 px-4 pb-3 pt-[calc(env(safe-area-inset-top,0px)+1rem)] backdrop-blur-xl">
        <div className="mx-auto grid max-w-[460px] grid-cols-[40px_1fr_40px] items-center">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#0f4c97] shadow-[0_10px_22px_rgba(15,76,151,0.12)]"
            aria-label="Go back"
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={2.3} />
          </button>
          <h1 className="text-center text-[20px] font-black tracking-[-0.03em] text-[#0f4c97]">
            Points Activity
          </h1>
          <div />
        </div>
      </header>

      <main className="mx-auto max-w-[460px] px-4">
        <section className="overflow-hidden rounded-[28px] bg-[linear-gradient(145deg,#0f4c97_0%,#1e72cc_58%,#56a8f0_100%)] px-5 pb-5 pt-5 text-white shadow-[0_20px_44px_rgba(15,76,151,0.24)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-white/68">
                Available Points
              </p>
              <p className="mt-2 text-[38px] font-black leading-none tracking-[-0.04em]">
                {isLoading ? '...' : formatPoints(data?.totalPoints || 0)}
              </p>
              <p className="mt-1 text-sm font-bold text-white/74">KK points balance</p>
            </div>
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] bg-white/14 text-[#ffd66b] shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]">
              <ReceiptText className="h-7 w-7" strokeWidth={2.1} />
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <SummaryPill
              label="Earned"
              value={formatPoints(data?.earnedPoints || 0)}
              tone="gold"
            />
            <SummaryPill
              label="Used"
              value={formatPoints(data?.redeemedPoints || 0)}
              tone="blue"
            />
          </div>
        </section>

        <section className="mt-5 rounded-[24px] bg-white px-4 py-4 shadow-[0_16px_34px_rgba(15,76,151,0.09)]">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-[#fff4d8] text-[#f5aa13]">
              <ScanLine className="h-6 w-6" strokeWidth={2.1} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#7d92ae]">
                Latest Merchant Scan
              </p>
              <p className="mt-1 truncate text-[15px] font-black text-[#143f70]">
                {latestEarned?.merchantName || 'No merchant scans yet'}
              </p>
            </div>
            <p className="shrink-0 text-[14px] font-black text-[#2f80ed]">
              {latestEarned ? `+${formatPoints(latestEarned.points)}` : '0'}
            </p>
          </div>
        </section>

        <section className="mt-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[17px] font-black tracking-[-0.03em] text-[#0f4c97]">
              Activity Record
            </h2>
            <p className="text-[12px] font-bold text-[#7890ad]">
              {filteredTransactions.length} record{filteredTransactions.length === 1 ? '' : 's'}
            </p>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2 rounded-[18px] bg-[#eaf1fb] p-1.5">
            {FILTERS.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setFilter(item.value)}
                className={cn(
                  'h-10 rounded-[14px] text-[12px] font-black transition-colors',
                  filter === item.value
                    ? 'bg-white text-[#0f4c97] shadow-[0_8px_18px_rgba(15,76,151,0.12)]'
                    : 'text-[#6f86a4]'
                )}
              >
                {item.label}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="flex justify-center py-16">
              <Spinner size="lg" />
            </div>
          ) : error ? (
            <EmptyState
              title="Points activity unavailable"
              copy="Your balance is still safe. Please refresh this page later."
            />
          ) : filteredTransactions.length > 0 ? (
            <div className="mt-4 space-y-3">
              {filteredTransactions.map((transaction) => (
                <ActivityItem key={transaction.id} transaction={transaction} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No activity yet"
              copy="Merchant scans and reward deductions will appear here."
            />
          )}
        </section>
      </main>
    </div>
  )
}

function SummaryPill({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: 'gold' | 'blue'
}) {
  return (
    <div className="rounded-[18px] bg-white/13 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.16)]">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/62">
        {label}
      </p>
      <p
        className={cn(
          'mt-1 text-[20px] font-black tracking-[-0.03em]',
          tone === 'gold' ? 'text-[#ffd66b]' : 'text-white'
        )}
      >
        {value}
      </p>
    </div>
  )
}

function ActivityItem({ transaction }: { transaction: PointsTransaction }) {
  const isEarn = transaction.type === 'earn'
  const content = (
    <article className="rounded-[22px] border border-[#e1ebf6] bg-white px-4 py-4 shadow-[0_12px_26px_rgba(15,76,151,0.08)]">
      <div className="flex items-start gap-3">
        <MerchantMark transaction={transaction} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-[15px] font-black tracking-[-0.02em] text-[#143f70]">
                {isEarn
                  ? transaction.merchantName || 'Partner merchant'
                  : transaction.rewardTitle || 'Reward redemption'}
              </p>
              <p className="mt-1 text-[12px] font-semibold text-[#7a90aa]">
                {formatDateTime(transaction.createdAt)}
              </p>
            </div>
            <div
              className={cn(
                'flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-black',
                isEarn ? 'bg-[#e9f7ef] text-[#17864d]' : 'bg-[#fff3dc] text-[#b97805]'
              )}
            >
              {isEarn ? (
                <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2.4} />
              ) : (
                <ArrowDownLeft className="h-3.5 w-3.5" strokeWidth={2.4} />
              )}
              {isEarn ? '+' : '-'}
              {formatPoints(transaction.points)}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <DetailChip
              label={isEarn ? 'Generated' : 'Deducted'}
              value={`${formatPoints(transaction.points)} pts`}
            />
            {isEarn ? (
              <DetailChip
                label="Spent"
                value={
                  transaction.amountSpent != null
                    ? formatCurrency(transaction.amountSpent)
                    : 'Not recorded'
                }
              />
            ) : null}
            <DetailChip label="Status" value={prettifyStatus(transaction.status)} />
          </div>

          {transaction.reason ? (
            <p className="mt-3 rounded-[14px] bg-[#f5f8fc] px-3 py-2 text-[12px] font-semibold leading-[1.45] text-[#647b96]">
              {transaction.reason}
            </p>
          ) : null}
        </div>
      </div>
    </article>
  )

  if (isEarn && transaction.merchantId) {
    return (
      <Link href={`/merchants/${transaction.merchantId}`} className="block">
        {content}
      </Link>
    )
  }

  if (!isEarn && transaction.rewardId) {
    return (
      <Link href={`/rewards/${transaction.rewardId}`} className="block">
        {content}
      </Link>
    )
  }

  return content
}

function MerchantMark({ transaction }: { transaction: PointsTransaction }) {
  if (transaction.type === 'redeem') {
    return (
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] bg-[#fff3dc] text-[#f2a917]">
        <Gift className="h-6 w-6" strokeWidth={2.1} />
      </div>
    )
  }

  if (transaction.merchantLogoUrl) {
    return (
      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-[18px] bg-[#f2f7ff]">
        <img
          src={transaction.merchantLogoUrl}
          alt={transaction.merchantName || 'Merchant logo'}
          className="h-full w-full object-cover"
        />
      </div>
    )
  }

  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] bg-[#eaf3ff] text-[#0f4c97]">
      <Store className="h-6 w-6" strokeWidth={2.1} />
    </div>
  )
}

function DetailChip({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f5f8fc] px-3 py-1.5 text-[11px] font-bold text-[#66809f]">
      <span className="text-[#93a5bc]">{label}</span>
      <span className="text-[#173f70]">{value}</span>
    </span>
  )
}

function EmptyState({ title, copy }: { title: string; copy: string }) {
  return (
    <div className="mt-4 rounded-[22px] bg-white px-5 py-10 text-center shadow-[0_14px_30px_rgba(15,76,151,0.08)]">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] bg-[#edf5ff] text-[#0f4c97]">
        <ReceiptText className="h-8 w-8" strokeWidth={2.1} />
      </div>
      <p className="mt-4 text-[17px] font-black text-[#0f4c97]">{title}</p>
      <p className="mx-auto mt-2 max-w-[240px] text-[13px] font-semibold leading-[1.55] text-[#6d829d]">
        {copy}
      </p>
    </div>
  )
}

function formatDateTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return date.toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0,
  }).format(value)
}

function prettifyStatus(value?: string) {
  const normalized = String(value || 'success').trim()
  if (!normalized) return 'Success'

  return normalized
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}
