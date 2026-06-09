import axios from 'axios'
import type { InternalAxiosRequestConfig } from 'axios'
import Constants from 'expo-constants'
import { Platform } from 'react-native'

import { refreshFirebaseIdToken } from './firebaseIdentity'
import { useAuthStore } from '../store/authStore'

const DEFAULT_API_PORT = '4000'
const DEFAULT_API_PATH = '/api'
const LOCALHOST_API_URL = `http://localhost:${DEFAULT_API_PORT}${DEFAULT_API_PATH}`
const ANDROID_EMULATOR_HOST = '10.0.2.2'
const INVALID_PRODUCTION_API_URL = 'https://invalid.invalid/api'

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, '')
}

function ensureApiPath(pathname: string) {
  return pathname === '/' ? DEFAULT_API_PATH : pathname
}

function isLoopbackHost(hostname: string) {
  return hostname === 'localhost' || hostname === '127.0.0.1'
}

function isUnspecifiedHost(hostname: string) {
  return hostname === '0.0.0.0' || hostname === '::' || hostname === '[::]'
}

function isAndroidEmulatorHost(hostname: string) {
  return hostname === ANDROID_EMULATOR_HOST
}

function isLocalOnlyHost(hostname: string) {
  return isLoopbackHost(hostname) || isUnspecifiedHost(hostname) || isAndroidEmulatorHost(hostname)
}

function isPrivateIpv4(hostname: string) {
  return (
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)
  )
}

function shouldApplyDefaultPort(url: URL) {
  if (url.port) {
    return false
  }

  return url.protocol === 'http:' && (isLocalOnlyHost(url.hostname) || isPrivateIpv4(url.hostname))
}

function getHostFromUri(candidate?: string | null) {
  if (!candidate) {
    return null
  }

  const trimmed = candidate.trim()
  if (!trimmed) {
    return null
  }

  try {
    const normalized = trimmed.includes('://') ? trimmed : `http://${trimmed}`
    return new URL(normalized).hostname || null
  } catch {
    return trimmed.split(':')[0] ?? null
  }
}

function getExpoHost() {
  const runtimeConstants = Constants as typeof Constants & {
    expoGoConfig?: { debuggerHost?: string | null } | null
    manifest2?: { extra?: { expoClient?: { hostUri?: string | null } } } | null
  }

  const candidates = [
    Constants.expoConfig?.hostUri,
    runtimeConstants.expoGoConfig?.debuggerHost,
    runtimeConstants.manifest2?.extra?.expoClient?.hostUri,
    Constants.linkingUri,
  ]

  for (const candidate of candidates) {
    const host = getHostFromUri(candidate)
    if (host) {
      return host
    }
  }

  return null
}

type ApiConfig = {
  apiUrl: string
  configurationError: string | null
}

function getApiConfig(): ApiConfig {
  const configuredUrl =
    process.env.EXPO_PUBLIC_API_URL?.trim() ||
    String(Constants.expoConfig?.extra?.apiUrl ?? '').trim() ||
    undefined
  const expoHost = getExpoHost()
  const isProductionBuild = !__DEV__

  if (!configuredUrl) {
    if (isProductionBuild) {
      return {
        apiUrl: INVALID_PRODUCTION_API_URL,
        configurationError:
          'Missing EXPO_PUBLIC_API_URL for this merchant app build. Set it to your public Render backend, for example https://your-backend.onrender.com/api.',
      }
    }

    if (expoHost) {
      return {
        apiUrl: `http://${expoHost}:${DEFAULT_API_PORT}${DEFAULT_API_PATH}`,
        configurationError: null,
      }
    }

    if (Platform.OS === 'android') {
      return {
        apiUrl: `http://${ANDROID_EMULATOR_HOST}:${DEFAULT_API_PORT}${DEFAULT_API_PATH}`,
        configurationError: null,
      }
    }

    return {
      apiUrl: LOCALHOST_API_URL,
      configurationError: null,
    }
  }

  try {
    const url = new URL(configuredUrl)
    const shouldRewriteToExpoHost =
      __DEV__ &&
      !!expoHost &&
      isPrivateIpv4(expoHost) &&
      (isLoopbackHost(url.hostname) ||
        isUnspecifiedHost(url.hostname) ||
        (Platform.OS === 'android' && isAndroidEmulatorHost(url.hostname)))

    if (shouldRewriteToExpoHost) {
      url.hostname = expoHost
    }

    if (shouldApplyDefaultPort(url)) {
      url.port = DEFAULT_API_PORT
    }
    url.pathname = ensureApiPath(url.pathname)
    const normalizedUrl = trimTrailingSlash(url.toString())

    if (isProductionBuild && isLocalOnlyHost(url.hostname)) {
      return {
        apiUrl: normalizedUrl,
        configurationError:
          'This merchant app build is using a local API URL. Production APKs must point to your public Render backend, not localhost or emulator-only addresses.',
      }
    }

    return {
      apiUrl: normalizedUrl,
      configurationError: null,
    }
  } catch {
    return isProductionBuild
      ? {
          apiUrl: INVALID_PRODUCTION_API_URL,
          configurationError:
            'EXPO_PUBLIC_API_URL must be a valid absolute URL in production builds, for example https://your-backend.onrender.com/api.',
        }
      : {
          apiUrl: trimTrailingSlash(configuredUrl),
          configurationError: null,
        }
  }
}

