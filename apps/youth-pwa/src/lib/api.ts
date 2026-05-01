import axios from 'axios'
import { auth } from './firebase'
import { signOut as firebaseSignOut } from 'firebase/auth'
import { resolveApiBaseUrl } from './api-base-url'

function normalizeApiBaseUrl(url?: string) {
  return resolveApiBaseUrl(url)
}

const api = axios.create({
  baseURL: normalizeApiBaseUrl(process.env.NEXT_PUBLIC_API_URL),
  headers: {
    'Content-Type': 'application/json',
  },
})

let isHandlingUnauthorized = false

async function waitForAuthReady() {
  if (typeof auth.authStateReady === 'function') {
    await auth.authStateReady()
    return
  }

  await new Promise<void>((resolve) => {
    const unsubscribe = auth.onAuthStateChanged(() => {
      unsubscribe()
      resolve()
    })
  })
}

api.interceptors.request.use(
  async (config) => {
    await waitForAuthReady()
    const user = auth.currentUser
    if (user) {
      const token = await user.getIdToken()
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined' && !isHandlingUnauthorized) {
      isHandlingUnauthorized = true
      void (async () => {
        await firebaseSignOut(auth).catch(() => undefined)
        await fetch('/api/session', {
          method: 'DELETE',
          credentials: 'same-origin',
        }).catch(() => undefined)
        window.location.href = '/login'
      })()
    }
    return Promise.reject(error)
  }
)

export default api
