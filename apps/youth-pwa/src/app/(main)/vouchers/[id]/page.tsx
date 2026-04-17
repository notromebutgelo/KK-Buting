'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { QRCodeSVG } from 'qrcode.react'
import Spinner from '@/components/ui/Spinner'
import api from '@/lib/api'
import { cn } from '@/utils/cn'

interface ClaimRecord {
  claimId: string
  token: string
  voucherId: string
  voucherTitle: string
  status: string
  claimedAt: string | null
  redeemedAt: string | null
}

function formatDate(value: string | null | undefined) {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function VoucherClaimDetailPage() {
  const params = useParams()
  const router = useRouter()
  const voucherId = String(params?.id || '')

  const [claim, setClaim] = useState<ClaimRecord | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!voucherId) return
    setIsLoading(true)
    api.get(`/vouchers/${voucherId}/my-claim`)
      .then((res) => setClaim(res.data.claim))
      .catch((err) => {
        const msg = err?.response?.data?.error || 'Could not load claim details.'
        setError(msg)
      })
      .finally(() => setIsLoading(false))
  }, [voucherId])

  const isRedeemed = claim?.status === 'redeemed'

  return (
    <div className="min-h-full bg-[#0a5ca8] pb-28">
      {/* Header */}
      <section className="rounded-b-[34px] bg-[linear-gradient(180deg,#7eb0df_0%,#ffffff_42%,#ffffff_100%)] px-4 pb-6 pt-5 shadow-[0_18px_34px_rgba(0,54,122,0.18)]">
        <button
          type="button"
          onClick={() => router.back()}
          className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-[#5c7ca1]"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Vouchers
        </button>
        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#5c7ca1]">KK Vouchers</p>
        <h1 className="mt-1 text-[26px] font-black tracking-[-0.03em] text-[#0d4f92]">Claim Code</h1>
      </section>

      <div className="px-4 py-5 space-y-5">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Spinner size="lg" />
          </div>
        ) : error ? (
          <div className="rounded-[24px] bg-white px-6 py-12 text-center shadow-[0_14px_30px_rgba(4,60,121,0.2)]">
            <p className="text-lg font-black text-[#0d4f92]">No Claim Found</p>
            <p className="mt-2 text-sm text-[#6d87a4]">{error}</p>
            <button
              type="button"
              onClick={() => router.back()}
              className="mt-4 rounded-2xl bg-[#014384] px-6 py-2.5 text-sm font-black text-white"
            >
              Go Back
            </button>
          </div>
        ) : claim ? (
          <>
            {/* Voucher title card */}
            <div className="rounded-[24px] bg-[#0d4f92] px-4 py-4 text-white shadow-[0_18px_30px_rgba(4,60,121,0.24)]">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/70">Claimed Voucher</p>
              <p className="mt-1 text-[20px] font-black leading-tight">{claim.voucherTitle}</p>
              <div className="mt-2 flex items-center gap-2">
                <span className={cn(
                  'rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide',
                  isRedeemed ? 'bg-emerald-500/20 text-emerald-300' : 'bg-yellow-400/20 text-yellow-300'
                )}>
                  {isRedeemed ? 'Redeemed' : 'Claimed — Not yet redeemed'}
                </span>
              </div>
              {claim.claimedAt && (
                <p className="mt-2 text-xs text-white/60">Claimed {formatDate(claim.claimedAt)}</p>
              )}
              {isRedeemed && claim.redeemedAt && (
                <p className="mt-1 text-xs text-emerald-300">Redeemed {formatDate(claim.redeemedAt)}</p>
              )}
            </div>

            {/* QR Code */}
            <div className="rounded-[24px] bg-white px-5 py-6 shadow-[0_14px_28px_rgba(4,60,121,0.18)]">
              <p className="mb-4 text-center text-[11px] font-black uppercase tracking-[0.18em] text-[#5c7ca1]">
                Scan QR Code
              </p>
              <div className={cn(
                'mx-auto flex items-center justify-center rounded-2xl p-4',
                isRedeemed ? 'bg-gray-50 opacity-50' : 'bg-[#f4f8ff]'
              )}>
                <QRCodeSVG
                  value={claim.token}
                  size={200}
                  bgColor="#f4f8ff"
                  fgColor="#0d4f92"
                  level="M"
                />
              </div>
              {isRedeemed && (
                <p className="mt-3 text-center text-xs font-semibold text-gray-400">
                  This voucher has already been redeemed
                </p>
              )}
            </div>

            {/* Token code */}
            <div className="rounded-[24px] bg-white px-5 py-5 shadow-[0_14px_28px_rgba(4,60,121,0.18)]">
              <p className="text-center text-[10px] font-black uppercase tracking-[0.18em] text-[#7d9ab5]">
                Your Claim Code
              </p>
              <p className={cn(
                'mt-2 text-center font-mono text-[32px] font-black tracking-[0.12em]',
                isRedeemed ? 'text-gray-400' : 'text-[#0d4f92]'
              )}>
                {claim.token}
              </p>
              <p className="mt-3 text-center text-[12px] font-semibold text-[#8aa5c0]">
                Show this to an SK official to receive your voucher.
              </p>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
