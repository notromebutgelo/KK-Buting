import axios from 'axios'
import { useEffect } from 'react'

import { getCurrentMerchant } from '../services/auth.service'
import type { MerchantUser } from '../store/authStore'
import { useAuthStore } from '../store/authStore'

function toMerchantUser(payload: Awaited<ReturnType<typeof getCurrentMerchant>>, existingUser?: MerchantUser | null) {
  return {
    uid: payload.uid || existingUser?.uid || '',
    email: payload.email || existingUser?.email || '',
    UserName:
      payload.UserName ||
      existingUser?.UserName ||
      existingUser?.email?.split('@')[0] ||
      'Merchant',
    role: payload.role || 'merchant',
    createdAt: payload.createdAt,
    mustChangePassword: Boolean(payload.mustChangePassword),
  }
}

export function useAuth() {
  const hydrate = useAuthStore((state) => state.hydrate)
  const setUser = useAuthStore((state) => state.setUser)
  const setLoading = useAuthStore((state) => state.setLoading)
  const logout = useAuthStore((state) => state.logout)

  useEffect(() => {
    let active = true

    void (async () => {
      await hydrate()

      if (!active) return

      const existingState = useAuthStore.getState()
      if (!existingState.user || !existingState.token) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const payload = await getCurrentMerchant()
        if (active) {
          setUser(toMerchantUser(payload, existingState.user))
        }
      } catch (error) {
        const status = axios.isAxiosError(error) ? error.response?.status : undefined

        if (status === 401 || status === 403 || !existingState.user) {
          await logout()
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    })()

    return () => {
      active = false
    }
  }, [hydrate, logout, setLoading, setUser])

  return useAuthStore()
}
