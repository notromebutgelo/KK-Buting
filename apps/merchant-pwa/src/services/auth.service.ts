import axios from 'axios'
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updatePassword,
} from 'firebase/auth'
import api from '@/lib/api'
import { API_BASE_URL } from '@/lib/api-base-url'
import { getFirebaseAuth } from '@/lib/firebase'
import type { MerchantUser } from '@/store/authStore'

function normalizeUser(payload: Record<string, unknown>, fallbackEmail: string): MerchantUser {
  return {
    uid: String(payload.uid ?? payload.id ?? ''),
    email: String(payload.email ?? fallbackEmail),
    UserName: String(payload.UserName ?? payload.username ?? payload.displayName ?? fallbackEmail.split('@')[0] ?? 'Merchant'),
    role: 'merchant',
    createdAt: payload.createdAt ? String(payload.createdAt) : undefined,
    mustChangePassword: Boolean(payload.mustChangePassword),
  }
}

function getApiError(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const details = Array.isArray(error.response?.data?.details)
      ? error.response.data.details.map((entry: unknown) => String(entry)).filter(Boolean).join('\n')
      : ''
    const message = String(error.response?.data?.error || error.response?.data?.message || error.message || fallback)
    return details ? `${message}\n${details}` : message
  }

  return error instanceof Error && error.message ? error.message : fallback
}

async function loginWithBackend(idToken: string, password: string, fallbackEmail: string) {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ password }),
  })
  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>

  if (!response.ok) {
    throw new Error(String(payload.error || payload.message || 'Merchant login failed.'))
  }

  const user = normalizeUser((payload.user as Record<string, unknown>) ?? payload, fallbackEmail)
  if (user.role !== 'merchant') {
    throw new Error('This account does not have merchant access.')
  }

  return user
}

export async function signInMerchant(email: string, password: string) {
  try {
    const auth = getFirebaseAuth()
    const credential = await signInWithEmailAndPassword(auth, email.trim(), password)
    const token = await credential.user.getIdToken()
    return loginWithBackend(token, password, credential.user.email || email)
  } catch (error) {
    throw new Error(getApiError(error, 'Unable to sign in.'))
  }
}

export async function getCurrentMerchant() {
  try {
    const response = await api.get('/auth/me')
    return normalizeUser(response.data.user ?? response.data, getFirebaseAuth().currentUser?.email || '')
  } catch (error) {
    throw new Error(getApiError(error, 'Unable to refresh merchant session.'))
  }
}

export async function changeMerchantPassword(currentPassword: string, nextPassword: string) {
  const auth = getFirebaseAuth()
  const user = auth.currentUser
  const email = user?.email

  if (!user || !email) {
    throw new Error('No signed-in merchant account is available.')
  }

  try {
    const credential = EmailAuthProvider.credential(email, currentPassword)
    await reauthenticateWithCredential(user, credential)
    await updatePassword(user, nextPassword)
    const token = await user.getIdToken(true)
    await api.post('/auth/password-changed', {}, { headers: { Authorization: `Bearer ${token}` } })
    return getCurrentMerchant()
  } catch (error) {
    throw new Error(getApiError(error, 'Unable to change password.'))
  }
}

export async function signOutMerchant() {
  const auth = getFirebaseAuth()
  await firebaseSignOut(auth).catch(() => undefined)
}
