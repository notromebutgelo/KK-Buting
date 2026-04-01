'use client'
import { useEffect, useState } from 'react'
import api from '@/lib/api'
import type { Reward } from '@/types/rewards'

export function useRewards(category?: string, search?: string, merchantId?: string) {
  const [rewards, setRewards] = useState<Reward[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchRewards() {
      setIsLoading(true)
      try {
        const params = Object.fromEntries(
          Object.entries({
            category: category && category !== 'all' ? category : undefined,
            search: search?.trim() || undefined,
            merchantId: merchantId?.trim() || undefined,
          }).filter(([, value]) => value !== undefined)
        )
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
  }, [category, search, merchantId])

  return { rewards, isLoading, error }
}