const apiConfig = getApiConfig()
const API_REQUEST_TIMEOUT_MS = 20000
const API_WARMUP_TIMEOUT_MS = 6000
const API_RETRY_DELAY_MS = 800
const API_WARMUP_CACHE_MS = 5 * 60 * 1000

export const API_BASE_URL = apiConfig.apiUrl
export const API_CONFIGURATION_ERROR = apiConfig.configurationError

function getHealthCheckUrl() {
  try {
    const url = new URL(API_BASE_URL)
    url.pathname = '/health'
    url.search = ''
    url.hash = ''
    return url.toString()
  } catch {
    return ''
  }
}

let backendWarmupPromise: Promise<boolean> | null = null
let lastBackendWarmupAt = 0

export function warmUpApi() {
  if (API_CONFIGURATION_ERROR) {
    return Promise.resolve(false)
  }

  if (Date.now() - lastBackendWarmupAt < API_WARMUP_CACHE_MS) {
    return Promise.resolve(true)
  }

  if (backendWarmupPromise) {
    return backendWarmupPromise
  }

  const healthCheckUrl = getHealthCheckUrl()
  if (!healthCheckUrl) {
    return Promise.resolve(false)
  }

  backendWarmupPromise = (async () => {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        await axios.get(healthCheckUrl, { timeout: API_WARMUP_TIMEOUT_MS })
        lastBackendWarmupAt = Date.now()
        return true
      } catch {
        if (attempt === 0) {
          await wait(API_RETRY_DELAY_MS)
        }
      }
    }

    return false
  })().finally(() => {
    backendWarmupPromise = null
  })

  return backendWarmupPromise
}

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_REQUEST_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
  },
})

type RetryableRequestConfig = InternalAxiosRequestConfig & {
  merchantRetryCount?: number
}

function wait(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

function hasAuthorizationHeader(config: InternalAxiosRequestConfig) {
  const headers = config.headers as
    | (InternalAxiosRequestConfig['headers'] & {
        Authorization?: unknown
        authorization?: unknown
        has?: (name: string) => boolean
      })
    | undefined

  return Boolean(
    headers?.Authorization ||
      headers?.authorization ||
      (typeof headers?.has === 'function' && headers.has('Authorization'))
  )
}

api.interceptors.request.use(async (config) => {
  if (API_CONFIGURATION_ERROR) {
    throw new Error(API_CONFIGURATION_ERROR)
  }

  const currentState = useAuthStore.getState()
  const requestHasAuthHeader = hasAuthorizationHeader(config)
  let token = currentState.token
  const refreshToken = currentState.refreshToken
  const shouldRefreshToken =
    !requestHasAuthHeader &&
    !!refreshToken &&
    (!token || !currentState.tokenExpiresAt || Date.now() > currentState.tokenExpiresAt - 120000)

  if (shouldRefreshToken) {
    try {
      const refreshedSession = await refreshFirebaseIdToken(refreshToken)
      token = refreshedSession.idToken
      useAuthStore
        .getState()
        .setAuthSession(refreshedSession.idToken, refreshedSession.refreshToken, refreshedSession.expiresAt)
    } catch (error) {
      await useAuthStore.getState().logout()
      throw error
    }
  }

  if (token && !requestHasAuthHeader) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      void useAuthStore.getState().logout()
    }

    const config = error.config as RetryableRequestConfig | undefined
    const method = String(config?.method || '').toLowerCase()
    const status = Number(error.response?.status || 0)
    const isCanceled = error.code === 'ERR_CANCELED'
    const isRetryableFailure =
      !error.response || status === 408 || status === 429 || status === 502 || status === 503 || status === 504
    const canRetryMethod = method === 'get'

    if (
      config &&
      canRetryMethod &&
      !isCanceled &&
      status !== 401 &&
      isRetryableFailure &&
      (config.merchantRetryCount || 0) < 1
    ) {
      config.merchantRetryCount = (config.merchantRetryCount || 0) + 1
      await wait(API_RETRY_DELAY_MS)
      return api.request(config)
    }

    return Promise.reject(error)
  }
)

export default api
