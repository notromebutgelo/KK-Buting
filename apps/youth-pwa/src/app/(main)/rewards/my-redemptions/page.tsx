'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

import Spinner from '@/components/ui/Spinner'
import { getMyRedemptions } from '@/services/rewards.service'
import type { RewardRedemption } from '@/types/rewards'
import { cn } from '@/utils/cn'
import { formatPoints } from '@/utils/formatPoints'

type RedemptionTab = 'active' | 'claimed' | 'expired'

function VoucherIcon({ className = 'h-12 w-12' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 10.5A2.5 2.5 0 0 1 5.5 8H19a2 2 0 0 1 2 2v2a2.5 2.5 0 0 0 0 5v2a2 2 0 0 1-2 2H5.5A2.5 2.5 0 0 1 3 18.5v-2a2.5 2.5 0 0 0 0-5v-1Z" />
      <path d="M9 8v12" strokeDasharray="2 2" />
      <path d="M14 10h2.5a1.5 1.5 0 1 0 0-3c-.76 0-1.44.37-1.86.95A2.5 2.5 0 1 0 10 9.5h4m0 .5h-4m4 0v7m-4-7v7" />
    </svg>
  )
}

function EmptyVoucherIcon() {
  return (
    <div className="relative text-[#ffbe26]">
      <VoucherIcon className="h-28 w-28" />
      <svg viewBox="0 0 24 24" className="absolute inset-0 h-28 w-28" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M5 19 19 5" />
      </svg>
    </div>
  )
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-PH', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

const tabMeta: Record<RedemptionTab, { heading: string; description: string }> = {
  active: {
    heading: 'Your Current Rewards & Vouchers',
    description: 'Redeemed rewards that are still valid for use.',
  },
  claimed: {
    heading: "A history of rewards you've already enjoyed",
    description: 'Rewards already marked claimed by your admin team.',
  },
  expired: {
    heading: 'Rewards that are no longer valid for use',
    description: 'Past vouchers that have already expired.',
  },
}

export default function MyRedemptionsPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<RedemptionTab>('active')
  const [redemptions, setRedemptions] = useState<RewardRedemption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    getMyRedemptions()
      .then(setRedemptions)
      .catch(() => setError('Failed to load redemptions.'))
      .finally(() => setIsLoading(false))
  }, [])

  const filtered = useMemo(
    () => redemptions.filter((redemption) => redemption.status === activeTab),
    [activeTab, redemptions]
  )

  const cardTone =
    activeTab === 'active'
      ? 'bg-[linear-gradient(135deg,#1b6ec1_0%,#0d4f92_100%)] border-white/12'
      : activeTab === 'claimed'
        ? 'bg-[linear-gradient(135deg,#cab352_0%,#9f9138_100%)] border-white/16'
        : 'bg-[linear-gradient(135deg,#764289_0%,#ac4a6a_100%)] border-white/10'

  return (
    <div className="min-h-full bg-[linear-gradient(180deg,#0d4f92_0%,#0a5ca8_100%)] pb-28 text-white">
      <header className="sticky top-0 z-20 bg-[#0d4f92] px-4 pb-3 pt-4 shadow-[0_10px_20px_rgba(3,36,79,0.22)]">
        <div className="grid grid-cols-[40px_1fr_40px] items-center">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white"
            aria-label="Go back"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m15 19-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-center text-[21px] font-black">My Redemptions</h1>
          <div />
        </div>

        <div className="mt-4 grid grid-cols-3">
          {(['active', 'claimed', 'expired'] as RedemptionTab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={cn(
                'border-b-2 pb-3 text-sm font-semibold capitalize transition-colors',
                activeTab === tab ? 'border-[#ffbf2a] text-white' : 'border-transparent text-white/70'
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </header>

      <div className="px-4 py-5">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Spinner size="lg" />
          </div>
        ) : error ? (
          <div className="rounded-[28px] bg-white px-6 py-10 text-center text-sm font-semibold text-red-500 shadow-[0_14px_30px_rgba(4,60,121,0.2)]">
            {error}
          </div>
        ) : (
          <div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="max-w-[240px] text-[28px] font-black leading-9">{tabMeta[activeTab].heading}</h2>
                <p className="mt-2 max-w-[280px] text-sm text-white/72">{tabMeta[activeTab].description}</p>
              </div>
              <div className="rounded-[18px] border border-white/20 bg-white/5 p-3 text-white/85">
                <VoucherIcon />
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="flex flex-col items-center px-4 py-16 text-center">
                <EmptyVoucherIcon />
                <p className="mt-6 text-[18px] font-black">
                  {activeTab === 'active'
                    ? 'No active rewards yet.'
                    : activeTab === 'claimed'
                      ? 'No claimed rewards yet.'
                      : 'No expired rewards yet.'}
                </p>
                <p className="mt-2 max-w-[220px] text-sm font-semibold text-white/75">
                  {activeTab === 'active'
                    ? 'Go to the Rewards page to redeem your points.'
                    : 'Your reward history will appear here once it changes status.'}
                </p>
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                {filtered.map((redemption) => (
                  <article
                    key={redemption.id}
                    className={cn(
                      'overflow-hidden rounded-[24px] border px-4 py-4 shadow-[0_18px_30px_rgba(2,36,84,0.18)]',
                      cardTone
                    )}
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-[72px] w-[72px] flex-shrink-0 items-center justify-center rounded-[18px] bg-[#ffbf2a]/14 text-[#ffbf2a]">
                        {redemption.imageUrl ? (
                          <div className="relative h-full w-full overflow-hidden rounded-[18px]">
                            <Image src={redemption.imageUrl} alt={redemption.rewardTitle} fill className="object-cover" />
                          </div>
                        ) : (
                          <VoucherIcon className="h-10 w-10" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/70">{redemption.merchantName}</p>
                        <h3 className="mt-1 line-clamp-2 text-[20px] font-black leading-6">{redemption.rewardTitle}</h3>
                        <p className="mt-2 text-sm font-semibold text-white/80">
                          {activeTab === 'active'
                            ? `Expiring on ${formatDate(redemption.expiresAt)}`
                            : activeTab === 'claimed'
                              ? `Redeemed on ${formatDate(redemption.redeemedAt)}`
                              : `Expired on ${formatDate(redemption.expiresAt)}`}
                        </p>
                        <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-[#ffd774]">
                          {formatPoints(redemption.pointsCost)} points
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-3">
                      <span className="rounded-full bg-white/12 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-white">
                        {redemption.status}
                      </span>
                      <Link
                        href={`/rewards/${redemption.rewardId}`}
                        className="rounded-full bg-[#ffbf2a] px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-[#0d4f92]"
                      >
                        View Voucher
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
