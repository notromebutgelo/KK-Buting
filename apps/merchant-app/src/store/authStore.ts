import AsyncStorage from '@react-native-async-storage/async-storage'
import { create } from 'zustand'

export interface MerchantUser {
  uid: string
  email: string
  UserName: string
  role: 'merchant' | 'admin' | 'youth'
  createdAt?: string
  mustChangePassword?: boolean
}

interface AuthState {
  user: MerchantUser | null
  token: string | null
  isLoading: boolean
  hasHydrated: boolean
  setUser: (user: MerchantUser | null) => void
  setToken: (token: string | null) => void
  setLoading: (value: boolean) => void
  hydrate: () => Promise<void>
  logout: () => Promise<void>
}

const USER_KEY = 'merchant-user'
const TOKEN_KEY = 'merchant-token'

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: true,
  hasHydrated: false,
  setUser: (user) => {
    if (user) {
      void AsyncStorage.setItem(USER_KEY, JSON.stringify(user))
    } else {
      void AsyncStorage.removeItem(USER_KEY)
    }
    set({ user })
  },
  setToken: (token) => {
    if (token) {
      void AsyncStorage.setItem(TOKEN_KEY, token)
    } else {
      void AsyncStorage.removeItem(TOKEN_KEY)
    }
    set({ token })
  },
  setLoading: (isLoading) => set({ isLoading }),
  hydrate: async () => {
    const [storedUser, storedToken] = await Promise.all([
      AsyncStorage.getItem(USER_KEY),
      AsyncStorage.getItem(TOKEN_KEY),
    ])

    set({
      user: storedUser ? (JSON.parse(storedUser) as MerchantUser) : null,
      token: storedToken,
      hasHydrated: true,
      isLoading: false,
    })
  },
  logout: async () => {
    await Promise.all([AsyncStorage.removeItem(USER_KEY), AsyncStorage.removeItem(TOKEN_KEY)])
    set({ user: null, token: null, isLoading: false, hasHydrated: true })
  },
}))
