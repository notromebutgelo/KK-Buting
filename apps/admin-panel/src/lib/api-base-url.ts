const LOCAL_API_FALLBACK = 'http://localhost:4000/api'

export function resolveApiBaseUrl(url = process.env.NEXT_PUBLIC_API_URL) {
  const trimmedUrl = String(url || '').trim()

  if (trimmedUrl) {
    return trimmedUrl.replace(/\/+$/, '')
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('NEXT_PUBLIC_API_URL is required for the admin panel in production.')
  }

  return LOCAL_API_FALLBACK
}
