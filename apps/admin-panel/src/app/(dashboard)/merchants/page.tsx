'use client'

import { useEffect, useMemo, useState } from 'react'
import api from '@/lib/api'
import Spinner from '@/components/ui/Spinner'
import LoadingModal from '@/components/ui/LoadingModal'
import { cn } from '@/utils/cn'

type MerchantStatus = 'pending' | 'approved' | 'rejected' | 'suspended'

interface Merchant {
  id: string
  name: string
  description?: string
  category?: string
  address?: string
  status: MerchantStatus
  ownerId?: string
  ownerEmail?: string
  ownerName?: string
  createdAt?: string
  imageUrl?: string
  logoUrl?: string
  businessInfo?: string
  discountInfo?: string
  termsAndConditions?: string
  pointsRate?: number
}

interface MerchantTransaction {
  id: string
  userName: string
  userEmail?: string | null
  amountSpent?: number | null
  pointsGiven: number
  type: string
  createdAt?: string
}

type MerchantTab = 'applications' | 'directory' | 'transactions'

const statusOptions: Array<{ value: MerchantStatus | 'all'; label: string }> = [
  { value: 'all', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'rejected', label: 'Rejected' },
]

export default function MerchantsPage() {
  const [adminRole, setAdminRole] = useState('admin')
  const [merchants, setMerchants] = useState<Merchant[]>([])
  const [selectedMerchantId, setSelectedMerchantId] = useState<string | null>(null)
  const [transactions, setTransactions] = useState<MerchantTransaction[]>([])
  const [activeTab, setActiveTab] = useState<MerchantTab>('applications')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<MerchantStatus | 'all'>('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [dateJoinedFilter, setDateJoinedFilter] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [loadingLabel, setLoadingLabel] = useState('Updating merchant')
  const [message, setMessage] = useState('')
  const [editor, setEditor] = useState({
    discountInfo: '',
    termsAndConditions: '',
    pointsRate: '10',
  })

  const isSuperadmin = adminRole === 'superadmin'

  const filteredMerchants = useMemo(() => {
    return merchants.filter((merchant) => {
      const joinedDate = merchant.createdAt ? new Date(merchant.createdAt) : null
      const matchesSearch =
        !search ||
        merchant.name?.toLowerCase().includes(search.toLowerCase()) ||
        merchant.ownerName?.toLowerCase().includes(search.toLowerCase()) ||
        merchant.ownerEmail?.toLowerCase().includes(search.toLowerCase()) ||
        merchant.address?.toLowerCase().includes(search.toLowerCase())
      const matchesStatus = statusFilter === 'all' ? true : merchant.status === statusFilter
      const matchesCategory = categoryFilter === 'all' ? true : merchant.category === categoryFilter
      const matchesDate =
        !dateJoinedFilter ||
        (joinedDate && !Number.isNaN(joinedDate.getTime()) && joinedDate.toISOString().slice(0, 10) === dateJoinedFilter)
      const matchesTab =
        activeTab === 'applications'
          ? merchant.status === 'pending'
          : activeTab === 'directory'
            ? merchant.status !== 'pending'
            : true

      return matchesSearch && matchesStatus && matchesCategory && matchesDate && matchesTab
    })
  }, [activeTab, categoryFilter, dateJoinedFilter, merchants, search, statusFilter])

  const selectedMerchant =
    merchants.find((merchant) => merchant.id === selectedMerchantId) ||
    filteredMerchants[0] ||
    null

  const categoryOptions = useMemo(
    () =>
      Array.from(new Set(merchants.map((merchant) => merchant.category).filter(Boolean) as string[])).sort((a, b) =>
        a.localeCompare(b)
      ),
    [merchants]
  )

  useEffect(() => {
    let mounted = true

    async function loadMerchants() {
      setIsLoading(true)
      try {
        const [merchantsRes, meRes] = await Promise.all([
          api.get('/admin/merchants'),
          api.get('/auth/me'),
        ])

        if (!mounted) return

        const nextMerchants = merchantsRes.data.merchants || merchantsRes.data || []
        setMerchants(nextMerchants)
        setAdminRole(meRes.data?.role || window.localStorage.getItem('kk-admin-role') || 'admin')
        setSelectedMerchantId((current) => current || nextMerchants[0]?.id || null)
      } catch {
        if (!mounted) return
        setMerchants([])
      } finally {
        if (mounted) setIsLoading(false)
      }
    }

    loadMerchants()
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    if (!selectedMerchant) {
      setTransactions([])
      return
    }

    setEditor({
      discountInfo: selectedMerchant.discountInfo || '',
      termsAndConditions: selectedMerchant.termsAndConditions || '',
      pointsRate: String(selectedMerchant.pointsRate || 10),
    })

    let mounted = true
    async function loadTransactions() {
      setIsDetailLoading(true)
      try {
        const res = await api.get(`/admin/merchants/${selectedMerchant.id}/transactions`)
        if (mounted) {
          setTransactions(res.data.transactions || [])
        }
      } catch {
        if (mounted) {
          setTransactions([])
        }
      } finally {
        if (mounted) setIsDetailLoading(false)
      }
    }

    void loadTransactions()
    return () => {
      mounted = false
    }
  }, [selectedMerchant])

  async function refreshMerchants(preferredId?: string | null) {
    const res = await api.get('/admin/merchants')
    const nextMerchants = res.data.merchants || res.data || []
    setMerchants(nextMerchants)
    setSelectedMerchantId(preferredId || nextMerchants[0]?.id || null)
  }

  async function handleMerchantAction(action: 'approve' | 'reject' | 'suspend' | 'reactivate') {
    if (!selectedMerchant) return

    setLoadingLabel(
      action === 'approve'
        ? 'Approving merchant'
        : action === 'reactivate'
          ? 'Reactivating merchant'
          : action === 'suspend'
            ? 'Suspending merchant'
            : 'Rejecting merchant'
    )
    setIsSaving(true)
    setMessage('')

    try {
      if (action === 'approve') {
        await api.patch(`/admin/merchants/${selectedMerchant.id}/approve`)
      } else if (action === 'reactivate') {
        await api.patch(`/admin/merchants/${selectedMerchant.id}/status`, { status: 'approved' })
      } else if (action === 'suspend') {
        await api.patch(`/admin/merchants/${selectedMerchant.id}/status`, { status: 'suspended' })
      } else {
        await api.patch(`/admin/merchants/${selectedMerchant.id}/status`, { status: 'rejected' })
      }

      setMessage(
        action === 'approve'
          ? 'Merchant approved successfully.'
          : action === 'reactivate'
            ? 'Merchant reactivated successfully.'
            : action === 'suspend'
              ? 'Merchant suspended successfully.'
              : 'Merchant rejected successfully.'
      )
      await refreshMerchants(selectedMerchant.id)
    } catch (error: any) {
      setMessage(error?.response?.data?.error || 'We could not update the merchant right now.')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleSaveMerchantProfile() {
    if (!selectedMerchant) return

    setLoadingLabel('Saving merchant profile')
    setIsSaving(true)
    setMessage('')

    try {
      await api.patch(`/admin/merchants/${selectedMerchant.id}`, {
        discountInfo: editor.discountInfo,
        termsAndConditions: editor.termsAndConditions,
        pointsRate: Number(editor.pointsRate || 10),
      })
      setMessage('Merchant profile updated successfully.')
      await refreshMerchants(selectedMerchant.id)
    } catch (error: any) {
      setMessage(error?.response?.data?.error || 'Failed to update merchant details.')
    } finally {
      setIsSaving(false)
    }
  }

  const counts = {
    applications: merchants.filter((merchant) => merchant.status === 'pending').length,
    directory: merchants.filter((merchant) => merchant.status !== 'pending').length,
    transactions: transactions.length,
  }

  return (
    <>
      <LoadingModal
        open={isSaving}
        title={loadingLabel}
        description="Please wait while the merchant record and related dashboard data are updated."
      />
      <div className="space-y-6">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Merchant Management</h1>
          <p className="mt-1 text-sm text-gray-500">
            Partner shop lifecycle from application review through points-issuing status management.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <SummaryCard label="Applications Queue" value={counts.applications} accent="yellow" />
          <SummaryCard label="Active / In Directory" value={counts.directory} accent="blue" />
          <SummaryCard label="Transaction Logs" value={counts.transactions} accent="green" />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {([
          { id: 'applications', label: 'Applications Queue' },
          { id: 'directory', label: 'Merchant Directory' },
          { id: 'transactions', label: 'Transaction History' },
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

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.8fr)]">
        <section className="space-y-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <SearchInput value={search} onChange={setSearch} placeholder="Search merchant, owner, or address" />
            <SelectField value={statusFilter} onChange={(value) => setStatusFilter(value as MerchantStatus | 'all')}>
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </SelectField>
            <SelectField value={categoryFilter} onChange={setCategoryFilter}>
              <option value="all">All Categories</option>
              {categoryOptions.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </SelectField>
            <input
              type="date"
              value={dateJoinedFilter}
              onChange={(event) => setDateJoinedFilter(event.target.value)}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {isLoading ? (
            <div className="flex justify-center py-16">
              <Spinner size="lg" />
            </div>
          ) : filteredMerchants.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 px-6 py-16 text-center text-sm text-gray-400">
              No merchants match the current filters.
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-gray-100">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px]">
                  <thead className="bg-gray-50">
                    <tr>
                      <HeaderCell>Merchant</HeaderCell>
                      <HeaderCell>Category</HeaderCell>
                      <HeaderCell>Status</HeaderCell>
                      <HeaderCell>Owner</HeaderCell>
                      <HeaderCell>Date Joined</HeaderCell>
                      <HeaderCell align="right">Points Rate</HeaderCell>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredMerchants.map((merchant) => {
                      const isSelected = selectedMerchant?.id === merchant.id
                      return (
                        <tr
                          key={merchant.id}
                          onClick={() => setSelectedMerchantId(merchant.id)}
                          className={cn(
                            'cursor-pointer transition-colors hover:bg-blue-50/50',
                            isSelected && 'bg-blue-50'
                          )}
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-gray-100">
                                {merchant.logoUrl || merchant.imageUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={merchant.logoUrl || merchant.imageUrl}
                                    alt={merchant.name}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <span className="text-sm font-black text-gray-500">
                                    {getInitials(merchant.name)}
                                  </span>
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-gray-900">{merchant.name}</p>
                                <p className="truncate text-xs text-gray-500">
                                  {merchant.description || 'No business description yet'}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-sm text-gray-600">{merchant.category || 'Uncategorized'}</td>
                          <td className="px-5 py-4">
                            <StatusPill status={merchant.status} />
                          </td>
                          <td className="px-5 py-4 text-sm text-gray-600">
                            <p>{merchant.ownerName || 'Unknown owner'}</p>
                            <p className="text-xs text-gray-400">{merchant.ownerEmail || 'No email saved'}</p>
                          </td>
                          <td className="px-5 py-4 text-sm text-gray-500">
                            {merchant.createdAt ? new Date(merchant.createdAt).toLocaleDateString('en-PH') : '—'}
                          </td>
                          <td className="px-5 py-4 text-right text-sm font-semibold text-blue-700">
                            ₱{Number(merchant.pointsRate || 10).toLocaleString()} = 1 pt
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        <aside className="space-y-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          {selectedMerchant ? (
            <>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-500">Merchant Profile</p>
                  <h2 className="mt-1 text-xl font-black text-gray-900">{selectedMerchant.name}</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    {selectedMerchant.address || 'Address not provided'}
                  </p>
                </div>
                <StatusPill status={selectedMerchant.status} />
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

              <div className="grid gap-3 rounded-2xl bg-gray-50 p-4 text-sm text-gray-600">
                <DetailRow label="Business Category" value={selectedMerchant.category || 'Uncategorized'} />
                <DetailRow label="Owner" value={selectedMerchant.ownerName || 'Unknown owner'} />
                <DetailRow label="Email" value={selectedMerchant.ownerEmail || 'No owner email'} />
                <DetailRow
                  label="Date Joined"
                  value={selectedMerchant.createdAt ? new Date(selectedMerchant.createdAt).toLocaleString('en-PH') : '—'}
                />
                <DetailRow label="Business Info" value={selectedMerchant.businessInfo || selectedMerchant.description || 'No business info yet'} />
              </div>

              <div className="space-y-3 rounded-2xl border border-gray-100 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">Discount & Terms</h3>
                    <p className="text-xs text-gray-500">Admin can update these on behalf of the merchant.</p>
                  </div>
                  {!isSuperadmin ? (
                    <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
                      Admin access
                    </span>
                  ) : (
                    <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                      Superadmin access
                    </span>
                  )}
                </div>

                <textarea
                  value={editor.discountInfo}
                  onChange={(event) => setEditor((current) => ({ ...current, discountInfo: event.target.value }))}
                  rows={3}
                  placeholder="Discount information for youth members"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                <textarea
                  value={editor.termsAndConditions}
                  onChange={(event) => setEditor((current) => ({ ...current, termsAndConditions: event.target.value }))}
                  rows={4}
                  placeholder="Terms and conditions shown to the merchant and youth members"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                  <input
                    type="number"
                    min="1"
                    value={editor.pointsRate}
                    onChange={(event) => setEditor((current) => ({ ...current, pointsRate: event.target.value }))}
                    className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    placeholder="Points rate in pesos"
                  />
                  <button
                    type="button"
                    onClick={() => void handleSaveMerchantProfile()}
                    disabled={isSaving}
                    className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(37,99,235,0.16)] transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Save Details
                  </button>
                </div>
                <p className="text-xs text-gray-500">Default conversion is ₱100 = 10 points.</p>
              </div>

              <div className="space-y-3 rounded-2xl border border-gray-100 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">Lifecycle Actions</h3>
                    <p className="text-xs text-gray-500">Approval, rejection, suspension, and reactivation controls.</p>
                  </div>
                  {!isSuperadmin ? (
                    <span className="rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-700">
                      Superadmin only
                    </span>
                  ) : null}
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <ActionButton
                    label="Approve Merchant"
                    tone="green"
                    disabled={!isSuperadmin || selectedMerchant.status === 'approved' || isSaving}
                    onClick={() => void handleMerchantAction('approve')}
                  />
                  <ActionButton
                    label="Reject Merchant"
                    tone="red"
                    disabled={!isSuperadmin || selectedMerchant.status === 'rejected' || isSaving}
                    onClick={() => void handleMerchantAction('reject')}
                  />
                  <ActionButton
                    label="Suspend Merchant"
                    tone="amber"
                    disabled={!isSuperadmin || selectedMerchant.status !== 'approved' || isSaving}
                    onClick={() => void handleMerchantAction('suspend')}
                  />
                  <ActionButton
                    label="Reactivate Merchant"
                    tone="blue"
                    disabled={!isSuperadmin || selectedMerchant.status !== 'suspended' || isSaving}
                    onClick={() => void handleMerchantAction('reactivate')}
                  />
                </div>
              </div>

              <div className="space-y-3 rounded-2xl border border-gray-100 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">Transaction History</h3>
                    <p className="text-xs text-gray-500">Every points-awarding QR scan recorded for this merchant.</p>
                  </div>
                  <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-600">
                    {transactions.length} records
                  </span>
                </div>

                {isDetailLoading ? (
                  <div className="flex justify-center py-10">
                    <Spinner size="md" />
                  </div>
                ) : transactions.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-gray-200 px-4 py-10 text-center text-sm text-gray-400">
                    No merchant transactions found yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {transactions.slice(0, 8).map((transaction) => (
                      <div key={transaction.id} className="rounded-xl bg-gray-50 px-4 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{transaction.userName}</p>
                            <p className="text-xs text-gray-500">{transaction.userEmail || 'No email saved'}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-blue-700">+{transaction.pointsGiven} pts</p>
                            <p className="text-xs text-gray-500">
                              {transaction.createdAt ? new Date(transaction.createdAt).toLocaleString('en-PH') : '—'}
                            </p>
                          </div>
                        </div>
                        <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                          <span>Type: {transaction.type}</span>
                          <span>
                            Amount:{' '}
                            {transaction.amountSpent != null ? `₱${Number(transaction.amountSpent).toLocaleString()}` : 'Not captured'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex min-h-[420px] items-center justify-center rounded-2xl border border-dashed border-gray-200 text-center text-sm text-gray-400">
              Select a merchant to review their profile, actions, and transaction history.
            </div>
          )}
        </aside>
      </div>
      </div>
    </>
  )
}

function SummaryCard({
  label,
  value,
  accent,
}: {
  label: string
  value: number
  accent: 'yellow' | 'blue' | 'green'
}) {
  const accentClasses = {
    yellow: 'bg-amber-50 text-amber-700',
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-emerald-50 text-emerald-700',
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">{label}</p>
      <div className="mt-3 flex items-center justify-between">
        <p className="text-2xl font-black text-gray-900">{value}</p>
        <span className={cn('rounded-full px-2.5 py-1 text-[11px] font-semibold', accentClasses[accent])}>
          Live
        </span>
      </div>
    </div>
  )
}

function SearchInput({
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
      <svg
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m21 21-4.35-4.35M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14Z" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
      />
    </div>
  )
}

function SelectField({
  value,
  onChange,
  children,
}: {
  value: string
  onChange: (value: string) => void
  children: React.ReactNode
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
    >
      {children}
    </select>
  )
}

function HeaderCell({
  children,
  align = 'left',
}: {
  children: React.ReactNode
  align?: 'left' | 'right'
}) {
  return (
    <th
      className={cn(
        'px-5 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-gray-500',
        align === 'right' ? 'text-right' : 'text-left'
      )}
    >
      {children}
    </th>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">{label}</span>
      <span className="max-w-[220px] text-right text-sm font-medium text-gray-700">{value}</span>
    </div>
  )
}

function StatusPill({ status }: { status: MerchantStatus }) {
  const classes = {
    pending: 'bg-amber-100 text-amber-700',
    approved: 'bg-emerald-100 text-emerald-700',
    rejected: 'bg-rose-100 text-rose-700',
    suspended: 'bg-slate-200 text-slate-700',
  }
  const labels = {
    pending: 'Pending',
    approved: 'Active',
    rejected: 'Rejected',
    suspended: 'Suspended',
  }

  return (
    <span className={cn('rounded-full px-2.5 py-1 text-xs font-semibold', classes[status])}>
      {labels[status]}
    </span>
  )
}

function ActionButton({
  label,
  tone,
  disabled,
  onClick,
}: {
  label: string
  tone: 'green' | 'red' | 'amber' | 'blue'
  disabled: boolean
  onClick: () => void
}) {
  const tones = {
    green: 'bg-emerald-600 hover:bg-emerald-700',
    red: 'bg-rose-600 hover:bg-rose-700',
    amber: 'bg-amber-500 hover:bg-amber-600',
    blue: 'bg-blue-600 hover:bg-blue-700',
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50',
        tones[tone]
      )}
    >
      {label}
    </button>
  )
}

function getInitials(value: string) {
  return value
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0] || '')
    .join('')
    .toUpperCase()
}
