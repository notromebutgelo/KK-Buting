'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Clock3,
  Eye,
  EyeOff,
  MoreHorizontal,
  Plus,
  Repeat2,
  Search,
  Store,
  UsersRound,
  X,
} from 'lucide-react'
import api from '@/lib/api'
import LoadingModal from '@/components/ui/LoadingModal'
import {
  AdminEmptyState,
  AdminField,
  AdminFilterBar,
  AdminNotice,
  AdminSurface,
  AdminSurfaceHeader,
} from '@/components/admin/workspace'
import { DashboardPill } from '@/components/dashboard/primitives'
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
  contactNumber?: string | null
  ownerPhone?: string | null
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

type MerchantTab = 'directory' | 'transactions' | 'create'
const MERCHANT_TRANSACTION_PAGE_SIZE = 6
const MERCHANT_DIRECTORY_PAGE_SIZE = 5

const statusOptions: Array<{ value: MerchantStatus | 'all'; label: string }> = [
  { value: 'all', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'rejected', label: 'Rejected' },
]

const merchantCreationCategoryOptions = [
  'Food & Beverage',
  'Cafe & Milk Tea',
  'Restaurant',
  'Bakery & Pastries',
  'Retail & Grocery',
  'Convenience Store',
  'Health & Beauty',
  'Salon & Barbershop',
  'Pharmacy',
  'Printing & School Supplies',
  'Electronics & Mobile',
  'Clothing & Apparel',
  'Home & Lifestyle',
  'Fitness & Recreation',
  'Services',
  'Other',
]

const inputClass =
  'surface-input w-full rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[color:var(--accent)]/30'

