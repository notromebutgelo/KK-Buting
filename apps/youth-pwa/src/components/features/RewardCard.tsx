import Link from 'next/link'
import Image from 'next/image'
import { formatPoints } from '@/utils/formatPoints'
import type { Reward } from '@/hooks/useRewards'
import { cn } from '@/utils/cn'

interface RewardCardProps {
  reward: Reward
  className?: string
}

const categoryColors = {
  food: 'bg-orange-100 text-orange-700',
  services: 'bg-blue-100 text-blue-700',
  others: 'bg-purple-100 text-purple-700',
}

export default function RewardCard({ reward, className }: RewardCardProps) {
  return (
    <Link
      href={`/rewards/${reward.id}`}
      className={cn(
        'block bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow border border-gray-100',
        className
      )}
    >
      <div className="relative h-36 bg-gradient-to-br from-green-50 to-teal-50">
        {reward.imageUrl ? (
          <Image
            src={reward.imageUrl}
            alt={reward.title}
            fill
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <svg className="w-12 h-12 text-green-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
            </svg>
          </div>
        )}
        <span className={cn(
          'absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-medium',
          categoryColors[reward.category] || 'bg-gray-100 text-gray-700'
        )}>
          {reward.category}
        </span>
      </div>
      <div className="p-3">
        <h3 className="font-semibold text-gray-900 text-sm line-clamp-1">{reward.title}</h3>
        <p className="text-gray-500 text-xs mt-0.5 line-clamp-1">{reward.merchantName}</p>
        <div className="flex items-center justify-between mt-2">
          <span className="text-green-600 font-bold text-sm">
            {formatPoints(reward.points)} pts
          </span>
          <span className="text-gray-400 text-xs">{reward.validDays}d valid</span>
        </div>
      </div>
    </Link>
  )
}
