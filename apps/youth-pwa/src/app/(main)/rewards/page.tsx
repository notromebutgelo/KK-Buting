'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

import RewardCard from '@/components/features/RewardCard'
import AlertModal from '@/components/ui/AlertModal'
import Spinner from '@/components/ui/Spinner'
import { usePoints } from '@/hooks/usePoints'
import { useRewards } from '@/hooks/useRewards'
import { cn } from '@/utils/cn'
import { formatPoints } from '@/utils/formatPoints'

const categories = [
  { value: 'all', label: 'All Rewards', tone: 'bg-[#0d4f92] text-white' },
  { value: 'food', label: 'Food & Drinks', tone: 'bg-white text-[#0d4f92]' },
  { value: 'services', label: 'Services', tone: 'bg-white text-[#0d4f92]' },
  { value: 'others', label: 'Other Rewards', tone: 'bg-white text-[#0d4f92]' },
]

function CategoryIcon({ category }: { category: string }) {
  const className = 'h-7 w-7'

  if (category === 'food') {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 3v8a2 2 0 0 0 2 2h1v8" />
        <path d="M8 3v8" />
        <path d="M12 3v8" />
        <path d="M17 3c1.657 0 3 1.79 3 4v14" />
      </svg>
    )
  }

  if (category === 'services') {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="12" r="3.5" />
        <path d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V20a2 2 0 1 1-4 0v-.2a1 1 0 0 0-.6-.9 1 1 0 0 0-1.1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H4a2 2 0 1 1 0-4h.2a1 1 0 0 0 .9-.6 1 1 0 0 0-.2-1.1l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1 1 0 0 0 1.1.2 1 1 0 0 0 .6-.9V4a2 2 0 1 1 4 0v.2a1 1 0 0 0 .6.9 1 1 0 0 0 1.1-.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1 1 0 0 0-.2 1.1 1 1 0 0 0 .9.6h.2a2 2 0 1 1 0 4h-.2a1 1 0 0 0-.9.6Z" />
      </svg>
    )
  }

  if (category === 'others') {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 3l2.7 5.5L21 9.4l-4.5 4.3 1.1 6.3L12 17l-5.6 3 1.1-6.3L3 9.4l6.3-.9L12 3Z" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 8v13m0-13V6a2 2 0 1 1 2 2h-2Zm0 0V5.5A2.5 2.5 0 1 0 9.5 8H12Zm-7 4h14M5 12a2 2 0 1 0 0-4h14a2 2 0 1 0 0 4M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
    </svg>
  )
}