export default function MerchantsPage() {
  const [adminRole, setAdminRole] = useState('admin')
  const [merchants, setMerchants] = useState<Merchant[]>([])
  const [selectedMerchantId, setSelectedMerchantId] = useState<string | null>(null)
  const [transactions, setTransactions] = useState<MerchantTransaction[]>([])
  const [activeTab, setActiveTab] = useState<MerchantTab>('directory')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<MerchantStatus | 'all'>('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [dateJoinedFilter, setDateJoinedFilter] = useState('')
  const [directoryPage, setDirectoryPage] = useState(1)
  const [transactionPage, setTransactionPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [loadingLabel, setLoadingLabel] = useState('Updating merchant')
  const [message, setMessage] = useState('')
  const [showDirectoryDetails, setShowDirectoryDetails] = useState(false)
  const [openActionMerchantId, setOpenActionMerchantId] = useState<string | null>(null)
  const [editor, setEditor] = useState({ discountInfo: '', termsAndConditions: '', pointsRate: '10' })
  const actionMenuRef = useRef<HTMLDivElement | null>(null)

  const isSuperadmin = adminRole === 'superadmin'

  const [createForm, setCreateForm] = useState({
    name: '',
    category: '',
    address: '',
    ownerName: '',
    email: '',
    password: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [createResult, setCreateResult] = useState<{
    merchantId: string
    uid: string
    email: string
    name: string
    password: string
  } | null>(null)
  const [createError, setCreateError] = useState('')

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
        (joinedDate &&
          !Number.isNaN(joinedDate.getTime()) &&
          joinedDate.toISOString().slice(0, 10) === dateJoinedFilter)
      return matchesSearch && matchesStatus && matchesCategory && matchesDate
    })
  }, [categoryFilter, dateJoinedFilter, merchants, search, statusFilter])

  const selectedMerchant =
    filteredMerchants.find((merchant) => merchant.id === selectedMerchantId) ||
    merchants.find((merchant) => merchant.id === selectedMerchantId) ||
    filteredMerchants[0] ||
    merchants[0] ||
    null

  const categoryOptions = useMemo(
    () =>
      Array.from(new Set(merchants.map((merchant) => merchant.category).filter(Boolean) as string[])).sort((a, b) =>
        a.localeCompare(b)
      ),
    [merchants]
  )

  useEffect(() => {
    if (!filteredMerchants.length) {
      setSelectedMerchantId(null)
      return
    }

    setSelectedMerchantId((current) =>
      current && filteredMerchants.some((merchant) => merchant.id === current)
        ? current
        : filteredMerchants[0]?.id || null
    )
  }, [filteredMerchants])

  useEffect(() => {
    let mounted = true

    async function loadMerchants() {
      setIsLoading(true)
      try {
        const [merchantsRes, meRes] = await Promise.all([api.get('/admin/merchants'), api.get('/auth/me')])
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

    void loadMerchants()
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
        if (mounted) setTransactions(res.data.transactions || [])
      } catch {
        if (mounted) setTransactions([])
      } finally {
        if (mounted) setIsDetailLoading(false)
      }
    }

    void loadTransactions()
    return () => {
      mounted = false
    }
  }, [selectedMerchant])

  useEffect(() => {
    setTransactionPage(1)
  }, [activeTab, selectedMerchantId])

  useEffect(() => {
    setDirectoryPage(1)
  }, [activeTab, categoryFilter, dateJoinedFilter, search, statusFilter])

  useEffect(() => {
    if (activeTab !== 'directory') {
      setShowDirectoryDetails(false)
    }
  }, [activeTab])

  useEffect(() => {
    if (!showDirectoryDetails) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setShowDirectoryDetails(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showDirectoryDetails])

  useEffect(() => {
    setOpenActionMerchantId(null)
  }, [activeTab, categoryFilter, dateJoinedFilter, directoryPage, search, statusFilter])

  useEffect(() => {
    if (!openActionMerchantId) return

    function handleClickOutside(event: MouseEvent) {
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target as Node)) {
        setOpenActionMerchantId(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [openActionMerchantId])

  async function refreshMerchants(preferredId?: string | null) {
    const res = await api.get('/admin/merchants')
    const nextMerchants = res.data.merchants || res.data || []
    setMerchants(nextMerchants)
    setSelectedMerchantId(preferredId || nextMerchants[0]?.id || null)
  }

  async function handleMerchantAction(
    action: 'approve' | 'reject' | 'suspend' | 'reactivate',
    merchantOverride?: Merchant
  ) {
    const targetMerchant = merchantOverride || selectedMerchant
    if (!targetMerchant) return

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
    setOpenActionMerchantId(null)

    try {
      if (action === 'approve') await api.patch(`/admin/merchants/${targetMerchant.id}/approve`)
      else if (action === 'reactivate')
        await api.patch(`/admin/merchants/${targetMerchant.id}/status`, { status: 'approved' })
      else if (action === 'suspend')
        await api.patch(`/admin/merchants/${targetMerchant.id}/status`, { status: 'suspended' })
      else await api.patch(`/admin/merchants/${targetMerchant.id}/status`, { status: 'rejected' })

      setMessage(
        action === 'approve'
          ? 'Merchant approved successfully.'
          : action === 'reactivate'
            ? 'Merchant reactivated successfully.'
            : action === 'suspend'
              ? 'Merchant suspended successfully.'
              : 'Merchant rejected successfully.'
      )
      await refreshMerchants(targetMerchant.id)
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

  function generateEmail(name: string) {
    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20) || 'merchant'
    return `${slug}@kkbuting.merchant`
  }

  function generatePassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#'
    return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  }

  async function handleCreateMerchant() {
    setCreateError('')
    if (!createForm.name.trim()) {
      setCreateError('Business name is required.')
      return
    }
    if (!createForm.email.trim()) {
      setCreateError('Email is required.')
      return
    }
    if (!createForm.password.trim()) {
      setCreateError('Password is required.')
      return
    }
    if (createForm.password.length < 8) {
      setCreateError('Password must be at least 8 characters.')
      return
    }

    setIsCreating(true)

    try {
      const res = await api.post('/admin/merchants/create', {
        name: createForm.name.trim(),
        category: createForm.category.trim() || undefined,
        address: createForm.address.trim() || undefined,
        ownerName: createForm.ownerName.trim() || undefined,
        email: createForm.email.trim(),
        password: createForm.password,
      })

      const merchant = res.data.merchant
      setCreateResult({ ...merchant, password: createForm.password })
      setCreateForm({ name: '', category: '', address: '', ownerName: '', email: '', password: '' })
      await refreshMerchants(merchant.merchantId)
    } catch (error: any) {
      setCreateError(error?.response?.data?.error || 'Failed to create merchant account.')
    } finally {
      setIsCreating(false)
    }
  }

  const counts = {
    total: merchants.length,
    pending: merchants.filter((merchant) => merchant.status === 'pending').length,
    active: merchants.filter((merchant) => merchant.status === 'approved').length,
    suspended: merchants.filter((merchant) => merchant.status === 'suspended').length,
    transactions: transactions.length,
  }

  const tabs: Array<{ id: Exclude<MerchantTab, 'create'>; label: string; count?: number }> = [
    { id: 'directory', label: 'Directory', count: counts.total },
    { id: 'transactions', label: 'Transactions', count: counts.transactions },
  ]

  const messageTone = message.toLowerCase().includes('could not') || message.toLowerCase().includes('failed') ? 'danger' : 'success'
  const isTransactionsTab = activeTab === 'transactions'
  const isDirectoryTab = activeTab === 'directory'
  const listSurfaceTitle = isTransactionsTab ? 'Merchant transaction selector' : 'Merchant directory'
  const listSurfaceDescription = isTransactionsTab
    ? 'Choose a merchant on the left, then review their paginated QR and points-award history on the right.'
    : 'Use the list to select a merchant record, then maintain storefront details, status, and policy copy from the detail panel.'

  const directoryPageCount = Math.max(1, Math.ceil(filteredMerchants.length / MERCHANT_DIRECTORY_PAGE_SIZE))
  const paginatedMerchants = useMemo(() => {
    const start = (directoryPage - 1) * MERCHANT_DIRECTORY_PAGE_SIZE
    return filteredMerchants.slice(start, start + MERCHANT_DIRECTORY_PAGE_SIZE)
  }, [directoryPage, filteredMerchants])
  const directoryRangeStart = filteredMerchants.length
    ? (directoryPage - 1) * MERCHANT_DIRECTORY_PAGE_SIZE + 1
    : 0
  const directoryRangeEnd = filteredMerchants.length
    ? directoryRangeStart + paginatedMerchants.length - 1
    : 0

  const transactionPageCount = Math.max(1, Math.ceil(transactions.length / MERCHANT_TRANSACTION_PAGE_SIZE))
  const paginatedTransactions = useMemo(() => {
    const start = (transactionPage - 1) * MERCHANT_TRANSACTION_PAGE_SIZE
    return transactions.slice(start, start + MERCHANT_TRANSACTION_PAGE_SIZE)
  }, [transactionPage, transactions])
  const transactionPages = useMemo(
    () => buildPaginationPages(transactionPage, transactionPageCount),
    [transactionPage, transactionPageCount]
  )
  const transactionRangeStart = transactions.length
    ? (transactionPage - 1) * MERCHANT_TRANSACTION_PAGE_SIZE + 1
    : 0
  const transactionRangeEnd = transactions.length
    ? transactionRangeStart + paginatedTransactions.length - 1
    : 0

  useEffect(() => {
    setTransactionPage((current) => Math.min(current, transactionPageCount))
  }, [transactionPageCount])

  useEffect(() => {
    setDirectoryPage((current) => Math.min(current, directoryPageCount))
  }, [directoryPageCount])

  return (
    <>
      <LoadingModal
        open={isSaving}
        title={loadingLabel}
        description="Please wait while the merchant record and related dashboard data are updated."
      />

      <div className="flex flex-col gap-6">
        <AdminSurface className="px-8 py-6">
          <div className="space-y-2">
            <h1
              className="text-[2rem] font-black tracking-[-0.03em]"
              style={{ color: 'var(--ink)' }}
            >
              Merchants
            </h1>
            <p className="text-base leading-7" style={{ color: 'var(--muted)' }}>
              Manage partner merchant accounts.
            </p>
          </div>
        </AdminSurface>

        <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          <MerchantMetricCard
            label="Merchant records"
            value={counts.total.toLocaleString()}
            description="Profiles stored in the directory"
            icon={<Store size={22} />}
            tone="blue"
          />
          <MerchantMetricCard
            label="Active merchants"
            value={counts.active.toLocaleString()}
            description="Partners currently active"
            icon={<UsersRound size={22} />}
            tone="green"
          />
          <MerchantMetricCard
            label="Pending review"
            value={counts.pending.toLocaleString()}
            description="Records awaiting your decision"
            icon={<Clock3 size={22} />}
            tone="amber"
          />
          <MerchantMetricCard
            label="Total transactions"
            value={counts.transactions.toLocaleString()}
            description="QR and points activity (selected range)"
            icon={<Repeat2 size={22} />}
            tone="violet"
          />
        </section>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-end gap-8 border-b border-[var(--stroke)]">
            {tabs.map((tab) => {
              const active = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.id)
                    setShowDirectoryDetails(false)
                  }}
                  className={cn(
                    'relative inline-flex items-center gap-3 pb-4 text-sm font-semibold transition',
                    active ? 'text-[var(--accent)]' : 'text-[var(--ink-soft)] hover:text-[var(--ink)]',
                  )}
                >
                  <span>{tab.label}</span>
                  {typeof tab.count === 'number' ? (
                    <span
                      className={cn(
                        'inline-flex h-6 min-w-[24px] items-center justify-center rounded-full px-2 text-[11px] font-semibold',
                        active ? 'bg-[rgba(30,91,255,0.1)] text-[var(--accent)]' : 'bg-[var(--surface-muted)] text-[var(--muted)]',
                      )}
                    >
                      {tab.count}
                    </span>
                  ) : null}
                  {active ? (
                    <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-[var(--accent)]" />
                  ) : null}
                </button>
              )
            })}
            {activeTab === 'create' ? (
              <span className="pb-4 text-sm font-semibold text-[var(--accent)]">
                Create merchant
              </span>
            ) : null}
          </div>

          {isSuperadmin ? (
            <button
              type="button"
              onClick={() => {
                setActiveTab('create')
                setCreateResult(null)
                setCreateError('')
              }}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-5 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(30,91,255,0.18)] transition hover:opacity-95"
            >
              <Plus size={16} />
              Add merchant
            </button>
          ) : null}
        </div>

        {activeTab === 'create' ? (
          <div className="mx-auto w-full max-w-3xl">
            {createResult ? (
              <AdminSurface tone="soft">
                <AdminSurfaceHeader
                  title="Merchant account created"
                  description="Share these credentials with the merchant. The account is already active and can log in immediately."
                  action={<DashboardPill tone="success">Ready to share</DashboardPill>}
                />

                <div className="mt-5 rounded-2xl border p-4" style={{ borderColor: 'var(--stroke)', background: 'var(--card-solid)' }}>
                  <CredentialRow label="Business name" value={createResult.name} />
                  <CredentialRow label="Login email" value={createResult.email} copyable />
                  <CredentialRow label="Password" value={createResult.password} copyable secret />
                  <CredentialRow label="Merchant ID" value={createResult.merchantId} />
                </div>

                <p className="mt-4 text-sm leading-6" style={{ color: 'var(--ink-soft)' }}>
                  Advise the merchant to change their password after the first login and confirm that their storefront details are complete before launch.
                </p>

                <button
                  type="button"
                  onClick={() => {
                    setCreateResult(null)
                    setCreateError('')
                  }}
                  className="mt-5 rounded-xl px-5 py-2.5 text-sm font-semibold text-white"
                  style={{ background: 'var(--accent)' }}
                >
                  Create another merchant
                </button>
              </AdminSurface>
            ) : (
              <AdminSurface>
                <AdminSurfaceHeader
                  title="Create merchant account"
                  description="Provision a merchant login and register the business in one step. Merchant accounts are created manually from this workspace."
                  action={<DashboardPill tone="soft">Immediate activation</DashboardPill>}
                />

                {createError ? <div className="mt-5"><AdminNotice tone="danger">{createError}</AdminNotice></div> : null}

                <div className="mt-5 grid gap-4">
                  <AdminField label="Business name *">
                    <input
                      type="text"
                      value={createForm.name}
                      onChange={(e) => setCreateForm((form) => ({ ...form, name: e.target.value }))}
                      placeholder="e.g. Juan's Bakery"
                      className={inputClass}
                    />
                  </AdminField>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <AdminField label="Category">
                      <select
                        value={createForm.category}
                        onChange={(e) => setCreateForm((form) => ({ ...form, category: e.target.value }))}
                        className={inputClass}
                      >
                        <option value="">Select category</option>
                        {merchantCreationCategoryOptions.map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                    </AdminField>
                    <AdminField label="Owner / contact name">
                      <input
                        type="text"
                        value={createForm.ownerName}
                        onChange={(e) => setCreateForm((form) => ({ ...form, ownerName: e.target.value }))}
                        placeholder="e.g. Juan Dela Cruz"
                        className={inputClass}
                      />
                    </AdminField>
                  </div>

                  <AdminField label="Business address">
                    <input
                      type="text"
                      value={createForm.address}
                      onChange={(e) => setCreateForm((form) => ({ ...form, address: e.target.value }))}
                      placeholder="e.g. 123 Buting Street, Pasig City"
                      className={inputClass}
                    />
                  </AdminField>

                  <AdminField label="Login email *" hint="Use Auto-fill to generate an email from the business name when needed.">
                    <div className="flex gap-2">
                      <input
                        type="email"
                        value={createForm.email}
                        onChange={(e) => setCreateForm((form) => ({ ...form, email: e.target.value }))}
                        placeholder="merchant@email.com"
                        className={cn(inputClass, 'min-w-0 flex-1')}
                      />
                      <button
                        type="button"
                        onClick={() => setCreateForm((form) => ({ ...form, email: generateEmail(form.name) }))}
                        className="shrink-0 rounded-xl border px-3 py-2.5 text-xs font-semibold"
                        style={{ borderColor: 'var(--stroke)', background: 'var(--surface-muted)', color: 'var(--ink-soft)' }}
                      >
                        Auto-fill
                      </button>
                    </div>
                  </AdminField>

                  <AdminField label="Password *" hint="Use Generate for a secure starter password.">
                    <div className="flex gap-2">
                      <div className="relative min-w-0 flex-1">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={createForm.password}
                          onChange={(e) => setCreateForm((form) => ({ ...form, password: e.target.value }))}
                          placeholder="Minimum 8 characters"
                          className={cn(inputClass, 'pr-10')}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((value) => !value)}
                          className="absolute right-3 top-1/2 -translate-y-1/2"
                          style={{ color: 'var(--muted)' }}
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setCreateForm((form) => ({ ...form, password: generatePassword() }))
                          setShowPassword(true)
                        }}
                        className="shrink-0 rounded-xl border px-3 py-2.5 text-xs font-semibold"
                        style={{ borderColor: 'var(--stroke)', background: 'var(--surface-muted)', color: 'var(--ink-soft)' }}
                      >
                        Generate
                      </button>
                    </div>
                  </AdminField>

                  <button
                    type="button"
                    onClick={() => void handleCreateMerchant()}
                    disabled={isCreating}
                    className="rounded-xl py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                    style={{ background: 'var(--accent)' }}
                  >
                    {isCreating ? 'Creating account...' : 'Create merchant account'}
                  </button>
                </div>
              </AdminSurface>
            )}
          </div>
        ) : isDirectoryTab ? (
          <>
            <AdminSurface className="px-6 py-5">
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-[2fr_1.1fr_1.1fr_1fr_auto]">
                <div>
                  <AdminField label="Search">
                    <div className="relative">
                      <Search
                        size={16}
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
                        style={{ color: 'var(--muted)' }}
                      />
                      <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by name, email, or contact"
                        className="surface-input h-11 w-full rounded-xl py-2.5 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-[color:var(--accent)]/25"
                      />
                    </div>
                  </AdminField>
                </div>

                <div>
                  <AdminField label="Status">
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as MerchantStatus | 'all')}
                      className={cn(inputClass, 'h-11')}
                    >
                      {statusOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </AdminField>
                </div>

                <div>
                  <AdminField label="Category">
                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className={cn(inputClass, 'h-11')}
                    >
                      <option value="all">All categories</option>
                      {categoryOptions.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </AdminField>
                </div>

                <div>
                  <AdminField label="Date joined">
                    <input
                      type="date"
                      value={dateJoinedFilter}
                      onChange={(e) => setDateJoinedFilter(e.target.value)}
                      className={cn(inputClass, 'h-11')}
                    />
                  </AdminField>
                </div>

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => {
                      setSearch('')
                      setStatusFilter('all')
                      setCategoryFilter('all')
                      setDateJoinedFilter('')
                    }}
                    className="inline-flex h-11 items-center justify-center rounded-xl border px-5 text-sm font-semibold transition hover:bg-[var(--surface-muted)]"
                    style={{ borderColor: 'var(--stroke)', color: 'var(--ink-soft)' }}
                  >
                    Clear
                  </button>
                </div>
              </div>
            </AdminSurface>

            <AdminSurface className="overflow-visible p-0">
              {isLoading ? (
                <div className="flex justify-center py-20">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-[color:var(--accent)] border-t-transparent" />
                </div>
              ) : filteredMerchants.length === 0 ? (
                <div className="px-6 py-8">
                  <AdminEmptyState
                    title="No merchants match the current filters"
                    description="Adjust the search, status, category, or date filters to surface more merchant records."
                  />
                </div>
              ) : (
                <>
                  <div className="overflow-visible">
                    <table className="w-full table-fixed">
                      <colgroup>
                        <col className="w-[31%]" />
                        <col className="w-[16%]" />
                        <col className="w-[12%]" />
                        <col className="w-[12%]" />
                        <col className="w-[19%]" />
                        <col className="w-[10%]" />
                      </colgroup>
                      <thead className="border-b" style={{ borderColor: 'var(--stroke)' }}>
                        <tr>
                          {['Merchant', 'Category', 'Status', 'Date joined', 'Contact', 'Actions'].map((heading) => (
                            <th
                              key={heading}
                              className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-[0.16em]"
                              style={{ color: 'var(--muted)' }}
                            >
                              {heading}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[color:var(--stroke)]">
                        {paginatedMerchants.map((merchant) => (
                          <tr key={merchant.id} className="transition-colors hover:bg-[color:var(--surface-muted)]/45">
                            <td className="px-5 py-4">
                              <div className="flex items-start gap-4">
                                <div
                                  className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border"
                                  style={{ borderColor: 'var(--stroke)', background: 'var(--surface-muted)' }}
                                >
                                  {merchant.logoUrl || merchant.imageUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={merchant.logoUrl || merchant.imageUrl}
                                      alt={merchant.name}
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <span className="text-sm font-bold" style={{ color: 'var(--muted)' }}>
                                      {getInitials(merchant.name)}
                                    </span>
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p className="truncate text-[15px] font-semibold" style={{ color: 'var(--ink)' }}>
                                    {merchant.name}
                                  </p>
                                  <p className="mt-1 line-clamp-2 text-sm leading-6" style={{ color: 'var(--muted)' }}>
                                    {merchant.address || 'Address not provided'}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-4 text-sm" style={{ color: 'var(--ink-soft)' }}>
                              <span className="block truncate">{merchant.category || 'Uncategorized'}</span>
                            </td>
                            <td className="px-5 py-4">
                              <StatusPill status={merchant.status} />
                            </td>
                            <td className="px-5 py-4 text-sm" style={{ color: 'var(--ink-soft)' }}>
                              {formatDate(merchant.createdAt)}
                            </td>
                            <td className="px-5 py-4">
                              <div className="space-y-1.5 text-sm leading-5" style={{ color: 'var(--ink-soft)' }}>
                                <p className="truncate">{merchant.ownerEmail || 'No email saved'}</p>
                                <p className="truncate">{merchant.contactNumber || merchant.ownerPhone || 'No phone saved'}</p>
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              <div className="relative flex items-center justify-end gap-2" ref={openActionMerchantId === merchant.id ? actionMenuRef : null}>
                                <MerchantIconActionButton
                                  label="View merchant details"
                                  onClick={() => {
                                    setSelectedMerchantId(merchant.id)
                                    setShowDirectoryDetails(true)
                                    setOpenActionMerchantId(null)
                                  }}
                                >
                                  <Eye size={16} />
                                </MerchantIconActionButton>
                                <MerchantIconActionButton
                                  label="Open merchant actions"
                                  onClick={() => {
                                    setSelectedMerchantId(merchant.id)
                                    setOpenActionMerchantId((current) => (current === merchant.id ? null : merchant.id))
                                  }}
                                >
                                  <MoreHorizontal size={16} />
                                </MerchantIconActionButton>

                                {openActionMerchantId === merchant.id ? (
                                  <div
                                    className="absolute right-0 top-11 z-20 min-w-[220px] rounded-2xl border bg-white p-2 shadow-[0_20px_45px_rgba(15,23,42,0.12)]"
                                    style={{ borderColor: 'var(--stroke)' }}
                                  >
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedMerchantId(merchant.id)
                                        setShowDirectoryDetails(true)
                                        setOpenActionMerchantId(null)
                                      }}
                                      className="flex w-full items-center rounded-xl px-3 py-2.5 text-left text-sm font-medium transition hover:bg-[var(--surface-muted)]"
                                      style={{ color: 'var(--ink)' }}
                                    >
                                      View details
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedMerchantId(merchant.id)
                                        setActiveTab('transactions')
                                        setShowDirectoryDetails(false)
                                        setOpenActionMerchantId(null)
                                      }}
                                      className="flex w-full items-center rounded-xl px-3 py-2.5 text-left text-sm font-medium transition hover:bg-[var(--surface-muted)]"
                                      style={{ color: 'var(--ink)' }}
                                    >
                                      Open transactions
                                    </button>
                                    {isSuperadmin && merchant.status === 'pending' ? (
                                      <button
                                        type="button"
                                        onClick={() => void handleMerchantAction('approve', merchant)}
                                        className="flex w-full items-center rounded-xl px-3 py-2.5 text-left text-sm font-medium transition hover:bg-[var(--surface-muted)]"
                                        style={{ color: '#16a34a' }}
                                      >
                                        Approve merchant
                                      </button>
                                    ) : null}
                                    {isSuperadmin && merchant.status === 'approved' ? (
                                      <button
                                        type="button"
                                        onClick={() => void handleMerchantAction('suspend', merchant)}
                                        className="flex w-full items-center rounded-xl px-3 py-2.5 text-left text-sm font-medium transition hover:bg-[var(--surface-muted)]"
                                        style={{ color: '#d97706' }}
                                      >
                                        Suspend merchant
                                      </button>
                                    ) : null}
                                    {isSuperadmin && merchant.status === 'suspended' ? (
                                      <button
                                        type="button"
                                        onClick={() => void handleMerchantAction('reactivate', merchant)}
                                        className="flex w-full items-center rounded-xl px-3 py-2.5 text-left text-sm font-medium transition hover:bg-[var(--surface-muted)]"
                                        style={{ color: 'var(--accent)' }}
                                      >
                                        Reactivate merchant
                                      </button>
                                    ) : null}
                                    {isSuperadmin && merchant.status !== 'rejected' ? (
                                      <button
                                        type="button"
                                        onClick={() => void handleMerchantAction('reject', merchant)}
                                        className="flex w-full items-center rounded-xl px-3 py-2.5 text-left text-sm font-medium transition hover:bg-[var(--surface-muted)]"
                                        style={{ color: '#ef4444' }}
                                      >
                                        Reject merchant
                                      </button>
                                    ) : null}
                                  </div>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div
                    className="flex flex-col gap-4 border-t px-6 py-4 md:flex-row md:items-center md:justify-between"
                    style={{ borderColor: 'var(--stroke)' }}
                  >
                    <p className="text-sm leading-6" style={{ color: 'var(--muted)' }}>
                      Showing {directoryRangeStart}-{directoryRangeEnd} of {filteredMerchants.length} merchants
                    </p>

                    <div className="flex items-center gap-2">
                      <MerchantPagerButton
                        onClick={() => setDirectoryPage((page) => Math.max(1, page - 1))}
                        disabled={directoryPage === 1}
                      >
                        Previous
                      </MerchantPagerButton>
                      <span
                        className="inline-flex h-9 min-w-[36px] items-center justify-center rounded-xl px-3 text-sm font-semibold"
                        style={{ background: 'var(--accent)', color: '#ffffff' }}
                      >
                        {directoryPage}
                      </span>
                      <MerchantPagerButton
                        onClick={() => setDirectoryPage((page) => Math.min(directoryPageCount, page + 1))}
                        disabled={directoryPage === directoryPageCount}
                      >
                        Next
                      </MerchantPagerButton>
                    </div>
                  </div>
                </>
              )}
            </AdminSurface>

          </>
        ) : (
          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.12fr)_minmax(360px,0.88fr)]">
            <AdminSurface className="h-full">
              <AdminSurfaceHeader
                title={listSurfaceTitle}
                description={listSurfaceDescription}
                action={<DashboardPill tone="default">{filteredMerchants.length} shown</DashboardPill>}
              />

              <div className="mt-5">
                <AdminFilterBar>
                  <AdminField label="Search merchants">
                    <div className="relative">
                      <Search
                        size={16}
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
                        style={{ color: 'var(--muted)' }}
                      />
                      <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search merchant, owner, or address"
                        className="surface-input w-full rounded-xl py-2.5 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-[color:var(--accent)]/25"
                      />
                    </div>
                  </AdminField>

                  <AdminField label="Status">
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as MerchantStatus | 'all')}
                      className={inputClass}
                    >
                      {statusOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </AdminField>

                  <AdminField label="Category">
                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className={inputClass}
                    >
                      <option value="all">All categories</option>
                      {categoryOptions.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </AdminField>

                  <AdminField label="Date joined">
                    <input
                      type="date"
                      value={dateJoinedFilter}
                      onChange={(e) => setDateJoinedFilter(e.target.value)}
                      className={inputClass}
                    />
                  </AdminField>
                </AdminFilterBar>
              </div>

              <div className="mt-5">
                {isLoading ? (
                  <div className="flex justify-center py-16">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-[color:var(--accent)] border-t-transparent" />
                  </div>
                ) : filteredMerchants.length === 0 ? (
                  <AdminEmptyState
                    title="No merchants match the current filters"
                    description="Adjust the search, status, category, or date filters to surface more merchant records."
                  />
                ) : (
                  <div
                    className={cn(
                      'grid gap-3',
                      isTransactionsTab ? 'grid-cols-1' : 'md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2'
                    )}
                  >
                    {filteredMerchants.map((merchant) => (
                      <MerchantSelectionCard
                        key={merchant.id}
                        merchant={merchant}
                        selected={selectedMerchant?.id === merchant.id}
                        mode={isTransactionsTab ? 'transactions' : 'directory'}
                        transactionSummary={
                          isTransactionsTab
                            ? selectedMerchant?.id === merchant.id
                              ? isDetailLoading
                                ? 'Loading activity...'
                                : `${transactions.length} transaction${transactions.length === 1 ? '' : 's'} ready`
                              : 'Open this merchant to review activity'
                            : undefined
                        }
                        onSelect={() => setSelectedMerchantId(merchant.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </AdminSurface>

            <AdminSurface tone="neutral" className="xl:sticky xl:top-6">
              {selectedMerchant ? (
                isTransactionsTab ? (
                  <>
                    <AdminSurfaceHeader
                      title="Transaction history"
                      description="Review paginated QR awards and points activity for the merchant currently in focus."
                      action={<DashboardPill tone="default">{transactions.length} records</DashboardPill>}
                    />

                    <div
                      className="mt-5 rounded-2xl border p-4"
                      style={{ borderColor: 'var(--stroke)', background: 'var(--card-solid)' }}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p
                            className="text-xs font-semibold uppercase tracking-[0.16em]"
                            style={{ color: 'var(--accent-strong)' }}
                          >
                            Merchant in focus
                          </p>
                          <h2 className="mt-2 text-xl font-semibold" style={{ color: 'var(--ink)' }}>
                            {selectedMerchant.name}
                          </h2>
                          <p className="mt-1 text-sm leading-6" style={{ color: 'var(--muted)' }}>
                            {selectedMerchant.address || 'Address not provided'}
                          </p>
                        </div>
                        <StatusPill status={selectedMerchant.status} />
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <DetailTile label="Owner" value={selectedMerchant.ownerName || 'Unknown owner'} />
                        <DetailTile label="Email" value={selectedMerchant.ownerEmail || 'No owner email'} />
                        <DetailTile label="Category" value={selectedMerchant.category || 'Uncategorized'} />
                        <DetailTile label="Date joined" value={formatDateTime(selectedMerchant.createdAt)} />
                        <DetailTile
                          label="Points rate"
                          value={`PHP ${Number(selectedMerchant.pointsRate || 10).toLocaleString()} = 1 pt`}
                        />
                        <DetailTile
                          label="Business info"
                          value={selectedMerchant.businessInfo || selectedMerchant.description || 'No business info yet'}
                          fullWidth
                        />
                      </div>
                    </div>

                    <div className="mt-5">
                      {isDetailLoading ? (
                        <div className="flex justify-center py-10">
                          <div className="h-5 w-5 animate-spin rounded-full border-2 border-[color:var(--accent)] border-t-transparent" />
                        </div>
                      ) : transactions.length === 0 ? (
                        <AdminEmptyState
                          title="No merchant transactions found"
                          description="Once this merchant starts awarding points, their activity log will appear here."
                        />
                      ) : (
                        <>
                          <div className="space-y-3">
                            {paginatedTransactions.map((transaction) => (
                              <TransactionHistoryCard key={transaction.id} transaction={transaction} />
                            ))}
                          </div>

                          <div
                            className="mt-4 flex flex-col gap-3 rounded-2xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                            style={{ borderColor: 'var(--stroke)', background: 'var(--card-solid)' }}
                          >
                            <p className="text-xs font-medium" style={{ color: 'var(--muted)' }}>
                              Showing {transactionRangeStart}-{transactionRangeEnd} of {transactions.length} transaction
                              {transactions.length === 1 ? '' : 's'}
                            </p>

                            <div className="flex flex-wrap items-center gap-1.5">
                              <PaginationButton
                                label="Prev"
                                active={false}
                                disabled={transactionPage === 1}
                                onClick={() => setTransactionPage((current) => Math.max(1, current - 1))}
                              />
                              {transactionPages.map((page, index) =>
                                page === 'ellipsis' ? (
                                  <span
                                    key={`ellipsis-${index}`}
                                    className="px-2 py-1 text-sm font-semibold"
                                    style={{ color: 'var(--muted)' }}
                                  >
                                    ...
                                  </span>
                                ) : (
                                  <PaginationButton
                                    key={page}
                                    label={String(page)}
                                    active={page === transactionPage}
                                    disabled={false}
                                    onClick={() => setTransactionPage(page)}
                                  />
                                )
                              )}
                              <PaginationButton
                                label="Next"
                                active={false}
                                disabled={transactionPage === transactionPageCount}
                                onClick={() => setTransactionPage((current) => Math.min(transactionPageCount, current + 1))}
                              />
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p
                          className="text-xs font-semibold uppercase tracking-[0.18em]"
                          style={{ color: 'var(--accent-strong)' }}
                        >
                          Merchant profile
                        </p>
                        <h2 className="mt-2 text-xl font-semibold" style={{ color: 'var(--ink)' }}>
                          {selectedMerchant.name}
                        </h2>
                        <p className="mt-1 text-sm leading-6" style={{ color: 'var(--muted)' }}>
                          {selectedMerchant.address || 'Address not provided'}
                        </p>
                      </div>
                      <StatusPill status={selectedMerchant.status} />
                    </div>

                    {message ? (
                      <div className="mt-5">
                        <AdminNotice tone={messageTone}>{message}</AdminNotice>
                      </div>
                    ) : null}

                    <div className="mt-5 space-y-4">
                      <div
                        className="rounded-2xl border p-4"
                        style={{ borderColor: 'var(--stroke)', background: 'var(--card-solid)' }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                              Merchant basics
                            </h3>
                            <p className="mt-1 text-xs leading-5" style={{ color: 'var(--muted)' }}>
                              Core owner, category, address, and points-conversion details for the selected merchant.
                            </p>
                          </div>
                          <DashboardPill tone="soft">Directory view</DashboardPill>
                        </div>

                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          <DetailTile label="Business category" value={selectedMerchant.category || 'Uncategorized'} />
                          <DetailTile label="Owner" value={selectedMerchant.ownerName || 'Unknown owner'} />
                          <DetailTile label="Email" value={selectedMerchant.ownerEmail || 'No owner email'} />
                          <DetailTile label="Date joined" value={formatDateTime(selectedMerchant.createdAt)} />
                          <DetailTile
                            label="Points rate"
                            value={`PHP ${Number(selectedMerchant.pointsRate || 10).toLocaleString()} = 1 pt`}
                          />
                          <DetailTile label="Address" value={selectedMerchant.address || 'Address not provided'} fullWidth />
                        </div>
                      </div>

                      <div
                        className="rounded-2xl border p-4"
                        style={{ borderColor: 'var(--stroke)', background: 'var(--card-solid)' }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                              Storefront snapshot
                            </h3>
                            <p className="mt-1 text-xs leading-5" style={{ color: 'var(--muted)' }}>
                              A read-only summary of what youth members currently see for this merchant.
                            </p>
                          </div>
                          <DashboardPill tone="default">Customer-facing copy</DashboardPill>
                        </div>

                        <div className="mt-4 space-y-3">
                          <DetailRow
                            label="Business info"
                            value={selectedMerchant.businessInfo || selectedMerchant.description || 'No business info yet'}
                          />
                          <DetailRow label="Discount info" value={selectedMerchant.discountInfo || 'No discount copy yet'} />
                          <DetailRow
                            label="Terms"
                            value={selectedMerchant.termsAndConditions || 'No terms and conditions added yet'}
                          />
                        </div>
                      </div>

                      <div
                        className="rounded-2xl border p-4"
                        style={{ borderColor: 'var(--stroke)', background: 'var(--card-solid)' }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                              Discount and terms
                            </h3>
                            <p className="mt-1 text-xs leading-5" style={{ color: 'var(--muted)' }}>
                              Admin can update these merchant-facing details on behalf of the partner.
                            </p>
                          </div>
                          <DashboardPill tone={isSuperadmin ? 'soft' : 'default'}>
                            {isSuperadmin ? 'Superadmin access' : 'Admin access'}
                          </DashboardPill>
                        </div>

                        <div className="mt-4 grid gap-3">
                          <textarea
                            value={editor.discountInfo}
                            onChange={(e) => setEditor((current) => ({ ...current, discountInfo: e.target.value }))}
                            rows={3}
                            placeholder="Discount information for youth members"
                            className={inputClass}
                          />
                          <textarea
                            value={editor.termsAndConditions}
                            onChange={(e) => setEditor((current) => ({ ...current, termsAndConditions: e.target.value }))}
                            rows={4}
                            placeholder="Terms and conditions shown to the merchant and youth members"
                            className={inputClass}
                          />
                          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                            <input
                              type="number"
                              min="1"
                              value={editor.pointsRate}
                              onChange={(e) => setEditor((current) => ({ ...current, pointsRate: e.target.value }))}
                              className={inputClass}
                              placeholder="Points rate in pesos"
                            />
                            <button
                              type="button"
                              onClick={() => void handleSaveMerchantProfile()}
                              disabled={isSaving}
                              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                              style={{ background: 'var(--accent)' }}
                            >
                              Save details
                            </button>
                          </div>
                          <p className="text-xs leading-5" style={{ color: 'var(--muted)' }}>
                            Default conversion is PHP 100 = 10 points.
                          </p>
                        </div>
                      </div>

                      <div
                        className="rounded-2xl border p-4"
                        style={{ borderColor: 'var(--stroke)', background: 'var(--card-solid)' }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                              Lifecycle actions
                            </h3>
                            <p className="mt-1 text-xs leading-5" style={{ color: 'var(--muted)' }}>
                              Approval, rejection, suspension, and reactivation controls live here.
                            </p>
                          </div>
                          {!isSuperadmin ? <DashboardPill tone="danger">Superadmin only</DashboardPill> : null}
                        </div>

                        <div className="mt-4 grid gap-2 sm:grid-cols-2">
                          <ActionButton
                            label="Approve merchant"
                            tone="green"
                            disabled={!isSuperadmin || selectedMerchant.status === 'approved' || isSaving}
                            onClick={() => void handleMerchantAction('approve')}
                          />
                          <ActionButton
                            label="Reject merchant"
                            tone="red"
                            disabled={!isSuperadmin || selectedMerchant.status === 'rejected' || isSaving}
                            onClick={() => void handleMerchantAction('reject')}
                          />
                          <ActionButton
                            label="Suspend merchant"
                            tone="amber"
                            disabled={!isSuperadmin || selectedMerchant.status !== 'approved' || isSaving}
                            onClick={() => void handleMerchantAction('suspend')}
                          />
                          <ActionButton
                            label="Reactivate merchant"
                            tone="blue"
                            disabled={!isSuperadmin || selectedMerchant.status !== 'suspended' || isSaving}
                            onClick={() => void handleMerchantAction('reactivate')}
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )
              ) : (
                <AdminEmptyState
                  title="Select a merchant"
                  description={
                    isTransactionsTab
                      ? 'Choose a merchant on the left to review their paginated transaction history.'
                      : 'Choose a merchant on the left to review their profile, storefront copy, and lifecycle actions.'
                  }
                />
              )}
            </AdminSurface>
          </div>
        )}
      </div>

      {showDirectoryDetails && selectedMerchant ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(15,23,42,0.42)] px-4 py-6"
          onClick={() => setShowDirectoryDetails(false)}
        >
          <div
            className="max-h-[calc(100vh-3rem)] w-full max-w-5xl overflow-y-auto"
            onClick={(event) => event.stopPropagation()}
          >
            <AdminSurface className="overflow-visible p-6 sm:p-7">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p
                    className="text-xs font-semibold uppercase tracking-[0.18em]"
                    style={{ color: 'var(--accent-strong)' }}
                  >
                    Merchant profile
                  </p>
                  <h2 className="mt-2 text-xl font-semibold" style={{ color: 'var(--ink)' }}>
                    {selectedMerchant.name}
                  </h2>
                  <p className="mt-1 text-sm leading-6" style={{ color: 'var(--muted)' }}>
                    {selectedMerchant.address || 'Address not provided'}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <StatusPill status={selectedMerchant.status} />
                  <button
                    type="button"
                    onClick={() => setShowDirectoryDetails(false)}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border transition hover:bg-[var(--surface-muted)]"
                    style={{ borderColor: 'var(--stroke)', color: 'var(--ink-soft)' }}
                    aria-label="Close merchant details"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {message ? (
                <div className="mt-5">
                  <AdminNotice tone={messageTone}>{message}</AdminNotice>
                </div>
              ) : null}

              <div className="mt-5 grid gap-4 xl:grid-cols-2">
                <div
                  className="rounded-2xl border p-4"
                  style={{ borderColor: 'var(--stroke)', background: 'var(--card-solid)' }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                        Merchant basics
                      </h3>
                      <p className="mt-1 text-xs leading-5" style={{ color: 'var(--muted)' }}>
                        Core owner, category, address, and points-conversion details for the selected merchant.
                      </p>
                    </div>
                    <DashboardPill tone="soft">Directory view</DashboardPill>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <DetailTile label="Business category" value={selectedMerchant.category || 'Uncategorized'} />
                    <DetailTile label="Owner" value={selectedMerchant.ownerName || 'Unknown owner'} />
                    <DetailTile label="Email" value={selectedMerchant.ownerEmail || 'No owner email'} />
                    <DetailTile
                      label="Contact number"
                      value={selectedMerchant.contactNumber || selectedMerchant.ownerPhone || 'No phone saved'}
                    />
                    <DetailTile label="Date joined" value={formatDateTime(selectedMerchant.createdAt)} />
                    <DetailTile
                      label="Points rate"
                      value={`PHP ${Number(selectedMerchant.pointsRate || 10).toLocaleString()} = 1 pt`}
                    />
                    <DetailTile label="Address" value={selectedMerchant.address || 'Address not provided'} fullWidth />
                  </div>
                </div>

                <div
                  className="rounded-2xl border p-4"
                  style={{ borderColor: 'var(--stroke)', background: 'var(--card-solid)' }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                        Storefront snapshot
                      </h3>
                      <p className="mt-1 text-xs leading-5" style={{ color: 'var(--muted)' }}>
                        A read-only summary of what youth members currently see for this merchant.
                      </p>
                    </div>
                    <DashboardPill tone="default">Customer-facing copy</DashboardPill>
                  </div>

                  <div className="mt-4 space-y-3">
                    <DetailRow
                      label="Business info"
                      value={selectedMerchant.businessInfo || selectedMerchant.description || 'No business info yet'}
                    />
                    <DetailRow label="Discount info" value={selectedMerchant.discountInfo || 'No discount copy yet'} />
                    <DetailRow
                      label="Terms"
                      value={selectedMerchant.termsAndConditions || 'No terms and conditions added yet'}
                    />
                  </div>
                </div>

                <div
                  className="rounded-2xl border p-4 xl:col-span-2"
                  style={{ borderColor: 'var(--stroke)', background: 'var(--card-solid)' }}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                        Discount and terms
                      </h3>
                      <p className="mt-1 text-xs leading-5" style={{ color: 'var(--muted)' }}>
                        Admin can update these merchant-facing details on behalf of the partner.
                      </p>
                    </div>
                    <DashboardPill tone={isSuperadmin ? 'soft' : 'default'}>
                      {isSuperadmin ? 'Superadmin access' : 'Admin access'}
                    </DashboardPill>
                  </div>

                  <div className="mt-4 grid gap-3">
                    <textarea
                      value={editor.discountInfo}
                      onChange={(e) => setEditor((current) => ({ ...current, discountInfo: e.target.value }))}
                      rows={3}
                      placeholder="Discount information for youth members"
                      className={inputClass}
                    />
                    <textarea
                      value={editor.termsAndConditions}
                      onChange={(e) => setEditor((current) => ({ ...current, termsAndConditions: e.target.value }))}
                      rows={4}
                      placeholder="Terms and conditions shown to the merchant and youth members"
                      className={inputClass}
                    />
                    <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                      <input
                        type="number"
                        min="1"
                        value={editor.pointsRate}
                        onChange={(e) => setEditor((current) => ({ ...current, pointsRate: e.target.value }))}
                        className={inputClass}
                        placeholder="Points rate in pesos"
                      />
                      <button
                        type="button"
                        onClick={() => void handleSaveMerchantProfile()}
                        disabled={isSaving}
                        className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                        style={{ background: 'var(--accent)' }}
                      >
                        Save details
                      </button>
                    </div>
                    <p className="text-xs leading-5" style={{ color: 'var(--muted)' }}>
                      Default conversion is PHP 100 = 10 points.
                    </p>
                  </div>
                </div>

                <div
                  className="rounded-2xl border p-4 xl:col-span-2"
                  style={{ borderColor: 'var(--stroke)', background: 'var(--card-solid)' }}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                        Lifecycle actions
                      </h3>
                      <p className="mt-1 text-xs leading-5" style={{ color: 'var(--muted)' }}>
                        Approval, rejection, suspension, and reactivation controls live here.
                      </p>
                    </div>
                    {!isSuperadmin ? <DashboardPill tone="danger">Superadmin only</DashboardPill> : null}
                  </div>

                  <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                    <ActionButton
                      label="Approve merchant"
                      tone="green"
                      disabled={!isSuperadmin || selectedMerchant.status === 'approved' || isSaving}
                      onClick={() => void handleMerchantAction('approve')}
                    />
                    <ActionButton
                      label="Reject merchant"
                      tone="red"
                      disabled={!isSuperadmin || selectedMerchant.status === 'rejected' || isSaving}
                      onClick={() => void handleMerchantAction('reject')}
                    />
                    <ActionButton
                      label="Suspend merchant"
                      tone="amber"
                      disabled={!isSuperadmin || selectedMerchant.status !== 'approved' || isSaving}
                      onClick={() => void handleMerchantAction('suspend')}
                    />
                    <ActionButton
                      label="Reactivate merchant"
                      tone="blue"
                      disabled={!isSuperadmin || selectedMerchant.status !== 'suspended' || isSaving}
                      onClick={() => void handleMerchantAction('reactivate')}
                    />
                  </div>
                </div>
              </div>
            </AdminSurface>
          </div>
        </div>
      ) : null}
    </>
  )
}

function MerchantMetricCard({
  label,
  value,
  description,
  icon,
  tone,
}: {
  label: string
  value: string
  description: string
  icon: React.ReactNode
  tone: 'blue' | 'green' | 'amber' | 'violet'
}) {
  const palette = getMerchantMetricPalette(tone)

  return (
    <div
      className="min-h-[136px] rounded-[20px] border px-6 py-5 shadow-[var(--shadow-sm)]"
      style={{ borderColor: 'var(--stroke)', background: 'var(--card-solid)' }}
    >
      <div className="flex items-start gap-4">
        <div
          className="grid h-14 w-14 shrink-0 place-items-center rounded-full"
          style={{ background: palette.background, color: palette.color }}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--muted)' }}>
            {label}
          </p>
          <p className="mt-3 text-[2.15rem] font-black leading-none tracking-[-0.03em]" style={{ color: 'var(--ink)' }}>
            {value}
          </p>
          <p className="mt-3 text-sm leading-6" style={{ color: 'var(--muted)' }}>
            {description}
          </p>
        </div>
      </div>
    </div>
  )
}

function MerchantIconActionButton({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] border transition hover:bg-[var(--surface-muted)]"
      style={{ borderColor: 'var(--stroke)', color: 'var(--ink-soft)' }}
    >
      {children}
    </button>
  )
}

function MerchantPagerButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode
  onClick: () => void
  disabled: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-9 items-center justify-center rounded-xl border px-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-45"
      style={{ borderColor: 'var(--stroke)', color: 'var(--ink-soft)' }}
    >
      {children}
    </button>
  )
}

function StatusPill({ status }: { status: MerchantStatus }) {
  const classes: Record<MerchantStatus, { badge: string; dot: string; label: string }> = {
    pending: {
      badge: 'bg-[#eff6ff] text-[#1e5bff]',
      dot: 'bg-[#1e5bff]',
      label: 'Pending',
    },
    approved: {
      badge: 'bg-[#ecfdf5] text-[#16a34a]',
      dot: 'bg-[#16a34a]',
      label: 'Active',
    },
    rejected: {
      badge: 'bg-[#fef2f2] text-[#ef4444]',
      dot: 'bg-[#ef4444]',
      label: 'Rejected',
    },
    suspended: {
      badge: 'bg-[#fef2f2] text-[#ef4444]',
      dot: 'bg-[#ef4444]',
      label: 'Suspended',
    },
  }
  const current = classes[status]

  return (
    <span className={cn('inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold', current.badge)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', current.dot)} />
      {current.label}
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
    green: 'var(--accent)',
    red: 'var(--danger-accent)',
    amber: 'var(--accent-warm)',
    blue: 'var(--accent-strong)',
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      style={{ background: tones[tone] }}
    >
      {label}
    </button>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="shrink-0 text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--muted)' }}>
        {label}
      </span>
      <span
        className="max-w-[240px] break-words text-right text-sm font-medium leading-6 [overflow-wrap:anywhere]"
        style={{ color: 'var(--ink)' }}
      >
        {value}
      </span>
    </div>
  )
}

function DetailTile({
  label,
  value,
  fullWidth = false,
}: {
  label: string
  value: string
  fullWidth?: boolean
}) {
  return (
    <div
      className={cn('min-w-0 rounded-2xl border px-4 py-3', fullWidth ? 'sm:col-span-2' : '')}
      style={{
        borderColor: 'var(--stroke)',
        background: 'color-mix(in srgb, var(--surface-muted) 70%, transparent)',
      }}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--muted)' }}>
        {label}
      </p>
      <p
        className="mt-2 break-words text-sm font-medium leading-6 [overflow-wrap:anywhere]"
        style={{ color: 'var(--ink)' }}
      >
        {value}
      </p>
    </div>
  )
}

function MerchantSelectionCard({
  merchant,
  selected,
  mode,
  transactionSummary,
  onSelect,
}: {
  merchant: Merchant
  selected: boolean
  mode: 'directory' | 'transactions'
  transactionSummary?: string
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full rounded-2xl border px-3.5 py-3 text-left transition hover:-translate-y-0.5"
      style={{
        borderColor: selected ? 'color-mix(in srgb, var(--accent) 42%, var(--stroke) 58%)' : 'var(--stroke)',
        background: selected
          ? 'color-mix(in srgb, var(--accent-soft) 72%, var(--card-solid) 28%)'
          : 'color-mix(in srgb, var(--card-solid) 84%, var(--surface-muted) 16%)',
        boxShadow: selected ? '0 12px 28px rgba(1, 67, 132, 0.1)' : '0 6px 18px rgba(15, 23, 42, 0.04)',
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border"
          style={{ borderColor: 'var(--stroke)', background: 'var(--surface-muted)' }}
        >
          {merchant.logoUrl || merchant.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={merchant.logoUrl || merchant.imageUrl}
              alt={merchant.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-sm font-bold" style={{ color: 'var(--muted)' }}>
              {getInitials(merchant.name)}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="truncate text-[15px] font-semibold" style={{ color: 'var(--ink)' }}>
              {merchant.name}
            </h3>
            <StatusPill status={merchant.status} />
            {merchant.category ? <DashboardPill tone="default">{merchant.category}</DashboardPill> : null}
          </div>

          <p className="mt-1.5 line-clamp-1 text-[13px] leading-5" style={{ color: 'var(--muted)' }}>
            {merchant.businessInfo || merchant.description || 'No business description yet'}
          </p>

          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] leading-5">
            <p style={{ color: 'var(--ink-soft)' }}>
              <span className="font-semibold" style={{ color: 'var(--muted)' }}>
                Owner:
              </span>{' '}
              {merchant.ownerName || 'Unknown owner'}
            </p>
            <p style={{ color: 'var(--ink-soft)' }}>
              <span className="font-semibold" style={{ color: 'var(--muted)' }}>
                Joined:
              </span>{' '}
              {formatDate(merchant.createdAt)}
            </p>
            <p className="max-w-full truncate" style={{ color: 'var(--ink-soft)' }}>
              <span className="font-semibold" style={{ color: 'var(--muted)' }}>
                Email:
              </span>{' '}
              {merchant.ownerEmail || 'No email saved'}
            </p>
            <p className="max-w-full truncate" style={{ color: 'var(--ink-soft)' }}>
              <span className="font-semibold" style={{ color: 'var(--muted)' }}>
                {mode === 'transactions' ? 'Activity:' : 'Address:'}
              </span>{' '}
              {mode === 'transactions' ? transactionSummary || 'Open to review activity' : merchant.address || 'Address not provided'}
            </p>
          </div>
        </div>
      </div>
    </button>
  )
}

function TransactionHistoryCard({ transaction }: { transaction: MerchantTransaction }) {
  return (
    <div
      className="rounded-2xl border px-4 py-3"
      style={{
        background: 'color-mix(in srgb, var(--surface-muted) 76%, transparent)',
        borderColor: 'var(--stroke)',
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
            {transaction.userName}
          </p>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            {transaction.userEmail || 'No email saved'}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold" style={{ color: 'var(--accent-strong)' }}>
            +{transaction.pointsGiven} pts
          </p>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            {formatDateTime(transaction.createdAt)}
          </p>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3 text-xs" style={{ color: 'var(--muted)' }}>
        <span>Type: {transaction.type}</span>
        <span>
          Amount:{' '}
          {transaction.amountSpent != null ? `PHP ${Number(transaction.amountSpent).toLocaleString()}` : 'Not captured'}
        </span>
      </div>
    </div>
  )
}

function PaginationButton({
  label,
  active,
  disabled,
  onClick,
}: {
  label: string
  active: boolean
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-xl border px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-45"
      style={{
        borderColor: active ? 'var(--accent)' : 'var(--stroke)',
        background: active ? 'var(--accent)' : 'var(--surface-muted)',
        color: active ? '#ffffff' : 'var(--ink-soft)',
      }}
    >
      {label}
    </button>
  )
}

function buildPaginationPages(current: number, total: number): Array<number | 'ellipsis'> {
  if (total <= 5) {
    return Array.from({ length: total }, (_, index) => index + 1)
  }

  const pages: Array<number | 'ellipsis'> = [1]
  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)

  if (start > 2) pages.push('ellipsis')
  for (let page = start; page <= end; page += 1) pages.push(page)
  if (end < total - 1) pages.push('ellipsis')
  pages.push(total)

  return pages
}

function getMerchantMetricPalette(tone: 'blue' | 'green' | 'amber' | 'violet') {
  if (tone === 'green') {
    return {
      background: '#ecfdf5',
      color: '#16a34a',
    }
  }

  if (tone === 'amber') {
    return {
      background: '#fff7ed',
      color: '#f59e0b',
    }
  }

  if (tone === 'violet') {
    return {
      background: '#f5f3ff',
      color: '#7c3aed',
    }
  }

  return {
    background: '#edf4ff',
    color: '#1e5bff',
  }
}

function formatDate(value?: string) {
  if (!value) return 'Not recorded'

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return 'Not recorded'
  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatDateTime(value?: string) {
  if (!value) return 'Not recorded'

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return 'Not recorded'
  return parsed.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}
function CredentialRow({
  label,
  value,
  copyable = false,
  secret = false,
}: {
  label: string
  value: string
  copyable?: boolean
  secret?: boolean
}) {
  const [copied, setCopied] = useState(false)
  const [revealed, setRevealed] = useState(false)

  function handleCopy() {
    void navigator.clipboard.writeText(value).then(() => {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <span className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--muted)' }}>
        {label}
      </span>
      <div className="flex items-center gap-2">
        <span className="max-w-[240px] truncate text-right font-mono text-sm font-semibold" style={{ color: 'var(--ink)' }}>
          {secret && !revealed ? '************' : value}
        </span>
        {secret ? (
          <button type="button" onClick={() => setRevealed((value) => !value)} className="text-xs" style={{ color: 'var(--muted)' }}>
            {revealed ? 'Hide' : 'Show'}
          </button>
        ) : null}
        {copyable ? (
          <button
            type="button"
            onClick={handleCopy}
            className="rounded-lg px-2.5 py-1 text-xs font-semibold"
            style={{ background: 'var(--surface-muted)', color: 'var(--ink-soft)' }}
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        ) : null}
      </div>
    </div>
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
