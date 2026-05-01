import api from '@/lib/api'
import { auth } from '@/lib/firebase'
export type ProfilingData = Record<string, unknown>

async function waitForAuthReady() {
  if (typeof auth.authStateReady === 'function') {
    await auth.authStateReady()
  }
}

export async function submitProfiling(data: ProfilingData) {
  const res = await api.post('/profiling', data)
  return res.data
}

export async function getProfiling() {
  await waitForAuthReady()
  const res = await api.get('/profiling/me')
  return res.data
}

export async function updateProfiling(data: ProfilingData) {
  const res = await api.patch('/profiling/me', data)
  return res.data
}

export async function hasCompletedProfiling() {
  try {
    const profile = await getProfiling()
    return Boolean(profile?.userId || profile?.id || profile?.submittedAt)
  } catch (error: any) {
    if (error?.response?.status === 404) {
      return false
    }
    throw error
  }
}

export async function getPostAuthRedirect(completedPath = '/home') {
  const completed = await hasCompletedProfiling()
  return completed ? completedPath : '/intro'
}
