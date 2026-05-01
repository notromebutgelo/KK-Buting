'use client'

import { useEffect, useMemo, useState } from 'react'
import api from '@/lib/api'
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

interface MerchantOption { id: string; name: string }

const emptyRewardForm = {
  title: '', description: '', imageUrl: '', points: '100', category: 'food',
  merchantId: '', stock: '0', unlimitedStock: true, expiryDate: '', isActive: true, validDays: '30',
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
  const selectedReward = rewards.find((r) => r.id === selectedRewardId) || rewards[0] || null

  const filteredRewards = useMemo(() => rewards.filter((r) => {
    const matchesSearch = !search || r.title?.toLowerCase().includes(search.toLowerCase()) || r.merchantName?.toLowerCase().includes(search.toLowerCase()) || r.description?.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter
    return matchesSearch && matchesStatus
  }), [rewards, search, statusFilter])

  const filteredRedemptions = useMemo(() => redemptions.filter((r) => {
    const redeemedDate = r.redeemedAt ? new Date(r.redeemedAt) : null
    const matchesSearch = !redemptionSearch || r.rewardName.toLowerCase().includes(redemptionSearch.toLowerCase()) || r.userName.toLowerCase().includes(redemptionSearch.toLowerCase()) || String(r.memberId || '').toLowerCase().includes(redemptionSearch.toLowerCase())
    const matchesStatus = redemptionStatus === 'all' || r.status === redemptionStatus
    const matchesDate = !redemptionDate || (redeemedDate && !Number.isNaN(redeemedDate.getTime()) && redeemedDate.toISOString().slice(0, 10) === redemptionDate)
    return matchesSearch && matchesStatus && matchesDate
  }), [redemptionDate, redemptionSearch, redemptionStatus, redemptions])

  useEffect(() => {
    let mounted = true
    async function loadData() {
      setIsLoading(true); setIsRedemptionLoading(true)
      try {
        const [rewardsRes, merchantsRes, meRes, redemptionsRes] = await Promise.all([api.get('/admin/rewards'), api.get('/admin/merchants?status=approved'), api.get('/auth/me'), api.get('/admin/rewards/redemptions')])
        if (!mounted) return
        const nextRewards = rewardsRes.data.rewards || rewardsRes.data || []
        setRewards(nextRewards); setMerchants(merchantsRes.data.merchants || merchantsRes.data || [])
        setRedemptions(redemptionsRes.data.redemptions || [])
        setAdminRole(meRes.data?.role || window.localStorage.getItem('kk-admin-role') || 'admin')
        setSelectedRewardId((cur) => cur || nextRewards[0]?.id || null)
      } catch { if (!mounted) return; setRewards([]); setMerchants([]); setRedemptions([]) }
      finally { if (mounted) { setIsLoading(false); setIsRedemptionLoading(false) } }
    }
    loadData()
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    if (!selectedReward) { setForm(emptyRewardForm); return }
    setForm({ title: selectedReward.title || '', description: selectedReward.description || '', imageUrl: selectedReward.imageUrl || '', points: String(selectedReward.points || 0), category: selectedReward.category || 'food', merchantId: selectedReward.merchantId || '', stock: selectedReward.stock == null ? '0' : String(selectedReward.stock), unlimitedStock: Boolean(selectedReward.unlimitedStock), expiryDate: selectedReward.expiryDate ? String(selectedReward.expiryDate).slice(0, 10) : '', isActive: selectedReward.isActive !== false && selectedReward.status !== 'inactive', validDays: String(selectedReward.validDays || 30) })
  }, [selectedReward])

  async function refreshRewards(preferredId?: string | null) {
    const [rewardsRes, redemptionsRes] = await Promise.all([api.get('/admin/rewards'), api.get('/admin/rewards/redemptions')])
    const nextRewards = rewardsRes.data.rewards || rewardsRes.data || []
    setRewards(nextRewards); setRedemptions(redemptionsRes.data.redemptions || [])
    setSelectedRewardId(preferredId || nextRewards[0]?.id || null)
  }

  async function handleSaveReward(mode: 'create' | 'update') {
    if (!isSuperadmin) return
    setIsSaving(true); setMessage('')
    try {
      const payload = { title: form.title, description: form.description, imageUrl: form.imageUrl || '', points: Number(form.points || 0), category: form.category, merchantId: form.merchantId, stock: form.unlimitedStock ? null : Number(form.stock || 0), unlimitedStock: form.unlimitedStock, expiryDate: form.expiryDate || null, isActive: form.isActive, validDays: Number(form.validDays || 30) }
      if (mode === 'create') { const res = await api.post('/admin/rewards', payload); setMessage('Reward created successfully.'); await refreshRewards(res.data.id) }
      else if (selectedReward) { await api.patch(`/admin/rewards/${selectedReward.id}`, payload); setMessage('Reward updated successfully.'); await refreshRewards(selectedReward.id) }
    } catch (error: any) { setMessage(error?.response?.data?.error || 'We could not save the reward right now.') }
    finally { setIsSaving(false) }
  }

  async function handleClaimRedemption(redemption: Redemption) {
    setIsSaving(true); setMessage('')
    try {
      await api.patch(`/admin/rewards/redemptions/${redemption.id}/claim`)
      setMessage('Redemption marked as claimed.')
      await refreshRewards(selectedReward?.id || null)
    } catch (error: any) { setMessage(error?.response?.data?.error || 'Failed to update redemption status.') }
    finally { setIsSaving(false) }
  }

  const catalogueCounts = { active: rewards.filter((r) => r.status === 'active').length, inactive: rewards.filter((r) => r.status === 'inactive').length, expired: rewards.filter((r) => r.status === 'expired').length }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--ink)' }}>Rewards Management</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>Superadmin-led reward catalogue control plus redemption tracking and claim management.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <RewardSummary label="Active" value={catalogueCounts.active} tone="success" />
          <RewardSummary label="Inactive" value={catalogueCounts.inactive} tone="default" />
          <RewardSummary label="Expired" value={catalogueCounts.expired} tone="warning" />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {([{ id: 'catalogue', label: 'Rewards Catalogue' }, { id: 'redemptions', label: 'Redemption Log' }] as const).map((tab) => (
          <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className="rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors"
            style={activeTab === tab.id ? { background: 'var(--accent)', color: '#fff' } : { border: '1px solid var(--stroke)', background: 'var(--card)', color: 'var(--ink-soft)' }}>
            {tab.label}
          </button>
        ))}
      </div>

      {message && (
        <div className={cn('rounded-xl border px-4 py-3 text-sm', message.toLowerCase().includes('failed') || message.toLowerCase().includes('could not') ? 'border-red-200 bg-red-50 text-red-700' : 'border-green-200 bg-green-50 text-green-700')}>
          {message}
        </div>
      )}

      {activeTab === 'catalogue' ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
          <section className="admin-panel flex flex-col gap-4">
            <div className="grid gap-3 md:grid-cols-[1.4fr_0.8fr]">
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search reward or merchant" className="surface-input rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[color:var(--accent)]/30" />
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="surface-input bg-transparent rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[color:var(--accent)]/30">
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="expired">Expired</option>
              </select>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-16"><div className="h-6 w-6 animate-spin rounded-full border-2 border-[color:var(--accent)] border-t-transparent" /></div>
            ) : filteredRewards.length === 0 ? (
              <div className="rounded-xl border border-dashed px-6 py-16 text-center text-sm" style={{ borderColor: 'var(--stroke)', color: 'var(--muted)' }}>No rewards matched the current filters.</div>
            ) : (
              <div className="flex flex-col gap-3">
                {filteredRewards.map((reward) => {
                  const isSelected = selectedReward?.id === reward.id
                  return (
                    <button key={reward.id} type="button" onClick={() => setSelectedRewardId(reward.id)}
                      className="rounded-[var(--radius-md)] border p-4 text-left transition-all duration-200 hover:-translate-y-0.5"
                      style={{ borderColor: isSelected ? 'var(--accent)' : 'var(--stroke)', background: isSelected ? 'var(--accent-soft)' : 'var(--card)', boxShadow: isSelected ? 'var(--shadow-sm)' : 'none' }}>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-bold text-sm" style={{ color: 'var(--ink)' }}>{reward.title}</p>
                          <p className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>{reward.description || 'No description'}</p>
                        </div>
                        <RewardStatusPill status={reward.status || 'inactive'} />
                      </div>
                      <div className="mt-3 grid gap-1 text-xs md:grid-cols-3" style={{ color: 'var(--ink-soft)' }}>
                        <span>Merchant: {reward.merchantName || 'Unassigned'}</span>
                        <span>Cost: {Number(reward.points || 0).toLocaleString()} pts</span>
                        <span>Stock: {reward.unlimitedStock ? 'Unlimited' : reward.stock == null ? '—' : reward.stock.toLocaleString()}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </section>

          <aside className="admin-panel flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--accent-strong)' }}>Catalogue Control</p>
                <h2 className="mt-1 text-lg font-bold" style={{ color: 'var(--ink)' }}>{selectedReward ? 'Edit Reward' : 'Create Reward'}</h2>
              </div>
              {!isSuperadmin && <span className="rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-700">Superadmin only</span>}
            </div>

            <div className="flex flex-col gap-3">
              <FieldLabel label="Title" /><input value={form.title} onChange={(e) => setForm((c) => ({ ...c, title: e.target.value }))} className={inputClass} placeholder="Reward title" />
              <FieldLabel label="Description" /><textarea value={form.description} onChange={(e) => setForm((c) => ({ ...c, description: e.target.value }))} rows={3} className={inputClass} placeholder="What the youth member will receive" />
              <div className="grid gap-3 sm:grid-cols-2">
                <div><FieldLabel label="Points Cost" /><input type="number" min="1" value={form.points} onChange={(e) => setForm((c) => ({ ...c, points: e.target.value }))} className={inputClass} /></div>
                <div><FieldLabel label="Category" /><select value={form.category} onChange={(e) => setForm((c) => ({ ...c, category: e.target.value }))} className={inputClass}><option value="food">Food</option><option value="services">Services</option><option value="others">Others</option></select></div>
              </div>
              <div><FieldLabel label="Merchant" /><select value={form.merchantId} onChange={(e) => setForm((c) => ({ ...c, merchantId: e.target.value }))} className={inputClass}><option value="">Select merchant</option>{merchants.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div><FieldLabel label="Expiry Date" /><input type="date" value={form.expiryDate} onChange={(e) => setForm((c) => ({ ...c, expiryDate: e.target.value }))} className={inputClass} /></div>
                <div><FieldLabel label="Valid Days" /><input type="number" min="1" value={form.validDays} onChange={(e) => setForm((c) => ({ ...c, validDays: e.target.value }))} className={inputClass} /></div>
              </div>
              <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                <div><FieldLabel label="Stock" /><input type="number" min="0" value={form.stock} onChange={(e) => setForm((c) => ({ ...c, stock: e.target.value }))} disabled={form.unlimitedStock} className={cn(inputClass, form.unlimitedStock && 'opacity-40')} /></div>
                <label className="mt-7 inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm" style={{ borderColor: 'var(--stroke)', color: 'var(--ink-soft)' }}><input type="checkbox" checked={form.unlimitedStock} onChange={(e) => setForm((c) => ({ ...c, unlimitedStock: e.target.checked }))} />Unlimited</label>
              </div>
              <div><FieldLabel label="Image URL" /><input value={form.imageUrl} onChange={(e) => setForm((c) => ({ ...c, imageUrl: e.target.value }))} className={inputClass} placeholder="https://..." /></div>
              <label className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm" style={{ borderColor: 'var(--stroke)', color: 'var(--ink-soft)' }}><input type="checkbox" checked={form.isActive} onChange={(e) => setForm((c) => ({ ...c, isActive: e.target.checked }))} />Active</label>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <button type="button" disabled={!isSuperadmin || isSaving} onClick={() => void handleSaveReward('create')} className="rounded-xl py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50" style={{ background: 'var(--accent)' }}>Create Reward</button>
              <button type="button" disabled={!isSuperadmin || isSaving || !selectedReward} onClick={() => void handleSaveReward('update')} className="rounded-xl py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50" style={{ background: 'var(--ink)' }}>Update Reward</button>
            </div>
          </aside>
        </div>
      ) : (
        <section className="admin-panel flex flex-col gap-4">
          <div className="grid gap-3 md:grid-cols-[1.5fr_0.8fr_0.8fr]">
            <input value={redemptionSearch} onChange={(e) => setRedemptionSearch(e.target.value)} placeholder="Search reward, user, or member ID" className={inputClass} />
            <select value={redemptionStatus} onChange={(e) => setRedemptionStatus(e.target.value)} className={inputClass}><option value="all">All statuses</option><option value="active">Active</option><option value="claimed">Claimed</option><option value="expired">Expired</option></select>
            <input type="date" value={redemptionDate} onChange={(e) => setRedemptionDate(e.target.value)} className={inputClass} />
          </div>

          {isRedemptionLoading ? (
            <div className="flex justify-center py-16"><div className="h-6 w-6 animate-spin rounded-full border-2 border-[color:var(--accent)] border-t-transparent" /></div>
          ) : filteredRedemptions.length === 0 ? (
            <div className="rounded-xl border border-dashed px-6 py-16 text-center text-sm" style={{ borderColor: 'var(--stroke)', color: 'var(--muted)' }}>No redemptions match the current filters.</div>
          ) : (
            <div className="overflow-hidden rounded-[var(--radius-md)] border" style={{ borderColor: 'var(--stroke)' }}>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px]">
                  <thead style={{ background: 'var(--accent-soft)' }}>
                    <tr>
                      {['Reward', 'Member', 'Points', 'Status', 'Redeemed', 'Action'].map((h, i) => (
                        <th key={h} className={`px-5 py-3 text-xs font-semibold uppercase tracking-widest ${i === 5 ? 'text-right' : 'text-left'}`} style={{ color: 'var(--muted)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: 'var(--stroke)' }}>
                    {filteredRedemptions.map((redemption) => (
                      <tr key={redemption.id} className="transition-colors" onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--accent-soft)')} onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                        <td className="px-5 py-4"><p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{redemption.rewardName}</p><p className="text-xs" style={{ color: 'var(--muted)' }}>{redemption.rewardId || 'No reward ID'}</p></td>
                        <td className="px-5 py-4"><p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{redemption.userName}</p><p className="text-xs" style={{ color: 'var(--muted)' }}>{redemption.memberId || redemption.userEmail || 'No member ID'}</p></td>
                        <td className="px-5 py-4 text-sm font-semibold" style={{ color: 'var(--accent-strong)' }}>{redemption.pointsCost.toLocaleString()} pts</td>
                        <td className="px-5 py-4"><RedemptionStatusPill status={redemption.status} /></td>
                        <td className="px-5 py-4 text-sm" style={{ color: 'var(--muted)' }}>{redemption.redeemedAt ? new Date(redemption.redeemedAt).toLocaleString('en-PH') : '—'}</td>
                        <td className="px-5 py-4 text-right"><button type="button" onClick={() => void handleClaimRedemption(redemption)} disabled={isSaving || redemption.status !== 'active'} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50">Mark Claimed</button></td>
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

function RewardSummary({ label, value, tone }: { label: string; value: number; tone: 'success' | 'default' | 'warning' }) {
  const styles = { success: 'bg-[color:var(--accent-soft)] text-[color:var(--accent-strong)]', default: 'bg-[color:var(--surface-muted)] text-[color:var(--muted)]', warning: 'bg-amber-50 text-amber-700' }
  return (
    <div className="admin-card">
      <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>{label}</p>
      <div className="mt-3 flex items-center justify-between">
        <p className="text-2xl font-bold" style={{ color: 'var(--ink)' }}>{value}</p>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${styles[tone]}`}>Live</span>
      </div>
    </div>
  )
}

function FieldLabel({ label }: { label: string }) {
  return <label className="mb-1 block text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>{label}</label>
}

function RewardStatusPill({ status }: { status: string }) {
  const tones: Record<string, string> = { active: 'bg-[color:var(--accent-soft)] text-[color:var(--accent-strong)]', inactive: 'bg-[color:var(--surface-muted)] text-[color:var(--muted)]', expired: 'bg-amber-50 text-amber-700' }
  return <span className={cn('rounded-full px-2.5 py-1 text-xs font-semibold', tones[status] || 'bg-[color:var(--surface-muted)] text-[color:var(--muted)]')}>{status}</span>
}

function RedemptionStatusPill({ status }: { status: string }) {
  const tones: Record<string, string> = { active: 'bg-sky-50 text-sky-700', claimed: 'bg-[color:var(--accent-soft)] text-[color:var(--accent-strong)]', expired: 'bg-amber-50 text-amber-700' }
  return <span className={cn('rounded-full px-2.5 py-1 text-xs font-semibold', tones[status] || 'bg-[color:var(--surface-muted)] text-[color:var(--muted)]')}>{status}</span>
}

const inputClass = 'surface-input w-full rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[color:var(--accent)]/30 bg-transparent'
