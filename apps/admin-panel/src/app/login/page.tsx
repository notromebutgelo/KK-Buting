'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import api from '@/lib/api'

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      const token = await userCredential.user.getIdToken()
      const res = await api.post(
        '/auth/login',
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )
      const role = res.data.user?.role
      if (role !== 'admin' && role !== 'superadmin') {
        await auth.signOut()
        setError('Access denied. This portal is for admins only.')
        setIsLoading(false)
        return
      }
      window.localStorage.setItem('kk-admin-role', role)
      window.localStorage.setItem('kk-admin-email', res.data.user?.email || email)
      document.cookie = `admin-token=${token}; path=/; max-age=${60 * 60 * 24 * 7}`
      router.push('/dashboard')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed'
      if (
        message.includes('wrong-password') ||
        message.includes('user-not-found') ||
        message.includes('invalid-credential')
      ) {
        setError('Invalid email or password.')
      } else {
        setError('Login failed. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,rgba(252,179,21,0.18),transparent_28%),linear-gradient(180deg,#eef5fd_0%,#f0f0f0_48%,#fffaf0_100%)] px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex h-[88px] w-[88px] items-center justify-center overflow-hidden rounded-full bg-white p-2 shadow-[0_16px_36px_rgba(1,67,132,0.14)]">
            <img
              src="/images/SKButingLogo.png"
              alt="SK Buting logo"
              className="h-[72px] w-[72px] object-contain"
            />
          </div>
          <h1 className="text-3xl font-black text-[color:var(--kk-primary)]">Admin Panel</h1>
          <p className="mt-1 text-[color:var(--kk-muted)]">
            Kabataang Katipunan Management System
          </p>
        </div>

        <div className="rounded-[28px] border border-[color:var(--kk-border)] bg-white/94 p-8 shadow-[0_24px_60px_rgba(1,67,132,0.12)] backdrop-blur">
          <h2 className="mb-2 text-xl font-bold text-[color:var(--kk-primary)]">
            Administrator Login
          </h2>
          <p className="mb-6 text-sm text-[color:var(--kk-muted)]">
            Sign in with your Firebase admin account to access approvals, reports, and
            merchant management.
          </p>

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[color:var(--kk-ink)]">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-[color:var(--kk-border)] px-4 py-2.5 text-sm text-[color:var(--kk-ink)] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[color:var(--kk-primary-2)]"
                placeholder="admin@kk.gov.ph"
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[color:var(--kk-ink)]">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-[color:var(--kk-border)] px-4 py-2.5 text-sm text-[color:var(--kk-ink)] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[color:var(--kk-primary-2)]"
                placeholder="........"
                required
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[linear-gradient(90deg,#014384_0%,#035DB7_52%,#0572DC_100%)] py-2.5 font-semibold text-white transition-opacity hover:opacity-95 disabled:opacity-60"
            >
              {isLoading && (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              )}
              {isLoading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>
        </div>

        <div className="mt-6 flex flex-col items-center">
          <img
            src="/images/FOOTER.png"
            alt="Sangguniang Kabataan Barangay Buting"
            className="h-auto w-[230px] object-contain"
          />
          <p className="mt-3 text-center text-xs text-[color:var(--kk-muted)]">
            Kabataang Katipunan &copy; {new Date().getFullYear()} • Admin Access Only
          </p>
        </div>
      </div>
    </div>
  )
}
