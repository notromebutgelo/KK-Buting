import axios from 'axios'

import api, { API_BASE_URL, warmUpApi } from '../lib/api'
import {
  signInWithFirebasePassword,
  updateFirebasePassword,
} from '../lib/firebaseIdentity'
import type { MerchantUser } from '../store/authStore'
import { useAuthStore } from '../store/authStore'

type AuthPayload = {
  user: MerchantUser
  token: string
  refreshToken: string
  expiresAt: number
}

const AUTH_LOGIN_TIMEOUT_MS = 12000

function normalizeUser(payload: Record<string, unknown>, fallbackEmail: string): MerchantUser {
  return {
    uid: String(payload.uid ?? payload.id ?? ''),
    email: String(payload.email ?? fallbackEmail),
    UserName: String(payload.UserName ?? payload.username ?? fallbackEmail.split('@')[0] ?? 'Merchant'),
    role: String(payload.role ?? 'merchant') as MerchantUser['role'],
    createdAt: payload.createdAt ? String(payload.createdAt) : undefined,
    mustChangePassword: Boolean(payload.mustChangePassword),
  }
}

async function readJsonPayload(response: Response) {
  try {
    return (await response.json()) as Record<string, unknown>
  } catch {
    return {}
  }
}

function getServerMessage(payload: Record<string, unknown>) {
  const message = payload.error || payload.message
  return typeof message === 'string' && message.trim() ? message.trim() : ''
}

function throwBackendStatusError(status: number, payload: Record<string, unknown>): never {
  if (status === 401) {
    throw new Error('Your login could not be verified. Please sign in again.')
  }

  if (status === 403) {
    throw new Error('This account does not have merchant access yet. Contact SK admin.')
  }

  if (status === 404) {
    throw new Error('This merchant account is not registered in KK yet. Contact SK admin.')
  }

  if (status === 429) {
    throw new Error('Too many login attempts. Wait a minute, then try again.')
  }

  const serverMessage = getServerMessage(payload)
  throw new Error(serverMessage || 'We could not complete sign in right now. Please try again.')
}

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === 'AbortError'
}

async function loginWithBackend(idToken: string, password: string, fallbackEmail: string) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), AUTH_LOGIN_TIMEOUT_MS)

  let response: Response

  try {
    response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ password }),
      signal: controller.signal,
    })
  } catch (error) {
    if (isAbortError(error)) {
      throw new Error(
        `The merchant service at ${API_BASE_URL} did not respond within ${Math.round(
          AUTH_LOGIN_TIMEOUT_MS / 1000
        )} seconds. Render may still be waking up. Try again in a moment.`
      )
    }

    throw new Error(
      `The APK could not reach ${API_BASE_URL}. Turn off VPN, ad blocker, or private DNS on this phone, then try again.`
    )
  } finally {
    clearTimeout(timeout)
  }

  const payload = await readJsonPayload(response)

  if (!response.ok) {
    throwBackendStatusError(response.status, payload)
  }

  return normalizeUser((payload.user as Record<string, unknown>) ?? payload, fallbackEmail)
}

function mapApiError(error: unknown): never {
  if (axios.isAxiosError(error) && !error.response) {
    const usingLocalhost =
      API_BASE_URL.includes('localhost') || API_BASE_URL.includes('127.0.0.1')
    const timedOut = error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT'

    throw new Error(
      usingLocalhost
        ? `Cannot reach merchant API at ${API_BASE_URL}. On a physical device, localhost points to the phone instead of your computer.`
        : timedOut
          ? `The merchant service at ${API_BASE_URL} did not respond within ${Math.round(
              AUTH_LOGIN_TIMEOUT_MS / 1000
            )} seconds. Render may still be waking up. Try again in a moment.`
        : `The merchant service at ${API_BASE_URL} is unavailable or taking too long to start. Check your internet connection and try again.`
    )
  }

  if (axios.isAxiosError(error) && error.response) {
    const status = error.response.status
    throwBackendStatusError(status, error.response.data ?? {})
  }

  throw error
}

export async function signIn(email: string, password: string): Promise<AuthPayload> {
  try {
    void warmUpApi()
    const firebaseSession = await signInWithFirebasePassword(email, password)
    const user = await loginWithBackend(firebaseSession.idToken, password, firebaseSession.email || email)

    if (user.role !== 'merchant') {
      throw new Error('This account does not have merchant access yet.')
    }

    return {
      user,
      token: firebaseSession.idToken,
      refreshToken: firebaseSession.refreshToken,
      expiresAt: firebaseSession.expiresAt,
    }
  } catch (error) {
    mapApiError(error)
  }
}

export async function getCurrentMerchant() {
  try {
    const response = await api.get('/auth/me')
    const fallbackEmail = useAuthStore.getState().user?.email ?? ''
    return normalizeUser(response.data.user ?? response.data, fallbackEmail)
  } catch (error) {
    mapApiError(error)
  }
}

export async function signOut() {
  return Promise.resolve()
}

export async function changePassword(currentPassword: string, nextPassword: string, accountEmail?: string) {
  try {
    const expectedEmail = String(accountEmail || useAuthStore.getState().user?.email || '').trim()
    if (!expectedEmail) {
      throw new Error('No signed-in merchant account is available.')
    }

    const verifiedSession = await signInWithFirebasePassword(expectedEmail, currentPassword, 'password')
    const updatedSession = await updateFirebasePassword(verifiedSession.idToken, nextPassword)
    const refreshedToken = updatedSession.idToken
    await api.post(
      '/auth/password-changed',
      {},
      {
        headers: { Authorization: `Bearer ${refreshedToken}` },
      }
    )

    const response = await api.get('/auth/me', {
      headers: { Authorization: `Bearer ${refreshedToken}` },
    })

    return {
      user: normalizeUser(response.data.user ?? response.data, updatedSession.email || expectedEmail),
      token: refreshedToken,
      refreshToken: updatedSession.refreshToken || verifiedSession.refreshToken,
      expiresAt: updatedSession.expiresAt,
    }
  } catch (error) {
    mapApiError(error)
  }
}
