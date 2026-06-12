'use client'

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertCircle,
  Bell,
  CheckCircle2,
  History,
  Home,
  Info,
  Loader2,
  LogOut,
  Package,
  Pencil,
  Plus,
  QrCode,
  RefreshCw,
  Save,
  Settings,
  Store,
  Trash2,
  X,
} from 'lucide-react'
import QRScanner from '@/components/QRScanner'
import { getFirebaseAuth } from '@/lib/firebase'
import {
  deleteMerchantProduct,
  deleteMerchantPromotion,
  getMerchantNotifications,
  getMerchantProducts,
  getMerchantProfile,
  getMerchantPromotions,
  getMerchantTransactions,
  markAllNotificationsRead,
  saveMerchantProduct,
  saveMerchantPromotion,
  updateMerchantProfile,
} from '@/services/merchant.service'
import { getCurrentMerchant, signOutMerchant } from '@/services/auth.service'
import { redeemQr } from '@/services/transaction.service'
import { useAuthStore } from '@/store/authStore'
import type { MerchantNotification, MerchantProduct, MerchantProfile, MerchantPromotion, MerchantTransaction } from '@/types/merchant'
import { cn } from '@/utils/cn'
import { peso, shortDate } from '@/utils/format'

type MainTab = 'dashboard' | 'scan' | 'transactions' | 'manage' | 'account'
type ManageTab = 'profile' | 'promotions' | 'products' | 'alerts'
type ToastState = {
  id: number
  tone: 'success' | 'danger' | 'info'
  message: string
}

const blankPromotion: Partial<MerchantPromotion> = {
  title: '',
  shortTagline: '',
  bannerUrl: '',
  startDate: new Date().toISOString().slice(0, 10),
  endDate: new Date().toISOString().slice(0, 10),
  type: 'discount',
  valueLabel: '',
  availability: 'all',
  terms: [],
  isActive: true,
  redemptions: 0,
  views: 0,
}

const blankProduct: Partial<MerchantProduct> = {
  name: '',
  price: 0,
  category: '',
  description: '',
  imageUrl: '',
  isActive: true,
}

