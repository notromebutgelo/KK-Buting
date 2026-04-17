'use client'

import { useEffect, useState } from 'react'

import Modal from '@/components/ui/Modal'
import AlertModal from '@/components/ui/AlertModal'
import Spinner from '@/components/ui/Spinner'
import { usePoints } from '@/hooks/usePoints'
import api from '@/lib/api'
import { getVerificationStatus } from '@/services/verification.service'
import { cn } from '@/utils/cn'
import { formatPoints } from '@/utils/formatPoints'

interface EligibilityConditions {
  minAge?: number
  maxAge?: number
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
  claimedByMe?: boolean
  status?: string
  expiresAt?: string | null
}

interface ClaimResult {
  voucherId: string
  voucherTitle: string
  claimedAt: string
}

type Tab = 'available' | 'claimed' | 'expired'

// ─── Icons ────────────────────────────────────────────────────────────────────

function VoucherIcon({ className = 'h-7 w-7' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
    </svg>
  )
}

function CheckIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(value?: string | null) {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })
}

function buildEligibilityTag(cond?: EligibilityConditions): string | null {
  if (!cond) return null
  const parts: string[] = []
  if (cond.minAge) parts.push(`${cond.minAge}+`)
  if (cond.maxAge) parts.push(`≤ ${cond.maxAge}`)
  if (cond.ageGroup) parts.push(cond.ageGroup)
  if (cond.isVerified) parts.push('Verified only')
  return parts.length ? parts.join(' · ') : null
}

// ─── Claim Success Modal ───────────────────────────────────────────────────────

