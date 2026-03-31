'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { getReward, redeemReward } from '@/services/rewards.service'
import type { Reward } from '@/hooks/useRewards'
import PageHeader from '@/components/layout/PageHeader'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Spinner from '@/components/ui/Spinner'
import { formatPoints } from '@/utils/formatPoints'

export default function RewardDetailPage() {
  const { rewardId } = useParams<{ rewardId: string }>()
  const router = useRouter()
  const [reward, setReward] = useState<Reward | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRedeeming, setIsRedeeming] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [redemptionCode, setRedemptionCode] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    getReward(rewardId)
      .then(setReward)
      .catch(() => setError('Reward not found'))
      .finally(() => setIsLoading(false))
  }, [rewardId])

  const handleRedeem = async () => {
    setIsRedeeming(true)
    setError('')
    try {
      const result = await redeemReward(rewardId)
      setRedemptionCode(result.code || result.redemptionCode || 'SUCCESS')
      setShowConfirm(false)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to redeem'
      if (message.includes('insufficient')) {
        setError('Insufficient points to redeem this reward.')
      } else {
        setError('Failed to redeem. Please try again.')
      }
      setShowConfirm(false)
    } finally {
      setIsRedeeming(false)
    }
  }

  if (isLoading) return <Spinner fullPage />
  if (!reward) return (
    <div className="min-h-full bg-gray-50">
      <PageHeader title="Reward" />
      <div className="text-center py-16 text-gray-500">Reward not found.</div>
    </div>
  )

  return (
    <div className="min-h-full bg-gray-50">
      <PageHeader title={reward.title} transparent />

      {/* Image */}
      <div className="relative h-56 bg-gradient-to-br from-green-50 to-teal-50">
        {reward.imageUrl ? (
          <Image src={reward.imageUrl} alt={reward.title} fill className="object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <svg className="w-20 h-20 text-green-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
            </svg>
          </div>
        )}
      </div>

      <div className="px-5 py-5 space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>
        )}

        {/* Info card */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <span className="text-xs font-medium px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                {reward.category}
              </span>
              <h1 className="text-xl font-bold text-gray-900 mt-2">{reward.title}</h1>
              <p className="text-gray-500 text-sm mt-0.5">{reward.merchantName}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-2xl font-black text-green-600">{formatPoints(reward.points)}</p>
              <p className="text-gray-400 text-xs">points</p>
            </div>
          </div>

          <p className="text-gray-700 text-sm mt-4 leading-relaxed">{reward.description}</p>

          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-50">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-gray-500 text-sm">Valid for {reward.validDays} days after redemption</span>
          </div>
        </div>

        {/* Redemption code */}
        {redemptionCode && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-5 text-center">
            <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="font-bold text-green-800 text-lg">Redeemed!</p>
            <p className="text-green-700 text-sm mt-1">Your redemption code:</p>
            <div className="bg-white rounded-xl mt-3 px-4 py-3 border border-green-200">
              <p className="font-mono font-bold text-xl text-green-800 tracking-widest">{redemptionCode}</p>
            </div>
            <p className="text-green-600 text-xs mt-2">Present this code to the merchant to claim your reward</p>
            <Button
              variant="secondary"
              fullWidth
              className="mt-4"
              onClick={() => router.push('/rewards/my-redemptions')}
            >
              View My Redemptions
            </Button>
          </div>
        )}

        {!redemptionCode && (
          <Button
            fullWidth
            size="lg"
            isLoading={isRedeeming}
            onClick={() => setShowConfirm(true)}
          >
            Redeem for {formatPoints(reward.points)} Points
          </Button>
        )}
      </div>

      <Modal isOpen={showConfirm} onClose={() => setShowConfirm(false)} title="Confirm Redemption">
        <p className="text-gray-600 text-sm mb-4">
          Are you sure you want to redeem <strong>{reward.title}</strong> for{' '}
          <strong className="text-green-600">{formatPoints(reward.points)} points</strong>?
          This cannot be undone.
        </p>
        <div className="flex gap-3">
          <Button variant="secondary" fullWidth onClick={() => setShowConfirm(false)}>Cancel</Button>
          <Button fullWidth isLoading={isRedeeming} onClick={handleRedeem}>Confirm</Button>
        </div>
      </Modal>
    </div>
  )
}
