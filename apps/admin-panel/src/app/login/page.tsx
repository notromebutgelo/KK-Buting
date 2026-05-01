'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { persistAdminSession } from '@/lib/session';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const token = await userCredential.user.getIdToken();
      const session = await persistAdminSession(token);
      const role = session.user?.role;
      if (role !== 'admin' && role !== 'superadmin') {
        await auth.signOut();
        setError('Access denied. This portal is for admins only.');
        setIsLoading(false);
        return;
      }
      window.localStorage.setItem('kk-admin-role', role);
      window.localStorage.setItem('kk-admin-email', session.user?.email || email);
      router.push('/dashboard');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed';
      if (
        message.includes('wrong-password') ||
        message.includes('user-not-found') ||
        message.includes('invalid-credential')
      ) {
        setError('Invalid email or password.');
      } else {
        setError('Login failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo + title */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div
            className="grid h-12 w-12 place-items-center rounded-2xl text-sm font-bold text-white shadow-sm"
            style={{ background: 'var(--accent)' }}
          >
            KK
          </div>
          <div className="text-center">
            <div className="text-xl font-bold" style={{ color: 'var(--ink)' }}>
              KK Admin Panel
            </div>
            <div className="text-sm" style={{ color: 'var(--muted)' }}>
              Kabataang Katipunan · Barangay Buting
            </div>
          </div>
        </div>

        {/* Card */}
        <div className="admin-panel" style={{ borderRadius: 'var(--radius-lg)', padding: '2rem' }}>
          <h1 className="text-lg font-semibold mb-1" style={{ color: 'var(--ink)' }}>
            Administrator Login
          </h1>
          <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>
            Use your admin credentials to access the dashboard.
          </p>

          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium" style={{ color: 'var(--ink-soft)' }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@kk.gov.ph"
                required
                className="surface-input rounded-xl px-3 py-2.5 text-sm outline-none transition-shadow focus:ring-2 focus:ring-[color:var(--accent)]/30"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium" style={{ color: 'var(--ink-soft)' }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="surface-input rounded-xl px-3 py-2.5 text-sm outline-none transition-shadow focus:ring-2 focus:ring-[color:var(--accent)]/30"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              style={{ background: 'var(--accent)' }}
            >
              {isLoading && (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              )}
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs" style={{ color: 'var(--muted)' }}>
          Kabataang Katipunan &copy; {new Date().getFullYear()} · Admin Access Only
        </p>
      </div>
    </div>
  );
}
