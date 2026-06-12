import axios from 'axios'
import api from '@/lib/api'
import type { MerchantNotification, MerchantProduct, MerchantProfile, MerchantPromotion, MerchantStatus, MerchantTransaction } from '@/types/merchant'
import { linesToText, maskMemberId, textToLines } from '@/utils/format'

function nowIso() {
  return new Date().toISOString()
}

function mapStatus(status?: string): MerchantStatus {
  if (status === 'approved' || status === 'active') return 'active'
  if (status === 'suspended' || status === 'rejected') return 'suspended'
  return 'pending'
}

function mapError(error: unknown): never {
  if (axios.isAxiosError(error)) {
    const message = String(error.response?.data?.error || error.response?.data?.message || error.message || 'Request failed.')
    throw new Error(message)
  }
  throw error
}

function mapProfile(item: Record<string, unknown>): MerchantProfile {
  const pointsRate = Number(item.pointsRate || 10)
  return {
    id: String(item.id || item.uid || 'merchant'),
    businessName: String(item.businessName || item.name || 'Merchant'),
    ownerName: String(item.ownerName || item.UserName || 'Merchant Owner'),
    email: String(item.ownerEmail || item.email || ''),
    contactNumber: String(item.contactNumber || ''),
    address: String(item.address || ''),
    category: String(item.category || ''),
    shortDescription: String(item.shortDescription || item.description || ''),
    businessInfo: String(item.businessInfo || ''),
    discountInfo: String(item.discountInfo || ''),
    termsAndConditions: linesToText(item.termsAndConditions),
    pointsPolicy: String(item.pointsPolicy || `Members earn 1 point for every ${pointsRate} pesos spent.`),
    pointsRate,
    logoUrl: String(item.logoUrl || ''),
    bannerUrl: String(item.bannerUrl || item.imageUrl || ''),
    status: mapStatus(String(item.status || 'pending')),
    updatedAt: String(item.updatedAt || item.createdAt || nowIso()),
  }
}

function mapPromotion(item: Record<string, unknown>): MerchantPromotion {
  return {
    id: String(item.id || `promo-${Date.now()}`),
    title: String(item.title || 'Untitled promotion'),
    shortTagline: String(item.shortTagline || ''),
    bannerUrl: String(item.bannerUrl || ''),
    startDate: String(item.startDate || nowIso().slice(0, 10)),
    endDate: String(item.endDate || nowIso().slice(0, 10)),
    type: (item.type as MerchantPromotion['type']) || 'discount',
    valueLabel: String(item.valueLabel || ''),
    availability: (item.availability as MerchantPromotion['availability']) || 'all',
    terms: Array.isArray(item.terms) ? item.terms.map((term) => String(term)) : [],
    isActive: item.isActive !== false,
    redemptions: Number(item.redemptions || 0),
    views: Number(item.views || 0),
    updatedAt: String(item.updatedAt || item.createdAt || nowIso()),
  }
}

function mapProduct(item: Record<string, unknown>): MerchantProduct {
  return {
    id: String(item.id || `product-${Date.now()}`),
    name: String(item.name || 'Untitled product'),
    price: Number(item.price || 0),
    category: String(item.category || ''),
    description: String(item.description || ''),
    imageUrl: String(item.imageUrl || ''),
    isActive: item.isActive !== false,
    updatedAt: String(item.updatedAt || item.createdAt || nowIso()),
  }
}

function mapTransaction(item: Record<string, unknown>): MerchantTransaction {
  const memberId = String(item.memberId || item.userId || 'member')
  return {
    id: String(item.id || `txn-${Date.now()}`),
    memberId,
    memberIdMasked: maskMemberId(memberId),
    memberLabel: String(item.userName || 'Verified Member'),
    amountSpent: Number(item.amountSpent || 0),
    pointsAwarded: Number(item.pointsGiven || item.pointsAwarded || 0),
    status: String(item.status || 'success') === 'failed' ? 'failed' : 'success',
    createdAt: String(item.createdAt || nowIso()),
    note: item.reason ? String(item.reason) : undefined,
  }
}

function mapNotification(item: Record<string, unknown>): MerchantNotification {
  return {
    id: String(item.id || `alert-${Date.now()}`),
    title: String(item.title || 'Notification'),
    body: String(item.body || ''),
    type: (String(item.type || 'info') as MerchantNotification['type']),
    createdAt: String(item.createdAt || nowIso()),
    read: Boolean(item.read),
  }
}

export async function getMerchantProfile() {
  try {
    const response = await api.get('/merchants/me')
    return mapProfile(response.data?.merchant ?? response.data)
  } catch (error) {
    mapError(error)
  }
}

export async function updateMerchantProfile(patch: Partial<MerchantProfile>) {
  try {
    const response = await api.patch('/merchants/me', {
      businessName: patch.businessName,
      category: patch.category,
      contactNumber: patch.contactNumber,
      address: patch.address,
      shortDescription: patch.shortDescription,
      businessInfo: patch.businessInfo,
      discountInfo: patch.discountInfo,
      termsAndConditions: textToLines(patch.termsAndConditions),
      pointsPolicy: patch.pointsPolicy,
      logoUrl: patch.logoUrl,
      bannerUrl: patch.bannerUrl,
      imageUrl: patch.bannerUrl || patch.logoUrl,
    })
    return mapProfile(response.data?.merchant ?? response.data)
  } catch (error) {
    mapError(error)
  }
}

export async function getMerchantPromotions() {
  try {
    const response = await api.get('/merchants/me/promotions')
    const items = (response.data?.promotions || response.data || []) as Array<Record<string, unknown>>
    return items.map(mapPromotion)
  } catch (error) {
    mapError(error)
  }
}

export async function saveMerchantPromotion(draft: Partial<MerchantPromotion>) {
  try {
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
    return mapPromotion(response.data?.promotion ?? response.data)
  } catch (error) {
    mapError(error)
  }
}

export async function deleteMerchantPromotion(id: string) {
  await api.delete(`/merchants/me/promotions/${id}`)
}

export async function getMerchantProducts() {
  try {
    const response = await api.get('/merchants/me/products')
    const items = (response.data?.products || response.data || []) as Array<Record<string, unknown>>
    return items.map(mapProduct)
  } catch (error) {
    mapError(error)
  }
}

export async function saveMerchantProduct(draft: Partial<MerchantProduct>) {
  try {
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
    return mapProduct(response.data?.product ?? response.data)
  } catch (error) {
    mapError(error)
  }
}

export async function deleteMerchantProduct(id: string) {
  await api.delete(`/merchants/me/products/${id}`)
}

export async function getMerchantTransactions() {
  try {
    const response = await api.get('/merchants/me/transactions')
    const items = (response.data?.transactions || response.data || []) as Array<Record<string, unknown>>
    return items.map(mapTransaction)
  } catch (error) {
    mapError(error)
  }
}

export async function getMerchantNotifications() {
  try {
    const response = await api.get('/notifications/me')
    const items = (response.data?.notifications || response.data || []) as Array<Record<string, unknown>>
    return items.map(mapNotification)
  } catch (error) {
    mapError(error)
  }
}

export async function markAllNotificationsRead() {
  await api.post('/notifications/me/read-all')
  return getMerchantNotifications()
}
