export type MerchantStatus = 'pending' | 'active' | 'suspended'

export type MerchantPromotionType = 'discount' | 'fixed_amount' | 'bundle'

export type MerchantAvailability = 'dine-in' | 'takeout' | 'delivery'

export type MerchantNotificationType =
  | 'system'
  | 'transaction'
  | 'promotion'
  | 'account'
  | 'info'
  | 'success'
  | 'warning'
  | 'error'

export type MerchantTransactionStatus = 'success' | 'failed'

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
  adminNote: string
  updatedAt: string
}

export interface MerchantPromotion {
  id: string
  title: string
  shortTagline: string
  bannerUrl: string
  startDate: string
  endDate: string
  type: MerchantPromotionType
  valueLabel: string
  availability: MerchantAvailability
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

export interface MerchantNotification {
  id: string
  title: string
  body: string
  type: MerchantNotificationType
  createdAt: string
  read: boolean
}

export interface MerchantTransaction {
  id: string
  memberId: string
  memberIdMasked: string
  memberLabel: string
  amountSpent: number
  pointsAwarded: number
  status: MerchantTransactionStatus
  createdAt: string
  note?: string
}

export interface MerchantDashboardSnapshot {
  profile: MerchantProfile
  scansToday: number
  approvedPointsToday: number
  transactionsThisMonth: number
  activePromotionCount: number
  unreadNotificationCount: number
  recentTransactions: MerchantTransaction[]
  spotlightPromotion: MerchantPromotion | null
}
