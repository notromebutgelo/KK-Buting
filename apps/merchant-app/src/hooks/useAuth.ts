import axios from 'axios'
import { useEffect } from 'react'
import { onIdTokenChanged } from 'firebase/auth'

import { auth } from '../lib/firebase'
import { getCurrentMerchant } from '../services/auth.service'
import { useAuthStore } from '../store/authStore'

export function useAuth() {
  const hydrate = useAuthStore((state) => state.hydrate)
  const setUser = useAuthStore((state) => state.setUser)
  const setToken = useAuthStore((state) => state.setToken)
  const setLoading = useAuthStore((state) => state.setLoading)
  const logout = useAuthStore((state) => state.logout)

  useEffect(() => {
    void hydrate()
  }, [hydrate])

  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        await logout()
        return
      }

      const existingUser = useAuthStore.getState().user

      try {
        setLoading(true)
        const token = await firebaseUser.getIdToken()
        setToken(token)
        const payload = await getCurrentMerchant()

        setUser({
          uid: String(payload.uid ?? payload.id ?? firebaseUser.uid),
          email: String(payload.email ?? firebaseUser.email ?? ''),
          UserName: String(
            payload.UserName ??
              payload.username ??
              firebaseUser.displayName ??
              firebaseUser.email?.split('@')[0] ??
              'Merchant'
          ),
          role: String(payload.role ?? 'merchant') as 'merchant' | 'admin' | 'youth',
          createdAt: payload.createdAt ? String(payload.createdAt) : undefined,
        })
      } catch (error) {
        const status = axios.isAxiosError(error) ? error.response?.status : undefined

        if (status === 401 || status === 403 || !existingUser) {
          await logout()
        }
      } finally {
        setLoading(false)
      }
    })

    return () => unsubscribe()
  }, [logout, setLoading, setToken, setUser])

  return useAuthStore()
}
