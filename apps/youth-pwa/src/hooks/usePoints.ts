'use client'
import { useEffect, useState } from 'react'
import { isAxiosError } from 'axios'
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

const EMPTY_POINTS: PointsData = {
  totalPoints: 0,
  earnedPoints: 0,
  redeemedPoints: 0,
  transactions: [],
}

export function usePoints() {
  const [data, setData] = useState<PointsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    async function fetchPoints() {
      setIsLoading(true)
      setError(null)
      try {
        const res = await api.get('/points/me')
        setData(res.data)
      } catch (err: unknown) {
        if (isAxiosError(err) && err.response?.status === 403) {
          setData(EMPTY_POINTS)
          setError(null)
          return
        }

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
