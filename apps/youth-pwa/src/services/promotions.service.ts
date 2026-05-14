import api from '@/lib/api'

export type YouthPromotion = {
  id: string
  merchantId: string
  merchantName: string
  title: string
  description: string
  status: string
  expiresAt: string | null
}

function mapPromotion(item: Record<string, unknown>): YouthPromotion {
  return {
    id: String(item.id || ''),
    merchantId: String(item.merchantId || ''),
    merchantName: String(item.merchantName || ''),
    title: String(item.title || ''),
    description: String(item.description || ''),
    status: String(item.status || ''),
    expiresAt: item.expiresAt ? String(item.expiresAt) : null,
  }
}

export async function getActivePromotions() {
  const res = await api.get('/promotions')
  const promotions = (res.data?.promotions || res.data || []) as Array<Record<string, unknown>>
  return promotions.map(mapPromotion)
}