export default function RewardsPage() {
  const [activeCategory, setActiveCategory] = useState('all')
  const [search, setSearch] = useState('')
  const [heroIndex, setHeroIndex] = useState(0)
  const [isErrorDismissed, setIsErrorDismissed] = useState(false)
  const { rewards, isLoading, error } = useRewards(activeCategory, search)
  const { data: pointsData, isLoading: isPointsLoading } = usePoints()

  const featuredRewards = useMemo(() => rewards.slice(0, 4), [rewards])
  const activeHero = featuredRewards[heroIndex] || rewards[0] || null

  useEffect(() => {
    setHeroIndex(0)
  }, [activeCategory, search])

  useEffect(() => {
    if (featuredRewards.length <= 1) return

    const interval = window.setInterval(() => {
      setHeroIndex((current) => (current + 1) % featuredRewards.length)
    }, 3500)

    return () => window.clearInterval(interval)
  }, [featuredRewards.length])

  useEffect(() => {
    setIsErrorDismissed(false)
  }, [error])

  return (
    <div className="min-h-full bg-[#0a5ca8] pb-28">
      <section className="rounded-b-[34px] bg-[linear-gradient(180deg,#7eb0df_0%,#ffffff_42%,#ffffff_100%)] px-4 pb-6 pt-5 shadow-[0_18px_34px_rgba(0,54,122,0.18)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#5c7ca1]">KK Rewards</p>
            <h1 className="mt-1 text-[26px] font-black tracking-[-0.03em] text-[#0d4f92]">Rewards</h1>
          </div>
          <div className="rounded-[18px] bg-white/85 px-3 py-2 text-right shadow-[0_10px_20px_rgba(0,54,122,0.08)]">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#f09000]">Barangay Buting</p>
            <p className="mt-1 text-[11px] font-semibold text-[#5b7896]">Youth rewards and vouchers</p>
          </div>
        </div>

        <div className="mt-5 flex items-center gap-3 rounded-full border border-[#d6e3f1] bg-white px-4 py-3 shadow-[0_10px_16px_rgba(4,60,121,0.08)]">
          <svg viewBox="0 0 24 24" className="h-4 w-4 text-[#f0a722]" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m21 21-4.35-4.35" />
            <circle cx="11" cy="11" r="6" />
          </svg>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search"
            className="min-w-0 flex-1 bg-transparent text-sm font-medium text-[#35577c] outline-none placeholder:text-[#8ca6c4]"
          />
        </div>
      </section>

      <div className="px-4 py-5">
        <div className="rounded-[24px] bg-[#0d4f92] px-4 py-4 text-white shadow-[0_18px_30px_rgba(4,60,121,0.24)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/70">Available Points</p>
              <p className="mt-1 text-[36px] font-black leading-none">
                {isPointsLoading ? '...' : formatPoints(pointsData?.totalPoints || 0)}
                <span className="ml-1 text-base font-bold text-white/80">POINTS</span>
              </p>
            </div>
            <Link
              href="/rewards/my-redemptions"
              className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-white"
            >
              View My Redemptions
            </Link>
          </div>
          <p className="mt-3 text-xs font-semibold text-white/70">As of today, your youth points are ready for partner rewards.</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Spinner size="lg" />
          </div>
        ) : (
          <div className="mt-5 space-y-6">
            {activeHero ? (
              <section>
                <Link
                  href={`/rewards/${activeHero.id}`}
                  className="block overflow-hidden rounded-[24px] bg-white shadow-[0_16px_30px_rgba(4,60,121,0.24)]"
                >
                  <div className="relative h-[178px] bg-[linear-gradient(135deg,#f8c654_0%,#f28d1d_100%)]">
                    {activeHero.imageUrl ? (
                      <Image src={activeHero.imageUrl} alt={activeHero.title} fill className="object-cover" />
                    ) : null}
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.02)_0%,rgba(13,79,146,0.18)_100%)]" />
                    <div className="absolute inset-x-0 bottom-0 px-4 pb-4">
                      <div className="rounded-[20px] bg-[#0d4f92]/92 px-4 py-4 text-white backdrop-blur-sm">
                        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/70">{activeHero.merchantName}</p>
                        <div className="mt-2 flex items-end justify-between gap-4">
                          <div>
                            <h2 className="line-clamp-2 text-[24px] font-black leading-7">{activeHero.title}</h2>
                            <p className="mt-2 text-sm font-semibold text-[#ffd770]">{formatPoints(activeHero.points)} points</p>
                          </div>
                          <span className="rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[#0d4f92]">
                            View
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>

                {featuredRewards.length > 1 ? (
                  <div className="mt-3 flex justify-center gap-2">
                    {featuredRewards.map((reward, index) => (
                      <button
                        key={reward.id}
                        type="button"
                        onClick={() => setHeroIndex(index)}
                        className={cn(
                          'h-2.5 rounded-full transition-all duration-300',
                          index === heroIndex ? 'w-6 bg-white' : 'w-2.5 bg-white/45'
                        )}
                        aria-label={`Show reward ${index + 1}`}
                      />
                    ))}
                  </div>
                ) : null}
              </section>
            ) : null}

            <section>
              <h2 className="text-base font-black text-white">Rewards Type</h2>
              <div className="mt-3 grid grid-cols-2 gap-3">
                {categories.map((category) => {
                  const isActive = activeCategory === category.value

                  return (
                    <button
                      key={category.value}
                      type="button"
                      onClick={() => setActiveCategory(category.value)}
                      className={cn(
                        'flex min-h-[108px] flex-col items-start justify-between rounded-[22px] border px-4 py-4 text-left shadow-[0_12px_22px_rgba(4,60,121,0.16)] transition-transform duration-300',
                        isActive ? 'border-[#ffd770] bg-[#0d4f92] text-white' : 'border-[#d8e4f1] bg-white text-[#0d4f92]'
                      )}
                    >
                      <div className={cn('rounded-2xl p-2.5', isActive ? 'bg-white/10' : 'bg-[#f4f8ff]')}>
                        <CategoryIcon category={category.value} />
                      </div>
                      <span className="text-sm font-black leading-5">{category.label}</span>
                    </button>
                  )
                })}
              </div>
            </section>

            <section>
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-base font-black text-white">All Rewards</h2>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/70">{rewards.length} available</p>
              </div>

              {rewards.length === 0 ? (
                <div className="mt-3 rounded-[28px] bg-white px-6 py-12 text-center shadow-[0_14px_30px_rgba(4,60,121,0.2)]">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#f4f8ff] text-[#0d4f92]">
                    <CategoryIcon category="all" />
                  </div>
                  <p className="mt-4 text-lg font-black text-[#0d4f92]">No rewards found</p>
                  <p className="mt-2 text-sm text-[#6d87a4]">Try a different search or category.</p>
                </div>
              ) : (
                <div className="mt-3 grid grid-cols-2 gap-3">
                  {rewards.map((reward) => (
                    <RewardCard key={reward.id} reward={reward} />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>

      <AlertModal
        isOpen={Boolean(error) && !isErrorDismissed}
        title="Rewards Unavailable"
        message={error || ''}
        onClose={() => setIsErrorDismissed(true)}
      />
    </div>
  )
}
