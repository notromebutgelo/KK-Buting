'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Search, X } from 'lucide-react'
import api from '@/lib/api'
import {
  AdminEmptyState,
  AdminField,
  AdminFilterBar,
  AdminNotice,
  AdminPageIntro,
  AdminStatCard,
  AdminStatGrid,
  AdminSurface,
  AdminSurfaceHeader,
  AdminTabBar,
  AdminTableShell,
} from '@/components/admin/workspace'
import { DashboardMiniStat, DashboardPill } from '@/components/dashboard/primitives'
import { cn } from '@/utils/cn'

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected' | 'active' | 'expired'

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

export default function PromotionsPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Promotion | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [rejectNote, setRejectNote] = useState('')
  const [showRejectInput, setShowRejectInput] = useState(false)

  useEffect(() => {
    void loadPromotions()
  }, [])

  async function loadPromotions() {
    setIsLoading(true)
    try {
      const res = await api.get('/promotions')
      setPromotions(res.data.promotions || [])
    } catch {
      setPromotions([])
    } finally {
      setIsLoading(false)
    }
  }

  const counts = useMemo(
    () => ({
      all: promotions.length,
      pending: promotions.filter((p) => p.status === 'pending').length,
      approved: promotions.filter((p) => p.status === 'approved' || p.status === 'active').length,
      rejected: promotions.filter((p) => p.status === 'rejected').length,
      expired: promotions.filter((p) => p.status === 'expired').length,
    }),
    [promotions]
  )

  const filtered = useMemo(
    () =>
      promotions.filter((promotion) => {
        const matchStatus =
          statusFilter === 'all' ||
          promotion.status === statusFilter ||
          (statusFilter === 'approved' && promotion.status === 'active')
        const matchSearch =
          !search ||
          promotion.title.toLowerCase().includes(search.toLowerCase()) ||
          String(promotion.merchantName || '')
            .toLowerCase()
            .includes(search.toLowerCase())
        return matchStatus && matchSearch
      }),
    [promotions, statusFilter, search]
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
      await loadPromotions()
      setSelected(null)
    } catch (err: any) {
      setMessage(err?.response?.data?.error || 'Failed to review promotion.')
    } finally {
      setIsSaving(false)
    }
  }

  const tabs: Array<{ id: StatusFilter; label: string; count: number }> = [
    { id: 'pending', label: 'Pending', count: counts.pending },
    { id: 'approved', label: 'Approved', count: counts.approved },
    { id: 'rejected', label: 'Rejected', count: counts.rejected },
    { id: 'expired', label: 'Expired', count: counts.expired },
    { id: 'all', label: 'All', count: counts.all },
  ]

  const messageTone = message.toLowerCase().includes('fail') || message.toLowerCase().includes('please') ? 'danger' : 'success'

  return (
    <div className="flex flex-col gap-6">
      <AdminPageIntro
        eyebrow="Promotion governance"
        title="Review merchant campaigns with clearer queue states, calmer comparison, and a stronger approval workflow."
        description="This page should make it easy to scan which promotions need attention, inspect the merchant's intent, and leave a clean review trail when approving or rejecting."
        pills={[
          <DashboardPill key="scope" tone="soft">
            Superadmin review
          </DashboardPill>,
          <DashboardPill key="focus" tone={counts.pending > 0 ? 'warning' : 'default'}>
            {counts.pending > 0 ? 'Pending queue active' : 'No pending promotions'}
          </DashboardPill>,
        ]}
        aside={
          <div className="grid grid-cols-2 gap-3">
            <DashboardMiniStat
              label="Pending"
              value={counts.pending.toLocaleString()}
              meta="Waiting for a decision"
              tone={counts.pending > 0 ? 'warning' : 'soft'}
            />
            <DashboardMiniStat
              label="Approved"
              value={counts.approved.toLocaleString()}
              meta="Already cleared for visibility"
              tone="neutral"
            />
          </div>
        }
      />

      <AdminStatGrid>
        <AdminStatCard
          label="Pending review"
          value={counts.pending.toLocaleString()}
          meta="Merchant submissions that still need a decision."
          accent="var(--accent-warm)"
        />
        <AdminStatCard
          label="Approved or active"
          value={counts.approved.toLocaleString()}
          meta="Campaigns that have already moved beyond the queue."
          accent="var(--accent)"
        />
        <AdminStatCard
          label="Rejected"
          value={counts.rejected.toLocaleString()}
          meta="Promotions that were sent back with a review note."
          accent="var(--danger-accent)"
        />
        <AdminStatCard
          label="Expired"
          value={counts.expired.toLocaleString()}
          meta="Campaigns that are no longer active because their time window has closed."
          accent="rgba(1, 67, 132, 0.34)"
        />
      </AdminStatGrid>

      <AdminTabBar
        value={statusFilter}
        onChange={(value) => {
          setStatusFilter(value)
          setSelected(null)
        }}
        tabs={tabs}
      />

      {message ? <AdminNotice tone={messageTone}>{message}</AdminNotice> : null}

      <div className={cn('grid gap-6', selected ? 'xl:grid-cols-[1.1fr_0.9fr]' : '')}>
        <AdminSurface>
          <AdminSurfaceHeader
            title="Promotion queue"
            description="The table stays compact and scannable, while the detail panel carries the real review work."
            action={
              <DashboardPill tone="default">
                {filtered.length} shown
              </DashboardPill>
            }
          />

          <div className="mt-5">
            <AdminFilterBar columns="xl:grid-cols-1">
              <AdminField label="Search promotions">
                <div className="relative">
                  <Search
                    size={16}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
                    style={{ color: 'var(--muted)' }}
                  />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by title or merchant name"
                    className="surface-input w-full rounded-xl py-2.5 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-[color:var(--accent)]/25"
                  />
                </div>
              </AdminField>
            </AdminFilterBar>
          </div>

          <div className="mt-5">
            {isLoading ? (
              <div className="flex justify-center py-16">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-[color:var(--accent)] border-t-transparent" />
              </div>
            ) : filtered.length === 0 ? (
              <AdminEmptyState
                title="No promotions for this filter"
                description="Try another status tab or broaden the search to surface more merchant campaigns."
              />
            ) : (
              <AdminTableShell minWidth="760px">
                <table className="w-full">
                  <thead style={{ background: 'var(--accent-soft)' }}>
                    <tr>
                      {['Merchant', 'Promotion', 'Type', 'Value', 'Min Purchase', 'Submitted', 'Status'].map((heading) => (
                        <th
                          key={heading}
                          className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em]"
                          style={{ color: 'var(--muted)' }}
                        >
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: 'var(--stroke)' }}>
                    {filtered.map((promotion) => {
                      const isSelected = selected?.id === promotion.id
                      return (
                        <tr
                          key={promotion.id}
                          onClick={() => {
                            setSelected(promotion)
                            setRejectNote('')
                            setShowRejectInput(false)
                            setMessage('')
                          }}
                          className="cursor-pointer transition-colors"
                          style={{
                            background: isSelected ? 'color-mix(in srgb, var(--accent-soft) 88%, transparent)' : 'transparent',
                          }}
                          onMouseEnter={(event) => {
                            if (!isSelected) {
                              ;(event.currentTarget as HTMLElement).style.background =
                                'color-mix(in srgb, var(--surface-muted) 76%, transparent)'
                            }
                          }}
                          onMouseLeave={(event) => {
                            if (!isSelected) {
                              ;(event.currentTarget as HTMLElement).style.background = 'transparent'
                            }
                          }}
                        >
                          <td className="px-4 py-4 text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                            {promotion.merchantName || '—'}
                          </td>
                          <td className="px-4 py-4">
                            <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                              {promotion.title}
                            </p>
                            <p className="mt-0.5 line-clamp-1 text-xs" style={{ color: 'var(--muted)' }}>
                              {promotion.description || 'No description provided'}
                            </p>
                          </td>
                          <td className="px-4 py-4 text-sm capitalize" style={{ color: 'var(--ink-soft)' }}>
                            {promotion.type?.replace(/_/g, ' ') || '—'}
                          </td>
                          <td className="px-4 py-4 text-sm font-semibold" style={{ color: 'var(--accent-strong)' }}>
                            {formatValue(promotion)}
                          </td>
                          <td className="px-4 py-4 text-sm" style={{ color: 'var(--ink-soft)' }}>
                            {Number(promotion.minPurchaseAmount) > 0
                              ? `PHP ${Number(promotion.minPurchaseAmount).toLocaleString()}`
                              : '—'}
                          </td>
                          <td className="px-4 py-4 text-sm" style={{ color: 'var(--muted)' }}>
                            {promotion.submittedAt ? new Date(promotion.submittedAt).toLocaleDateString('en-PH') : '—'}
                          </td>
                          <td className="px-4 py-4">
                            <PromotionStatusPill status={promotion.status} />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </AdminTableShell>
            )}
          </div>
        </AdminSurface>

        {selected ? (
          <AdminSurface tone="neutral">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--accent-strong)' }}>
                  Promotion detail
                </p>
                <h2 className="mt-2 text-xl font-semibold" style={{ color: 'var(--ink)' }}>
                  {selected.title}
                </h2>
                <p className="mt-1 text-sm leading-6" style={{ color: 'var(--muted)' }}>
                  Review the merchant context, campaign structure, and any previous note before making a final decision.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-xl p-2 transition-colors hover:bg-[color:var(--surface-muted)]"
                style={{ color: 'var(--muted)' }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-5 rounded-2xl border p-4" style={{ borderColor: 'var(--stroke)', background: 'var(--card-solid)' }}>
              <dl className="flex flex-col gap-3 text-sm">
                <DetailRow label="Merchant" value={selected.merchantName || '—'} />
                <DetailRow label="Description" value={selected.description || '—'} />
                <DetailRow label="Type" value={selected.type?.replace(/_/g, ' ') || '—'} />
                <DetailRow label="Value" value={formatValue(selected)} />
                <DetailRow
                  label="Min purchase"
                  value={Number(selected.minPurchaseAmount) > 0 ? `PHP ${Number(selected.minPurchaseAmount).toLocaleString()}` : 'None'}
                />
                <DetailRow
                  label="Expires"
                  value={selected.expiresAt ? new Date(selected.expiresAt).toLocaleDateString('en-PH') : 'No expiry'}
                />
                <DetailRow label="Status">
                  <PromotionStatusPill status={selected.status} />
                </DetailRow>
                {selected.reviewedAt ? (
                  <DetailRow label="Reviewed at" value={new Date(selected.reviewedAt).toLocaleString('en-PH')} />
                ) : null}
              </dl>
            </div>

            {selected.reviewNote ? (
              <div
                className="mt-4 rounded-2xl border px-4 py-3"
                style={{
                  borderColor: 'color-mix(in srgb, var(--warning-accent) 30%, white 70%)',
                  background: 'var(--warning-bg)',
                }}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--warning-fg)' }}>
                  Review note
                </p>
                <p className="mt-2 text-sm leading-6" style={{ color: 'var(--warning-fg)' }}>
                  {selected.reviewNote}
                </p>
              </div>
            ) : null}

            {['pending', 'approved', 'rejected'].includes(selected.status) ? (
              <div className="mt-5 border-t pt-5" style={{ borderColor: 'var(--stroke)' }}>
                {showRejectInput ? (
                  <div className="flex flex-col gap-3">
                    <AdminField label="Rejection note" hint="Explain clearly what the merchant should fix before resubmitting.">
                      <textarea
                        value={rejectNote}
                        onChange={(e) => setRejectNote(e.target.value)}
                        rows={4}
                        className="surface-input w-full rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[color:var(--danger-accent)]/20"
                        placeholder="Explain why this promotion is being rejected."
                      />
                    </AdminField>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => void handleReview('rejected')}
                        disabled={isSaving}
                        className="rounded-xl bg-rose-600 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                      >
                        {isSaving ? 'Saving...' : 'Confirm rejection'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowRejectInput(false)
                          setRejectNote('')
                        }}
                        className="rounded-xl border px-4 py-2.5 text-sm font-semibold"
                        style={{ borderColor: 'var(--stroke)', color: 'var(--ink-soft)' }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => void handleReview('approved')}
                        disabled={isSaving || selected.status === 'active' || selected.status === 'approved'}
                        className="rounded-xl py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                        style={{ background: 'var(--accent)' }}
                      >
                        {isSaving ? 'Saving...' : 'Approve promotion'}
                      </button>
                    <button
                      type="button"
                      onClick={() => setShowRejectInput(true)}
                      disabled={isSaving}
                      className="rounded-xl border border-red-200 bg-red-50 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
                    >
                      Reject with note
                    </button>
                  </div>
                )}
              </div>
            ) : null}
          </AdminSurface>
        ) : null}
      </div>
    </div>
  )
}

