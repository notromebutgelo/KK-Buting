'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import api from '@/lib/api'
import type { Merchant } from '@/hooks/useMerchants'
import type { Reward } from '@/hooks/useRewards'
import PageHeader from '@/components/layout/PageHeader'
import RewardCard from '@/components/features/RewardCard'
import Spinner from '@/components/ui/Spinner'

export default function MerchantDetailPage() {
  const { merchantId } = useParams<{ merchantId: string }>()
  const [merchant, setMerchant] = useState<Merchant | null>(null)
  const [rewards, setRewards] = useState<Reward[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get(`/merchants/${merchantId}`),
      api.get('/rewards', { params: { merchantId } }),
    ])
      .then(([mRes, rRes]) => {
        setMerchant(mRes.data.merchant || mRes.data)
        setRewards(rRes.data.rewards || rRes.data)
      })
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [merchantId])

  if (isLoading) return <Spinner fullPage />

  if (!merchant) {
    return (
      <div className="min-h-full bg-gray-50">
        <PageHeader title="Merchant" />
        <div className="text-center py-16 text-gray-500">Merchant not found.</div>
      </div>
    )
  }

  return (
    <div className="min-h-full bg-gray-50">
      <PageHeader title={merchant.name} transparent />

      {/* Hero */}
      <div className="relative h-48 bg-gradient-to-br from-green-50 to-teal-50">
        {merchant.imageUrl ? (
          <Image src={merchant.imageUrl} alt={merchant.name} fill className="object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <svg className="w-20 h-20 text-green-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16" />
            </svg>
          </div>
        )}
      </div>

      <div className="px-5 py-5 space-y-4">
        {/* Merchant Info */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{merchant.name}</h1>
              <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-medium mt-1 inline-block">
                {merchant.category}
              </span>
            </div>
          </div>
          <p className="text-gray-600 text-sm mt-3 leading-relaxed">{merchant.description}</p>
          {merchant.address && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-50">
              <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <p className="text-gray-500 text-sm">{merchant.address}</p>
            </div>
          )}
        </div>

        {/* Rewards from this merchant */}
        {rewards.length > 0 && (
          <div>
            <h2 className="text-gray-800 font-bold mb-3">Available Rewards</h2>
            <div className="grid grid-cols-2 gap-3">
              {rewards.map((reward) => (
                <RewardCard key={reward.id} reward={reward} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
