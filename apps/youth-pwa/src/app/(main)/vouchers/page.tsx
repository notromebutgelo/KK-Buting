'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

import AlertModal from '@/components/ui/AlertModal'
import Spinner from '@/components/ui/Spinner'
import { usePoints } from '@/hooks/usePoints'
import api from '@/lib/api'
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
  status?: string
  expiresAt?: string | null
}

function VoucherIcon({ className = 'h-7 w-7' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
    </svg>
  )
}

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

export default function VouchersPage() {
  const [vouchers, setVouchers] = useState<Voucher[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [claiming, setClaming] = useState<string | null>(null)
  const [alertTitle, setAlertTitle] = useState('')
  const [alertMessage, setAlertMessage] = useState('')
  const [showAlert, setShowAlert] = useState(false)
  const { data: pointsData, isLoading: isPointsLoading, refresh: refreshPoints } = usePoints()

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

  async function handleClaim(voucher: Voucher) {
    setClaming(voucher.id)
    try {
      await api.post(`/vouchers/${voucher.id}/claim`)
      setAlertTitle('Voucher Claimed!')
      setAlertMessage(`You successfully claimed "${voucher.title}". Check your notifications for details.`)
      setShowAlert(true)
      await Promise.all([loadVouchers(), refreshPoints?.()])
    } catch (err: any) {
      const msg = String(err?.response?.data?.error || err?.message || 'Something went wrong.')
      setAlertTitle('Could Not Claim')
      setAlertMessage(msg)
      setShowAlert(true)
    } finally {
      setClaming(null)
    }
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

        {/* Voucher list */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Spinner size="lg" />
          </div>
        ) : vouchers.length === 0 ? (
          <div className="rounded-[28px] bg-white px-6 py-12 text-center shadow-[0_14px_30px_rgba(4,60,121,0.2)]">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#f4f8ff] text-[#0d4f92]">
              <VoucherIcon />
            </div>
            <p className="mt-4 text-lg font-black text-[#0d4f92]">No vouchers available</p>
            <p className="mt-2 text-sm text-[#6d87a4]">Check back soon for new SK youth vouchers.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="text-base font-black text-white">
              Available Vouchers
              <span className="ml-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/70">
                {vouchers.length} available
              </span>
            </h2>
            {vouchers.map((voucher) => {
              const eligTag = buildEligibilityTag(voucher.eligibilityConditions)
              const isClaiming = claiming === voucher.id
              return (
                <VoucherCard
                  key={voucher.id}
                  voucher={voucher}
                  eligTag={eligTag}
                  isClaiming={isClaiming}
                  onClaim={() => void handleClaim(voucher)}
                />
              )
            })}
          </div>
        )}
      </div>

      <AlertModal
        isOpen={showAlert}
        title={alertTitle}
        message={alertMessage}
        onClose={() => setShowAlert(false)}
      />
    </div>
  )
}

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
  const isFree = Number(voucher.pointsCost) === 0
  const expiryStr = formatDate(voucher.expiresAt)

  return (
    <div className="overflow-hidden rounded-[24px] bg-white shadow-[0_14px_28px_rgba(4,60,121,0.18)]">
      {/* Colour bar */}
      <div className="h-2 bg-[linear-gradient(90deg,#014384_0%,#0572dc_100%)]" />
      <div className="px-5 py-5">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#eef4fb] text-[#014384]">
            <VoucherIcon className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-black uppercase tracking-[0.14em] text-[#f09000]">{voucher.type || 'Voucher'}</p>
            <h3 className="mt-0.5 text-[18px] font-black leading-6 text-[#0d4f92]">{voucher.title}</h3>
            {voucher.description ? (
              <p className="mt-1 text-sm text-[#5b7896]">{voucher.description}</p>
            ) : null}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-[#f4f8ff] px-3 py-3">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#7d9ab5]">Points Cost</p>
            <p className="mt-1 text-[18px] font-black text-[#0d4f92]">
              {isFree ? <span className="text-emerald-600">Free</span> : `${formatPoints(Number(voucher.pointsCost))} pts`}
            </p>
          </div>
          <div className="rounded-2xl bg-[#f4f8ff] px-3 py-3">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#7d9ab5]">Stock</p>
            <p className="mt-1 text-[18px] font-black text-[#0d4f92]">
              {voucher.stock == null ? 'Unlimited' : Number(voucher.stock) <= 0 ? <span className="text-red-500">Out of stock</span> : voucher.stock.toLocaleString()}
            </p>
          </div>
        </div>

        {eligTag ? (
          <div className="mt-3 flex items-center gap-2 rounded-2xl border border-[#d8e8f8] bg-[#f4f8ff] px-3 py-2">
            <svg className="h-4 w-4 shrink-0 text-[#0572dc]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs font-semibold text-[#3565a0]">Eligibility: {eligTag}</p>
          </div>
        ) : null}

        {expiryStr ? (
          <p className="mt-2 text-[11px] font-semibold text-[#8aa5c0]">Expires {expiryStr}</p>
        ) : null}

        <button
          type="button"
          onClick={onClaim}
          disabled={isClaiming || Number(voucher.stock) === 0}
          className={cn(
            'mt-4 w-full rounded-2xl py-3 text-sm font-black transition',
            Number(voucher.stock) === 0
              ? 'cursor-not-allowed bg-gray-100 text-gray-400'
              : 'bg-[#014384] text-white hover:bg-[#013070] active:scale-[0.98] disabled:opacity-70'
          )}
        >
          {isClaiming ? 'Claiming…' : isFree ? 'Claim Free Voucher' : `Claim for ${formatPoints(Number(voucher.pointsCost))} pts`}
        </button>
      </div>
    </div>
  )
}
