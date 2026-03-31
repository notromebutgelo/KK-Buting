'use client'
import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { useUserStore } from '@/store/userStore'

export function useUser() {
  const { profile, isLoading, setProfile, setLoading } = useUserStore()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchUser() {
      setLoading(true)
      try {
        const res = await api.get('/users/me')
        setProfile(res.data.profile ?? res.data)
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to fetch user'
        setError(message)
      } finally {
        setLoading(false)
      }
    }
    fetchUser()
  }, [setProfile, setLoading])

  return { profile, isLoading, error }
}
