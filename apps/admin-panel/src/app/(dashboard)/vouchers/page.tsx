'use client'

import { useEffect, useMemo, useState } from 'react'
import api from '@/lib/api'
import Spinner from '@/components/ui/Spinner'
import { cn } from '@/utils/cn'

type VoucherTab = 'list' | 'create'

interface EligibilityConditions {
  minAge?: number | string
  maxAge?: number | string
  ageGroup?: string
  isVerified?: boolean
}

interface Voucher {
  id: string
  title: string
  description?: string
  type?: string
  pointsCost: number
  eligibilityConditions?: EligibilityConditions
  stock?: number | null
  claimedCount?: number
  status?: string
  createdAt?: string
  expiresAt?: string | null
}

const emptyForm = {
  title: '',
  description: '',
  type: 'school_supplies',
  pointsCost: '0',
  stock: '100',
  unlimitedStock: false,
  expiresAt: '',
  status: 'active',
  minAge: '',
  maxAge: '',
  ageGroup: '',
  isVerified: false,
}

export default function VouchersPage() {
  const [activeTab, setActiveTab] = useState<VoucherTab>('list')
  const [vouchers, setVouchers] = useState<Voucher[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [form, setForm] = useState(emptyForm)
  const [editId, setEditId] = useState<string | null>(null)

  useEffect(() => {
    loadVouchers()
  }, [])

  async function loadVouchers() {
    setIsLoading(true)
    try {
      const res = await api.get('/vouchers')
      setVouchers(res.data.vouchers || [])
    } catch {
      setVouchers([])
    } finally {
      setIsLoading(false)
    }
  }

  const filtered = useMemo(() => {
    return vouchers.filter((v) => {
      const matchSearch =
        !search ||
        v.title.toLowerCase().includes(search.toLowerCase()) ||
        String(v.type || '').toLowerCase().includes(search.toLowerCase())
      const matchStatus = statusFilter === 'all' || v.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [vouchers, search, statusFilter])

  function openCreate() {
    setEditId(null)
    setForm(emptyForm)
    setMessage('')
    setActiveTab('create')
  }

  function openEdit(v: Voucher) {
    setEditId(v.id)
    setForm({
      title: v.title || '',
      description: v.description || '',
      type: v.type || 'school_supplies',
      pointsCost: String(v.pointsCost ?? 0),
      stock: v.stock == null ? '0' : String(v.stock),
      unlimitedStock: v.stock == null,
      expiresAt: v.expiresAt ? String(v.expiresAt).slice(0, 10) : '',
      status: v.status || 'active',
      minAge: String(v.eligibilityConditions?.minAge || ''),
      maxAge: String(v.eligibilityConditions?.maxAge || ''),
      ageGroup: v.eligibilityConditions?.ageGroup || '',
      isVerified: Boolean(v.eligibilityConditions?.isVerified),
    })
    setMessage('')
    setActiveTab('create')
  }

  async function handleExpire(v: Voucher) {
    setIsSaving(true)
    setMessage('')
    try {
      await api.patch(`/vouchers/${v.id}`, { status: 'expired' })
      setMessage('Voucher marked as expired.')
      await loadVouchers()
    } catch (err: any) {
      setMessage(err?.response?.data?.error || 'Failed to expire voucher.')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleSubmit() {
    setIsSaving(true)
    setMessage('')
    try {
      const eligibilityConditions: EligibilityConditions = {}
      if (form.minAge) eligibilityConditions.minAge = Number(form.minAge)
      if (form.maxAge) eligibilityConditions.maxAge = Number(form.maxAge)
      if (form.ageGroup) eligibilityConditions.ageGroup = form.ageGroup
      if (form.isVerified) eligibilityConditions.isVerified = true

      const payload = {
        title: form.title,
        description: form.description,
        type: form.type,
        pointsCost: Number(form.pointsCost || 0),
        stock: form.unlimitedStock ? null : Number(form.stock || 0),
        expiresAt: form.expiresAt || null,
        status: form.status,
        eligibilityConditions,
      }

      if (editId) {
        await api.patch(`/vouchers/${editId}`, payload)
        setMessage('Voucher updated successfully.')
      } else {
        await api.post('/vouchers', payload)
        setMessage('Voucher created successfully.')
      }
      setForm(emptyForm)
      setEditId(null)
      await loadVouchers()
      setActiveTab('list')
    } catch (err: any) {
      setMessage(err?.response?.data?.error || 'Failed to save voucher.')
    } finally {
      setIsSaving(false)
    }
  }

  const counts = {
    active: vouchers.filter((v) => v.status === 'active').length,
    expired: vouchers.filter((v) => v.status === 'expired').length,
    draft: vouchers.filter((v) => v.status === 'draft').length,
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Vouchers Management</h1>
          <p className="mt-1 text-sm text-gray-500">
            Create eligibility-based or points-redeemable vouchers for KK youth members.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <SummaryCard label="Active" value={counts.active} tone="blue" />
          <SummaryCard label="Expired" value={counts.expired} tone="amber" />
          <SummaryCard label="Draft" value={counts.draft} tone="slate" />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {([
            { id: 'list', label: 'All Vouchers' },
            { id: 'create', label: editId ? 'Edit Voucher' : 'Create Voucher' },
          ] as const).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                if (tab.id === 'list') {
                  setEditId(null)
                  setForm(emptyForm)
                }
                setActiveTab(tab.id)
              }}
              className={cn(
                'rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors',
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-[0_12px_24px_rgba(37,99,235,0.18)]'
                  : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {activeTab === 'list' ? (
          <button
            type="button"
            onClick={openCreate}
            className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            + New Voucher
          </button>
        ) : null}
      </div>

      {message ? (
        <div
          className={cn(
            'rounded-xl border px-4 py-3 text-sm',
            message.toLowerCase().includes('fail') || message.toLowerCase().includes('error')
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-green-200 bg-green-50 text-green-700'
          )}
        >
          {message}
        </div>
      ) : null}

      {activeTab === 'list' ? (
        <section className="space-y-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="grid gap-3 md:grid-cols-[1.5fr_0.7fr]">
            <SearchField value={search} onChange={setSearch} placeholder="Search voucher title or type" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={inputClass}
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="draft">Draft</option>
            </select>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-16">
              <Spinner size="lg" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 px-6 py-16 text-center text-sm text-gray-400">
              No vouchers matched the current filters.
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-gray-100">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px]">
                  <thead className="bg-gray-50">
                    <tr>
                      {['Title', 'Type', 'Points Cost', 'Stock', 'Claimed', 'Status', 'Expires', 'Actions'].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filtered.map((v) => (
                      <tr key={v.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4">
                          <p className="text-sm font-semibold text-gray-900">{v.title}</p>
                          <p className="mt-0.5 text-xs text-gray-400 line-clamp-1">{v.description || '—'}</p>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-600">{v.type || '—'}</td>
                        <td className="px-4 py-4 text-sm font-semibold text-blue-700">
                          {Number(v.pointsCost) > 0 ? `${Number(v.pointsCost).toLocaleString()} pts` : 'Free'}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-600">
                          {v.stock == null ? 'Unlimited' : Number(v.stock).toLocaleString()}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-600">{Number(v.claimedCount ?? 0)}</td>
                        <td className="px-4 py-4">
                          <StatusPill status={v.status || 'active'} />
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-500">
                          {v.expiresAt ? new Date(v.expiresAt).toLocaleDateString('en-PH') : '—'}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => openEdit(v)}
                              className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                            >
                              Edit
                            </button>
                            {v.status === 'active' ? (
                              <button
                                type="button"
                                onClick={() => void handleExpire(v)}
                                disabled={isSaving}
                                className="rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100 disabled:opacity-50"
                              >
                                Expire
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
          <section className="space-y-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black text-gray-900">{editId ? 'Edit Voucher' : 'Create New Voucher'}</h2>

            <div className="space-y-3">
              <div>
                <FieldLabel label="Title" />
                <input value={form.title} onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))} className={inputClass} placeholder="Voucher title" />
              </div>
              <div>
                <FieldLabel label="Description" />
                <textarea value={form.description} onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))} rows={3} className={inputClass} placeholder="What this voucher provides" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <FieldLabel label="Type" />
                  <select value={form.type} onChange={(e) => setForm((s) => ({ ...s, type: e.target.value }))} className={inputClass}>
                    <option value="school_supplies">School Supplies</option>
                    <option value="discount">Discount</option>
                    <option value="freebie">Freebie</option>
                    <option value="livelihood">Livelihood</option>
                    <option value="health">Health</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <FieldLabel label="Status" />
                  <select value={form.status} onChange={(e) => setForm((s) => ({ ...s, status: e.target.value }))} className={inputClass}>
                    <option value="active">Active</option>
                    <option value="draft">Draft</option>
                    <option value="expired">Expired</option>
                  </select>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                <div>
                  <FieldLabel label="Stock" />
                  <input type="number" min="0" value={form.stock} onChange={(e) => setForm((s) => ({ ...s, stock: e.target.value }))} disabled={form.unlimitedStock} className={cn(inputClass, form.unlimitedStock && 'bg-gray-100 text-gray-400')} />
                </div>
                <label className="mt-7 inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-700">
                  <input type="checkbox" checked={form.unlimitedStock} onChange={(e) => setForm((s) => ({ ...s, unlimitedStock: e.target.checked }))} />
                  Unlimited
                </label>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <FieldLabel label="Points Cost (0 = free/eligibility)" />
                  <input type="number" min="0" value={form.pointsCost} onChange={(e) => setForm((s) => ({ ...s, pointsCost: e.target.value }))} className={inputClass} />
                </div>
                <div>
                  <FieldLabel label="Expires At" />
                  <input type="date" value={form.expiresAt} onChange={(e) => setForm((s) => ({ ...s, expiresAt: e.target.value }))} className={inputClass} />
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={isSaving || !form.title}
              className="w-full rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? 'Saving…' : editId ? 'Update Voucher' : 'Create Voucher'}
            </button>
          </section>

          <aside className="space-y-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-500">Eligibility Conditions</p>
              <p className="mt-1 text-sm text-gray-500">Leave blank to allow all verified members to claim.</p>
            </div>
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <FieldLabel label="Min Age" />
                  <input type="number" min="0" value={form.minAge} onChange={(e) => setForm((s) => ({ ...s, minAge: e.target.value }))} className={inputClass} placeholder="e.g. 15" />
                </div>
                <div>
                  <FieldLabel label="Max Age" />
                  <input type="number" min="0" value={form.maxAge} onChange={(e) => setForm((s) => ({ ...s, maxAge: e.target.value }))} className={inputClass} placeholder="e.g. 30" />
                </div>
              </div>
              <div>
                <FieldLabel label="Age Group" />
                <select value={form.ageGroup} onChange={(e) => setForm((s) => ({ ...s, ageGroup: e.target.value }))} className={inputClass}>
                  <option value="">Any age group</option>
                  <option value="Child Youth">Child Youth</option>
                  <option value="Core Youth">Core Youth</option>
                  <option value="Adult Youth">Adult Youth</option>
                </select>
              </div>
              <label className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-700">
                <input type="checkbox" checked={form.isVerified} onChange={(e) => setForm((s) => ({ ...s, isVerified: e.target.checked }))} />
                Require verified KK member status
              </label>
            </div>

            <div className="rounded-2xl bg-blue-50 px-4 py-3 text-xs text-blue-700">
              <p className="font-semibold">Eligibility summary:</p>
              <ul className="mt-1 space-y-1">
                {form.minAge ? <li>• Minimum age: {form.minAge}</li> : null}
                {form.maxAge ? <li>• Maximum age: {form.maxAge}</li> : null}
                {form.ageGroup ? <li>• Age group: {form.ageGroup}</li> : null}
                {form.isVerified ? <li>• Verified members only</li> : null}
                {!form.minAge && !form.maxAge && !form.ageGroup && !form.isVerified ? (
                  <li className="text-blue-400">No restrictions set — open to all authenticated users.</li>
                ) : null}
              </ul>
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}

function SummaryCard({ label, value, tone }: { label: string; value: number; tone: 'blue' | 'amber' | 'slate' }) {
  const tones = { blue: 'bg-blue-50 text-blue-700', amber: 'bg-amber-50 text-amber-700', slate: 'bg-slate-100 text-slate-700' }
  return (
    <div className="rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">{label}</p>
      <div className="mt-3 flex items-center justify-between">
        <p className="text-2xl font-black text-gray-900">{value}</p>
        <span className={cn('rounded-full px-2.5 py-1 text-[11px] font-semibold', tones[tone])}>Live</span>
      </div>
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

function FieldLabel({ label }: { label: string }) {
  return <label className="mb-1 block text-sm font-semibold text-gray-700">{label}</label>
}

function StatusPill({ status }: { status: string }) {
  const tones: Record<string, string> = {
    active: 'bg-emerald-100 text-emerald-700',
    expired: 'bg-amber-100 text-amber-700',
    draft: 'bg-slate-100 text-slate-600',
  }
  return (
    <span className={cn('rounded-full px-2.5 py-1 text-xs font-semibold', tones[status] || 'bg-gray-100 text-gray-600')}>
      {status}
    </span>
  )
}

const inputClass = 'w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20'
