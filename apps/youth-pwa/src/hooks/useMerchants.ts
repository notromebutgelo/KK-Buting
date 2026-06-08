'use client'
import { useEffect, useState } from 'react'
import api from '@/lib/api'

export interface Merchant {
  id: string
  name: string
  businessName?: string
  description: string
  shortDescription?: string
  category: string
  address: string
  locationDetails?: string
  contactNumber?: string
  email?: string
  websiteUrl?: string
  facebookUrl?: string
  mapUrl?: string
  operatingHours?: string
  imageUrl: string
  bannerUrl?: string
  logoUrl?: string
  galleryUrls?: string[]
  businessInfo?: string
  discountInfo?: string
  termsAndConditions?: string
  pointsPolicy?: string
  pointsRate?: number
  isFeatured?: boolean
  status: 'pending' | 'approved' | 'rejected' | 'suspended'
  ownerId: string
  createdAt: string
  promotions?: Array<{
    id: string
    title: string
    shortTagline?: string
    bannerUrl?: string
    valueLabel?: string
    endDate?: string
  }>
  products?: Array<{
    id: string
    name: string
    description?: string
    category?: string
    imageUrl?: string
    price?: number
    itemType?: 'product' | 'service'
  }>
}

export function useMerchants() {
  const [merchants, setMerchants] = useState<Merchant[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchMerchants() {
      setIsLoading(true)
      try {
        const res = await api.get('/merchants')
        setMerchants(res.data.merchants || res.data)
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to fetch merchants'
        setError(message)
      } finally {
        setIsLoading(false)
      }
    }
    fetchMerchants()
  }, [])

  return { merchants, isLoading, error }
}
