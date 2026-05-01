import { NextRequest, NextResponse } from 'next/server'
import { resolveApiBaseUrl } from '@/lib/api-base-url'

const ADMIN_SESSION_MAX_AGE = 60 * 60 * 24 * 7

function buildCookieOptions(maxAge = ADMIN_SESSION_MAX_AGE) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
  }
}

function clearAdminCookies(response: NextResponse) {
  response.cookies.set('admin-token', '', { ...buildCookieOptions(), maxAge: 0 })
  response.cookies.set('admin-role', '', { ...buildCookieOptions(), maxAge: 0 })
}

export async function POST(request: NextRequest) {
  const payload = await request.json().catch(() => null)
  const token = String(payload?.token || '').trim()

  if (!token) {
    return NextResponse.json({ error: 'Missing admin auth token.' }, { status: 400 })
  }

  const backendResponse = await fetch(`${resolveApiBaseUrl()}/auth/login`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
    body: JSON.stringify({}),
  })

  const backendPayload = await backendResponse.json().catch(() => null)
  const role = String(backendPayload?.user?.role || '')

  if (!backendResponse.ok) {
    return NextResponse.json(
      { error: String(backendPayload?.error || 'Unable to validate the admin session.') },
      { status: backendResponse.status },
    )
  }

  if (role !== 'admin' && role !== 'superadmin') {
    const response = NextResponse.json(
      { error: 'Access denied. This portal is for admins only.' },
      { status: 403 },
    )
    clearAdminCookies(response)
    return response
  }

  const response = NextResponse.json({ user: backendPayload?.user || null })
  response.cookies.set('admin-token', token, buildCookieOptions())
  response.cookies.set('admin-role', role, buildCookieOptions())
  return response
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true })
  clearAdminCookies(response)
  return response
}
