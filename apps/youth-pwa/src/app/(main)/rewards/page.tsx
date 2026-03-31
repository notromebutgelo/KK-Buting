'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRewards } from '@/hooks/useRewards'
import RewardCard from '@/components/features/RewardCard'
import Spinner from '@/components/ui/Spinner'
import { cn } from '@/utils/cn'

const categories = [
  { value: 'all', label: 'All' },
  { value: 'food', label: 'Food' },
  { value: 'services', label: 'Services' },
  { value: 'others', label: 'Others' },
]

export default function RewardsPage() {
  const [activeCategory, setActiveCategory] = useState('all')
  const { rewards, isLoading, error } = useRewards(activeCategory)

  return (
    <div className="min-h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white px-5 pt-12 pb-4 sticky top-0 z-20 border-b border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-2xl font-black text-gray-900">Rewards</h1>
          <Link
            href="/rewards/my-redemptions"
            className="text-green-600 text-sm font-medium bg-green-50 px-3 py-1.5 rounded-full hover:bg-green-100 transition-colors"
          >
            My Redemptions
          </Link>
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {categories.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setActiveCategory(cat.value)}
              className={cn(
                'px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
                activeCategory === cat.value
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 py-4">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner size="lg" />
          </div>
        ) : error ? (
          <div className="text-center py-16 text-red-500 text-sm">{error}</div>
        ) : rewards.length === 0 ? (
          <div className="text-center py-16">
            <svg className="w-16 h-16 text-gray-200 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
            </svg>
            <p className="text-gray-400 font-medium">No rewards available</p>
            <p className="text-gray-300 text-sm mt-1">Check back later for new rewards</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {rewards.map((reward) => (
              <RewardCard key={reward.id} reward={reward} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
