import axios from 'axios'
import Constants from 'expo-constants'

type FirebaseExtraConfig = {
  apiKey?: string
}

export type FirebaseIdentitySession = {
  idToken: string
  refreshToken: string
  expiresAt: number
  email: string
  localId: string
}

const identityToolkitBaseUrl = 'https://identitytoolkit.googleapis.com/v1'
const secureTokenBaseUrl = 'https://securetoken.googleapis.com/v1'
const firebaseIdentityApi = axios.create({ timeout: 15000 })
const firebaseExtra = (Constants.expoConfig?.extra?.firebase ?? {}) as FirebaseExtraConfig
const firebaseApiKey = process.env.EXPO_PUBLIC_FIREBASE_API_KEY || firebaseExtra.apiKey || ''

export const FIREBASE_CONFIGURATION_ERROR = firebaseApiKey
  ? null
  : 'This merchant app build is missing Firebase login settings. Rebuild the APK using the EAS preview environment variables.'

function getExpiresAt(expiresIn?: string | number) {
  const seconds = Number(expiresIn || 3600)
  return Date.now() + Math.max(60, seconds) * 1000
}

function getFirebaseRestCode(error: unknown) {
  if (!axios.isAxiosError(error)) return ''
  const message = error.response?.data?.error?.message
  return typeof message === 'string' ? message : ''
}

function mapFirebaseRestError(error: unknown, context: 'login' | 'password' | 'refresh'): never {
  const code = getFirebaseRestCode(error)

  if (context === 'refresh') {
    throw new Error('Your merchant session expired. Please sign in again.')
  }

  if (code === 'INVALID_EMAIL') {
    throw new Error('Enter a valid merchant email address.')
  }

  if (
    code === 'EMAIL_NOT_FOUND' ||
    code === 'INVALID_PASSWORD' ||
    code === 'INVALID_LOGIN_CREDENTIALS'
  ) {
    throw new Error(
      context === 'password'
        ? 'The current password is incorrect. Enter the temporary password exactly as provided by SK admin.'
        : 'Invalid email or password. Check the credentials provided by SK admin.'
    )
  }

  if (code === 'USER_DISABLED') {
    throw new Error('This merchant login has been disabled. Contact SK admin for help.')
  }

  if (code === 'TOO_MANY_ATTEMPTS_TRY_LATER') {
    throw new Error('Too many attempts. Wait a few minutes before trying again.')
  }

  if (code === 'WEAK_PASSWORD') {
    throw new Error('Choose a stronger new password with at least 8 characters.')
  }

  if (axios.isAxiosError(error) && !error.response) {
    throw new Error('Cannot reach Firebase Auth. Check your internet connection and try again.')
  }

  throw new Error(
    context === 'password'
      ? 'We could not update the password. Check the current password and try again.'
      : 'We could not sign you in. Check your email and password, then try again.'
  )
}

function assertFirebaseConfigured() {
  if (FIREBASE_CONFIGURATION_ERROR) {
    throw new Error(FIREBASE_CONFIGURATION_ERROR)
  }
}

export async function signInWithFirebasePassword(
  email: string,
  password: string,
  context: 'login' | 'password' = 'login'
) {
  assertFirebaseConfigured()

  try {
    const response = await firebaseIdentityApi.post(
      `${identityToolkitBaseUrl}/accounts:signInWithPassword?key=${firebaseApiKey}`,
      {
        email: email.trim(),
        password,
        returnSecureToken: true,
      }
    )

    return {
      idToken: String(response.data.idToken || ''),
      refreshToken: String(response.data.refreshToken || ''),
      expiresAt: getExpiresAt(response.data.expiresIn),
      email: String(response.data.email || email),
      localId: String(response.data.localId || ''),
    } satisfies FirebaseIdentitySession
  } catch (error) {
    mapFirebaseRestError(error, context)
  }
}

export async function updateFirebasePassword(idToken: string, nextPassword: string) {
  assertFirebaseConfigured()

  try {
    const response = await firebaseIdentityApi.post(
      `${identityToolkitBaseUrl}/accounts:update?key=${firebaseApiKey}`,
      {
        idToken,
        password: nextPassword,
        returnSecureToken: true,
      }
    )

    return {
      idToken: String(response.data.idToken || ''),
      refreshToken: String(response.data.refreshToken || ''),
      expiresAt: getExpiresAt(response.data.expiresIn),
      email: String(response.data.email || ''),
      localId: String(response.data.localId || ''),
    } satisfies FirebaseIdentitySession
  } catch (error) {
    mapFirebaseRestError(error, 'password')
  }
}

export async function refreshFirebaseIdToken(refreshToken: string) {
  assertFirebaseConfigured()

  try {
    const body = `grant_type=refresh_token&refresh_token=${encodeURIComponent(refreshToken)}`

    const response = await firebaseIdentityApi.post(`${secureTokenBaseUrl}/token?key=${firebaseApiKey}`, body.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })

    return {
      idToken: String(response.data.id_token || ''),
      refreshToken: String(response.data.refresh_token || refreshToken),
      expiresAt: getExpiresAt(response.data.expires_in),
      email: '',
      localId: String(response.data.user_id || ''),
    } satisfies FirebaseIdentitySession
  } catch (error) {
    mapFirebaseRestError(error, 'refresh')
  }
}
