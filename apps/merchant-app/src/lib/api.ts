import axios from 'axios'
import Constants from 'expo-constants'
import { Platform } from 'react-native'

import { useAuthStore } from '../store/authStore'

const DEFAULT_API_PORT = '4000'
const DEFAULT_API_PATH = '/api'
const LOCALHOST_API_URL = `http://localhost:${DEFAULT_API_PORT}${DEFAULT_API_PATH}`

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, '')
}

function isLoopbackHost(hostname: string) {
  return hostname === 'localhost' || hostname === '127.0.0.1'
}

function isPrivateIpv4(hostname: string) {
  return (
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)
  )
}

function getExpoHost() {
  const hostUri = Constants.expoConfig?.hostUri?.trim()
  if (!hostUri) {
    return null
  }

  return hostUri.split(':')[0] ?? null
}

function getDevApiUrl() {
  const configuredUrl = process.env.EXPO_PUBLIC_API_URL?.trim()
  const expoHost = getExpoHost()

  if (!configuredUrl) {
    if (expoHost) {
      return `http://${expoHost}:${DEFAULT_API_PORT}${DEFAULT_API_PATH}`
    }

    if (Platform.OS === 'android') {
      return `http://10.0.2.2:${DEFAULT_API_PORT}${DEFAULT_API_PATH}`
    }

    return LOCALHOST_API_URL
  }

  try {
    const url = new URL(configuredUrl)

    if (!__DEV__ || !expoHost || !isPrivateIpv4(expoHost)) {
      return trimTrailingSlash(url.toString())
    }

    if (isLoopbackHost(url.hostname) || (isPrivateIpv4(url.hostname) && url.hostname !== expoHost)) {
      url.hostname = expoHost
      url.port = url.port || DEFAULT_API_PORT
      url.pathname = url.pathname === '/' ? DEFAULT_API_PATH : url.pathname
    }

    return trimTrailingSlash(url.toString())
  } catch {
    return trimTrailingSlash(configuredUrl)
  }
}

export const API_BASE_URL = getDevApiUrl()

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      void useAuthStore.getState().logout()
    }
    return Promise.reject(error)
  }
)

export default api