function ClaimSuccessModal({
  result,
  onViewClaimed,
  onClose,
}: {
  result: ClaimResult | null
  onViewClaimed: () => void
  onClose: () => void
}) {
  if (!result) return null
  // Shorten voucherId to an 8-char uppercase ref code for display
  const refCode = result.voucherId.slice(-8).toUpperCase()

  return (
    <Modal isOpen onClose={onClose} size="sm">
      <div className="flex flex-col items-center gap-4 pt-2 pb-1">
        {/* Icon */}
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <CheckIcon className="h-8 w-8" />
        </div>

        <div className="text-center">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-600">Voucher Claimed!</p>
          <h2 className="mt-1 text-[20px] font-black text-[#0d4f92]">{result.voucherTitle}</h2>
          <p className="mt-1 text-sm text-[#6d87a4]">Your voucher has been successfully claimed.</p>
        </div>

        {/* Claim reference */}
        <div className="w-full rounded-2xl border border-[#d8e8f8] bg-[#f4f8ff] px-4 py-4 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#7d9ab5]">Claim Reference</p>
          <p className="mt-1 font-mono text-[22px] font-black tracking-widest text-[#0d4f92]">
            {refCode}
          </p>
          <p className="mt-1 text-[10px] text-[#8aa5c0]">
            Claimed {formatDate(result.claimedAt) ?? 'just now'}
          </p>
        </div>

        {/* Actions */}
        <div className="flex w-full flex-col gap-2">
          <button
            type="button"
            onClick={() => { onViewClaimed(); onClose() }}
            className="w-full rounded-2xl bg-[#014384] py-3 text-sm font-black text-white hover:bg-[#013070] active:scale-[0.98] transition"
          >
            View My Claimed Vouchers
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-2xl bg-gray-100 py-3 text-sm font-black text-gray-500 hover:bg-gray-200 transition"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function VouchersPage() {
  const [vouchers, setVouchers] = useState<Voucher[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('available')
  const [claiming, setClaiming] = useState<string | null>(null)
  const [claimResult, setClaimResult] = useState<ClaimResult | null>(null)
  const [errorTitle, setErrorTitle] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [showError, setShowError] = useState(false)
  const [verificationStatus, setVerificationStatus] = useState<string>('')
  const { data: pointsData, isLoading: isPointsLoading, refresh: refreshPoints } = usePoints()

  useEffect(() => {
    loadVouchers()
    getVerificationStatus()
      .then((data) => setVerificationStatus(String(data?.status || data?.verificationStatus || '')))
      .catch(() => {})
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

  function showErrorAlert(title: string, message: string) {
    setErrorTitle(title)
    setErrorMessage(message)
    setShowError(true)
  }

  async function handleClaim(voucher: Voucher) {
    const cond = voucher.eligibilityConditions

    // Pre-flight: verification
    if (cond?.isVerified && verificationStatus.toLowerCase() !== 'verified') {
      showErrorAlert(
        'Verification Required',
        'Your account is not yet verified. Please complete your KK verification before claiming this voucher.'
      )
      return
    }

    // Pre-flight: points
    const pointsCost = Number(voucher.pointsCost ?? 0)
    if (pointsCost > 0) {
      const balance = Number(pointsData?.totalPoints ?? 0)
      if (balance < pointsCost) {
        showErrorAlert(
          'Insufficient Points',
          `You need ${formatPoints(pointsCost)} pts to claim this voucher but only have ${formatPoints(balance)} pts.`
        )
        return
      }
    }

    setClaiming(voucher.id)
    try {
      // BUG 1 FIX: store the full response and confirm success via voucherId presence
      const res = await api.post(`/vouchers/${voucher.id}/claim`)
      console.log('[claim response]', res.data)

      const { voucherId, claimedAt } = res.data as { voucherId?: string; claimedAt?: string }

      if (!voucherId) {
        // Response came back 2xx but without expected fields — treat as unexpected
        showErrorAlert('Unexpected Response', 'The server did not confirm the claim. Please try again.')
        return
      }

      // BUG 2 FIX: re-fetch full list so claimedByMe flag updates and tabs recompute
      await Promise.all([loadVouchers(), refreshPoints?.()])

      // ADDITIONAL: show claim success modal with reference code
      setClaimResult({
        voucherId,
        voucherTitle: voucher.title,
        claimedAt: claimedAt ?? new Date().toISOString(),
      })
    } catch (err: any) {
      // BUG 1 FIX: catch ONLY fires on actual HTTP errors (4xx/5xx) with axios
      const msg = String(err?.response?.data?.error || err?.message || 'Something went wrong.')
      showErrorAlert('Could Not Claim', msg)
    } finally {
      setClaiming(null)
    }
  }

  // claimedByMe may be absent on older responses — treat missing/falsy as "not claimed"
  const available = vouchers.filter((v) => v.status === 'active' && !v.claimedByMe)
  const claimed   = vouchers.filter((v) => Boolean(v.claimedByMe))
  const expired   = vouchers.filter((v) => v.status === 'expired' && !v.claimedByMe)

  const tabList: { key: Tab; label: string; count: number }[] = [
    { key: 'available', label: 'Available', count: available.length },
    { key: 'claimed',   label: 'Claimed',   count: claimed.length },
    { key: 'expired',   label: 'Expired',   count: expired.length },
  ]

  const displayed =
    activeTab === 'available' ? available :
    activeTab === 'claimed'   ? claimed   :
    expired

  const emptyMessages: Record<Tab, { title: string; body: string }> = {
    available: { title: 'No vouchers available',   body: 'Check back soon for new SK youth vouchers.' },
    claimed:   { title: 'No claimed vouchers yet', body: 'Vouchers you claim will appear here.' },
    expired:   { title: 'No expired vouchers',     body: 'Expired unclaimed vouchers will appear here.' },
  }

  return (
    <div className="min-h-full bg-[#0a5ca8] pb-28">
      {/* Header */}
      <section className="rounded-b-[34px] bg-[linear-gradient(180deg,#7eb0df_0%,#ffffff_42%,#ffffff_100%)] px-4 pb-6 pt-5 shadow-[0_18px_34px_rgba(0,54,122,0.18)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#5c7ca1]">KK Vouchers</p>
            <h1 className="mt-1 text-[26px] font-black tracking-[-0.03em] text-[#0d4f92]">Vouchers</h1>
          </div>
          <div className="rounded-[18px] bg-white/85 px-3 py-2 text-right shadow-[0_10px_20px_rgba(0,54,122,0.08)]">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#f09000]">Barangay Buting</p>
            <p className="mt-1 text-[11px] font-semibold text-[#5b7896]">Youth member benefits</p>
          </div>
        </div>
      </section>

      <div className="px-4 py-5 space-y-5">
        {/* Points balance */}
        <div className="rounded-[24px] bg-[#0d4f92] px-4 py-4 text-white shadow-[0_18px_30px_rgba(4,60,121,0.24)]">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/70">Available Points</p>
          <p className="mt-1 text-[36px] font-black leading-none">
            {isPointsLoading ? '…' : formatPoints(pointsData?.totalPoints || 0)}
            <span className="ml-1 text-base font-bold text-white/80">POINTS</span>
          </p>
          <p className="mt-2 text-xs font-semibold text-white/70">
            Points are deducted when you claim points-based vouchers.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 rounded-2xl bg-[#0d4f92]/40 p-1">
          {tabList.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-[12px] font-black transition',
                activeTab === tab.key
                  ? 'bg-white text-[#0d4f92] shadow-sm'
                  : 'text-white/70 hover:text-white'
              )}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={cn(
                  'rounded-full px-1.5 py-0.5 text-[10px] font-black leading-none',
                  activeTab === tab.key ? 'bg-[#0d4f92] text-white' : 'bg-white/20 text-white'
                )}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Voucher list */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Spinner size="lg" />
          </div>
        ) : displayed.length === 0 ? (
          <div className="rounded-[28px] bg-white px-6 py-12 text-center shadow-[0_14px_30px_rgba(4,60,121,0.2)]">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#f4f8ff] text-[#0d4f92]">
              <VoucherIcon />
            </div>
            <p className="mt-4 text-lg font-black text-[#0d4f92]">{emptyMessages[activeTab].title}</p>
            <p className="mt-2 text-sm text-[#6d87a4]">{emptyMessages[activeTab].body}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {displayed.map((voucher) => (
              <VoucherCard
                key={voucher.id}
                voucher={voucher}
                eligTag={buildEligibilityTag(voucher.eligibilityConditions)}
                isClaiming={claiming === voucher.id}
                onClaim={() => void handleClaim(voucher)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Claim success modal */}
      <ClaimSuccessModal
        result={claimResult}
        onViewClaimed={() => setActiveTab('claimed')}
        onClose={() => setClaimResult(null)}
      />

      {/* Error alert */}
      <AlertModal
        isOpen={showError}
        title={errorTitle}
        message={errorMessage}
        onClose={() => setShowError(false)}
      />
    </div>
  )
}

// ─── Voucher Card ─────────────────────────────────────────────────────────────

function VoucherCard({
  voucher,
  eligTag,
  isClaiming,
  onClaim,
}: {
  voucher: Voucher
  eligTag: string | null
  isClaiming: boolean
  onClaim: () => void
}) {
  const isFree      = Number(voucher.pointsCost) === 0
  const expiryStr   = formatDate(voucher.expiresAt)
  const isClaimed   = voucher.claimedByMe === true
  const isExpired   = voucher.status === 'expired'
  const isOutOfStock = !isClaimed && !isExpired && Number(voucher.stock) === 0

  return (
    <div className={cn(
      'overflow-hidden rounded-[24px] bg-white shadow-[0_14px_28px_rgba(4,60,121,0.18)]',
      (isClaimed || isExpired) && 'opacity-80'
    )}>
      {/* Colour bar */}
      <div className={cn(
        'h-2',
        isClaimed  ? 'bg-[linear-gradient(90deg,#16a34a_0%,#22c55e_100%)]'
        : isExpired ? 'bg-[linear-gradient(90deg,#9ca3af_0%,#d1d5db_100%)]'
                    : 'bg-[linear-gradient(90deg,#014384_0%,#0572dc_100%)]'
      )} />

      <div className="px-5 py-5">
        <div className="flex items-start gap-4">
          <div className={cn(
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl',
            isClaimed  ? 'bg-emerald-50 text-emerald-600'
            : isExpired ? 'bg-gray-100 text-gray-400'
                        : 'bg-[#eef4fb] text-[#014384]'
          )}>
            {isClaimed ? <CheckIcon className="h-6 w-6" /> : <VoucherIcon className="h-6 w-6" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[13px] font-black uppercase tracking-[0.14em] text-[#f09000]">
                {voucher.type || 'Voucher'}
              </p>
              {isClaimed && (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-emerald-700">
                  Claimed
                </span>
              )}
              {isExpired && (
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-gray-500">
                  Expired
                </span>
              )}
            </div>
            <h3 className="mt-0.5 text-[18px] font-black leading-6 text-[#0d4f92]">{voucher.title}</h3>
            {voucher.description && (
              <p className="mt-1 text-sm text-[#5b7896]">{voucher.description}</p>
            )}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-[#f4f8ff] px-3 py-3">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#7d9ab5]">Points Cost</p>
            <p className="mt-1 text-[18px] font-black text-[#0d4f92]">
              {isFree
                ? <span className="text-emerald-600">Free</span>
                : `${formatPoints(Number(voucher.pointsCost))} pts`}
            </p>
          </div>
          <div className="rounded-2xl bg-[#f4f8ff] px-3 py-3">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#7d9ab5]">Stock</p>
            <p className="mt-1 text-[18px] font-black text-[#0d4f92]">
              {voucher.stock == null
                ? 'Unlimited'
                : Number(voucher.stock) <= 0
                ? <span className="text-red-500">Out of stock</span>
                : voucher.stock.toLocaleString()}
            </p>
          </div>
        </div>

        {eligTag && (
          <div className="mt-3 flex items-center gap-2 rounded-2xl border border-[#d8e8f8] bg-[#f4f8ff] px-3 py-2">
            <svg className="h-4 w-4 shrink-0 text-[#0572dc]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs font-semibold text-[#3565a0]">Eligibility: {eligTag}</p>
          </div>
        )}

        {expiryStr && (
          <p className="mt-2 text-[11px] font-semibold text-[#8aa5c0]">
            {isExpired ? 'Expired' : 'Expires'} {expiryStr}
          </p>
        )}

        {/* Action area */}
        {isClaimed ? (
          <div className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-50 py-3 text-sm font-black text-emerald-700">
            <CheckIcon className="h-4 w-4" />
            Voucher Claimed
          </div>
        ) : isExpired ? (
          <div className="mt-4 flex w-full items-center justify-center rounded-2xl bg-gray-100 py-3 text-sm font-black text-gray-400">
            Voucher Expired
          </div>
        ) : (
          <button
            type="button"
            onClick={onClaim}
            disabled={isClaiming || isOutOfStock}
            className={cn(
              'mt-4 w-full rounded-2xl py-3 text-sm font-black transition',
              isOutOfStock
                ? 'cursor-not-allowed bg-gray-100 text-gray-400'
                : 'bg-[#014384] text-white hover:bg-[#013070] active:scale-[0.98] disabled:opacity-70'
            )}
          >
            {isClaiming
              ? 'Claiming…'
              : isFree
              ? 'Claim Free Voucher'
              : `Claim for ${formatPoints(Number(voucher.pointsCost))} pts`}
          </button>
        )}
      </div>
    </div>
  )
}
