import axios from 'axios'
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updatePassword,
} from 'firebase/auth'

import api, { API_BASE_URL } from '../lib/api'
import { auth } from '../lib/firebase'
import type { MerchantUser } from '../store/authStore'

type AuthPayload = {
  user: MerchantUser
  token: string
}

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

function mapApiError(error: unknown): never {
  if (axios.isAxiosError(error) && !error.response) {
    const usingLocalhost =
      API_BASE_URL.includes('localhost') || API_BASE_URL.includes('127.0.0.1')

    throw new Error(
      usingLocalhost
        ? `Cannot reach merchant API at ${API_BASE_URL}. On a physical device, localhost points to the phone instead of your computer.`
        : `Cannot reach merchant API at ${API_BASE_URL}. Check that the backend is running and that this device can reach your computer on the same network.`
    )
  }

  throw error
}

export async function signIn(email: string, password: string): Promise<AuthPayload> {
  try {
    const credential = await signInWithEmailAndPassword(auth, email.trim(), password)
    const token = await credential.user.getIdToken(true)
    const response = await api.post(
      '/auth/login',
      { password },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    )
    const user = normalizeUser(response.data.user ?? response.data, credential.user.email ?? email)

    if (user.role !== 'merchant') {
      throw new Error('This account does not have merchant access yet.')
    }

    return { user, token }
  } catch (error) {
    mapApiError(error)
  }
}

export async function getCurrentMerchant() {
  try {
    const response = await api.get('/auth/me')
    return normalizeUser(response.data.user ?? response.data, auth.currentUser?.email ?? '')
  } catch (error) {
    mapApiError(error)
  }
}

export async function signOut() {
  await firebaseSignOut(auth)
}

export async function resetPassword(email: string) {
  await sendPasswordResetEmail(auth, email.trim())
}

export async function changePassword(currentPassword: string, nextPassword: string) {
  const currentUser = auth.currentUser

  if (!currentUser || !currentUser.email) {
    throw new Error('No signed-in merchant account is available.')
  }

  const credential = EmailAuthProvider.credential(currentUser.email, currentPassword)
  await reauthenticateWithCredential(currentUser, credential)
  await updatePassword(currentUser, nextPassword)

  const refreshedToken = await currentUser.getIdToken(true)
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
    user: normalizeUser(response.data.user ?? response.data, currentUser.email),
    token: refreshedToken,
  }
}
