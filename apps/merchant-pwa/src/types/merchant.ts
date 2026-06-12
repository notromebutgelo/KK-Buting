export type MerchantStatus = 'active' | 'pending' | 'suspended'

export interface MerchantProfile {
  id: string
  businessName: string
  ownerName: string
  email: string
  contactNumber: string
  address: string
  category: string
  shortDescription: string
  businessInfo: string
  discountInfo: string
  termsAndConditions: string
  pointsPolicy: string
  pointsRate: number
  logoUrl: string
  bannerUrl: string
  status: MerchantStatus
  updatedAt: string
}

export interface MerchantPromotion {
  id: string
  title: string
  shortTagline: string
  bannerUrl: string
  startDate: string
  endDate: string
  type: 'discount' | 'bundle' | 'freebie' | 'event'
  valueLabel: string
  availability: 'dine-in' | 'take-out' | 'online' | 'all'
  terms: string[]
  isActive: boolean
  redemptions: number
  views: number
  updatedAt: string
}

export interface MerchantProduct {
  id: string
  name: string
  price: number
  category: string
  description: string
  imageUrl: string
  isActive: boolean
  updatedAt: string
}

export interface MerchantTransaction {
  id: string
  memberId: string
  memberIdMasked: string
  memberLabel: string
  amountSpent: number
  pointsAwarded: number
  status: 'success' | 'failed'
  createdAt: string
  note?: string
}

export interface MerchantNotification {
  id: string
  title: string
  body: string
  type: 'info' | 'warning' | 'success' | 'error'
  createdAt: string
  read: boolean
}
