import {
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from 'firebase/auth'

import api from '../lib/api'
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
  }
}

export async function signIn(email: string, password: string): Promise<AuthPayload> {
  const credential = await signInWithEmailAndPassword(auth, email.trim(), password)
  const token = await credential.user.getIdToken(true)
  const response = await api.post('/auth/login', {})
  const user = normalizeUser(response.data.user ?? response.data, credential.user.email ?? email)

  if (user.role !== 'merchant') {
    throw new Error('This account does not have merchant access yet.')
  }

  return { user, token }
}

export async function getCurrentMerchant() {
  const response = await api.get('/auth/me')
  return response.data.user ?? response.data
}

export async function signOut() {
  await firebaseSignOut(auth)
}

export async function resetPassword(email: string) {
  await sendPasswordResetEmail(auth, email.trim())
}
