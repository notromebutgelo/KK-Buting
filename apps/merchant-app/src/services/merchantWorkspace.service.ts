import axios from 'axios'

import api from '../lib/api'
import type { MerchantUser } from '../store/authStore'
import type {
  MerchantDashboardSnapshot,
  MerchantNotification,
  MerchantProduct,
  MerchantProfile,
  MerchantPromotion,
  MerchantStatus,
  MerchantTransaction,
} from '../types/merchant'
import { getStatusMessage, maskMemberId } from '../utils/merchant'

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function nowIso() {
  return new Date().toISOString()
}

function mapBackendStatus(status: string | undefined): MerchantStatus {
  if (status === 'approved' || status === 'active') return 'active'
  if (status === 'suspended' || status === 'rejected') return 'suspended'
  return 'pending'
}

function mapBackendProfile(payload: Record<string, unknown>, user: MerchantUser | null | undefined): MerchantProfile {
  const status = mapBackendStatus(String(payload.status || 'pending'))

  return {
    id: String(payload.id || user?.uid || 'merchant-demo'),
    businessName: String(payload.businessName || payload.name || user?.UserName || 'Merchant'),
    ownerName: String(payload.ownerName || user?.UserName || 'Merchant Owner'),
    email: String(payload.ownerEmail || payload.email || user?.email || 'merchant@example.com'),
    contactNumber: String(payload.contactNumber || ''),
    address: String(payload.address || ''),
    category: String(payload.category || ''),
    shortDescription: String(payload.shortDescription || payload.description || ''),
    businessInfo: String(payload.businessInfo || ''),
    discountInfo: String(payload.discountInfo || ''),
    termsAndConditions: String(payload.termsAndConditions || ''),
    pointsPolicy: String(
      payload.pointsPolicy ||
        'Earn 10 points for every PHP 100 spent at this shop. Present your youth QR during checkout.'
    ),
    pointsRate: Number(payload.pointsRate || 10),
    logoUrl: String(payload.logoUrl || ''),
    bannerUrl: String(payload.bannerUrl || payload.imageUrl || ''),
    status,
    adminNote: getStatusMessage(status),
    updatedAt: String(payload.updatedAt || payload.createdAt || nowIso()),
  }
}

function mapBackendPromotion(item: Record<string, unknown>): MerchantPromotion {
  return {
    id: String(item.id || createId('promo')),
    title: String(item.title || 'Untitled Promo'),
    shortTagline: String(item.shortTagline || ''),
    bannerUrl: String(item.bannerUrl || ''),
    startDate: String(item.startDate || nowIso().slice(0, 10)),
    endDate: String(item.endDate || nowIso().slice(0, 10)),
    type: (item.type as MerchantPromotion['type']) || 'discount',
    valueLabel: String(item.valueLabel || ''),
    availability: (item.availability as MerchantPromotion['availability']) || 'dine-in',
    terms: Array.isArray(item.terms) ? item.terms.map((term) => String(term)) : [],
    isActive: item.isActive !== false,
    redemptions: Number(item.redemptions || 0),
    views: Number(item.views || 0),
    updatedAt: String(item.updatedAt || item.createdAt || nowIso()),
  }
}

function mapBackendProduct(item: Record<string, unknown>): MerchantProduct {
  return {
    id: String(item.id || createId('product')),
    name: String(item.name || 'Untitled Product'),
    price: Number(item.price || 0),
    category: String(item.category || ''),
    description: String(item.description || ''),
    imageUrl: String(item.imageUrl || ''),
    isActive: item.isActive !== false,
    updatedAt: String(item.updatedAt || item.createdAt || nowIso()),
  }
}

function mapBackendTransaction(item: Record<string, unknown>): MerchantTransaction {
  const memberId = String(item.memberId || item.userId || 'unknown-member')
  const userName = String(item.userName || 'Verified Member')

  return {
    id: String(item.id || createId('txn')),
    memberId,
    memberIdMasked: maskMemberId(memberId),
    memberLabel: userName,
    amountSpent: Number(item.amountSpent || 0),
    pointsAwarded: Number(item.pointsGiven || item.pointsAwarded || 0),
    status: String(item.status || 'success') === 'failed' ? 'failed' : 'success',
    createdAt: String(item.createdAt || nowIso()),
    note:
      String(item.status || 'success') === 'failed'
        ? String(item.reason || 'Scan failed')
        : undefined,
  }
}

function mapBackendNotification(item: Record<string, unknown>): MerchantNotification {
  return {
    id: String(item.id || createId('notif')),
    title: String(item.title || 'Notification'),
    body: String(item.body || ''),
    type: (String(item.type || 'info') as MerchantNotification['type']),
    createdAt: String(item.createdAt || nowIso()),
    read: Boolean(item.read),
  }
}

function rethrowApiError(error: unknown): never {
  if (axios.isAxiosError(error)) {
    throw new Error(String(error.response?.data?.error || error.message || 'Request failed'))
  }

  throw error
}

export async function getMerchantProfile(user: MerchantUser | null | undefined) {
  const response = await api.get('/merchants/me')
  return mapBackendProfile(response.data?.merchant ?? response.data, user)
}

