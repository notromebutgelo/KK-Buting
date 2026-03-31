'use client'

import { useEffect, useMemo, useState } from 'react'
import api from '@/lib/api'
import Spinner from '@/components/ui/Spinner'
import { cn } from '@/utils/cn'

type RewardTab = 'catalogue' | 'redemptions'

interface Reward {
  id: string
  title: string
  description?: string
  points?: number
  category?: 'food' | 'services' | 'others' | string
  merchantId?: string
  merchantName?: string
  imageUrl?: string
  stock?: number | null
  unlimitedStock?: boolean
  expiryDate?: string | null
  status?: 'active' | 'inactive' | 'expired'
  isActive?: boolean
  validDays?: number
}

interface Redemption {
  id: string
  rewardId?: string | null
  rewardName: string
  userName: string
  userEmail?: string | null
  memberId?: string | null
  pointsCost: number
  status: 'active' | 'claimed' | 'expired' | string
  redeemedAt?: string
  claimedAt?: string | null
}

interface MerchantOption {
  id: string
  name: string
}

const emptyRewardForm = {
  title: '',
  description: '',
  imageUrl: '',
  points: '100',
  category: 'food',
  merchantId: '',
  stock: '0',
  unlimitedStock: true,
  expiryDate: '',
  isActive: true,
  validDays: '30',
}

