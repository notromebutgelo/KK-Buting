const DEFAULT_SESSION_MAX_AGE = 60 * 60 * 24
const MAX_SESSION_MAX_AGE = 60 * 60 * 24 * 30

type PersistYouthSessionOptions = {
  token: string
  maxAgeSeconds?: number
}

async function parseSessionError(response: Response) {
  const payload = await response.json().catch(() => null)
  return String(payload?.error || 'Unable to update the youth session.')
}

export async function persistYouthSession(options: PersistYouthSessionOptions) {
  const requestedMaxAge = Number.isFinite(options.maxAgeSeconds)
    ? Number(options.maxAgeSeconds)
    : DEFAULT_SESSION_MAX_AGE
  const maxAgeSeconds = Math.min(Math.max(Math.round(requestedMaxAge), DEFAULT_SESSION_MAX_AGE), MAX_SESSION_MAX_AGE)

  const response = await fetch('/api/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: options.token,
      maxAgeSeconds,
    }),
    credentials: 'same-origin',
  })

  if (!response.ok) {
    throw new Error(await parseSessionError(response))
  }

  return response.json().catch(() => null)
}

export async function clearYouthSession() {
  await fetch('/api/session', {
    method: 'DELETE',
    credentials: 'same-origin',
  }).catch(() => undefined)
}
