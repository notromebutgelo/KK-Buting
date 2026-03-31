'use client'
import { useEffect, useState } from 'react'
import api from '@/lib/api'

export interface Merchant {
  id: string
  name: string
  description: string
  category: string
  address: string
  imageUrl: string
  status: 'pending' | 'approved' | 'rejected'
  ownerId: string
  createdAt: string
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
