'use client'

import Image from 'next/image'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

import AlertModal from '@/components/ui/AlertModal'
import Spinner from '@/components/ui/Spinner'
import { usePoints } from '@/hooks/usePoints'
import { getReward, redeemReward } from '@/services/rewards.service'
import type { Reward, RewardRedemption } from '@/types/rewards'
import { formatPoints } from '@/utils/formatPoints'

function formatLongDate(value?: string | null) {
  if (!value) return null

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null

  return date.toLocaleDateString('en-PH', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function RewardIcon({ className = 'h-20 w-20' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 8v13m0-13V6a2 2 0 1 1 2 2h-2Zm0 0V5.5A2.5 2.5 0 1 0 9.5 8H12Zm-7 4h14M5 12a2 2 0 1 0 0-4h14a2 2 0 1 0 0 4M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
    </svg>
  )
}

export default function RewardDetailPage() {
  const router = useRouter()
  const { rewardId } = useParams<{ rewardId: string }>()
  const { data: pointsData, refresh: refreshPoints } = usePoints()
  const [reward, setReward] = useState<Reward | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRedeeming, setIsRedeeming] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [redemption, setRedemption] = useState<RewardRedemption | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    setIsLoading(true)
    setError('')

    getReward(rewardId)
      .then(setReward)
      .catch(() => setError('Reward not found'))
      .finally(() => setIsLoading(false))
  }, [rewardId])

  const availablePoints = pointsData?.totalPoints || 0
  const canAfford = reward ? availablePoints >= reward.points : false
  const nextBalance = reward ? Math.max(0, availablePoints - reward.points) : availablePoints
  const validLabel = useMemo(() => {
    if (!reward) return ''
    const exactDate = formatLongDate(reward.expiryDate)
    return exactDate ? `Valid until ${exactDate}` : `Valid for ${reward.validDays} days from the date of redemption`
  }, [reward])

  async function handleRedeem() {
    if (!reward) return

    setIsRedeeming(true)
    setError('')

    try {
      const result = await redeemReward(reward.id)
      setRedemption(result as RewardRedemption)
      setShowConfirm(false)
      refreshPoints()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to redeem'
      if (message.toLowerCase().includes('insufficient')) {
        setError('You do not have enough points for this reward yet.')
      } else {
        setError(message)
      }
      setShowConfirm(false)
    } finally {
      setIsRedeeming(false)
    }
  }

  if (isLoading) return <Spinner fullPage />

  if (!reward) {
    return (
      <div className="min-h-full bg-[#f7f9fc] px-5 py-20 text-center">
        <p className="text-xl font-black text-[#0d4f92]">Reward not found</p>
        <p className="mt-2 text-sm text-[#6b86a4]">This reward is not available right now.</p>
      </div>
    )
  }

  return (
    <div className="min-h-full bg-[#f6f8fc] pb-28">
      <header className="sticky top-0 z-20 bg-white px-4 pb-4 pt-4 shadow-[0_10px_20px_rgba(15,55,105,0.08)]">
        <div className="grid grid-cols-[40px_1fr_40px] items-center">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f4f8ff] text-[#0d4f92]"
            aria-label="Go back"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m15 19-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-center text-[20px] font-black text-[#0d4f92]">Reward Details</h1>
          <div />
        </div>
      </header>

      <div className="px-4 py-5">
        <section className="overflow-hidden rounded-[24px] bg-[#0d4f92] shadow-[0_18px_30px_rgba(4,60,121,0.22)]">
          <div className="grid grid-cols-[108px_1fr] gap-0">
            <div className="relative min-h-[152px] bg-[linear-gradient(135deg,#ffdb8d_0%,#7fdcff_100%)]">
              {reward.imageUrl ? (
                <Image src={reward.imageUrl} alt={reward.title} fill className="object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-white/80">
                  <RewardIcon className="h-16 w-16" />
                </div>
              )}
            </div>

            <div className="flex flex-col justify-between px-4 py-4 text-white">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/70">{reward.merchantName}</p>
                <h2 className="mt-2 text-[28px] font-black leading-8">{reward.title}</h2>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <span className="rounded-full bg-white/12 px-3 py-1 text-xs font-bold text-[#ffd774]">
                  {formatPoints(reward.points)} points
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6">
          <h3 className="text-[19px] font-black text-[#0d4f92]">About This Reward</h3>
          <p className="mt-2 text-[15px] leading-7 text-[#486583]">{reward.description}</p>
          <p className="mt-2 text-sm font-bold italic text-[#f0a100]">{validLabel}</p>
        </section>

        <section className="mt-6 border-t border-[#dbe5f2] pt-5">
          <h3 className="text-[19px] font-black text-[#0d4f92]">How to Use</h3>
          <ol className="mt-3 space-y-2 text-[15px] leading-7 text-[#486583]">
            <li>1. Tap the Redeem button below to generate your youth voucher.</li>
            <li>2. Your redeemed voucher will be saved in My Redemptions.</li>
            <li>3. Present the voucher when claiming it from {reward.merchantName}.</li>
            <li>4. Enjoy your reward before it expires.</li>
          </ol>
        </section>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 bg-[linear-gradient(180deg,rgba(246,248,252,0)_0%,rgba(246,248,252,0.94)_22%,#f6f8fc_100%)] px-4 pb-[calc(1rem+var(--safe-area-inset-bottom))] pt-6">
        <button
          type="button"
          onClick={() => setShowConfirm(true)}
          disabled={!canAfford || isRedeeming}
          className="mx-auto flex w-full max-w-md items-center justify-center rounded-full bg-[linear-gradient(90deg,#f8cb5b_0%,#f1b941_52%,#ffd77a_100%)] px-6 py-4 text-base font-black text-white shadow-[0_18px_30px_rgba(241,185,65,0.34)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {!canAfford ? `Need ${formatPoints(reward.points)} points` : isRedeeming ? 'Redeeming...' : 'Redeem'}
        </button>
      </div>

      {showConfirm ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#1d3555]/35 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-[28px] bg-white px-6 py-7 text-center shadow-[0_26px_60px_rgba(13,79,146,0.28)]">
            <h2 className="text-[33px] font-black leading-10 text-[#0d4f92]">Confirm Redemption?</h2>
            <div className="mt-4 flex justify-center text-[#f2af11]">
              <RewardIcon />
            </div>
            <p className="mt-5 text-[18px] leading-8 text-[#486583]">
              You are about to spend <span className="font-black text-[#0d4f92]">{formatPoints(reward.points)} points</span> for{' '}
              <span className="font-black text-[#0d4f92]">{reward.title}</span>.
            </p>
            <p className="mt-3 text-sm font-bold italic text-[#f0a100]">Your new balance will be {formatPoints(nextBalance)} points.</p>

            <button
              type="button"
              onClick={() => void handleRedeem()}
              disabled={isRedeeming}
              className="mt-6 flex w-full items-center justify-center rounded-full bg-[#1674d5] px-5 py-4 text-base font-black text-white"
            >
              {isRedeeming ? 'Confirming...' : 'Confirm'}
            </button>
            <button
              type="button"
              onClick={() => setShowConfirm(false)}
              className="mt-4 text-sm font-semibold text-[#5f7893]"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {redemption ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#1d3555]/35 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-[28px] bg-white px-6 py-7 text-center shadow-[0_26px_60px_rgba(13,79,146,0.28)]">
            <h2 className="text-[33px] font-black leading-10 text-[#0d4f92]">Redemption Successful!</h2>
            <div className="mt-4 flex justify-center text-[#0d4f92]">
              <svg viewBox="0 0 24 24" className="h-24 w-24" fill="currentColor">
                <path d="M12 1.75 14.8 4l3.56-.16 1.42 3.27 3.13 1.71-.82 3.47 1.3 3.31-2.48 2.56-.35 3.55-3.47.8L14 24.26l-3.19-1.75-3.48.8L7 19.76l-2.48-2.56 1.3-3.31-.82-3.47 3.13-1.71L9.56 3.84 13.12 4 12 1.75Z" />
                <path d="m9.4 12.3 1.9 1.9 4.7-5" fill="none" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p className="mt-5 text-[18px] leading-8 text-[#486583]">
              Hooray! You&apos;ve successfully redeemed your <span className="font-black text-[#0d4f92]">{redemption.rewardTitle}</span>.
            </p>
            <p className="mt-3 text-sm font-bold italic text-[#f0a100]">
              {formatLongDate(redemption.expiresAt) ? `Valid until ${formatLongDate(redemption.expiresAt)}` : 'Voucher saved to your redemptions'}
            </p>

            <button
              type="button"
              onClick={() => router.push('/rewards/my-redemptions')}
              className="mt-6 flex w-full items-center justify-center rounded-full bg-[#1674d5] px-5 py-4 text-base font-black text-white"
            >
              View Redemptions
            </button>
            <button
              type="button"
              onClick={() => router.push('/rewards')}
              className="mt-4 text-sm font-semibold text-[#5f7893]"
            >
              Back to All Rewards
            </button>
          </div>
        </div>
      ) : null}

      <AlertModal
        isOpen={Boolean(error) && Boolean(reward)}
        title="Reward Action Failed"
        message={error}
        onClose={() => setError('')}
      />
    </div>
  )
}
