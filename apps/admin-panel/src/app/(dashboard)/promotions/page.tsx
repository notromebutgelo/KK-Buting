'use client'

import { useEffect, useMemo, useState } from 'react'
import api from '@/lib/api'
import Spinner from '@/components/ui/Spinner'
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
    loadPromotions()
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

  const counts = useMemo(() => ({
    all: promotions.length,
    pending: promotions.filter((p) => p.status === 'pending').length,
    approved: promotions.filter((p) => p.status === 'approved' || p.status === 'active').length,
    rejected: promotions.filter((p) => p.status === 'rejected').length,
    expired: promotions.filter((p) => p.status === 'expired').length,
  }), [promotions])

  const filtered = useMemo(() => {
    return promotions.filter((p) => {
      const matchStatus =
        statusFilter === 'all' ||
        p.status === statusFilter ||
        (statusFilter === 'approved' && p.status === 'active')
      const matchSearch =
        !search ||
        p.title.toLowerCase().includes(search.toLowerCase()) ||
        String(p.merchantName || '').toLowerCase().includes(search.toLowerCase())
      return matchStatus && matchSearch
    })
  }, [promotions, statusFilter, search])

  async function handleReview(decision: 'approved' | 'rejected') {
    if (!selected) return
    if (decision === 'rejected' && !rejectNote.trim()) {
      setMessage('Please enter a rejection note.')
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

  const tabs: { id: StatusFilter; label: string; count?: number }[] = [
    { id: 'pending', label: 'Pending', count: counts.pending },
    { id: 'approved', label: 'Approved', count: counts.approved },
    { id: 'rejected', label: 'Rejected', count: counts.rejected },
    { id: 'expired', label: 'Expired', count: counts.expired },
    { id: 'all', label: 'All', count: counts.all },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-gray-900">Promotions Review</h1>
        <p className="mt-1 text-sm text-gray-500">
          Review merchant-submitted promotions. Approve or reject with a note.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => { setStatusFilter(tab.id); setSelected(null) }}
            className={cn(
              'rounded-xl px-4 py-2 text-sm font-semibold transition-colors',
              statusFilter === tab.id
                ? 'bg-blue-600 text-white shadow-[0_12px_24px_rgba(37,99,235,0.18)]'
                : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
            )}
          >
            {tab.label}
            {tab.count != null ? (
              <span className={cn('ml-2 rounded-full px-2 py-0.5 text-[11px]', statusFilter === tab.id ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500')}>
                {tab.count}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {message ? (
        <div className={cn('rounded-xl border px-4 py-3 text-sm', message.toLowerCase().includes('fail') || message.toLowerCase().includes('please') ? 'border-red-200 bg-red-50 text-red-700' : 'border-green-200 bg-green-50 text-green-700')}>
          {message}
        </div>
      ) : null}

      <div className={cn('grid gap-4', selected ? 'lg:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)]' : '')}>
        <section className="space-y-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <SearchField value={search} onChange={setSearch} placeholder="Search by title or merchant name" />

          {isLoading ? (
            <div className="flex justify-center py-16">
              <Spinner size="lg" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 px-6 py-16 text-center text-sm text-gray-400">
              No promotions for this filter.
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-gray-100">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px]">
                  <thead className="bg-gray-50">
                    <tr>
                      {['Merchant', 'Title', 'Type', 'Value', 'Min Purchase', 'Submitted', 'Status'].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filtered.map((p) => (
                      <tr
                        key={p.id}
                        onClick={() => { setSelected(p); setRejectNote(''); setShowRejectInput(false); setMessage('') }}
                        className={cn('cursor-pointer hover:bg-gray-50', selected?.id === p.id && 'bg-blue-50')}
                      >
                        <td className="px-4 py-4 text-sm font-semibold text-gray-900">{p.merchantName || '—'}</td>
                        <td className="px-4 py-4">
                          <p className="text-sm font-semibold text-gray-900">{p.title}</p>
                          <p className="mt-0.5 text-xs text-gray-400 line-clamp-1">{p.description || '—'}</p>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-600">{p.type || '—'}</td>
                        <td className="px-4 py-4 text-sm font-semibold text-blue-700">{formatValue(p)}</td>
                        <td className="px-4 py-4 text-sm text-gray-600">
                          {Number(p.minPurchaseAmount) > 0 ? `₱${Number(p.minPurchaseAmount).toLocaleString()}` : '—'}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-500">
                          {p.submittedAt ? new Date(p.submittedAt).toLocaleDateString('en-PH') : '—'}
                        </td>
                        <td className="px-4 py-4">
                          <PromotionStatusPill status={p.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        {selected ? (
          <aside className="space-y-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-500">Promotion Detail</p>
                <h2 className="mt-1 text-xl font-black text-gray-900">{selected.title}</h2>
              </div>
              <button type="button" onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <dl className="space-y-3 text-sm">
              <DetailRow label="Merchant" value={selected.merchantName || '—'} />
              <DetailRow label="Description" value={selected.description || '—'} />
              <DetailRow label="Type" value={selected.type || '—'} />
              <DetailRow label="Value" value={formatValue(selected)} />
              <DetailRow label="Min Purchase" value={Number(selected.minPurchaseAmount) > 0 ? `₱${Number(selected.minPurchaseAmount).toLocaleString()}` : 'None'} />
              <DetailRow label="Expires" value={selected.expiresAt ? new Date(selected.expiresAt).toLocaleDateString('en-PH') : 'No expiry'} />
              <DetailRow label="Status">
                <PromotionStatusPill status={selected.status} />
              </DetailRow>
              {selected.reviewNote ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <p className="text-xs font-semibold text-amber-700">Review Note</p>
                  <p className="mt-1 text-sm text-amber-800">{selected.reviewNote}</p>
                </div>
              ) : null}
              {selected.reviewedAt ? (
                <DetailRow label="Reviewed At" value={new Date(selected.reviewedAt).toLocaleString('en-PH')} />
              ) : null}
            </dl>

            {['pending', 'approved', 'rejected'].includes(selected.status) ? (
              <div className="space-y-3 border-t border-gray-100 pt-4">
                {showRejectInput ? (
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Rejection Note (required)</label>
                    <textarea
                      value={rejectNote}
                      onChange={(e) => setRejectNote(e.target.value)}
                      rows={3}
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-400/20"
                      placeholder="Explain why this promotion is being rejected…"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => void handleReview('rejected')}
                        disabled={isSaving}
                        className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        {isSaving ? 'Saving…' : 'Confirm Reject'}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setShowRejectInput(false); setRejectNote('') }}
                        className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => void handleReview('approved')}
                      disabled={isSaving || selected.status === 'active' || selected.status === 'approved'}
                      className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isSaving ? 'Saving…' : 'Approve'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowRejectInput(true)}
                      disabled={isSaving}
                      className="flex-1 rounded-xl border border-red-200 bg-red-50 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ) : null}
          </aside>
        ) : null}
      </div>
    </div>
  )
}

function formatValue(p: Promotion): string {
  if (!p.type) return String(p.value || '—')
  if (p.type === 'points_multiplier') return `${p.value}× points`
  if (p.type === 'discount') return `${p.value}% off`
  if (p.type === 'freebie') return 'Free item'
  return String(p.value || '—')
} 

function DetailRow({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="shrink-0 text-xs font-semibold uppercase tracking-[0.12em] text-gray-400">{label}</dt>
      <dd className="text-right text-sm font-medium text-gray-700">{children ?? value}</dd>
    </div>
  )
}

function SearchField({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative">
      <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m21 21-4.35-4.35M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14Z" />
      </svg>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
    </div>
  )
}

function PromotionStatusPill({ status }: { status: string }) {
  const tones: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    approved: 'bg-emerald-100 text-emerald-700',
    active: 'bg-blue-100 text-blue-700',
    rejected: 'bg-red-100 text-red-700',
    expired: 'bg-gray-100 text-gray-500',
  }
  return (
    <span className={cn('rounded-full px-2.5 py-1 text-xs font-semibold', tones[status] || 'bg-gray-100 text-gray-600')}>
      {status}
    </span>
  )
}
