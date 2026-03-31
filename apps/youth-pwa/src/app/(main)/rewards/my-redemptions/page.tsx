'use client'
import { useEffect, useState } from 'react'
import { getMyRedemptions } from '@/services/rewards.service'
import PageHeader from '@/components/layout/PageHeader'
import Spinner from '@/components/ui/Spinner'
import { formatPoints } from '@/utils/formatPoints'

interface Redemption {
  id: string
  rewardId: string
  rewardTitle: string
  merchantName: string
  points: number
  code: string
  redeemedAt: string
  expiresAt: string
  status: 'active' | 'used' | 'expired'
}

export default function MyRedemptionsPage() {
  const [redemptions, setRedemptions] = useState<Redemption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    getMyRedemptions()
      .then(setRedemptions)
      .catch(() => setError('Failed to load redemptions.'))
      .finally(() => setIsLoading(false))
  }, [])

  const statusColors = {
    active: 'bg-green-100 text-green-700',
    used: 'bg-gray-100 text-gray-500',
    expired: 'bg-red-100 text-red-600',
  }

  return (
    <div className="min-h-full bg-gray-50">
      <PageHeader title="My Redemptions" />
      <div className="px-5 pt-4 pb-8">
        {isLoading ? (
          <div className="flex justify-center py-16"><Spinner size="lg" /></div>
        ) : error ? (
          <div className="text-center py-16 text-red-500 text-sm">{error}</div>
        ) : redemptions.length === 0 ? (
          <div className="text-center py-16">
            <svg className="w-16 h-16 text-gray-200 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-gray-400 font-medium">No redemptions yet</p>
            <p className="text-gray-300 text-sm mt-1">Redeem rewards using your KK points</p>
          </div>
        ) : (
          <div className="space-y-3">
            {redemptions.map((r) => (
              <div key={r.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 text-sm">{r.rewardTitle}</h3>
                    <p className="text-gray-500 text-xs mt-0.5">{r.merchantName}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[r.status] || statusColors.active}`}>
                        {r.status}
                      </span>
                      <span className="text-gray-400 text-xs">{formatPoints(r.points)} pts</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="bg-gray-50 rounded-xl px-3 py-2 border border-gray-200">
                      <p className="font-mono text-xs font-bold text-gray-800 tracking-wider">{r.code}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-50">
                  <span className="text-gray-400 text-xs">
                    Redeemed: {new Date(r.redeemedAt).toLocaleDateString('en-PH')}
                  </span>
                  <span className="text-gray-400 text-xs">
                    Expires: {new Date(r.expiresAt).toLocaleDateString('en-PH')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