export default function RewardsPage() {
  const [adminRole, setAdminRole] = useState('admin')
  const [activeTab, setActiveTab] = useState<RewardTab>('catalogue')
  const [rewards, setRewards] = useState<Reward[]>([])
  const [redemptions, setRedemptions] = useState<Redemption[]>([])
  const [merchants, setMerchants] = useState<MerchantOption[]>([])
  const [selectedRewardId, setSelectedRewardId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [redemptionSearch, setRedemptionSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [redemptionStatus, setRedemptionStatus] = useState('all')
  const [redemptionDate, setRedemptionDate] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isRedemptionLoading, setIsRedemptionLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [form, setForm] = useState(emptyRewardForm)

  const isSuperadmin = adminRole === 'superadmin'

  const selectedReward =
    rewards.find((reward) => reward.id === selectedRewardId) ||
    rewards[0] ||
    null

  const filteredRewards = useMemo(() => {
    return rewards.filter((reward) => {
      const matchesSearch =
        !search ||
        reward.title?.toLowerCase().includes(search.toLowerCase()) ||
        reward.merchantName?.toLowerCase().includes(search.toLowerCase()) ||
        reward.description?.toLowerCase().includes(search.toLowerCase())
      const matchesStatus = statusFilter === 'all' ? true : reward.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [rewards, search, statusFilter])

  const filteredRedemptions = useMemo(() => {
    return redemptions.filter((redemption) => {
      const redeemedDate = redemption.redeemedAt ? new Date(redemption.redeemedAt) : null
      const matchesSearch =
        !redemptionSearch ||
        redemption.rewardName.toLowerCase().includes(redemptionSearch.toLowerCase()) ||
        redemption.userName.toLowerCase().includes(redemptionSearch.toLowerCase()) ||
        String(redemption.memberId || '').toLowerCase().includes(redemptionSearch.toLowerCase())
      const matchesStatus = redemptionStatus === 'all' ? true : redemption.status === redemptionStatus
      const matchesDate =
        !redemptionDate ||
        (redeemedDate && !Number.isNaN(redeemedDate.getTime()) && redeemedDate.toISOString().slice(0, 10) === redemptionDate)
      return matchesSearch && matchesStatus && matchesDate
    })
  }, [redemptionDate, redemptionSearch, redemptionStatus, redemptions])

  useEffect(() => {
    let mounted = true

    async function loadData() {
      setIsLoading(true)
      setIsRedemptionLoading(true)
      try {
        const [rewardsRes, merchantsRes, meRes, redemptionsRes] = await Promise.all([
          api.get('/admin/rewards'),
          api.get('/admin/merchants?status=approved'),
          api.get('/auth/me'),
          api.get('/admin/rewards/redemptions'),
        ])

        if (!mounted) return

        const nextRewards = rewardsRes.data.rewards || rewardsRes.data || []
        const nextMerchants = merchantsRes.data.merchants || merchantsRes.data || []
        setRewards(nextRewards)
        setMerchants(nextMerchants)
        setRedemptions(redemptionsRes.data.redemptions || [])
        setAdminRole(meRes.data?.role || window.localStorage.getItem('kk-admin-role') || 'admin')
        setSelectedRewardId((current) => current || nextRewards[0]?.id || null)
      } catch {
        if (!mounted) return
        setRewards([])
        setMerchants([])
        setRedemptions([])
      } finally {
        if (mounted) {
          setIsLoading(false)
          setIsRedemptionLoading(false)
        }
      }
    }

    loadData()
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    if (!selectedReward) {
      setForm(emptyRewardForm)
      return
    }

    setForm({
      title: selectedReward.title || '',
      description: selectedReward.description || '',
      imageUrl: selectedReward.imageUrl || '',
      points: String(selectedReward.points || 0),
      category: selectedReward.category || 'food',
      merchantId: selectedReward.merchantId || '',
      stock:
        selectedReward.stock == null
          ? '0'
          : String(selectedReward.stock),
      unlimitedStock: Boolean(selectedReward.unlimitedStock),
      expiryDate: selectedReward.expiryDate ? String(selectedReward.expiryDate).slice(0, 10) : '',
      isActive: selectedReward.isActive !== false && selectedReward.status !== 'inactive',
      validDays: String(selectedReward.validDays || 30),
    })
  }, [selectedReward])

  async function refreshRewards(preferredId?: string | null) {
    const [rewardsRes, redemptionsRes] = await Promise.all([
      api.get('/admin/rewards'),
      api.get('/admin/rewards/redemptions'),
    ])
    const nextRewards = rewardsRes.data.rewards || rewardsRes.data || []
    setRewards(nextRewards)
    setRedemptions(redemptionsRes.data.redemptions || [])
    setSelectedRewardId(preferredId || nextRewards[0]?.id || null)
  }

  async function handleSaveReward(mode: 'create' | 'update') {
    if (!isSuperadmin) return

    setIsSaving(true)
    setMessage('')

    try {
      const payload = {
        title: form.title,
        description: form.description,
        imageUrl: form.imageUrl || '',
        points: Number(form.points || 0),
        category: form.category,
        merchantId: form.merchantId,
        stock: form.unlimitedStock ? null : Number(form.stock || 0),
        unlimitedStock: form.unlimitedStock,
        expiryDate: form.expiryDate || null,
        isActive: form.isActive,
        validDays: Number(form.validDays || 30),
      }

      if (mode === 'create') {
        const res = await api.post('/admin/rewards', payload)
        setMessage('Reward created successfully.')
        await refreshRewards(res.data.id)
      } else if (selectedReward) {
        await api.patch(`/admin/rewards/${selectedReward.id}`, payload)
        setMessage('Reward updated successfully.')
        await refreshRewards(selectedReward.id)
      }
    } catch (error: any) {
      setMessage(error?.response?.data?.error || 'We could not save the reward right now.')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleClaimRedemption(redemption: Redemption) {
    setIsSaving(true)
    setMessage('')

    try {
      await api.patch(`/admin/rewards/redemptions/${redemption.id}/claim`)
      setMessage('Redemption marked as claimed.')
      await refreshRewards(selectedReward?.id || null)
    } catch (error: any) {
      setMessage(error?.response?.data?.error || 'Failed to update redemption status.')
    } finally {
      setIsSaving(false)
    }
  }

  const catalogueCounts = {
    active: rewards.filter((reward) => reward.status === 'active').length,
    inactive: rewards.filter((reward) => reward.status === 'inactive').length,
    expired: rewards.filter((reward) => reward.status === 'expired').length,
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Rewards Management</h1>
          <p className="mt-1 text-sm text-gray-500">
            Superadmin-led reward catalogue control plus redemption tracking and claim management.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <RewardSummary label="Active Rewards" value={catalogueCounts.active} tone="blue" />
          <RewardSummary label="Inactive Rewards" value={catalogueCounts.inactive} tone="slate" />
          <RewardSummary label="Expired Rewards" value={catalogueCounts.expired} tone="amber" />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {([
          { id: 'catalogue', label: 'Rewards Catalogue' },
          { id: 'redemptions', label: 'Redemption Log' },
        ] as const).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
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

      {message ? (
        <div
          className={cn(
            'rounded-xl border px-4 py-3 text-sm',
            message.toLowerCase().includes('failed') || message.toLowerCase().includes('could not')
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-green-200 bg-green-50 text-green-700'
          )}
        >
          {message}
        </div>
      ) : null}

      {activeTab === 'catalogue' ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
          <section className="space-y-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="grid gap-3 md:grid-cols-[1.4fr_0.8fr]">
              <SearchField value={search} onChange={setSearch} placeholder="Search reward or merchant" />
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="expired">Expired</option>
              </select>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-16">
                <Spinner size="lg" />
              </div>
            ) : filteredRewards.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-200 px-6 py-16 text-center text-sm text-gray-400">
                No rewards matched the current filters.
              </div>
            ) : (
              <div className="grid gap-3">
                {filteredRewards.map((reward) => {
                  const isSelected = selectedReward?.id === reward.id
                  return (
                    <button
                      key={reward.id}
                      type="button"
                      onClick={() => setSelectedRewardId(reward.id)}
                      className={cn(
                        'rounded-2xl border px-4 py-4 text-left transition',
                        isSelected
                          ? 'border-blue-500 bg-blue-50 shadow-[0_14px_26px_rgba(37,99,235,0.12)]'
                          : 'border-gray-100 bg-white hover:border-blue-200 hover:bg-blue-50/40'
                      )}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-lg font-black text-gray-900">{reward.title}</p>
                          <p className="mt-1 text-sm text-gray-500">{reward.description || 'No reward description yet'}</p>
                        </div>
                        <RewardStatusPill status={reward.status || 'inactive'} />
                      </div>
                      <div className="mt-3 grid gap-2 text-sm text-gray-600 md:grid-cols-3">
                        <span>Merchant: {reward.merchantName || 'Unassigned'}</span>
                        <span>Cost: {Number(reward.points || 0).toLocaleString()} pts</span>
                        <span>
                          Stock:{' '}
                          {reward.unlimitedStock ? 'Unlimited' : reward.stock == null ? '—' : reward.stock.toLocaleString()}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </section>

          <aside className="space-y-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-500">Catalogue Control</p>
                <h2 className="mt-1 text-xl font-black text-gray-900">
                  {selectedReward ? 'Edit Reward' : 'Create Reward'}
                </h2>
              </div>
              {!isSuperadmin ? (
                <span className="rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-700">
                  Superadmin only
                </span>
              ) : null}
            </div>

            <div className="space-y-3">
              <FieldLabel label="Title" />
              <input
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                className={inputClass}
                placeholder="Reward title"
              />

              <FieldLabel label="Description" />
              <textarea
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                rows={3}
                className={inputClass}
                placeholder="What the youth member will receive"
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <FieldLabel label="Points Cost" />
                  <input
                    type="number"
                    min="1"
                    value={form.points}
                    onChange={(event) => setForm((current) => ({ ...current, points: event.target.value }))}
                    className={inputClass}
                  />
                </div>
                <div>
                  <FieldLabel label="Category" />
                  <select
                    value={form.category}
                    onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
                    className={inputClass}
                  >
                    <option value="food">Food</option>
                    <option value="services">Services</option>
                    <option value="others">Others</option>
                  </select>
                </div>
              </div>

              <div>
                <FieldLabel label="Merchant" />
                <select
                  value={form.merchantId}
                  onChange={(event) => setForm((current) => ({ ...current, merchantId: event.target.value }))}
                  className={inputClass}
                >
                  <option value="">Select merchant</option>
                  {merchants.map((merchant) => (
                    <option key={merchant.id} value={merchant.id}>
                      {merchant.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <FieldLabel label="Expiry Date" />
                  <input
                    type="date"
                    value={form.expiryDate}
                    onChange={(event) => setForm((current) => ({ ...current, expiryDate: event.target.value }))}
                    className={inputClass}
                  />
                </div>
                <div>
                  <FieldLabel label="Valid Days" />
                  <input
                    type="number"
                    min="1"
                    value={form.validDays}
                    onChange={(event) => setForm((current) => ({ ...current, validDays: event.target.value }))}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                <div>
                  <FieldLabel label="Stock" />
                  <input
                    type="number"
                    min="0"
                    value={form.stock}
                    onChange={(event) => setForm((current) => ({ ...current, stock: event.target.value }))}
                    disabled={form.unlimitedStock}
                    className={cn(inputClass, form.unlimitedStock && 'bg-gray-100 text-gray-400')}
                  />
                </div>
                <label className="mt-7 inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={form.unlimitedStock}
                    onChange={(event) => setForm((current) => ({ ...current, unlimitedStock: event.target.checked }))}
                  />
                  Unlimited
                </label>
              </div>

              <div>
                <FieldLabel label="Image URL" />
                <input
                  value={form.imageUrl}
                  onChange={(event) => setForm((current) => ({ ...current, imageUrl: event.target.value }))}
                  className={inputClass}
                  placeholder="https://..."
                />
              </div>

              <div className="flex items-center gap-2">
                <label className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))}
                  />
                  Active
                </label>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                disabled={!isSuperadmin || isSaving}
                onClick={() => void handleSaveReward('create')}
                className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Create Reward
              </button>
              <button
                type="button"
                disabled={!isSuperadmin || isSaving || !selectedReward}
                onClick={() => void handleSaveReward('update')}
                className="rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Update Reward
              </button>
            </div>
          </aside>
        </div>
      ) : (
        <section className="space-y-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="grid gap-3 md:grid-cols-[1.5fr_0.8fr_0.8fr]">
            <SearchField value={redemptionSearch} onChange={setRedemptionSearch} placeholder="Search reward, user, or member ID" />
            <select
              value={redemptionStatus}
              onChange={(event) => setRedemptionStatus(event.target.value)}
              className={inputClass}
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="claimed">Claimed</option>
              <option value="expired">Expired</option>
            </select>
            <input
              type="date"
              value={redemptionDate}
              onChange={(event) => setRedemptionDate(event.target.value)}
              className={inputClass}
            />
          </div>

          {isRedemptionLoading ? (
            <div className="flex justify-center py-16">
              <Spinner size="lg" />
            </div>
          ) : filteredRedemptions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 px-6 py-16 text-center text-sm text-gray-400">
              No redemptions match the current filters.
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-gray-100">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px]">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Reward</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Member</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Points</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Status</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Redeemed</th>
                      <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredRedemptions.map((redemption) => (
                      <tr key={redemption.id} className="hover:bg-gray-50">
                        <td className="px-5 py-4">
                          <p className="text-sm font-semibold text-gray-900">{redemption.rewardName}</p>
                          <p className="text-xs text-gray-500">{redemption.rewardId || 'No reward ID'}</p>
                        </td>
                        <td className="px-5 py-4">
                          <p className="text-sm font-medium text-gray-900">{redemption.userName}</p>
                          <p className="text-xs text-gray-500">{redemption.memberId || redemption.userEmail || 'No member ID'}</p>
                        </td>
                        <td className="px-5 py-4 text-sm font-semibold text-blue-700">
                          {redemption.pointsCost.toLocaleString()} pts
                        </td>
                        <td className="px-5 py-4">
                          <RedemptionStatusPill status={redemption.status} />
                        </td>
                        <td className="px-5 py-4 text-sm text-gray-500">
                          {redemption.redeemedAt ? new Date(redemption.redeemedAt).toLocaleString('en-PH') : '—'}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => void handleClaimRedemption(redemption)}
                            disabled={isSaving || redemption.status !== 'active'}
                            className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Mark Claimed
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  )
}

function RewardSummary({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: 'blue' | 'slate' | 'amber'
}) {
  const tones = {
    blue: 'bg-blue-50 text-blue-700',
    slate: 'bg-slate-100 text-slate-700',
    amber: 'bg-amber-50 text-amber-700',
  }

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

function SearchField({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
}) {
  return (
    <div className="relative">
      <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m21 21-4.35-4.35M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14Z" />
      </svg>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
      />
    </div>
  )
}

function FieldLabel({ label }: { label: string }) {
  return <label className="mb-1 block text-sm font-semibold text-gray-700">{label}</label>
}

function RewardStatusPill({ status }: { status: string }) {
  const tones = {
    active: 'bg-emerald-100 text-emerald-700',
    inactive: 'bg-slate-200 text-slate-700',
    expired: 'bg-amber-100 text-amber-700',
  }

  return (
    <span className={cn('rounded-full px-2.5 py-1 text-xs font-semibold', tones[status as keyof typeof tones] || 'bg-gray-100 text-gray-700')}>
      {status}
    </span>
  )
}

function RedemptionStatusPill({ status }: { status: string }) {
  const tones = {
    active: 'bg-blue-100 text-blue-700',
    claimed: 'bg-emerald-100 text-emerald-700',
    expired: 'bg-amber-100 text-amber-700',
  }

  return (
    <span className={cn('rounded-full px-2.5 py-1 text-xs font-semibold', tones[status as keyof typeof tones] || 'bg-gray-100 text-gray-700')}>
      {status}
    </span>
  )
}

const inputClass =
  'w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20'
