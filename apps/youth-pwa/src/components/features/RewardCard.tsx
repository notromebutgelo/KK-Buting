import Link from 'next/link'
import Image from 'next/image'
import { formatPoints } from '@/utils/formatPoints'
import type { Reward } from '@/types/rewards'
import { cn } from '@/utils/cn'

interface RewardCardProps {
  reward: Reward
  className?: string
}

const categoryColors: Record<string, string> = {
  food: 'bg-[#fff0d0] text-[#f09000]',
  services: 'bg-[#e7f0ff] text-[#0d4f92]',
  others: 'bg-[#eef3fb] text-[#4b6584]',
}

export default function RewardCard({ reward, className }: RewardCardProps) {
  return (
    <Link
      href={`/rewards/${reward.id}`}
      className={cn(
        'block overflow-hidden rounded-[24px] border border-white/20 bg-white shadow-[0_14px_28px_rgba(4,60,121,0.18)] transition-transform duration-300 hover:-translate-y-0.5',
        className
      )}
    >
      <div className="relative h-36 bg-[linear-gradient(135deg,#f8cd59_0%,#f7a21c_100%)]">
        {reward.imageUrl ? (
          <Image
            src={reward.imageUrl}
            alt={reward.title}
            fill
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <svg className="h-12 w-12 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
            </svg>
          </div>
        )}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,50,104,0.02)_0%,rgba(10,50,104,0.5)_100%)]" />
        <span className={cn(
          'absolute right-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-black',
          categoryColors[reward.category] || 'bg-gray-100 text-gray-700'
        )}>
          {reward.category}
        </span>
      </div>
      <div className="p-4">
        <p className="line-clamp-1 text-[11px] font-semibold text-[#7b95b2]">{reward.merchantName}</p>
        <h3 className="mt-1 line-clamp-2 text-[15px] font-black leading-5 text-[#0d4f92]">{reward.title}</h3>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-sm font-black text-[#f09000]">
            {formatPoints(reward.points)} pts
          </span>
          <span className="text-[11px] font-semibold text-[#7b95b2]">{reward.validDays}d valid</span>
        </div>
      </div>
    </Link>
  )
}