export default function MerchantWorkspacePage() {
  const router = useRouter()
  const user = useAuthStore((state) => state.user)
  const setUser = useAuthStore((state) => state.setUser)
  const logoutStore = useAuthStore((state) => state.logout)
  const scanTokenRef = useRef('')
  const toastTimerRef = useRef<number | null>(null)
  const [tab, setTab] = useState<MainTab>('dashboard')
  const [manageTab, setManageTab] = useState<ManageTab>('profile')
  const [booting, setBooting] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const [profile, setProfile] = useState<MerchantProfile | null>(null)
  const [profileForm, setProfileForm] = useState<MerchantProfile | null>(null)
  const [transactions, setTransactions] = useState<MerchantTransaction[]>([])
  const [promotions, setPromotions] = useState<MerchantPromotion[]>([])
  const [products, setProducts] = useState<MerchantProduct[]>([])
  const [notifications, setNotifications] = useState<MerchantNotification[]>([])

  const [scanToken, setScanToken] = useState('')
  const [amountSpent, setAmountSpent] = useState('')
  const [redeeming, setRedeeming] = useState(false)
  const [scanResult, setScanResult] = useState<MerchantTransaction | null>(null)
  const [toast, setToast] = useState<ToastState | null>(null)
  const [promotionDraft, setPromotionDraft] = useState<Partial<MerchantPromotion>>(blankPromotion)
  const [productDraft, setProductDraft] = useState<Partial<MerchantProduct>>(blankProduct)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPromotion, setSavingPromotion] = useState(false)
  const [savingProduct, setSavingProduct] = useState(false)

  const loadWorkspace = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [profileNext, promotionsNext, productsNext, transactionsNext, notificationsNext] = await Promise.all([
        getMerchantProfile(),
        getMerchantPromotions(),
        getMerchantProducts(),
        getMerchantTransactions(),
        getMerchantNotifications(),
      ])
      setProfile(profileNext)
      setProfileForm(profileNext)
      setPromotions(promotionsNext)
      setProducts(productsNext)
      setTransactions(transactionsNext)
      setNotifications(notificationsNext)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load merchant workspace.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current)
      }
    }
  }, [])

  const showToast = useCallback((tone: ToastState['tone'], message: string) => {
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current)
    }
    setToast({ id: Date.now(), tone, message })
    toastTimerRef.current = window.setTimeout(() => setToast(null), 3600)
  }, [])

  useEffect(() => {
    let mounted = true
    const auth = getFirebaseAuth()
    const unsubscribe = auth.onAuthStateChanged((firebaseUser) => {
      void (async () => {
        if (!mounted) return
        if (!firebaseUser) {
          logoutStore()
          router.replace('/login')
          return
        }

        try {
          const currentUser = await getCurrentMerchant()
          if (!mounted) return
          setUser(currentUser)
          if (currentUser.mustChangePassword) {
            router.replace('/change-password')
            return
          }
          await loadWorkspace()
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Unable to verify your merchant session.')
        } finally {
          if (mounted) setBooting(false)
        }
      })()
    })

    return () => {
      mounted = false
      unsubscribe()
    }
  }, [loadWorkspace, logoutStore, router, setUser])

  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    const month = new Date().toISOString().slice(0, 7)
    const successful = transactions.filter((transaction) => transaction.status === 'success')
    const todayTransactions = successful.filter((transaction) => transaction.createdAt.slice(0, 10) === today)
    return {
      scansToday: todayTransactions.length,
      pointsToday: todayTransactions.reduce((sum, transaction) => sum + transaction.pointsAwarded, 0),
      monthTransactions: successful.filter((transaction) => transaction.createdAt.slice(0, 7) === month).length,
      activePromotions: promotions.filter((promotion) => promotion.isActive).length,
      unreadAlerts: notifications.filter((notification) => !notification.read).length,
    }
  }, [notifications, promotions, transactions])

  const amountValue = Number(amountSpent)
  const hasValidAmount = Number.isFinite(amountValue) && amountValue > 0
  const scannerDisabledMessage = !hasValidAmount
    ? 'Enter the purchase amount before opening the scanner.'
    : scanToken
      ? 'QR already captured. Redeem or clear it before scanning again.'
      : redeeming
        ? 'Redeeming points. Scanner is paused.'
        : ''
  const scannerActive = tab === 'scan' && !scannerDisabledMessage

  const decoded = useCallback((value: string) => {
    const normalizedToken = value.trim()
    if (!normalizedToken) return

    if (!hasValidAmount) {
      showToast('danger', 'Enter the purchase amount before scanning a QR code.')
      return
    }

    if (scanTokenRef.current || scanToken) {
      showToast('danger', 'A QR code is already captured. Redeem or clear it first.')
      return
    }

    scanTokenRef.current = normalizedToken
    setScanToken(normalizedToken)
    setNotice('QR token captured. Enter the purchase amount to redeem.')
    showToast('success', 'QR captured. Review the amount, then redeem points.')
  }, [hasValidAmount, scanToken, showToast])

  function handleScanTokenChange(value: string) {
    setScanToken(value)
    scanTokenRef.current = value.trim()
  }

  function clearScanToken() {
    setScanToken('')
    scanTokenRef.current = ''
    setScanResult(null)
    setNotice('')
  }

  async function handleRedeem(event: FormEvent) {
    event.preventDefault()
    if (!hasValidAmount) {
      const message = 'Enter the purchase amount before redeeming points.'
      setError(message)
      showToast('danger', message)
      return
    }

    if (!scanToken.trim()) {
      const message = 'Scan or enter a member QR token first.'
      setError(message)
      showToast('danger', message)
      return
    }

    setRedeeming(true)
    setError('')
    setNotice('')
    setScanResult(null)

    try {
      const transaction = await redeemQr(scanToken, Number(amountSpent))
      setScanResult(transaction)
      setScanToken('')
      scanTokenRef.current = ''
      setAmountSpent('')
      setTransactions((current) => [transaction, ...current])
      const message = `${transaction.memberLabel} earned ${transaction.pointsAwarded} points.`
      setNotice(message)
      showToast('success', message)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to process this redemption.'
      setError(message)
      showToast('danger', message)
    } finally {
      setRedeeming(false)
    }
  }

  async function handleSaveProfile(event: FormEvent) {
    event.preventDefault()
    if (!profileForm) return
    setSavingProfile(true)
    setError('')
    setNotice('')
    try {
      const nextProfile = await updateMerchantProfile(profileForm)
      setProfile(nextProfile)
      setProfileForm(nextProfile)
      setNotice('Shop profile updated.')
      showToast('success', 'Shop profile updated.')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to save shop profile.'
      setError(message)
      showToast('danger', message)
    } finally {
      setSavingProfile(false)
    }
  }

  async function handleSavePromotion(event: FormEvent) {
    event.preventDefault()
    setSavingPromotion(true)
    setError('')
    setNotice('')
    try {
      await saveMerchantPromotion(promotionDraft)
      setPromotionDraft({ ...blankPromotion })
      setPromotions(await getMerchantPromotions())
      setNotice('Promotion saved.')
      showToast('success', 'Promotion saved.')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to save promotion.'
      setError(message)
      showToast('danger', message)
    } finally {
      setSavingPromotion(false)
    }
  }

  async function handleDeletePromotion(id: string) {
    if (!window.confirm('Delete this promotion?')) return
    setError('')
    try {
      await deleteMerchantPromotion(id)
      setPromotions(await getMerchantPromotions())
      setNotice('Promotion deleted.')
      showToast('info', 'Promotion deleted.')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to delete promotion.'
      setError(message)
      showToast('danger', message)
    }
  }

  async function handleSaveProduct(event: FormEvent) {
    event.preventDefault()
    setSavingProduct(true)
    setError('')
    setNotice('')
    try {
      await saveMerchantProduct(productDraft)
      setProductDraft({ ...blankProduct })
      setProducts(await getMerchantProducts())
      setNotice('Product or service saved.')
      showToast('success', 'Product or service saved.')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to save product or service.'
      setError(message)
      showToast('danger', message)
    } finally {
      setSavingProduct(false)
    }
  }

  async function handleDeleteProduct(id: string) {
    if (!window.confirm('Delete this product or service?')) return
    setError('')
    try {
      await deleteMerchantProduct(id)
      setProducts(await getMerchantProducts())
      setNotice('Product or service deleted.')
      showToast('info', 'Product or service deleted.')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to delete product or service.'
      setError(message)
      showToast('danger', message)
    }
  }

  async function handleMarkAlertsRead() {
    setError('')
    try {
      setNotifications(await markAllNotificationsRead())
      setNotice('Alerts marked as read.')
      showToast('success', 'Alerts marked as read.')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to update alerts.'
      setError(message)
      showToast('danger', message)
    }
  }

  async function handleLogout() {
    await signOutMerchant()
    logoutStore()
    router.replace('/login')
  }

  if (booting) {
    return (
      <main className="merchant-shell grid min-h-screen place-items-center px-6">
        <div className="surface w-full max-w-sm rounded-[2rem] p-6 text-center">
          <Loader2 className="mx-auto h-7 w-7 animate-spin text-[color:var(--merchant-blue)]" />
          <p className="mt-4 text-sm font-semibold text-slate-600">Verifying merchant session...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="merchant-shell min-h-screen pb-28 lg:pb-10 lg:pl-32">
      <Toast toast={toast} onDismiss={() => setToast(null)} />
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-5 sm:px-6 lg:py-8">
        <header className="surface overflow-hidden rounded-[2rem]">
          {profile?.bannerUrl ? (
            <div className="h-32 w-full bg-cover bg-center sm:h-44" style={{ backgroundImage: `url(${profile.bannerUrl})` }} />
          ) : (
            <div className="youth-gradient-band h-32 w-full sm:h-44" />
          )}
          <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-end gap-4">
              <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-3xl border-4 border-white bg-white shadow-lg">
                {profile?.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.logoUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Store className="h-9 w-9 text-[color:var(--merchant-blue)]" />
                )}
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-[color:var(--merchant-teal)]">Merchant Workspace</p>
                <h1 className="text-2xl font-black sm:text-3xl">{profile?.businessName || user?.UserName || 'Merchant'}</h1>
                <p className="mt-1 text-sm text-[color:var(--merchant-muted)]">{profile?.category || 'Shop'} - {profile?.address || 'Barangay Buting'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge value={profile?.status || 'pending'} />
              <button onClick={loadWorkspace} className="ghost-button" disabled={loading}>
                <RefreshCw className={cn('h-4 w-4', loading ? 'animate-spin' : '')} />
                Refresh
              </button>
            </div>
          </div>
        </header>

        {error ? <Alert tone="danger">{error}</Alert> : null}
        {notice ? <Alert tone="success">{notice}</Alert> : null}

        {tab === 'dashboard' ? (
          <section className="grid gap-4 lg:grid-cols-[1fr_0.75fr]">
            <Panel title="Today">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat label="Scans" value={stats.scansToday} />
                <Stat label="Points" value={stats.pointsToday} />
                <Stat label="Month Txns" value={stats.monthTransactions} />
                <Stat label="Promos" value={stats.activePromotions} />
              </div>
              <div className="glass-tile mt-5 rounded-3xl p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-black">Scan-first workflow</p>
                    <p className="text-xs leading-5 text-[color:var(--merchant-muted)]">Open scanner, enter purchase amount, and redeem youth member QR points.</p>
                  </div>
                  <button onClick={() => setTab('scan')} className="primary-button min-w-24">
                    <QrCode className="h-4 w-4" />
                    Scan
                  </button>
                </div>
              </div>
            </Panel>

            <Panel title="Recent Activity" action={<span className="text-xs font-bold text-[color:var(--merchant-teal)]">{stats.unreadAlerts} unread</span>}>
              <div className="flex flex-col gap-3">
                {transactions.slice(0, 4).map((transaction) => (
                  <TransactionRow key={transaction.id} transaction={transaction} />
                ))}
                {transactions.length === 0 ? <Empty text="No transactions yet." /> : null}
              </div>
            </Panel>
          </section>
        ) : null}

        {tab === 'scan' ? (
          <section className="grid gap-4 lg:grid-cols-[0.9fr_1fr]">
            <Panel title="QR Scanner" action={<span className="rounded-full bg-white/80 px-3 py-1 text-[0.7rem] font-black text-[color:var(--merchant-blue)]">{hasValidAmount ? 'Ready' : 'Amount Required'}</span>}>
              <QRScanner active={scannerActive} disabledMessage={scannerDisabledMessage} onDecode={decoded} />
            </Panel>
            <Panel title="Redeem Purchase">
              <form className="flex flex-col gap-4" onSubmit={handleRedeem}>
                <label className="text-sm font-bold text-slate-700">
                  Purchase amount
                  <input value={amountSpent} onChange={(event) => setAmountSpent(event.target.value)} className="field mt-2" type="number" min="1" step="0.01" inputMode="decimal" placeholder="0.00" required />
                </label>
                <label className="text-sm font-bold text-slate-700">
                  Member QR token
                  <textarea value={scanToken} onChange={(event) => handleScanTokenChange(event.target.value)} className="field mt-2 min-h-28 resize-none" placeholder="Scan or paste the QR token here" required />
                </label>
                {scanToken ? (
                  <button type="button" onClick={clearScanToken} className="ghost-button">
                    Clear Captured QR
                  </button>
                ) : null}
                <button className="primary-button" disabled={redeeming} type="submit">
                  {redeeming ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  {redeeming ? 'Redeeming...' : 'Redeem Points'}
                </button>
              </form>
              {scanResult ? (
                <div className="mt-5 rounded-3xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                  <p className="font-black">{scanResult.memberLabel}</p>
                  <p className="mt-1">Purchase: {peso(scanResult.amountSpent)} - Points: {scanResult.pointsAwarded}</p>
                </div>
              ) : null}
            </Panel>
          </section>
        ) : null}

        {tab === 'transactions' ? (
          <Panel title="Transactions">
            <div className="flex flex-col gap-3">
              {transactions.map((transaction) => (
                <TransactionRow key={transaction.id} transaction={transaction} />
              ))}
              {transactions.length === 0 ? <Empty text="Transactions from QR redemptions will appear here." /> : null}
            </div>
          </Panel>
        ) : null}

        {tab === 'manage' ? (
          <section className="grid gap-4 lg:grid-cols-[220px_1fr]">
            <Panel title="Manage">
              <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
                <ManageButton active={manageTab === 'profile'} onClick={() => setManageTab('profile')} icon={<Store className="h-4 w-4" />}>Shop</ManageButton>
                <ManageButton active={manageTab === 'promotions'} onClick={() => setManageTab('promotions')} icon={<Bell className="h-4 w-4" />}>Promos</ManageButton>
                <ManageButton active={manageTab === 'products'} onClick={() => setManageTab('products')} icon={<Package className="h-4 w-4" />}>Products</ManageButton>
                <ManageButton active={manageTab === 'alerts'} onClick={() => setManageTab('alerts')} icon={<Bell className="h-4 w-4" />}>Alerts</ManageButton>
              </div>
            </Panel>

            {manageTab === 'profile' && profileForm ? (
              <Panel title="Shop Profile">
                <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSaveProfile}>
                  <Field label="Business name" value={profileForm.businessName} onChange={(value) => setProfileForm({ ...profileForm, businessName: value })} />
                  <Field label="Category" value={profileForm.category} onChange={(value) => setProfileForm({ ...profileForm, category: value })} />
                  <Field label="Contact number" value={profileForm.contactNumber} onChange={(value) => setProfileForm({ ...profileForm, contactNumber: value })} />
                  <Field label="Address" value={profileForm.address} onChange={(value) => setProfileForm({ ...profileForm, address: value })} />
                  <Field label="Logo URL" value={profileForm.logoUrl} onChange={(value) => setProfileForm({ ...profileForm, logoUrl: value })} />
                  <Field label="Banner URL" value={profileForm.bannerUrl} onChange={(value) => setProfileForm({ ...profileForm, bannerUrl: value })} />
                  <TextField label="Short description" value={profileForm.shortDescription} onChange={(value) => setProfileForm({ ...profileForm, shortDescription: value })} />
                  <TextField label="Terms and conditions" value={profileForm.termsAndConditions} onChange={(value) => setProfileForm({ ...profileForm, termsAndConditions: value })} />
                  <div className="md:col-span-2">
                    <button className="primary-button" disabled={savingProfile} type="submit">
                      <Save className="h-4 w-4" />
                      {savingProfile ? 'Saving...' : 'Save Profile'}
                    </button>
                  </div>
                </form>
              </Panel>
            ) : null}

            {manageTab === 'promotions' ? (
              <Panel title="Promotions">
                <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSavePromotion}>
                  <Field label="Title" value={promotionDraft.title || ''} onChange={(value) => setPromotionDraft({ ...promotionDraft, title: value })} />
                  <Field label="Value label" value={promotionDraft.valueLabel || ''} onChange={(value) => setPromotionDraft({ ...promotionDraft, valueLabel: value })} />
                  <Field label="Start date" type="date" value={promotionDraft.startDate || ''} onChange={(value) => setPromotionDraft({ ...promotionDraft, startDate: value })} />
                  <Field label="End date" type="date" value={promotionDraft.endDate || ''} onChange={(value) => setPromotionDraft({ ...promotionDraft, endDate: value })} />
                  <Field label="Banner URL" value={promotionDraft.bannerUrl || ''} onChange={(value) => setPromotionDraft({ ...promotionDraft, bannerUrl: value })} />
                  <Field label="Availability" value={promotionDraft.availability || 'all'} onChange={(value) => setPromotionDraft({ ...promotionDraft, availability: value as MerchantPromotion['availability'] })} />
                  <TextField label="Tagline" value={promotionDraft.shortTagline || ''} onChange={(value) => setPromotionDraft({ ...promotionDraft, shortTagline: value })} />
                  <TextField label="Terms, one per line" value={(promotionDraft.terms || []).join('\n')} onChange={(value) => setPromotionDraft({ ...promotionDraft, terms: value.split(/\r?\n/).map((term) => term.trim()).filter(Boolean) })} />
                  <div className="flex flex-wrap gap-2 md:col-span-2">
                    <button className="primary-button" disabled={savingPromotion} type="submit">
                      <Plus className="h-4 w-4" />
                      {promotionDraft.id ? 'Update Promotion' : 'Create Promotion'}
                    </button>
                    {promotionDraft.id ? <button className="ghost-button" type="button" onClick={() => setPromotionDraft({ ...blankPromotion })}>Cancel Edit</button> : null}
                  </div>
                </form>
                <ListGrid items={promotions} empty="No promotions yet." render={(promotion) => (
                  <CatalogCard
                    key={promotion.id}
                    title={promotion.title}
                    subtitle={`${promotion.valueLabel || 'Promo'} - ${promotion.isActive ? 'Active' : 'Inactive'}`}
                    imageUrl={promotion.bannerUrl}
                    onEdit={() => setPromotionDraft({ ...promotion })}
                    onDelete={() => handleDeletePromotion(promotion.id)}
                  />
                )} />
              </Panel>
            ) : null}

            {manageTab === 'products' ? (
              <Panel title="Products and Services">
                <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSaveProduct}>
                  <Field label="Name" value={productDraft.name || ''} onChange={(value) => setProductDraft({ ...productDraft, name: value })} />
                  <Field label="Price" type="number" value={String(productDraft.price || '')} onChange={(value) => setProductDraft({ ...productDraft, price: Number(value || 0) })} />
                  <Field label="Category" value={productDraft.category || ''} onChange={(value) => setProductDraft({ ...productDraft, category: value })} />
                  <Field label="Image URL" value={productDraft.imageUrl || ''} onChange={(value) => setProductDraft({ ...productDraft, imageUrl: value })} />
                  <TextField label="Description" value={productDraft.description || ''} onChange={(value) => setProductDraft({ ...productDraft, description: value })} />
                  <div className="flex flex-wrap gap-2 md:col-span-2">
                    <button className="primary-button" disabled={savingProduct} type="submit">
                      <Plus className="h-4 w-4" />
                      {productDraft.id ? 'Update Product' : 'Create Product'}
                    </button>
                    {productDraft.id ? <button className="ghost-button" type="button" onClick={() => setProductDraft({ ...blankProduct })}>Cancel Edit</button> : null}
                  </div>
                </form>
                <ListGrid items={products} empty="No products or services yet." render={(product) => (
                  <CatalogCard
                    key={product.id}
                    title={product.name}
                    subtitle={`${peso(product.price)} - ${product.category || 'Item'}`}
                    imageUrl={product.imageUrl}
                    onEdit={() => setProductDraft({ ...product })}
                    onDelete={() => handleDeleteProduct(product.id)}
                  />
                )} />
              </Panel>
            ) : null}

            {manageTab === 'alerts' ? (
              <Panel title="Alerts" action={<button onClick={handleMarkAlertsRead} className="ghost-button text-xs">Mark all read</button>}>
                <AlertList notifications={notifications} />
              </Panel>
            ) : null}
          </section>
        ) : null}

        {tab === 'account' ? (
          <Panel title="Account">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-lg font-black">{user?.UserName || profile?.ownerName || 'Merchant'}</p>
                <p className="text-sm text-[color:var(--merchant-muted)]">{user?.email || profile?.email}</p>
              </div>
              <button onClick={handleLogout} className="ghost-button text-rose-700">
                <LogOut className="h-4 w-4" />
                Log Out
              </button>
            </div>
          </Panel>
        ) : null}
      </div>

      <nav className="bottom-nav grid grid-cols-5 gap-1 p-2 lg:grid-cols-1">
        <NavButton active={tab === 'dashboard'} onClick={() => setTab('dashboard')} icon={<Home className="h-5 w-5" />} label="Home" />
        <NavButton active={tab === 'transactions'} onClick={() => setTab('transactions')} icon={<History className="h-5 w-5" />} label="Sales" />
        <NavButton active={tab === 'scan'} onClick={() => setTab('scan')} icon={<QrCode className="h-5 w-5" />} label="Scan" featured />
        <NavButton active={tab === 'manage'} onClick={() => setTab('manage')} icon={<Settings className="h-5 w-5" />} label="Manage" />
        <NavButton active={tab === 'account'} onClick={() => setTab('account')} icon={<Store className="h-5 w-5" />} label="Account" />
      </nav>
    </main>
  )
}

