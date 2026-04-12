import axios from 'axios'
import { auth } from './firebase'

function normalizeApiBaseUrl(url?: string) {
  const fallback = 'http://localhost:4000/api'
  const value = (url || fallback).trim()

  return value.replace(/\/+$/, '')
}

const api = axios.create({
  baseURL: normalizeApiBaseUrl(process.env.NEXT_PUBLIC_API_URL),
  headers: {
    'Content-Type': 'application/json',
  },
})

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
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api