export async function updateMerchantProfile(
  user: MerchantUser | null | undefined,
  patch: Partial<MerchantProfile>
) {
  try {
    const response = await api.patch('/merchants/me', {
      businessName: patch.businessName,
      category: patch.category,
      contactNumber: patch.contactNumber,
      address: patch.address,
      shortDescription: patch.shortDescription,
      businessInfo: patch.businessInfo,
      discountInfo: patch.discountInfo,
      termsAndConditions: patch.termsAndConditions,
      pointsPolicy: patch.pointsPolicy,
      logoUrl: patch.logoUrl,
      bannerUrl: patch.bannerUrl,
      imageUrl: patch.bannerUrl || patch.logoUrl,
    })
    return mapBackendProfile(response.data?.merchant ?? response.data, user)
  } catch (error) {
    rethrowApiError(error)
  }
}

export async function uploadMerchantAsset(
  _user: MerchantUser | null | undefined,
  assetType: 'logo' | 'banner',
  fileData: string
) {
  try {
    const response = await api.post('/merchants/me/assets', {
      assetType,
      fileData,
    })

    return String(response.data?.fileUrl || '')
  } catch (error) {
    rethrowApiError(error)
  }
}

export async function getMerchantPromotions(_user: MerchantUser | null | undefined) {
  const response = await api.get('/merchants/me/promotions')
  const promotions = (response.data?.promotions || response.data || []) as Array<Record<string, unknown>>
  return promotions.map(mapBackendPromotion)
}

export async function saveMerchantPromotion(
  _user: MerchantUser | null | undefined,
  draft: Partial<MerchantPromotion>
) {
  const payload = {
    title: draft.title,
    shortTagline: draft.shortTagline,
    bannerUrl: draft.bannerUrl,
    startDate: draft.startDate,
    endDate: draft.endDate,
    type: draft.type,
    valueLabel: draft.valueLabel,
    availability: draft.availability,
    terms: draft.terms,
    isActive: draft.isActive,
    redemptions: draft.redemptions,
    views: draft.views,
  }

  const response = draft.id
    ? await api.patch(`/merchants/me/promotions/${draft.id}`, payload)
    : await api.post('/merchants/me/promotions', payload)

  return mapBackendPromotion((response.data?.promotion ?? response.data) as Record<string, unknown>)
}

export async function deleteMerchantPromotion(_user: MerchantUser | null | undefined, promotionId: string) {
  await api.delete(`/merchants/me/promotions/${promotionId}`)
}

export async function getMerchantProducts(_user: MerchantUser | null | undefined) {
  const response = await api.get('/merchants/me/products')
  const products = (response.data?.products || response.data || []) as Array<Record<string, unknown>>
  return products.map(mapBackendProduct)
}

export async function saveMerchantProduct(
  _user: MerchantUser | null | undefined,
  draft: Partial<MerchantProduct>
) {
  const payload = {
    name: draft.name,
    price: Number(draft.price || 0),
    category: draft.category,
    description: draft.description,
    imageUrl: draft.imageUrl,
    isActive: draft.isActive,
  }

  const response = draft.id
    ? await api.patch(`/merchants/me/products/${draft.id}`, payload)
    : await api.post('/merchants/me/products', payload)

  return mapBackendProduct((response.data?.product ?? response.data) as Record<string, unknown>)
}

export async function deleteMerchantProduct(_user: MerchantUser | null | undefined, productId: string) {
  await api.delete(`/merchants/me/products/${productId}`)
}

export async function getMerchantNotifications(user: MerchantUser | null | undefined) {
  const response = await api.get('/notifications/me')
  const notifications = (response.data?.notifications || response.data || []) as Array<Record<string, unknown>>
  return notifications.map(mapBackendNotification)
}

export async function markAllNotificationsRead(user: MerchantUser | null | undefined) {
  await api.post('/notifications/me/read-all')
  return getMerchantNotifications(user)
}

export async function getMerchantTransactions(_user: MerchantUser | null | undefined) {
  const response = await api.get('/merchants/me/transactions')
  const transactions = (response.data?.transactions || response.data || []) as Array<Record<string, unknown>>
  return transactions.map(mapBackendTransaction)
}

export async function getMerchantDashboardSnapshot(
  user: MerchantUser | null | undefined
): Promise<MerchantDashboardSnapshot> {
  const [profile, promotions, notifications, transactions] = await Promise.all([
    getMerchantProfile(user),
    getMerchantPromotions(user),
    getMerchantNotifications(user),
    getMerchantTransactions(user),
  ])

  const todayKey = new Date().toISOString().slice(0, 10)
  const monthKey = new Date().toISOString().slice(0, 7)
  const successfulTransactions = transactions.filter((transaction) => transaction.status === 'success')

  return {
    profile,
    scansToday: successfulTransactions.filter((transaction) => transaction.createdAt.slice(0, 10) === todayKey).length,
    approvedPointsToday: successfulTransactions
      .filter((transaction) => transaction.createdAt.slice(0, 10) === todayKey)
      .reduce((sum, transaction) => sum + transaction.pointsAwarded, 0),
    transactionsThisMonth: successfulTransactions.filter((transaction) => transaction.createdAt.slice(0, 7) === monthKey)
      .length,
    activePromotionCount: promotions.filter((promotion) => promotion.isActive).length,
    unreadNotificationCount: notifications.filter((notification) => !notification.read).length,
    recentTransactions: transactions.slice(0, 4),
    spotlightPromotion: promotions.find((promotion) => promotion.isActive) || null,
  }
}
