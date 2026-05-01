type AdminSessionResponse = {
  user?: {
    email?: string
    role?: string
    UserName?: string
  }
}

async function parseSessionError(response: Response) {
  const payload = await response.json().catch(() => null)
  return String(payload?.error || 'Unable to update the admin session.')
}

export async function persistAdminSession(token: string) {
  const response = await fetch('/api/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
    credentials: 'same-origin',
  })

  if (!response.ok) {
    throw new Error(await parseSessionError(response))
  }

  return (await response.json()) as AdminSessionResponse
}

export async function clearAdminSession() {
  await fetch('/api/session', {
    method: 'DELETE',
    credentials: 'same-origin',
  }).catch(() => undefined)
}