function formatValue(promotion: Promotion): string {
  if (!promotion.type) return String(promotion.value || '—')
  if (promotion.type === 'points_multiplier') return `${promotion.value}x points`
  if (promotion.type === 'discount') return `${promotion.value}% off`
  if (promotion.type === 'freebie') return 'Free item'
  return String(promotion.value || '—')
}

function DetailRow({
  label,
  value,
  children,
}: {
  label: string
  value?: string
  children?: ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="shrink-0 text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--muted)' }}>
        {label}
      </dt>
      <dd className="max-w-[260px] text-right text-sm leading-6 font-medium" style={{ color: 'var(--ink)' }}>
        {children ?? value}
      </dd>
    </div>
  )
}

function PromotionStatusPill({ status }: { status: string }) {
  const tones: Record<string, string> = {
    pending: 'bg-[color:var(--warning-bg)] text-[color:var(--warning-fg)]',
    approved: 'bg-[color:var(--accent-soft)] text-[color:var(--accent-strong)]',
    active: 'bg-[color:var(--info-bg)] text-[color:var(--info-fg)]',
    rejected: 'bg-[color:var(--danger-bg)] text-[color:var(--danger-fg)]',
    expired: 'bg-[color:var(--surface-muted)] text-[color:var(--muted)]',
  }

  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize',
        tones[status] || 'bg-[color:var(--surface-muted)] text-[color:var(--muted)]'
      )}
    >
      {status}
    </span>
  )
}