function Panel({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="surface rounded-[1.75rem] p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-black text-[color:var(--merchant-ink)]">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

function NavButton({ active, featured, icon, label, onClick }: { active: boolean; featured?: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      className={cn(
        'flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl text-[0.68rem] font-black transition',
        active ? 'bg-[#f6f9ff] text-[#FCB315]' : 'text-[#66748B]',
        featured
          ? 'mx-auto -mt-7 h-[76px] w-[76px] rounded-full border-[7px] border-white bg-[#0f4c97] text-white shadow-[0_16px_28px_rgba(15,76,151,0.24)] lg:mt-0'
          : '',
        featured && active ? 'text-[#FCB315]' : ''
      )}
      onClick={onClick}
      type="button"
    >
      {icon}
      <span>{label}</span>
    </button>
  )
}

function ManageButton({ active, icon, children, onClick }: { active: boolean; icon: React.ReactNode; children: React.ReactNode; onClick: () => void }) {
  return (
    <button className={cn('ghost-button justify-start', active ? 'border-[#FCB315]/60 bg-[#f6f9ff] text-[#0f4c97]' : '')} onClick={onClick} type="button">
      {icon}
      {children}
    </button>
  )
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="glass-tile rounded-3xl p-4">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-[color:var(--merchant-muted)]">{label}</p>
      <p className="mt-2 text-2xl font-black text-[color:var(--merchant-ink)]">{value}</p>
    </div>
  )
}

function StatusBadge({ value }: { value: string }) {
  const active = value === 'active'
  const suspended = value === 'suspended'
  return (
    <span className={cn('rounded-full px-3 py-1 text-xs font-black', active ? 'bg-emerald-50 text-emerald-700' : suspended ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700')}>
      {value.charAt(0).toUpperCase() + value.slice(1)}
    </span>
  )
}

function Alert({ tone, children }: { tone: 'success' | 'danger'; children: React.ReactNode }) {
  return (
    <div className={cn('rounded-3xl border px-4 py-3 text-sm font-semibold', tone === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-700')}>
      {children}
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return <div className="glass-tile rounded-3xl border-dashed px-4 py-8 text-center text-sm font-semibold text-[color:var(--merchant-muted)]">{text}</div>
}

function TransactionRow({ transaction }: { transaction: MerchantTransaction }) {
  return (
    <div className="glass-tile flex items-center justify-between gap-4 rounded-3xl p-4">
      <div>
        <p className="font-black">{transaction.memberLabel}</p>
        <p className="text-xs text-[color:var(--merchant-muted)]">{transaction.memberIdMasked} - {shortDate(transaction.createdAt)}</p>
      </div>
      <div className="text-right">
        <p className="font-black">{peso(transaction.amountSpent)}</p>
        <p className="text-xs font-bold text-[color:var(--merchant-teal)]">+{transaction.pointsAwarded} pts</p>
      </div>
    </div>
  )
}

function Field({ label, type = 'text', value, onChange }: { label: string; type?: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="text-sm font-bold text-slate-700">
      {label}
      <input className="field mt-2" type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="text-sm font-bold text-slate-700 md:col-span-2">
      {label}
      <textarea className="field mt-2 min-h-28 resize-y" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}

function ListGrid<T>({ items, empty, render }: { items: T[]; empty: string; render: (item: T) => React.ReactNode }) {
  return (
    <div className="mt-6 grid gap-3 md:grid-cols-2">
      {items.length === 0 ? <div className="md:col-span-2"><Empty text={empty} /></div> : items.map(render)}
    </div>
  )
}

function CatalogCard({ title, subtitle, imageUrl, onEdit, onDelete }: { title: string; subtitle: string; imageUrl?: string; onEdit: () => void; onDelete: () => void }) {
  return (
    <article className="glass-tile overflow-hidden rounded-3xl">
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" className="h-28 w-full object-cover" />
      ) : (
        <div className="grid h-28 place-items-center bg-[#eaf5ff] text-[#0f4c97]">
          <Package className="h-8 w-8" />
        </div>
      )}
      <div className="p-4">
        <p className="font-black">{title}</p>
        <p className="mt-1 text-xs text-[color:var(--merchant-muted)]">{subtitle}</p>
        <div className="mt-4 flex gap-2">
          <button className="ghost-button h-10 min-h-10 flex-1 text-xs" onClick={onEdit} type="button">
            <Pencil className="h-4 w-4" />
            Edit
          </button>
          <button className="ghost-button h-10 min-h-10 text-xs text-rose-700" onClick={onDelete} type="button">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </article>
  )
}

function AlertList({ notifications }: { notifications: MerchantNotification[] }) {
  if (notifications.length === 0) return <Empty text="No alerts yet." />

  return (
    <div className="flex flex-col gap-3">
      {notifications.map((notification) => (
        <article key={notification.id} className={cn('rounded-3xl border p-4 backdrop-blur-xl', notification.read ? 'border-white/80 bg-white/72' : 'border-[#FCB315]/60 bg-[#fff8e8]/86')}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-black">{notification.title}</p>
              <p className="mt-1 text-sm leading-6 text-[color:var(--merchant-muted)]">{notification.body}</p>
            </div>
            {!notification.read ? <span className="rounded-full bg-[color:var(--merchant-gold)] px-2 py-1 text-[0.65rem] font-black text-[color:var(--merchant-ink)]">New</span> : null}
          </div>
          <p className="mt-3 text-xs font-semibold text-slate-400">{shortDate(notification.createdAt)}</p>
        </article>
      ))}
    </div>
  )
}

function Toast({ toast, onDismiss }: { toast: ToastState | null; onDismiss: () => void }) {
  if (!toast) return null

  const isDanger = toast.tone === 'danger'
  const isSuccess = toast.tone === 'success'

  return (
    <div className="pointer-events-none fixed inset-x-4 top-4 z-50 flex justify-center">
      <div
        key={toast.id}
        className={cn(
          'toast-enter pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-[1.4rem] border px-4 py-3 text-sm font-bold shadow-[0_16px_36px_rgba(15,76,151,0.18)] backdrop-blur-xl',
          isDanger
            ? 'border-rose-200 bg-rose-50/94 text-rose-700'
            : isSuccess
              ? 'border-emerald-200 bg-emerald-50/94 text-emerald-800'
              : 'border-[#b9d6f0] bg-white/94 text-[#0f4c97]'
        )}
      >
        <span className={cn('mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full', isDanger ? 'bg-rose-100' : isSuccess ? 'bg-emerald-100' : 'bg-[#f6f9ff]')}>
          {isDanger ? <AlertCircle className="h-4 w-4" /> : isSuccess ? <CheckCircle2 className="h-4 w-4" /> : <Info className="h-4 w-4" />}
        </span>
        <p className="min-w-0 flex-1 leading-5">{toast.message}</p>
        <button type="button" onClick={onDismiss} className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/60 text-base leading-none">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
