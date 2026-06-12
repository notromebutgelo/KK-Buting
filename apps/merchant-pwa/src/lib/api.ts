import axios from 'axios'
import { signOut as firebaseSignOut } from 'firebase/auth'
import { getFirebaseAuth } from './firebase'
import { API_BASE_URL } from './api-base-url'
import { useAuthStore } from '@/store/authStore'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

let isHandlingUnauthorized = false

async function waitForAuthReady() {
  const auth = getFirebaseAuth()
  const authWithReady = auth as typeof auth & { authStateReady?: () => Promise<void> }

  if (typeof authWithReady.authStateReady === 'function') {
    await authWithReady.authStateReady()
    return
  }

  await new Promise<void>((resolve) => {
    const unsubscribe = auth.onAuthStateChanged(() => {
      unsubscribe()
      resolve()
    })
  })
}

api.interceptors.request.use(async (config) => {
  await waitForAuthReady()
  const auth = getFirebaseAuth()
  const user = auth.currentUser
  if (user) {
    const token = await user.getIdToken()
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined' && !isHandlingUnauthorized) {
      isHandlingUnauthorized = true
      void (async () => {
        const auth = getFirebaseAuth()
        await firebaseSignOut(auth).catch(() => undefined)
        useAuthStore.getState().logout()
        window.location.href = '/login'
      })()
    }

    return Promise.reject(error)
  }
)

export default api
