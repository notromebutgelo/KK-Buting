export interface Reward {
  id: string
  title: string
  description: string
  points: number
  category: 'food' | 'services' | 'others' | string
  merchantId: string
  merchantName: string
  merchantLogoUrl?: string
  imageUrl: string
  stock?: number | null
  unlimitedStock?: boolean
  expiryDate?: string | null
  status?: 'active' | 'inactive' | 'expired' | string
  validDays: number
  createdAt?: string
  updatedAt?: string
}

export interface RewardRedemption {
  id: string
  rewardId: string
  rewardTitle: string
  merchantId: string
  merchantName: string
  imageUrl?: string
  pointsCost: number
  status: 'active' | 'claimed' | 'expired' | string
  code?: string
  redeemedAt: string
  expiresAt: string
  claimedAt?: string | null
}
