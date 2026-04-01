import api from '@/lib/api'

type RewardFilters = {
  category?: string
  search?: string
  merchantId?: string
  status?: string
}

export async function getRewards(filters: RewardFilters = {}) {
  const params = Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== undefined && value !== null && value !== '')
  )
  const res = await api.get('/rewards', { params })
  return res.data.rewards || res.data
}

export async function getReward(rewardId: string) {
  const res = await api.get(`/rewards/${rewardId}`)
  return res.data.reward || res.data
}

export async function redeemReward(rewardId: string) {
  const res = await api.post(`/rewards/${rewardId}/redeem`)
  return res.data.redemption || res.data
}

export async function getMyRedemptions(status?: string) {
  const params = status && status !== 'all' ? { status } : {}
  const res = await api.get('/rewards/my-redemptions', { params })
  return res.data.redemptions || res.data
}
