'use client'
import { useEffect, useState } from 'react'
import api from '@/lib/api'

export interface Reward {
  id: string
  title: string
  description: string
  points: number
  category: 'food' | 'services' | 'others'
  merchantId: string
  merchantName: string
  imageUrl: string
  validDays: number
  createdAt: string
}

export function useRewards(category?: string) {
  const [rewards, setRewards] = useState<Reward[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchRewards() {
      setIsLoading(true)
      try {
        const params = category && category !== 'all' ? { category } : {}
        const res = await api.get('/rewards', { params })
        setRewards(res.data.rewards || res.data)
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to fetch rewards'
        setError(message)
      } finally {
        setIsLoading(false)
      }
    }
    fetchRewards()
  }, [category])

  return { rewards, isLoading, error }
}
