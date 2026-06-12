import { getApps, initializeApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

let authInstance: Auth | null = null

function assertBrowserConfig() {
  const missing = Object.entries(firebaseConfig)
    .filter(([, value]) => !String(value || '').trim())
    .map(([key]) => key)

  if (missing.length > 0) {
    throw new Error(`Merchant PWA Firebase config is missing: ${missing.join(', ')}`)
  }
}

export function getFirebaseAuth() {
  if (typeof window === 'undefined') {
    throw new Error('Firebase Auth is only available in the browser.')
  }

  if (!authInstance) {
    assertBrowserConfig()
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
    authInstance = getAuth(app)
  }

  return authInstance
}
