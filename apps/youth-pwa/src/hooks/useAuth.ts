'use client'
import { useEffect } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { useAuthStore } from '@/store/authStore'
import { useUserStore } from '@/store/userStore'
import api from '@/lib/api'

export function useAuth() {
  const { user, token, isLoading, setUser, setToken, setLoading } = useAuthStore()
  const setProfile = useUserStore((state) => state.setProfile)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const idToken = await firebaseUser.getIdToken()
        setToken(idToken)
        try {
          const res = await api.get('/users/me')
          const payload = res.data.user ?? res.data
          setUser(
            payload
              ? {
                  uid: payload.uid ?? payload.id ?? firebaseUser.uid,
                  UserName:
                    payload.UserName ??
                    payload.username ??
                    payload.email?.split('@')[0] ??
                    firebaseUser.displayName ??
                    'Youth Member',
                  email: payload.email ?? firebaseUser.email ?? '',
                  role: payload.role ?? 'youth',
                  createdAt: payload.createdAt ?? '',
                }
              : null
          )
        } catch {
          setUser(null)
          setProfile(null)
        }
      } else {
        setUser(null)
        setToken(null)
        setProfile(null)
      }
      setLoading(false)
    })
    return () => unsubscribe()
  }, [setUser, setToken, setLoading, setProfile])

  return { user, token, isLoading }
}
