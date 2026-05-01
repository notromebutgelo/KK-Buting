import { NextRequest, NextResponse } from 'next/server'
import { resolveApiBaseUrl } from '@/lib/api-base-url'

const DEFAULT_SESSION_MAX_AGE = 60 * 60 * 24
const MAX_SESSION_MAX_AGE = 60 * 60 * 24 * 30

function clampMaxAge(value: unknown) {
  const parsedValue = Number.parseInt(String(value || DEFAULT_SESSION_MAX_AGE), 10)

  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    return DEFAULT_SESSION_MAX_AGE
  }

  return Math.min(Math.max(parsedValue, DEFAULT_SESSION_MAX_AGE), MAX_SESSION_MAX_AGE)
}

function buildCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
  }
}

function clearYouthCookie(response: NextResponse) {
  response.cookies.set('auth-token', '', { ...buildCookieOptions(DEFAULT_SESSION_MAX_AGE), maxAge: 0 })
}

export async function POST(request: NextRequest) {
  const payload = await request.json().catch(() => null)
  const token = String(payload?.token || '').trim()

  if (!token) {
    return NextResponse.json({ error: 'Missing youth auth token.' }, { status: 400 })
  }

  const backendResponse = await fetch(`${resolveApiBaseUrl()}/auth/me`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  })

  const backendPayload = await backendResponse.json().catch(() => null)

  if (!backendResponse.ok) {
    return NextResponse.json(
      { error: String(backendPayload?.error || 'Unable to validate the youth session.') },
      { status: backendResponse.status },
    )
  }

  const response = NextResponse.json({ user: backendPayload || null })
  response.cookies.set('auth-token', token, buildCookieOptions(clampMaxAge(payload?.maxAgeSeconds)))
  return response
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true })
  clearYouthCookie(response)
  return response
}
