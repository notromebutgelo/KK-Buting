import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  confirmPasswordReset,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  sendEmailVerification,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth'
import { auth } from '@/lib/firebase'
import api from '@/lib/api'

async function syncBackendUser(token: string, profile?: { email?: string | null; username?: string | null }) {
  try {
    const res = await api.post('/auth/login', {}, {
      headers: { Authorization: `Bearer ${token}` },
    })
    return { user: res.data.user, token }
  } catch {
    const res = await api.post(
      '/auth/register',
      {
        email: profile?.email ?? '',
        username: profile?.username ?? profile?.email?.split('@')[0] ?? 'user',
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    )
    return { user: res.data.user, token }
  }
}

export async function signIn(email: string, password: string) {
  const userCredential = await signInWithEmailAndPassword(auth, email, password)

  if (!userCredential.user.emailVerified) {
    throw new Error('EMAIL_NOT_VERIFIED')
  }

  const token = await userCredential.user.getIdToken()
  const res = await api.post(
    '/auth/login',
    {},
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  )

  return { user: res.data.user, token }
}

export async function register(email: string, password: string, username: string) {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password)
  await sendEmailVerification(userCredential.user)

  const token = await userCredential.user.getIdToken()
  const res = await api.post(
    '/auth/register',
    { email, username },
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  )

  return { user: res.data.user, token, emailVerified: userCredential.user.emailVerified }
}

export async function resendVerificationEmail() {
  if (!auth.currentUser) {
    throw new Error('No authenticated user to verify.')
  }

  await sendEmailVerification(auth.currentUser)
}

export async function refreshVerifiedUser() {
  if (!auth.currentUser) {
    throw new Error('No authenticated user found.')
  }

  await auth.currentUser.reload()
  const user = auth.currentUser

  if (!user?.emailVerified) {
    throw new Error('Email is not verified yet.')
  }

  const token = await user.getIdToken(true)
  return syncBackendUser(token, {
    email: user.email,
    username: user.displayName,
  })
}

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider()
  const credential = await signInWithPopup(auth, provider)
  const firebaseUser = credential.user
  const token = await firebaseUser.getIdToken()

  return syncBackendUser(token, {
    email: firebaseUser.email,
    username: firebaseUser.displayName,
  })
}

export async function signOut() {
  await api.post('/auth/logout')
  await firebaseSignOut(auth)
}

export async function resetPassword(email: string) {
  await sendPasswordResetEmail(auth, email)
}

export async function confirmReset(oobCode: string, newPassword: string) {
  await confirmPasswordReset(auth, oobCode, newPassword)
}

export async function changePassword(currentPassword: string, newPassword: string) {
  const user = auth.currentUser
  if (!user || !user.email) throw new Error('Not authenticated')
  const credential = EmailAuthProvider.credential(user.email, currentPassword)
  await reauthenticateWithCredential(user, credential)
  await updatePassword(user, newPassword)
}
