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
  refreshToken: string | null
  tokenExpiresAt: number | null
  isLoading: boolean
  isInteractiveLogin: boolean
  hasHydrated: boolean
  setUser: (user: MerchantUser | null) => void
  setToken: (token: string | null) => void
  setAuthSession: (token: string | null, refreshToken?: string | null, tokenExpiresAt?: number | null) => void
  setLoading: (value: boolean) => void
  setInteractiveLogin: (value: boolean) => void
  hydrate: () => Promise<void>
  logout: () => Promise<void>
}

const USER_KEY = 'merchant-user'
const TOKEN_KEY = 'merchant-token'
const REFRESH_TOKEN_KEY = 'merchant-refresh-token'
const TOKEN_EXPIRES_AT_KEY = 'merchant-token-expires-at'

function parseStoredUser(value: string | null) {
  if (!value) return null

  try {
    const parsed = JSON.parse(value) as Partial<MerchantUser>
    if (!parsed || typeof parsed !== 'object' || !parsed.uid || !parsed.email) {
      return null
    }

    return parsed as MerchantUser
  } catch {
    return null
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  refreshToken: null,
  tokenExpiresAt: null,
  isLoading: true,
  isInteractiveLogin: false,
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
  setAuthSession: (token, refreshToken = null, tokenExpiresAt = null) => {
    if (token) {
      void AsyncStorage.setItem(TOKEN_KEY, token)
    } else {
      void AsyncStorage.removeItem(TOKEN_KEY)
    }

    if (refreshToken) {
      void AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
    } else if (refreshToken === null) {
      void AsyncStorage.removeItem(REFRESH_TOKEN_KEY)
    }

    if (tokenExpiresAt) {
      void AsyncStorage.setItem(TOKEN_EXPIRES_AT_KEY, String(tokenExpiresAt))
    } else if (tokenExpiresAt === null) {
      void AsyncStorage.removeItem(TOKEN_EXPIRES_AT_KEY)
    }

    set({ token, refreshToken, tokenExpiresAt })
  },
  setLoading: (isLoading) => set({ isLoading }),
  setInteractiveLogin: (isInteractiveLogin) => set({ isInteractiveLogin }),
  hydrate: async () => {
    try {
      const [storedUser, storedToken, storedRefreshToken, storedTokenExpiresAt] = await Promise.all([
        AsyncStorage.getItem(USER_KEY),
        AsyncStorage.getItem(TOKEN_KEY),
        AsyncStorage.getItem(REFRESH_TOKEN_KEY),
        AsyncStorage.getItem(TOKEN_EXPIRES_AT_KEY),
      ])
      const parsedUser = parseStoredUser(storedUser)
      const parsedTokenExpiresAt = storedTokenExpiresAt ? Number(storedTokenExpiresAt) : null

      if (storedUser && !parsedUser) {
        await Promise.all([
          AsyncStorage.removeItem(USER_KEY),
          AsyncStorage.removeItem(TOKEN_KEY),
          AsyncStorage.removeItem(REFRESH_TOKEN_KEY),
          AsyncStorage.removeItem(TOKEN_EXPIRES_AT_KEY),
        ])
      }

      set({
        user: parsedUser,
        token: parsedUser ? storedToken : null,
        refreshToken: parsedUser ? storedRefreshToken : null,
        tokenExpiresAt: parsedUser && Number.isFinite(parsedTokenExpiresAt) ? parsedTokenExpiresAt : null,
        hasHydrated: true,
        isLoading: false,
      })
    } catch {
      await Promise.all([
        AsyncStorage.removeItem(USER_KEY),
        AsyncStorage.removeItem(TOKEN_KEY),
        AsyncStorage.removeItem(REFRESH_TOKEN_KEY),
        AsyncStorage.removeItem(TOKEN_EXPIRES_AT_KEY),
      ])
      set({
        user: null,
        token: null,
        refreshToken: null,
        tokenExpiresAt: null,
        hasHydrated: true,
        isLoading: false,
        isInteractiveLogin: false,
      })
    }
  },
  logout: async () => {
    await Promise.all([
      AsyncStorage.removeItem(USER_KEY),
      AsyncStorage.removeItem(TOKEN_KEY),
      AsyncStorage.removeItem(REFRESH_TOKEN_KEY),
      AsyncStorage.removeItem(TOKEN_EXPIRES_AT_KEY),
    ])
    set({
      user: null,
      token: null,
      refreshToken: null,
      tokenExpiresAt: null,
      isLoading: false,
      isInteractiveLogin: false,
      hasHydrated: true,
    })
  },
}))
