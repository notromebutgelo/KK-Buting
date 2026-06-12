const LOCAL_API_FALLBACK = 'http://localhost:4000/api'

export function resolveApiBaseUrl(url = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL) {
  const trimmedUrl = String(url || '').trim()

  if (trimmedUrl) {
    return trimmedUrl.replace(/\/+$/, '')
  }

  return LOCAL_API_FALLBACK
}

export const API_BASE_URL = resolveApiBaseUrl()
