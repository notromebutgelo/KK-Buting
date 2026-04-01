'use client'
import { useEffect, useState } from 'react'
import api from '@/lib/api'

interface PointsData {
  totalPoints: number
  earnedPoints: number
  redeemedPoints: number
  transactions: Array<{
    id: string
    type: 'earn' | 'redeem'
    points: number
    description: string
    createdAt: string
  }>
}

export function usePoints() {
  const [data, setData] = useState<PointsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    async function fetchPoints() {
      setIsLoading(true)
      try {
        const res = await api.get('/points/me')
        setData(res.data)
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to fetch points'
        setError(message)
      } finally {
        setIsLoading(false)
      }
    }
    fetchPoints()
  }, [reloadKey])

  return { data, isLoading, error, refresh: () => setReloadKey((current) => current + 1) }
}
