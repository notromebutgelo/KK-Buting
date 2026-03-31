import api from '@/lib/api'

export async function getRewards(category?: string) {
  const params = category && category !== 'all' ? { category } : {}
  const res = await api.get('/rewards', { params })
  return res.data.rewards || res.data
}

export async function getReward(rewardId: string) {
  const res = await api.get(`/rewards/${rewardId}`)
  return res.data.reward || res.data
}

export async function redeemReward(rewardId: string) {
  const res = await api.post(`/rewards/${rewardId}/redeem`)
  return res.data
}

export async function getMyRedemptions() {
  const res = await api.get('/rewards/my-redemptions')
  return res.data.redemptions || res.data
}
