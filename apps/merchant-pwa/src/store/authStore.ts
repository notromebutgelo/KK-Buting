import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export interface MerchantUser {
  uid: string
  email: string
  UserName: string
  role: 'merchant'
  createdAt?: string
  mustChangePassword?: boolean
}

interface AuthState {
  user: MerchantUser | null
  hasHydrated: boolean
  setUser: (user: MerchantUser | null) => void
  setHasHydrated: (value: boolean) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      hasHydrated: false,
      setUser: (user) => set({ user }),
      setHasHydrated: (value) => set({ hasHydrated: value }),
      logout: () => set({ user: null }),
    }),
    {
      name: 'kk-merchant-pwa-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ user: state.user }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      },
    }
  )
)
