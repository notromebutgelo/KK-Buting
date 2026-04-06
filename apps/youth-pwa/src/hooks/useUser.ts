'use client'
import { useEffect, useState } from 'react'
import { getVerificationStatus } from '@/services/verification.service'
import { useUserStore } from '@/store/userStore'

export function useUser() {
  const { profile, isLoading, setProfile, setLoading } = useUserStore()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function fetchUser() {
      setLoading(true)
      try {
        const nextProfile = await getVerificationStatus()
        if (active) {
          setProfile(nextProfile)
          setError(null)
        }
      } catch (err: unknown) {
        if (!active) return

        const statusCode =
          typeof err === 'object' &&
          err !== null &&
          'response' in err &&
          typeof (err as { response?: { status?: number } }).response?.status === 'number'
            ? (err as { response?: { status?: number } }).response?.status
            : undefined

        if (statusCode === 404) {
          setProfile(null)
          setError(null)
        } else {
          const message = err instanceof Error ? err.message : 'Failed to fetch user profile'
          setError(message)
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void fetchUser()

    return () => {
      active = false
    }
  }, [setProfile, setLoading])

  return { profile, isLoading, error }
}
